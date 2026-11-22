import type { Clip, ClipNoiseReduction, EffectInstance, Track, Transition } from '#lib/project/types.ts';
import { paramsAt, valueAt } from '#lib/project/keyframes.ts';
import { createAudioEffect } from '#lib/engine/effects/audio.ts';
import { transitionCurve, transitionDef } from '#lib/engine/transitions/registry.ts';
import type { MediaReader } from './media-reader';
import { clipSourceRange } from './clip-time';
import { reduceSpectralNoise, type NoiseProfile } from '#lib/media/spectral-denoise.ts';
import {
  automationTimes,
  catchUp,
  chunkPlacement,
  dbToGain,
  transitionGainAt,
  type Curve,
} from './audio-math';

// the pieces of the audio graph both the live engine and the offline
// renderer build, so an export sounds exactly like the preview

function isAudioTransition(tr: Transition): boolean {
  const def = transitionDef(tr.type);
  return def ? def.kind === 'audio' : false;
}

function audioCurve(type: string, progress: number): Curve {
  return transitionCurve(type, progress);
}

function effectOf(clip: Clip, type: string): EffectInstance | undefined {
  return clip.effects.find((e) => e.type === type);
}

export function volumeAt(clip: Clip, clipTime: number): number {
  const effect = effectOf(clip, 'volume');
  if (!effect || !effect.enabled) return 1;
  const level = valueAt(effect, 'level', clipTime, 0);
  return dbToGain(typeof level === 'number' ? level : 0);
}

export function panAt(clip: Clip, clipTime: number): number {
  const effect = effectOf(clip, 'pan');
  if (!effect || !effect.enabled) return 0;
  const pan = valueAt(effect, 'pan', clipTime, 0);
  return Math.max(-1, Math.min(1, (typeof pan === 'number' ? pan : 0) / 100));
}

function isAnimated(effect: EffectInstance | undefined, key: string): boolean {
  return !!effect && effect.enabled && (effect.keyframes[key]?.length ?? 0) > 1;
}

type AudioEffectRuntime = NonNullable<ReturnType<typeof createAudioEffect>>;

export interface ClipChain {
  input: AudioNode;
  clipGain: GainNode;
  panner: StereoPannerNode;
  transitionGain: GainNode;
  effects: Array<{ effect: EffectInstance; runtime: AudioEffectRuntime }>;
  destroy(): void;
}

// source → clip gain → pan → effects → transition gain → destination
export function buildClipChain(
  ctx: BaseAudioContext,
  clip: Clip,
  destination: AudioNode,
): ClipChain {
  const clipGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const transitionGain = ctx.createGain();
  clipGain.connect(panner);
  let tail: AudioNode = panner;
  const effects: ClipChain['effects'] = [];
  for (const effect of clip.effects) {
    if (!effect.enabled || effect.fixed) continue;
    let runtime: AudioEffectRuntime | null = null;
    try {
      runtime = createAudioEffect(ctx, effect.type);
    } catch (e) {
      console.warn(`[braincut] audio effect ${effect.type} failed to build:`, e);
    }
    if (!runtime) continue;
    tail.connect(runtime.input);
    tail = runtime.output;
    effects.push({ effect, runtime });
  }
  tail.connect(transitionGain);
  transitionGain.connect(destination);
  return {
    input: clipGain,
    clipGain,
    panner,
    transitionGain,
    effects,
    destroy: () => {
      for (const e of effects) {
        try {
          e.runtime.destroy();
        } catch {}
      }
      clipGain.disconnect();
      panner.disconnect();
      transitionGain.disconnect();
    },
  };
}

export interface ClockMap {
  // sequence seconds → context seconds
  seqToCtx: (seq: number) => number;
  // playback rate of the transport, 1 is normal
  rate: number;
}

// how often automated values are re-sampled along a piece, in sequence seconds
const AUTOMATION_STEP = 0.05;

