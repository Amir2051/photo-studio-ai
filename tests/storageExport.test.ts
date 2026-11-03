import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportPhotosToZip, savePhoto } from '../src/lib/storage';
import type { Photo } from '../src/lib/types';

describe('photo archive export', () => {
  it('creates a real ZIP archive containing original photo bytes', async () => {
    const id = 'zip-test-' + crypto.randomUUID();
    const photo: Photo = {
      id,
      name: 'test portrait.png',
      type: 'png',
      size: 5,
      dimensions: { width: 1, height: 1 },
      dataUrl: 'data:image/jpeg;base64,aGVsbG8=',
      dataUrlHigh: 'data:image/png;base64,aGVsbG8=',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edits: [],
      filterIntensity: 100,
      isOriginalRequired: true,
      tags: [],
    };
    await savePhoto(photo);
    const archive = await exportPhotosToZip([id]);
    expect(archive.type).toBe('application/zip');
    const zip = await JSZip.loadAsync(archive);
    const entry = zip.file('every-frame-first-photos/test portrait.png');
    expect(entry).not.toBeNull();
    await expect(entry!.async('string')).resolves.toBe('hello');
  });

  it('rejects an empty selection instead of creating a misleading archive', async () => {
    await expect(exportPhotosToZip(['not-a-saved-photo'])).rejects.toThrow(/No saved photos/);
  });
});
