import { describe, expect, it } from 'vitest';
import type { Clip, MediaItem } from '#lib/project/types.ts';
import type { QuietRegion } from './audio-analysis.ts';
import { buildSilenceEditPlan, estimateRemoved, regionToMarker } from './silence-edit';
import type { QuietRegionMarker } from './silence-edit';

const FRAME = 1 / 30;

function clip(over: Partial<Clip> = {}): Clip {
  return {
    id: 'c1',
    kind: 'video',
    name: 'c1',
    mediaId: 'm1',
    start: 0,
    duration: 10,
    in: 0,
    speed: 1,
    reverse: false,
    linkId: null,
    enabled: true,
    label: 'none',
    effects: [],
    ...over,
  };
}

function media(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'm1',
    name: 'm1',
    kind: 'video',
    binId: null,
    duration: 60,
    width: 1920,
    height: 1080,
    fps: 30,
    hasVideo: true,
    hasAudio: true,
    channels: 2,
    sampleRate: 48000,
    videoCodec: 'h264',
    audioCodec: 'aac',
    container: 'mp4',
    mimeType: 'video/mp4',
    fileSize: 1000,
    rotation: 0,
    alpha: false,
    status: 'ready',
    proxy: null,
    converted: null,
    thumbnail: null,
    label: 'none',
    addedAt: 0,
    ...over,
  };
}

function region(over: Partial<QuietRegion> = {}): QuietRegion {
  return {
    start: 2,
    end: 3,
    duration: 1,
    startBucket: 100,
    endBucket: 150,
    peakDb: -60,
    meanDb: -60,
    mediaId: 'm1',
    ...over,
  };
}

function marker(over: Partial<QuietRegionMarker> = {}): QuietRegionMarker {
  return {
    id: 'c1:100:150',
    clipId: 'c1',
    mediaId: 'm1',
    start: 2,
    end: 3,
    duration: 1,
    sourceStart: 2,
    sourceEnd: 3,
    peakDb: -60,
    selected: true,
    ...over,
  };
}