function scheduleParam(param: AudioParam, values: number[], ctxTimes: number[]): void {
  param.cancelScheduledValues(ctxTimes[0]);
  param.setValueAtTime(values[0], ctxTimes[0]);
  for (let i = 1; i < values.length; i++) param.linearRampToValueAtTime(values[i], ctxTimes[i]);
}

// puts one decoded piece on the graph. returns the node so the caller can
// stop it, or null when nothing of the piece falls inside the clip
export function scheduleBuffer(
  ctx: BaseAudioContext,
  chain: ClipChain,
  clip: Clip,
  track: Track,
  buffer: AudioBuffer,
  chunkStart: number,
  clock: ClockMap,
): AudioBufferSourceNode | null {
  const placement = chunkPlacement(clip, chunkStart, buffer.duration);
  if (!placement) return null;
  const rate = Math.abs(clock.rate);
  const playbackRate = clip.speed * rate;
  if (playbackRate <= 0) return null;
  const ctxStart = clock.seqToCtx(placement.seqStart);
  const timing = catchUp(placement, ctxStart, ctx.currentTime, playbackRate);
  if (!timing) return null;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(chain.input);
  source.start(timing.when, timing.offset, timing.duration);

  const seqFrom = placement.seqStart + (timing.when - ctxStart) * rate;
  const seqDuration = (timing.duration / playbackRate) * rate;
  const volume = effectOf(clip, 'volume');
  const pan = effectOf(clip, 'pan');
  const hasTransition = track.transitions.some(
    (tr) =>
      isAudioTransition(tr) &&
      (tr.leftClipId === clip.id || tr.rightClipId === clip.id) &&
      tr.start < seqFrom + seqDuration &&
      tr.start + tr.duration > seqFrom,
  );
  const animated = isAnimated(volume, 'level') || isAnimated(pan, 'pan') || hasTransition;
  const times = animated ? automationTimes(seqFrom, seqDuration, AUTOMATION_STEP) : [seqFrom];
  times.push(seqFrom + seqDuration);
  const ctxTimes = times.map((t) => Math.max(ctx.currentTime, clock.seqToCtx(t)));

  scheduleParam(
    chain.clipGain.gain,
    times.map((t) => volumeAt(clip, t - clip.start)),
    ctxTimes,
  );
  scheduleParam(
    chain.panner.pan,
    times.map((t) => panAt(clip, t - clip.start)),
    ctxTimes,
  );
  scheduleParam(
    chain.transitionGain.gain,
    times.map((t) => (hasTransition ? transitionGainAt(track, clip, t, audioCurve) : 1)),
    ctxTimes,
  );
  // effect params are sampled once per piece, at the moment it starts
  for (const e of chain.effects) {
    try {
      e.runtime.update(paramsAt(e.effect, seqFrom - clip.start), ctxTimes[0]);
    } catch {}
  }
  return source;
}

export interface AudioPiece {
  buffer: AudioBuffer;
  // source seconds of the first sample before any reversal
  timestamp: number;
}

// joins consecutive decoded buffers into one, gaps become silence
export function mergePieces(ctx: BaseAudioContext, pieces: AudioPiece[]): AudioPiece | null {
  if (pieces.length === 0) return null;
  if (pieces.length === 1) return pieces[0];
  const first = pieces[0].buffer;
  const rate = first.sampleRate;
  const channels = first.numberOfChannels;
  const start = pieces[0].timestamp;
  let end = start;
  for (const p of pieces) end = Math.max(end, p.timestamp + p.buffer.duration);
  const length = Math.max(1, Math.round((end - start) * rate));
  const out = ctx.createBuffer(channels, length, rate);
  for (const p of pieces) {
    const at = Math.round((p.timestamp - start) * rate);
    const room = length - at;
    if (room <= 0) continue;
    for (let c = 0; c < channels; c++) {
      const src = p.buffer.getChannelData(Math.min(c, p.buffer.numberOfChannels - 1));
      out.copyToChannel(src.length > room ? src.subarray(0, room) : src, c, at);
    }
  }
  return { buffer: out, timestamp: start };
}

