import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  collectOperatorApproval, issueTestGrant, consumeTestGrant, revokeTestGrant,
  APPROVAL_PHRASE, TEST_PURPOSE, TEST_MESSAGES, TEST_MAX_TOKENS, TEST_MAX_COST_USD,
  TEST_POLICY, TEST_PROVIDER, TEST_MODEL, TEST_ENDPOINT,
} from '../server/ai/single-use-auth.mjs';
import { estimateRequestCost, PricingUnavailableError } from '../server/ai/pricing.mjs';
import { createOpenRouterAdapter } from '../server/ai/providers/openrouter.mjs';
import { MIA_PRIVACY_POLICY } from '../server/ai/central-gateway.mjs';
import { readFileSync } from 'node:fs';

const approval = () => collectOperatorApproval({ input: () => APPROVAL_PHRASE });
const descriptor = (over = {}) => ({
  processId: process.pid, source: 'local-process', purpose: TEST_PURPOSE, operationId: TEST_PURPOSE,
  provider: TEST_PROVIDER, model: TEST_MODEL, endpoint: TEST_ENDPOINT, maxTokens: TEST_MAX_TOKENS,
  messages: TEST_MESSAGES,
  messagesFingerprint: JSON.stringify(TEST_MESSAGES),
  policyFingerprint: JSON.stringify(TEST_POLICY),
  toolsPresent: false, attachmentCount: 0, retry: false, fallback: false,
  ...over,
});
const mockFetch = () => vi.fn(async () => new Response(JSON.stringify({
  model: TEST_MODEL, choices: [{ message: { content: 'MINISTUDIO_OPENROUTER_TEST_OK' } }],
  usage: { prompt_tokens: 4, completion_tokens: 7 },
}), { status: 200, headers: { 'content-type': 'application/json' } }));
const call = (grant, fetchImpl = mockFetch(), extra = {}) =>
  createOpenRouterAdapter({ fetchImpl }).chat({
    model: TEST_MODEL, messages: TEST_MESSAGES, apiKey: 'server-test-key',
    maxTokens: TEST_MAX_TOKENS, privacyPolicy: MIA_PRIVACY_POLICY,
    testGrant: grant, purpose: TEST_PURPOSE, operationId: TEST_PURPOSE,
    source: 'local-process', maxEstimatedCostUsd: TEST_MAX_COST_USD, ...extra,
  });

afterEach(() => {
  revokeTestGrant(TEST_PURPOSE);
  vi.restoreAllMocks();
});

describe('M2B-4 security remediation', () => {
  it('1. unauthorized request without approval is denied', () => {
    expect(() => issueTestGrant({ approval: null })).toThrow(/approval_required|Explicit operator approval/);
  });

  it('2. wrong approval phrase is denied', () => {
    expect(() => collectOperatorApproval({ input: () => 'not the phrase' })).toThrow(/approval_denied|Operator approval/);
  });

  it('3. missing grant is denied before transport', async () => {
    const fetchImpl = mockFetch();
    await expect(call(null, fetchImpl)).rejects.toThrow(/authorization/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('4. expired grant denied (monotonic expiry)', () => {
    const grant = issueTestGrant({ approval: approval(), ttlMs: 1 });
    const start = Date.now();
    while (Date.now() - start < 5) { /* wait */ }
    expect(() => consumeTestGrant(grant, descriptor())).toThrow(/expired/);
  });

  it('5. replayed grant denied', () => {
    const grant = issueTestGrant({ approval: approval() });
    expect(consumeTestGrant(grant, descriptor()).ok).toBe(true);
    expect(() => consumeTestGrant(grant, descriptor())).toThrow(/active|consumed/i);
  });

  it('6. wrong provider/model/endpoint denied', () => {
    for (const over of [{ provider: 'other' }, { model: 'other/model' }, { endpoint: 'https://x.test' }]) {
      const grant = issueTestGrant({ approval: approval(), operationId: `op-${JSON.stringify(over)}` });
      expect(() => consumeTestGrant(grant, descriptor({ ...over, operationId: `op-${JSON.stringify(over)}` }))).toThrow(/provider, model or endpoint/i);
      revokeTestGrant(`op-${JSON.stringify(over)}`);
    }
  });

  it('7. wrong prompt denied', () => {
    const grant = issueTestGrant({ approval: approval() });
    expect(() => consumeTestGrant(grant, descriptor({ messagesFingerprint: '[]' }))).toThrow(/prompt/i);
  });

  it('8. wrong purpose denied', () => {
    const grant = issueTestGrant({ approval: approval() });
    expect(() => consumeTestGrant(grant, descriptor({ purpose: 'OTHER' }))).toThrow(/purpose/i);
  });

  it('9. excessive cost rejected by computed estimate', () => {
    const huge = [{ role: 'user', content: 'x'.repeat(2_000_000) }];
    const estimate = estimateRequestCost({ messages: huge, maxTokens: TEST_MAX_TOKENS });
    expect(estimate.estimatedUsd).toBeGreaterThan(TEST_MAX_COST_USD);
  });

  it('10. unknown pricing fails closed', () => {
    expect(() => estimateRequestCost({ messages: TEST_MESSAGES, maxTokens: 32, modelId: 'unknown/model' }))
      .toThrow(PricingUnavailableError);
  });

  it('11. concurrent consumption yields exactly one success', async () => {
    const grant = issueTestGrant({ approval: approval() });
    const fetchImpl = mockFetch();
    const results = await Promise.allSettled([call(grant, fetchImpl), call(grant, fetchImpl)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('12. cancellation after consumption consumes grant', async () => {
    const grant = issueTestGrant({ approval: approval() });
    const controller = new AbortController();
    controller.abort();
    const failing = vi.fn(async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; });
    await expect(call(grant, failing, { signal: controller.signal })).rejects.toThrow(/time/i);
    await expect(call(grant, mockFetch())).rejects.toThrow(/authorization/);
  });

  it('13. failure before transmission leaves no second request', async () => {
    const grant = issueTestGrant({ approval: approval() });
    const failing = vi.fn(async () => { throw new Error('transport down'); });
    await expect(call(grant, failing)).rejects.toThrow(/could not be reached/i);
    const second = mockFetch();
    await expect(call(grant, second)).rejects.toThrow(/authorization/);
    expect(second).not.toHaveBeenCalled();
  });

  it('14. arbitrary local module cannot obtain authorization silently', () => {
    const source = readFileSync('server/ai/single-use-auth.mjs', 'utf8');
    expect(source).not.toMatch(/ENABLE_LIVE_AI|process\.env/);
    expect(() => issueTestGrant({})).toThrow(/approval/i);
  });

  it('15. grants are isolated by operation and cannot be substituted', () => {
    const g1 = issueTestGrant({ approval: approval(), operationId: 'op-a' });
    const g2 = issueTestGrant({ approval: approval(), operationId: 'op-b' });
    expect(consumeTestGrant(g1, descriptor({ operationId: 'op-a' })).ok).toBe(true);
    expect(() => consumeTestGrant(g2, descriptor({ operationId: 'op-a' }))).toThrow(/active|operation/i);
    expect(consumeTestGrant(g2, descriptor({ operationId: 'op-b' })).ok).toBe(true);
  });

  it('16. expiry cannot be bypassed with injected clock values', () => {
    const source = readFileSync('server/ai/single-use-auth.mjs', 'utf8');
    expect(source).not.toMatch(/expiresInMs|function issueTestGrant\([^)]*now/);
    expect(source).toMatch(/performance\.now\(\)/);
  });
});
