import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportPhotosToZip, getPhoto, savePhoto } from '../src/lib/storage';
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

  it('persists selection strokes, inversion, and feather settings across reopen', async () => {
    const id = 'selection-roundtrip-' + crypto.randomUUID();
    const selection = {
      strokes: [
        {
          points: [
            { x: 0.2, y: 0.3 },
            { x: 0.4, y: 0.5 },
          ],
          size: 32,
          operation: 'add' as const,
        },
        {
          points: [{ x: 0.3, y: 0.4 }],
          size: 18,
          operation: 'subtract' as const,
        },
      ],
      inverted: true,
      feather: 42,
    };
    const photo: Photo = {
      id,
      name: 'selection-project.png',
      type: 'png',
      size: 5,
      dimensions: { width: 1, height: 1 },
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edits: [],
      filterIntensity: 100,
      isOriginalRequired: true,
      tags: [],
      selection,
    };
    await savePhoto(photo);
    await expect(getPhoto(id)).resolves.toMatchObject({ selection });
  });

  it('rejects an empty selection instead of creating a misleading archive', async () => {
    await expect(exportPhotosToZip(['not-a-saved-photo'])).rejects.toThrow(/No saved photos/);
  });
});
