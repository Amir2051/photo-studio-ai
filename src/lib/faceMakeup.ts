import type { NormalizedPoint } from './portraitRetouch';

export type FaceMakeupSettings = {
  blush: number;
  lipstick: number;
  eyeshadow: number;
};

export const DEFAULT_FACE_MAKEUP: FaceMakeupSettings = {
  blush: 0,
  lipstick: 0,
  eyeshadow: 0,
};

export function clampMakeupStrength(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

const LIPS = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
];
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

function fillLandmarkPolygon(
  context: CanvasRenderingContext2D,
  face: NormalizedPoint[],
  indices: number[],
  width: number,
  height: number,
): void {
  const first = face[indices[0]];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x * width, first.y * height);
  for (const index of indices.slice(1)) {
    const point = face[index];
    if (point) context.lineTo(point.x * width, point.y * height);
  }
  context.closePath();
  context.fill();
}

/** Applies subtle face-aligned makeup to the same canvas used by preview and export. */
export function applyFaceMakeup(
  canvas: HTMLCanvasElement,
  faces: NormalizedPoint[][],
  settings: FaceMakeupSettings,
): void {
  const blush = clampMakeupStrength(settings.blush);
  const lipstick = clampMakeupStrength(settings.lipstick);
  const eyeshadow = clampMakeupStrength(settings.eyeshadow);
  if (!faces.length || (!blush && !lipstick && !eyeshadow)) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  context.save();
  for (const face of faces) {
    const leftCheek = face[50];
    const rightCheek = face[280];
    if (blush && leftCheek && rightCheek) {
      const faceTop = face[10];
      const chin = face[152];
      const faceHeight = faceTop && chin ? Math.abs(chin.y - faceTop.y) * height : height * 0.25;
      const radiusX = Math.max(5, faceHeight * 0.105);
      const radiusY = Math.max(4, faceHeight * 0.065);
      context.globalCompositeOperation = 'soft-light';
      context.globalAlpha = 0.08 + (blush / 100) * 0.34;
      for (const cheek of [leftCheek, rightCheek]) {
        const x = cheek.x * width;
        const y = cheek.y * height;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radiusX);
        gradient.addColorStop(0, 'rgba(242, 91, 132, 0.72)');
        gradient.addColorStop(0.55, 'rgba(242, 91, 132, 0.28)');
        gradient.addColorStop(1, 'rgba(242, 91, 132, 0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    if (lipstick) {
      context.globalCompositeOperation = 'multiply';
      context.globalAlpha = (lipstick / 100) * 0.48;
      context.fillStyle = '#c52f58';
      fillLandmarkPolygon(context, face, LIPS, width, height);
    }
    if (eyeshadow) {
      context.globalCompositeOperation = 'multiply';
      context.globalAlpha = (eyeshadow / 100) * 0.22;
      context.fillStyle = '#9861a8';
      fillLandmarkPolygon(context, face, LEFT_EYE, width, height);
      fillLandmarkPolygon(context, face, RIGHT_EYE, width, height);
    }
  }
  context.restore();
}
