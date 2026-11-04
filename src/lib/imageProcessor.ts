import type { Adjustment } from './types';
import { clamp } from './utils';

export interface ImageState {
  original: ImageData;
  current: ImageData;
  width: number;
  height: number;
  dataUrl: string;
}
export interface ProcessingResult {
  ImageData: ImageData;
  dataUrl: string;
  width: number;
  height: number;
}

/** Pure pixel transform: every edit starts from an untouched source buffer. */
export function processPixels(
  source: Uint8ClampedArray<ArrayBufferLike>,
  adjustments: Adjustment[],
): Uint8ClampedArray<ArrayBuffer> {
  const data = new Uint8ClampedArray(source.length);
  data.set(source);
  for (const adjustment of adjustments) {
    const value = Number(adjustment.value) || 0;
    const factor =
      adjustment.type === 'contrast' ? (259 * (value + 255)) / (255 * (259 - value)) : 1;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      switch (adjustment.type) {
        case 'brightness': {
          const multiplier = 1 + value / 100;
          data[i] = clamp(Math.round(r * multiplier), 0, 255);
          data[i + 1] = clamp(Math.round(g * multiplier), 0, 255);
          data[i + 2] = clamp(Math.round(b * multiplier), 0, 255);
          break;
        }
        case 'exposure': {
          const multiplier = 2 ** (value / 100);
          data[i] = clamp(Math.round(r * multiplier), 0, 255);
          data[i + 1] = clamp(Math.round(g * multiplier), 0, 255);
          data[i + 2] = clamp(Math.round(b * multiplier), 0, 255);
          break;
        }
        case 'contrast':
          data[i] = clamp(Math.round(factor * (r - 128) + 128), 0, 255);
          data[i + 1] = clamp(Math.round(factor * (g - 128) + 128), 0, 255);
          data[i + 2] = clamp(Math.round(factor * (b - 128) + 128), 0, 255);
          break;
        case 'saturation': {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const amount = 1 + value / 100;
          data[i] = clamp(Math.round(gray + (r - gray) * amount), 0, 255);
          data[i + 1] = clamp(Math.round(gray + (g - gray) * amount), 0, 255);
          data[i + 2] = clamp(Math.round(gray + (b - gray) * amount), 0, 255);
          break;
        }
        case 'temperature':
          data[i] = clamp(Math.round(r + value * 0.35), 0, 255);
          data[i + 2] = clamp(Math.round(b - value * 0.35), 0, 255);
          break;
        case 'tint':
          data[i + 1] = clamp(Math.round(g + value * 0.25), 0, 255);
          break;
        case 'gamma': {
          const gamma = 1 / Math.max(0.05, 1 + value / 100);
          data[i] = clamp(Math.round(255 * (r / 255) ** gamma), 0, 255);
          data[i + 1] = clamp(Math.round(255 * (g / 255) ** gamma), 0, 255);
          data[i + 2] = clamp(Math.round(255 * (b / 255) ** gamma), 0, 255);
          break;
        }
        case 'film-fade': {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const fade = clamp(value / 100, 0, 1);
          data[i] = clamp(
            Math.round(r * (1 - fade * 0.22) + gray * fade * 0.12 + fade * 18),
            0,
            255,
          );
          data[i + 1] = clamp(
            Math.round(g * (1 - fade * 0.22) + gray * fade * 0.12 + fade * 18),
            0,
            255,
          );
          data[i + 2] = clamp(
            Math.round(b * (1 - fade * 0.22) + gray * fade * 0.12 + fade * 18),
            0,
            255,
          );
          break;
        }
        default:
          // Unsupported effects are intentionally not advertised as active.
          break;
      }
    }
  }
  return data;
}

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImageData: ImageData;
  private imageData: ImageData;
  private dataUrl = '';

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
    this.ctx = context;
    this.originalImageData = new ImageData(1, 1);
    this.imageData = new ImageData(1, 1);
  }

  setSource(source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void {
    const isImage = 'naturalWidth' in source;
    const width = isImage ? source.naturalWidth : source.width;
    const height = isImage ? source.naturalHeight : source.height;
    if (!width || !height) throw new Error('The source image has no dimensions.');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(source, 0, 0, width, height);
    const pixels = this.ctx.getImageData(0, 0, width, height);
    this.originalImageData = new ImageData(new Uint8ClampedArray(pixels.data), width, height);
    this.imageData = new ImageData(new Uint8ClampedArray(pixels.data), width, height);
    this.dataUrl = this.canvas.toDataURL('image/png');
  }

  getState(): ImageState {
    return {
      original: new ImageData(
        new Uint8ClampedArray(this.originalImageData.data),
        this.originalImageData.width,
        this.originalImageData.height,
      ),
      current: new ImageData(
        new Uint8ClampedArray(this.imageData.data),
        this.imageData.width,
        this.imageData.height,
      ),
      width: this.canvas.width,
      height: this.canvas.height,
      dataUrl: this.dataUrl,
    };
  }

  applyAdjustments(adjustments: Adjustment[]): ImageData {
    const pixels = processPixels(this.originalImageData.data, adjustments);
    this.imageData = new ImageData(
      pixels,
      this.originalImageData.width,
      this.originalImageData.height,
    );
    return new ImageData(
      new Uint8ClampedArray(this.imageData.data),
      this.imageData.width,
      this.imageData.height,
    );
  }

  applyFilterPreset(_presetId: string, _intensity: number): ImageData {
    throw new Error(
      'Pass a verified preset adjustment recipe to applyAdjustments; preset IDs are not resolved by this processor.',
    );
  }

  renderToCanvas(): void {
    this.ctx.putImageData(this.imageData, 0, 0);
    this.dataUrl = this.canvas.toDataURL('image/png');
  }
  getDataUrl(): string {
    this.renderToCanvas();
    return this.dataUrl;
  }
  toBlob(format = 'image/png', quality = 1): Promise<Blob> {
    this.renderToCanvas();
    return new Promise((resolve, reject) =>
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create image blob.'))),
        format,
        quality,
      ),
    );
  }
}
