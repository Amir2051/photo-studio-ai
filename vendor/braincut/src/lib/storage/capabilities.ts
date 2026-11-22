// One place to detect what this browser can actually do, instead of inline
// `in` checks scattered through the codebase (an `in` check is true even when
// the property exists but is undefined). Nothing here assumes support;
// everything is measured from the runtime given.
export interface Capabilities {
  openFilePicker: boolean;
  saveFilePicker: boolean;
  directoryPicker: boolean;
  fileSystemWritable: boolean; // FileSystemFileHandle.prototype.createWritable
  opfs: boolean; // navigator.storage.getDirectory
  storageEstimate: boolean; // navigator.storage.estimate
  persistentStorage: boolean; // navigator.storage.persist (+ persisted)
  webCodecsEncode: boolean; // VideoEncoder
  webCodecsDecode: boolean; // VideoDecoder
  worker: boolean; // Worker
  offscreenCanvas: boolean; // OffscreenCanvas
}

type StorageLike = {
  getDirectory?: unknown;
  estimate?: unknown;
  persist?: unknown;
  persisted?: unknown;
};

export interface DetectInput {
  window?: {
    showOpenFilePicker?: unknown;
    showSaveFilePicker?: unknown;
    showDirectoryPicker?: unknown;
    FileSystemFileHandle?: { prototype: Record<string, unknown> };
  };
  navigator?: { storage?: StorageLike };
  globals?: {
    VideoEncoder?: unknown;
    VideoDecoder?: unknown;
    Worker?: unknown;
    OffscreenCanvas?: unknown;
  };
}

function fn(value: unknown): boolean {
  return typeof value === 'function';
}

export function detectCapabilities(input: DetectInput = {}): Capabilities {
  const win =
    input.window ?? (typeof window !== 'undefined' ? (window as unknown as DetectInput['window']) : undefined);
  const nav =
    input.navigator ??
    (typeof navigator !== 'undefined' ? (navigator as unknown as DetectInput['navigator']) : undefined);
  const globals = input.globals ?? (typeof globalThis !== 'undefined' ? (globalThis as DetectInput['globals']) : {});
  const storage = nav?.storage as StorageLike | undefined;
  const writableProto = win?.FileSystemFileHandle?.prototype;
  return {
    openFilePicker: fn(win?.showOpenFilePicker),
    saveFilePicker: fn(win?.showSaveFilePicker),
    directoryPicker: fn(win?.showDirectoryPicker),
    fileSystemWritable: fn(writableProto?.createWritable),
    opfs: fn(storage?.getDirectory),
    storageEstimate: fn(storage?.estimate),
    persistentStorage: fn(storage?.persist) && fn(storage?.persisted),
    webCodecsEncode: fn(globals?.VideoEncoder),
    webCodecsDecode: fn(globals?.VideoDecoder),
    worker: fn(globals?.Worker),
    offscreenCanvas: fn(globals?.OffscreenCanvas),
  };
}

export function capabilitiesSummary(caps: Capabilities): string {
  const parts = [
    `picker=${caps.openFilePicker ? 'yes' : 'no'}`,
    `save-picker=${caps.saveFilePicker ? 'yes' : 'no'}`,
    `dir-picker=${caps.directoryPicker ? 'yes' : 'no'}`,
    `opfs=${caps.opfs ? 'yes' : 'no'}`,
    `persistent=${caps.persistentStorage ? 'yes' : 'no'}`,
    `estimate=${caps.storageEstimate ? 'yes' : 'no'}`,
    `webcodecs=${caps.webCodecsEncode && caps.webCodecsDecode ? 'yes' : 'partial'}`,
  ];
  return parts.join(' ');
}
