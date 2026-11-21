import { describe, expect, it, vi } from 'vitest';
import {
  MODELS,
  MIA_IDENTITIES,
  classifyCost,
  findByMiaIdentity,
  findModel,
  listModels,
  validateRegistry,
} from '../server/ai/model-registry.mjs';
import { routeTask, explainDecision } from '../server/ai/router.mjs';
import { createConsentStore, grantConsent, requirePaidConsent } from '../server/ai/consent.mjs';
import {
  MISTRAL_PILOT_CEILING_USD,
  confirmSpend,
  createBudget,
  remainingUsd,
  reserveSpend,
} from '../server/ai/budget.mjs';
import { appendAttempt, createUsageLedger, getRecord, listRecords } from '../server/ai/ledger.mjs';
import { executeMiaTask } from '../server/ai/execute.mjs';
import { MIA_PRIVACY_POLICY } from '../server/ai/central-gateway.mjs';

describe('M2B-2 registry', () => {
  it('validates the shipped registry and preserves diagnostic identities', () => {
    expect(validateRegistry()).toBe(true);
    const models = listModels();
    const pilot = models.find((m) => m.id === 'mistralai/mistral-nemo');
    expect(pilot).toMatchObject({
      miaIdentity: 'MIA Assistant',
      provider: 'openrouter',
      providerModelId: 'mistralai/mistral-nemo',
      costClass: 'paid',
      adapterAvailable: true,
      liveExecutionEnabled: false,
    });
    expect(findByMiaIdentity(MIA_IDENTITIES.video)).toMatchObject({ availability: 'planned', adapterAvailable: false });
    expect(findByMiaIdentity(MIA_IDENTITIES.advanced)).toMatchObject({ provider: null, providerModelId: null });
  });

  it('rejects duplicate IDs and identities', () => {
    expect(() => validateRegistry([MODELS[0], MODELS[0]])).toThrow(/duplicate model id/);
    expect(() => validateRegistry([MODELS[0], { ...MODELS[0], id: 'other/id' }])).toThrow(/duplicate MIA identity/);
  });

  it('never treats unknown or dynamic pricing as free', () => {
    expect(classifyCost({ pricing: { promptPerToken: -1, completionPerToken: -1 } })).toBe('unknown');
    expect(classifyCost({ pricing: {} })).toBe('unknown');
    expect(classifyCost({ pricing: { promptPerToken: 0, completionPerToken: 0 } })).toBe('free');
    expect(() => validateRegistry([{ ...MODELS[0], declaredCost: undefined, pricing: { promptPerToken: 0, completionPerToken: 0 } }])).not.toThrow();
  });

  it('requires an adapter and known price before live execution', () => {
    expect(() => validateRegistry([{ ...MODELS[0], liveExecutionEnabled: true }])).toThrow(/verified price|unknown pricing/);
    expect(() => validateRegistry([{ ...MODELS[1], liveExecutionEnabled: true }])).toThrow(/adapter/);
  });

  it('does not invent video or advanced capabilities', () => {
    expect(findByMiaIdentity(MIA_IDENTITIES.video).capabilities.videoUnderstanding).toBe(false);
    expect(findByMiaIdentity(MIA_IDENTITIES.advanced).capabilities.complexReasoning).toBe(false);
    expect(findModel('not/a-model')).toBeNull();
  });
});

describe('M2B-2 routing', () => {
  it('routes MIA Assistant text tasks to Mistral without enabling live execution', () => {
    const routed = routeTask({ task: 'editing_instructions' });
    expect(routed.ok).toBe(true);
    expect(routed.decision).toMatchObject({
      miaIdentity: 'MIA Assistant',
      providerId: 'openrouter',
      providerModelId: 'mistralai/mistral-nemo',
      costClass: 'paid',
      requiresConsent: true,
      pricingKnown: false,
      liveExecutionEnabled: false,
      fallbackConsidered: false,
    });
    expect(explainDecision(routed.decision)).toContain('estimated cost is unavailable');
  });

  it('rejects video, audio and complex tasks instead of substituting a model', () => {
    for (const task of ['video_understanding', 'scene_analysis', 'audio_dialogue', 'caption_transcription', 'complex_reasoning']) {
      const routed = routeTask({ task });
      expect(routed.ok).toBe(false);
      expect(routed.error.code).toBe('no_eligible_model');
      expect(routed.rejected.length).toBeGreaterThan(0);
    }
    const video = routeTask({ task: 'video_understanding', miaIdentity: MIA_IDENTITIES.video });
    expect(video.explanation).toBe('MIA Video Intelligence is not enabled yet.');
  });

  it('rejects unknown tasks, wrong modalities and free-only requests', () => {
    expect(routeTask({ task: 'nonsense' }).error.code).toBe('unsupported_task');
    expect(routeTask({ task: 'chat', inputModalities: ['video'] }).error.code).toBe('unsupported_modality');
    expect(routeTask({ task: 'chat', freeOnly: true }).error.code).toBe('no_eligible_model');
  });
});

