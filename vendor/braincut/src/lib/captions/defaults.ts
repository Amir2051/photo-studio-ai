// shared caption defaults. the caption lane is a video track whose name is
// CAPTION_TRACK_NAME — the editor keeps the name in sync so the UI can find
// the lane without new schema

import type { TitleData, Track } from '#lib/project/types.ts';

export const CAPTION_TRACK_NAME = 'Captions';
export const CAPTION_TRACK_LABEL = 'Captions';
export const CAPTION_TRACK_ORDER_BOTTOM = 0;

export function isCaptionTrack(track: Track | undefined | null): boolean {
  return !!track && track.kind === 'video' && track.name === CAPTION_TRACK_NAME;
}

export type CaptionPosition = 'lower-third' | 'upper-third' | 'center';

export function captionPositionBox(
  position: CaptionPosition,
): { x: number; y: number; width: number } {
  switch (position) {
    case 'lower-third':
      return { x: 0.06, y: 0.84, width: 0.88 };
    case 'upper-third':
      return { x: 0.06, y: 0.12, width: 0.88 };
    case 'center':
      return { x: 0.08, y: 0.5, width: 0.84 };
  }
}

// used when a cue gets its clip created; big enough for 1080-height frames,
// dark stroke + semi-transparent background so white text survives bright scenes
export function defaultCaptionTitle(overrides: Partial<TitleData> = {}): TitleData {
  return {
    text: 'Caption',
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 600,
    italic: false,
    color: '#ffffff',
    align: 'center',
    lineHeight: 1.25,
    letterSpacing: 0,
    stroke: { color: '#000000', width: 3 },
    shadow: { color: '#000000', blur: 4, x: 0, y: 2 },
    background: { color: 'rgba(0,0,0,0.55)', padding: 12 },
    box: captionPositionBox('lower-third'),
    ...overrides,
  };
}

export function defaultCaptionClipName(text: string, fallback = 'Caption'): string {
  const single = text.split('\n').find((line) => line.trim().length > 0);
  return (single?.trim() || fallback).slice(0, 64);
}
