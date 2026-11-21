// Server-only OpenRouter adapter. Uses the OpenAI-compatible chat completions
// endpoint already used by server/ai-gateway.mjs, with normalized results and
// fail-closed errors. Credentials are supplied by server configuration only;
// this module never reads browser storage or request bodies.

import {
  InvalidCredentialsError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RateLimitedError,
} from '../errors.mjs';
import { consumeTestGrant } from '../single-use-auth.mjs';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export function createOpenRouterAdapter(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (options.baseUrl ?? OPENROUTER_BASE_URL).replace(/\/$/, '');

  async function chat({
    model, messages, apiKey, maxTokens = 500, signal, fetchImpl: callFetch,
    privacyPolicy = null, testGrant = null, purpose = null, source = 'browser',
    maxEstimatedCostUsd = null, toolsPresent = false, attachmentCount = 0,
    operationId = null,
  } = {}) {
    const doFetch = callFetch ?? fetchImpl;
    const endpoint = `${baseUrl}/chat/completions`;
    // Final boundary: consume the single-use authorization BEFORE any key use
    // or network transmission. No retry or fallback exists in this adapter.
    const authorization = consumeTestGrant(testGrant, {
      processId: process.pid,
      source,
      purpose,
      operationId: operationId ?? purpose,
      provider: 'openrouter',
      model,
      endpoint,
      maxTokens,
      messages,
      messagesFingerprint: JSON.stringify(messages.map(({ role, content }) => ({ role, content }))),
      policyFingerprint: JSON.stringify(privacyPolicy ?? {}),
      maxEstimatedCostUsd,
      toolsPresent,
      attachmentCount,
      retry: false,
      fallback: false,
    });
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new InvalidCredentialsError();
    }
    if (typeof model !== 'string' || !model.trim()) {
      throw new ProviderUnavailableError('A model identifier is required.');
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ProviderResponseError('At least one message is required.');
    }

    const body = {
      model,
      messages: messages.map(({ role, content }) => ({ role, content })),
      max_tokens: maxTokens,
      stream: false,
    };
    if (privacyPolicy) {
      // Privacy controls are applied per request; no provider fallback and no
      // relaxation of ZDR / data-collection requirements.
      body.provider = {
        zdr: privacyPolicy.zdr === true,
        data_collection: privacyPolicy.dataCollection === 'deny' ? 'deny' : 'allow',
        allow_fallbacks: privacyPolicy.allowFallbacks === false ? false : true,
        ...(privacyPolicy.requireParameters === true ? { require_parameters: true } : {}),
      };
    }
    // If the policy cannot be applied, fail before transmission.
    if (!body.provider || body.provider.zdr !== true || body.provider.data_collection !== 'deny' || body.provider.allow_fallbacks !== false) {
      throw new ProviderUnavailableError('The privacy policy cannot be applied to this provider.');
    }

    let response;
    try {
      response = await doFetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(options.appUrl ? { 'HTTP-Referer': options.appUrl } : {}),
          ...(options.appName ? { 'X-Title': options.appName } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error && (error.name === 'AbortError' || error.code === 'ABORT_ERR')) {
        throw new ProviderTimeoutError();
      }
      throw new ProviderUnavailableError('The AI provider could not be reached.');
    }

    if (response.status === 401 || response.status === 403) throw new InvalidCredentialsError();
    if (response.status === 429) throw new RateLimitedError();
    if (response.status === 408 || response.status === 504) throw new ProviderTimeoutError();
    if (!response.ok) throw new ProviderUnavailableError();

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new ProviderResponseError();
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new ProviderResponseError('The AI provider returned no usable text.');
    }
    const usage = payload?.usage;
    return {
      provider: 'openrouter',
      // Report what the provider echoed, not what the caller requested.
      model: typeof payload?.model === 'string' ? payload.model : model,
      content,
      usage: {
        promptTokens: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
        completionTokens: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null,
      },
      // Estimated cost is computed from verified pricing; confirmed cost is
      // only what the provider actually reports (unavailable here).
      cost: { estimate: authorization.estimatedCostUsd, confirmed: null, currency: 'USD' },
      pricingKnown: false,
    };
  }

  return { id: 'openrouter', displayName: 'OpenRouter', supportsPrivacyPolicy: true, chat };
}
