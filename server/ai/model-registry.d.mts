// Browser-facing type view of the pure M2B-2 server registry.
// This declaration file mirrors server/ai/model-registry.mjs; it contains no logic.

export type CostClass = 'free' | 'paid' | 'unknown';

export interface ModelCapabilities {
  text: boolean;
  generalChat: boolean;
  editingInstructions: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
  vision: boolean;
  videoUnderstanding: boolean;
  sceneAnalysis: boolean;
  audioDialogue: boolean;
  captionTranscription: boolean;
  complexReasoning: boolean;
  transcription: boolean;
}

export interface RegistryModel {
  id: string;
  provider: string | null;
  name: string;
  miaIdentity: string;
  providerModelId: string | null;
  modelVersion: string | null;
  inputModalities: string[];
  outputModalities: string[];
  contextWindow: number | null;
  pricing: { promptPerToken: number | null; completionPerToken: number | null };
  pricingStatus: string;
  pricingSource: string;
  declaredCost?: CostClass;
  availability: string;
  adapterAvailable: boolean;
  liveExecutionEnabled: boolean;
  verified: boolean;
  capabilities: ModelCapabilities;
  costClass?: CostClass;
}

export declare const COST_FREE: CostClass;
export declare const COST_PAID: CostClass;
export declare const COST_UNKNOWN: CostClass;
export declare const MIA_IDENTITIES: { assistant: string; video: string; advanced: string };
export declare const MODELS: RegistryModel[];
export declare function classifyCost(model: RegistryModel | null): CostClass;
export declare function findModel(id: string): RegistryModel | null;
export declare function findByMiaIdentity(identity: string): RegistryModel | null;
export declare function listModels(): RegistryModel[];
export declare function capabilitiesFor(id: string): ModelCapabilities | null;
export declare function supportsCapability(id: string, capability: keyof ModelCapabilities): boolean;
export declare function validateRegistry(models?: RegistryModel[]): boolean;
