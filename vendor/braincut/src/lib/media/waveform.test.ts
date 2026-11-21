import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_PEAKS_ENTRIES, PeaksCache } from './waveform';

function peaks(level = 0.5, buckets = 10): Float32Array {
  const out = new Float32Array(buckets * 2);
  for (let i = 0; i < out.length; i += 2) {
    out[i] = -level;
    out[i + 1] = level;
  }
  return out;
}

describe('peaks cache', () => {
  it('starts empty and reports misses', () => {
    const cache = new PeaksCache();
    expect(cache.size).toBe(0);
    expect(cache.get('m1')).toBeNull();
  });

  it('stores a computed result and serves it back as the same hit', () => {
    const cache = new PeaksCache();
    const first = peaks();
    expect(cache.set('m1', first)).toBe(true);
    expect(cache.size).toBe(1);
    expect(cache.get('m1')).toBe(first);
  });

  it('evicts the least recently used entry beyond the configured maximum', () => {
    const cache = new PeaksCache({ maxEntries: 2 });
    cache.set('a', peaks());
    cache.set('b', peaks());
    // touching a makes b the least recently used
    expect(cache.get('a')).not.toBeNull();
    cache.set('c', peaks());
    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).not.toBeNull();
    expect(cache.get('c')).not.toBeNull();
    expect(cache.size).toBe(2);
  });

  it('honours a larger configured maximum entry count', () => {
    const cache = new PeaksCache({ maxEntries: 3 });
    cache.set('a', peaks());
    cache.set('b', peaks());
    cache.set('c', peaks());
    cache.set('d', peaks());
    expect(cache.size).toBe(3);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).not.toBeNull();
    expect(cache.get('c')).not.toBeNull();
    expect(cache.get('d')).not.toBeNull();
  });

  it('is bounded by the default entry count', () => {
    expect(DEFAULT_MAX_PEAKS_ENTRIES).toBeGreaterThan(0);
    const cache = new PeaksCache();
    for (let i = 0; i < DEFAULT_MAX_PEAKS_ENTRIES + 10; i++) cache.set(`m${i}`, peaks());
    expect(cache.size).toBe(DEFAULT_MAX_PEAKS_ENTRIES);
  });

  it('bounds memory by a byte budget and refuses oversized entries', () => {
    const cache = new PeaksCache({ maxBytes: 48 });
    const small = new Float32Array(8); // 32 bytes
    expect(cache.set('s1', small)).toBe(true);
    // 32 + 32 > 48, so the older entry has to go
    expect(cache.set('s2', small)).toBe(true);
    expect(cache.size).toBe(1);
    // a single entry that cannot fit the budget is not cached at all
    expect(cache.set('big', new Float32Array(64))).toBe(false);
    expect(cache.size).toBe(1);
    expect(cache.get('big')).toBeNull();
  });

  it('deletes on explicit invalidation and tolerates repeats', () => {
    const cache = new PeaksCache();
    cache.set('a', peaks());
    cache.delete('a');
    expect(cache.get('a')).toBeNull();
    expect(() => cache.delete('a')).not.toThrow();
  });

  it('clear empties every entry', () => {
    const cache = new PeaksCache();
    cache.set('a', peaks());
    cache.set('b', peaks());
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('keeps retained peaks intact when other entries get evicted', () => {
    const cache = new PeaksCache({ maxEntries: 2 });
    const kept = peaks(0.25, 5);
    cache.set('a', kept);
    cache.set('b', peaks(0.75, 5));
    cache.get('a'); // refresh a so b is the eviction victim
    cache.set('c', peaks(0.9, 5));
    expect(cache.get('a')).toBe(kept);
    expect(cache.get('a')![1]).toBeCloseTo(0.25, 5);
    expect(cache.size).toBe(2);
  });
});
