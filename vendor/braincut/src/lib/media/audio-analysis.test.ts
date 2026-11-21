import { describe, expect, it } from 'vitest';
import { computeLevelStats, detectQuietRegions } from './audio-analysis';
import type {
  AnalysisConfig,
  LevelStats,
  LevelStatsResult,
  QuietRegion,
  QuietRegionConfig,
  QuietRegionsResult,
} from './audio-analysis';

// Each bucket is [-level, level], matching the shape waveform.worker.ts emits.
function p(levels: number[]): Float32Array {
  const out = new Float32Array(levels.length * 2);
  for (let i = 0; i < levels.length; i++) {
    out[2 * i] = -levels[i];
    out[2 * i + 1] = levels[i];
  }
  return out;
}

const cfg = (): AnalysisConfig => ({ perSecond: 10, mediaId: 'm1' });
const qcfg = (extra: Partial<QuietRegionConfig> = {}): QuietRegionConfig => ({ ...cfg(), ...extra });

function okStats(result: LevelStatsResult): LevelStats {
  if (result.status !== 'ok') throw new Error(`expected ok stats, got ${result.status}`);
  return result.stats;
}

function okRegions(result: QuietRegionsResult): QuietRegion[] {
  if (result.status !== 'ok') throw new Error(`expected ok regions, got ${result.status}`);
  return result.regions;
}

function abortedSignal(): AbortSignal {
  return { aborted: true } as unknown as AbortSignal;
}

// Fake signal whose aborted getter flips after a fixed number of reads, used to
// exercise the polling cadence without any DOM APIs.
function countingSignal(flipAt: number): { signal: AbortSignal; reads: () => number } {
  let reads = 0;
  const signal = {
    get aborted(): boolean {
      reads += 1;
      return reads >= flipAt;
    },
  } as unknown as AbortSignal;
  return { signal, reads: () => reads };
}

