import { describe, expect, it, vi } from 'vitest';
import { findModel, MIA_IDENTITIES } from '../server/ai/model-registry.mjs';
import { routeTask } from '../server/ai/router.mjs';
import { createCentralGateway } from '../server/ai/central-gateway.mjs';
import { withinRequestCostLimit, MAX_MIA_REQUEST_COST_USD } from '../server/ai/budget.mjs';

describe('Qwen primary MIA configuration', () => {
  it('registers Qwen3.8 27B with the exact Near AI ZDR endpoint and verified endpoint pricing', () => {
    const model = findModel('qwen/qwen3.8-27b');
    expect(model).toMatchObject({
      provider: 'openrouter',
      providerModelId: 'qwen/qwen3.8-27b',
      providerOrder: ['Near AI'],
      miaIdentity: MIA_IDENTITIES.qwenAssistant,
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      pricingStatus: 'verified',
      liveExecutionEnabled: false,
    });
    expect(model.pricing.promptPerToken).toBeCloseTo(0.04 / 1_000_000, 15);
    expect(model.pricing.completionPerToken).toBeCloseTo(1.35 / 1_000_000, 15);
  });

  it('routes chat and image analysis to Qwen without enabling live inference', () => {
    const chat = routeTask({
      task: 'chat',
      modelId: 'qwen/qwen3.8-27b',
      miaIdentity: MIA_IDENTITIES.qwenAssistant,
      inputModalities: ['text'],
      outputModalities: ['text'],
    });
    expect(chat).toMatchObject({
      ok: true,
      decision: {
        modelId: 'qwen/qwen3.8-27b',
        providerId: 'openrouter',
        providerOrder: ['Near AI'],
        liveExecutionEnabled: false,
      },
    });

    const vision = routeTask({
      task: 'scene_analysis',
      modelId: 'qwen/qwen3.8-27b',
      inputModalities: ['image'],
      outputModalities: ['text'],
    });
    expect(vision).toMatchObject({
      ok: true,
      decision: {
        modelId: 'qwen/qwen3.8-27b',
        providerOrder: ['Near AI'],
        liveExecutionEnabled: false,
      },
    });
  });

  it('blocks a Qwen inference request before network transmission until its separate pilot is approved', async () => {
    const fetchImpl = vi.fn();
    const gateway = createCentralGateway({ apiKey: 'server-only-test-key', fetchImpl });
    const result = await gateway.run({
      modelId: 'qwen/qwen3.8-27b',
      task: 'chat',
      miaIdentity: MIA_IDENTITIES.qwenAssistant,
      inputModalities: ['text'],
      outputModalities: ['text'],
      messages: [{ role: 'user', content: 'Do not send this test prompt.' }],
      maxTokens: 32,
      maxEstimatedCostUsd: 0.001,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'live_execution_disabled' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('enforces the approved $0.001 estimated cost ceiling per Qwen request', () => {
    expect(MAX_MIA_REQUEST_COST_USD).toBe(0.001);
    expect(withinRequestCostLimit(0.001, 0.001)).toBe(true);
    expect(withinRequestCostLimit(0.001001, 0.001)).toBe(false);
    expect(withinRequestCostLimit(null, 0.001)).toBe(false);
  });
});
