import type { NormalizedPoint } from './portraitRetouch';

export type LocalMask = {
  id: string;
  kind: 'brush' | 'linear' | 'radial';
  points: NormalizedPoint[];
  center: NormalizedPoint;
  end: NormalizedPoint;
  radius: number;
  feather: number;
  exposure: number;
  temperature: number;
  saturation: number;
  size: number;
  visible?: boolean;
  name?: string;
};

export type HealStroke = { points: NormalizedPoint[]; size: number };
export type SelectionStroke = {
  points: NormalizedPoint[];
  size: number;
  operation: 'add' | 'subtract';
};
export type SelectionState = { strokes: SelectionStroke[]; inverted: boolean; feather: number };

const clamp = (n: number, min = 0, max = 255) => Math.max(min, Math.min(max, n));

/** Detail processing is deliberately local and deterministic; it never calls an AI service. */
export function applyDetailEffects(
  canvas: HTMLCanvasElement,
  settings: { clarity: number; texture: number; sharpening: number; noiseReduction: number },
): void {
  const { clarity, texture, sharpening, noiseReduction } = settings;
  if (!clarity && !texture && !sharpening && !noiseReduction) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const { width, height } = canvas;
  const source = ctx.getImageData(0, 0, width, height);
  const input = source.data;
  const output = new Uint8ClampedArray(input);
  const radius = noiseReduction > 0 ? 1 : 0;
  const blurAt = (x: number, y: number, channel: number) => {
    let total = 0,
      count = 0;
    for (let oy = -radius; oy <= radius; oy++)
      for (let ox = -radius; ox <= radius; ox++) {
        const px = Math.max(0, Math.min(width - 1, x + ox));
        const py = Math.max(0, Math.min(height - 1, y + oy));
        total += input[(py * width + px) * 4 + channel];
        count++;
      }
    return total / count;
  };
  const denoise = Math.max(0, Math.min(100, noiseReduction)) / 100;
  const sharpen = Math.max(0, Math.min(100, sharpening)) / 100;
  const clarityAmount = clarity / 100;
  const textureAmount = texture / 100;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const original = input[i + c];
        const blurred = blurAt(x, y, c);
        const denoised = original * (1 - denoise * 0.72) + blurred * denoise * 0.72;
        const detail = original - blurred;
        const local = (original - 128) * clarityAmount * 0.32 + detail * textureAmount * 0.8;
        output[i + c] = clamp(denoised + detail * sharpen * 1.35 + local);
      }
    }
  ctx.putImageData(new ImageData(output, width, height), 0, 0);
}

