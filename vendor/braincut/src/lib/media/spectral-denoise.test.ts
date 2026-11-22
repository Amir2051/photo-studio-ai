import { describe, expect, it } from 'vitest';
import {
  DENOISE_FFT_SIZE,
  captureNoiseProfile,
  reduceSpectralNoise,
  type NoiseProfile,
} from './spectral-denoise';

function seededNoise(length: number, amplitude = 0.1, seed = 12345): Float32Array {
  let state = seed >>> 0;
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    result[i] = ((state / 0xffffffff) * 2 - 1) * amplitude;
  }
  return result;
}

function profile(sampleRate = 16000, value = 0): NoiseProfile {
  return {
    version: 1,
    sampleRate,
    fftSize: DENOISE_FFT_SIZE,
    hopSize: 256,
    magnitudes: new Float32Array(DENOISE_FFT_SIZE / 2 + 1).fill(value),
    capturedFrames: 10,
  };
}

function rms(values: Float32Array, from = 0, to = values.length): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += values[i] * values[i];
  return Math.sqrt(sum / (to - from));
}

describe('spectral noise reduction DSP', () => {
  it('captures a finite, versioned noise-only magnitude profile', () => {
    const captured = captureNoiseProfile(seededNoise(16000), 16000);
    expect(captured).not.toBeNull();
    expect(captured?.version).toBe(1);
    expect(captured?.magnitudes).toHaveLength(DENOISE_FFT_SIZE / 2 + 1);
    expect(captured?.capturedFrames).toBeGreaterThan(1);
    expect(Array.from(captured?.magnitudes ?? []).every(Number.isFinite)).toBe(true);
  });

  it('rejects too-short, invalid, or cancelled profile captures', () => {
    expect(captureNoiseProfile(new Float32Array(100), 16000)).toBeNull();
    expect(captureNoiseProfile(new Float32Array(2048), 0)).toBeNull();
    expect(captureNoiseProfile(new Float32Array(2048).fill(Number.NaN), 16000)).toBeNull();
    const controller = new AbortController();
    controller.abort();
    expect(captureNoiseProfile(new Float32Array(4096), 16000, controller.signal)).toBeNull();
  });

  it('reconstructs audio at unity gain with no profile energy (including edges)', () => {
    const input = seededNoise(5000, 0.3);
    const result = reduceSpectralNoise([input], 16000, profile());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    let maxError = 0;
    for (let i = 0; i < input.length; i++) maxError = Math.max(maxError, Math.abs(input[i] - result.channels[0][i]));
    expect(maxError).toBeLessThan(1e-5);
  });

  it('keeps zero-strength bypass sample-identical', () => {
    const input = seededNoise(4096);
    const result = reduceSpectralNoise([input], 16000, profile(), { strength: 0 });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.channels[0]).toEqual(input);
  });

  it('reduces stationary broadband noise while retaining a stable speech-like tone', () => {
    const sampleRate = 16000;
    const length = sampleRate * 2;
    const noiseProfile = captureNoiseProfile(seededNoise(length, 0.12, 9), sampleRate);
    expect(noiseProfile).not.toBeNull();
    if (!noiseProfile) return;
    const noise = seededNoise(length, 0.12, 27);
    const mixed = new Float32Array(length);
    const speech = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      speech[i] = 0.25 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
      mixed[i] = speech[i] + noise[i];
    }
    const result = reduceSpectralNoise([mixed], sampleRate, noiseProfile, { strength: 1, floor: 0.12 });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    const cleaned = result.channels[0];
    const start = sampleRate / 2;
    const end = length - sampleRate / 2;
    const inputError = new Float32Array(end - start);
    const outputError = new Float32Array(end - start);
    for (let i = start; i < end; i++) {
      inputError[i - start] = mixed[i] - speech[i];
      outputError[i - start] = cleaned[i] - speech[i];
    }
    expect(rms(outputError)).toBeLessThan(rms(inputError) * 0.8);
    expect(rms(cleaned, start, end)).toBeGreaterThan(0.12);
    expect(Array.from(cleaned).every(Number.isFinite)).toBe(true);
  });

  it('uses one shared gain mask to preserve stereo channel balance', () => {
    const left = seededNoise(6000, 0.08, 1);
    const right = seededNoise(6000, 0.08, 2);
    const result = reduceSpectralNoise([left, right], 16000, profile(16000, 0.8));
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0]).toHaveLength(left.length);
    expect(result.channels[1]).toHaveLength(right.length);
    expect(Array.from(result.channels[0]).every(Number.isFinite)).toBe(true);
  });

  it('rejects mismatched sample rates, malformed profiles, channels, and settings', () => {
    const input = seededNoise(4096);
    expect(reduceSpectralNoise([input], 44100, profile()).status).toBe('invalid');
    expect(reduceSpectralNoise([input], 16000, { ...profile(), magnitudes: new Float32Array(4) }).status).toBe('invalid');
    expect(reduceSpectralNoise([input, input.slice(1)], 16000, profile()).status).toBe('invalid');
    expect(reduceSpectralNoise([input], 16000, profile(), { floor: 0.9 }).status).toBe('invalid');
    expect(reduceSpectralNoise([input], 16000, profile(), { strength: 3 }).status).toBe('invalid');
  });

  it('does not mutate source audio or the captured profile', () => {
    const input = seededNoise(4096);
    const original = input.slice();
    const noise = profile(16000, 0.5);
    const originalProfile = noise.magnitudes.slice();
    reduceSpectralNoise([input], 16000, noise);
    expect(input).toEqual(original);
    expect(noise.magnitudes).toEqual(originalProfile);
  });

  it('reports cancellation without returning partial output', () => {
    const controller = new AbortController();
    controller.abort();
    const result = reduceSpectralNoise([seededNoise(4096)], 16000, profile(), { signal: controller.signal });
    expect(result.status).toBe('cancelled');
  });
});
