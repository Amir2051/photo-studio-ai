import { get } from 'svelte/store';
import { id } from '#lib/project/ids.ts';
import { edit, project } from '#lib/project/store.ts';
import type { MediaItem } from '#lib/project/types.ts';
import { addToast, importProgress, renderStatus } from '#lib/stores/app.ts';
import { probeFile } from './probe';
import { registerSource } from './sources';
import { posterThumbnail } from './thumbnails';

export const VIDEO_EXTENSIONS = [
  'mp4',
  'm4v',
  'mov',
  'webm',
  'mkv',
  'ts',
  'm2ts',
  'mts',
  'avi',
  'wmv',
  'flv',
  '3gp',
  'mxf',
  'mpg',
  'mpeg',
];
export const AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'ogg',
  'oga',
  'opus',
  'flac',
  'aac',
  'm4a',
  'aiff',
  'aif',
  'wma',
];
export const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'avif',
  'tif',
  'tiff',
];
export const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS];

const PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Media',
    accept: {
      'video/*': VIDEO_EXTENSIONS.map((e) => `.${e}`),
      'audio/*': AUDIO_EXTENSIONS.map((e) => `.${e}`),
      'image/*': IMAGE_EXTENSIONS.map((e) => `.${e}`),
    },
  },
];

export function isMediaFile(name: string, type = ''): boolean {
  if (/^(video|audio|image)\//.test(type)) return true;
  const i = name.lastIndexOf('.');
  return i !== -1 && MEDIA_EXTENSIONS.includes(name.slice(i + 1).toLowerCase());
}

export interface ImportEntry {
  file: File;
  handle: FileSystemFileHandle | null;
  // where the file sat inside the folder it came from, when we know
  path: string | null;
}

type Entry = ImportEntry;
export type ImportInput = File[] | FileSystemFileHandle[] | ImportEntry[] | DataTransfer;

const PROBE_CONCURRENCY = 2;

async function walkHandle(
  handle: FileSystemFileHandle | FileSystemDirectoryHandle,
  out: Entry[],
  prefix = '',
) {
  if (handle.kind === 'file') {
    const file = await handle.getFile();
    if (isMediaFile(file.name, file.type))
      out.push({ file, handle, path: prefix ? `${prefix}/${handle.name}` : null });
    return;
  }
  for await (const child of handle.values()) {
    if (child.name.startsWith('.')) continue;
    await walkHandle(child, out, prefix ? `${prefix}/${handle.name}` : handle.name);
  }
}

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

function entryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walkEntry(entry: FileSystemEntry, out: Entry[]) {
  if (entry.isFile) {
    const file = await entryFile(entry as FileSystemFileEntry);
    const path = entry.fullPath ? entry.fullPath.replace(/^\//, '') : null;
    if (isMediaFile(file.name, file.type))
      out.push({ file, handle: null, path: path === file.name ? null : path });
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries hands out at most a hundred at a time until it's empty
  for (;;) {
    const batch = await readEntries(reader);
    if (!batch.length) break;
    for (const child of batch) {
      if (child.name.startsWith('.')) continue;
      await walkEntry(child, out);
    }
  }
}

// everything about a DataTransfer must be read before the first await,
// the browser empties it as soon as the drop handler yields.
// returns the collected entries plus any rejection reasons so callers
// can report whether every attempted read failed (e.g. iframe policy).
function collectDrop(transfer: DataTransfer): Promise<{ entries: Entry[]; rejected: string[] }> {
  const out: Entry[] = [];
  const rejected: string[] = [];
  const work: Promise<void>[] = [];
  const items = Array.from(transfer.items ?? []);
  if (items.length) {
    for (const item of items) {
      if (item.kind !== 'file') continue;
      if (item.getAsFileSystemHandle) {
        work.push(
          item
            .getAsFileSystemHandle()
            .then((handle) => {
              if (handle) {
                return walkHandle(handle as FileSystemFileHandle | FileSystemDirectoryHandle, out);
              }
              // the engine resolved the handle to null (sandboxed or
              // CDP-originated drops do exactly this) — the plain File
              // on the DataTransfer needs no handle at all
              const file = item.getAsFile?.();
              if (file && isMediaFile(file.name, file.type))
                out.push({ file, handle: null, path: null });
              return undefined;
            })
            .catch((e: unknown) => {
              // the platform or chooser may grant no handle (NotAllowedError,
              // sandboxed/embedded panes, permission policy) — fall back to the
              // plain DataTransfer File, which needs no permission at all
              const file = item.getAsFile?.();
              if (file && isMediaFile(file.name, file.type)) {
                out.push({ file, handle: null, path: null });
                return;
              }
              rejected.push(describeReject(e));
            }),
        );
      } else {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          work.push(
            walkEntry(entry, out).catch((e: unknown) => {
              rejected.push(describeReject(e));
            }),
          );
        } else {
          const file = item.getAsFile();
          if (file && isMediaFile(file.name, file.type))
            out.push({ file, handle: null, path: null });
        }
      }
    }
  } else {
    for (const file of Array.from(transfer.files)) {
      if (isMediaFile(file.name, file.type)) out.push({ file, handle: null, path: null });
    }
  }
  return Promise.all(work).then(() => ({ entries: out, rejected }));
}

function describeReject(e: unknown): string {
  if (e instanceof DOMException) return e.name
  if (e instanceof Error) return e.message;
  return String(e);
}

async function collect(input: ImportInput): Promise<{ entries: Entry[]; rejected: string[] }> {
  if (input instanceof DataTransfer) return collectDrop(input);
  const out: Entry[] = [];
  const rejected: string[] = [];
  for (const item of input) {
    if (item instanceof File) {
      const path = (item as File & { webkitRelativePath?: string }).webkitRelativePath || null;
      if (isMediaFile(item.name, item.type)) out.push({ file: item, handle: null, path });
    } else if ('kind' in item) {
      // FileSystemHandle is not a global everywhere, the kind tells them apart
      try {
        await walkHandle(item as FileSystemFileHandle | FileSystemDirectoryHandle, out);
      } catch (e) {
        rejected.push(describeReject(e));
      }
    } else {
      out.push(item);
    }
  }
  return { entries: out, rejected };
}

async function buildItem(entry: Entry, binId: string | null): Promise<MediaItem> {
  const mediaId = id();
  const base: MediaItem = {
    ...(await probeFile(entry.file, entry.file.name).catch((e: unknown) => ({
      name: entry.file.name,
      kind: 'video' as const,
      duration: 0,
      width: 0,
      height: 0,
      fps: null,
      hasVideo: false,
      hasAudio: false,
      channels: 0,
      sampleRate: 0,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mimeType: entry.file.type,
      fileSize: entry.file.size,
      rotation: 0 as const,
      alpha: false,
      status: 'unsupported' as const,
      statusReason: `This file can't be read: ${e instanceof Error ? e.message : String(e)}`,
      proxy: null,
      converted: null,
    }))),
    id: mediaId,
    binId,
    label: 'none',
    addedAt: Date.now(),
    thumbnail: null,
  };
  // what it takes to find the same file again after the project is reopened
  base.fileName = entry.file.name;
  base.lastModified = entry.file.lastModified;
  if (entry.path) base.relativePath = entry.path;
  registerSource(mediaId, {
    file: entry.file,
    handle: entry.handle ?? undefined,
    relativePath: entry.path,
  });
  if (base.status === 'ready') {
    base.thumbnail = await posterThumbnail(entry.file, base, { width: 160 }).catch(() => null);
  }
  return base;
}

function summarize(items: MediaItem[]) {
  const ready = items.filter((m) => m.status === 'ready');
  const unsupported = items.filter((m) => m.status === 'unsupported');
  if (ready.length)
    addToast(`${ready.length} file${ready.length === 1 ? '' : 's'} imported`, 'success');
  for (const item of unsupported.slice(0, 3)) {
    addToast(
      `${item.name} needs converting before it can be used${item.statusReason ? `: ${item.statusReason}` : ''}`,
      'warning',
      7000,
    );
  }
  if (unsupported.length > 3)
    addToast(`${unsupported.length - 3} more files need converting`, 'warning', 7000);
}

// cancel handle for the in-flight import, if any — the UI offers this as
// a Cancel button while the import progress row is showing
let activeImport: AbortController | null = null;

export function cancelImport(): void {
  activeImport?.abort();
}

export async function importFiles(
  input: ImportInput,
  opts: { binId?: string | null } = {},
): Promise<MediaItem[]> {
  if (!get(project)) {
    addToast('Open or create a project before importing media', 'warning');
    return [];
  }
  const { entries, rejected } = await collect(input);
  if (!entries.length) {
    const reason = rejected.length ? ` (${rejected[0]})` : '';
    addToast(`No media files found${reason}`, 'warning');
    return [];
  }
  if (rejected.length) {
    addToast(`${rejected.length} item(s) could not be read${rejected[0] ? `: ${rejected[0]}` : ''}`, 'warning', 6000);
  }

  renderStatus.set('importing');
  importProgress.set({ done: 0, total: entries.length, name: entries[0].file.name });
  const items: MediaItem[] = new Array(entries.length);
  let next = 0;
  let done = 0;
  const binId = opts.binId ?? null;
  activeImport = new AbortController();
  const signal = activeImport.signal;

  const worker = async () => {
    while (!signal.aborted && next < entries.length) {
      const index = next++;
      const entry = entries[index];
      importProgress.set({ done, total: entries.length, name: entry.file.name });
      items[index] = await buildItem(entry, binId);
      done++;
      importProgress.set({ done, total: entries.length, name: entry.file.name });
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(PROBE_CONCURRENCY, entries.length) }, worker));
  } finally {
    activeImport = null;
    importProgress.set(null);
    renderStatus.set('idle');
  }

  if (signal.aborted) {
    addToast('Import cancelled — no files were added', 'info', 5000);
    return [];
  }
  const finished = items.filter((item): item is MediaItem => !!item);
  edit('import media', (draft) => {
    draft.media.push(...finished);
  });
  summarize(finished);
  return finished;
}

