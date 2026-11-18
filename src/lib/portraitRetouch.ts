import type { FaceLandmarker } from '@mediapipe/tasks-vision';

export type NormalizedPoint = { x: number; y: number };
export type BrushStroke = { points: NormalizedPoint[]; size: number };

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe`);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${import.meta.env.BASE_URL}models/face_landmarker.task`,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 8,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })().catch((error) => {
      faceLandmarkerPromise = null;
      throw error;
    });
  }
  return faceLandmarkerPromise;
}

export async function detectFaceLandmarks(image: HTMLImageElement): Promise<NormalizedPoint[][]> {
  const detector = await getFaceLandmarker();
  const result = detector.detect(image);
  return result.faceLandmarks.map((face) => face.map(({ x, y }) => ({ x, y })));
}

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const LIPS = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
];
const LEFT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const RIGHT_BROW = [336, 296, 334, 293, 300, 285, 295, 282, 283, 276];

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

/** Softens skin while preserving detail. Per-face strengths (0-100, null = use the
 * global strength) let each detected face be retouched independently. */
export function applyPortraitRetouch(
  canvas: HTMLCanvasElement,
  options: {
    strength: number;
    faces: NormalizedPoint[][];
    strokes: BrushStroke[];
    faceStrengths?: Array<number | null>;
  },
): void {
  const { strength, faces, strokes, faceStrengths } = options;
  const perFace = faces.map((_, index) => {
    const override = faceStrengths?.[index];
    const value = override === null || override === undefined ? strength : override;
    return Math.max(0, Math.min(100, value));
  });
  const strokeAlpha = Math.min(1, (Math.min(100, strength) / 100) * 0.92);
  if (!perFace.some((value) => value > 0) && !(strokes.length && strokeAlpha > 0)) return;
  const { width, height } = canvas;

  const softened = document.createElement('canvas');
  softened.width = width;
  softened.height = height;
  const softenedContext = softened.getContext('2d');
  if (!softenedContext) return;
  const imageScale = Math.max(1, Math.max(width, height) / 2200);
  // Scale the blur with image resolution so preview and full-resolution export
  // retain a similar visual strength instead of making the export look untouched.
  const blurRadius = (1.4 + (Math.min(100, strength) / 100) * 7.2) * imageScale;
  softenedContext.filter = `blur(${blurRadius.toFixed(2)}px)`;
  softenedContext.drawImage(canvas, 0, 0);
  softenedContext.filter = 'none';

  const context = canvas.getContext('2d');
  if (!context) return;
  const alphaFor = (value: number): number =>
    Math.min(0.68, 0.08 + (Math.min(100, value) / 100) * 0.6);

  const featheredMaskFor = (fill: (maskContext: CanvasRenderingContext2D) => void) => {
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const maskContext = mask.getContext('2d');
    if (!maskContext) return null;
    maskContext.fillStyle = '#fff';
    fill(maskContext);
    const feather = document.createElement('canvas');
    feather.width = width;
    feather.height = height;
    const featherContext = feather.getContext('2d');
    if (!featherContext) return null;
    featherContext.filter = `blur(${Math.max(3, Math.min(24, (width / 260) * imageScale))}px)`;
    featherContext.drawImage(mask, 0, 0);
    featherContext.filter = 'none';
    return feather;
  };

  const paint = (mask: HTMLCanvasElement | null, alpha: number) => {
    if (!mask || alpha <= 0) return;
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerContext = layer.getContext('2d');
    if (!layerContext) return;
    layerContext.drawImage(softened, 0, 0);
    layerContext.globalCompositeOperation = 'destination-in';
    layerContext.drawImage(mask, 0, 0);
    context.save();
    context.globalAlpha = alpha;
    context.drawImage(layer, 0, 0);
    context.restore();
  };

  faces.forEach((face, index) => {
    const faceStrength = perFace[index];
    if (faceStrength <= 0) return;
    const mask = featheredMaskFor((maskContext) => {
      polygon(maskContext, face, FACE_OVAL, width, height);
      maskContext.globalCompositeOperation = 'destination-out';
      polygon(maskContext, face, LEFT_EYE, width, height);
      polygon(maskContext, face, RIGHT_EYE, width, height);
      polygon(maskContext, face, LEFT_BROW, width, height);
      polygon(maskContext, face, RIGHT_BROW, width, height);
      polygon(maskContext, face, LIPS, width, height);
      maskContext.globalCompositeOperation = 'source-over';
    });
    paint(mask, alphaFor(faceStrength));
  });

  if (strokes.length) {
    const strokeMask = featheredMaskFor((maskContext) => {
      maskContext.beginPath();
      maskContext.lineCap = 'round';
      maskContext.lineJoin = 'round';
      maskContext.lineWidth = (strokeSizeOf(strokes) / 1000) * Math.max(width, height);
      maskContext.strokeStyle = '#fff';
      for (const stroke of strokes) {
        if (!stroke.points.length) continue;
        maskContext.lineWidth = (stroke.size / 1000) * Math.max(width, height);
        maskContext.beginPath();
        maskContext.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
        for (const point of stroke.points.slice(1)) {
          maskContext.lineTo(point.x * width, point.y * height);
        }
        if (stroke.points.length === 1) {
          const point = stroke.points[0];
          maskContext.lineTo(point.x * width + 0.01, point.y * height + 0.01);
        }
        maskContext.stroke();
      }
    });
    paint(strokeMask, strokeAlpha);
  }
}

