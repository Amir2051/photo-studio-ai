import { describe, expect, it } from 'vitest';
import { clampMakeupStrength, DEFAULT_FACE_MAKEUP } from '../src/lib/faceMakeup';

describe('face makeup settings', () => {
  it('starts with all makeup effects disabled', () => {
    expect(DEFAULT_FACE_MAKEUP).toEqual({ blush: 0, lipstick: 0, eyeshadow: 0 });
  });

  it('clamps effect strength to the supported range', () => {
    expect(clampMakeupStrength(-12)).toBe(0);
    expect(clampMakeupStrength(45)).toBe(45);
    expect(clampMakeupStrength(140)).toBe(100);
  });

  it('safely treats non-finite strengths as zero', () => {
    expect(clampMakeupStrength(Number.NaN)).toBe(0);
    expect(clampMakeupStrength(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
