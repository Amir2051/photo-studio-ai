import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const rootWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const videoWorker = readFileSync(
  new URL('../public/video-studio/service-worker.js', import.meta.url),
  'utf8',
);
const videoWorkerSource = readFileSync(
  new URL('../vendor/braincut/src/service-worker.ts', import.meta.url),
  'utf8',
);

async function activatedCacheDeletes(source: string, pathname: string): Promise<string[]> {
  const listeners = new Map<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void>();
  const deleted: string[] = [];
  const names = [
    'every-frame-first-shell-v0',
    'every-frame-first-shell-v1',
    'braincut-app-old',
    'braincut-app-1794239859131',
    'braincut-v1',
    'braincut-ffmpeg-v1',
    'braincut-config-v1',
    'braincut-legacy-cache',
    'another-app-cache',
  ];
  const self = {
    addEventListener: (type: string, handler: (event: { waitUntil: (promise: Promise<unknown>) => void }) => void) =>
      listeners.set(type, handler),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
    location: { origin: 'https://studio.test' },
  };
  const caches = {
    keys: async () => names,
    delete: async (name: string) => {
      deleted.push(name);
      return true;
    },
    open: async () => ({ addAll: async () => undefined }),
    match: async () => undefined,
  };

  runInNewContext(source, { self, caches, location: { pathname } });
  let activation: Promise<unknown> | undefined;
  listeners.get('activate')?.({ waitUntil: (promise) => (activation = promise) });
  await activation;
  return deleted;
}

describe('service-worker cache ownership', () => {
  it('lets the photo app remove only obsolete photo-app caches', async () => {
    await expect(activatedCacheDeletes(rootWorker, '/sw.js')).resolves.toEqual([
      'every-frame-first-shell-v0',
    ]);
  });

  it('lets the video editor remove only obsolete brainCUT caches', async () => {
    await expect(
      activatedCacheDeletes(videoWorker, '/video-studio/service-worker.js'),
    ).resolves.toEqual(['braincut-app-old', 'braincut-legacy-cache']);
  });

  it('keeps the editable brainCUT source aligned with the deployed worker', () => {
    expect(videoWorkerSource).toContain(
      "names.filter((n) => n.startsWith('braincut-') && !keep.includes(n))",
    );
  });
});
