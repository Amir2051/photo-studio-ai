// turning parsed cues into timeline clips. the caption lane is a video
// track named CAPTION_TRACK_NAME; title clips carry one cue each, so the
// compositor renders them through the existing text pipeline (preview and
// export alike) and the user edits captions with the existing title tools

import { createTitleClip } from '#lib/project/defaults.ts';
import { overwriteClip, addTrack, renameTrack, deleteClips } from '#lib/project/ops.ts';
import type { CaptionCue } from './parse.ts';
import { CAPTION_TRACK_NAME, defaultCaptionClipName, defaultCaptionTitle } from './defaults.ts';
import type { Clip, Sequence } from '#lib/project/types.ts';

export interface ImportCaptionsResult {
  /** number of cue clips inserted */
  inserted: number;
  /** 0 when the caption track already existed, else the index it was given */
  captionTrackIndex: number;
}

// a caption clip fires at cue.start; one clip per cue, exact text, exact timing
function buildCaptionClips(cues: CaptionCue[]): Clip[] {
  return cues.map((cue) => {
    const title = defaultCaptionTitle({ text: cue.text });
    const clip = createTitleClip(cue.start, Math.max(0.04, cue.end - cue.start), cue.text);
    clip.title = title;
    clip.name = defaultCaptionClipName(cue.text);
    return clip;
  });
}

/**
 * Creates (or reuses) the caption lane and drops one title clip per cue into
 * it. existing cues on the lane are replaced wholesale — that is the sane
 * behaviour for a re-import and the user picks the file explicitly
 */
export function ensureCaptionTrack(seq: Sequence): { trackId: string; created: boolean } {
  const existing = seq.tracks.find(
    (track) => track.kind === 'video' && track.name === CAPTION_TRACK_NAME,
  );
  if (existing) return { trackId: existing.id, created: false };

  const id = addTrack(seq, 'video', { index: 0 });
  const found = seq.tracks.find((track) => track.id === id);
  if (found) renameTrack(seq, found.id, CAPTION_TRACK_NAME);
  return { trackId: id, created: true };
}

/**
 * Removes every caption-like title clip currently sitting on the lane.
 * Returns the count removed so the caller can tell the user something happened.
 */
export function clearCaptionLane(seq: Sequence): number {
  const track = seq.tracks.find(
    (candidate) => candidate.kind === 'video' && candidate.name === CAPTION_TRACK_NAME,
  );
  if (!track) return 0;
  const ids = track.clips.map((clip) => clip.id);
  if (ids.length) deleteClips(seq, ids);
  return ids.length;
}

export function insertCaptionCues(seq: Sequence, cues: CaptionCue[]): ImportCaptionsResult {
  if (!cues.length) return { inserted: 0, captionTrackIndex: -1 };
  const { trackId, created } = ensureCaptionTrack(seq);
  clearCaptionLane(seq);
  const clips = buildCaptionClips(cues);
  let inserted = 0;
  for (const clip of clips) {
    if (overwriteClip(seq, trackId, clip, clip.start)) inserted += 1;
  }
  const trackIndex = seq.tracks.findIndex((track) => track.id === trackId);
  return { inserted, captionTrackIndex: trackIndex >= 0 ? trackIndex : created ? 0 : -1 };
}
