// Local blemish detection for portrait retouching.
// Heuristic, on-device analysis: finds small, skin-colored spots inside face
// regions (excluding eyes, brows and lips) that are darker or redder than their
// surroundings. No image data leaves the browser. This is a detection helper —
// the user decides whether to apply healing.

import type { NormalizedPoint } from './portraitRetouch';

export interface BlemishSpot {
  /** Normalized center, relative to the analyzed source size. */
  x: number;
  y: number;
  /** Normalized radius (relative to max source dimension). */
  radius: number;
}

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
const EXCLUDE = [
  // eyes, brows, lips — never flagged as blemishes
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
  70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
  336, 296, 334, 293, 300, 285, 295, 282, 283, 276,
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
];

function polygon(
  context: CanvasRenderingContext2D,
  points: NormalizedPoint[],
  indices: number[],
  width: number,
  height: number,
): void {
  const first = points[indices[0]];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x * width, first.y * height);
  for (const index of indices.slice(1)) {
    const point = points[index];
    if (point) context.lineTo(point.x * width, point.y * height);
  }
  context.closePath();
  context.fill();
}

const ANALYZE_EDGE = 384;

/**
 * Detects candidate blemish spots inside detected faces. Returns up to 24 spots,
 * largest-contrast first. Returns an empty array when detection is unavailable —
 * it never invents spots.
 */
export function detectBlemishes(
  source: HTMLImageElement | HTMLCanvasElement,
  faces: NormalizedPoint[][],
): BlemishSpot[] {
  if (!faces.length) return [];
  const naturalWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const naturalHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!naturalWidth || !naturalHeight) return [];
  const scale = Math.min(1, ANALYZE_EDGE / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(48, Math.round(naturalWidth * scale));
  const height = Math.max(48, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(source, 0, 0, width, height);

  // Face skin mask = face ovals with eyes/brows/lips removed.
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskContext) return [];
  maskContext.fillStyle = '#fff';
  for (const face of faces) polygon(maskContext, face, FACE_OVAL, width, height);
  maskContext.globalCompositeOperation = 'destination-out';
  for (const face of faces) polygon(maskContext, face, EXCLUDE, width, height);
  const maskData = maskContext.getImageData(0, 0, width, height).data;

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Integral image of luminance for O(1) local means.
  const integral = new Float64Array((width + 1) * (height + 1));
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < lum.length; i += 1, p += 1) {
    lum[i] = data[p * 4] * 0.2126 + data[p * 4 + 1] * 0.7152 + data[p * 4 + 2] * 0.0722;
  }
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) {
      rowSum += lum[y * width + x];
      const index = (y + 1) * (width + 1) + (x + 1);
      integral[index] = integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }
  const localMean = (cx: number, cy: number, radius: number): number => {
    const x0 = Math.max(0, cx - radius);
    const y0 = Math.max(0, cy - radius);
    const x1 = Math.min(width - 1, cx + radius);
    const y1 = Math.min(height - 1, cy + radius);
    const sum =
      integral[(y1 + 1) * (width + 1) + (x1 + 1)] -
      integral[y0 * (width + 1) + (x1 + 1)] -
      integral[(y1 + 1) * (width + 1) + x0] +
      integral[y0 * (width + 1) + x0];
    return sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
  };

  // Mark candidate pixels: notably darker than local surroundings, or distinctly redder.
  const candidate = new Uint8Array(width * height);
  const radius = Math.max(4, Math.round(Math.max(width, height) * 0.018));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (maskData[p * 4 + 3] < 128) continue;
      const i = p * 4;
      const value = lum[p];
      const mean = localMean(x, y, radius);
      const darker = mean - value > Math.max(14, mean * 0.16);
      const redder = data[i] > data[i + 1] * 1.18 && data[i] > data[i + 2] * 1.18 && data[i] - mean > 4;
      if ((darker || redder) && value > 24) candidate[p] = 1;
    }
  }

  // Connected components (4-neighbour), sized to spot-like clusters.
  const visited = new Uint8Array(candidate.length);
  const spots: Array<{ x: number; y: number; size: number; contrast: number }> = [];
  const stack: number[] = [];
  for (let start = 0; start < candidate.length; start += 1) {
    if (!candidate[start] || visited[start]) continue;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let sumContrast = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % width;
      const py = (p / width) | 0;
      count += 1;
      sumX += px;
      sumY += py;
      sumContrast += Math.max(0, localMean(px, py, radius) - lum[p]);
      const neighbours = [p - 1, p + 1, p - width, p + width];
      for (const n of neighbours) {
        if (n < 0 || n >= candidate.length) continue;
        const nx = n % width;
        if (Math.abs(nx - px) > 1) continue; // row wrap guard
        if (candidate[n] && !visited[n]) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }
    if (count >= 3 && count <= Math.max(220, width * height * 0.004)) {
      spots.push({ x: sumX / count, y: sumY / count, size: count, contrast: sumContrast / count });
    }
  }

  spots.sort((a, b) => b.contrast - a.contrast);
  const maxDim = Math.max(width, height);
  return spots.slice(0, 24).map((spot) => ({
    x: spot.x / width,
    y: spot.y / height,
    radius: Math.max(2.2 / maxDim, Math.sqrt(spot.size / Math.PI) / maxDim) * 1.7,
  }));
}
