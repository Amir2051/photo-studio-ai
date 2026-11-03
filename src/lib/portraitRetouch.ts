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

export function applyPortraitRetouch(
  canvas: HTMLCanvasElement,
  options: {
    strength: number;
    faces: NormalizedPoint[][];
    strokes: BrushStroke[];
  },
): void {
  const { strength, faces, strokes } = options;
  if (strength <= 0 || (!faces.length && !strokes.length)) return;
  const { width, height } = canvas;
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext('2d');
  if (!maskContext) return;

  maskContext.fillStyle = '#fff';
  for (const face of faces) {
    polygon(maskContext, face, FACE_OVAL, width, height);
    maskContext.globalCompositeOperation = 'destination-out';
    polygon(maskContext, face, LEFT_EYE, width, height);
    polygon(maskContext, face, RIGHT_EYE, width, height);
    polygon(maskContext, face, LEFT_BROW, width, height);
    polygon(maskContext, face, RIGHT_BROW, width, height);
    polygon(maskContext, face, LIPS, width, height);
    maskContext.globalCompositeOperation = 'source-over';
  }
  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    maskContext.beginPath();
    maskContext.lineCap = 'round';
    maskContext.lineJoin = 'round';
    maskContext.lineWidth = (stroke.size / 1000) * Math.max(width, height);
    maskContext.strokeStyle = '#fff';
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

  const feather = document.createElement('canvas');
  feather.width = width;
  feather.height = height;
  const featherContext = feather.getContext('2d');
  if (!featherContext) return;
  featherContext.filter = `blur(${Math.max(2, Math.min(18, width / 300))}px)`;
  featherContext.drawImage(mask, 0, 0);
  featherContext.filter = 'none';

  const softened = document.createElement('canvas');
  softened.width = width;
  softened.height = height;
  const softenedContext = softened.getContext('2d');
  if (!softenedContext) return;
  softenedContext.filter = `blur(${1 + (strength / 100) * 5}px)`;
  softenedContext.drawImage(canvas, 0, 0);
  softenedContext.filter = 'none';
  softenedContext.globalCompositeOperation = 'destination-in';
  softenedContext.drawImage(feather, 0, 0);

  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.globalAlpha = Math.min(0.72, (strength / 100) * 0.72);
  context.drawImage(softened, 0, 0);
  context.restore();
}
