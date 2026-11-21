import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  formatMetadataDuration,
  metadataRows,
  normalizeCodec,
  normalizeContainer,
  normalizeDimension,
  normalizeFps,
  normalizeMediaMetadata,
  type MediaMetadataInput,
} from './media-metadata';

describe('normalizeMediaMetadata', () => {
  it('normalizes a full, valid video record', () => {
    const m = normalizeMediaMetadata({
      name: '  vacation.mp4  ',
      kind: 'video',
      width: 1920,
      height: 1080,
      fps: 29.9699,
      duration: 65.4,
      hasVideo: true,
      hasAudio: true,
      channels: 2,
      sampleRate: 48000,
      videoCodec: 'avc',
      audioCodec: 'aac',
      container: ' MP4 ',
      mimeType: ' video/mp4 ',
      fileSize: 1 << 20,
      status: 'ready',
      statusReason: ' all good ',
    });

    expect(m.name).toBe('vacation.mp4');
    expect(m.kind).toBe('video');
    expect(m.width).toBe(1920);
    expect(m.height).toBe(1080);
    expect(m.dimensions).toBe('1920×1080');
    expect(m.fps).toBeCloseTo(29.97);
    expect(m.durationSeconds).toBeCloseTo(65.4);
    expect(m.duration).toBe('1:05.4');
    expect(m.hasVideo).toBe(true);
    expect(m.hasAudio).toBe(true);
    expect(m.channels).toBe(2);
    expect(m.sampleRate).toBe(48000);
    expect(m.videoCodec).toBe('H.264');
    expect(m.audioCodec).toBe('AAC');
    expect(m.container).toBe('mp4');
    expect(m.mimeType).toBe('video/mp4');
    expect(m.fileSizeBytes).toBe(1 << 20);
    expect(m.fileSize).toBe('1 MB');
    expect(m.status).toBe('ready');
    expect(m.statusReason).toBe('all good');
  });

  it('fills every unknown field with null and never invents values', () => {
    const m = normalizeMediaMetadata({ name: '  clip  ', width: 640 });
    expect(m.name).toBe('clip');
    expect(m.width).toBe(640);
    expect(m.kind).toBeNull();
    expect(m.height).toBeNull();
    expect(m.dimensions).toBeNull();
    expect(m.fps).toBeNull();
    expect(m.durationSeconds).toBeNull();
    expect(m.duration).toBeNull();
    expect(m.hasVideo).toBeNull();
    expect(m.hasAudio).toBeNull();
    expect(m.channels).toBeNull();
    expect(m.sampleRate).toBeNull();
    expect(m.videoCodec).toBeNull();
    expect(m.audioCodec).toBeNull();
    expect(m.container).toBeNull();
    expect(m.mimeType).toBeNull();
    expect(m.fileSizeBytes).toBeNull();
    expect(m.fileSize).toBeNull();
    expect(m.status).toBeNull();
    expect(m.statusReason).toBeNull();
    expect(m.meta).toEqual({ name: 'clip', width: 640 });
  });

  it('tolerates null and undefined input', () => {
    for (const input of [null, undefined] as MediaMetadataInput[]) {
      const m = normalizeMediaMetadata(input);
      expect(m.name).toBe('');
      expect(m.dimensions).toBeNull();
      expect(m.fps).toBeNull();
      expect(m.duration).toBeNull();
      expect(m.fileSize).toBeNull();
      expect(m.meta).toEqual({ name: '' });
      expect(metadataRows(input)).toEqual([]);
    }
  });

  it('tolerates explicit nulls on every field', () => {
    const m = normalizeMediaMetadata({
      name: null,
      kind: null,
      width: null,
      height: null,
      fps: null,
      duration: null,
      hasVideo: null,
      hasAudio: null,
      channels: null,
      sampleRate: null,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mimeType: null,
      fileSize: null,
      status: null,
      statusReason: null,
    });
    expect(m.name).toBe('');
    expect(m.kind).toBeNull();
    expect(m.dimensions).toBeNull();
    expect(m.hasVideo).toBeNull();
    expect(m.meta).toEqual({ name: '' });
  });

  it('never throws on malformed inputs', () => {
    const malformed: unknown[] = [0, 42, 'text', true, [], [1, 2, 3], { name: {} }, { width: '1920', fps: '30' }];
    for (const value of malformed) {
      expect(() => normalizeMediaMetadata(value as MediaMetadataInput)).not.toThrow();
      expect(() => metadataRows(value as MediaMetadataInput)).not.toThrow();
    }
    const fromArray = normalizeMediaMetadata([1, 2, 3] as unknown as MediaMetadataInput);
    expect(fromArray.name).toBe('');
    expect(fromArray.meta).toEqual({ name: '' });
    // strings are not coerced into numbers
    expect(normalizeMediaMetadata({ width: '1920', fps: '30' }).width).toBeNull();
  });

  it('rejects malformed numbers (NaN, Infinity, negative, zero dimensions)', () => {
    const m = normalizeMediaMetadata({
      width: NaN,
      height: Infinity,
      fps: Number.NaN,
      duration: Infinity,
      fileSize: -1,
      sampleRate: -48000,
      channels: -2,
    });
    expect(m.width).toBeNull();
    expect(m.height).toBeNull();
    expect(m.dimensions).toBeNull();
    expect(m.fps).toBeNull();
    expect(m.durationSeconds).toBeNull();
    expect(m.duration).toBeNull();
    expect(m.fileSizeBytes).toBeNull();
    expect(m.fileSize).toBeNull();
    expect(m.sampleRate).toBeNull();
    expect(m.channels).toBeNull();

    const zeroDims = normalizeMediaMetadata({ width: 0, height: 0 });
    expect(zeroDims.width).toBeNull();
    expect(zeroDims.height).toBeNull();
    expect(zeroDims.dimensions).toBeNull();

    const fractional = normalizeMediaMetadata({ width: 1920.5, height: 1080 });
    expect(fractional.width).toBeNull();
    expect(fractional.dimensions).toBeNull();

    // only one valid dimension means no dimensions string
    const oneDim = normalizeMediaMetadata({ width: 1920 });
    expect(oneDim.width).toBe(1920);
    expect(oneDim.dimensions).toBeNull();

    // zero is a valid channel count and a valid duration
    const zeroValid = normalizeMediaMetadata({ channels: 0, duration: 0 });
    expect(zeroValid.channels).toBe(0);
    expect(zeroValid.durationSeconds).toBe(0);
    expect(zeroValid.duration).toBe('0:00.0');
  });
});

