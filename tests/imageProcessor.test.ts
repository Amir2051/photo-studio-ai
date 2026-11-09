import { describe, expect, it } from 'vitest';
import { processPixels } from '../src/lib/imageProcessor';
import type { Adjustment } from '../src/lib/types';

const adjustment = (type: string, value: number): Adjustment => ({
  type,
  value,
  min: -100,
  max: 200,
  default: 0,
  label: type,
});

describe('non-destructive pixel processing', () => {
  it('does not mutate the original pixel buffer', () => {
    const original = new Uint8ClampedArray([100, 120, 140, 255]);
    const before = [...original];
    processPixels(original, [adjustment('brightness', 30)]);
    expect([...original]).toEqual(before);
  });

  it('returns an independent copy when no edits are applied', () => {
    const original = new Uint8ClampedArray([12, 34, 56, 255]);
    const result = processPixels(original, []);
    expect(result).not.toBe(original);
    expect([...result]).toEqual([...original]);
  });

  it('applies brightness to all color channels while preserving alpha', () => {
    const original = new Uint8ClampedArray([100, 80, 60, 77]);
    const result = processPixels(original, [adjustment('brightness', 50)]);
    expect([...result]).toEqual([150, 120, 90, 77]);
  });

  it('can recompute a new edit from the same original without compounding', () => {
    const original = new Uint8ClampedArray([100, 100, 100, 255]);
    const bright = processPixels(original, [adjustment('brightness', 50)]);
    const dark = processPixels(original, [adjustment('brightness', -50)]);
    expect([...bright]).toEqual([150, 150, 150, 255]);
    expect([...dark]).toEqual([50, 50, 50, 255]);
    expect([...original]).toEqual([100, 100, 100, 255]);
  });

  it('clamps pixel output to valid channel ranges', () => {
    const original = new Uint8ClampedArray([250, 2, 128, 255]);
    const result = processPixels(original, [adjustment('brightness', 100)]);
    expect([...result]).toEqual([255, 4, 255, 255]);
  });

  it('supports temperature, saturation, gamma and film fade recipes', () => {
    const original = new Uint8ClampedArray([80, 100, 120, 255]);
    for (const type of ['temperature', 'saturation', 'gamma', 'film-fade']) {
      const result = processPixels(original, [adjustment(type, 20)]);
      expect(result).toHaveLength(4);
      expect(result[3]).toBe(255);
      expect([...original]).toEqual([80, 100, 120, 255]);
    }
  });
});
