// SRT/VTT caption parsing. kept deliberately small and dependency-free.

export interface CaptionCue {
  /** 1-based position inside the source file, re-numbered after sorting */
  index: number;
  /** seconds from the beginning of the sequence */
  start: number;
  /** seconds from the beginning of the sequence */
  end: number;
  /** the cue body, trimmed; newlines inside the cue become \n */
  text: string;
}

export interface CaptionParseResult {
  cues: CaptionCue[];
  format: 'srt' | 'vtt';
  /** cues that were dropped because they were malformed or empty */
  dropped: number;
}

const TIMESTAMP =
  /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[,.])(\d{1,3})/;

function timestampToSeconds(raw: string): number | null {
  const match = raw.match(TIMESTAMP);
  if (!match) return null;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const fraction = Number(match[4].padEnd(3, '0'));
  if (!Number.isFinite(hours + minutes + seconds + fraction)) return null;
  return hours * 3600 + minutes * 60 + seconds + fraction / 1000;
}

// \r\n and lone \r both show up in the wild; also strip a BOM anywhere it appears
function normalize(text: string): string {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function detectFormat(text: string): 'srt' | 'vtt' {
  return /^WEBVTT($|[ \t\n\r])/im.test(text.replace(/^﻿/, '')) ? 'vtt' : 'srt';
}

export function parseCaptions(input: string): CaptionParseResult {
  const format = detectFormat(input);
  const text = normalize(input);
  if (!text) return { cues: [], format, dropped: 0 };

  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const cues: CaptionCue[] = [];
  let dropped = 0;

  for (const rawBlock of blocks) {
    // a cue block always contains "-->"; anything without one is dropped,
    // except VTT metadata blocks which carry no cues anyway
    if (!rawBlock.includes('-->')) {
      const vttMetadata = /^(NOTE|STYLE|REGION|WEBVTT)\b/i.test(rawBlock);
      if (format === 'srt' || !vttMetadata) dropped += 1;
      continue;
    }
    const timestampMatch = rawBlock.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{1,2}(?::\d{1,2})?[,.]\d{1,3})([^\n]*)/);
    if (!timestampMatch) {
      dropped += 1;
      continue;
    }
    const start = timestampToSeconds(timestampMatch[1]);
    const end = timestampToSeconds(timestampMatch[2]);
    if (start === null || end === null || !(end > start)) {
      dropped += 1;
      continue;
    }
    // everything after the timing line is the cue body; VTT cue settings
    // and inline style tags are dropped
    const afterTiming = rawBlock.slice(timestampMatch.index! + timestampMatch[0].length);
    const cueText = afterTiming
      .split('\n')
      .map((line) => line.replace(/<\/?[^>]+>/g, ''))
      .join('\n')
      .trim();
    if (!cueText) {
      dropped += 1;
      continue;
    }
    cues.push({ index: 0, start, end, text: cueText });
  }

  cues.sort((a, b) => a.start - b.start);
  return { cues: cues.map((cue, i) => ({ ...cue, index: i + 1 })), format, dropped };
}
