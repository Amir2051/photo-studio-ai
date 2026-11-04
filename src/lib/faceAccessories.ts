import type { NormalizedPoint } from './portraitRetouch';

export type FaceAccessory =
  | 'none'
  | 'glasses'
  | 'sunglasses'
  | 'bunny-ears'
  | 'crown'
  | 'puppy'
  | 'heart-eyes'
  | 'freckles'
  | 'flower-crown';
export type FaceAccessorySettings = {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  opacity: number;
};
export const DEFAULT_FACE_ACCESSORY_SETTINGS: FaceAccessorySettings = {
  scale: 100,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  opacity: 100,
};
export function clampAccessorySettings(settings: FaceAccessorySettings): FaceAccessorySettings {
  const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
  return {
    scale: Math.max(50, Math.min(160, finite(settings.scale, 100))),
    offsetX: Math.max(-50, Math.min(50, finite(settings.offsetX, 0))),
    offsetY: Math.max(-50, Math.min(50, finite(settings.offsetY, 0))),
    rotation: Math.max(-45, Math.min(45, finite(settings.rotation, 0))),
    opacity: Math.max(0, Math.min(100, finite(settings.opacity, 100))),
  };
}

const point = (face: NormalizedPoint[], index: number) => face[index];
function centerOf(face: NormalizedPoint[], indices: number[]): NormalizedPoint | null {
  const points = indices
    .map((index) => point(face, index))
    .filter((item): item is NormalizedPoint => Boolean(item));
  if (!points.length) return null;
  return {
    x: points.reduce((sum, item) => sum + item.x, 0) / points.length,
    y: points.reduce((sum, item) => sum + item.y, 0) / points.length,
  };
}
export function getAccessoryAnchor(
  face: NormalizedPoint[],
): { center: NormalizedPoint; width: number; height: number; roll: number } | null {
  const left = point(face, 127);
  const right = point(face, 356);
  const top = point(face, 10);
  const chin = point(face, 152);
  if (!left || !right || !top || !chin) return null;
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const width = Math.hypot(dx, dy);
  const height = Math.hypot(chin.x - top.x, chin.y - top.y);
  if (!Number.isFinite(width + height) || width <= 0 || height <= 0) return null;
  return {
    center: { x: (left.x + right.x) / 2, y: (top.y + chin.y) / 2 },
    width,
    height,
    roll: Math.atan2(dy, dx),
  };
}