function strokeSizeOf(strokes: BrushStroke[]): number {
  return strokes.reduce((max, stroke) => Math.max(max, stroke.size), 1);
}

const LEFT_EYE_REGION = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_REGION = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

/**
 * Softens specular highlights (e.g. glasses glare) inside the eye regions of each
 * detected face. Runs locally on the canvas; pixels whose luminance is clipped
 * (> threshold) are pulled toward the region's local average instead of being
 * painted over with a flat color.
 */
export function suppressSpecularGlare(
  canvas: HTMLCanvasElement,
  faces: NormalizedPoint[][],
  intensity = 60,
): void {
  if (!faces.length || intensity <= 0) return;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const { width, height } = canvas;
  const strength = Math.max(0, Math.min(100, intensity)) / 100;
  const threshold = 235 - Math.round(strength * 25); // stronger intensity -> lower threshold

  const regionBounds = (face: NormalizedPoint[], indices: number[]) => {
    const points = indices
      .map((index) => face[index])
      .filter((point): point is NormalizedPoint => Boolean(point));
    if (!points.length) return null;
    const padX = (Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))) * 1.9 + 0.02;
    const padY = (Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))) * 2.6 + 0.02;
    const cx = (Math.max(...points.map((p) => p.x)) + Math.min(...points.map((p) => p.x))) / 2;
    const cy = (Math.max(...points.map((p) => p.y)) + Math.min(...points.map((p) => p.y))) / 2;
    return {
      x: Math.max(0, Math.floor((cx - padX) * width)),
      y: Math.max(0, Math.floor((cy - padY) * height)),
      w: Math.min(width, Math.ceil((cx + padX) * width)) - Math.max(0, Math.floor((cx - padX) * width)),
      h: Math.min(height, Math.ceil((cy + padY) * height)) - Math.max(0, Math.floor((cy - padY) * height)),
    };
  };

  for (const face of faces) {
    for (const indices of [LEFT_EYE_REGION, RIGHT_EYE_REGION]) {
      const bounds = regionBounds(face, indices);
      if (!bounds || bounds.w < 4 || bounds.h < 4) continue;
      const imageData = context.getImageData(bounds.x, bounds.y, bounds.w, bounds.h);
      const data = imageData.data;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        count += 1;
      }
      const mean = count ? sum / count : 128;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        // Specular glare: very bright and nearly neutral (unsaturated).
        if (lum > threshold && spread < 34) {
          const pull = Math.min(1, (lum - threshold) / 64) * strength;
          data[i] = Math.round(r + (Math.min(r, mean) - r) * pull);
          data[i + 1] = Math.round(g + (Math.min(g, mean) - g) * pull);
          data[i + 2] = Math.round(b + (Math.min(b, mean) - b) * pull);
        }
      }
      context.putImageData(imageData, 0, 0);
    }
  }
}
