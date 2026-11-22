// Single policy-enforcement boundary for all MIA inference. Every entry point
// must call this module; no caller may obtain a provider adapter directly.
// This layer removes the two historical bypass paths and never enables live
// execution by itself (the registry's live gate remains authoritative).

import { executeMiaTask } from './execute.mjs';
import { createConsentStore } from './consent.mjs';
import { createBudget } from './budget.mjs';
import { createUsageLedger } from './ledger.mjs';
import { getProvider } from './provider-registry.mjs';

export const MIA_PRIVACY_POLICY = Object.freeze({
  zdr: true,
  dataCollection: 'deny',
  allowFallbacks: false,
  requireParameters: true,
});

function publicFailure(error) {
  return { ok: false, error: error && error.error ? error.error : { code: 'policy_rejected', message: 'The request was rejected before transmission.' } };
}

export function createCentralGateway(options = {}) {
  const consentStore = options.consentStore ?? createConsentStore();
  const budget = options.budget ?? createBudget();
  const ledger = options.ledger ?? createUsageLedger();
  const apiKey = options.apiKey ?? null;
  const fetchImpl = options.fetchImpl;

  async function run(request = {}) {
    // Validate policy support before any provider lookup or network activity.
    let provider;
    try {
      provider = getProvider(request.providerId ?? 'openrouter');
    } catch {
      return publicFailure({ error: { code: 'provider_unavailable', message: 'The provider is unavailable.' } });
    }
    if (!provider || provider.supportsPrivacyPolicy !== true) {
      return publicFailure({ error: { code: 'privacy_policy_unsupported', message: 'The provider cannot enforce the required privacy policy.' } });
    }

    const policy = { ...MIA_PRIVACY_POLICY };
    // Account-level ZDR Only is owner-confirmed but is not read from this
    // service. Request-level ZDR/data-collection flags are always enforced;
    // fail closed if callers attempt to relax them.
    if (request.privacyPolicy && JSON.stringify(request.privacyPolicy) !== JSON.stringify(policy)) {
      return publicFailure({ error: { code: 'privacy_policy_mismatch', message: 'The request does not match the enforced privacy policy.' } });
    }

    const result = await executeMiaTask({
      task: request.task,
      modelId: request.modelId ?? null,
      inputModalities: request.inputModalities ?? [],
      outputModalities: request.outputModalities ?? [],
      miaIdentity: request.miaIdentity ?? null,
      freeOnly: request.freeOnly ?? false,
      messages: request.messages ?? [],
      apiKey,
      maxTokens: request.maxTokens ?? 500,
      signal: request.signal,
      fetchImpl,
      consentRef: request.consentRef ?? null,
      consentStore,
      budget,
      ledger,
      userRef: request.userRef ?? null,
      privacyPolicy: policy,
      testGrant: request.testGrant ?? null,
      source: request.source ?? 'browser',
      purpose: request.purpose ?? null,
      operationId: request.operationId ?? null,
      maxEstimatedCostUsd: request.maxEstimatedCostUsd ?? null,
    });
    return result;
  }

  return { run, consentStore, budget, ledger };
}

// Shared singleton used by the HTTP gateway. Tests can create isolated instances.
let shared = null;
export function getCentralGateway(options = {}) {
  if (!shared) shared = createCentralGateway(options);
  return shared;
}
