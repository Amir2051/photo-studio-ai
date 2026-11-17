import { describe, expect, it } from 'vitest';
import { layerMaskStackWeight, layerMaskWeight, type LayerMask } from '../src/lib/layerMasks';

const base: LayerMask = {
  id: 'mask-1',
  kind: 'brush',
  strokes: [{ points: [{ x: 0.5, y: 0.5 }], size: 20, mode: 'hide' }],
  start: { x: 0.5, y: 0.5 },
  end: { x: 0.5, y: 1 },
  radius: 30,
  feather: 0,
  inverted: false,
  enabled: true,
};

describe('per-layer mask math', () => {
  it('hides painted pixels and leaves distant pixels visible', () => {
    expect(layerMaskWeight(base, 50, 50, 100, 100)).toBe(0);
    expect(layerMaskWeight(base, 5, 5, 100, 100)).toBe(1);
  });
  it('supports reveal strokes after hide strokes', () => {
    const mask = {
      ...base,
      strokes: [
        ...base.strokes,
        { points: [{ x: 0.5, y: 0.5 }], size: 20, mode: 'reveal' as const },
      ],
    };
    expect(layerMaskWeight(mask, 50, 50, 100, 100)).toBe(1);
  });
  it('combines multiple enabled masks multiplicatively and ignores disabled masks', () => {
    const revealHalf = {
      ...base,
      id: 'half',
      kind: 'radial' as const,
      radius: 20,
      feather: 100,
      strokes: [],
      start: { x: 0.5, y: 0.5 },
    };
    const disabledHide = { ...base, id: 'disabled', enabled: false };
    const weight = layerMaskStackWeight([revealHalf, disabledHide], 50, 50, 100, 100);
    expect(weight).toBeCloseTo(layerMaskWeight(revealHalf, 50, 50, 100, 100));
  });
  it('inverts the mask and computes gradient falloff', () => {
    expect(layerMaskWeight({ ...base, inverted: true }, 50, 50, 100, 100)).toBe(1);
    const gradient = {
      ...base,
      kind: 'linear' as const,
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      feather: 0,
    };
    expect(layerMaskWeight(gradient, 50, 0, 100, 100)).toBeGreaterThan(0.9);
    expect(layerMaskWeight(gradient, 50, 99, 100, 100)).toBeLessThan(0.1);
  });
});