/** Draws face-anchored overlays; all geometry remains proportional at export resolution. */
export function applyFaceAccessories(
  canvas: HTMLCanvasElement,
  faces: NormalizedPoint[][],
  accessory: FaceAccessory,
  rawSettings: FaceAccessorySettings = DEFAULT_FACE_ACCESSORY_SETTINGS,
): void {
  if (accessory === 'none' || !faces.length) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  const settings = clampAccessorySettings(rawSettings);
  context.save();
  context.globalAlpha = settings.opacity / 100;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const face of faces) {
    const anchor = getAccessoryAnchor(face);
    if (!anchor) continue;
    const { center, width: faceWidth, height: faceHeight, roll } = anchor;
    const leftEye = centerOf(face, [33, 133, 159, 145]);
    const rightEye = centerOf(face, [362, 263, 386, 374]);
    const scaleX = (faceWidth * width * settings.scale) / 100;
    const scaleY = (faceHeight * height * settings.scale) / 100;
    const centerX = center.x * width + (settings.offsetX / 100) * scaleX;
    const centerY = center.y * height + (settings.offsetY / 100) * scaleY;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(roll + (settings.rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);

    if ((accessory === 'glasses' || accessory === 'sunglasses') && leftEye && rightEye) {
      const eyeX = ((leftEye.x + rightEye.x) * width) / 2;
      const eyeY = ((leftEye.y + rightEye.y) * height) / 2;
      const lensWidth =
        (Math.hypot((rightEye.x - leftEye.x) * width, (rightEye.y - leftEye.y) * height) *
          0.92 *
          settings.scale) /
        100;
      const lensHeight = lensWidth * 0.62;
      context.lineWidth = Math.max(2, scaleX * 0.018);
      context.strokeStyle = accessory === 'sunglasses' ? '#171923' : '#202b3b';
      context.fillStyle =
        accessory === 'sunglasses' ? 'rgba(23, 29, 43, 0.78)' : 'rgba(226, 242, 255, 0.24)';
      for (const eye of [leftEye, rightEye]) {
        const x = eye.x * width + (settings.offsetX / 100) * scaleX;
        const y = eye.y * height + (settings.offsetY / 100) * scaleY;
        context.beginPath();
        context.roundRect(
          x - lensWidth / 2,
          y - lensHeight / 2,
          lensWidth,
          lensHeight,
          lensHeight * 0.28,
        );
        context.fill();
        context.stroke();
      }
      const bx = eyeX + (settings.offsetX / 100) * scaleX;
      const by = eyeY + (settings.offsetY / 100) * scaleY;
      context.beginPath();
      context.moveTo(bx - lensWidth * 0.52, by);
      context.quadraticCurveTo(bx, by - lensHeight * 0.12, bx + lensWidth * 0.52, by);
      context.stroke();
      context.beginPath();
      context.moveTo(
        leftEye.x * width + (settings.offsetX / 100) * scaleX - lensWidth * 0.48,
        leftEye.y * height + (settings.offsetY / 100) * scaleY - lensHeight * 0.08,
      );
      context.lineTo(
        leftEye.x * width + (settings.offsetX / 100) * scaleX - lensWidth * 0.72,
        leftEye.y * height + (settings.offsetY / 100) * scaleY - lensHeight * 0.2,
      );
      context.moveTo(
        rightEye.x * width + (settings.offsetX / 100) * scaleX + lensWidth * 0.48,
        rightEye.y * height + (settings.offsetY / 100) * scaleY - lensHeight * 0.08,
      );
      context.lineTo(
        rightEye.x * width + (settings.offsetX / 100) * scaleX + lensWidth * 0.72,
        rightEye.y * height + (settings.offsetY / 100) * scaleY - lensHeight * 0.2,
      );
      context.stroke();
    }
    if (accessory === 'bunny-ears') {
      const earWidth = scaleX * 0.22;
      const earHeight = scaleY * 0.43;
      const baseY = centerY - faceHeight * height * 0.38;
      for (const direction of [-1, 1]) {
        const baseX = centerX + direction * scaleX * 0.2;
        context.save();
        context.translate(baseX, baseY);
        context.rotate(direction * -0.16);
        context.fillStyle = '#f5e6ec';
        context.strokeStyle = '#d8b8c7';
        context.lineWidth = Math.max(2, scaleX * 0.012);
        context.beginPath();
        context.ellipse(0, -earHeight * 0.48, earWidth * 0.48, earHeight * 0.55, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = '#e9a8c0';
        context.beginPath();
        context.ellipse(0, -earHeight * 0.48, earWidth * 0.2, earHeight * 0.39, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
    if (accessory === 'puppy') {
      const earWidth = scaleX * 0.24;
      const earHeight = scaleY * 0.34;
      for (const direction of [-1, 1]) {
        const earX = centerX + direction * scaleX * 0.43;
        const earY = centerY - scaleY * 0.22;
        context.save();
        context.translate(earX, earY);
        context.rotate(direction * 0.2);
        context.fillStyle = '#8b583f';
        context.strokeStyle = '#553526';
        context.lineWidth = Math.max(2, scaleX * 0.012);
        context.beginPath();
        context.ellipse(0, 0, earWidth * 0.55, earHeight * 0.7, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
      }
      const nose = point(face, 1) || center;
      const noseX = nose.x * width;
      const noseY = nose.y * height + scaleY * 0.035;
      context.fillStyle = '#292027';
      context.beginPath();
      context.ellipse(noseX, noseY, scaleX * 0.075, scaleY * 0.048, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#292027';
      context.lineWidth = Math.max(2, scaleX * 0.012);
      context.beginPath();
      context.moveTo(noseX, noseY + scaleY * 0.035);
      context.lineTo(noseX, noseY + scaleY * 0.09);
      context.stroke();
      context.fillStyle = '#ef7895';
      context.beginPath();
      context.ellipse(noseX, noseY + scaleY * 0.12, scaleX * 0.055, scaleY * 0.07, 0, 0, Math.PI);
      context.fill();
    }
    if (accessory === 'heart-eyes' && leftEye && rightEye) {
      const eyeDistance = Math.hypot(
        (rightEye.x - leftEye.x) * width,
        (rightEye.y - leftEye.y) * height,
      );
      const heartSize = eyeDistance * 0.17;
      for (const eye of [leftEye, rightEye]) {
        const x = eye.x * width;
        const y = eye.y * height;
        context.save();
        context.translate(x, y);
        context.scale(heartSize / 10, heartSize / 10);
        context.fillStyle = '#f04475';
        context.beginPath();
        context.moveTo(0, 8);
        context.bezierCurveTo(-17, -3, -11, -15, 0, -7);
        context.bezierCurveTo(11, -15, 17, -3, 0, 8);
        context.fill();
        context.restore();
      }
    }
    if (accessory === 'freckles') {
      const leftCheek = point(face, 50);
      const rightCheek = point(face, 280);
      if (leftCheek && rightCheek) {
        context.fillStyle = 'rgba(116, 58, 37, 0.78)';
        const pattern = [
          [-0.09, -0.025],
          [-0.045, -0.06],
          [0, -0.015],
          [0.055, -0.055],
          [0.095, -0.005],
          [-0.07, 0.045],
          [-0.015, 0.055],
          [0.045, 0.035],
          [0.105, 0.055],
        ];
        for (const cheek of [leftCheek, rightCheek]) {
          for (const [dx, dy] of pattern) {
            context.beginPath();
            context.arc(
              cheek.x * width + dx * scaleX,
              cheek.y * height + dy * scaleY,
              Math.max(1.3, scaleX * 0.009),
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        }
      }
    }
    if (accessory === 'flower-crown') {
      const crownWidth = scaleX * 0.92;
      const crownY = point(face, 10)!.y * height - scaleY * 0.08;
      context.strokeStyle = '#477c54';
      context.lineWidth = Math.max(2, scaleX * 0.018);
      context.beginPath();
      context.quadraticCurveTo(
        centerX,
        crownY - scaleY * 0.16,
        centerX + crownWidth * 0.5,
        crownY + scaleY * 0.02,
      );
      context.stroke();
      const flowerColors = ['#f4a7bd', '#f6d77a', '#c7a6ee', '#fff0e3', '#e98ca5'];
      for (let index = 0; index < 9; index += 1) {
        const fraction = index / 8 - 0.5;
        const x = centerX + fraction * crownWidth;
        const y = crownY - Math.sin((index / 8) * Math.PI) * scaleY * 0.13;
        const radius = scaleX * 0.045;
        context.fillStyle = flowerColors[index % flowerColors.length];
        for (let petal = 0; petal < 5; petal += 1) {
          const angle = (petal / 5) * Math.PI * 2;
          context.beginPath();
          context.arc(
            x + Math.cos(angle) * radius * 0.72,
            y + Math.sin(angle) * radius * 0.72,
            radius * 0.62,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
        context.fillStyle = '#f4cf63';
        context.beginPath();
        context.arc(x, y, radius * 0.38, 0, Math.PI * 2);
        context.fill();
      }
    }
    if (accessory === 'crown') {
      const crownWidth = scaleX * 0.82;
      const crownHeight = scaleY * 0.24;
      const x = centerX - crownWidth / 2;
      const y = point(face, 10)!.y * height - crownHeight * 0.8 + (settings.offsetY / 100) * scaleY;
      context.beginPath();
      context.moveTo(x, y + crownHeight);
      context.lineTo(x + crownWidth * 0.08, y + crownHeight * 0.2);
      context.lineTo(x + crownWidth * 0.31, y + crownHeight * 0.62);
      context.lineTo(x + crownWidth * 0.5, y);
      context.lineTo(x + crownWidth * 0.69, y + crownHeight * 0.62);
      context.lineTo(x + crownWidth * 0.92, y + crownHeight * 0.2);
      context.lineTo(x + crownWidth, y + crownHeight);
      context.closePath();
      const gradient = context.createLinearGradient(x, y, x + crownWidth, y + crownHeight);
      gradient.addColorStop(0, '#f7d76b');
      gradient.addColorStop(0.5, '#fff0a6');
      gradient.addColorStop(1, '#d89c2b');
      context.fillStyle = gradient;
      context.strokeStyle = '#9b6b19';
      context.lineWidth = Math.max(2, scaleX * 0.014);
      context.fill();
      context.stroke();
      context.fillStyle = '#a83e72';
      for (const fraction of [0.2, 0.5, 0.8]) {
        context.beginPath();
        context.arc(
          x + crownWidth * fraction,
          y + crownHeight * 0.7,
          Math.max(2, crownWidth * 0.025),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    context.restore();
  }
  context.restore();
}
