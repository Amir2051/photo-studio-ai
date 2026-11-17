import { describe, expect, it } from 'vitest';
import { getPreviewDimensions } from '../src/lib/renderSizing';

describe('interactive preview sizing', () => {
  it('does not upscale small images', () => {
    expect(getPreviewDimensions(1200, 800)).toEqual({ width: 1200, height: 800, scale: 1 });
  });

  it('bounds large images by the longest edge and preserves aspect ratio', () => {
    const result = getPreviewDimensions(8000, 6000);
    expect(result).toEqual({ width: 1800, height: 1350, scale: 0.225 });
  });

  it('supports portrait orientation and custom preview budgets', () => {
    expect(getPreviewDimensions(3000, 6000, 1500)).toEqual({
      width: 750,
      height: 1500,
      scale: 0.25,
    });
  });

  it('rejects invalid dimensions rather than allocating a broken canvas', () => {
    expect(() => getPreviewDimensions(0, 100)).toThrow(/positive finite/);
    expect(() => getPreviewDimensions(100, Number.NaN)).toThrow(/positive finite/);
  });
});
