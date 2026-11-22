// Pure, node-safe analysis of the min/max waveform peaks produced by
// waveform.ts. Peaks are a Float32Array of [min, max] pairs in [-1, 1]; this
// module never touches DOM or Web Audio APIs and never mutates its input.
//
// It deliberately re-declares the default bucket rate instead of importing it
// from waveform.ts: waveform.ts opens an IndexedDB store at module load time,
// which would make this file unsafe to import in a plain node process.

import { gainToDb, SILENCE_DB } from '../engine/audio-math.ts';

// Mirrors DEFAULT_PEAKS_PER_SECOND from waveform.ts.
const DEFAULT_PER_SECOND = 50;
// AbortSignal is polled (never subscribed to) at this cadence.
const CHECK_EVERY = 1024;
const EMPTY_REGIONS: readonly [] = [];

export type AnalysisStatus = 'ok' | 'empty' | 'no-regions' | 'unavailable' | 'invalid' | 'cancelled';

export interface AnalysisMeta {
  readonly mediaId: string | null;
  readonly perSecond: number;
}

export interface LevelStats {
  readonly bucketCount: number;
  readonly validBucketCount: number;
  readonly durationCovered: number;
  readonly peak: number;
  readonly peakDb: number;
  readonly rms: number;
  readonly rmsDb: number;
  readonly meanAbs: number;
  readonly meanAbsDb: number;
  readonly minDb: number;
  readonly maxDb: number;
  readonly dynamicRangeDb: number;
  readonly allSilent: boolean;
}

export interface QuietRegion {
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly startBucket: number;
  // endBucket is exclusive: the region covers buckets [startBucket, endBucket).
  readonly endBucket: number;
  readonly peakDb: number;
  readonly meanDb: number;
  readonly mediaId: string | null;
}

export type LevelStatsResult =
  | ({ status: 'ok'; stats: LevelStats } & AnalysisMeta)
  | ({ status: 'empty'; stats: null } & AnalysisMeta)
  | ({ status: 'unavailable'; reason: string; stats: null } & AnalysisMeta)
  | ({ status: 'invalid'; reason: string; bucketIndices: number[]; stats: null } & AnalysisMeta)
  | ({ status: 'cancelled'; stats: null } & AnalysisMeta);

export type QuietRegionsResult =
  | ({ status: 'ok'; regions: QuietRegion[]; stats: LevelStats } & AnalysisMeta)
  | ({ status: 'no-regions'; regions: readonly []; stats: LevelStats } & AnalysisMeta)
  | ({ status: 'empty'; regions: readonly []; stats: null } & AnalysisMeta)
  | ({ status: 'unavailable'; reason: string; regions: readonly []; stats: null } & AnalysisMeta)
  | ({ status: 'invalid'; reason: string; bucketIndices: number[]; regions: readonly []; stats: null } & AnalysisMeta)
  | ({ status: 'cancelled'; regions: readonly []; stats: null } & AnalysisMeta);

export interface AnalysisConfig {
  mediaId?: string | null;
  perSecond?: number;
  signal?: AbortSignal;
  error?: unknown;
  unavailableReason?: string;
  maxDurationSeconds?: number;
}

export interface QuietRegionConfig extends AnalysisConfig {
  thresholdDb?: number; // default SILENCE_DB (-60)
  minDuration?: number; // default 0.25 seconds
  mergeGap?: number; // default 0
  maxRegions?: number; // default Infinity
}

export type PeaksInput = Float32Array | null | undefined;

type ScanResult =
  | { kind: 'ok'; stats: LevelStats; magnitudes: number[] }
  | { kind: 'cancelled' }
  | { kind: 'invalid'; reason: string; bucketIndices: number[] };

interface Run {
  startBucket: number;
  endBucket: number;
  peakMag: number;
  sumMag: number;
  count: number;
}

// Extract a human-readable message from an arbitrary thrown value without
// assuming it is an Error.
function describeError(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error);
}

function unavailableReasonOf(config: AnalysisConfig): string {
  return describeError(config.error) ?? config.unavailableReason ?? 'No waveform peaks available';
}

// Returns a reason string when the configuration is unusable, else null.
function configError(perSecond: number, minDuration?: number, mergeGap?: number): string | null {
  if (!Number.isFinite(perSecond) || perSecond <= 0)
    return 'perSecond must be a finite number greater than zero';
  if (minDuration !== undefined && (!Number.isFinite(minDuration) || minDuration < 0))
    return 'minDuration must be a finite number greater than or equal to zero';
  if (mergeGap !== undefined && (!Number.isFinite(mergeGap) || mergeGap < 0))
    return 'mergeGap must be a finite number greater than or equal to zero';
  return null;
}

