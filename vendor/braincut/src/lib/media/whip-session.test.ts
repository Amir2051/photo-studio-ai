import { describe, expect, it } from 'vitest';
import { resolveWhipSessionUrl } from './whip-session';

describe('resolveWhipSessionUrl', () => {
  it('resolves a relative WHIP Location on the endpoint origin', () => {
    expect(resolveWhipSessionUrl('https://stream.example/whip/ingest', '../session/123')).toEqual({
      url: 'https://stream.example/session/123',
      origin: 'https://stream.example',
    });
  });

  it('rejects a cross-origin Location before a bearer token can be used', () => {
    expect(() => resolveWhipSessionUrl('https://stream.example/whip', 'https://attacker.example/session'))
      .toThrow(/same HTTPS origin/);
  });

  it('rejects HTTPS-to-HTTP downgrade Locations', () => {
    expect(() => resolveWhipSessionUrl('https://stream.example/whip', 'http://stream.example/session'))
      .toThrow(/same HTTPS origin/);
  });

  it('rejects credentials embedded in either URL', () => {
    expect(() => resolveWhipSessionUrl('https://user:pass@stream.example/whip', '/session'))
      .toThrow(/credential-free HTTPS/);
    expect(() => resolveWhipSessionUrl('https://stream.example/whip', 'https://user:pass@stream.example/session'))
      .toThrow(/same HTTPS origin/);
  });

  it('rejects non-HTTPS ingest endpoints', () => {
    expect(() => resolveWhipSessionUrl('http://stream.example/whip', '/session'))
      .toThrow(/credential-free HTTPS/);
  });
});
