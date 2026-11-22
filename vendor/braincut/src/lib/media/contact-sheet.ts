// Pure, environment-agnostic orchestration for contact sheets.
//
// The module deliberately has no imports and touches no browser globals at
// module scope: it only composes an injected FrameExtractor, so it is safe to
// import from Node (tests, SSR, tooling). The browser adapter supplies a real
// extractor backed by the thumbnail pipeline and owns all resource release.

export type FrameToken = unknown;

export interface ExtractedFrame {
  readonly image?: FrameToken;
  readonly dataUrl?: string;
  readonly release?: () => void;
}

export type FrameExtractor = (
  mediaId: string,
  times: readonly number[],
  width: number,
  signal: AbortSignal,
) => Promise<readonly (ExtractedFrame | null)[]>;

export interface ContactSheetEntry {
  readonly timestamp: number;
  readonly ok: boolean;
  readonly dataUrl?: string;
  readonly image?: FrameToken;
}

export interface ContactSheetDescriptor {
  readonly mediaId: string;
  readonly width: number;
  readonly cacheKey: string;
  readonly timestamps: readonly number[];
  readonly frames: readonly ContactSheetEntry[];
}

export interface GetContactSheetOptions {
  readonly width?: number;
  readonly signal?: AbortSignal;
}

export interface ContactSheetServiceOptions {
  readonly extract: FrameExtractor;
  readonly maxEntries?: number;
  readonly timeDecimals?: number;
  readonly onEvict?: (d: ContactSheetDescriptor) => void;
}

export interface ContactSheetStats {
  readonly entries: number;
  readonly inflight: number;
}

const DEFAULT_WIDTH = 160;
const DEFAULT_TIME_DECIMALS = 3;
const DEFAULT_MAX_ENTRIES = 8;

type DOMExceptionCtor = new (message: string, name: string) => Error;

