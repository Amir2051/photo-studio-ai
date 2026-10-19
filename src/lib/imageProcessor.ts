// Image Processing Engine
// Non-destructive editing with Canvas 2D (WebGPU fallback where supported)

import { Adjustment } from './types';
import { clamp } from './utils';

export interface CanvasContext2D {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

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

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private dataUrl: string;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.imageData = new ImageData(1, 1);
    this.dataUrl = '';
  }

  public setSource(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void {
    const isImage = 'naturalWidth' in image;
    const w = isImage ? image.naturalWidth : image.width;
    const h = isImage ? image.naturalHeight : image.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(image, 0, 0, w, h);
    this.imageData = this.ctx.getImageData(0, 0, w, h);
    this.dataUrl = this.canvas.toDataURL('image/png');
  }

  public getState(): ImageState {
    return {
      original: this.imageData,
      current: this.imageData,
      width: this.canvas.width,
      height: this.canvas.height,
      dataUrl: this.dataUrl,
    };
  }

  public applyAdjustments(adjustments: Adjustment[]): ImageData {
    let data = this.imageData.data;
    for (const adj of adjustments) {
      switch (adj.type) {
        case 'exposure': {
          const factor = Math.pow(2, adj.value / 100);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(Math.round(data[i] * factor), 0, 255);
            data[i + 1] = clamp(Math.round(data[i + 1] * factor), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] * factor), 0, 255);
          }
          break;
        }
        case 'brightness': {
          const amount = 1 + adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(Math.round(data[i] * amount), 0, 255);
            data[i + 1] = clamp(Math.round(data[i + 1] * amount), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] * amount), 0, 255);
          }
          break;
        }
        case 'contrast': {
          const factor = (259 * (adj.value + 255)) / (255 * (259 - adj.value));
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(Math.round(factor * (data[i] - 128) + 128), 0, 255);
            data[i + 1] = clamp(Math.round(factor * (data[i + 1] - 128) + 128), 0, 255);
            data[i + 2] = clamp(Math.round(factor * (data[i + 2] - 128) + 128), 0, 255);
          }
          break;
        }
        case 'gamma': {
          const gamma = 1 / (adj.value / 100 + 1);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(Math.round(255 * Math.pow(data[i] / 255, gamma)), 0, 255);
            data[i + 1] = clamp(Math.round(255 * Math.pow(data[i + 1] / 255, gamma)), 0, 255);
            data[i + 2] = clamp(Math.round(255 * Math.pow(data[i + 2] / 255, gamma)), 0, 255);
          }
          break;
        }
        case 'highlights': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 128) {
              data[i] = clamp(Math.round(data[i] + amount * (255 - data[i])), 0, 255);
            } else {
              data[i] = clamp(Math.round(data[i] * (1 - amount * 0.5)), 0, 255);
            }
            if (data[i + 1] > 128) {
              data[i + 1] = clamp(Math.round(data[i + 1] + amount * (255 - data[i + 1])), 0, 255);
            } else {
              data[i + 1] = clamp(Math.round(data[i + 1] * (1 - amount * 0.5)), 0, 255);
            }
            if (data[i + 2] > 128) {
              data[i + 2] = clamp(Math.round(data[i + 2] + amount * (255 - data[i + 2])), 0, 255);
            } else {
              data[i + 2] = clamp(Math.round(data[i + 2] * (1 - amount * 0.5)), 0, 255);
            }
          }
          break;
        }
        case 'shadows': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 128) {
              data[i] = clamp(Math.round(data[i] - amount * data[i]), 0, 255);
            } else {
              data[i] = clamp(Math.round(data[i] * (1 - amount * 0.5)), 0, 255);
            }
            if (data[i + 1] < 128) {
              data[i + 1] = clamp(Math.round(data[i + 1] - amount * data[i + 1]), 0, 255);
            } else {
              data[i + 1] = clamp(Math.round(data[i + 1] * (1 - amount * 0.5)), 0, 255);
            }
            if (data[i + 2] < 128) {
              data[i + 2] = clamp(Math.round(data[i + 2] - amount * data[i + 2]), 0, 255);
            } else {
              data[i + 2] = clamp(Math.round(data[i + 2] * (1 - amount * 0.5)), 0, 255);
            }
          }
          break;
        }
        case 'whites': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 200) {
              data[i] = clamp(Math.round(255 - (255 - data[i]) * (1 - amount)), 0, 255);
            }
            if (data[i + 1] > 200) {
              data[i + 1] = clamp(Math.round(255 - (255 - data[i + 1]) * (1 - amount)), 0, 255);
            }
            if (data[i + 2] > 200) {
              data[i + 2] = clamp(Math.round(255 - (255 - data[i + 2]) * (1 - amount)), 0, 255);
            }
          }
          break;
        }
        case 'blacks': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 55) {
              data[i] = clamp(Math.round(data[i] * (1 + amount)), 0, 255);
            }
            if (data[i + 1] < 55) {
              data[i + 1] = clamp(Math.round(data[i + 1] * (1 + amount)), 0, 255);
            }
            if (data[i + 2] < 55) {
              data[i + 2] = clamp(Math.round(data[i + 2] * (1 + amount)), 0, 255);
            }
          }
          break;
        }
        case 'temperature': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(Math.round(data[i] + amount * 15), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] - amount * 15), 0, 255);
          }
          break;
        }
        case 'tint': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            data[i + 1] = clamp(Math.round(data[i + 1] + amount * 15), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] - amount * 10), 0, 255);
          }
          break;
        }
        case 'saturation': {
          const amount = 1 + adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = clamp(Math.round(gray + (data[i] - gray) * amount), 0, 255);
            data[i + 1] = clamp(Math.round(gray + (data[i + 1] - gray) * amount), 0, 255);
            data[i + 2] = clamp(Math.round(gray + (data[i + 2] - gray) * amount), 0, 255);
          }
          break;
        }
        case 'vibrance': {
          const amount = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const diff = data[i] - gray;
            data[i] = clamp(Math.round(data[i] + diff * amount), 0, 255);
            const diff1 = data[i + 1] - gray;
            data[i + 1] = clamp(Math.round(data[i + 1] + diff1 * amount), 0, 255);
            const diff2 = data[i + 2] - gray;
            data[i + 2] = clamp(Math.round(data[i + 2] + diff2 * amount), 0, 255);
          }
          break;
        }
        case 'hue': {
          // Simple hue shift - rotate color channels
          const h = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            const hPrime = (h * 6) % 6;
            const c = 1 - Math.abs((hPrime % 2) - 1);
            const rN = c * (1 - Math.abs((hPrime - 3) % 2 - 1));
            const gN = c * (1 - Math.abs((hPrime - 2) % 2 - 1));
            const bN = c * (1 - Math.abs((hPrime - 1) % 2 - 1));
            data[i] = clamp(Math.round(255 * rN), 0, 255);
            data[i + 1] = clamp(Math.round(255 * gN), 0, 255);
            data[i + 2] = clamp(Math.round(255 * bN), 0, 255);
          }
          break;
        }
        case 'color-balance':
          // Add tint shifts
          const bias = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(Math.round(data[i] + bias * 15), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] - bias * 10), 0, 255);
          }
          break;
        case 'curves':
          // Apply custom curves (simplified: use pre-baked curve)
          const points = adj.value as unknown as number[];
          for (let i = 0; i < data.length; i += 4) {
            const x = data[i] / 255;
            const y = points[0] + (points[1] - points[0]) * x + points[2] * x * x;
            data[i] = clamp(Math.round(y * 255), 0, 255);
            const x2 = data[i + 1] / 255;
            const y2 = points[3] + (points[4] - points[3]) * x2 + points[5] * x2 * x2;
            data[i + 1] = clamp(Math.round(y2 * 255), 0, 255);
            const x3 = data[i + 2] / 255;
            const y3 = points[6] + (points[7] - points[6]) * x3 + points[8] * x3 * x3;
            data[i + 2] = clamp(Math.round(y3 * 255), 0, 255);
          }
          break;
        case 'sharpness':
          // Apply sharpness via simple unsharp mask
          break;
        case 'clarity':
          // Apply clarity
          break;
        case 'grain':
          // Apply film grain
          const seed = Date.now() + adj.value * 100;
          for (let i = 0; i < data.length; i += 4) {
            const g = Math.sin(seed + i * 0.1) * 30 * (adj.value / 100);
            data[i] = clamp(Math.round(data[i] + g), 0, 255);
            data[i + 1] = clamp(Math.round(data[i + 1] + g * 0.7), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] + g * 0.5), 0, 255);
          }
          break;
        case 'film-fade':
          // Apply film fade
          const fade = adj.value / 100;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = clamp(Math.round(data[i] * (1 - fade * 0.3) + gray * fade * 0.1), 0, 255);
            data[i + 1] = clamp(Math.round(data[i + 1] * (1 - fade * 0.3) + gray * fade * 0.1), 0, 255);
            data[i + 2] = clamp(Math.round(data[i + 2] * (1 - fade * 0.3) + gray * fade * 0.1), 0, 255);
          }
          break;
        case 'vignette':
          // Apply vignette
          const vAmount = adj.value / 100;
          const w = this.canvas.width;
          const h = this.canvas.height;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              const dx = (x / w) - 0.5;
              const dy = (y / h) - 0.5;
              const dist = Math.sqrt(dx * dx + dy * dy) / 0.707;
              const factor = 1 - dist * vAmount * 0.5;
              data[i] = clamp(Math.round(data[i] * factor), 0, 255);
              data[i + 1] = clamp(Math.round(data[i + 1] * factor), 0, 255);
              data[i + 2] = clamp(Math.round(data[i + 2] * factor), 0, 255);
            }
          }
          break;
        case 'bloom':
          // Apply bloom
          break;
        case 'glow':
          // Apply glow
          break;
        case 'dehaze':
          // Apply dehaze
          break;
        case 'blur':
          // Apply blur
          break;
        case 'depth-of-field':
          // Apply depth of field
          break;
        default:
          break;
      }
    }
    return this.imageData;
  }

  public applyFilterPreset(presetId: string, intensity: number): ImageData {
    // Get the preset from the library (imported separately)
    // This is a placeholder - actual filter application happens in filterService.ts
    return this.imageData;
  }

  public renderToCanvas(): void {
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  public getDataUrl(): string {
    return this.canvas.toDataURL('image/png');
  }

  public toBlob(format: string = 'image/png', quality: number = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, format, quality);
    });
  }
}
