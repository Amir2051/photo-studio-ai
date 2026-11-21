import { describe, expect, it } from 'vitest';
import * as contactSheetModule from './contact-sheet';
import {
  ContactSheetService,
  contactSheetKey,
  createContactSheetService,
  type ContactSheetDescriptor,
  type ExtractedFrame,
  type FrameExtractor,
} from './contact-sheet';

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Settled<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown };

// Always attaches a handler immediately so a rejected promise never trips an
// unhandled-rejection warning between creation and assertion.
async function settled<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

interface ExtractCall {
  readonly mediaId: string;
  readonly times: readonly number[];
  readonly width: number;
  readonly signal: AbortSignal;
}

function frames(count: number): readonly (ExtractedFrame | null)[] {
  return Array.from({ length: count }, (_, i) => ({ dataUrl: `data:${i}` }));
}

function makeExtractor(
  impl?: (call: ExtractCall, index: number) => Promise<readonly (ExtractedFrame | null)[]>,
): { extract: FrameExtractor; calls: ExtractCall[] } {
  const calls: ExtractCall[] = [];
  const extract: FrameExtractor = (mediaId, times, width, signal) => {
    const call: ExtractCall = { mediaId, times: [...times], width, signal };
    calls.push(call);
    return impl ? impl(call, calls.length - 1) : Promise.resolve(frames(times.length));
  };
  return { extract, calls };
}

function abortErrorOf(result: Settled<unknown>): Error {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected rejection');
  const error = result.error;
  expect(error).toBeInstanceOf(Error);
  return error as Error;
}

describe('contactSheetKey', () => {
  it('uses the documented format and is stable for identical ordered inputs', () => {
    expect(contactSheetKey('m1', [0, 1.5, 3], 160)).toBe('m1|160|0,1.5,3');
    expect(contactSheetKey('m1', [0, 1.5, 3], 160)).toBe(contactSheetKey('m1', [0, 1.5, 3], 160));
    // order is significant
    expect(contactSheetKey('m1', [3, 1.5, 0], 160)).not.toBe(
      contactSheetKey('m1', [0, 1.5, 3], 160),
    );
    expect(contactSheetKey('m1', [], 160)).toBe('m1|160|');
  });

  it('distinguishes media ids, widths, timestamps and honours timeDecimals', () => {
    const base = contactSheetKey('m1', [1], 160);
    expect(contactSheetKey('m2', [1], 160)).not.toBe(base);
    expect(contactSheetKey('m1', [1], 320)).not.toBe(base);
    expect(contactSheetKey('m1', [2], 160)).not.toBe(base);
    expect(contactSheetKey('m1', [1.04], 160, 1)).toBe(contactSheetKey('m1', [1.01], 160, 1));
    expect(contactSheetKey('m1', [1.04], 160, 3)).not.toBe(contactSheetKey('m1', [1.01], 160, 3));
    // deterministic across calls, no locale-dependent separators
    expect(contactSheetKey('m1', [1.2345], 160, 2)).toBe('m1|160|1.23');
  });
});