describe('normalizeFps', () => {
  it('snaps measured rates and rejects non-positive or non-finite rates', () => {
    expect(normalizeFps(29.9699)).toBeCloseTo(29.97);
    expect(normalizeFps(23.98)).toBeCloseTo(23.976);
    expect(normalizeFps(25.01)).toBeCloseTo(25);
    expect(normalizeFps(15)).toBeCloseTo(15);
    expect(normalizeFps(33.3333)).toBeCloseTo(33.333);
    expect(normalizeFps(0)).toBeNull();
    expect(normalizeFps(-30)).toBeNull();
    expect(normalizeFps(Number.NaN)).toBeNull();
    expect(normalizeFps(Infinity)).toBeNull();
    expect(normalizeFps(null)).toBeNull();
    expect(normalizeFps(undefined)).toBeNull();
  });
});

describe('normalizeDimension / normalizeCodec / normalizeContainer', () => {
  it('accepts only positive integers for dimensions', () => {
    expect(normalizeDimension(1920)).toBe(1920);
    expect(normalizeDimension(1)).toBe(1);
    expect(normalizeDimension(0)).toBeNull();
    expect(normalizeDimension(-1)).toBeNull();
    expect(normalizeDimension(1.5)).toBeNull();
    expect(normalizeDimension(Number.NaN)).toBeNull();
    expect(normalizeDimension(null)).toBeNull();
  });

  it('maps codec tokens and drops unknown/empty ones', () => {
    expect(normalizeCodec('avc')).toBe('H.264');
    expect(normalizeCodec('pcm-s16')).toBe('PCM');
    // 'av01' is not in probe's codec table, so the token is preserved
    expect(normalizeCodec('av01')).toBe('av01');
    expect(normalizeCodec('av1')).toBe('AV1');
    expect(normalizeCodec('vp9')).toBe('VP9');
    expect(normalizeCodec('some-custom-codec')).toBe('some-custom-codec');
    expect(normalizeCodec('  ')).toBeNull();
    expect(normalizeCodec('')).toBeNull();
    expect(normalizeCodec(null)).toBeNull();
    expect(normalizeCodec(undefined)).toBeNull();
  });

  it('trims and lowercases containers without guessing them from mime', () => {
    expect(normalizeContainer(' MP4 ')).toBe('mp4');
    expect(normalizeContainer('QuickTime')).toBe('quicktime');
    expect(normalizeContainer('  ')).toBeNull();
    expect(normalizeContainer(null)).toBeNull();

    const m = normalizeMediaMetadata({ mimeType: 'video/mp4' });
    expect(m.mimeType).toBe('video/mp4');
    expect(m.container).toBeNull();
  });
});

