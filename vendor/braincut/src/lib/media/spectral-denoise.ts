/**
 * Deterministic, local spectral noise-reduction primitives.
 *
 * This module is deliberately independent of Web Audio and the DOM so the
 * same DSP can be exercised in tests and reused by playback/export adapters.
 * Noise profiles are magnitude spectra captured from noise-only material.
 */
export const DENOISE_FFT_SIZE = 1024;
export const DENOISE_HOP_SIZE = 256;
const EPSILON = 1e-12;
const CHECK_EVERY = 32;

export interface NoiseProfile {
  readonly version: 1;
  readonly sampleRate: number;
  readonly fftSize: number;
  readonly hopSize: number;
  readonly magnitudes: Float32Array;
  readonly capturedFrames: number;
}

export interface DenoiseOptions {
  /** 0 = bypass; 1 = normal; 2 = aggressive. */
  readonly strength?: number;
  /** Minimum retained spectral amplitude, 0.03–0.5. */
  readonly floor?: number;
  /** Noise estimate multiplier; higher values preserve more quiet detail. */
  readonly threshold?: number;
  /** Adjacent-bin smoothing radius, 0–4. */
  readonly frequencySmoothing?: number;
  readonly signal?: AbortSignal;
}

export type DenoiseResult =
  | { readonly status: 'ok'; readonly channels: Float32Array[]; readonly profile: NoiseProfile }
  | { readonly status: 'invalid' | 'cancelled'; readonly reason: string };

function validRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 8000 && rate <= 384000;
}

function isFiniteSamples(samples: Float32Array): boolean {
  for (let i = 0; i < samples.length; i++) if (!Number.isFinite(samples[i])) return false;
  return true;
}

function fft(real: Float64Array, imag: Float64Array, inverse = false): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / size;
    const stepR = Math.cos(angle);
    const stepI = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let wr = 1;
      let wi = 0;
      const half = size >> 1;
      for (let j = 0; j < half; j++) {
        const even = start + j;
        const odd = even + half;
        const tr = wr * real[odd] - wi * imag[odd];
        const ti = wr * imag[odd] + wi * real[odd];
        real[odd] = real[even] - tr;
        imag[odd] = imag[even] - ti;
        real[even] += tr;
        imag[even] += ti;
        const nextWr = wr * stepR - wi * stepI;
        wi = wr * stepI + wi * stepR;
        wr = nextWr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imag[i] /= n; }
}

function windowAt(index: number, size: number): number {
  // Square-root Hann; analysis and synthesis windows multiply to Hann.
  return Math.sqrt(Math.max(0, 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / size)));
}

function frameStarts(length: number, size: number, hop: number): number[] {
  const starts: number[] = [];
  for (let start = -size / 2; start < length; start += hop) starts.push(start);
  return starts;
}

function transformFrame(
  samples: Float32Array,
  start: number,
  size: number,
): { real: Float64Array; imag: Float64Array } {
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    const sourceIndex = start + i;
    real[i] = sourceIndex >= 0 && sourceIndex < samples.length
      ? samples[sourceIndex] * windowAt(i, size)
      : 0;
  }
  fft(real, imag);
  return { real, imag };
}

/** Capture an averaged magnitude profile from a noise-only mono recording. */
export function captureNoiseProfile(
  noise: Float32Array,
  sampleRate: number,
  signal?: AbortSignal,
): NoiseProfile | null {
  if (!validRate(sampleRate) || noise.length < DENOISE_FFT_SIZE || !isFiniteSamples(noise) || signal?.aborted) return null;
  const starts = frameStarts(noise.length, DENOISE_FFT_SIZE, DENOISE_HOP_SIZE);
  const sums = new Float64Array(DENOISE_FFT_SIZE / 2 + 1);
  let frames = 0;
  for (let frame = 0; frame < starts.length; frame++) {
    if (frame % CHECK_EVERY === 0 && signal?.aborted) return null;
    const { real, imag } = transformFrame(noise, starts[frame], DENOISE_FFT_SIZE);
    for (let bin = 0; bin < sums.length; bin++) sums[bin] += Math.hypot(real[bin], imag[bin]);
    frames++;
  }
  if (!frames) return null;
  const magnitudes = new Float32Array(sums.length);
  for (let bin = 0; bin < sums.length; bin++) magnitudes[bin] = sums[bin] / frames;
  return { version: 1, sampleRate, fftSize: DENOISE_FFT_SIZE, hopSize: DENOISE_HOP_SIZE, magnitudes, capturedFrames: frames };
}

function validateProfile(profile: NoiseProfile, sampleRate: number): boolean {
  return profile?.version === 1 &&
    profile.sampleRate === sampleRate &&
    profile.fftSize === DENOISE_FFT_SIZE &&
    profile.hopSize === DENOISE_HOP_SIZE &&
    profile.magnitudes instanceof Float32Array &&
    profile.magnitudes.length === DENOISE_FFT_SIZE / 2 + 1 &&
    profile.capturedFrames > 0 &&
    isFiniteSamples(profile.magnitudes) &&
    profile.magnitudes.every((value) => value >= 0);
}

