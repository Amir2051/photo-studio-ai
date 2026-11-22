import { describe, expect, it } from 'vitest';
import { detectCapabilities, capabilitiesSummary } from './capabilities';

function allPresent() {
  return {
    window: {
      showOpenFilePicker: () => Promise.resolve([]),
      showSaveFilePicker: () => Promise.resolve({}),
      showDirectoryPicker: () => Promise.resolve({}),
      FileSystemFileHandle: { prototype: { createWritable: () => null } },
    },
    navigator: {
      storage: {
        getDirectory: () => Promise.resolve({}),
        estimate: () => Promise.resolve({}),
        persist: () => Promise.resolve(true),
        persisted: () => Promise.resolve(true),
      },
    },
    globals: { VideoEncoder: function () {}, VideoDecoder: function () {}, Worker: function () {}, OffscreenCanvas: function () {} },
  };
}

describe('detectCapabilities', () => {
  it('reports everything present when every API exists', () => {
    const caps = detectCapabilities(allPresent());
    expect(caps).toEqual({
      openFilePicker: true,
      saveFilePicker: true,
      directoryPicker: true,
      fileSystemWritable: true,
      opfs: true,
      storageEstimate: true,
      persistentStorage: true,
      webCodecsEncode: true,
      webCodecsDecode: true,
      worker: true,
      offscreenCanvas: true,
    });
  });

  it('reports nothing when no API exists', () => {
    const caps = detectCapabilities({ window: {}, navigator: {}, globals: {} });
    for (const value of Object.values(caps)) expect(value).toBe(false);
  });

  it('an in-check would lie: property present but undefined is not support', () => {
    const caps = detectCapabilities({
      window: {
        showOpenFilePicker: undefined,
        showSaveFilePicker: undefined,
        showDirectoryPicker: undefined,
        FileSystemFileHandle: { prototype: { createWritable: undefined } },
      },
      navigator: { storage: { getDirectory: undefined, estimate: undefined, persist: undefined, persisted: undefined } },
      globals: { VideoEncoder: undefined },
    });
    expect(caps.openFilePicker).toBe(false);
    expect(caps.saveFilePicker).toBe(false);
    expect(caps.directoryPicker).toBe(false);
    expect(caps.fileSystemWritable).toBe(false);
    expect(caps.opfs).toBe(false);
    expect(caps.storageEstimate).toBe(false);
    expect(caps.persistentStorage).toBe(false);
    expect(caps.webCodecsEncode).toBe(false);
  });

  it('persistentStorage requires both persist and persisted', () => {
    const base = allPresent();
    const onlyPersist = { ...base, navigator: { storage: { ...base.navigator.storage, persisted: undefined } } };
    expect(detectCapabilities(onlyPersist).persistentStorage).toBe(false);
  });

  it('survives completely missing inputs', () => {
    const caps = detectCapabilities();
    expect(typeof caps.worker).toBe('boolean');
    expect(typeof caps.webCodecsDecode).toBe('boolean');
  });

  it('summarises for logs', () => {
    const line = capabilitiesSummary(detectCapabilities(allPresent()));
    expect(line).toContain('picker=yes');
    expect(line).toContain('opfs=yes');
  });
});