describe('M2B-2 consent', () => {
  it('requires explicit, matching consent with a known estimate for paid work', () => {
    const store = createConsentStore();
    const decision = routeTask({ task: 'chat' }).decision;
    expect(requirePaidConsent({ decision, consentRef: null, store }).error.code).toBe('consent_required');
    const consent = grantConsent({
      store,
      userId: 'user-1',
      task: 'chat',
      modelId: decision.modelId,
      providerId: decision.providerId,
      estimatedCostUsd: 0.001,
    });
    expect(requirePaidConsent({ decision, consentRef: consent.id, store }).ok).toBe(true);
    const wrong = grantConsent({ store, task: 'editing_instructions', modelId: decision.modelId, providerId: decision.providerId, estimatedCostUsd: 0.001 });
    expect(requirePaidConsent({ decision, consentRef: wrong.id, store }).error.code).toBe('consent_mismatch');
    const unknown = grantConsent({ store, task: 'chat', modelId: decision.modelId, providerId: decision.providerId, estimatedCostUsd: null });
    expect(requirePaidConsent({ decision, consentRef: unknown.id, store }).error.code).toBe('pricing_unknown');
  });

  it('does not require consent for a free model', () => {
    const freeDecision = { costClass: 'free', task: 'chat', modelId: 'free/model', providerId: 'p' };
    expect(requirePaidConsent({ decision: freeDecision, store: createConsentStore() })).toMatchObject({ ok: true, consent: null });
  });
});

describe('M2B-2 budget ceiling', () => {
  it('enforces the $0.05 cumulative Mistral pilot ceiling', () => {
    const budget = createBudget();
    expect(budget.ceilingUsd).toBe(0.05);
    expect(MISTRAL_PILOT_CEILING_USD).toBe(0.05);
    expect(reserveSpend({ budget, requestId: 'a', estimatedCostUsd: 0.03 }).ok).toBe(true);
    expect(remainingUsd(budget)).toBe(0.02);
    expect(reserveSpend({ budget, requestId: 'b', estimatedCostUsd: 0.03 }).error.code).toBe('budget_exceeded');
    expect(confirmSpend({ budget, requestId: 'a', confirmedCostUsd: 0.01 })).toMatchObject({ ok: true, status: 'confirmed' });
    expect(remainingUsd(budget)).toBe(0.04);
  });

  it('keeps unknown billing unconfirmed and never reuses an estimate as a charge', () => {
    const budget = createBudget();
    reserveSpend({ budget, requestId: 'x', estimatedCostUsd: 0.02 });
    const result = confirmSpend({ budget, requestId: 'x', confirmedCostUsd: null });
    expect(result).toMatchObject({ ok: true, status: 'unknown', confirmed: null });
    expect(budget.confirmedUsd).toBe(0);
    expect(remainingUsd(budget)).toBe(0.05);
  });

  it('rejects missing estimates and duplicate reservations', () => {
    const budget = createBudget();
    expect(reserveSpend({ budget, requestId: 'x', estimatedCostUsd: null }).error.code).toBe('pricing_unknown');
    reserveSpend({ budget, requestId: 'x', estimatedCostUsd: 0.01 });
    expect(reserveSpend({ budget, requestId: 'x', estimatedCostUsd: 0.01 }).error.code).toBe('duplicate_request');
  });
});

describe('M2B-2 ledger and execution', () => {
  it('stores auditable diagnostics and refuses secret-like fields', () => {
    const ledger = createUsageLedger();
    const entry = appendAttempt(ledger, {
      requestId: 'req-1',
      userRef: 'user-1',
      task: 'chat',
      miaIdentity: 'MIA Assistant',
      provider: 'openrouter',
      modelId: 'mistralai/mistral-nemo',
      providerModelId: 'mistralai/mistral-nemo',
      modelVersion: null,
      routingReason: 'registered capability generalChat with paid pricing',
      consentRef: 'consent-1',
      status: 'rejected',
      failureCategory: 'live_execution_disabled',
    });
    expect(entry).toMatchObject({ provider: 'openrouter', modelId: 'mistralai/mistral-nemo', consentRef: 'consent-1' });
    expect(getRecord(ledger, 'req-1')).toBe(entry);
    expect(listRecords(ledger)).toHaveLength(1);
    expect(() => appendAttempt(ledger, { requestId: 'x', apiKey: 'secret' })).toThrow(/secret-like/);
  });

  it('rejects an execution before any network call when live execution is disabled', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('must not be called'); });
    const ledger = createUsageLedger();
    const result = await executeMiaTask({
      task: 'chat',
      messages: [{ role: 'user', content: 'synthetic' }],
      apiKey: 'server-only-test-key',
      fetchImpl,
      ledger,
      consentStore: createConsentStore(),
      budget: createBudget(),
      privacyPolicy: MIA_PRIVACY_POLICY,
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('live_execution_disabled');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(listRecords(ledger)[0]).toMatchObject({ failureCategory: 'live_execution_disabled', fallbackConsidered: false });
  });

  it('records unsupported tasks without contacting a provider', async () => {
    const fetchImpl = vi.fn();
    const ledger = createUsageLedger();
    const result = await executeMiaTask({ task: 'video_understanding', fetchImpl, ledger });
    expect(result.error.code).toBe('no_eligible_model');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(listRecords(ledger)[0].modelId).toBeNull();
  });
});
