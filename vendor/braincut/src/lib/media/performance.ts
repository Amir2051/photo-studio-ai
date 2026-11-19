// opt-in memory probe for the long-form work (M2.1). disabled by default: no
// timer runs, nothing persists, nothing leaves the page and nothing is logged
// unless collectMemory() is called explicitly during manual testing. the
// reported heap figures come from the browser (performance.memory) when it
// offers them and are clearly separated from any estimate.

export interface FrameCacheStats {
  readers: number;
  cursors: number;
  images: number;
  imageBytes: number;
  frames: number;
}

export interface MemoryReport {
  collectedAt: number;
  heap: { source: 'ua' | 'none'; usedBytes: number | null; totalBytes: number | null; limitBytes: number | null };
  dom: { source: 'count' | 'none'; nodes: number | null };
  peaks: { entries: number; bytes: number };
  frames: FrameCacheStats | null;
  timeline: { logicalClips: number };
}

export interface MemoryCollectorOptions {
  // what the timeline holds right now, injected so the probe stays
  // unit-testable without a browser
  timelineLogicalClips?: number;
  peaks?: { entries: number; bytes: number };
  frames?: FrameCacheStats | null;
  dom?: { source: 'count' | 'none'; nodes: number | null };
  now?: () => number;
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function browserHeap(): { source: 'ua' | 'none'; usedBytes: number | null; totalBytes: number | null; limitBytes: number | null } {
  const nav = navigator as Navigator & { memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number } };
  const memory = nav.memory;
  if (!memory || typeof memory.usedJSHeapSize !== 'number') {
    return { source: 'none', usedBytes: null, totalBytes: null, limitBytes: null };
  }
  return {
    source: 'ua',
    usedBytes: memory.usedJSHeapSize,
    totalBytes: typeof memory.jsHeapSizeLimit === 'number' ? memory.jsHeapSizeLimit : null,
    limitBytes: typeof memory.jsHeapSizeLimit === 'number' ? memory.jsHeapSizeLimit : null,
  };
}

function resolveDom(source: 'count' | 'none', nodes: number | null): { source: 'count' | 'none'; nodes: number | null } {
  if (source !== 'count') return { source: 'none', nodes: null };
  const count = nodes ?? (typeof document === 'undefined' ? null : document.querySelectorAll('*').length);
  return { source: 'count', nodes: count };
}

// one manual sample. nothing here is cached, stored or sent anywhere, so it can
// be called before and after a scrub to read the delta
export function collectMemory(opts: MemoryCollectorOptions = {}): MemoryReport {
  const heap = browserHeap();
  const dom = resolveDom(opts.dom?.source ?? 'none', opts.dom?.nodes ?? null);
  const peaks = opts.peaks ?? { entries: 0, bytes: 0 };
  const frames = opts.frames ?? null;
  return {
    collectedAt: opts.now?.() ?? nowMs(),
    heap,
    dom,
    peaks: { entries: peaks.entries, bytes: peaks.bytes },
    frames,
    timeline: { logicalClips: opts.timelineLogicalClips ?? 0 },
  };
}

export interface MemoryDelta {
  heapUsedDeltaBytes: number | null;
  domNodesDelta: number | null;
}

// before/after comparison. deltas on unmeasured values are null, never guessed
export function memoryDeltas(before: MemoryReport, after: MemoryReport): MemoryDelta {
  const heapUsedDeltaBytes =
    before.heap.source === 'ua' && after.heap.source === 'ua' && before.heap.usedBytes !== null && after.heap.usedBytes !== null
      ? after.heap.usedBytes - before.heap.usedBytes
      : null;
  const domNodesDelta =
    before.dom.source === 'count' && after.dom.source === 'count' && before.dom.nodes !== null && after.dom.nodes !== null
      ? after.dom.nodes - before.dom.nodes
      : null;
  return { heapUsedDeltaBytes, domNodesDelta };
}
