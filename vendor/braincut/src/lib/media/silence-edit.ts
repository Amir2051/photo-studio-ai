// Pure, node-safe mapping from detected quiet regions (SOURCE seconds) to
// frame-snapped SEQUENCE-time timeline ranges and a safe edit plan.
//
// This module deliberately imports no DOM, Web Audio, IndexedDB or Svelte
// module at runtime: the only runtime dependency is clip-time.ts, which is a
// pure function library. Everything here is deterministic and never mutates
// its inputs.
//
// Conventions
//  - `start`/`end` on markers and ranges are frame-snapped SEQUENCE seconds.
//  - `sourceStart`/`sourceEnd` are SOURCE seconds (padded then clamped, not
//    frame-snapped, so they stay faithful to the analyser's bucket times).
//  - A marker's `duration` is its SEQUENCE duration (`end - start`), so that
//    summing marker durations is directly comparable to a plan's
//    `totalRemoved` even when clip.speed !== 1.
//  - For reverse clips `sequenceTimeOfSource` inverts the mapping; the two
//    mapped sequence times are ordered with min/max so `start <= end` always.

import type { Clip, MediaItem } from '#lib/project/types.ts';
import type { QuietRegion } from './audio-analysis.ts';
import { clipSourceRange, sequenceTimeOfSource } from '#lib/engine/clip-time.ts';

export interface QuietRegionMarker {
  readonly id: string;
  readonly clipId: string;
  readonly mediaId: string;
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly sourceStart: number;
  readonly sourceEnd: number;
  readonly peakDb: number;
  readonly selected: boolean;
}

export interface SilenceEditRange {
  readonly start: number;
  readonly end: number;
  readonly sourceStart: number;
  readonly sourceEnd: number;
  readonly clipId: string;
  readonly mediaId: string;
}

export interface SilenceEditPlan {
  readonly ranges: readonly SilenceEditRange[];
  readonly totalRemoved: number;
  readonly skipped: number;
  readonly warnings: readonly string[];
  readonly valid: boolean;
}

export interface RegionToMarkerInput {
  region: QuietRegion;
  clip: Clip;
  media?: MediaItem | null;
  fps?: number;
  padding?: number;
}

// Mutable working shape used only inside the merge routine; results are copied
// into the readonly SilenceEditRange interface before being returned.
interface WorkingRange {
  start: number;
  end: number;
  sourceStart: number;
  sourceEnd: number;
  clipId: string;
  mediaId: string;
}

interface MergeResult {
  ranges: WorkingRange[];
  skipped: number;
  warnings: string[];
}

const DEFAULT_FPS = 30;

// Invalid frame rates fall back to 30 rather than throwing or producing NaN.
function normalizeFps(fps: number | undefined): number {
  return typeof fps === 'number' && Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS;
}

// Negative / non-finite padding is ignored (clamped to zero).
function normalizePadding(padding: number | undefined): number {
  return typeof padding === 'number' && Number.isFinite(padding) && padding > 0 ? padding : 0;
}

// Runtime guard: callers may hand-build markers, so every field that takes
// part in arithmetic and ordering is checked before use.
function isUsableMarker(marker: QuietRegionMarker): boolean {
  if (marker == null) return false;
  return (
    Number.isFinite(marker.start) &&
    Number.isFinite(marker.end) &&
    Number.isFinite(marker.sourceStart) &&
    Number.isFinite(marker.sourceEnd) &&
    typeof marker.clipId === 'string' &&
    typeof marker.mediaId === 'string' &&
    marker.end > marker.start
  );
}

// Maps a detected quiet region onto one frame-snapped sequence-time marker.
// Returns null (never throws) for any clip/region/input that cannot produce a
// finite, non-degenerate marker.
export function regionToMarker(input: RegionToMarkerInput): QuietRegionMarker | null {
  if (input == null) return null;
  const { region, clip, media } = input;
  if (region == null || clip == null) return null;

  const fps = normalizeFps(input.fps);
  const padding = normalizePadding(input.padding);
  const frame = 1 / fps;

  const mediaId = clip.mediaId;
  if (mediaId == null || mediaId === '') return null;
  if (!Number.isFinite(clip.speed) || clip.speed <= 0) return null;
  if (
    !Number.isFinite(clip.start) ||
    !Number.isFinite(clip.in) ||
    !Number.isFinite(clip.duration)
  ) {
    return null;
  }
  if (
    !Number.isFinite(region.start) ||
    !Number.isFinite(region.end) ||
    !Number.isFinite(region.peakDb)
  ) {
    return null;
  }

  const sourceRange = clipSourceRange(clip);
  if (
    !Number.isFinite(sourceRange.start) ||
    !Number.isFinite(sourceRange.end) ||
    sourceRange.end <= sourceRange.start
  ) {
    return null;
  }

  // Source time is never negative; media duration is an additional upper bound
  // only when it is a finite, positive value (0/-1/NaN mean "unknown").
  const lowerBound = Math.max(sourceRange.start, 0);
  let upperBound = sourceRange.end;
  if (media != null && Number.isFinite(media.duration) && media.duration > 0) {
    upperBound = Math.min(upperBound, media.duration);
  }
  if (!Number.isFinite(lowerBound) || !Number.isFinite(upperBound) || upperBound <= lowerBound) {
    return null;
  }

  // Padding is applied in SOURCE seconds before the range is clamped.
  const lowerRegion = Math.min(region.start, region.end);
  const upperRegion = Math.max(region.start, region.end);
  const paddedStart = lowerRegion - padding;
  const paddedEnd = upperRegion + padding;
  if (!Number.isFinite(paddedStart) || !Number.isFinite(paddedEnd)) return null;

  const clamp = (value: number): number => Math.min(upperBound, Math.max(lowerBound, value));
  const sourceStart = clamp(paddedStart);
  const sourceEnd = clamp(paddedEnd);
  if (!Number.isFinite(sourceStart) || !Number.isFinite(sourceEnd) || sourceEnd <= sourceStart) {
    return null;
  }

  const mappedStart = sequenceTimeOfSource(clip, sourceStart);
  const mappedEnd = sequenceTimeOfSource(clip, sourceEnd);
  if (!Number.isFinite(mappedStart) || !Number.isFinite(mappedEnd)) return null;

  // The mapping is monotone but decreasing for reverse clips, hence min/max.
  const sequenceStart = Math.round(Math.min(mappedStart, mappedEnd) * fps) / fps;
  const sequenceEnd = Math.round(Math.max(mappedStart, mappedEnd) * fps) / fps;
  const duration = sequenceEnd - sequenceStart;

  if (
    !Number.isFinite(sequenceStart) ||
    !Number.isFinite(sequenceEnd) ||
    !Number.isFinite(duration) ||
    !(duration > frame)
  ) {
    return null;
  }

  return {
    id: `${clip.id}:${region.startBucket}:${region.endBucket}`,
    clipId: clip.id,
    mediaId,
    start: sequenceStart,
    end: sequenceEnd,
    duration,
    sourceStart,
    sourceEnd,
    peakDb: region.peakDb,
    // Markers start selected; the UI can deselect them via a spread copy.
    selected: true,
  };
}