// One validation + statistics pass over the buckets. When status is ok the
// returned magnitudes array holds max(|min|, |max|) for every bucket so quiet
// region detection can reuse the same reading of the input.
function scanPeaks(peaks: Float32Array, perSecond: number, signal: AbortSignal | undefined): ScanResult {
  const length = peaks.length;
  const bucketCount = Math.floor(length / 2);
  const offenders = new Set<number>();
  let reason: string | null = null;

  // An unpaired trailing value cannot form a bucket.
  if (length % 2 !== 0) {
    offenders.add(bucketCount);
    reason = 'Waveform peaks have an odd length';
  }

  const magnitudes = new Array<number>(bucketCount).fill(0);
  let peak = 0;
  let powerSum = 0;
  let absSum = 0;
  let minMag = Infinity;
  let maxMag = 0;
  let validBucketCount = 0;

  for (let i = 0; i < bucketCount; i++) {
    if ((i & (CHECK_EVERY - 1)) === 0 && signal?.aborted) return { kind: 'cancelled' };

    const min = peaks[2 * i];
    const max = peaks[2 * i + 1];
    const finite = Number.isFinite(min) && Number.isFinite(max);
    const inRange = Math.abs(min) <= 1 && Math.abs(max) <= 1;
    const ordered = min <= max;

    if (!finite || !inRange || !ordered) {
      offenders.add(i);
      if (reason === null) {
        reason = !finite
          ? 'Waveform peaks contain non-finite values'
          : !inRange
            ? 'Waveform peaks contain values outside [-1, 1]'
            : 'Waveform peaks contain a bucket whose minimum exceeds its maximum';
      }
      continue;
    }

    validBucketCount++;
    const mag = Math.abs(min) > Math.abs(max) ? Math.abs(min) : Math.abs(max);
    magnitudes[i] = mag;
    if (mag > peak) peak = mag;
    // Bucket power is the mean of the squared min and max of the bucket.
    powerSum += (min * min + max * max) / 2;
    absSum += mag;
    if (mag < minMag) minMag = mag;
    if (mag > maxMag) maxMag = mag;
  }

  if (offenders.size > 0) {
    return {
      kind: 'invalid',
      reason: reason ?? 'Waveform peaks contain invalid buckets',
      bucketIndices: Array.from(offenders).sort((a, b) => a - b),
    };
  }

  const rms = Math.sqrt(powerSum / bucketCount);
  const meanAbs = absSum / bucketCount;
  const minDb = gainToDb(minMag);
  const maxDb = gainToDb(maxMag);
  const stats: LevelStats = {
    bucketCount,
    // Every bucket passed validation, so all of them are usable.
    validBucketCount,
    // bucketCount / perSecond, note that waveform.worker.ts allocates one
    // trailing guard bucket (ceil(duration * perSecond) + 1) which is often
    // [0, 0], so this can overstate the real media duration by one bucket.
    durationCovered: bucketCount / perSecond,
    peak,
    peakDb: gainToDb(peak),
    rms,
    rmsDb: gainToDb(rms),
    meanAbs,
    meanAbsDb: gainToDb(meanAbs),
    minDb,
    maxDb,
    dynamicRangeDb: Math.max(0, maxDb - minDb),
    allSilent: peak === 0,
  };
  return { kind: 'ok', stats, magnitudes };
}

export function computeLevelStats(peaks: PeaksInput, config: AnalysisConfig = {}): LevelStatsResult {
  const cfg = config ?? {};
  const mediaId = cfg.mediaId ?? null;
  const perSecond = cfg.perSecond ?? DEFAULT_PER_SECOND;
  const meta: AnalysisMeta = { mediaId, perSecond };

  // Cancellation wins over every other outcome, including missing peaks.
  if (cfg.signal?.aborted) return { status: 'cancelled', stats: null, ...meta };

  const invalidReason = configError(perSecond);
  if (invalidReason !== null) {
    return { status: 'invalid', reason: invalidReason, bucketIndices: [], stats: null, ...meta };
  }

  if (peaks === null || peaks === undefined) {
    return { status: 'unavailable', reason: unavailableReasonOf(cfg), stats: null, ...meta };
  }
  if (peaks.length === 0) return { status: 'empty', stats: null, ...meta };

  const scan = scanPeaks(peaks, perSecond, cfg.signal);
  if (scan.kind === 'cancelled') return { status: 'cancelled', stats: null, ...meta };
  if (scan.kind === 'invalid') {
    return {
      status: 'invalid',
      reason: scan.reason,
      bucketIndices: scan.bucketIndices,
      stats: null,
      ...meta,
    };
  }
  return { status: 'ok', stats: scan.stats, ...meta };
}

// Build a run from a half-open bucket range using the already-read magnitudes.
function makeRun(magnitudes: number[], startBucket: number, endBucket: number): Run {
  let sumMag = 0;
  let peakMag = 0;
  for (let i = startBucket; i < endBucket; i++) {
    const magnitude = magnitudes[i];
    sumMag += magnitude;
    if (magnitude > peakMag) peakMag = magnitude;
  }
  return { startBucket, endBucket, peakMag, sumMag, count: endBucket - startBucket };
}

