// Verified pricing and deterministic cost estimation for the single authorized
// local test. Prices come from the public OpenRouter model page for the exact
// provider/model, retrieved 2026-11-19. Unknown models/prices fail closed.

export const PRICING_SOURCE =
  'https://openrouter.ai/mistralai/mistral-nemo';
export const PRICING_RETRIEVED_AT = '2026-11-19';
export const TEST_PROVIDER = 'io-net'; // endpoint slug io-net/fp16 in public ZDR registry
export const TEST_MODEL = 'mistralai/mistral-nemo';

// OpenRouter catalog values (USD per 1M tokens) for io.net endpoint.
export const MODEL_PRICING = Object.freeze({
  'mistralai/mistral-nemo': Object.freeze({
    promptPerTokenUsd: 0.01656 / 1_000_000,
    completionPerTokenUsd: 0.0216 / 1_000_000,
    source: PRICING_SOURCE,
    retrievedAt: PRICING_RETRIEVED_AT,
  }),
});

export class PricingUnavailableError extends Error {
  constructor(message = 'Verified pricing is unavailable for this model.') {
    super(message);
    this.name = 'PricingUnavailableError';
  }
}

export function estimatePromptTokens(messages) {
  if (!Array.isArray(messages)) throw new PricingUnavailableError('Messages are required for cost estimation.');
  return messages.reduce((total, message) => {
    const text = typeof message?.content === 'string' ? message.content : JSON.stringify(message?.content ?? '');
    return total + Math.ceil(text.length / 4) + 4;
  }, 0);
}

export function estimateRequestCost({ messages, maxTokens, modelId = TEST_MODEL } = {}) {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) throw new PricingUnavailableError();
  if (!Number.isInteger(maxTokens) || maxTokens < 1) throw new PricingUnavailableError('A valid output-token limit is required.');
  const promptTokens = estimatePromptTokens(messages);
  const estimatedUsd = +(promptTokens * pricing.promptPerTokenUsd + maxTokens * pricing.completionPerTokenUsd).toFixed(12);
  if (!(estimatedUsd > 0)) throw new PricingUnavailableError('The computed estimate is invalid.');
  return {
    modelId,
    promptTokens,
    maxOutputTokens: maxTokens,
    estimatedUsd,
    pricing: {
      promptPerTokenUsd: pricing.promptPerTokenUsd,
      completionPerTokenUsd: pricing.completionPerTokenUsd,
      source: pricing.source,
      retrievedAt: pricing.retrievedAt,
    },
  };
}
