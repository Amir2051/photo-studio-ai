import type { EffectInstance } from '#lib/project/types.ts';

export interface PeakNormalizationOptions {
  targetPeakDb?: number;
  maxBoostDb?: number;
  minGainDb?: number;
  maxGainDb?: number;
}

export type PeakNormalizationResult =
  | { status: 'ok' | 'limited'; deltaDb: number; resultingPeakDb: number }
  | { status: 'silent' | 'invalid' | 'disabled' | 'muted'; reason: string };

const SILENCE_FLOOR_DB = -60;

function finiteDb(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Calculates a non-destructive clip-volume offset from source peak measurements.
 * Existing volume automation is preserved by applying the same offset to the
 * base level and every numeric level keyframe. This is peak normalization, not
 * LUFS loudness matching or a limiter.
 */
export function calculatePeakNormalization(
  peakDb: number,
  volume: Pick<EffectInstance, 'enabled' | 'params' | 'keyframes'> | null | undefined,
  options: PeakNormalizationOptions = {},
): PeakNormalizationResult {
  const targetPeakDb = options.targetPeakDb ?? -1;
  const maxBoostDb = options.maxBoostDb ?? 12;
  const minGainDb = options.minGainDb ?? -60;
  const maxGainDb = options.maxGainDb ?? 12;

  if (
    !finiteDb(peakDb) ||
    !finiteDb(targetPeakDb) ||
    !finiteDb(maxBoostDb) ||
    !finiteDb(minGainDb) ||
    !finiteDb(maxGainDb) ||
    maxBoostDb < 0 ||
    minGainDb > maxGainDb ||
    targetPeakDb > 0
  ) {
    return { status: 'invalid', reason: 'Peak or normalization settings are invalid.' };
  }
  if (peakDb <= SILENCE_FLOOR_DB) {
    return { status: 'silent', reason: 'The source has no measurable audio peak.' };
  }
  if (!volume) return { status: 'invalid', reason: 'The clip has no volume control.' };
  if (!volume.enabled) return { status: 'disabled', reason: 'Enable the clip volume control before normalizing.' };

  const base = volume.params.level;
  if (base !== undefined && !finiteDb(base)) {
    return { status: 'invalid', reason: 'The clip volume value is not a finite dB level.' };
  }

  const keyframes = volume.keyframes.level ?? [];
  const levels = [base === undefined ? 0 : base];
  for (const keyframe of keyframes) {
    if (!finiteDb(keyframe.value)) {
      return { status: 'invalid', reason: 'Volume automation contains a non-numeric level.' };
    }
    levels.push(keyframe.value);
  }

  const highestExistingLevel = Math.max(...levels);
  const lowestExistingLevel = Math.min(...levels);
  if (highestExistingLevel <= minGainDb) {
    return { status: 'muted', reason: 'The clip is muted at every volume keyframe.' };
  }

  const desiredDelta = targetPeakDb - (peakDb + highestExistingLevel);
  const upperDelta = Math.min(maxBoostDb, maxGainDb - highestExistingLevel);
  const lowerDelta = minGainDb - lowestExistingLevel;
  const deltaDb = Math.min(upperDelta, Math.max(lowerDelta, desiredDelta));
  const resultingPeakDb = peakDb + highestExistingLevel + deltaDb;
  const limited = resultingPeakDb < targetPeakDb - 1e-6;

  return {
    status: limited ? 'limited' : 'ok',
    deltaDb,
    resultingPeakDb,
  };
}

/** Apply a previously calculated offset to a volume effect without mutating it. */
export function withPeakNormalization(
  volume: EffectInstance,
  deltaDb: number,
  options: Pick<PeakNormalizationOptions, 'minGainDb' | 'maxGainDb'> = {},
): EffectInstance {
  const minGainDb = options.minGainDb ?? -60;
  const maxGainDb = options.maxGainDb ?? 12;
  const clamp = (value: number): number => Math.min(maxGainDb, Math.max(minGainDb, value));
  const base = volume.params.level;
  const nextBase = finiteDb(base) ? clamp(base + deltaDb) : clamp(deltaDb);

  return {
    ...volume,
    params: { ...volume.params, level: nextBase },
    keyframes: {
      ...volume.keyframes,
      level: (volume.keyframes.level ?? []).map((keyframe) => ({
        ...keyframe,
        value: finiteDb(keyframe.value) ? clamp(keyframe.value + deltaDb) : keyframe.value,
      })),
    },
  };
}