describe('regionToMarker', () => {
  it('maps a region at the beginning of the clip', () => {
    const result = regionToMarker({
      region: region({ start: 0, end: 2, duration: 2, startBucket: 0, endBucket: 100 }),
      clip: clip({ start: 5 }),
      media: media(),
    });
    expect(result).not.toBeNull();
    expect(result?.start).toBe(5);
    expect(result?.end).toBe(7);
    expect(result?.duration).toBeCloseTo(2);
    expect(result?.sourceStart).toBe(0);
    expect(result?.sourceEnd).toBe(2);
    expect(result?.clipId).toBe('c1');
    expect(result?.mediaId).toBe('m1');
    expect(result?.peakDb).toBe(-60);
    expect(result?.selected).toBe(true);
  });

  it('maps a region in the middle of the clip', () => {
    const result = regionToMarker({
      region: region({ start: 6, end: 8 }),
      clip: clip({ start: 5, duration: 20 }),
      media: media(),
    });
    expect(result?.start).toBe(11);
    expect(result?.end).toBe(13);
    expect(result?.sourceStart).toBe(6);
    expect(result?.sourceEnd).toBe(8);
  });

  it('maps a region at the end of the clip', () => {
    const result = regionToMarker({
      region: region({ start: 9, end: 10 }),
      clip: clip({ duration: 10 }),
      media: media({ duration: 10 }),
    });
    expect(result?.start).toBe(9);
    expect(result?.end).toBe(10);
  });

  it('rejects a clip without a mediaId', () => {
    expect(regionToMarker({ region: region(), clip: clip({ mediaId: null }) })).toBeNull();
    expect(regionToMarker({ region: region(), clip: clip({ mediaId: '' }) })).toBeNull();
  });

  it('rejects zero, negative and non-finite speeds', () => {
    for (const speed of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(regionToMarker({ region: region(), clip: clip({ speed }) })).toBeNull();
    }
  });

  it('rejects non-finite region fields', () => {
    expect(regionToMarker({ region: region({ start: Number.NaN }), clip: clip() })).toBeNull();
    expect(
      regionToMarker({ region: region({ end: Number.POSITIVE_INFINITY }), clip: clip() }),
    ).toBeNull();
    expect(regionToMarker({ region: region({ peakDb: Number.NaN }), clip: clip() })).toBeNull();
    expect(regionToMarker({ region: region(), clip: clip(), fps: Number.NaN })).not.toBeNull();
  });

  it('snaps sequence bounds to frames', () => {
    const result = regionToMarker({
      region: region({ start: 2.01, end: 3.04 }),
      clip: clip(),
    });
    expect(result?.start).toBeCloseTo(2, 6);
    expect(result?.end).toBeCloseTo(91 / 30, 6);
    expect(result?.duration).toBeCloseTo(91 / 30 - 2, 6);
  });

  it('uses a custom valid fps and falls back to 30 for an invalid one', () => {
    const atTen = regionToMarker({
      region: region({ start: 2.04, end: 3.04 }),
      clip: clip(),
      fps: 10,
    });
    expect(atTen?.start).toBeCloseTo(2, 6);
    expect(atTen?.end).toBeCloseTo(3, 6);

    const fallback = regionToMarker({
      region: region({ start: 2.04, end: 3.04 }),
      clip: clip(),
      fps: -5,
    });
    expect(fallback?.end).toBeCloseTo(91 / 30, 6);
  });

  it('expands the region symmetrically in source seconds with padding', () => {
    const result = regionToMarker({ region: region(), clip: clip(), padding: 0.5 });
    expect(result?.sourceStart).toBeCloseTo(1.5, 6);
    expect(result?.sourceEnd).toBeCloseTo(3.5, 6);
    expect(result?.start).toBeCloseTo(1.5, 6);
    expect(result?.end).toBeCloseTo(3.5, 6);
  });

  it('treats zero, negative and non-finite padding as zero', () => {
    for (const padding of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = regionToMarker({ region: region(), clip: clip(), padding });
      expect(result?.sourceStart).toBe(2);
      expect(result?.sourceEnd).toBe(3);
    }
  });

  it('clamps padding expansion at the start of the media', () => {
    const result = regionToMarker({
      region: region({ start: 0.1, end: 0.5 }),
      clip: clip(),
      media: media({ duration: 10 }),
      padding: 0.5,
    });
    expect(result?.sourceStart).toBe(0);
    expect(result?.sourceEnd).toBeCloseTo(1, 6);
  });

  it('clamps padding expansion at the end of the media', () => {
    const result = regionToMarker({
      region: region({ start: 9.5, end: 9.9 }),
      clip: clip(),
      media: media({ duration: 10 }),
      padding: 0.5,
    });
    expect(result?.sourceStart).toBeCloseTo(9, 6);
    expect(result?.sourceEnd).toBe(10);
  });

  it('clamps to the clip source range when no media is provided', () => {
    const result = regionToMarker({
      region: region({ start: 1, end: 6 }),
      clip: clip({ in: 2, duration: 3 }),
    });
    expect(result?.sourceStart).toBe(2);
    expect(result?.sourceEnd).toBe(5);
    // sequence time = (source - clip.in) / speed, with clip.in = 2
    expect(result?.start).toBe(0);
    expect(result?.end).toBe(3);
  });

  it('uses media duration as an upper bound only when finite and positive', () => {
    const unknown = regionToMarker({
      region: region({ start: 9, end: 11 }),
      clip: clip(),
      media: media({ duration: Number.NaN }),
    });
    expect(unknown?.sourceEnd).toBe(10); // clip range still clamps

    const shorter = regionToMarker({
      region: region({ start: 4, end: 6 }),
      clip: clip(),
      media: media({ duration: 5 }),
    });
    expect(shorter?.sourceStart).toBe(4);
    expect(shorter?.sourceEnd).toBe(5);
  });

  it('drops a region that lies fully outside the clip', () => {
    expect(
      regionToMarker({ region: region({ start: 20, end: 21 }), clip: clip() }),
    ).toBeNull();
  });

  it('rejects a region that collapses to one frame or less after clamping/snapping', () => {
    expect(
      regionToMarker({ region: region({ start: 2, end: 2.02 }), clip: clip() }),
    ).toBeNull();
  });

  it('maps a reverse clip so sequence start is still <= end', () => {
    const result = regionToMarker({
      region: region({ start: 2, end: 3 }),
      clip: clip({ reverse: true }),
    });
    expect(result?.start).toBe(7);
    expect(result?.end).toBe(8);
    expect(result?.sourceStart).toBe(2);
    expect(result?.sourceEnd).toBe(3);
    expect(result?.duration).toBeCloseTo(1);
  });

  it('maps a reverse clip with padding and a nonzero sequence offset', () => {
    const result = regionToMarker({
      region: region({ start: 2, end: 3 }),
      clip: clip({ start: 10, reverse: true }),
      padding: 1,
    });
    expect(result?.sourceStart).toBe(1);
    expect(result?.sourceEnd).toBe(4);
    expect(result?.start).toBe(16);
    expect(result?.end).toBe(19);
  });

  it('maps a sped-up clip (source duration divided by speed)', () => {
    const result = regionToMarker({
      region: region({ start: 4, end: 6 }),
      clip: clip({ speed: 2, duration: 5 }),
    });
    expect(result?.start).toBe(2);
    expect(result?.end).toBe(3);
    expect(result?.duration).toBeCloseTo(1);
  });

  it('maps a slow-motion clip', () => {
    const result = regionToMarker({
      region: region({ start: 0.5, end: 1.5 }),
      clip: clip({ speed: 0.5, duration: 4 }),
    });
    expect(result?.start).toBe(1);
    expect(result?.end).toBe(3);
    expect(result?.duration).toBeCloseTo(2);
  });

  it('maps a reverse clip with speed != 1', () => {
    const result = regionToMarker({
      region: region({ start: 2, end: 4 }),
      clip: clip({ speed: 2, duration: 5, reverse: true }),
    });
    expect(result?.start).toBe(3);
    expect(result?.end).toBe(4);
  });

  it('produces deterministic ids from clip id and bucket range', () => {
    const input = { region: region({ startBucket: 7, endBucket: 9 }), clip: clip() };
    expect(regionToMarker(input)?.id).toBe('c1:7:9');
    expect(regionToMarker(input)?.id).toBe('c1:7:9');
    expect(
      regionToMarker({ region: region({ startBucket: 8, endBucket: 9 }), clip: clip() })?.id,
    ).toBe('c1:8:9');
  });

  it('rejects a region that cannot span a frame in a very short clip', () => {
    expect(
      regionToMarker({
        region: region({ start: 0, end: 0.03, duration: 0.03 }),
        clip: clip({ duration: 0.03 }),
      }),
    ).toBeNull();
  });

  it('maps a region inside a long clip without precision loss', () => {
    const result = regionToMarker({
      region: region({ start: 1800, end: 1801.5 }),
      clip: clip({ start: 100, in: 50, duration: 3600 }),
    });
    expect(result?.start).toBeCloseTo(1850, 6);
    expect(result?.end).toBeCloseTo(1851.5, 6);
    expect(result?.duration).toBeCloseTo(1.5, 6);
  });

  it('never mutates its inputs (even when frozen)', () => {
    const r = Object.freeze(region());
    const c = Object.freeze(clip());
    const m = Object.freeze(media());
    const input = Object.freeze({ region: r, clip: c, media: m, padding: 0.25 });
    const before = JSON.stringify(input);
    expect(() => regionToMarker(input)).not.toThrow();
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('buildSilenceEditPlan', () => {
  it('returns an empty invalid plan for no markers', () => {
    const plan = buildSilenceEditPlan([]);
    expect(plan.ranges).toEqual([]);
    expect(plan.totalRemoved).toBe(0);
    expect(plan.skipped).toBe(0);
    expect(plan.warnings).toEqual([]);
    expect(plan.valid).toBe(false);
  });

  it('returns a one-range plan for a single marker', () => {
    const plan = buildSilenceEditPlan([marker()]);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.ranges[0]).toEqual({
      start: 2,
      end: 3,
      sourceStart: 2,
      sourceEnd: 3,
      clipId: 'c1',
      mediaId: 'm1',
    });
    expect(plan.totalRemoved).toBeCloseTo(1);
    expect(plan.skipped).toBe(0);
    expect(plan.valid).toBe(true);
  });

  it('merges consecutive ranges', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 0, end: 1, sourceStart: 0, sourceEnd: 1 }),
      marker({ start: 1, end: 2, sourceStart: 1, sourceEnd: 2 }),
    ]);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.ranges[0].start).toBe(0);
    expect(plan.ranges[0].end).toBe(2);
    expect(plan.totalRemoved).toBeCloseTo(2);
  });

  it('merges overlapping ranges', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 0, end: 2 }),
      marker({ start: 1, end: 3 }),
    ]);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.ranges[0].end).toBe(3);
    expect(plan.totalRemoved).toBeCloseTo(3);
  });

  it('merges ranges separated by exactly one frame (adjacent)', () => {
    const plan = buildSilenceEditPlan(
      [
        marker({ start: 0, end: 1 }),
        marker({ start: 1 + FRAME, end: 2 + FRAME }),
      ],
      30,
    );
    expect(plan.ranges).toHaveLength(1);
    expect(plan.ranges[0].end).toBeCloseTo(2 + FRAME, 6);
  });

  it('does not merge ranges separated by more than one frame', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 0, end: 1 }),
      marker({ start: 1.1, end: 2 }),
    ]);
    expect(plan.ranges).toHaveLength(2);
    expect(plan.totalRemoved).toBeCloseTo(1.9);
  });

  it('keeps source and clip metadata from the first range of a merged group', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 0, end: 2, sourceStart: 10, sourceEnd: 12, clipId: 'a', mediaId: 'ma' }),
      marker({ start: 1, end: 3, sourceStart: 20, sourceEnd: 22, clipId: 'b', mediaId: 'mb' }),
    ]);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.ranges[0]).toMatchObject({
      start: 0,
      end: 3,
      sourceStart: 10,
      sourceEnd: 12,
      clipId: 'a',
      mediaId: 'ma',
    });
  });

  it('sorts unsorted input by sequence start', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 2, end: 3 }),
      marker({ start: 0, end: 1 }),
    ]);
    expect(plan.ranges.map((r) => r.start)).toEqual([0, 2]);
    expect(plan.totalRemoved).toBeCloseTo(2);
  });

  it('drops a range whose duration is one frame or less', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 0, end: FRAME, sourceStart: 0, sourceEnd: FRAME }),
    ]);
    expect(plan.ranges).toEqual([]);
    expect(plan.skipped).toBe(1);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.valid).toBe(false);
  });

  it('treats warnings as fatal even when other ranges survive', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 0, end: 1 }),
      marker({ start: 5, end: 5 + FRAME }),
    ]);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.skipped).toBe(1);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.valid).toBe(false); // documented fail-closed policy
  });

  it('clamps negative starts to zero', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: -1, end: 2, sourceStart: -1, sourceEnd: 2 }),
    ]);
    expect(plan.ranges[0].start).toBe(0);
    expect(plan.ranges[0].end).toBe(2);
    expect(plan.totalRemoved).toBeCloseTo(2);
  });

  it('filters deselected markers by default', () => {
    const empty = buildSilenceEditPlan([marker({ selected: false })]);
    expect(empty.ranges).toEqual([]);
    expect(empty.totalRemoved).toBe(0);

    const mixed = buildSilenceEditPlan([
      marker({ start: 0, end: 1, selected: true }),
      marker({ start: 5, end: 7, selected: false }),
    ]);
    expect(mixed.ranges).toHaveLength(1);
    expect(mixed.ranges[0].start).toBe(0);
  });

  it('includes deselected markers when selectedOnly is false', () => {
    const plan = buildSilenceEditPlan([marker({ selected: false })], 30, false);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.totalRemoved).toBeCloseTo(1);
    expect(plan.valid).toBe(true);
  });

  it('skips malformed markers with warnings without throwing', () => {
    const malformed = [
      marker({ start: Number.NaN }),
      marker({ start: 5, end: 5 }),
      marker({ clipId: 7 as unknown as string }),
      null,
    ] as unknown as QuietRegionMarker[];
    expect(() => buildSilenceEditPlan(malformed)).not.toThrow();
    const plan = buildSilenceEditPlan(malformed);
    expect(plan.skipped).toBe(4);
    expect(plan.warnings).toHaveLength(4);
    expect(plan.ranges).toEqual([]);
  });

  it('computes totalRemoved as the sum of merged range lengths', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 10, end: 11 }),
      marker({ start: 0, end: 2 }),
      marker({ start: 1, end: 3 }), // overlaps the 0-2 range
      marker({ start: 20, end: 20.5 }),
    ]);
    expect(plan.ranges).toHaveLength(3);
    expect(plan.ranges.map((r) => [r.start, r.end])).toEqual([
      [0, 3],
      [10, 11],
      [20, 20.5],
    ]);
    expect(plan.totalRemoved).toBeCloseTo(4.5);
  });

  it('handles multiple clips with independent metadata', () => {
    const plan = buildSilenceEditPlan([
      marker({ start: 20, end: 21, clipId: 'b', mediaId: 'mb' }),
      marker({ start: 5, end: 6, clipId: 'a', mediaId: 'ma' }),
    ]);
    expect(plan.ranges).toHaveLength(2);
    expect(plan.ranges[0]).toMatchObject({ clipId: 'a', mediaId: 'ma', start: 5 });
    expect(plan.ranges[1]).toMatchObject({ clipId: 'b', mediaId: 'mb', start: 20 });
    expect(plan.totalRemoved).toBeCloseTo(2);
  });

  it('falls back to 30 fps when an invalid fps is supplied', () => {
    const plan = buildSilenceEditPlan(
      [marker({ start: 0, end: 1 }), marker({ start: 1 + FRAME, end: 2 + FRAME })],
      Number.NaN,
    );
    expect(plan.ranges).toHaveLength(1);
  });

  it('never mutates its inputs (even when frozen)', () => {
    const a = Object.freeze(marker({ start: 0, end: 2 }));
    const b = Object.freeze(marker({ start: 1, end: 3 }));
    const list = Object.freeze([a, b]);
    const before = JSON.stringify(list);
    expect(() => buildSilenceEditPlan(list)).not.toThrow();
    expect(() => estimateRemoved(list)).not.toThrow();
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe('estimateRemoved', () => {
  it('matches plan.totalRemoved for selected markers', () => {
    const markers = [
      marker({ start: 0, end: 2 }),
      marker({ start: 5, end: 6 }),
      marker({ start: 9, end: 9.5 }),
    ];
    expect(estimateRemoved(markers)).toBeCloseTo(buildSilenceEditPlan(markers).totalRemoved, 10);
    expect(estimateRemoved(markers)).toBeCloseTo(3.5, 10);
  });

  it('is merged-equivalent for overlapping ranges', () => {
    const markers = [marker({ start: 0, end: 2 }), marker({ start: 1, end: 3 })];
    expect(estimateRemoved(markers)).toBeCloseTo(3, 10);
    expect(estimateRemoved(markers)).toBeCloseTo(buildSilenceEditPlan(markers).totalRemoved, 10);
  });

  it('honours selectedOnly', () => {
    const markers = [
      marker({ start: 0, end: 1, selected: true }),
      marker({ start: 5, end: 8, selected: false }),
    ];
    expect(estimateRemoved(markers)).toBeCloseTo(1, 10);
    expect(estimateRemoved(markers, false)).toBeCloseTo(4, 10);
  });

  it('returns zero for empty or all-deselected input', () => {
    expect(estimateRemoved([])).toBe(0);
    expect(estimateRemoved([marker({ selected: false })])).toBe(0);
  });
});
