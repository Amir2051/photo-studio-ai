// M2B-2 deterministic router. It never calls a provider; it only decides
// whether a registered, eligible model exists for a task and explains why.
// Provider branding is kept in the decision record for diagnostics; the MIA
// display identity is what a future interface would show.

import { listModels, classifyCost, COST_FREE, COST_PAID, COST_UNKNOWN } from './model-registry.mjs';

export const TASKS = Object.freeze({
  chat: { capability: 'generalChat', inputAnyOf: ['text'], outputAnyOf: ['text'] },
  editing_instructions: { capability: 'editingInstructions', inputAnyOf: ['text'], outputAnyOf: ['text'] },
  video_understanding: { capability: 'videoUnderstanding', inputAnyOf: ['video'], outputAnyOf: ['text'] },
  scene_analysis: { capability: 'sceneAnalysis', inputAnyOf: ['video', 'image'], outputAnyOf: ['text'] },
  audio_dialogue: { capability: 'audioDialogue', inputAnyOf: ['audio'], outputAnyOf: ['text'] },
  caption_transcription: { capability: 'captionTranscription', inputAnyOf: ['audio'], outputAnyOf: ['text'] },
  complex_reasoning: { capability: 'complexReasoning', inputAnyOf: ['text'], outputAnyOf: ['text'] },
});

function failure(code, message, explanation, rejected = []) {
  return { ok: false, error: { code, message }, explanation, rejected };
}

export function routeTask({
  task,
  inputModalities = [],
  outputModalities = [],
  miaIdentity = null,
  freeOnly = false,
} = {}) {
  const spec = TASKS[task];
  if (!spec) {
    return failure('unsupported_task', `Task ${String(task)} is not recognized.`, 'MIA cannot route this task.');
  }
  if (inputModalities.some((m) => !spec.inputAnyOf.includes(m))) {
    return failure('unsupported_modality', 'The requested input modality is not supported for this task.', 'MIA cannot accept this kind of input for the task.');
  }
  if (outputModalities.some((m) => !spec.outputAnyOf.includes(m))) {
    return failure('unsupported_modality', 'The requested output modality is not supported for this task.', 'MIA cannot produce this kind of output for the task.');
  }

  const rejected = [];
  for (const model of listModels()) {
    let reason = null;
    if (miaIdentity && model.miaIdentity !== miaIdentity) reason = 'different MIA identity';
    else if (!model.capabilities[spec.capability]) reason = `missing capability ${spec.capability}`;
    else if (!model.inputModalities.some((m) => spec.inputAnyOf.includes(m))) reason = 'input modality unsupported';
    else if (!model.outputModalities.some((m) => spec.outputAnyOf.includes(m))) reason = 'output modality unsupported';
    else if (!model.adapterAvailable || model.availability === 'planned') reason = 'no implemented adapter';
    else if (freeOnly && classifyCost(model) !== COST_FREE) reason = 'not a free model';
    if (reason) {
      rejected.push({ modelId: model.id, reason });
      continue;
    }

    const costClass = classifyCost(model);
    const decision = {
      ok: true,
      modelId: model.id,
      providerId: model.provider,
      providerModelId: model.providerModelId,
      modelVersion: model.modelVersion,
      miaIdentity: model.miaIdentity,
      task,
      costClass,
      pricingKnown: model.pricingStatus === 'verified' && model.pricing?.promptPerToken !== null,
      requiresConsent: costClass === COST_PAID,
      liveExecutionEnabled: model.liveExecutionEnabled,
      fallbackConsidered: false,
      rejected,
      reason: `registered capability ${spec.capability} with ${costClass} pricing`,
    };
    return { ok: true, decision, explanation: explainDecision(decision) };
  }
  return failure(
    'no_eligible_model',
    'No eligible model is registered for this task.',
    miaIdentity === 'MIA Video Intelligence'
      ? 'MIA Video Intelligence is not enabled yet.'
      : 'MIA cannot perform this task with the currently authorized models.',
    rejected,
  );
}

export function explainDecision(decision) {
  if (!decision || !decision.ok) return 'MIA cannot perform this task with the currently authorized models.';
  if (decision.miaIdentity === 'MIA Video Intelligence' && !decision.liveExecutionEnabled) {
    return 'MIA Video Intelligence is not enabled yet.';
  }
  if (decision.costClass === COST_PAID && decision.requiresConsent) {
    return decision.pricingKnown
      ? 'This request needs paid processing. No request was sent because approval is required.'
      : 'The estimated cost is unavailable, so this request was not submitted.';
  }
  return `${decision.miaIdentity} can handle this ${decision.task.replaceAll('_', ' ')} request.`;
}

export { COST_FREE, COST_PAID, COST_UNKNOWN };