describe('computeLevelStats', () => {
  it('reports measurable levels for a uniform signal', () => {
    const result = computeLevelStats(p([0.5, 0.5, 0.5, 0.5]), cfg());
    expect(result.status).toBe('ok');
    expect(result.mediaId).toBe('m1');
    expect(result.perSecond).toBe(10);
    const stats = okStats(result);
    expect(stats.bucketCount).toBe(4);
    expect(stats.validBucketCount).toBe(4);
    expect(stats.durationCovered).toBeCloseTo(0.4);
    expect(stats.peak).toBeCloseTo(0.5);
    expect(stats.peakDb).toBeCloseTo(-6.0206, 4);
    expect(stats.rms).toBeCloseTo(0.5);
    expect(stats.rmsDb).toBeCloseTo(-6.0206, 4);
    expect(stats.meanAbs).toBeCloseTo(0.5);
    expect(stats.meanAbsDb).toBeCloseTo(-6.0206, 4);
    expect(stats.minDb).toBeCloseTo(-6.0206, 4);
    expect(stats.maxDb).toBeCloseTo(-6.0206, 4);
    expect(stats.dynamicRangeDb).toBeCloseTo(0);
    expect(stats.allSilent).toBe(false);
  });

  it('uses bucket power for asymmetric min/max pairs', () => {
    const stats = okStats(computeLevelStats(new Float32Array([-0.25, 1]), cfg()));
    // sqrt((0.25^2 + 1^2) / 2) = 0.7288689868...
    expect(stats.rms).toBeCloseTo(0.72887, 5);
    expect(stats.peak).toBeCloseTo(1);
    expect(stats.peakDb).toBeCloseTo(0);
    // bucket magnitude is max(|min|, |max|) = 1, so meanAbs is 1
    expect(stats.meanAbs).toBeCloseTo(1);
    // minDb/maxDb come from per-bucket magnitudes, which is 1 for this bucket.
    expect(stats.minDb).toBeCloseTo(0);
    expect(stats.maxDb).toBeCloseTo(0);
  });

  it('reports the dynamic range between the quietest and loudest buckets', () => {
    const stats = okStats(computeLevelStats(new Float32Array([-0.01, 0.01, -1, 1]), cfg()));
    expect(stats.minDb).toBeCloseTo(-40);
    expect(stats.maxDb).toBeCloseTo(0);
    expect(stats.dynamicRangeDb).toBeCloseTo(40);
  });

  it('defaults to 50 buckets per second so 50 buckets cover one second', () => {
    const result = computeLevelStats(p(new Array<number>(50).fill(0.5)), { mediaId: 'm1' });
    expect(result.perSecond).toBe(50);
    expect(okStats(result).durationCovered).toBe(1);
  });

  it('reports empty for a zero-length peaks array', () => {
    const result = computeLevelStats(new Float32Array(0), cfg());
    expect(result).toMatchObject({ status: 'empty', stats: null, mediaId: 'm1', perSecond: 10 });
  });

  it('reports unavailable for null peaks with the default reason', () => {
    const result = computeLevelStats(null, cfg());
    expect(result).toMatchObject({
      status: 'unavailable',
      reason: 'No waveform peaks available',
      stats: null,
    });
  });

  it('reports unavailable for undefined peaks', () => {
    const result = computeLevelStats(undefined, cfg());
    expect(result.status).toBe('unavailable');
  });

  it('prefers an error message, then unavailableReason, for the unavailable reason', () => {
    expect(computeLevelStats(null, { ...cfg(), error: new Error('decode failed') })).toMatchObject({
      status: 'unavailable',
      reason: 'decode failed',
    });
    expect(computeLevelStats(null, { ...cfg(), error: 'boom' })).toMatchObject({
      status: 'unavailable',
      reason: 'boom',
    });
    expect(
      computeLevelStats(null, {
        ...cfg(),
        error: { message: 'plain object failure' },
        unavailableReason: 'ignored',
      }),
    ).toMatchObject({ status: 'unavailable', reason: 'plain object failure' });
    expect(computeLevelStats(null, { ...cfg(), unavailableReason: 'cache miss' })).toMatchObject({
      status: 'unavailable',
      reason: 'cache miss',
    });
  });

  it('summarises an all-silent waveform', () => {
    const stats = okStats(computeLevelStats(p(new Array<number>(10).fill(0)), cfg()));
    expect(stats.allSilent).toBe(true);
    expect(stats.peak).toBe(0);
    expect(stats.peakDb).toBe(-60);
    expect(stats.rms).toBe(0);
    expect(stats.minDb).toBe(-60);
    expect(stats.maxDb).toBe(-60);
    expect(stats.dynamicRangeDb).toBe(0);
  });

  it('flags an odd-length array with the unpaired bucket index', () => {
    const peaks = p([0.5, 0.5, 0.5, 0.5]).subarray(0, 7);
    const result = computeLevelStats(peaks, cfg());
    expect(result).toMatchObject({
      status: 'invalid',
      bucketIndices: [3],
      stats: null,
    });
  });

  it('flags non-finite values with their bucket index', () => {
    const peaks = p([0.5, 0.5, 0.5]);
    peaks[2] = Number.NaN;
    expect(computeLevelStats(peaks, cfg())).toMatchObject({
      status: 'invalid',
      bucketIndices: [1],
    });
  });

  it('flags out-of-range magnitudes with their bucket index', () => {
    const peaks = p([0.5, 0.5, 0.5]);
    peaks[2] = 1.5;
    expect(computeLevelStats(peaks, cfg())).toMatchObject({
      status: 'invalid',
      bucketIndices: [1],
    });
  });

  it('flags a bucket whose minimum exceeds its maximum', () => {
    const result = computeLevelStats(new Float32Array([-0.5, -0.8]), cfg());
    expect(result).toMatchObject({ status: 'invalid', bucketIndices: [0] });
  });

  it('reports every offending bucket index in ascending order', () => {
    const peaks = p([0.5, 0.5, 0.5, 0.5]);
    peaks[0] = Number.NaN;
    peaks[6] = 2;
    expect(computeLevelStats(peaks, cfg())).toMatchObject({
      status: 'invalid',
      bucketIndices: [0, 3],
    });
  });

  it('returns cancelled for a pre-aborted signal even when peaks are missing', () => {
    expect(
      computeLevelStats(null, { ...cfg(), signal: abortedSignal() }),
    ).toMatchObject({ status: 'cancelled', stats: null });
  });

  it('returns cancelled when the signal flips during the bucket loop', () => {
    const { signal, reads } = countingSignal(3);
    const result = computeLevelStats(p(new Array<number>(1100).fill(0.5)), { ...cfg(), signal });
    expect(result.status).toBe('cancelled');
    expect(reads()).toBeGreaterThanOrEqual(3);
  });

  it('rejects an invalid perSecond with no bucket indices', () => {
    for (const perSecond of [0, -1, Number.NaN, Infinity]) {
      expect(computeLevelStats(p([0.5]), { ...cfg(), perSecond })).toMatchObject({
        status: 'invalid',
        bucketIndices: [],
      });
    }
  });

  it('is deterministic and does not mutate the peaks', () => {
    const peaks = p([0, 0.5, 0, 0.25]);
    const before = Array.from(peaks);
    const first = computeLevelStats(peaks, cfg());
    const second = computeLevelStats(peaks, cfg());
    expect(first).toEqual(second);
    expect(Array.from(peaks)).toEqual(before);
  });
});

