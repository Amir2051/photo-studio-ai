// Local background segmentation for Minu Studio.
// Uses MediaPipe's on-device selfie multiclass model. The model runs fully in the
// browser; no image data ever leaves the device for these operations.
import type { ImageSegmenter } from '@mediapipe/tasks-vision';

export type BackgroundMode = 'none' | 'blur' | 'dim' | 'color' | 'gradient';

export interface BackgroundOps {
  mode: BackgroundMode;
  /** Hex color used when mode === 'color'. */
  color: string;
  /** Blur radius in pixels, scaled relative to image size when mode === 'blur'. */
  blur: number;
  /** Overlay alpha 0..1 used when mode === 'dim'. */
  dim: number;
}

export const DEFAULT_BACKGROUND_OPS: BackgroundOps = {
  mode: 'none',
  color: '#1b1e1a',
  blur: 24,
  dim: 0.45,
};

let segmenterPromise: Promise<ImageSegmenter> | null = null;

async function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe`);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${import.meta.env.BASE_URL}models/selfie_multiclass.tflite`,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })().catch((error) => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

/**
 * Computes a binary person mask (white = person, black = background) at the
 * segmentation model's internal resolution. Returns null if segmentation is
 * unavailable; callers must treat null as "no-op, do not fabricate a mask".
 */
export async function computePersonMask(
  image: HTMLImageElement,
): Promise<HTMLCanvasElement | null> {
  const segmenter = await getSegmenter();
  const result = segmenter.segment(image);
  const categoryMask = result.categoryMask;
  if (!categoryMask) return null;
  const { width, height } = categoryMask;
  const categories = categoryMask.getAsUint8Array();
  categoryMask.close();

  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const context = mask.getContext('2d');
  if (!context) return null;
  const imageData = context.createImageData(width, height);
  for (let i = 0; i < categories.length; i += 1) {
    // Category 0 is background in the selfie multiclass model; every other
    // category (hair, skin, clothes, accessories...) belongs to the person.
    const person = categories[i] !== 0;
    const offset = i * 4;
    imageData.data[offset] = 255;
    imageData.data[offset + 1] = 255;
    imageData.data[offset + 2] = 255;
    imageData.data[offset + 3] = person ? 255 : 0;
  }
  context.putImageData(imageData, 0, 0);
  return mask;
}

function drawGradient(context: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#3a4a63');
  gradient.addColorStop(0.55, '#171c26');
  gradient.addColorStop(1, '#090c12');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

/**
 * Applies background operations to a fully-rendered source canvas in place.
 * The person (from the mask) is always preserved untouched; only the
 * background region is blurred, dimmed, or replaced.
 */
export function applyBackgroundOps(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement | HTMLImageElement,
  personMask: HTMLCanvasElement,
  ops: BackgroundOps,
): void {
  if (ops.mode === 'none') return;
  const { width, height } = target;
  const context = target.getContext('2d');
  if (!context) return;

  // Snapshot the source first: callers may pass the target canvas itself,
  // so we can never read from `target` after clearing it.
  const snapshot = document.createElement('canvas');
  snapshot.width = width;
  snapshot.height = height;
  const snapshotContext = snapshot.getContext('2d');
  if (!snapshotContext) return;
  snapshotContext.drawImage(source, 0, 0, width, height);

  // Build an anti-aliased foreground: the snapshot clipped to the person mask.
  const foreground = document.createElement('canvas');
  foreground.width = width;
  foreground.height = height;
  const foregroundContext = foreground.getContext('2d');
  if (!foregroundContext) return;
  foregroundContext.drawImage(snapshot, 0, 0, width, height);
  // Feather the mask edge a little so subject cutouts don't look hard.
  const feather = document.createElement('canvas');
  feather.width = width;
  feather.height = height;
  const featherContext = feather.getContext('2d');
  if (!featherContext) return;
  featherContext.filter = `blur(${Math.max(1, Math.round(Math.max(width, height) / 900))}px)`;
  featherContext.drawImage(personMask, 0, 0, width, height);
  featherContext.filter = 'none';
  foregroundContext.globalCompositeOperation = 'destination-in';
  foregroundContext.drawImage(feather, 0, 0);
  foregroundContext.globalCompositeOperation = 'source-over';

  context.save();
  context.clearRect(0, 0, width, height);
  if (ops.mode === 'blur') {
    const radius = Math.max(2, Math.round((ops.blur * Math.max(width, height)) / 2400));
    context.filter = `blur(${radius}px) saturate(0.9)`;
    context.drawImage(snapshot, 0, 0, width, height);
    context.filter = 'none';
  } else if (ops.mode === 'dim') {
    context.drawImage(snapshot, 0, 0, width, height);
    context.fillStyle = `rgba(6, 8, 12, ${Math.min(1, Math.max(0, ops.dim))})`;
    // Dim everywhere, then repaint the untouched person on top.
    context.fillRect(0, 0, width, height);
  } else if (ops.mode === 'color') {
    context.fillStyle = ops.color;
    context.fillRect(0, 0, width, height);
  } else if (ops.mode === 'gradient') {
    drawGradient(context, width, height);
  }
  context.drawImage(foreground, 0, 0);
  context.restore();
}