function inputFallback(opts: { directory?: boolean } = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = MEDIA_EXTENSIONS.map((e) => `.${e}`).join(',');
    if (opts.directory) input.setAttribute('webkitdirectory', '');
    input.style.display = 'none';
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
      input.remove();
    };
    input.oncancel = () => {
      resolve([]);
      input.remove();
    };
    document.body.append(input);
    input.click();
  });
}

function aborted(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

export async function pickFiles(opts: { binId?: string | null } = {}): Promise<MediaItem[]> {
  // The File System Access picker is the preferred path when it works. Any
  // failure other than the user dismissing the picker falls back to the plain
  // HTML file input — the same mechanism the project Open already uses —
  // so a blocked picker / iframe / non-secure-context does not silently
  // block media import.
  try {
    if (typeof window.showOpenFilePicker === 'function') {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: PICKER_TYPES,
        id: 'braincut-media',
      });
      return importFiles(handles, opts);
    }
    return importFiles(await inputFallback(), opts);
  } catch (e) {
    if (aborted(e)) {
      // restricted environments can report every pick — even a genuine
      // file selection — as an abort, so stay quiet only when nothing
      // explanatory would help; give the user something neutral instead
      addToast('Import cancelled — no files were added', 'info', 4000);
      return [];
    }
    // picker failed for a non-cancel reason (SecurityError, TypeError, blocked
    // context, etc.) — fall back to the HTML input rather than throw.
    return importFiles(await inputFallback(), opts);
  }
}

export async function pickFolder(opts: { binId?: string | null } = {}): Promise<MediaItem[]> {
  try {
    if ('showDirectoryPicker' in window) {
      const dir = await window.showDirectoryPicker({ mode: 'read', id: 'braincut-media' });
      const entries: Entry[] = [];
      await walkHandle(dir, entries);
      return importFiles(entries, opts);
    }
    return importFiles(await inputFallback({ directory: true }), opts);
  } catch (e) {
    if (aborted(e)) return [];
    throw e;
  }
}