describe('detectQuietRegions', () => {
  it('returns a full-length region for an all-silent waveform at threshold -60', () => {
    const result = detectQuietRegions(p(new Array<number>(10).fill(0)), qcfg());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected a successful analysis result');
    expect(result.mediaId).toBe('m1');
    expect(result.perSecond).toBe(10);
    expect(result.stats.allSilent).toBe(true);
    expect(okRegions(result)).toEqual([
      {
        start: 0,
        end: 1,
        duration: 1,
        startBucket: 0,
        endBucket: 10,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('maps 50 buckets per second to a one-second silent region by default', () => {
    const regions = okRegions(detectQuietRegions(p(new Array<number>(50).fill(0)), { mediaId: 'm1' }));
    expect(regions).toHaveLength(1);
    expect(regions[0].start).toBe(0);
    expect(regions[0].end).toBe(1);
    expect(regions[0].duration).toBe(1);
  });

  it('returns no-regions when every bucket is loud, with stats still present', () => {
    const result = detectQuietRegions(p(new Array<number>(10).fill(0.5)), qcfg());
    expect(result.status).toBe('no-regions');
    expect(result).toMatchObject({ regions: [] });
    if (result.status !== 'no-regions') throw new Error('expected no-regions');
    expect(result.stats.peak).toBeCloseTo(0.5);
  });

  it('finds a quiet region at the start with exact timestamps', () => {
    const result = detectQuietRegions(p([0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), qcfg());
    expect(okRegions(result)).toEqual([
      {
        start: 0,
        end: 0.3,
        duration: 0.3,
        startBucket: 0,
        endBucket: 3,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('finds a quiet region in the middle with exact timestamps', () => {
    const result = detectQuietRegions(p([0.5, 0.5, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5]), qcfg());
    expect(okRegions(result)).toEqual([
      {
        start: 0.2,
        end: 0.6,
        duration: 0.4,
        startBucket: 2,
        endBucket: 6,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('finds a quiet region at the end with exact timestamps', () => {
    const result = detectQuietRegions(
      p([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0, 0]),
      qcfg(),
    );
    expect(okRegions(result)).toEqual([
      {
        start: 0.7,
        end: 1,
        duration: 0.3,
        startBucket: 7,
        endBucket: 10,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('treats the threshold as inclusive: 0.01 is quiet at -40 dB, 0.0101 is not', () => {
    const result = detectQuietRegions(
      p([0.01, 0.0101, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
      qcfg({ thresholdDb: -40, minDuration: 0.1 }),
    );
    const regions = okRegions(result);
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      start: 0,
      end: 0.1,
      duration: 0.1,
      startBucket: 0,
      endBucket: 1,
      mediaId: 'm1',
    });
    // Float32 rounding of 0.01 makes these close to, not exactly, -40.
    expect(regions[0].peakDb).toBeCloseTo(-40, 4);
    expect(regions[0].meanDb).toBeCloseTo(-40, 4);
  });

  it('treats the threshold as inclusive at an exact dB value', () => {
    // 0.5 is exactly representable as a float32, so gainToDb(0.5) equals this
    // threshold exactly. Bucket 0 counts as quiet; bucket 1 (1.0 -> 0 dB) does
    // not, which proves the comparison is <= rather than <.
    const boundary = 20 * Math.log10(0.5);
    const result = detectQuietRegions(p([0.5, 1]), qcfg({ thresholdDb: boundary, minDuration: 0.1 }));
    expect(okRegions(result)).toEqual([
      {
        start: 0,
        end: 0.1,
        duration: 0.1,
        startBucket: 0,
        endBucket: 1,
        peakDb: boundary,
        meanDb: boundary,
        mediaId: 'm1',
      },
    ]);
  });

  it('drops quiet runs shorter than minDuration', () => {
    const peaks = p([0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(detectQuietRegions(peaks, qcfg()).status).toBe('no-regions');
    expect(okRegions(detectQuietRegions(peaks, qcfg({ minDuration: 0.1 })))).toEqual([
      {
        start: 0,
        end: 0.1,
        duration: 0.1,
        startBucket: 0,
        endBucket: 1,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('merges runs separated by no more than mergeGap', () => {
    const peaks = p([0, 0, 0.5, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const regions = okRegions(detectQuietRegions(peaks, qcfg({ minDuration: 0.1, mergeGap: 0.1 })));
    expect(regions).toEqual([
      {
        start: 0,
        end: 0.5,
        duration: 0.5,
        startBucket: 0,
        endBucket: 5,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('preserves runs when the gap is larger than mergeGap', () => {
    const peaks = p([0, 0, 0.5, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const regions = okRegions(detectQuietRegions(peaks, qcfg({ minDuration: 0.1, mergeGap: 0.05 })));
    expect(regions).toEqual([
      {
        start: 0,
        end: 0.2,
        duration: 0.2,
        startBucket: 0,
        endBucket: 2,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
      {
        start: 0.3,
        end: 0.5,
        duration: 0.2,
        startBucket: 3,
        endBucket: 5,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);
  });

  it('clamps regions to maxDurationSeconds and drops ones starting after the cap', () => {
    const allQuiet = okRegions(
      detectQuietRegions(p(new Array<number>(10).fill(0)), qcfg({ maxDurationSeconds: 0.5 })),
    );
    expect(allQuiet).toEqual([
      {
        start: 0,
        end: 0.5,
        duration: 0.5,
        startBucket: 0,
        endBucket: 5,
        peakDb: -60,
        meanDb: -60,
        mediaId: 'm1',
      },
    ]);

    const trailing = p([0.5, 0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0, 0]);
    expect(detectQuietRegions(trailing, qcfg({ maxDurationSeconds: 0.5 })).status).toBe('no-regions');
  });

  it('limits the number of returned regions with maxRegions', () => {
    const peaks = p([0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5]);
    const regions = okRegions(detectQuietRegions(peaks, qcfg({ minDuration: 0.1, maxRegions: 2 })));
    expect(regions).toHaveLength(2);
    expect(regions[0].startBucket).toBe(0);
    expect(regions[1].startBucket).toBe(2);
  });

  it('associates the configured mediaId, including null, with each region', () => {
    const peaks = p(new Array<number>(3).fill(0));
    expect(okRegions(detectQuietRegions(peaks, qcfg({ mediaId: 'm2' })))[0].mediaId).toBe('m2');
    expect(okRegions(detectQuietRegions(peaks, qcfg({ mediaId: null })))[0].mediaId).toBeNull();
  });

  it('propagates unavailable and empty states', () => {
    expect(detectQuietRegions(null, qcfg())).toMatchObject({
      status: 'unavailable',
      reason: 'No waveform peaks available',
      regions: [],
    });
    expect(detectQuietRegions(new Float32Array(0), qcfg())).toMatchObject({
      status: 'empty',
      regions: [],
    });
  });

  it('propagates invalid buckets from the shared stats scan', () => {
    const peaks = p([0.5, 0.5, 0.5]);
    peaks[4] = 2;
    expect(detectQuietRegions(peaks, qcfg())).toMatchObject({
      status: 'invalid',
      bucketIndices: [2],
      regions: [],
      stats: null,
    });
  });

  it('validates region configuration values', () => {
    const peaks = p([0, 0.5]);
    for (const extra of [
      { perSecond: 0 },
      { perSecond: Number.NaN },
      { minDuration: -1 },
      { minDuration: Infinity },
      { mergeGap: Number.NaN },
      { mergeGap: -0.1 },
    ]) {
      expect(detectQuietRegions(peaks, qcfg(extra))).toMatchObject({
        status: 'invalid',
        bucketIndices: [],
        regions: [],
      });
    }
  });

  it('returns cancelled for a pre-aborted signal before inspecting peaks', () => {
    const result = detectQuietRegions(null, qcfg({ signal: abortedSignal() }));
    expect(result).toMatchObject({ status: 'cancelled', regions: [], stats: null });
  });

  it('returns cancelled when the signal flips during bucket processing', () => {
    const { signal, reads } = countingSignal(3);
    const result = detectQuietRegions(p(new Array<number>(1100).fill(0)), qcfg({ signal }));
    expect(result.status).toBe('cancelled');
    expect(reads()).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic and does not mutate the peaks', () => {
    const peaks = p([0, 0, 0.5, 0.25, 0.5]);
    const before = Array.from(peaks);
    const first = detectQuietRegions(peaks, qcfg());
    const second = detectQuietRegions(peaks, qcfg());
    expect(first).toEqual(second);
    expect(Array.from(peaks)).toEqual(before);
  });
});
