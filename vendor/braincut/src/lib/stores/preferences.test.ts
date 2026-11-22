import { describe, expect, it } from 'vitest';
import { normalizeProxyHeight } from './preferences';

describe('normalizeProxyHeight', () => {
  it('keeps a sane default for nonsense input', () => {
    expect(normalizeProxyHeight(NaN)).toBe(540);
    expect(normalizeProxyHeight(Infinity)).toBe(540);
    expect(normalizeProxyHeight(-Infinity)).toBe(540);
  });

  it('clamps to the supported range', () => {
    expect(normalizeProxyHeight(0)).toBe(144);
    expect(normalizeProxyHeight(10)).toBe(144);
    expect(normalizeProxyHeight(10000)).toBe(1080);
  });

  it('rounds down to even dimensions', () => {
    expect(normalizeProxyHeight(539)).toBe(538);
    expect(normalizeProxyHeight(540)).toBe(540);
    expect(normalizeProxyHeight(541)).toBe(540);
    expect(normalizeProxyHeight(1081)).toBe(1080);
  });
});