// Shared filter + sort + merge used by both buildSilenceEditPlan and
// estimateRemoved so the two always agree on what counts as "removed".
function mergeMarkers(
  markers: readonly QuietRegionMarker[],
  fps: number,
  selectedOnly: boolean,
): MergeResult {
  const frame = 1 / fps;
  const warnings: string[] = [];
  let skipped = 0;

  // `markers ?? []` also tolerates a nullish (malformed) argument without
  // throwing; individual malformed entries are skipped below.
  const list: readonly QuietRegionMarker[] = markers ?? [];
  const candidates: QuietRegionMarker[] = [];
  for (let i = 0; i < list.length; i++) {
    const marker = list[i];
    if (!isUsableMarker(marker)) {
      skipped += 1;
      warnings.push(`Skipped marker at index ${i}: invalid or non-finite fields`);
      continue;
    }
    if (selectedOnly && !marker.selected) continue;
    candidates.push(marker);
  }

  // Group by owning clip before merging so another track's interleaved
  // marker cannot prevent two overlapping regions on this clip from merging.
  candidates.sort(
    (a, b) => a.clipId.localeCompare(b.clipId) || a.start - b.start || a.end - b.end || a.sourceStart - b.sourceStart,
  );

  // Adjacent means the next range starts no more than one frame after the
  // current one ends (inclusive), matching the <= in the specification.
  const merged: WorkingRange[] = [];
  for (const marker of candidates) {
    const current = merged[merged.length - 1];
    // Never merge markers from different clips: callers must retain the
    // owning clip so timeline edits can be scoped to its track.
    if (current !== undefined && current.clipId === marker.clipId && marker.start <= current.end + frame) {
      if (marker.end > current.end) current.end = marker.end;
    } else {
      merged.push({
        start: marker.start,
        end: marker.end,
        sourceStart: marker.sourceStart,
        sourceEnd: marker.sourceEnd,
        clipId: marker.clipId,
        mediaId: marker.mediaId,
      });
    }
  }

  // Restore timeline order after the per-clip merge.
  merged.sort((a, b) => a.start - b.start || a.end - b.end);

  const ranges: WorkingRange[] = [];
  for (const candidate of merged) {
    const start = candidate.start < 0 ? 0 : candidate.start;
    if (!(candidate.end - start > frame)) {
      skipped += 1;
      warnings.push(`Skipped range at ${start.toFixed(3)}s: duration is one frame or less`);
      continue;
    }
    ranges.push({ ...candidate, start });
  }

  return { ranges, skipped, warnings };
}

// Builds a safe, reviewable edit plan from selected markers.
//
// `valid` policy: warnings are treated as FATAL by design. Any skipped marker
// (malformed or one-frame-or-less) invalidates the whole plan so a caller must
// review the warnings before applying an edit. This fails closed and matches
// the "fail securely and explicitly" requirement; `valid === true` therefore
// means "ranges exist AND nothing was skipped".
export function buildSilenceEditPlan(
  markers: readonly QuietRegionMarker[],
  fps: number = DEFAULT_FPS,
  selectedOnly: boolean = true,
): SilenceEditPlan {
  const frameRate = normalizeFps(fps);
  const { ranges: merged, skipped, warnings } = mergeMarkers(markers, frameRate, selectedOnly);

  const ranges: SilenceEditRange[] = merged.map((range) => ({
    start: range.start,
    end: range.end,
    sourceStart: range.sourceStart,
    sourceEnd: range.sourceEnd,
    clipId: range.clipId,
    mediaId: range.mediaId,
  }));

  let totalRemoved = 0;
  for (const range of ranges) totalRemoved += range.end - range.start;

  return {
    ranges,
    totalRemoved,
    skipped,
    warnings,
    valid: ranges.length > 0 && warnings.length === 0,
  };
}

// Fast estimate of sequence seconds removed, using the same merge semantics as
// buildSilenceEditPlan (default fps = 30, selectedOnly = true) but without
// allocating a plan object. Returns 0 for empty / all-deselected input.
export function estimateRemoved(
  markers: readonly QuietRegionMarker[],
  selectedOnly: boolean = true,
): number {
  const { ranges } = mergeMarkers(markers, DEFAULT_FPS, selectedOnly);
  let total = 0;
  for (const range of ranges) total += range.end - range.start;
  return total;
}
