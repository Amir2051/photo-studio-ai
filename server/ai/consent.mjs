// Explicit paid-use consent artifacts. Consent is separate from routing and is
// never inferred from account balances, general settings or prior agreement.

import { randomUUID } from 'node:crypto';
import { COST_PAID } from './model-registry.mjs';

export function createConsentStore() {
  return new Map();
}

export function grantConsent({
  store,
  userId,
  task,
  modelId,
  providerId,
  estimatedCostUsd = null,
  note = '',
  now = () => Date.now(),
}) {
  if (!store || typeof store.set !== 'function') throw new Error('A consent store is required.');
  const id = typeof randomUUID === 'function' ? randomUUID() : `consent-${now()}-${Math.random()}`;
  const consent = Object.freeze({
    id,
    userId: userId ?? null,
    task,
    modelId,
    providerId,
    estimatedCostUsd,
    note,
    createdAt: now(),
  });
  store.set(id, consent);
  return consent;
}

export function requirePaidConsent({ decision, consentRef, store }) {
  if (decision.costClass !== COST_PAID) {
    return { ok: true, consent: null };
  }
  if (!consentRef || !store?.get?.(consentRef)) {
    return {
      ok: false,
      error: {
        code: 'consent_required',
        message: 'Paid processing requires explicit approval. No request was sent.',
      },
    };
  }
  const consent = store.get(consentRef);
  if (consent.task !== decision.task || consent.modelId !== decision.modelId || consent.providerId !== decision.providerId) {
    return {
      ok: false,
      error: { code: 'consent_mismatch', message: 'The approval does not match this task and model.' },
    };
  }
  // No reliable price => no paid request, even with consent.
  if (typeof consent.estimatedCostUsd !== 'number' || !Number.isFinite(consent.estimatedCostUsd) || consent.estimatedCostUsd <= 0) {
    return {
      ok: false,
      error: { code: 'pricing_unknown', message: 'The estimated cost is unavailable, so this request was not submitted.' },
    };
  }
  return { ok: true, consent };
}
