import { describe, expect, it } from 'vitest';
import { RECORDING_MIME_TYPES, recordingFile, supportedRecordingMimeType } from './recording';

describe('microphone recording helpers', () => {
  it('chooses the first supported Opus format and returns empty when none is supported', () => {
    expect(supportedRecordingMimeType((type) => type === 'audio/ogg;codecs=opus')).toBe('audio/ogg;codecs=opus');
    expect(supportedRecordingMimeType(() => false)).toBe('');
    expect(RECORDING_MIME_TYPES[0]).toBe('audio/webm;codecs=opus');
  });

  it('creates a typed, timestamped local recording file', () => {
    const file = recordingFile(new Blob(['captured']), 'audio/webm;codecs=opus', new Date(2026, 10, 9, 9, 5, 7));
    expect(file.name).toBe('voice-recording-20261109-090507.webm');
    expect(file.type).toBe('audio/webm;codecs=opus');
    expect(file.size).toBe(8);
    const video = recordingFile(new Blob(['video']), 'video/webm;codecs=vp8,opus', new Date(2026, 10, 9, 9, 5, 7), 'camera-recording');
    expect(video.name).toBe('camera-recording-20261109-090507.webm');
    expect(video.type).toBe('video/webm;codecs=vp8,opus');
  });
});
