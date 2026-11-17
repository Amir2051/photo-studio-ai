import type { NormalizedPoint } from './portraitRetouch';

export type LayerMaskStroke = { points: NormalizedPoint[]; size: number; mode: 'reveal' | 'hide' };
export type LayerMask = {
  id: string;
  name?: string;
  kind: 'brush' | 'linear' | 'radial';
  strokes: LayerMaskStroke[];
  start: NormalizedPoint;
  end: NormalizedPoint;
  radius: number;
  feather: number;
  inverted: boolean;
  enabled: boolean;
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function layerMaskWeight(
  mask: LayerMask,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  let weight = 1;
  const feather = clamp01(mask.feather / 100);
  if (mask.kind === 'brush') {
    for (const stroke of mask.strokes) {
      let distance = Infinity;
      for (const point of stroke.points)
        distance = Math.min(distance, Math.hypot(x - point.x * width, y - point.y * height));
      const radius = Math.max(1, (stroke.size * Math.max(width, height)) / 1000);
      const edge = radius * (1 - feather);
      const coverage =
        distance <= edge
          ? 1
          : feather > 0
            ? clamp01(1 - (distance - edge) / Math.max(1, radius - edge))
            : 0;
      weight =
        stroke.mode === 'reveal' ? Math.max(weight, coverage) : Math.min(weight, 1 - coverage);
    }
  } else if (mask.kind === 'radial') {
    const dx = (x / width - mask.start.x) * width;
    const dy = (y / height - mask.start.y) * height;
    const radius = Math.max(1, (mask.radius * Math.max(width, height)) / 100);
    const distance = Math.hypot(dx, dy);
    const edge = radius * (1 - feather);
    weight =
      distance <= edge
        ? 1
        : feather > 0
          ? clamp01(1 - (distance - edge) / Math.max(1, radius - edge))
          : 0;
  } else {
    const ax = mask.start.x * width,
      ay = mask.start.y * height;
    const bx = mask.end.x * width,
      by = mask.end.y * height;
    const vx = bx - ax,
      vy = by - ay;
    const length = Math.hypot(vx, vy) || 1;
    const projection = ((x - ax) * vx + (y - ay) * vy) / (length * length);
    const softness = Math.max(0.01, feather);
    const t = clamp01((projection + softness) / (1 + 2 * softness));
    weight = 1 - t * t * (3 - 2 * t);
  }
  return mask.inverted ? 1 - weight : weight;
}

export function applyLayerMask(canvas: HTMLCanvasElement, mask?: LayerMask | null): void {
  if (!mask || !mask.enabled) return;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      image.data[index + 3] = Math.round(
        image.data[index + 3] * layerMaskWeight(mask, x, y, canvas.width, canvas.height),
      );
    }
  context.putImageData(image, 0, 0);
}

export function layerMaskStackWeight(
  masks: LayerMask[],
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  return masks.reduce(
    (weight, mask) => weight * (mask.enabled ? layerMaskWeight(mask, x, y, width, height) : 1),
    1,
  );
}

export function applyLayerMasks(canvas: HTMLCanvasElement, masks: LayerMask[] = []): void {
  if (!masks.some((mask) => mask.enabled)) return;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      image.data[index + 3] = Math.round(
        image.data[index + 3] * layerMaskStackWeight(masks, x, y, canvas.width, canvas.height),
      );
    }
  context.putImageData(image, 0, 0);
}
