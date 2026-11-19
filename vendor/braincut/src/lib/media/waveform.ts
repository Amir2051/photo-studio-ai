import { createStore, del, get, set } from 'idb-keyval';
import { writable } from 'svelte/store';
import type { MediaItem } from '#lib/project/types.ts';
import type { WorkerRequest, WorkerResponse } from './workers/waveform.worker';

// peaks are min/max pairs per bucket: peaks[2i] is the lowest sample in
// bucket i, peaks[2i + 1] the highest, both in -1..1

export const DEFAULT_PEAKS_PER_SECOND = 50;
// how many computed peak sets are kept in memory before the least recently
// used one is dropped. one set is perSecond buckets of min/max pairs, so a
// single long clip at 50/s for ~3 hours is still a few hundred kilobytes and
// the bound is about how many sources a session is likely to hold at once
export const DEFAULT_MAX_PEAKS_ENTRIES = 64;
// hard ceiling on retained peak memory in bytes, independent of the entry
// count, so many mid-length clips cannot drift past a sane total
const DEFAULT_MAX_PEAKS_BYTES = 64 * 1024 * 1024;

export interface PeaksCacheOptions {
  maxEntries?: number;
  maxBytes?: number;
}

// in-memory least-recently-used cache over computed waveform peaks. eviction
// is memory-only: the persisted sets in IndexedDB are untouched, a clip that
// gets evicted just regenerates on its next miss
export class PeaksCache {
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly entries = new Map<string, { peaks: Float32Array; bytes: number }>();

  constructor(opts: PeaksCacheOptions = {}) {
    this.maxEntries = Math.max(1, opts.maxEntries ?? DEFAULT_MAX_PEAKS_ENTRIES);
    this.maxBytes = opts.maxBytes ?? DEFAULT_MAX_PEAKS_BYTES;
  }

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    let total = 0;
    for (const entry of this.entries.values()) total += entry.bytes;
    return total;
  }

  get(mediaId: string): Float32Array | null {
    const entry = this.entries.get(mediaId);
    if (!entry) return null;
    // re-insert so iteration order tracks recency, oldest first
    this.entries.delete(mediaId);
    this.entries.set(mediaId, entry);
    return entry.peaks;
  }

  // false when the entry would not fit the budget, true when it is retained
  set(mediaId: string, peaks: Float32Array): boolean {
    const bytes = peaks.byteLength;
    if (bytes > this.maxBytes) return false;
    while (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(mediaId, { peaks, bytes });
    return true;
  }

  delete(mediaId: string): void {
    this.entries.delete(mediaId);
  }

  clear(): void {
    this.entries.clear();
  }
}

const store = createStore('braincut-peaks', 'peaks');
const cache = new PeaksCache();
const inflight = new Map<string, Promise<Float32Array>>();

// bumps whenever new peaks arrive, so clips subscribed to it redraw
export const peaksVersion = writable(0);

export function getPeaks(mediaId: string): Float32Array | null {
  return cache.get(mediaId) ?? null;
}

interface Pending {
  resolve: (peaks: Float32Array) => void;
  reject: (e: Error) => void;
  onProgress?: (value: number) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./workers/waveform.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    const job = pending.get(message.id);
    if (!job) return;
    if (message.type === 'progress') job.onProgress?.(message.value);
    else if (message.type === 'done') {
      pending.delete(message.id);
      job.resolve(message.peaks);
    } else {
      pending.delete(message.id);
      job.reject(new Error(message.message));
    }
  };
  worker.onerror = () => {
    for (const job of pending.values()) job.reject(new Error('The waveform worker crashed'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function postRequest(message: WorkerRequest) {
  getWorker().postMessage(message);
}

export interface PeaksOptions {
  perSecond?: number;
  onProgress?: (value: number) => void;
  signal?: AbortSignal;
}

export function computePeaks(
  media: MediaItem,
  blob: Blob,
  opts: PeaksOptions = {},
): Promise<Float32Array> {
  const perSecond = opts.perSecond ?? DEFAULT_PEAKS_PER_SECOND;
  const cached = cache.get(media.id);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(media.id);
  if (running) return running;

  const promise = (async () => {
    const key = `peaks:${media.id}:${perSecond}`;
    const stored = await get<Float32Array>(key, store).catch(() => undefined);
    if (stored) return stored;
    const peaks = await new Promise<Float32Array>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject, onProgress: opts.onProgress });
      opts.signal?.addEventListener(
        'abort',
        () => {
          if (!pending.has(id)) return;
          pending.delete(id);
          postRequest({ type: 'cancel', id });
          reject(new DOMException('Waveform cancelled', 'AbortError'));
        },
        { once: true },
      );
      postRequest({ type: 'compute', id, blob, perSecond });
    });
    set(key, peaks, store).catch(() => {});
    return peaks;
  })();

  inflight.set(media.id, promise);
  promise
    .then((peaks) => {
      cache.set(media.id, peaks);
      peaksVersion.update((v) => v + 1);
    })
    .catch(() => {})
    .finally(() => inflight.delete(media.id));
  return promise;
}

export async function forgetPeaks(
  mediaId: string,
  perSecond = DEFAULT_PEAKS_PER_SECOND,
): Promise<void> {
  cache.delete(mediaId);
  await del(`peaks:${mediaId}:${perSecond}`, store).catch(() => {});
  peaksVersion.update((v) => v + 1);
}
