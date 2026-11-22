// Culling analysis and session helpers for Minu Studio.
// All analysis runs locally on downscaled canvases. The assist score is a
// deterministic heuristic (sharpness / exposure / contrast / face presence),
// not an aesthetic AI judgment — photographers make the final call.

export type CullLabel = 'none' | 'pick' | 'reject';
export type CullFilter = 'all' | 'picked' | 'rejected' | 'unrated';
export type CullSort = 'imported' | 'score' | 'rating';

export interface CullItem {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  /** Downscaled JPEG data URL used for grid, loupe and persistence. */
  dataUrl: string;
  width: number;
  height: number;
  rating: number; // 0..5, 0 = unrated
  label: CullLabel;
  score: number; // 0..100 heuristic assist
  sharpness: number; // normalized 0..1
  exposure: number; // mean luminance 0..1
  contrast: number; // normalized 0..1
  faces: number;
}

const ANALYZE_EDGE = 256;
const PREVIEW_EDGE = 1600;

export interface QualityStats {
  sharpness: number;
  exposure: number;
  contrast: number;
}

/** Deterministic assist score. Exported for testing. */
export function computeScore(stats: QualityStats, faces: number): number {
  const { sharpness, exposure, contrast } = stats;
  const exposureScore = Math.max(0, 1 - Math.abs(exposure - 0.45) / 0.45);
  const base = 0.55 * clamp01(sharpness) + 0.3 * exposureScore + 0.15 * clamp01(contrast);
  // Small bonus when a face is present and reasonably exposed — portraits with
  // faces are usually intentional selects.
  const bonus = faces > 0 ? 0.05 : 0;
  return Math.round(Math.min(1, base + bonus) * 100);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Filters a cull set by the active filter. Exported for testing. */
export function filterItems(items: CullItem[], filter: CullFilter): CullItem[] {
  switch (filter) {
    case 'picked':
      return items.filter((item) => item.label === 'pick');
    case 'rejected':
      return items.filter((item) => item.label === 'reject');
    case 'unrated':
      return items.filter((item) => item.rating === 0 && item.label === 'none');
    default:
      return items;
  }
}

/** Sorts a cull set. Exported for testing. */
export function sortItems(items: CullItem[], sort: CullSort): CullItem[] {
  const copy = [...items];
  if (sort === 'score') return copy.sort((a, b) => b.score - a.score);
  if (sort === 'rating') return copy.sort((a, b) => b.rating - a.rating);
  return copy.sort((a, b) => a.lastModified - b.lastModified);
}

/** Builds a CSV report of the cull session. Exported for testing. */
export function itemsToCsv(items: CullItem[]): string {
  const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;
  const header = 'file,rating,label,score,sharpness,exposure,contrast,faces';
  const rows = items.map((item) =>
    [
      escape(item.name),
      String(item.rating),
      item.label,
      String(item.score),
      item.sharpness.toFixed(3),
      item.exposure.toFixed(3),
      item.contrast.toFixed(3),
      String(item.faces),
    ].join(','),
  );
  return [header, ...rows].join('\r\n');
}

function analyzePixels(context: CanvasRenderingContext2D, width: number, height: number): QualityStats {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const count = width * height;
  const gray = new Float32Array(count);
  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    const offset = i * 4;
    const value =
      data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    gray[i] = value;
    sum += value;
  }
  const mean = sum / count;
  let varianceSum = 0;
  for (let i = 0; i < count; i += 1) {
    const delta = gray[i] - mean;
    varianceSum += delta * delta;
  }
  const stddev = Math.sqrt(varianceSum / count);

  // Variance of a 4-neighbour Laplacian — a standard sharpness proxy.
  let lapSum = 0;
  let lapSq = 0;
  let lapCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const lap =
        4 * gray[y * width + x] -
        gray[y * width + (x - 1)] -
        gray[y * width + (x + 1)] -
        gray[(y - 1) * width + x] -
        gray[(y + 1) * width + x];
      lapSum += lap;
      lapSq += lap * lap;
      lapCount += 1;
    }
  }
  const lapMean = lapCount ? lapSum / lapCount : 0;
  const lapVariance = lapCount ? lapSq / lapCount - lapMean * lapMean : 0;
  const sharpness = clamp01(Math.sqrt(Math.max(0, lapVariance)) / 90);
  return {
    sharpness,
    exposure: clamp01(mean / 255),
    contrast: clamp01(stddev / 72),
  };
}

async function decodeToCanvas(
  file: File,
  maxEdge: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap) {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an analysis canvas.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return { canvas, width: canvas.width, height: canvas.height };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('This image format could not be decoded.'));
      element.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an analysis canvas.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { canvas, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface AnalyzedFile {
  item: Omit<CullItem, 'id' | 'rating' | 'label'>;
}

/** Decodes, downsizes and scores one file. Face detection is injected so tests
 * can run without MediaPipe. */
export async function analyzeFile(
  file: File,
  detectFaces: (image: HTMLImageElement) => Promise<NormalizedPointLike[][]> = async () => [],
): Promise<AnalyzedFile> {
  const { canvas, width, height } = await decodeToCanvas(file, ANALYZE_EDGE);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not analyze this image.');
  const stats = analyzePixels(context, width, height);

  let faces = 0;
  try {
    const preview = await decodeToCanvas(file, 720);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not decode this image for face detection.'));
      element.src = preview.canvas.toDataURL('image/jpeg', 0.85);
    });
    faces = (await detectFaces(image)).length;
  } catch {
    faces = 0; // Face detection is best-effort; scoring still works without it.
  }

  const previewEdge = await decodeToCanvas(file, PREVIEW_EDGE);
  return {
    item: {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      dataUrl: previewEdge.canvas.toDataURL('image/jpeg', 0.82),
      width: previewEdge.width,
      height: previewEdge.height,
      score: computeScore(stats, faces),
      sharpness: stats.sharpness,
      exposure: stats.exposure,
      contrast: stats.contrast,
      faces,
    },
  };
}

export type NormalizedPointLike = { x: number; y: number };
