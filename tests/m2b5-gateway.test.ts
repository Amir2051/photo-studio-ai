import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCentralGateway, MIA_PRIVACY_POLICY } from '../server/ai/central-gateway.mjs';
import { createOpenRouterAdapter } from '../server/ai/providers/openrouter.mjs';
import { getProvider } from '../server/ai/provider-registry.mjs';
import { createConsentStore, grantConsent } from '../server/ai/consent.mjs';
import { createBudget } from '../server/ai/budget.mjs';
import { createUsageLedger, listRecords } from '../server/ai/ledger.mjs';
import { grantCallArgs, authorizedMessages, authorizedMaxTokens } from './helpers/one-shot-grant';

const messages = [{ role: 'user', content: 'SENSITIVE_PROMPT_MARKER' }];

function mockFetch() {
  return vi.fn(async () => new Response(JSON.stringify({
    model: 'mistralai/mistral-nemo',
    choices: [{ message: { content: 'reply' } }],
    usage: { prompt_tokens: 3, completion_tokens: 2 },
  }), { status: 200, headers: { 'content-type': 'application/json' } }));
}

describe('M2B-5 central privacy gateway', () => {
  it('1. constructs a compliant ZDR request with no fallback', async () => {
    const fetchImpl = mockFetch();
    const adapter = createOpenRouterAdapter({ fetchImpl });
    await adapter.chat({
      model: 'mistralai/mistral-nemo', messages: authorizedMessages, apiKey: 'server-test-key',
      maxTokens: authorizedMaxTokens, privacyPolicy: MIA_PRIVACY_POLICY, ...grantCallArgs(),
    });
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1].body));
    expect(body.provider).toMatchObject({
      zdr: true, data_collection: 'deny', allow_fallbacks: false, require_parameters: true,
    });
  });

  it('2. rejects a request that tries to alter the policy instead of relaxing routing', async () => {
    const gateway = createCentralGateway({ apiKey: 'server-test-key', fetchImpl: mockFetch() });
    const result = await gateway.run({
      task: 'chat', messages, privacyPolicy: { ...MIA_PRIVACY_POLICY, zdr: false },
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'privacy_policy_mismatch' } });
  });

  it('3. fails closed before network when the policy cannot be applied', async () => {
    const fetchImpl = mockFetch();
    const adapter = createOpenRouterAdapter({ fetchImpl });
    await expect(adapter.chat({
      model: 'mistralai/mistral-nemo', messages, apiKey: 'server-test-key',
      privacyPolicy: { ...MIA_PRIVACY_POLICY, dataCollection: 'allow' },
    })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('4. rejects unsupported policy parameters before transmission', async () => {
    const gateway = createCentralGateway({ apiKey: 'server-test-key', fetchImpl: mockFetch() });
    const result = await gateway.run({ task: 'chat', messages, extraPolicyFlag: 'x' });
    expect(result.ok).toBe(false);
  });

  it('5. closes both identified bypass paths', () => {
    const gatewaySource = readFileSync('server/ai/index.mjs', 'utf8');
    const httpSource = readFileSync('server/ai-gateway.mjs', 'utf8');
    expect(gatewaySource).not.toMatch(/provider\.chat\(/);
    expect(httpSource).not.toMatch(/openrouter\.ai/);
    expect(httpSource).toContain('createCentralGateway');
  });

  it('6. direct provider access without the policy is refused', async () => {
    const provider = getProvider('openrouter');
    expect(provider.supportsPrivacyPolicy).toBe(true);
    await expect(provider.chat({ model: 'mistralai/mistral-nemo', messages, apiKey: 'server-test-key' })).rejects.toThrow();
  });

  it('7. does not write sensitive content to logs or ledger records', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const ledger = createUsageLedger();
    const gateway = createCentralGateway({ apiKey: 'server-test-key', fetchImpl: mockFetch(), ledger });
    await gateway.run({ task: 'chat', messages });
    expect(JSON.stringify(listRecords(ledger))).not.toContain('SENSITIVE_PROMPT_MARKER');
    expect(spy.mock.calls.map((c) => c.join(' ')).join(' ')).not.toContain('SENSITIVE_PROMPT_MARKER');
    spy.mockRestore();
  });

  it('8. enforces policy, consent and budget before any provider transmission', async () => {
    const fetchImpl = mockFetch();
    const consentStore = createConsentStore();
    const budget = createBudget();
    const ledger = createUsageLedger();
    const gateway = createCentralGateway({ apiKey: 'server-test-key', fetchImpl, consentStore, budget, ledger });
    const result = await gateway.run({ task: 'chat', messages, userRef: 'user-test' });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(listRecords(ledger)[0]).toMatchObject({ status: 'rejected' });
    // consent is task/model/provider-specific
    const decisionModel = 'mistralai/mistral-nemo';
    const consent = grantConsent({ store: consentStore, task: 'chat', modelId: decisionModel, providerId: 'openrouter', estimatedCostUsd: 0.001 });
    expect(consentStore.get(consent.id)).toMatchObject({ task: 'chat', modelId: decisionModel, providerId: 'openrouter' });
    expect(budget.ceilingUsd).toBe(0.05);
  });
});
