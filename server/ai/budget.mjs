// Server-side spending control. The only authorized pilot ceiling is the
// Mistral/OpenRouter $0.05 cumulative maximum. It is a hard ceiling: no
// automatic increases, no resets on restart, no use of the account balance as
// an authorization mechanism.

export const MISTRAL_PILOT_CEILING_USD = 0.05;

export function createBudget() {
  return {
    ceilingUsd: MISTRAL_PILOT_CEILING_USD,
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