function normalizeMaxRegions(value: number | undefined): number {
  if (value === undefined) return Infinity;
  if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
  return value === Infinity ? Infinity : 0;
}

export function detectQuietRegions(
  peaks: PeaksInput,
  config: QuietRegionConfig = {},
): QuietRegionsResult {
  const cfg = config ?? {};
  const mediaId = cfg.mediaId ?? null;
  const perSecond = cfg.perSecond ?? DEFAULT_PER_SECOND;
  const meta: AnalysisMeta = { mediaId, perSecond };

  if (cfg.signal?.aborted) {
    return { status: 'cancelled', regions: EMPTY_REGIONS, stats: null, ...meta };
  }

  const thresholdDb = cfg.thresholdDb ?? SILENCE_DB;
  const minDuration = cfg.minDuration ?? 0.25;
  const mergeGap = cfg.mergeGap ?? 0;
  const maxRegions = normalizeMaxRegions(cfg.maxRegions);

  const invalidReason = configError(perSecond, minDuration, mergeGap);
  if (invalidReason !== null) {
    return {
      status: 'invalid',
      reason: invalidReason,
      bucketIndices: [],
      regions: EMPTY_REGIONS,
      stats: null,
      ...meta,
    };
  }

  if (peaks === null || peaks === undefined) {
    return {
      status: 'unavailable',
      reason: unavailableReasonOf(cfg),
      regions: EMPTY_REGIONS,
      stats: null,
      ...meta,
    };
  }
  if (peaks.length === 0) return { status: 'empty', regions: EMPTY_REGIONS, stats: null, ...meta };

  const scan = scanPeaks(peaks, perSecond, cfg.signal);
  if (scan.kind === 'cancelled') {
    return { status: 'cancelled', regions: EMPTY_REGIONS, stats: null, ...meta };
  }
  if (scan.kind === 'invalid') {
    return {
      status: 'invalid',
      reason: scan.reason,
      bucketIndices: scan.bucketIndices,
      regions: EMPTY_REGIONS,
      stats: null,
      ...meta,
    };
  }

  const { stats, magnitudes } = scan;

  // Group consecutive quiet buckets into runs. gainToDb floors at SILENCE_DB,
  // so the comparison is inclusive at the threshold.
  const runs: Run[] = [];
  let start = -1;
  for (let i = 0; i < magnitudes.length; i++) {
    if ((i & (CHECK_EVERY - 1)) === 0 && cfg.signal?.aborted) {
      return { status: 'cancelled', regions: EMPTY_REGIONS, stats: null, ...meta };
    }
    if (gainToDb(magnitudes[i]) <= thresholdDb) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      runs.push(makeRun(magnitudes, start, i));
      start = -1;
    }
  }
  if (start !== -1) runs.push(makeRun(magnitudes, start, magnitudes.length));

  // Drop runs that are too short before merging.
  const longEnough = runs.filter((run) => (run.endBucket - run.startBucket) / perSecond >= minDuration);

  const merged: Run[] = [];
  for (const run of longEnough) {
    const previous = merged[merged.length - 1];
    if (previous && (run.startBucket - previous.endBucket) / perSecond <= mergeGap) {
      previous.endBucket = run.endBucket;
      previous.peakMag = Math.max(previous.peakMag, run.peakMag);
      previous.sumMag += run.sumMag;
      previous.count += run.count;
    } else {
      merged.push({ ...run });
    }
  }

  // Optionally discard the trailing guard bucket(s) beyond maxDurationSeconds.
  const cap = cfg.maxDurationSeconds;
  const capBuckets =
    typeof cap === 'number' && Number.isFinite(cap) && cap >= 0 ? cap * perSecond : null;

  let bounded: Run[];
  if (capBuckets === null) {
    bounded = merged;
  } else {
    bounded = [];
    for (const run of merged) {
      if (run.startBucket >= capBuckets) continue;
      const endBucket = Math.min(run.endBucket, Math.floor(capBuckets));
      if (endBucket <= run.startBucket) continue;
      const clamped = makeRun(magnitudes, run.startBucket, endBucket);
      if ((clamped.endBucket - clamped.startBucket) / perSecond < minDuration) continue;
      bounded.push(clamped);
    }
  }

  const regions: QuietRegion[] = bounded.slice(0, maxRegions).map((run) => ({
    start: run.startBucket / perSecond,
    end: run.endBucket / perSecond,
    duration: (run.endBucket - run.startBucket) / perSecond,
    startBucket: run.startBucket,
    endBucket: run.endBucket,
    peakDb: gainToDb(run.peakMag),
    // dB of the mean magnitude, mirroring LevelStats.meanAbsDb.
    meanDb: gainToDb(run.sumMag / run.count),
    mediaId,
  }));

  if (regions.length === 0) return { status: 'no-regions', regions: EMPTY_REGIONS, stats, ...meta };
  return { status: 'ok', regions, stats, ...meta };
}
