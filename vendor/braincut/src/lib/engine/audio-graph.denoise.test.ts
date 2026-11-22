import { describe, expect, it } from 'vitest';
import type { Clip, ClipNoiseReduction } from '#lib/project/types.ts';
import { clipAudio, type AudioPiece } from './audio-graph';
import type { MediaReader } from './media-reader';
import { captureNoiseProfile } from '#lib/media/spectral-denoise.ts';

function seededNoise(length: number, amplitude: number, seed: number): Float32Array {
  let state = seed >>> 0;
  const values = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    values[i] = ((state / 0xffffffff) * 2 - 1) * amplitude;
  }
  return values;
}

function fakeBuffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
  const data = channels.map((channel) => channel.slice());
  return {
    numberOfChannels: data.length,
    length: data[0].length,
    sampleRate,
    duration: data[0].length / sampleRate,
    getChannelData: (channel: number) => data[channel],
    copyToChannel: (source: Float32Array, channel: number, start = 0) => data[channel].set(source, start),
  } as unknown as AudioBuffer;
}

function fakeContext(): BaseAudioContext {
  return {
    createBuffer: (channels: number, length: number, sampleRate: number) =>
      fakeBuffer(Array.from({ length: channels }, () => new Float32Array(length)), sampleRate),
  } as unknown as BaseAudioContext;
}

function clip(settings: ClipNoiseReduction): Clip {
  return {
    id: 'clip-1', kind: 'audio', name: 'Synthetic interview', mediaId: 'media-1',
    start: 0, duration: 1, in: 0, speed: 1, reverse: false, linkId: null,
    enabled: true, label: 'none', effects: [], noiseReduction: settings,
  };
}

