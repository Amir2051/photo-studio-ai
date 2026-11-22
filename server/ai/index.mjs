// Backward-compatible facade. Historically this module called a provider
// adapter directly, bypassing consent, privacy, budget and ledger controls.
// It now delegates through the single central gateway; no direct adapter call
// remains here. The public { ok, ... } shape is preserved.

import { findModel } from './model-registry.mjs';
import { createCentralGateway } from './central-gateway.mjs';

export async function executeTextTask({
  providerId = 'openrouter',
  modelId = 'qwen/qwen3.8-27b',
  messages = [],
  apiKey = null,
  maxTokens = 500,
  signal,
  fetchImpl,
  consentRef = null,
  userRef = null,
} = {}) {
  const model = findModel(modelId);
  if (!model) {
    return { ok: false, error: { code: 'provider_unavailable', message: 'That model is not in the server catalog.' } };
  }
  if (model.provider !== providerId) {
    return { ok: false, error: { code: 'provider_unavailable', message: 'The model does not belong to the selected provider.' } };
  }
  const gateway = createCentralGateway({ apiKey, fetchImpl });
  return gateway.run({
    task: 'chat',
    miaIdentity: model.miaIdentity,
    modelId,
    messages,
    maxTokens,
    signal,
    consentRef,
    userRef,
  });
}
