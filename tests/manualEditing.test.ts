import { describe, expect, it } from 'vitest';
import { DEFAULT_MANUAL_ADJUSTMENTS, processManualPixels } from '../src/lib/manualEditing';

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

function pixel(r = 100, g = 120, b = 140, a = 255) {
  return new ImageData(new Uint8ClampedArray([r, g, b, a]), 1, 1);
}

describe('professional manual adjustment engine', () => {
  it('leaves the source pixels untouched', () => {
    const source = pixel();
    const before = [...source.data];
    processManualPixels(source, { ...DEFAULT_MANUAL_ADJUSTMENTS, exposure: 50 });
    expect([...source.data]).toEqual(before);
  });

  it('returns an identical image for default settings', () => {
    const source = pixel(31, 82, 147, 99);
    const result = processManualPixels(source, DEFAULT_MANUAL_ADJUSTMENTS);
    expect([...result.data]).toEqual([...source.data]);
    expect(result).not.toBe(source);
  });

  it('adjusts exposure and preserves alpha', () => {
    const result = processManualPixels(pixel(80, 100, 120, 77), {
      ...DEFAULT_MANUAL_ADJUSTMENTS,
      exposure: 100,
    });
    expect([...result.data]).toEqual([160, 200, 240, 77]);
  });

  it('clips strong exposure changes without wrapping bright pixels to black', () => {
    const result = processManualPixels(pixel(80, 100, 120), {
      ...DEFAULT_MANUAL_ADJUSTMENTS,
      exposure: 200,
    });
    expect([...result.data]).toEqual([255, 255, 255, 255]);
  });

  it('supports independent tonal and color adjustments', () => {
    const source = pixel();
    for (const key of [
      'highlights',
      'shadows',
      'whites',
      'blacks',
      'temperature',
      'tint',
      'vibrance',
      'saturation',
      'hue',
    ] as const) {
      const result = processManualPixels(source, { ...DEFAULT_MANUAL_ADJUSTMENTS, [key]: 25 });
      expect(result.data).toHaveLength(4);
      expect(result.data[3]).toBe(255);
    }
  });

  it('applies a tone curve independently of global contrast', () => {
    const source = pixel(64, 128, 192);
    const result = processManualPixels(source, {
      ...DEFAULT_MANUAL_ADJUSTMENTS,
      curveShadows: 40,
      curveDarks: 20,
      curveLights: -20,
      curveHighlights: -40,
    });
    expect([...result.data]).not.toEqual([...source.data]);
    expect(result.data[0]).toBeGreaterThan(64);
    expect(result.data[2]).toBeLessThan(192);
  });

  it('supports independent red, green and blue channel curves', () => {
    const source = pixel(190, 190, 190);
    const result = processManualPixels(source, {
      ...DEFAULT_MANUAL_ADJUSTMENTS,
      curveRedLights: 70,
    });
    expect(result.data[0]).toBeGreaterThan(result.data[1]);
    expect(result.data[1]).toBe(result.data[2]);
  });

  it('changes a selected HSL color range without changing neutral grayscale', () => {
    const color = processManualPixels(pixel(220, 40, 40), {
      ...DEFAULT_MANUAL_ADJUSTMENTS,
      hslRedSaturation: -100,
    });
    const gray = processManualPixels(pixel(100, 100, 100), {
      ...DEFAULT_MANUAL_ADJUSTMENTS,
      hslRedSaturation: -100,
    });
    expect(
      Math.max(color.data[0], color.data[1], color.data[2]) -
        Math.min(color.data[0], color.data[1], color.data[2]),
    ).toBeLessThan(2);
    expect([...gray.data]).toEqual([100, 100, 100, 255]);
  });

  it('applies deterministic grain and vignette effects', () => {
    const source = new ImageData(new Uint8ClampedArray(Array(4 * 16).fill(128)), 4, 4);
    const settings = { ...DEFAULT_MANUAL_ADJUSTMENTS, grain: 35, vignette: 60 };
    const first = processManualPixels(source, settings);
    const second = processManualPixels(source, settings);
    expect([...first.data]).toEqual([...second.data]);
    expect([...first.data]).not.toEqual([...source.data]);
  });
});