describe('ContactSheetService', () => {
  it('is constructible through the factory with the same behaviour', async () => {
    const { extract, calls } = makeExtractor();
    const service = createContactSheetService({ extract });
    expect(service).toBeInstanceOf(ContactSheetService);
    const descriptor = await service.get('m1', [1]);
    expect(descriptor.mediaId).toBe('m1');
    expect(calls).toHaveLength(1);
  });

  it('builds an immutable descriptor from extracted frames', async () => {
    const token = { bitmap: 1 };
    const { extract, calls } = makeExtractor(() =>
      Promise.resolve([
        { dataUrl: 'a', image: token, release: () => {} },
        null,
        { image: 7 },
      ]),
    );
    const service = new ContactSheetService({ extract });
    const descriptor = await service.get('m1', [1.0001, 2, 3]);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ mediaId: 'm1', width: 160 });
    expect(calls[0]!.times).not.toBe(descriptor.timestamps);
    expect(descriptor.mediaId).toBe('m1');
    expect(descriptor.width).toBe(160);
    expect(descriptor.cacheKey).toBe(contactSheetKey('m1', [1.0001, 2, 3], 160));
    // timestamps are the exact inputs, never rounded for the descriptor
    expect([...descriptor.timestamps]).toEqual([1.0001, 2, 3]);
    expect(descriptor.frames.map((f) => f.timestamp)).toEqual([1.0001, 2, 3]);
    expect(descriptor.frames.map((f) => f.ok)).toEqual([true, false, true]);
    expect(descriptor.frames[0]!.dataUrl).toBe('a');
    expect(descriptor.frames[0]!.image).toBe(token);
    expect(descriptor.frames[2]!.image).toBe(7);
    expect(descriptor.frames[2]!.dataUrl).toBeUndefined();
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.frames)).toBe(true);
    expect(Object.isFrozen(descriptor.timestamps)).toBe(true);
    expect(service.stats).toEqual({ entries: 1, inflight: 0 });
  });

  it('handles zero frames without calling the extractor and caches the empty sheet', async () => {
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({ extract });
    const descriptor = await service.get('m1', []);

    expect(calls).toHaveLength(0);
    expect(descriptor.frames).toHaveLength(0);
    expect(descriptor.timestamps).toHaveLength(0);
    expect(service.stats.entries).toBe(1);
    const again = await service.get('m1', []);
    expect(again).toBe(descriptor);
    expect(calls).toHaveLength(0);
  });

  it('extracts a single frame', async () => {
    const { extract, calls } = makeExtractor(() => Promise.resolve([{ dataUrl: 'one' }]));
    const service = new ContactSheetService({ extract });
    const descriptor = await service.get('m1', [2.5], { width: 120 });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.width).toBe(120);
    expect(descriptor.width).toBe(120);
    expect(descriptor.frames).toHaveLength(1);
    expect(descriptor.frames[0]).toMatchObject({ timestamp: 2.5, ok: true, dataUrl: 'one' });
  });

  it('coalesces duplicate concurrent requests into one extractor call', async () => {
    const gate = deferred<readonly (ExtractedFrame | null)[]>();
    const { extract, calls } = makeExtractor(() => gate.promise);
    const service = new ContactSheetService({ extract });

    const first = service.get('m1', [1, 2]);
    const second = service.get('m1', [1, 2]);
    expect(service.stats.inflight).toBe(1);
    gate.resolve(frames(2));
    const [a, b] = await Promise.all([first, second]);

    expect(calls).toHaveLength(1);
    expect(a).toBe(b);
    expect(service.stats).toEqual({ entries: 1, inflight: 0 });
  });

  it('serves a later identical request from cache with no extra extractor call', async () => {
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({ extract });
    const first = await service.get('m1', [1, 2]);
    const second = await service.get('m1', [1, 2]);
    expect(second).toBe(first);
    expect(calls).toHaveLength(1);
  });

  it('keeps different media ids separate and associates frames correctly', async () => {
    const { extract, calls } = makeExtractor(({ mediaId, times }) =>
      Promise.resolve(times.map((t) => ({ dataUrl: `${mediaId}@${t}` }))),
    );
    const service = new ContactSheetService({ extract });
    const [a, b] = await Promise.all([service.get('a', [1]), service.get('b', [1])]);

    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.mediaId)).toEqual(['a', 'b']);
    expect(a.mediaId).toBe('a');
    expect(b.mediaId).toBe('b');
    expect(a.frames[0]!.dataUrl).toBe('a@1');
    expect(b.frames[0]!.dataUrl).toBe('b@1');
  });

  it('keys on timestamps', async () => {
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({ extract });
    await service.get('m1', [1]);
    await service.get('m1', [2]);
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.times)).toEqual([[1], [2]]);
    expect(service.stats.entries).toBe(2);
  });

  it('shares a key for millisecond-quantised near times', async () => {
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({ extract });
    const a = await service.get('m1', [1.0001]);
    const b = await service.get('m1', [1.0002]);
    expect(b).toBe(a);
    expect(calls).toHaveLength(1);

    const coarseExtractor = makeExtractor();
    const coarse = new ContactSheetService({
      extract: coarseExtractor.extract,
      timeDecimals: 1,
    });
    await coarse.get('m1', [1.01]);
    await coarse.get('m1', [1.04]);
    expect(coarseExtractor.calls).toHaveLength(1);
  });

  it('keys on width', async () => {
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({ extract });
    await service.get('m1', [1], { width: 160 });
    await service.get('m1', [1], { width: 320 });
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.width)).toEqual([160, 320]);
  });

  it('rejects an already-aborted caller without extracting or caching', async () => {
    const controller = new AbortController();
    controller.abort();
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({ extract });

    const result = await settled(service.get('m1', [1], { signal: controller.signal }));
    const error = abortErrorOf(result);
    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('Contact sheet cancelled');
    expect(calls).toHaveLength(0);
    expect(service.stats).toEqual({ entries: 0, inflight: 0 });
  });

  it('aborts the internal signal and caches nothing when the sole waiter cancels', async () => {
    const gate = deferred<readonly (ExtractedFrame | null)[]>();
    const { extract, calls } = makeExtractor(() => gate.promise);
    const service = new ContactSheetService({ extract });
    const controller = new AbortController();

    const result = settled(service.get('m1', [1], { signal: controller.signal }));
    const internalSignal = calls[0]!.signal;
    expect(internalSignal.aborted).toBe(false);
    controller.abort();

    expect(abortErrorOf(await result).name).toBe('AbortError');
    expect(internalSignal.aborted).toBe(true);
    expect(service.stats).toEqual({ entries: 0, inflight: 0 });
    // even an extractor that ignores the signal must not repopulate the cache
    gate.resolve(frames(1));
    await Promise.resolve();
    expect(service.stats.entries).toBe(0);
  });

  it('rejects only one coalesced waiter when it aborts; the other still resolves', async () => {
    const gate = deferred<readonly (ExtractedFrame | null)[]>();
    const { extract, calls } = makeExtractor(() => gate.promise);
    const service = new ContactSheetService({ extract });
    const first = new AbortController();
    const second = new AbortController();

    const resultA = settled(service.get('m1', [1], { signal: first.signal }));
    const resultB = settled(service.get('m1', [1], { signal: second.signal }));
    expect(calls).toHaveLength(1);

    first.abort();
    expect(calls[0]!.signal.aborted).toBe(false);
    expect(abortErrorOf(await resultA).name).toBe('AbortError');
    expect(service.stats.inflight).toBe(1);

    gate.resolve([{ dataUrl: 'survivor' }]);
    const outcomeB = await resultB;
    expect(outcomeB.ok).toBe(true);
    if (outcomeB.ok) expect(outcomeB.value.frames[0]!.dataUrl).toBe('survivor');
    expect(service.stats).toEqual({ entries: 1, inflight: 0 });
  });

  it('propagates the exact extractor error to all waiters, caches nothing and allows retry', async () => {
    const failure = new Error('extractor exploded');
    let attempt = 0;
    const { extract, calls } = makeExtractor(() => {
      attempt++;
      return attempt === 1 ? Promise.reject(failure) : Promise.resolve(frames(1));
    });
    const service = new ContactSheetService({ extract });

    const gate = deferred<readonly (ExtractedFrame | null)[]>();
    // two coalesced waiters share the failure
    const shared = new ContactSheetService({ extract: () => gate.promise });
    const resultA = settled(shared.get('m1', [1]));
    const resultB = settled(shared.get('m1', [1]));
    gate.reject(failure);
    const outcomeA = await resultA;
    const outcomeB = await resultB;
    expect(outcomeA.ok).toBe(false);
    expect(outcomeB.ok).toBe(false);
    if (!outcomeA.ok) expect(outcomeA.error).toBe(failure);
    if (!outcomeB.ok) expect(outcomeB.error).toBe(failure);
    expect(shared.stats.entries).toBe(0);

    const single = await settled(service.get('m1', [1]));
    expect(single.ok).toBe(false);
    if (!single.ok) expect(single.error).toBe(failure);
    expect(service.stats.entries).toBe(0);

    const retry = await service.get('m1', [1]);
    expect(retry.frames[0]!.ok).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('evicts least-recently-used entries, notifies onEvict and re-fetches evicted keys', async () => {
    const evicted: ContactSheetDescriptor[] = [];
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({
      extract,
      maxEntries: 2,
      onEvict: (descriptor) => evicted.push(descriptor),
    });

    const a = await service.get('a', [1]);
    const b = await service.get('b', [1]);
    await service.get('b', [1]); // touch b so a is the eviction victim
    const c = await service.get('c', [1]);

    expect(evicted).toEqual([a]);
    expect(evicted[0]).toBe(a);
    expect(b).not.toBe(c);
    expect(service.stats.entries).toBe(2);
    expect(calls).toHaveLength(3);

    const again = await service.get('a', [1]);
    expect(again).not.toBe(a);
    expect(calls).toHaveLength(4);
    expect(evicted).toHaveLength(2);
  });

  it('exposes no extra runtime exports and no unsupported descriptor keys', async () => {
    expect(Object.keys(contactSheetModule).sort()).toEqual(
      ['ContactSheetService', 'contactSheetKey', 'createContactSheetService'].sort(),
    );

    const service = new ContactSheetService({
      extract: () => Promise.resolve([{ dataUrl: 'x', image: 1, release: () => {} }]),
    });
    const descriptor = await service.get('m1', [1]);
    expect(Object.keys(descriptor).sort()).toEqual(
      ['cacheKey', 'frames', 'mediaId', 'timestamps', 'width'].sort(),
    );
    expect(Object.keys(descriptor.frames[0]!).sort()).toEqual(
      ['dataUrl', 'image', 'ok', 'timestamp'].sort(),
    );
    const keyText = [...Object.keys(descriptor), ...Object.keys(descriptor.frames[0]!)]
      .join(' ')
      .toLowerCase();
    expect(keyText).not.toMatch(/scene|shot|segment/);
  });

  it('scopes invalidate to a media id and notifies eviction', async () => {
    const evicted: string[] = [];
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({
      extract,
      onEvict: (descriptor) => evicted.push(descriptor.mediaId),
    });
    await service.get('a', [1]);
    await service.get('b', [1]);

    service.invalidate('a');
    expect(evicted).toEqual(['a']);
    expect(service.stats.entries).toBe(1);

    await service.get('a', [1]);
    expect(calls).toHaveLength(3);
    service.invalidate();
    expect(evicted).toContain('a');
    expect(evicted).toContain('b');
    expect(service.stats.entries).toBe(0);
  });

  it('disposes by invalidating everything and rejecting later requests', async () => {
    const evicted: string[] = [];
    const { extract, calls } = makeExtractor();
    const service = new ContactSheetService({
      extract,
      onEvict: (descriptor) => evicted.push(descriptor.mediaId),
    });
    await service.get('a', [1]);
    await service.get('b', [1]);

    service.dispose();
    expect(service.stats).toEqual({ entries: 0, inflight: 0 });
    expect(evicted.sort()).toEqual(['a', 'b']);

    const result = await settled(service.get('a', [1]));
    expect(abortErrorOf(result)).toBeInstanceOf(Error);
    expect(calls).toHaveLength(2);
    expect(() => service.dispose()).not.toThrow();
  });

  it('reports in-flight work and passes a copy of times to the extractor', async () => {
    const gate = deferred<readonly (ExtractedFrame | null)[]>();
    const times = [1, 2, 3];
    const { extract, calls } = makeExtractor(() => gate.promise);
    const service = new ContactSheetService({ extract });

    const pending = service.get('m1', times);
    expect(service.stats.inflight).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.times).toEqual(times);
    expect(calls[0]!.times).not.toBe(times);
    gate.resolve(frames(3));
    await pending;
    expect(service.stats.inflight).toBe(0);
  });

  it('cancels in-flight extraction on invalidate and rejects its waiters', async () => {
    const gate = deferred<readonly (ExtractedFrame | null)[]>();
    const { extract, calls } = makeExtractor(() => gate.promise);
    const service = new ContactSheetService({ extract });

    const result = settled(service.get('m1', [1]));
    const internalSignal = calls[0]!.signal;
    service.invalidate('m1');
    expect(internalSignal.aborted).toBe(true);
    expect(abortErrorOf(await result).name).toBe('AbortError');
    expect(service.stats).toEqual({ entries: 0, inflight: 0 });
    gate.resolve(frames(1));
  });
});