export function trimPiece(
  ctx: BaseAudioContext,
  piece: AudioPiece,
  from: number,
  to: number,
): AudioPiece | null {
  const rate = piece.buffer.sampleRate;
  const startFrame = Math.max(0, Math.round((from - piece.timestamp) * rate));
  const endFrame = Math.min(piece.buffer.length, Math.round((to - piece.timestamp) * rate));
  if (endFrame - startFrame <= 0) return null;
  if (startFrame === 0 && endFrame === piece.buffer.length) return piece;
  const out = ctx.createBuffer(piece.buffer.numberOfChannels, endFrame - startFrame, rate);
  for (let c = 0; c < out.numberOfChannels; c++) {
    out.copyToChannel(piece.buffer.getChannelData(c).subarray(startFrame, endFrame), c, 0);
  }
  return { buffer: out, timestamp: piece.timestamp + startFrame / rate };
}

export function reverseBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = Float32Array.from(buffer.getChannelData(c));
    data.reverse();
    out.copyToChannel(data, c, 0);
  }
  return out;
}


// Process fixed source-time windows with overlap context. Playback and export
// request the same window keys, so they reuse identical processed samples while
// long recordings remain bounded in memory.
const denoisedClipCache = new WeakMap<MediaReader, Map<string, Promise<AudioPiece | null>>>();
const DENOISE_CHUNK_SECONDS = 5;
const DENOISE_CONTEXT_SECONDS = 0.5;
const DENOISE_CACHE_ENTRIES = 12;

