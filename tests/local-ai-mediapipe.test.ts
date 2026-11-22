// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mp = vi.hoisted(() => ({
  createSegmenter: vi.fn(),
  createFaceLandmarker: vi.fn(),
  segment: vi.fn(),
  detect: vi.fn(),
  forVisionTasks: vi.fn(async () => ({ local: true })),
}));

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mp.forVisionTasks },
  ImageSegmenter: { createFromOptions: mp.createSegmenter },
  FaceLandmarker: { createFromOptions: mp.createFaceLandmarker },
}));

function fakeContext() {
  const ctx = {
    filter: '', fillStyle: '', globalAlpha: 1,
    compositeHistory: [] as string[],
    createImageData: vi.fn((w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })),
    putImageData: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
    clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
  let composite = '';
  Object.defineProperty(ctx, 'globalCompositeOperation', {
    get: () => composite,
    set: (value: string) => { composite = value; ctx.compositeHistory.push(value); },
  });
  return ctx;
}

function installFakeCanvas() {
  const contexts: Array<ReturnType<typeof fakeContext>> = [];
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag !== 'canvas') return originalCreateElement(tag);
    const context = fakeContext();
    contexts.push(context);
    const canvas = {
      width: 0, height: 0,
      getContext: (kind: string) => (kind === '2d' ? context : null),
    } as unknown as HTMLCanvasElement;
    return canvas;
  });
  return { spy, contexts };
}

const originalCreateElement = document.createElement.bind(document);
const fakeImage = { width: 8, height: 8 } as HTMLImageElement;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mp.forVisionTasks.mockResolvedValue({ local: true });
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network must not be used'); }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function loadSegmentation() {
  return import('../src/lib/segmentation');
}
async function loadRetouch() {
  return import('../src/lib/portraitRetouch');
}

