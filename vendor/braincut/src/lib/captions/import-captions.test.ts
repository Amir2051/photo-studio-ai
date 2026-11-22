import { describe, expect, it } from 'vitest';
import { CAPTION_TRACK_NAME, defaultCaptionTitle, isCaptionTrack } from './defaults';
import { insertCaptionCues, clearCaptionLane, ensureCaptionTrack } from './import-captions';
import { parseCaptions } from './parse';
import { createSequence } from '../project/defaults';

const SRT = `1
00:00:00,000 --> 00:00:01,000
Cue one

2
00:00:01,500 --> 00:00:03,000
Cue two

3
00:00:03,500 --> 00:00:05,000
Cue three
`;

function seq() {
  return createSequence({ name: 'test', width: 1280, height: 720, fps: 30 });
}

describe('caption track management', () => {
  it('identifies the caption lane by kind and name', () => {
    const s = seq();
    const { trackId } = ensureCaptionTrack(s);
    const track = s.tracks.find((t) => t.id === trackId)!;
    expect(isCaptionTrack(track)).toBe(true);
    expect(track.name).toBe(CAPTION_TRACK_NAME);
    expect(track.kind).toBe('video');
  });

  it('creates the caption lane at the top of the video stack', () => {
    const s = seq();
    const { trackId, created } = ensureCaptionTrack(s);
    expect(created).toBe(true);
    const firstVideo = s.tracks.find((t) => t.kind === 'video')!;
    expect(firstVideo.id).toBe(trackId);
  });

  it('reuses the same lane on repeated imports', () => {
    const s = seq();
    const first = ensureCaptionTrack(s);
    const second = ensureCaptionTrack(s);
    expect(second.trackId).toBe(first.trackId);
    expect(second.created).toBe(false);
  });
});

describe('caption import', () => {
  it('inserts one title clip per cue with exact timing and text', () => {
    const s = seq();
    const { cues } = parseCaptions(SRT);
    const result = insertCaptionCues(s, cues);
    expect(result.inserted).toBe(3);
    const track = s.tracks.find((t) => t.name === CAPTION_TRACK_NAME)!;
    expect(track.clips.map((c) => [c.start, round2(c.start + c.duration)])).toEqual([
      [0, 1],
      [1.5, 3],
      [3.5, 5],
    ]);
    expect(track.clips.map((c) => c.title?.text)).toEqual(['Cue one', 'Cue two', 'Cue three']);
    expect(track.clips.every((c) => c.kind === 'title')).toBe(true);
  });

  it('replaces existing cues on the lane on re-import', () => {
    const s = seq();
    const { cues } = parseCaptions(SRT);
    insertCaptionCues(s, cues);
    const small = parseCaptions('1\n00:00:10,000 --> 00:00:11,000\nOnly one\n').cues;
    insertCaptionCues(s, small);
    const track = s.tracks.find((t) => t.name === CAPTION_TRACK_NAME)!;
    expect(track.clips).toHaveLength(1);
    expect(track.clips[0].title?.text).toBe('Only one');
  });

  it('clearCaptionLane removes only lane clips', () => {
    const s = seq();
    const { cues } = parseCaptions(SRT);
    insertCaptionCues(s, cues);
    const videoTracks = s.tracks.filter((t) => t.kind === 'video' && t.name !== CAPTION_TRACK_NAME);
    const removed = clearCaptionLane(s);
    expect(removed).toBe(3);
    // the lane itself survives for reuse; other video tracks stay untouched
    expect(s.tracks.filter((t) => t.kind === 'video').map((t) => t.name)).toEqual([
      CAPTION_TRACK_NAME,
      ...videoTracks.map((t) => t.name),
    ]);
  });

  it('slice zero stays no-op', () => {
    const s = seq();
    expect(insertCaptionCues(s, []).inserted).toBe(0);
    expect(s.tracks.some((t) => t.name === CAPTION_TRACK_NAME)).toBe(false);
  });
});

describe('caption style defaults', () => {
  it('has stroke, shadow and background for legibility over bright footage', () => {
    const title = defaultCaptionTitle();
    expect(title.stroke?.width).toBeGreaterThan(0);
    expect(title.shadow).toBeTruthy();
    expect(title.background?.color).toContain('rgba');
    expect(title.box.y).toBeGreaterThanOrEqual(0.7);
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
