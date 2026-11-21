import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  isGrantCandidate, consumeTestGrant, revokeTestGrant,
  TestAuthorizationError, TEST_PURPOSE, TEST_PROVIDER, TEST_MODEL, TEST_ENDPOINT,
  TEST_MAX_TOKENS, TEST_MAX_COST_USD, TEST_MESSAGES, TEST_POLICY,
} from '../server/ai/single-use-auth.mjs';
import { approvedGrant } from './helpers/one-shot-grant';
import { createOpenRouterAdapter } from '../server/ai/providers/openrouter.mjs';
import { MIA_PRIVACY_POLICY } from '../server/ai/central-gateway.mjs';

const descriptor = (over = {}) => ({
  processId: process.pid,
  source: 'local-process',
  purpose: TEST_PURPOSE,
  operationId: TEST_PURPOSE,
  provider: TEST_PROVIDER,
  model: TEST_MODEL,
  endpoint: TEST_ENDPOINT,
  maxTokens: TEST_MAX_TOKENS,
  messages: TEST_MESSAGES,
  messagesFingerprint: JSON.stringify(TEST_MESSAGES),
  policyFingerprint: JSON.stringify(TEST_POLICY),
  maxEstimatedCostUsd: TEST_MAX_COST_USD,
  toolsPresent: false,
  attachmentCount: 0,
  retry: false,
  fallback: false,
  ...over,
});

function mockTransport() {
  return vi.fn(async () => new Response(JSON.stringify({
    model: TEST_MODEL,
    choices: [{ message: { content: 'MINISTUDIO_OPENROUTER_TEST_OK' } }],
    usage: { prompt_tokens: 5, completion_tokens: 7 },
  }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'mock-req-1' } }));
}

function adapterCall(grant, fetchImpl = mockTransport()) {
  return createOpenRouterAdapter({ fetchImpl }).chat({
    model: TEST_MODEL,
    messages: TEST_MESSAGES,
    apiKey: 'server-test-key',
    maxTokens: TEST_MAX_TOKENS,
    privacyPolicy: MIA_PRIVACY_POLICY,
    testGrant: grant,
    purpose: TEST_PURPOSE,
    source: 'local-process',
    maxEstimatedCostUsd: TEST_MAX_COST_USD,
  });
}

afterEach(() => {
  revokeTestGrant();
  vi.restoreAllMocks();
});

describe('M2B temporary single-use authorization', () => {
  it('1. persistent gate defaults to false', () => {
    expect(readFileSync('server/ai/model-registry.mjs', 'utf8')).toMatch(/liveExecutionEnabled: false/);
    expect(readFileSync('server/ai/model-registry.mjs', 'utf8')).not.toMatch(/ENABLE_LIVE_AI/);
  });

  it('2. no grant means request denied before network', async () => {
    const fetchImpl = mockTransport();
    await expect(adapterCall(null, fetchImpl)).rejects.toThrow(TestAuthorizationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('3. correct grant permits only the intended request', async () => {
    const grant = approvedGrant();
    const fetchImpl = mockTransport();
    const result = await adapterCall(grant, fetchImpl);
    expect(result.content).toBe('MINISTUDIO_OPENROUTER_TEST_OK');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    expect(body.provider).toMatchObject({ zdr: true, data_collection: 'deny', allow_fallbacks: false, require_parameters: true });
  });

  it('4. wrong provider denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ provider: 'other' }))).toThrow(/provider, model or endpoint/i);
  });

  it('5. wrong model denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ model: 'other/model' }))).toThrow(/provider, model or endpoint/i);
  });

  it('6. wrong endpoint denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ endpoint: 'https://example.test/chat' }))).toThrow(/provider, model or endpoint/i);
  });

  it('7. wrong prompt denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ messagesFingerprint: '[]' }))).toThrow(/exact test prompt/);
  });

  it('8. wrong token limit denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ maxTokens: 500 }))).toThrow(/32 output tokens/i);
  });

  it('9. wrong request purpose denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ purpose: 'OTHER' }))).toThrow(/Wrong purpose/i);
  });

  it('10. expired grant denied', () => {
    const grant = approvedGrant({ ttlMs: 1 });
    const start = Date.now();
    while (Date.now() - start < 5) { /* let monotonic expiry elapse */ }
    expect(() => consumeTestGrant(grant, descriptor())).toThrow(/expired/);
    expect(isGrantCandidate(grant)).toBe(false);
  });

  it('11. replayed grant denied', () => {
    const grant = approvedGrant();
    expect(consumeTestGrant(grant, descriptor()).ok).toBe(true);
    expect(() => consumeTestGrant(grant, descriptor())).toThrow(/No active test authorization/i);
  });

  it('12. second request denied', async () => {
    const grant = approvedGrant();
    const fetchImpl = mockTransport();
    await adapterCall(grant, fetchImpl);
    await expect(adapterCall(grant, fetchImpl)).rejects.toThrow(TestAuthorizationError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('13. concurrent requests consume exactly one grant', async () => {
    const grant = approvedGrant();
    const fetchImpl = mockTransport();
    const results = await Promise.allSettled([adapterCall(grant, fetchImpl), adapterCall(grant, fetchImpl)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('14. failed first attempt does not restore authorization', async () => {
    const grant = approvedGrant();
    const failing = vi.fn(async () => { throw new Error('transport failed'); });
    await expect(adapterCall(grant, failing)).rejects.toThrow(/could not be reached/);
    await expect(adapterCall(grant, mockTransport())).rejects.toThrow(TestAuthorizationError);
  });

  it('15. background process denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ source: 'background' }))).toThrow(/Restricted to the issuing local process/i);
  });

  it('16. browser-originated request denied', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ source: 'browser' }))).toThrow(/Restricted to the issuing local process/i);
  });

  it('17. process restart loses authorization', async () => {
    const grant = approvedGrant();
    const url = pathToFileURL('server/ai/single-use-auth.mjs').href + '?restart=1';
    const fresh = await import(url);
    expect(fresh.isGrantCandidate(grant)).toBe(false);
    expect(() => fresh.consumeTestGrant(grant, descriptor())).toThrow(/authorization/i);
  });

  it('18. ZDR policy cannot be weakened', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ policyFingerprint: JSON.stringify({ zdr: false }) }))).toThrow(/Strict ZDR policy/i);
    expect(MIA_PRIVACY_POLICY).toMatchObject({ zdr: true, dataCollection: 'deny', allowFallbacks: false, requireParameters: true });
  });

  it('19. retry remains disabled', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ retry: true }))).toThrow(/No tools, attachments/i);
    const source = readFileSync('server/ai/providers/openrouter.mjs', 'utf8').split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(source).not.toMatch(/retry\s*[:=]\s*true|retry\s*\(|maxAttempts/i);
  });

  it('20. fallback remains disabled', () => {
    const grant = approvedGrant();
    expect(() => consumeTestGrant(grant, descriptor({ fallback: true }))).toThrow(/No tools, attachments/i);
    const source = readFileSync('server/ai/providers/openrouter.mjs', 'utf8');
    expect(source).toMatch(/allow_fallbacks: privacyPolicy\.allowFallbacks === false \? false : true/);
    expect(source).not.toMatch(/fallback\s*\(/i);
  });
});
