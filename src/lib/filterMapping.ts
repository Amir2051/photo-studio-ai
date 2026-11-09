import type { FilterRecipe } from './types';
import type { ManualAdjustmentSettings } from './manualEditing';

const clampIntensity = (value: number) => Math.max(0, Math.min(100, value)) / 100;

/** Map a catalogue recipe onto the same manual pixel pipeline used by preview and export. */
export function mapFilterRecipeToManualSettings(
  recipe: FilterRecipe,
  intensity: number,
  base: ManualAdjustmentSettings,
): ManualAdjustmentSettings {
  const amount = clampIntensity(intensity);
  const scale = (value: number | undefined) => (value ?? 0) * 100 * amount || 0;
  const values = recipe.adjustments;

  return {
    ...base,
    exposure: scale(values.exposure),
    brightness: scale(values.brightness),
    contrast: scale(values.contrast),
    temperature: scale(values.temperature),
    tint: scale(values.tint),
    saturation: scale(values.saturation),
    vibrance: scale(values.vibrance),
    shadows: scale(values.shadows),
    highlights: scale(values.highlights),
    whites: scale(values.whites),
    blacks: scale(values.blacks),
    clarity: scale(values.clarity),
    grain: scale(values.grain),
    vignette: scale(values.vignette),
    filmFade: scale(values.filmFade),
    bloom: scale(values.bloom),
    dehaze: scale(values.dehaze),
  };
}
