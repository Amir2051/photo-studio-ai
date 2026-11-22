// Server-side spending controls. A per-request ceiling is supplied by the MIA
// route and checked before provider access; the cumulative ceiling is
// process-local until durable storage is configured. Neither limit increases automatically.

export const MAX_MIA_REQUEST_COST_USD = 0.001;
export const MIA_CUMULATIVE_PROCESS_CEILING_USD = 0.05;
// Backward-compatible name retained for the existing controlled-pilot tests.
export const MISTRAL_PILOT_CEILING_USD = MIA_CUMULATIVE_PROCESS_CEILING_USD;

export function withinRequestCostLimit(estimatedCostUsd, maxEstimatedCostUsd = MAX_MIA_REQUEST_COST_USD) {
  return typeof estimatedCostUsd === 'number' && Number.isFinite(estimatedCostUsd) && estimatedCostUsd > 0 &&
    typeof maxEstimatedCostUsd === 'number' && Number.isFinite(maxEstimatedCostUsd) && maxEstimatedCostUsd > 0 &&
    estimatedCostUsd <= maxEstimatedCostUsd;
}

export function createBudget() {
  return {
    ceilingUsd: MIA_CUMULATIVE_PROCESS_CEILING_USD,
    reservedUsd: 0,
    confirmedUsd: 0,
    reservations: new Map(),
  };
}

export function remainingUsd(budget) {
  return +(budget.ceilingUsd - budget.reservedUsd - budget.confirmedUsd).toFixed(6);
}

export function reserveSpend({ budget, requestId, estimatedCostUsd }) {
  if (typeof estimatedCostUsd !== 'number' || !Number.isFinite(estimatedCostUsd) || estimatedCostUsd <= 0) {
    return { ok: false, error: { code: 'pricing_unknown', message: 'Cannot reserve spend without a reliable estimate.' } };
  }
  if (budget.reservations.has(requestId)) {
    return { ok: false, error: { code: 'duplicate_request', message: 'This request already has a reservation.' } };
  }
  if (estimatedCostUsd > remainingUsd(budget)) {
    return { ok: false, error: { code: 'budget_exceeded', message: 'The authorized pilot allowance would be exceeded.' } };
  }
  budget.reservations.set(requestId, estimatedCostUsd);
  budget.reservedUsd = +(budget.reservedUsd + estimatedCostUsd).toFixed(6);
  return { ok: true, remainingUsd: remainingUsd(budget) };
}

// Confirmed cost is recorded separately from the estimate. A null/unknown
// confirmation keeps the amount unconfirmed but still consumes the reserve.
export function confirmSpend({ budget, requestId, confirmedCostUsd = null }) {
  const reserved = budget.reservations.get(requestId);
  if (typeof reserved !== 'number') {
    return { ok: false, error: { code: 'no_reservation', message: 'No reservation exists for this request.' } };
  }
  budget.reservations.delete(requestId);
  budget.reservedUsd = +(budget.reservedUsd - reserved).toFixed(6);
  const confirmed = typeof confirmedCostUsd === 'number' && Number.isFinite(confirmedCostUsd) && confirmedCostUsd >= 0
    ? confirmedCostUsd
    : null;
  if (confirmed !== null) budget.confirmedUsd = +(budget.confirmedUsd + confirmed).toFixed(6);
  return {
    ok: true,
    confirmed,
    status: confirmed === null ? 'unknown' : 'confirmed',
    remainingUsd: remainingUsd(budget),
  };
}

export function releaseSpend({ budget, requestId }) {
  const reserved = budget.reservations.get(requestId);
  if (typeof reserved !== 'number') return { ok: false };
  budget.reservations.delete(requestId);
  budget.reservedUsd = +(budget.reservedUsd - reserved).toFixed(6);
  return { ok: true, remainingUsd: remainingUsd(budget) };
}
