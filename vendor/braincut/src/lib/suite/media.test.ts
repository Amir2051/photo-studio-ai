import { describe, expect, it } from 'vitest';
import { availabilityOf, duplicateGroups, duplicateMediaGroups, identityKeyOf, identityOf, mediaIdentity, unavailableRefs } from './media';
import type { SuiteMediaRef } from './types';

function ref(id: string, fileName: string, bytes: number, lastModified: number | null = 100): SuiteMediaRef {
  return {
    id,
    name: fileName,
    fileName,
    kind: 'video',
    origin: 'user-file',
    availability: 'ready',
    identity: mediaIdentity(fileName, bytes, lastModified),
    reference: `handle:${id}`,
    mimeType: 'video/mp4',
    bytes,
    duration: 8,
    lastModified,
    relativePath: null,
    meta: {},
  };
}

describe('media identity and lifecycle', () => {
  it('builds a stable, case-insensitive identity', () => {
    expect(mediaIdentity('Clip.mp4', 1000.9, 50)).toBe(mediaIdentity('clip.MP4', 1000, 50));
    expect(mediaIdentity('clip.mp4', 1000, null)).toBe('clip.mp4|1000|0');
    expect(mediaIdentity('   ', 0, null)).toBe('unnamed|0|0');
  });

  it('reads identity consistently from a ref', () => {
    const item = ref('a', 'take.mp4', 2048);
    expect(identityOf(item)).toBe(mediaIdentity('take.mp4', 2048, 100));
  });

  it('groups duplicates without splitting singletons', () => {
    const refs = [ref('a', 'clip.mp4', 500), ref('b', 'CLIP.MP4', 500), ref('c', 'other.mp4', 500)];
    expect(duplicateGroups(refs)).toEqual([['a', 'b']]);
    expect(duplicateGroups([ref('a', 'solo.mp4', 10)])).toEqual([]);
  });

  it('finds refs whose storage reference is gone', () => {
    const refs = [ref('a', 'one.mp4', 1), ref('b', 'two.mp4', 2)];
    const available = new Set(['handle:a']);
    expect(unavailableRefs(refs, available).map((r) => r.id)).toEqual(['b']);
  });

  it('distinguishes missing from unknown availability', () => {
    expect(availabilityOf(true, true)).toBe('ready');
    expect(availabilityOf(false, true)).toBe('missing');
    expect(availabilityOf(false, false)).toBe('unknown');
  });

  it('detects duplicates on legacy MediaItem-shaped inputs', () => {
    const legacy = [
      { name: 'clip.mp4', fileSize: 500, lastModified: 7 },
      { name: 'CLIP.mp4', fileSize: 500, lastModified: 7, fileName: 'clip.mp4' },
      { name: 'other.mp4', fileSize: 500, lastModified: 7 },
    ];
    const groups = duplicateMediaGroups(legacy);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
    expect(groups[0][0].name).toBe('clip.mp4');
  });

  it('treats missing legacy timestamps as zero', () => {
    expect(identityKeyOf({ name: 'old.mp4', fileSize: 42 })).toBe('old.mp4|42|0');
    expect(identityKeyOf({ name: 'old.mp4', fileSize: 42, lastModified: null })).toBe('old.mp4|42|0');
  });
});
