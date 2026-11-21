// Server-side model catalog for M2B-2. Built on the M2B-1 registry: the old
// API (classifyCost/findModel/listModels/capabilitiesFor/supportsCapability)
// is preserved, while structured identity, capability, modality, pricing and
// availability metadata is added. Nothing here is invented: unverified prices,
// context limits and provider model IDs remain null.

export const COST_FREE = 'free';
export const COST_PAID = 'paid';
export const COST_UNKNOWN = 'unknown';

export const MIA_IDENTITIES = {
  assistant: 'MIA Assistant',
  video: 'MIA Video Intelligence',
  advanced: 'MIA Advanced Analysis',
};

const noCapabilities = Object.freeze({
  text: false,
  generalChat: false,
  editingInstructions: false,
  structuredOutput: false,
  toolCalling: false,
  vision: false,
  videoUnderstanding: false,
  sceneAnalysis: false,
  audioDialogue: false,
  captionTranscription: false,
  complexReasoning: false,
  transcription: false,
});

export const MODELS = [
  {
    // --- M2B-1 compatible fields ---
    id: 'mistralai/mistral-nemo',
    provider: 'openrouter',
    name: 'Mistral Nemo',
    declaredCost: COST_PAID,
    pricing: { promptPerToken: null, completionPerToken: null },
    capabilities: {
      ...noCapabilities,
      text: true,
      generalChat: true,
      editingInstructions: true,
    },
    verified: false,
    // --- M2B-2 structured metadata ---
    miaIdentity: MIA_IDENTITIES.assistant,
    providerModelId: 'mistralai/mistral-nemo',
    modelVersion: null,
    inputModalities: ['text'],
    outputModalities: ['text'],
    contextWindow: null,
    pricingStatus: 'unverified',
    pricingSource: 'operator-declared paid pilot; exact price not verified',
    availability: 'adapter-ready',
    adapterAvailable: true,
    // Live execution stays gated until the separately approved M2B-4 pilot.
    liveExecutionEnabled: false,
  },
  {
    id: 'planned/gemini-video-intelligence',
    provider: null,
    name: 'Gemini-family video intelligence (planned)',
    declaredCost: COST_UNKNOWN,
    pricing: { promptPerToken: null, completionPerToken: null },
    capabilities: { ...noCapabilities },
    verified: false,
    miaIdentity: MIA_IDENTITIES.video,
    providerModelId: null,
    modelVersion: null,
    inputModalities: [],
    outputModalities: [],
    contextWindow: null,
    pricingStatus: 'unverified',
    pricingSource: 'none — provider/model not authorized',
    availability: 'planned',
    adapterAvailable: false,
    liveExecutionEnabled: false,
  },
  {
    id: 'planned/advanced-analysis',
    provider: null,
    name: 'Advanced analysis (planned)',
    declaredCost: COST_UNKNOWN,
    pricing: { promptPerToken: null, completionPerToken: null },
    capabilities: { ...noCapabilities },
    verified: false,
    miaIdentity: MIA_IDENTITIES.advanced,
    providerModelId: null,
    modelVersion: null,
    inputModalities: [],
    outputModalities: [],
    contextWindow: null,
    pricingStatus: 'unverified',
    pricingSource: 'none — provider/model not selected',
    availability: 'planned',
    adapterAvailable: false,
    liveExecutionEnabled: false,
  },
];

// OpenRouter sentinels: -1 = dynamic router (unknown final price), 0 = an
// explicit zero price. Missing prices fail closed.
export function classifyCost(model) {
  if (!model) return COST_UNKNOWN;
  if (model.declaredCost === COST_PAID) return COST_PAID;
  const price = model.pricing;
  if (!price) return COST_UNKNOWN;
  const prompt = price.promptPerToken;
  const completion = price.completionPerToken;
  if (typeof prompt !== 'number' || typeof completion !== 'number') return COST_UNKNOWN;
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) return COST_UNKNOWN;
  if (prompt < 0 || completion < 0) return COST_UNKNOWN;
  return prompt === 0 && completion === 0 ? COST_FREE : COST_PAID;
}

export function findModel(id) {
  return MODELS.find((model) => model.id === id) ?? null;
}

export function findByMiaIdentity(identity) {
  return MODELS.find((model) => model.miaIdentity === identity) ?? null;
}

export function listModels() {
  return MODELS.map((model) => ({
    ...model,
    capabilities: { ...model.capabilities },
    costClass: classifyCost(model),
  }));
}

export function capabilitiesFor(id) {
  const model = findModel(id);
  return model ? { ...model.capabilities } : null;
}

export function supportsCapability(id, capability) {
  const caps = capabilitiesFor(id);
  return caps ? caps[capability] === true : false;
}

export function validateRegistry(models = MODELS) {
  const ids = new Set();
  const identities = new Set();
  for (const model of models) {
    if (typeof model.id !== 'string' || !model.id) throw new Error('Registry: model id is required');
    if (ids.has(model.id)) throw new Error(`Registry: duplicate model id ${model.id}`);
    ids.add(model.id);
    if (typeof model.miaIdentity !== 'string' || !model.miaIdentity) {
      throw new Error(`Registry: MIA identity is required for ${model.id}`);
    }
    if (identities.has(model.miaIdentity)) {
      throw new Error(`Registry: duplicate MIA identity ${model.miaIdentity}`);
    }
    identities.add(model.miaIdentity);
    const cost = classifyCost(model);
    if (cost === COST_FREE && !(model.pricing?.promptPerToken === 0 && model.pricing?.completionPerToken === 0)) {
      throw new Error(`Registry: ${model.id} is free without an explicit zero price`);
    }
    if (model.liveExecutionEnabled) {
      if (!model.adapterAvailable || !model.provider || !model.providerModelId) {
        throw new Error(`Registry: ${model.id} cannot enable live execution without an adapter and provider model`);
      }
      if (cost === COST_UNKNOWN) {
        throw new Error(`Registry: ${model.id} cannot enable live execution with unknown pricing`);
      }
      // "Declared paid" is not enough: a verified price is required before a
      // paid model may execute live.
      if (model.pricingStatus !== 'verified' || model.pricing?.promptPerToken == null || model.pricing?.completionPerToken == null) {
        throw new Error(`Registry: ${model.id} cannot enable live execution without a verified price`);
      }
    }
    if (model.pricingStatus === 'verified' && !model.pricing?.promptPerToken) {
      throw new Error(`Registry: ${model.id} claims verified pricing without a price`);
    }
  }
  return true;
}

validateRegistry();
