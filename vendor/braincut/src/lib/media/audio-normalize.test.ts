import { describe, expect, it } from 'vitest';
import type { EffectInstance } from '#lib/project/types.ts';
import { calculatePeakNormalization, withPeakNormalization } from './audio-normalize';

function volume(level = 0, keyframes: EffectInstance['keyframes']['level'] = []): EffectInstance {
  return {
    id: 'volume-1',
    type: 'volume',
    enabled: true,
    fixed: true,
    params: { level },
    keyframes: { level: [...keyframes] },
  };
}

describe('calculatePeakNormalization', () => {
  it('raises a quiet clip toward -1 dBFS within the boost limit', () => {
    expect(calculatePeakNormalization(-18, volume())).toEqual({
      status: 'limited',
      deltaDb: 12,
      resultingPeakDb: -6,
    });
  });

  it('attenuates a hot clip to the target peak', () => {
    expect(calculatePeakNormalization(-3, volume())).toEqual({
      status: 'ok',
      deltaDb: 2,
      resultingPeakDb: -1,
    });
  });

  it('accounts for existing gain and keyframed automation', () => {
    const effect = volume(-4, [
      { time: 0, value: -2, easing: 'linear' },
      { time: 2, value: 3, easing: 'linear' },
    ]);
    expect(calculatePeakNormalization(-8, effect)).toEqual({
      status: 'ok',
      deltaDb: 4,
      resultingPeakDb: -1,
    });
  });

  it('respects the maximum gain even when automation is already high', () => {
    const effect = volume(0, [{ time: 1, value: 11, easing: 'linear' }]);
    expect(calculatePeakNormalization(-20, effect)).toEqual({
      status: 'limited',
      deltaDb: 1,
      resultingPeakDb: -8,
    });
  });

  it('does not normalize silent source media', () => {
    expect(calculatePeakNormalization(-60, volume()).status).toBe('silent');
  });

  it('does not normalize a disabled volume effect', () => {
    expect(calculatePeakNormalization(-12, { ...volume(), enabled: false }).status).toBe('disabled');
  });

  it('does not unmute a clip muted at every keyframe', () => {
    expect(calculatePeakNormalization(-12, volume(-60, [
      { time: 0, value: -60, easing: 'linear' },
    ])).status).toBe('muted');
  });

  it('rejects invalid peak measurements', () => {
    expect(calculatePeakNormalization(Number.NaN, volume()).status).toBe('invalid');
  });
});

describe('withPeakNormalization', () => {
  it('applies a shared offset to base gain and every automation keyframe without mutating input', () => {
    const original = volume(-4, [
      { time: 0, value: -2, easing: 'linear' },
      { time: 2, value: 3, easing: 'ease-out' },
    ]);
    const updated = withPeakNormalization(original, 4);

    expect(updated.params.level).toBe(0);
    expect(updated.keyframes.level?.map((key) => key.value)).toEqual([2, 7]);
    expect(updated.keyframes.level?.[1].easing).toBe('ease-out');
    expect(original.params.level).toBe(-4);
    expect(original.keyframes.level?.map((key) => key.value)).toEqual([-2, 3]);
  });

  it('clamps every adjusted level to the supported dB range', () => {
    const updated = withPeakNormalization(volume(10, [
      { time: 1, value: 11, easing: 'linear' },
    ]), 5);
    expect(updated.params.level).toBe(12);
    expect(updated.keyframes.level?.[0].value).toBe(12);
  });
});
