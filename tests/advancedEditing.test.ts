import { describe, expect, it } from 'vitest';
import { applyHealing, applyLocalMasks, type LocalMask } from '../src/lib/advancedEditing';
import { applyDetailEffects, DEFAULT_MANUAL_ADJUSTMENTS } from '../src/lib/manualEditing';

class TestImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}
Object.defineProperty(globalThis, 'ImageData', { value: TestImageData, configurable: true });
function fakeCanvas(width: number, height: number, data: number[]) {
  let pixels = new Uint8ClampedArray(data);
  const context = {
    getImageData: () => new TestImageData(new Uint8ClampedArray(pixels), width, height),
    putImageData: (image: TestImageData) => {
      pixels = new Uint8ClampedArray(image.data);
    },
  };
  return {
    canvas: { width, height, getContext: () => context } as unknown as HTMLCanvasElement,
    pixels: () => [...pixels],
  };
}

describe('advanced local editing tools', () => {
  it('reduces local noise while preserving the canvas dimensions', () => {
    const values: number[] = [];
    for (let i = 0; i < 9; i++)
      values.push(i === 4 ? 255 : 0, i === 4 ? 255 : 0, i === 4 ? 255 : 0, 255);
    const { canvas, pixels } = fakeCanvas(3, 3, values);
    applyDetailEffects(canvas, { ...DEFAULT_MANUAL_ADJUSTMENTS, noiseReduction: 100 });
    expect(pixels()[16]).toBeLessThan(255);
    expect(pixels()).toHaveLength(36);
  });

  it('applies a radial exposure mask around its center', () => {
    const values = Array(25)
      .fill(0)
      .flatMap(() => [80, 80, 80, 255]);
    const { canvas, pixels } = fakeCanvas(5, 5, values);
    const mask: LocalMask = {
      id: 'm1',
      kind: 'radial',
      points: [],
      center: { x: 0.5, y: 0.5 },
      end: { x: 0.5, y: 0.5 },
      radius: 35,
      feather: 70,
      exposure: 100,
      temperature: 0,
      saturation: 0,
      size: 30,
    };
    applyLocalMasks(canvas, [mask]);
    expect(pixels()[(2 * 5 + 2) * 4]).toBe(160);
    expect(pixels()[0]).toBe(80);
  });

  it('heals with a feathered sample from nearby original pixels', () => {
    const values: number[] = [];
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) values.push(x * 40, x * 40, x * 40, 255);
    const { canvas, pixels } = fakeCanvas(5, 5, values);
    const before = pixels()[(2 * 5 + 2) * 4];
    applyHealing(canvas, [{ points: [{ x: 0.5, y: 0.5 }], size: 300 }]);
    expect(pixels()[(2 * 5 + 2) * 4]).not.toBe(before);
  });
});
