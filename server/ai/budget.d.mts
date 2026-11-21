// Browser-facing type view of the pure M2B-2 budget module (server/ai/budget.mjs).

export declare const MISTRAL_PILOT_CEILING_USD: number;

export interface BudgetState {
  ceilingUsd: number;
  reservedUsd: number;
  confirmedUsd: number;
  reservations: Map<string, number>;
}

export declare function createBudget(): BudgetState;
export declare function remainingUsd(budget: BudgetState): number;
export declare function reserveSpend(options: {
  budget: BudgetState;
  requestId: string;
  estimatedCostUsd: number | null;
}): { ok: boolean; remainingUsd?: number; error?: { code: string; message: string } };
export declare function confirmSpend(options: {
  budget: BudgetState;
  requestId: string;
  confirmedCostUsd?: number | null;
}): { ok: boolean; confirmed?: number | null; status?: string; remainingUsd?: number; error?: { code: string; message: string } };
export declare function releaseSpend(options: {
  budget: BudgetState;
  requestId: string;
}): { ok: boolean; remainingUsd?: number };