async function denoisedClipPiece(
  reader: MediaReader,
  clip: Clip,
  ctx: BaseAudioContext,
  settings: ClipNoiseReduction,
  chunkStart: number,
  chunkEnd: number,
): Promise<AudioPiece | null> {
  const key = JSON.stringify({
    id: clip.id, in: clip.in, duration: clip.duration, speed: clip.speed,
    reverse: clip.reverse, chunkStart, chunkEnd, settings,
  });
  let entries = denoisedClipCache.get(reader);
  if (!entries) {
    entries = new Map();
    denoisedClipCache.set(reader, entries);
  }
  const cached = entries.get(key);
  if (cached) {
    entries.delete(key);
    entries.set(key, cached);
    return cached;
  }

  const job = (async (): Promise<AudioPiece | null> => {
    const fullRange = clipSourceRange(clip);
    const contextStart = Math.max(fullRange.start, chunkStart - DENOISE_CONTEXT_SECONDS);
    const contextEnd = Math.min(fullRange.end, chunkEnd + DENOISE_CONTEXT_SECONDS);
    const decoded: AudioPiece[] = [];
    for await (const piece of reader.audio(contextStart, contextEnd)) decoded.push(piece);
    const merged = mergePieces(ctx, decoded);
    if (!merged) throw new Error('No source audio could be decoded for spectral noise reduction.');
    const context = trimPiece(ctx, merged, contextStart, contextEnd);
    if (!context) throw new Error('The selected source range contains no decodable audio.');
    if (context.buffer.numberOfChannels > 2) {
      throw new Error('Spectral noise reduction currently supports mono and stereo clips. Bypass this effect for multichannel audio.');
    }
    const stored = settings.profile;
    const profile: NoiseProfile = {
      version: stored.version, sampleRate: stored.sampleRate, fftSize: stored.fftSize,
      hopSize: stored.hopSize, magnitudes: Float32Array.from(stored.magnitudes),
      capturedFrames: stored.capturedFrames,
    };
    const channels = Array.from({ length: context.buffer.numberOfChannels }, (_, channel) =>
      context.buffer.getChannelData(channel),
    );
    const result = reduceSpectralNoise(channels, context.buffer.sampleRate, profile, {
      strength: settings.strength, floor: settings.floor, threshold: settings.threshold,
      frequencySmoothing: settings.frequencySmoothing,
    });
    if (result.status !== 'ok') throw new Error(result.reason);
    const output = ctx.createBuffer(result.channels.length, result.channels[0].length, context.buffer.sampleRate);
    result.channels.forEach((channel: Float32Array, index: number) =>
      output.copyToChannel(Float32Array.from(channel), index),
    );
    const centered = trimPiece(ctx, { buffer: output, timestamp: contextStart }, chunkStart, chunkEnd);
    if (!centered) throw new Error('The processed audio window could not be aligned to its source range.');
    return {
      buffer: clip.reverse ? reverseBuffer(ctx, centered.buffer) : centered.buffer,
      timestamp: chunkStart,
    };
  })();

  entries.set(key, job);
  while (entries.size > DENOISE_CACHE_ENTRIES) entries.delete(entries.keys().next().value!);
  try {
    return await job;
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}

// decoded pieces are tiny (an aac frame is 21 ms), pieces this long keep the
// number of source nodes sane
const PIECE_SECONDS = 0.5;
// reversed clips are read in blocks from the end, each block is flipped
const REVERSE_BLOCK = 2;

// the audio of one clip in playback order, as pieces ready for
// scheduleBuffer. range is in source seconds and is read backwards for a
// reversed clip
export async function* clipAudio(
  reader: MediaReader,
  clip: Clip,
  ctx: BaseAudioContext,
  range: { start: number; end: number },
  pieceSeconds = PIECE_SECONDS,
  noiseReduction?: ClipNoiseReduction,
): AsyncGenerator<AudioPiece> {
  if (range.end <= range.start) return;
  if (noiseReduction?.enabled) {
    const fullRange = clipSourceRange(clip);
    const requestStart = Math.max(fullRange.start, range.start);
    const requestEnd = Math.min(fullRange.end, range.end);
    if (requestEnd <= requestStart) return;
    const firstIndex = Math.max(0, Math.floor((requestStart - fullRange.start) / DENOISE_CHUNK_SECONDS));
    const lastIndex = Math.max(firstIndex, Math.ceil((requestEnd - fullRange.start) / DENOISE_CHUNK_SECONDS) - 1);
    const indices = Array.from({ length: lastIndex - firstIndex + 1 }, (_, index) => firstIndex + index);
    if (clip.reverse) indices.reverse();
    for (const index of indices) {
      const chunkStart = fullRange.start + index * DENOISE_CHUNK_SECONDS;
      const chunkEnd = Math.min(fullRange.end, chunkStart + DENOISE_CHUNK_SECONDS);
      const processed = await denoisedClipPiece(reader, clip, ctx, noiseReduction, chunkStart, chunkEnd);
      if (processed) yield processed;
    }
    return;
  }
  if (!clip.reverse) {
    let batch: AudioPiece[] = [];
    let batchSeconds = 0;
    for await (const chunk of reader.audio(range.start, range.end)) {
      batch.push(chunk);
      batchSeconds += chunk.buffer.duration;
      if (batchSeconds >= pieceSeconds) {
        const merged = mergePieces(ctx, batch);
        if (merged) yield merged;
        batch = [];
        batchSeconds = 0;
      }
    }
    const rest = mergePieces(ctx, batch);
    if (rest) yield rest;
    return;
  }

  for (let blockEnd = range.end; blockEnd > range.start; blockEnd -= REVERSE_BLOCK) {
    const blockStart = Math.max(range.start, blockEnd - REVERSE_BLOCK);
    const chunks: AudioPiece[] = [];
    for await (const chunk of reader.audio(blockStart, blockEnd)) chunks.push(chunk);
    const merged = mergePieces(ctx, chunks);
    if (!merged) continue;
    const trimmed = trimPiece(ctx, merged, blockStart, blockEnd);
    if (!trimmed) continue;
    yield { buffer: reverseBuffer(ctx, trimmed.buffer), timestamp: trimmed.timestamp };
  }
}