function maskWeight(mask: LocalMask, x: number, y: number, width: number, height: number): number {
  const px = x / Math.max(1, width - 1),
    py = y / Math.max(1, height - 1);
  let distance = 0;
  if (mask.kind === 'brush') {
    if (!mask.points.length) return 0;
    let nearest = Infinity;
    for (const point of mask.points) {
      const dx = (px - point.x) * width,
        dy = (py - point.y) * height;
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    distance = nearest / Math.max(1, (mask.size * Math.max(width, height)) / 1000);
  } else if (mask.kind === 'radial') {
    const dx = (px - mask.center.x) * width,
      dy = (py - mask.center.y) * height;
    distance = Math.hypot(dx, dy) / Math.max(1, (mask.radius * Math.max(width, height)) / 100);
  } else {
    const ax = mask.center.x * width,
      ay = mask.center.y * height;
    const bx = mask.end.x * width,
      by = mask.end.y * height;
    const vx = bx - ax,
      vy = by - ay;
    const length = Math.hypot(vx, vy) || 1;
    const projection = ((x - ax) * vx + (y - ay) * vy) / (length * length);
    distance = 1 - Math.max(0, Math.min(1, projection));
  }
  const feather = Math.max(0.02, Math.min(1, mask.feather / 100));
  return Math.max(0, Math.min(1, (1 - distance) / feather));
}

function selectionWeight(
  selection: SelectionState,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  let value = 0;
  for (const stroke of selection.strokes) {
    let distance = Infinity;
    for (const point of stroke.points)
      distance = Math.min(distance, Math.hypot(x - point.x * width, y - point.y * height));
    const radius = Math.max(1, (stroke.size * Math.max(width, height)) / 1000);
    const feather = Math.max(0, Math.min(1, selection.feather / 100));
    const edge = Math.max(0, radius * (1 - feather));
    const coverage =
      distance <= edge
        ? 1
        : feather > 0
          ? Math.max(0, 1 - (distance - edge) / Math.max(1, radius - edge))
          : 0;
    value = stroke.operation === 'add' ? Math.max(value, coverage) : Math.min(value, 1 - coverage);
  }
  return selection.inverted ? 1 - value : value;
}

/** Paints a non-destructive selection tint onto the editor preview only. */
export function renderSelectionOverlay(
  canvas: HTMLCanvasElement,
  selection: SelectionState | null | undefined,
): void {
  if (!selection) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const weight = selectionWeight(selection, x, y, canvas.width, canvas.height);
      if (weight <= 0.015) continue;
      const i = (y * canvas.width + x) * 4;
      const alpha = Math.min(0.34, weight * 0.34);
      data[i] = Math.round(data[i] * (1 - alpha) + 30 * alpha);
      data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + 155 * alpha);
      data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + 255 * alpha);
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function applyLocalMasks(
  canvas: HTMLCanvasElement,
  masks: LocalMask[],
  selection?: SelectionState | null,
): void {
  if (!masks.length) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (const mask of masks) {
    if (mask.visible === false) continue;
    const radius = (mask.size / 1000) * Math.max(canvas.width, canvas.height);
    const points = mask.kind === 'brush' ? mask.points : [mask.center, mask.end];
    const xs = points.map((point) => point.x * canvas.width);
    const ys = points.map((point) => point.y * canvas.height);
    const margin =
      mask.kind === 'linear'
        ? Math.max(canvas.width, canvas.height)
        : mask.kind === 'radial'
          ? (mask.radius * Math.max(canvas.width, canvas.height)) / 100
          : radius;
    const minX = Math.max(0, Math.floor(Math.min(...xs) - margin));
    const maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(...xs) + margin));
    const minY = Math.max(0, Math.floor(Math.min(...ys) - margin));
    const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(...ys) + margin));
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const selectionFactor = selection
          ? selectionWeight(selection, x, y, canvas.width, canvas.height)
          : 1;
        const weight = maskWeight(mask, x, y, canvas.width, canvas.height) * selectionFactor;
        if (weight <= 0) continue;
        const i = (y * canvas.width + x) * 4;
        const exposure = 2 ** ((mask.exposure * weight) / 100);
        const warmth = mask.temperature * weight * 0.42;
        const saturation = 1 + (mask.saturation * weight) / 100;
        const gray = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
        for (let c = 0; c < 3; c++) {
          const channel = data[i + c] * exposure + (c === 0 ? warmth : c === 2 ? -warmth : 0);
          data[i + c] = clamp(gray + (channel - gray) * saturation);
        }
      }
  }
  ctx.putImageData(image, 0, 0);
}

/** Small, feathered local clone/heal strokes. Source pixels are always read before painting. */
export function applyHealing(canvas: HTMLCanvasElement, strokes: HealStroke[]): void {
  if (!strokes.length) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const { width, height } = canvas;
  const original = ctx.getImageData(0, 0, width, height);
  const output = new Uint8ClampedArray(original.data);
  for (const stroke of strokes) {
    const radius = Math.max(2, (stroke.size / 1000) * Math.max(width, height));
    for (const point of stroke.points) {
      const cx = point.x * width,
        cy = point.y * height;
      const offsetX = radius * 1.25,
        offsetY = radius * 0.35;
      for (
        let y = Math.max(0, Math.floor(cy - radius));
        y < Math.min(height, Math.ceil(cy + radius));
        y++
      ) {
        for (
          let x = Math.max(0, Math.floor(cx - radius));
          x < Math.min(width, Math.ceil(cx + radius));
          x++
        ) {
          const distance = Math.hypot(x - cx, y - cy);
          if (distance > radius) continue;
          const sx = Math.max(0, Math.min(width - 1, Math.round(x + offsetX)));
          const sy = Math.max(0, Math.min(height - 1, Math.round(y + offsetY)));
          const blend = Math.max(0, 1 - distance / radius) * 0.88;
          const target = (y * width + x) * 4,
            sample = (sy * width + sx) * 4;
          for (let c = 0; c < 3; c++)
            output[target + c] = clamp(
              output[target + c] * (1 - blend) + original.data[sample + c] * blend,
            );
        }
      }
    }
  }
  ctx.putImageData(new ImageData(output, width, height), 0, 0);
}
