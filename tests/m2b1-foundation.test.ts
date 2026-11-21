import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  classifyCost,
  findModel,
  capabilitiesFor,
  supportsCapability,
  COST_FREE,
  COST_PAID,
  COST_UNKNOWN,
} from '../server/ai/model-registry.mjs';
import { getProvider, listProviders } from '../server/ai/provider-registry.mjs';
import { createOpenRouterAdapter } from '../server/ai/providers/openrouter.mjs';
import {
  InvalidCredentialsError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitedError,
} from '../server/ai/errors.mjs';
import { executeTextTask } from '../server/ai/index.mjs';
import { MIA_PRIVACY_POLICY } from '../server/ai/central-gateway.mjs';
import { grantCallArgs, authorizedMessages, authorizedMaxTokens } from './helpers/one-shot-grant';

const TEST_KEY = 'server-only-test-key-not-a-real-secret';
const messages = authorizedMessages;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function okPayload() {
  return {
    model: 'mistralai/mistral-nemo',
    choices: [{ message: { content: 'Synthetic reply' } }],
    usage: { prompt_tokens: 11, completion_tokens: 7 },
  };
}

describe('M2B-1 provider registry', () => {
  it('registers only the approved first provider', () => {
    expect(listProviders()).toContain('openrouter');
    expect(getProvider('openrouter').id).toBe('openrouter');
    expect(() => getProvider('unknown-provider')).toThrow(ProviderUnavailableError);
  });
});

describe('M2B-1 OpenRouter adapter', () => {
  it('uses the OpenAI-compatible endpoint and normalizes output', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okPayload()));
    const adapter = createOpenRouterAdapter({ fetchImpl });
    const result = await adapter.chat({ model: 'mistralai/mistral-nemo', messages, apiKey: TEST_KEY, maxTokens: authorizedMaxTokens, privacyPolicy: MIA_PRIVACY_POLICY, ...grantCallArgs() });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'mistralai/mistral-nemo', max_tokens: authorizedMaxTokens, stream: false });
    expect(body.provider).toMatchObject({ zdr: true, data_collection: 'deny', allow_fallbacks: false, require_parameters: true });
    expect(result).toMatchObject({
      provider: 'openrouter',
      content: 'Synthetic reply',
      usage: { promptTokens: 11, completionTokens: 7 },
      pricingKnown: false,
    });
    expect(result.cost.estimate).toBeGreaterThan(0);
    expect(result.cost.confirmed).toBeNull();
  });

  it('fails closed without a server-supplied key', async () => {
    const fetchImpl = vi.fn();
    const adapter = createOpenRouterAdapter({ fetchImpl });
    await expect(adapter.chat({ model: 'mistralai/mistral-nemo', messages, privacyPolicy: MIA_PRIVACY_POLICY, maxTokens: authorizedMaxTokens, ...grantCallArgs() })).rejects.toThrow(InvalidCredentialsError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [401, InvalidCredentialsError],
    [429, RateLimitedError],
    [504, ProviderTimeoutError],
    [500, ProviderUnavailableError],
  ])('maps HTTP %i to a safe error', async (status, ErrorType) => {
    const adapter = createOpenRouterAdapter({ fetchImpl: async () => jsonResponse({ error: 'nope' }, status) });
    await expect(adapter.chat({ model: 'mistralai/mistral-nemo', messages, apiKey: TEST_KEY, privacyPolicy: MIA_PRIVACY_POLICY, maxTokens: authorizedMaxTokens, ...grantCallArgs() })).rejects.toThrow(ErrorType);
  });

  it('rejects malformed or empty provider responses', async () => {
    const adapter = createOpenRouterAdapter({ fetchImpl: async () => jsonResponse({ choices: [] }) });
    await expect(adapter.chat({ model: 'mistralai/mistral-nemo', messages, apiKey: TEST_KEY, privacyPolicy: MIA_PRIVACY_POLICY, maxTokens: authorizedMaxTokens, ...grantCallArgs() })).rejects.toThrow(ProviderResponseError);
  });

  it('maps abort to timeout', async () => {
    const adapter = createOpenRouterAdapter({
      fetchImpl: async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      },
    });
    await expect(adapter.chat({ model: 'mistralai/mistral-nemo', messages, apiKey: TEST_KEY, privacyPolicy: MIA_PRIVACY_POLICY, maxTokens: authorizedMaxTokens, ...grantCallArgs() })).rejects.toThrow(ProviderTimeoutError);
  });
});

describe('M2B-1 model classification', () => {
  it('treats explicit zero prices as free only', () => {
    expect(classifyCost({ pricing: { promptPerToken: 0, completionPerToken: 0 } })).toBe(COST_FREE);
    expect(classifyCost({ pricing: { promptPerToken: 0.000001, completionPerToken: 0.000002 } })).toBe(COST_PAID);
  });

  it('never treats missing, dynamic or unknown prices as free', () => {
    expect(classifyCost({})).toBe(COST_UNKNOWN);
    expect(classifyCost({ pricing: {} })).toBe(COST_UNKNOWN);
    expect(classifyCost({ pricing: { promptPerToken: -1, completionPerToken: -1 } })).toBe(COST_UNKNOWN);
    expect(classifyCost(null)).toBe(COST_UNKNOWN);
  });

  it('marks the operator-declared pilot paid without inventing a price', () => {
    const model = findModel('mistralai/mistral-nemo');
    expect(model).not.toBeNull();
    expect(model.pricing).toEqual({ promptPerToken: null, completionPerToken: null });
    expect(classifyCost(model)).toBe(COST_PAID);
  });

  it('reports conservative capability metadata', () => {
    expect(capabilitiesFor('mistralai/mistral-nemo')).toMatchObject({ text: true, vision: false, transcription: false });
    expect(supportsCapability('mistralai/mistral-nemo', 'text')).toBe(true);
    expect(supportsCapability('mistralai/mistral-nemo', 'vision')).toBe(false);
    expect(capabilitiesFor('not/a-model')).toBeNull();
    expect(supportsCapability('not/a-model', 'text')).toBe(false);
  });
});

describe('M2B-1 common contract', () => {
  it('delegates through the central gateway and fails closed without consent', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okPayload()));
    const result = await executeTextTask({
      providerId: 'openrouter',
      modelId: 'mistralai/mistral-nemo',
      messages,
      apiKey: TEST_KEY,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('live_execution_disabled');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a model/provider mismatch without contacting a provider', async () => {
    const result = await executeTextTask({
      providerId: 'other',
      modelId: 'mistralai/mistral-nemo',
      messages,
      apiKey: TEST_KEY,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'provider_unavailable' } });
  });
});

describe('M2B-1 credential isolation', () => {
  it('keeps keys out of results, errors and browser-facing source', async () => {
    const adapter = createOpenRouterAdapter({ fetchImpl: async () => jsonResponse(okPayload()) });
    const result = await adapter.chat({ model: 'mistralai/mistral-nemo', messages, apiKey: TEST_KEY, privacyPolicy: MIA_PRIVACY_POLICY, maxTokens: authorizedMaxTokens, ...grantCallArgs() });
    expect(JSON.stringify(result)).not.toContain(TEST_KEY);
    const source = [
      readFileSync('server/ai/index.mjs', 'utf8'),
      readFileSync('server/ai/provider-registry.mjs', 'utf8'),
      readFileSync('server/ai/model-registry.mjs', 'utf8'),
      readFileSync('server/ai/providers/openrouter.mjs', 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/localStorage|sessionStorage|window\./);
    expect(source).not.toContain(TEST_KEY);
  });
});