describe('clip-level spectral denoising adapter', () => {
  it('processes the whole source clip once and reuses identical output across playback/export calls', async () => {
    const sampleRate = 16000;
    const length = sampleRate;
    const profileSamples = seededNoise(length, 0.12, 123);
    const profile = captureNoiseProfile(profileSamples, sampleRate);
    expect(profile).not.toBeNull();
    if (!profile) return;

    const inputNoise = seededNoise(length, 0.12, 456);
    const mixed = new Float32Array(length);
    for (let i = 0; i < length; i++) mixed[i] = inputNoise[i] + 0.2 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    const sourceBuffer = fakeBuffer([mixed], sampleRate);
    let reads = 0;
    const reader = {
      async *audio(start: number, end: number): AsyncGenerator<AudioPiece> {
        reads++;
        expect(start).toBe(0);
        expect(end).toBe(1);
        yield { buffer: sourceBuffer, timestamp: 0 };
      },
    } as unknown as MediaReader;

    const settings: ClipNoiseReduction = {
      enabled: true,
      profile: {
        version: 1, sampleRate, fftSize: 1024, hopSize: 256,
        magnitudes: Array.from(profile.magnitudes), capturedFrames: profile.capturedFrames,
        capturedAt: 1, sourceStart: 0, sourceEnd: 1,
      },
      strength: 1, floor: 0.12, threshold: 1.15, frequencySmoothing: 2,
    };
    const original = mixed.slice();
    const first: AudioPiece[] = [];
    for await (const piece of clipAudio(reader, clip(settings), fakeContext(), { start: 0.5, end: 0.75 }, undefined, settings)) first.push(piece);
    const second: AudioPiece[] = [];
    for await (const piece of clipAudio(reader, clip(settings), fakeContext(), { start: 0.1, end: 0.2 }, undefined, settings)) second.push(piece);

    expect(first).toHaveLength(1);
    expect(first[0].timestamp).toBe(0);
    expect(first[0].buffer.length).toBe(length);
    expect(second[0].buffer.getChannelData(0)).toEqual(first[0].buffer.getChannelData(0));
    expect(reads).toBe(1);
    expect(mixed).toEqual(original);
    expect(first[0].buffer.getChannelData(0)).not.toEqual(mixed);
  });

  it('processes only the requested overlapped window for long recordings', async () => {
    const sampleRate = 16000;
    const profile = captureNoiseProfile(seededNoise(sampleRate, 0.1, 777), sampleRate);
    expect(profile).not.toBeNull();
    if (!profile) return;
    const settings: ClipNoiseReduction = {
      enabled: true,
      profile: {
        version: 1, sampleRate, fftSize: 1024, hopSize: 256,
        magnitudes: Array.from(profile.magnitudes), capturedFrames: profile.capturedFrames,
        capturedAt: 1, sourceStart: 0, sourceEnd: 1,
      },
      strength: 1, floor: 0.12, threshold: 1.15, frequencySmoothing: 2,
    };
    const longClip = { ...clip(settings), duration: 360 };
    let requested: [number, number] | null = null;
    const reader = {
      async *audio(start: number, end: number): AsyncGenerator<AudioPiece> {
        requested = [start, end];
        const count = Math.round((end - start) * sampleRate);
        yield { buffer: fakeBuffer([seededNoise(count, 0.1, 991)], sampleRate), timestamp: start };
      },
    } as unknown as MediaReader;
    const pieces: AudioPiece[] = [];
    for await (const piece of clipAudio(reader, longClip, fakeContext(), { start: 300.2, end: 301 }, undefined, settings)) pieces.push(piece);
    expect(requested).toEqual([299.5, 305.5]);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].timestamp).toBe(300);
    expect(pieces[0].buffer.duration).toBe(5);
  });

  it('keeps adjacent processed windows continuous at the 5-second seam', async () => {
    const sampleRate = 16000;
    const profile = captureNoiseProfile(seededNoise(sampleRate, 0.08, 312), sampleRate);
    expect(profile).not.toBeNull();
    if (!profile) return;
    const settings: ClipNoiseReduction = {
      enabled: true,
      profile: {
        version: 1, sampleRate, fftSize: 1024, hopSize: 256,
        magnitudes: Array.from(profile.magnitudes), capturedFrames: profile.capturedFrames,
        capturedAt: 1, sourceStart: 0, sourceEnd: 1,
      },
      strength: 0.9, floor: 0.16, threshold: 1.1, frequencySmoothing: 2,
    };
    const noise = seededNoise(sampleRate * 40, 0.08, 313);
    const input = Float32Array.from(noise, (value, index) =>
      value + 0.16 * Math.sin((2 * Math.PI * 440 * index) / sampleRate),
    );
    const longClip = { ...clip(settings), duration: 40 };
    const reader = {
      async *audio(start: number, end: number): AsyncGenerator<AudioPiece> {
        const from = Math.round(start * sampleRate);
        const to = Math.round(end * sampleRate);
        yield { buffer: fakeBuffer([input.slice(from, to)], sampleRate), timestamp: start };
      },
    } as unknown as MediaReader;
    const pieces: AudioPiece[] = [];
    for await (const piece of clipAudio(reader, longClip, fakeContext(), { start: 0, end: 40 }, undefined, settings)) pieces.push(piece);
    expect(pieces).toHaveLength(8);
    expect(pieces[0].buffer.duration).toBe(5);
    expect(pieces[1].timestamp).toBe(5);
    const left = pieces[0].buffer.getChannelData(0);
    const right = pieces[1].buffer.getChannelData(0);
    const seamJump = Math.abs(right[0] - left[left.length - 1]);
    expect(seamJump).toBeLessThan(0.05);

    const reversePieces: AudioPiece[] = [];
    for await (const piece of clipAudio(reader, { ...longClip, reverse: true }, fakeContext(), { start: 0, end: 40 }, undefined, settings)) reversePieces.push(piece);
    expect(reversePieces.map((piece) => piece.timestamp)).toEqual([35, 30, 25, 20, 15, 10, 5, 0]);
    for (let index = 0; index < pieces.length; index++) {
      expect(reversePieces[index].buffer.getChannelData(0))
        .toEqual(Float32Array.from(pieces[pieces.length - 1 - index].buffer.getChannelData(0)).reverse());
    }
  });
});