describe('local person segmentation', () => {
  it('uses the local model asset and builds a person mask from category data', async () => {
    const maskClose = vi.fn();
    mp.createSegmenter.mockResolvedValue({ segment: () => mp.segment() });
    mp.segment.mockReturnValue({
      categoryMask: {
        width: 2, height: 1,
        getAsUint8Array: () => new Uint8Array([0, 7]),
        close: maskClose,
      },
    });
    const { spy, contexts } = installFakeCanvas();
    const { computePersonMask } = await loadSegmentation();

    const mask = await computePersonMask(fakeImage);
    expect(mask).not.toBeNull();
    expect(mask!.width).toBe(2);
    expect(mask!.height).toBe(1);
    const alpha = contexts[0].putImageData.mock.calls[0][0].data;
    expect(alpha[3]).toBe(0);   // category 0 = background
    expect(alpha[7]).toBe(255); // other category = person
    expect(maskClose).toHaveBeenCalledTimes(1);
    const options = mp.createSegmenter.mock.calls[0][1];
    expect(options.baseOptions.delegate).toBe('CPU');
    expect(options.baseOptions.modelAssetPath).toContain('models/selfie_multiclass.tflite');
    expect(options.baseOptions.modelAssetPath).not.toMatch(/^https?:/);
    expect(spy).toHaveBeenCalled();
  });

  it('returns null when the model provides no category mask (no fabricated result)', async () => {
    mp.createSegmenter.mockResolvedValue({ segment: () => ({ categoryMask: null }) });
    const { spy } = installFakeCanvas();
    const { computePersonMask } = await loadSegmentation();
    expect(await computePersonMask(fakeImage)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails closed on model initialization failure and allows retry', async () => {
    mp.createSegmenter.mockRejectedValueOnce(new Error('model unavailable')).mockResolvedValueOnce({
      segment: () => ({ categoryMask: null }),
    });
    installFakeCanvas();
    const { computePersonMask } = await loadSegmentation();
    await expect(computePersonMask(fakeImage)).rejects.toThrow('model unavailable');
    expect(await computePersonMask(fakeImage)).toBeNull();
    expect(mp.createSegmenter).toHaveBeenCalledTimes(2);
  });

  it('mode none is a no-op that does not allocate canvases', async () => {
    const { spy } = installFakeCanvas();
    const { applyBackgroundOps, DEFAULT_BACKGROUND_OPS } = await loadSegmentation();
    const target = { width: 8, height: 8, getContext: () => fakeContext() } as unknown as HTMLCanvasElement;
    applyBackgroundOps(target, target, target, DEFAULT_BACKGROUND_OPS);
    expect(spy).not.toHaveBeenCalled();
  });

  it('snapshots the source before clearing the target and preserves the foreground', async () => {
    const { contexts } = installFakeCanvas();
    const { applyBackgroundOps, DEFAULT_BACKGROUND_OPS } = await loadSegmentation();
    const targetContext = fakeContext();
    const target = { width: 8, height: 8, getContext: () => targetContext } as unknown as HTMLCanvasElement;
    applyBackgroundOps(target, target, target, { ...DEFAULT_BACKGROUND_OPS, mode: 'blur' });
    expect(targetContext.drawImage).toHaveBeenCalled();
    expect(targetContext.clearRect).toHaveBeenCalled();
    expect(contexts.some((c) => c.compositeHistory.includes('destination-in'))).toBe(true);
    // Callers pass the target as its own source, so the source must be
    // snapshotted BEFORE the target is cleared or the original pixels are lost.
    expect(contexts[0].drawImage.mock.invocationCallOrder[0])
      .toBeLessThan(targetContext.clearRect.mock.invocationCallOrder[0]);
  });
});

describe('local face landmark detection', () => {
  function setFaceModel(points: Array<{ x: number; y: number }> | null) {
    mp.createFaceLandmarker.mockResolvedValue({
      detect: () => mp.detect(),
    });
    mp.detect.mockReturnValue({ faceLandmarks: points ? [points] : [] });
  }

  it('passes through detector output as normalized points with a local model', async () => {
    const points = Array.from({ length: 478 }, (_, i) => ({ x: (i % 20) / 20, y: Math.floor(i / 20) / 24 }));
    setFaceModel(points);
    const { detectFaceLandmarks } = await loadRetouch();
    const result = await detectFaceLandmarks(fakeImage);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(points);
    const options = mp.createFaceLandmarker.mock.calls[0][1];
    expect(options.baseOptions.modelAssetPath).toContain('models/face_landmarker.task');
    expect(options.baseOptions.delegate).toBe('CPU');
  });

  it('returns no faces when the detector finds none', async () => {
    setFaceModel(null);
    const { detectFaceLandmarks } = await loadRetouch();
    expect(await detectFaceLandmarks(fakeImage)).toEqual([]);
  });

  it('propagates model and processing failures without a false success', async () => {
    mp.createFaceLandmarker.mockRejectedValueOnce(new Error('init failed'));
    const { detectFaceLandmarks } = await loadRetouch();
    await expect(detectFaceLandmarks(fakeImage)).rejects.toThrow('init failed');
    const mod2 = await import('../src/lib/portraitRetouch?retry=1');
    mp.createFaceLandmarker.mockResolvedValue({ detect: () => { throw new Error('detect failed'); } });
    await expect(mod2.detectFaceLandmarks(fakeImage)).rejects.toThrow('detect failed');
  });

  it('zero-strength retouch with no strokes is a no-op', async () => {
    const { spy } = installFakeCanvas();
    const { applyPortraitRetouch } = await loadRetouch();
    const target = { width: 8, height: 8, getContext: () => fakeContext() } as unknown as HTMLCanvasElement;
    applyPortraitRetouch(target, { strength: 0, faces: [], strokes: [] });
    expect(spy).not.toHaveBeenCalled();
  });
});

// Deterministic "local assets missing" coverage at the real external boundary:
// FilesetResolver.forVisionTasks is what resolves the locally-served WASM bundle.
// Rejecting it simulates a 404/missing asset without touching real assets or network.
// Fresh module query strings guarantee an empty cached-init promise per test.
describe('missing local model assets', () => {
  it('segmentation fails honestly on unresolved local assets and recovers after a failed init', async () => {
    mp.forVisionTasks.mockRejectedValueOnce(new Error('local WASM/mask asset unavailable'));
    const { spy } = installFakeCanvas();
    const { computePersonMask } = await import('../src/lib/segmentation?missing-asset=1');
    await expect(computePersonMask(fakeImage)).rejects.toThrow('local WASM/mask asset unavailable');
    expect(spy).not.toHaveBeenCalled(); // no canvas or mask fabricated on failure

    mp.createSegmenter.mockResolvedValueOnce({ segment: () => ({ categoryMask: null }) });
    expect(await computePersonMask(fakeImage)).toBeNull(); // failed-init cache was cleared
  });

  it('face landmarks fail honestly on unresolved local assets and recover after a failed init', async () => {
    mp.forVisionTasks.mockRejectedValueOnce(new Error('local face model asset unavailable'));
    const { detectFaceLandmarks } = await import('../src/lib/portraitRetouch?missing-asset=1');
    await expect(detectFaceLandmarks(fakeImage)).rejects.toThrow('local face model asset unavailable');

    mp.createFaceLandmarker.mockResolvedValueOnce({ detect: () => ({ faceLandmarks: [] }) });
    expect(await detectFaceLandmarks(fakeImage)).toEqual([]); // failed-init cache was cleared
  });
});
