// Browser-facing type view of the pure M2B-2 router (server/ai/router.mjs).

export interface TaskSpec {
  capability: string;
  inputAnyOf: string[];
  outputAnyOf: string[];
}

export interface RoutingDecision {
  ok: true;
  modelId: string;
  providerId: string | null;
  providerModelId: string | null;
  modelVersion: string | null;
  miaIdentity: string;
  task: string;
  costClass: 'free' | 'paid' | 'unknown';
  pricingKnown: boolean;
  requiresConsent: boolean;
  liveExecutionEnabled: boolean;
  fallbackConsidered: boolean;
  rejected: Array<{ modelId: string; reason: string }>;
  reason: string;
}

export interface RoutingFailure {
  ok: false;
  error: { code: string; message: string };
  explanation: string;
  rejected: Array<{ modelId: string; reason: string }>;
}

export declare const TASKS: Record<string, TaskSpec>;
export declare function routeTask(options: {
  task: string;
  inputModalities?: string[];
  outputModalities?: string[];
  miaIdentity?: string | null;
  freeOnly?: boolean;
}): { ok: true; decision: RoutingDecision; explanation: string } | RoutingFailure;
export declare function explainDecision(decision: RoutingDecision | null): string;