function abortError(): Error {
  const message = 'Contact sheet cancelled';
  // Look the constructor up on globalThis so this module also imports cleanly
  // in runtimes that do not provide the browser global.
  const Ctor = (globalThis as { DOMException?: DOMExceptionCtor }).DOMException;
  if (Ctor) return new Ctor(message, 'AbortError');
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function roundTime(time: number, decimals: number): number {
  if (!Number.isFinite(time)) return time;
  const factor = 10 ** decimals;
  const rounded = Math.round(time * factor) / factor;
  // String coercion of -0 is "0" anyway, but normalise it so keys and
  // descriptors agree with plain numeric equality checks.
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function contactSheetKey(
  mediaId: string,
  times: readonly number[],
  width: number,
  timeDecimals: number = DEFAULT_TIME_DECIMALS,
): string {
  return `${mediaId}|${width}|${times.map((t) => roundTime(t, timeDecimals)).join(',')}`;
}

interface Waiter {
  readonly resolve: (descriptor: ContactSheetDescriptor) => void;
  readonly reject: (error: unknown) => void;
  onAbort?: () => void;
  cleanup: () => void;
}

interface Inflight {
  readonly key: string;
  readonly mediaId: string;
  readonly controller: AbortController;
  readonly waiters: Set<Waiter>;
  cancelled: boolean;
}

interface MutableEntry {
  timestamp: number;
  ok: boolean;
  dataUrl?: string;
  image?: FrameToken;
}

export class ContactSheetService {
  private readonly extract: FrameExtractor;
  private readonly maxEntries: number;
  private readonly timeDecimals: number;
  private readonly onEvict?: (d: ContactSheetDescriptor) => void;
  private readonly cache = new Map<string, ContactSheetDescriptor>();
  private readonly inflight = new Map<string, Inflight>();
  private disposed = false;

  constructor(opts: ContactSheetServiceOptions) {
    this.extract = opts.extract;
    this.maxEntries = Math.max(1, opts.maxEntries ?? DEFAULT_MAX_ENTRIES);
    this.timeDecimals = opts.timeDecimals ?? DEFAULT_TIME_DECIMALS;
    this.onEvict = opts.onEvict;
  }

  get stats(): ContactSheetStats {
    return { entries: this.cache.size, inflight: this.inflight.size };
  }

  get(
    mediaId: string,
    times: readonly number[],
    opts: GetContactSheetOptions = {},
  ): Promise<ContactSheetDescriptor> {
    if (this.disposed) {
      return Promise.reject(new Error('ContactSheetService is disposed'));
    }
    const signal = opts.signal;
    if (signal?.aborted) return Promise.reject(abortError());

    const width = opts.width ?? DEFAULT_WIDTH;
    const key = contactSheetKey(mediaId, times, width, this.timeDecimals);

    const cached = this.cacheGet(key);
    if (cached) return Promise.resolve(cached);

    const running = this.inflight.get(key);
    if (running) return this.attachWaiter(running, signal);

    // Nothing to decode: still produce and cache a normal (empty) descriptor.
    if (times.length === 0) {
      const empty = this.emptyDescriptor(mediaId, width, key);
      this.cacheSet(key, empty);
      return Promise.resolve(empty);
    }

    const record: Inflight = {
      key,
      mediaId,
      controller: new AbortController(),
      waiters: new Set<Waiter>(),
      cancelled: false,
    };
    this.inflight.set(key, record);
    const result = this.attachWaiter(record, signal);
    this.startExtraction(record, mediaId, times, width);
    return result;
  }

  invalidate(mediaId?: string): void {
    for (const [key, descriptor] of [...this.cache]) {
      if (mediaId === undefined || descriptor.mediaId === mediaId) {
        this.cache.delete(key);
        this.notifyEvict(descriptor);
      }
    }
    for (const record of [...this.inflight.values()]) {
      if (mediaId === undefined || record.mediaId === mediaId) this.cancelRecord(record);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidate();
  }

  private attachWaiter(record: Inflight, signal?: AbortSignal): Promise<ContactSheetDescriptor> {
    return new Promise<ContactSheetDescriptor>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, cleanup: () => {} };
      const onAbort = () => {
        record.waiters.delete(waiter);
        waiter.cleanup();
        waiter.reject(abortError());
        // The last interested caller is gone: let the injected extractor stop.
        if (record.waiters.size === 0 && !record.cancelled) {
          record.cancelled = true;
          if (this.inflight.get(record.key) === record) this.inflight.delete(record.key);
          if (!record.controller.signal.aborted) record.controller.abort(abortError());
        }
      };
      waiter.onAbort = onAbort;
      waiter.cleanup = () => {
        if (signal && waiter.onAbort) signal.removeEventListener('abort', waiter.onAbort);
      };
      record.waiters.add(waiter);
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private emptyDescriptor(mediaId: string, width: number, key: string): ContactSheetDescriptor {
    return Object.freeze({
      mediaId,
      width,
      cacheKey: key,
      timestamps: Object.freeze([] as number[]),
      frames: Object.freeze([] as ContactSheetEntry[]),
    });
  }

  private startExtraction(
    record: Inflight,
    mediaId: string,
    times: readonly number[],
    width: number,
  ): void {
    const extraction = (async (): Promise<ContactSheetDescriptor> => {
      const extracted = await this.extract(mediaId, [...times], width, record.controller.signal);
      const frames: MutableEntry[] = times.map((timestamp, i) => {
        const frame = extracted[i];
        const present = frame !== null && frame !== undefined;
        const entry: MutableEntry = { timestamp, ok: present };
        if (present && frame) {
          if (frame.dataUrl !== undefined) entry.dataUrl = frame.dataUrl;
          if (frame.image !== undefined) entry.image = frame.image;
        }
        return entry;
      });
      return Object.freeze({
        mediaId,
        width,
        cacheKey: record.key,
        timestamps: Object.freeze([...times]),
        frames: Object.freeze(frames.map((frame) => Object.freeze(frame))),
      });
    })();

    extraction.then(
      (descriptor) => this.settleSuccess(record, descriptor),
      (error: unknown) => this.settleFailure(record, error),
    );
  }

  private settleSuccess(record: Inflight, descriptor: ContactSheetDescriptor): void {
    if (this.inflight.get(record.key) === record) this.inflight.delete(record.key);
    // An aborted / invalidated record must never repopulate the cache, even if
    // the injected extractor ignored the signal and produced frames.
    if (!record.cancelled && !this.disposed) this.cacheSet(record.key, descriptor);
    for (const waiter of [...record.waiters]) {
      waiter.cleanup();
      waiter.resolve(descriptor);
    }
    record.waiters.clear();
  }

  private settleFailure(record: Inflight, error: unknown): void {
    if (this.inflight.get(record.key) === record) this.inflight.delete(record.key);
    for (const waiter of [...record.waiters]) {
      waiter.cleanup();
      waiter.reject(error);
    }
    record.waiters.clear();
  }

  private cancelRecord(record: Inflight): void {
    record.cancelled = true;
    if (this.inflight.get(record.key) === record) this.inflight.delete(record.key);
    const error = abortError();
    for (const waiter of [...record.waiters]) {
      waiter.cleanup();
      waiter.reject(error);
    }
    record.waiters.clear();
    if (!record.controller.signal.aborted) record.controller.abort(error);
  }

  private cacheGet(key: string): ContactSheetDescriptor | undefined {
    const descriptor = this.cache.get(key);
    if (!descriptor) return undefined;
    this.cache.delete(key);
    this.cache.set(key, descriptor);
    return descriptor;
  }

  private cacheSet(key: string, descriptor: ContactSheetDescriptor): void {
    this.cache.delete(key);
    this.cache.set(key, descriptor);
    while (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      const evicted = this.cache.get(oldest);
      this.cache.delete(oldest);
      if (evicted) this.notifyEvict(evicted);
    }
  }

  private notifyEvict(descriptor: ContactSheetDescriptor): void {
    if (!this.onEvict) return;
    try {
      this.onEvict(descriptor);
    } catch {
      // Eviction notification is best effort: a throwing observer must not
      // corrupt cache state or leave successful callers unresolved.
    }
  }
}

export function createContactSheetService(opts: ContactSheetServiceOptions): ContactSheetService {
  return new ContactSheetService(opts);
}
