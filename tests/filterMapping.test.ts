import { describe, expect, it } from 'vitest';
import { DEFAULT_MANUAL_ADJUSTMENTS } from '../src/lib/manualEditing';
import { mapFilterRecipeToManualSettings } from '../src/lib/filterMapping';
import type { FilterRecipe } from '../src/lib/types';

const recipe: FilterRecipe = {
  id: 'test-look',
  name: 'Test look',
  category: 'natural-portraits',
  description: 'Test recipe',
  type: 'color',
  adjustments: {
    exposure: 0.1,
    contrast: 0.2,
    saturation: 0.3,
    vibrance: 0.4,
    grain: 0.5,
    vignette: 0.6,
    highlights: -0.2,
    filmFade: 0.25,
    bloom: 0.15,
    dehaze: 0.1,
  },
  tokens: ['test'],
};

describe('filter recipe mapping', () => {
  it('maps recipe controls into the full manual pixel pipeline', () => {
    const result = mapFilterRecipeToManualSettings(recipe, 100, DEFAULT_MANUAL_ADJUSTMENTS);
    expect(result.exposure).toBe(10);
    expect(result.contrast).toBe(20);
    expect(result.saturation).toBe(30);
    expect(result.vibrance).toBe(40);
    expect(result.grain).toBe(50);
    expect(result.vignette).toBe(60);
    expect(result.highlights).toBe(-20);
    expect(result.filmFade).toBe(25);
    expect(result.bloom).toBe(15);
    expect(result.dehaze).toBe(10);
  });

  it('scales the recipe by intensity and preserves unrelated manual settings', () => {
    const base = { ...DEFAULT_MANUAL_ADJUSTMENTS, sharpening: 35, hslBlueHue: 12 };
    const result = mapFilterRecipeToManualSettings(recipe, 50, base);
    expect(result.exposure).toBe(5);
    expect(result.grain).toBe(25);
    expect(result.sharpening).toBe(35);
    expect(result.hslBlueHue).toBe(12);
  });

  it('returns the base settings at zero intensity', () => {
    const result = mapFilterRecipeToManualSettings(recipe, 0, DEFAULT_MANUAL_ADJUSTMENTS);
    expect(result).toEqual(DEFAULT_MANUAL_ADJUSTMENTS);
  });
});
