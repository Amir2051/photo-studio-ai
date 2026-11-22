// Scoped server-side usage ledger for M2B-2. In-memory only in this milestone;
// durable persistence is a documented follow-up. Records are sanitized so no
// API keys, authorization headers or raw secrets can be stored.

const SECRET_FIELD = /(^apiKey$|^authorization$|^accessToken$|^bearer$|secret|password|cookie)/i;

export function createUsageLedger() {
  const byId = new Map();
  return { byId };
}

export function appendAttempt(ledger, record = {}) {
  for (const key of Object.keys(record)) {
    if (SECRET_FIELD.test(key)) throw new Error('Ledger refuses secret-like fields');
  }
  if (typeof record.requestId !== 'string' || !record.requestId) {
    throw new Error('Ledger record requires a requestId');
  }
  const entry = Object.freeze({
    requestId: record.requestId,
    timestamp: record.timestamp ?? null,
    userRef: record.userRef ?? null,
    task: record.task ?? null,
    miaIdentity: record.miaIdentity ?? null,
    provider: record.provider ?? null,
    modelId: record.modelId ?? null,
    providerModelId: record.providerModelId ?? null,
    modelVersion: record.modelVersion ?? null,
    routingReason: record.routingReason ?? null,
    fallbackConsidered: record.fallbackConsidered ?? false,
    fallbackRejected: record.fallbackRejected ?? [],
    consentRef: record.consentRef ?? null,
    estimatedCostUsd: record.estimatedCostUsd ?? null,
    confirmedCostUsd: record.confirmedCostUsd ?? null,
    costStatus: record.costStatus ?? 'unknown',
    promptTokens: record.promptTokens ?? null,
    completionTokens: record.completionTokens ?? null,
    status: record.status ?? 'rejected',
    failureCategory: record.failureCategory ?? null,
  });
  ledger.byId.set(entry.requestId, entry);
  return entry;
}

export function getRecord(ledger, requestId) {
  return ledger.byId.get(requestId) ?? null;
}

export function listRecords(ledger) {
  return [...ledger.byId.values()];
}