describe('image and audio kinds', () => {
  it('never reports a duration for images', () => {
    const m = normalizeMediaMetadata({
      name: 'photo.png',
      kind: 'image',
      width: 800,
      height: 600,
      duration: 12.5,
      fps: 30,
    });
    expect(m.kind).toBe('image');
    expect(m.dimensions).toBe('800×600');
    expect(m.durationSeconds).toBeNull();
    expect(m.duration).toBeNull();
    expect(m.meta).not.toHaveProperty('duration');
    expect(formatMetadataDuration(12.5, 'image')).toBeNull();
  });

  it('keeps durations and audio details for audio files', () => {
    const m = normalizeMediaMetadata({
      name: 'podcast.m4a',
      kind: 'audio',
      duration: 3661.4,
      hasAudio: true,
      audioCodec: 'pcm-s16',
      channels: 1,
      sampleRate: 44100,
      width: 0,
      height: 0,
    });
    expect(m.kind).toBe('audio');
    expect(m.dimensions).toBeNull();
    expect(m.durationSeconds).toBeCloseTo(3661.4);
    expect(m.duration).toBe('1:01:01.4');
    expect(m.hasAudio).toBe(true);
    expect(m.hasVideo).toBeNull();
    expect(m.audioCodec).toBe('PCM');
    expect(m.channels).toBe(1);
    expect(m.sampleRate).toBe(44100);
  });
});

describe('formatFileSize', () => {
  it('mirrors binary formatBytes boundaries', () => {
    expect(formatFileSize(0)).toBe('0 KB');
    expect(formatFileSize(1023)).toBe('1 KB');
    expect(formatFileSize(1048575)).toBe('1024 KB');
    expect(formatFileSize(1 << 20)).toBe('1 MB');
    expect(formatFileSize(1 << 30)).toBe('1.0 GB');
  });

  it('returns null for unknown, negative or non-finite sizes', () => {
    expect(formatFileSize(null)).toBeNull();
    expect(formatFileSize(undefined)).toBeNull();
    expect(formatFileSize(-1)).toBeNull();
    expect(formatFileSize(Number.NaN)).toBeNull();
    expect(formatFileSize(Infinity)).toBeNull();
  });
});

describe('formatMetadataDuration', () => {
  it('formats m:ss.s and h:mm:ss.s and rejects unknown values', () => {
    expect(formatMetadataDuration(0)).toBe('0:00.0');
    expect(formatMetadataDuration(65.4)).toBe('1:05.4');
    expect(formatMetadataDuration(3661.4)).toBe('1:01:01.4');
    expect(formatMetadataDuration(null)).toBeNull();
    expect(formatMetadataDuration(undefined)).toBeNull();
    expect(formatMetadataDuration(-1)).toBeNull();
    expect(formatMetadataDuration(Number.NaN)).toBeNull();
    expect(formatMetadataDuration(Infinity)).toBeNull();
  });
});

