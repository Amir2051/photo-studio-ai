// M2B-2 execution orchestration: route → live gate → consent → budget →
// provider (only if explicitly enabled) → ledger. Every rejection is recorded;
// no success is fabricated and no fallback is attempted.

import { randomUUID } from 'node:crypto';
import { routeTask } from './router.mjs';
import { requirePaidConsent } from './consent.mjs';
import { reserveSpend, releaseSpend, confirmSpend } from './budget.mjs';
import { appendAttempt } from './ledger.mjs';
import { getProvider } from './provider-registry.mjs';
import { toPublicError } from './errors.mjs';
import { isGrantCandidate } from './single-use-auth.mjs';

function reject({ ledger, requestId, timestamp, userRef, task, miaIdentity, decision, consentRef, error, failureCategory }) {
  appendAttempt(ledger, {
    requestId,
    timestamp,
    userRef,
    task,
    miaIdentity: miaIdentity ?? decision?.miaIdentity ?? null,
    provider: decision?.providerId ?? null,
    modelId: decision?.modelId ?? null,
    providerModelId: decision?.providerModelId ?? null,
    modelVersion: decision?.modelVersion ?? null,
    routingReason: decision?.reason ?? null,
    consentRef: consentRef ?? null,
    estimatedCostUsd: null,
    costStatus: 'unknown',
    status: 'rejected',
    failureCategory: failureCategory ?? error.code,
  });
  return { ok: false, error, explanation: error.message };
}

export async function executeMiaTask({
  task,
  inputModalities = [],
  outputModalities = [],
  miaIdentity = null,
  freeOnly = false,
  messages = [],
  apiKey = null,
  maxTokens = 500,
  signal,
  fetchImpl,
  consentRef = null,
  consentStore,
  budget,
  ledger,
  userRef = null,
  now = () => Date.now(),
  privacyPolicy = null,
  testGrant = null,
  source = 'browser',
  purpose = null,
  operationId = null,
  maxEstimatedCostUsd = null,
} = {}) {
  const requestId = randomUUID();
  const timestamp = now();

  const routed = routeTask({ task, inputModalities, outputModalities, miaIdentity, freeOnly });
  if (!routed.ok) {
    return reject({ ledger, requestId, timestamp, userRef, task, miaIdentity, error: routed.error, failureCategory: routed.error.code });
  }
  const decision = routed.decision;

  // No request may reach an adapter without the enforced privacy policy.
  const policyOk = privacyPolicy && privacyPolicy.zdr === true
    && privacyPolicy.dataCollection === 'deny'
    && privacyPolicy.allowFallbacks === false;
  if (!policyOk) {
    return reject({
      ledger, requestId, timestamp, userRef, task, miaIdentity, decision, consentRef,
      error: { code: 'privacy_policy_missing', message: 'The privacy policy could not be enforced. No request was sent.' },
      failureCategory: 'privacy_policy_missing',
    });
  }

  // The registry gate stays authoritative. Only a valid in-memory single-use
  // candidate may pass it; the adapter performs the consuming check.
  if (!decision.liveExecutionEnabled && !isGrantCandidate(testGrant)) {
    return reject({
      ledger,
      requestId,
      timestamp,
      userRef,
      task,
      miaIdentity,
      decision,
      consentRef,
      error: { code: 'live_execution_disabled', message: `${decision.miaIdentity} is not enabled yet. No request was sent.` },
    });
  }

  const consent = requirePaidConsent({ decision, consentRef, store: consentStore });
  if (!consent.ok) {
    return reject({ ledger, requestId, timestamp, userRef, task, miaIdentity, decision, consentRef, error: consent.error });
  }

  let reservation = { ok: true };
  if (decision.costClass === 'paid') {
    reservation = reserveSpend({ budget, requestId, estimatedCostUsd: consent.consent.estimatedCostUsd });
    if (!reservation.ok) {
      return reject({ ledger, requestId, timestamp, userRef, task, miaIdentity, decision, consentRef, error: reservation.error });
    }
  }

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    if (reservation.ok && budget) releaseSpend({ budget, requestId });
    return reject({
      ledger,
      requestId,
      timestamp,
      userRef,
      task,
      miaIdentity,
      decision,
      consentRef,
      error: { code: 'credentials_missing', message: 'Server credentials are missing. No request was sent.' },
    });
  }

  let result;
  try {
    const provider = getProvider(decision.providerId);
    result = await provider.chat({
      model: decision.providerModelId,
      messages,
      apiKey,
      maxTokens,
      signal,
      fetchImpl,
      privacyPolicy,
      testGrant,
      purpose,
      operationId: operationId ?? purpose,
      source,
      maxEstimatedCostUsd: maxEstimatedCostUsd ?? budget?.ceilingUsd ?? null,
    });
  } catch (error) {
    if (reservation.ok && budget) releaseSpend({ budget, requestId });
    const publicError = toPublicError(error);
    return reject({
      ledger,
      requestId,
      timestamp,
      userRef,
      task,
      miaIdentity,
      decision,
      consentRef,
      error: publicError,
      failureCategory: publicError.code,
    });
  }

  const confirmation = reservation.ok && budget
    ? confirmSpend({ budget, requestId, confirmedCostUsd: null })
    : { status: 'unknown' };
  appendAttempt(ledger, {
    requestId,
    timestamp,
    userRef,
    task,
    miaIdentity: decision.miaIdentity,
    provider: result.provider,
    modelId: decision.modelId,
    providerModelId: decision.providerModelId,
    modelVersion: decision.modelVersion,
    routingReason: decision.reason,
    consentRef,
    estimatedCostUsd: consent.consent?.estimatedCostUsd ?? null,
    confirmedCostUsd: null,
    costStatus: confirmation.status,
    promptTokens: result.usage?.promptTokens ?? null,
    completionTokens: result.usage?.completionTokens ?? null,
    status: 'success',
  });
  return {
    ok: true,
    requestId,
    content: result.content,
    provider: result.provider,
    modelId: decision.modelId,
    miaIdentity: decision.miaIdentity,
    explanation: `MIA ${decision.miaIdentity} completed this task.`,
  };
}