function smoothedNoise(profile: Float32Array, bin: number, radius: number): number {
  if (radius === 0) return profile[bin];
  let sum = 0;
  let weight = 0;
  for (let offset = -radius; offset <= radius; offset++) {
    const index = Math.max(0, Math.min(profile.length - 1, bin + offset));
    const w = radius + 1 - Math.abs(offset);
    sum += profile[index] * w;
    weight += w;
  }
  return sum / weight;
}

/**
 * Process one or more aligned channels. A shared gain mask is derived from
 * their mean magnitude to keep stereo image stable. Whole-buffer processing
 * is the reference implementation; streaming/export adapters must preserve
 * overlap and state across chunk boundaries rather than invoking per chunk.
 */
export function reduceSpectralNoise(
  channels: readonly Float32Array[],
  sampleRate: number,
  profile: NoiseProfile,
  options: DenoiseOptions = {},
): DenoiseResult {
  const strength = options.strength ?? 1;
  const floor = options.floor ?? 0.12;
  const threshold = options.threshold ?? 1.15;
  const smoothing = options.frequencySmoothing ?? 2;
  if (!validRate(sampleRate) || channels.length < 1 || channels.length > 2 ||
      channels.some((channel) => !(channel instanceof Float32Array) || channel.length === 0 || !isFiniteSamples(channel)) ||
      channels.some((channel) => channel.length !== channels[0].length) ||
      !validateProfile(profile, sampleRate) ||
      !Number.isFinite(strength) || strength < 0 || strength > 2 ||
      !Number.isFinite(floor) || floor < 0.03 || floor > 0.5 ||
      !Number.isFinite(threshold) || threshold < 0.5 || threshold > 3 ||
      !Number.isInteger(smoothing) || smoothing < 0 || smoothing > 4) {
    return { status: 'invalid', reason: 'Audio, noise profile, sample rate, or denoising settings are invalid.' };
  }
  if (options.signal?.aborted) return { status: 'cancelled', reason: 'Noise reduction was cancelled.' };
  if (channels[0].length > sampleRate * 60 * 5) {
    return { status: 'invalid', reason: 'Audio exceeds the 5-minute in-memory processing limit.' };
  }
  if (strength === 0) return { status: 'ok', channels: channels.map((channel) => channel.slice()), profile };

  const size = DENOISE_FFT_SIZE;
  const bins = size / 2 + 1;
  const hop = DENOISE_HOP_SIZE;
  const starts = frameStarts(channels[0].length, size, hop);
  const output = channels.map(() => new Float32Array(channels[0].length));
  const weights = new Float64Array(channels[0].length);
  const previousGain = new Float32Array(bins).fill(1);
  const noise = profile.magnitudes;

  for (let frame = 0; frame < starts.length; frame++) {
    if (frame % CHECK_EVERY === 0 && options.signal?.aborted) {
      return { status: 'cancelled', reason: 'Noise reduction was cancelled.' };
    }
    const spectra = channels.map((channel) => transformFrame(channel, starts[frame], size));
    const gain = new Float32Array(bins);
    for (let bin = 0; bin < bins; bin++) {
      let magnitude = 0;
      for (const spectrum of spectra) magnitude += Math.hypot(spectrum.real[bin], spectrum.imag[bin]);
      magnitude /= spectra.length;
      const estimatedNoise = smoothedNoise(noise, bin, smoothing) * threshold;
      const rawGain = magnitude <= EPSILON ? 1 : Math.max(floor, 1 - (strength * estimatedNoise) / magnitude);
      // Light temporal smoothing suppresses musical-noise flutter.
      gain[bin] = previousGain[bin] * 0.35 + rawGain * 0.65;
    }
    // Mirror the positive-frequency gain to the negative-frequency bins.
    for (let bin = 0; bin < bins; bin++) {
      previousGain[bin] = gain[bin];
      for (const spectrum of spectra) {
        const g = gain[bin];
        spectrum.real[bin] *= g;
        spectrum.imag[bin] *= g;
        if (bin > 0 && bin < size / 2) {
          spectrum.real[size - bin] *= g;
          spectrum.imag[size - bin] *= g;
        }
      }
    }
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
      const spectrum = spectra[channelIndex];
      fft(spectrum.real, spectrum.imag, true);
      for (let i = 0; i < size; i++) {
        const target = starts[frame] + i;
        if (target < 0 || target >= channels[channelIndex].length) continue;
        const window = windowAt(i, size);
        output[channelIndex][target] += spectrum.real[i] * window;
        if (channelIndex === 0) weights[target] += window * window;
      }
    }
  }
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] > EPSILON) for (const channel of output) channel[i] /= weights[i];
  }
  if (output.some((channel) => !isFiniteSamples(channel))) {
    return { status: 'invalid', reason: 'Noise reduction produced non-finite audio; original audio was not changed.' };
  }
  return { status: 'ok', channels: output, profile };
}
