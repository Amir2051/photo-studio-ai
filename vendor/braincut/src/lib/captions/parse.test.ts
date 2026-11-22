import { describe, expect, it } from 'vitest';
import { detectFormat, parseCaptions } from './parse';

const SRT = `1
00:00:00,000 --> 00:00:02,500
Opening caption

2
00:00:02,500 --> 00:00:05,000
The second cue
spans two lines

3
00:00:05,250 --> 00:00:07,000
Last one
`;

const VTT = `WEBVTT - synthetic captions

NOTE a note block with --> inside it must not be parsed as a cue
NOTE another line

00:00.000 --> 00:02.500
Opening caption

00:02.500 --> 00:05.000 position:28%
The second cue
spans two lines

00:05.250 --> 00:07.000 line:80%
Last one
`;

describe('detectFormat', () => {
  it('recognises VTT by its header', () => {
    expect(detectFormat('WEBVTT\n')).toBe('vtt');
    expect(detectFormat('WEBVTT - file\n')).toBe('vtt');
    expect(detectFormat('﻿WEBVTT\n')).toBe('vtt');
  });
  it('assumes SRT otherwise', () => {
    expect(detectFormat(SRT)).toBe('srt');
    expect(detectFormat('')).toBe('srt');
  });
});

describe('parseCaptions SRT', () => {
  it('parses cues with timestamps and text', () => {
    const { cues, format } = parseCaptions(SRT);
    expect(format).toBe('srt');
    expect(cues).toHaveLength(3);
    expect(cues[0]).toMatchObject({ start: 0, end: 2.5, text: 'Opening caption' });
    expect(cues[1].text).toBe('The second cue\nspans two lines');
    expect(cues[1].start).toBe(2.5);
  });
  it('accepts hours in the timestamp', () => {
    const { cues } = parseCaptions('1\n01:02:03,500 --> 01:02:04,000\nbig time\n');
    expect(cues[0].start).toBe(3723.5);
  });
  it('accepts MM:SS,mmm without an hours field', () => {
    const { cues } = parseCaptions('1\n02:03,500 --> 02:04,000\nshort\n');
    expect(cues[0].start).toBe(123.5);
  });
  it('handles CRLF line endings', () => {
    const crlf = SRT.replace(/\n/g, '\r\n');
    expect(parseCaptions(crlf).cues).toHaveLength(3);
  });
  it('reports malformed cues instead of crashing', () => {
    const { cues, dropped } = parseCaptions('1\nnot a timestamp\ntext\n\n2\n00:00:01,000 --> 00:00:02,000\ngood cue\n');
    expect(cues).toHaveLength(1);
    expect(dropped).toBe(1);
  });
  it('sorts cues by start time', () => {
    const shuffled = '1\n00:00:05,000 --> 00:00:06,000\nlate\n\n2\n00:00:01,000 --> 00:00:02,000\nearly\n';
    const { cues } = parseCaptions(shuffled);
    expect(cues.map((c) => c.text)).toEqual(['early', 'late']);
  });
});

describe('parseCaptions VTT', () => {
  it('parses cues and keeps settings after the arrow out of the text', () => {
    const { cues, format } = parseCaptions(VTT);
    expect(format).toBe('vtt');
    expect(cues).toHaveLength(3);
    expect(cues[0]).toMatchObject({ start: 0, end: 2.5, text: 'Opening caption' });
    expect(cues[1].text).toBe('The second cue\nspans two lines');
  });
  it('drops NOTE blocks even when they contain -->', () => {
    const { cues } = parseCaptions(VTT);
    expect(cues.some((c) => c.text.includes('NOTE'))).toBe(false);
  });
  it('accepts VTT cue identifiers', () => {
    const { cues } = parseCaptions('WEBVTT\n\nidentifier-1\n00:00.000 --> 00:01.000\ntext here\n');
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('text here');
  });
  it('strips inline tags like <i>', () => {
    const { cues } = parseCaptions('WEBVTT\n\n00:00.000 --> 00:01.000\n<i>italic</i> words\n');
    expect(cues[0].text).toBe('italic words');
  });
});

describe('parseCaptions general', () => {
  it('handles an empty file without crashing', () => {
    expect(parseCaptions('').cues).toEqual([]);
    expect(parseCaptions('garbage with no cues').cues).toEqual([]);
  });
  it('re-numbers indices after sorting', () => {
    const { cues } = parseCaptions('1\n00:00:05,000 --> 00:00:06,000\nlate\n\n2\n00:00:01,000 --> 00:00:02,000\nearly\n');
    expect(cues.map((c) => c.index)).toEqual([1, 2]);
  });
});