describe('status propagation', () => {
  it('accepts only known statuses', () => {
    for (const status of ['ready', 'unsupported', 'missing', 'converting'] as const) {
      expect(normalizeMediaMetadata({ status }).status).toBe(status);
    }
    for (const status of ['READY', 'unknown', '  ', '', 1, null]) {
      expect(normalizeMediaMetadata({ status }).status).toBeNull();
    }
  });

  it('keeps a non-empty status reason as a trimmed string', () => {
    expect(normalizeMediaMetadata({ statusReason: '  needs conversion  ' }).statusReason).toBe(
      'needs conversion',
    );
    expect(normalizeMediaMetadata({ statusReason: '  ' }).statusReason).toBeNull();
    expect(normalizeMediaMetadata({ statusReason: 42 }).statusReason).toBeNull();
  });
});

describe('metadataRows', () => {
  it('emits ordered, non-empty rows and skips nulls', () => {
    const rows = metadataRows({
      name: 'clip.mp4',
      width: 1920,
      height: 1080,
      fps: 29.97,
      duration: 65.4,
      videoCodec: 'avc',
      audioCodec: 'aac',
      container: 'mp4',
      channels: 2,
      sampleRate: 48000,
      fileSize: 1 << 20,
      statusReason: 'needs conversion',
    });
    expect(rows).toEqual([
      { label: 'Dimensions', value: '1920×1080' },
      { label: 'Frame rate', value: '29.97' },
      { label: 'Duration', value: '1:05.4' },
      { label: 'Video codec', value: 'H.264' },
      { label: 'Audio codec', value: 'AAC' },
      { label: 'Container', value: 'mp4' },
      { label: 'Channels', value: '2' },
      { label: 'Sample rate', value: '48000' },
      { label: 'File size', value: '1 MB' },
      { label: 'Status reason', value: 'needs conversion' },
    ]);
    for (const row of rows) expect(row.value.length).toBeGreaterThan(0);
  });

  it('does not invent rows for sparse metadata', () => {
    expect(metadataRows({ name: 'mystery' })).toEqual([]);
    expect(metadataRows({ name: 'zero', fileSize: 0 })).toEqual([
      { label: 'File size', value: '0 KB' },
    ]);
  });

  it('projects only known, non-null primitives into meta', () => {
    const m = normalizeMediaMetadata({
      name: 'clip.mp4',
      kind: 'video',
      width: 1920,
      height: 1080,
      fps: 29.97,
      duration: 65.4,
      hasVideo: true,
      hasAudio: true,
      channels: 2,
      sampleRate: 48000,
      videoCodec: 'avc',
      audioCodec: 'aac',
      container: 'mp4',
      mimeType: 'video/mp4',
      fileSize: 1 << 20,
      status: 'ready',
      statusReason: 'ok',
      extra: { nested: true },
    });
    expect(Object.keys(m.meta).sort()).toEqual(
      [
        'name',
        'kind',
        'width',
        'height',
        'fps',
        'duration',
        'hasVideo',
        'hasAudio',
        'channels',
        'sampleRate',
        'videoCodec',
        'audioCodec',
        'container',
        'mimeType',
        'fileSize',
        'status',
        'statusReason',
      ].sort(),
    );
    expect(m.meta).not.toHaveProperty('dimensions');
    expect(m.meta).not.toHaveProperty('fileSizeBytes');
    expect(m.meta).not.toHaveProperty('extra');
    expect(m.meta.duration).toBeCloseTo(65.4);
    expect(m.meta.fileSize).toBe(1 << 20);
    for (const value of Object.values(m.meta)) {
      expect(value).not.toBeUndefined();
      expect(Number.isNaN(value)).toBe(false);
    }
  });
});
