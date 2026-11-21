import { describe, expect, it } from 'vitest';
import { looksLikeSuiteDocument, parseSuiteDocument, serializeSuiteDocument } from './serialize';
import { SUITE_FORMAT, SUITE_VERSION, type SuiteDocument } from './types';

function document(): SuiteDocument {
  return {
    format: SUITE_FORMAT,
    version: SUITE_VERSION,
    id: 'doc1',
    name: 'Trial',
    studio: 'video',
    createdAt: 1,
    modifiedAt: 2,
    media: [
      {
        id: 'm1',
        name: 'clip.mp4',
        fileName: 'clip.mp4',
        kind: 'video',
        origin: 'user-file',
        availability: 'ready',
        identity: 'clip.mp4|100|0',
        reference: 'handle:m1',
        mimeType: 'video/mp4',
        bytes: 100,
        duration: 8,
        lastModified: null,
        relativePath: 'camera/clip.mp4',
        meta: { width: 1920, hasAudio: true, codec: null },
      },
    ],
    // nested native state must survive verbatim
    payload: { sequences: [{ id: 's1', tracks: [{ clips: [{ id: 'c1', start: 0 }] }] }], extra: { a: 1 } },
  };
}

describe('suite serialization', () => {
  it('round-trips a document including nested native payload', () => {
    const original = document();
    const parsed = parseSuiteDocument(serializeSuiteDocument(original));
    expect(parsed).toEqual(original);
  });

  it('recognises its own envelope', () => {
    expect(looksLikeSuiteDocument(serializeSuiteDocument(document()))).toBe(true);
    expect(looksLikeSuiteDocument('{"format":"other"}')).toBe(false);
    expect(looksLikeSuiteDocument('not json')).toBe(false);
  });

  it('rejects invalid JSON and wrong format/version', () => {
    expect(() => parseSuiteDocument('not json')).toThrow(/invalid JSON/);
    expect(() => parseSuiteDocument('{"format":"other"}')).toThrow(/format/);
    expect(() => parseSuiteDocument('{"format":"minu-suite","version":99}')).toThrow(/version/);
  });

  it('rejects malformed media entries and missing fields', () => {
    const base = document();
    const badMedia = JSON.parse(serializeSuiteDocument(base)) as Record<string, unknown>;
    badMedia.media = [{ id: 'm1' }];
    expect(() => parseSuiteDocument(JSON.stringify(badMedia))).toThrow(/media\[0\]/);
    const badName = JSON.parse(serializeSuiteDocument(base)) as Record<string, unknown>;
    delete badName.name;
    expect(() => parseSuiteDocument(JSON.stringify(badName))).toThrow(/name/);
  });

  it('rejects invalid enums and non-primitive media metadata', () => {
    const base = document();
    const badEnum = JSON.parse(serializeSuiteDocument(base)) as Record<string, unknown>;
    badEnum.studio = 'unknown';
    expect(() => parseSuiteDocument(JSON.stringify(badEnum))).toThrow(/studio/);
    const badMeta = JSON.parse(serializeSuiteDocument(base)) as Record<string, unknown>;
    const mediaEntries = badMeta.media as Record<string, unknown>[];
    mediaEntries[0].meta = { nested: { bad: true } };
    expect(() => parseSuiteDocument(JSON.stringify(badMeta))).toThrow(/meta.nested/);
  });
});
