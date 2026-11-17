import { describe, expect, it } from 'vitest';
import {
  clampAccessorySettings,
  DEFAULT_FACE_ACCESSORY_SETTINGS,
  getAccessoryAnchor,
} from '../src/lib/faceAccessories';
import type { NormalizedPoint } from '../src/lib/portraitRetouch';

function landmarks(): NormalizedPoint[] {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  points[127] = { x: 0.2, y: 0.4 };
  points[356] = { x: 0.8, y: 0.4 };
  points[10] = { x: 0.5, y: 0.2 };
  points[152] = { x: 0.5, y: 0.8 };
  return points;
}

describe('face accessory landmark geometry', () => {
  it('derives a normalized center, dimensions and face roll', () => {
    expect(getAccessoryAnchor(landmarks())).toEqual({
      center: { x: 0.5, y: 0.5 },
      width: 0.6000000000000001,
      height: 0.6000000000000001,
      roll: 0,
    });
  });

  it('detects face roll from the temple line', () => {
    const tilted = landmarks();
    tilted[127] = { x: 0.2, y: 0.5 };
    tilted[356] = { x: 0.8, y: 0.3 };
    expect(getAccessoryAnchor(tilted)?.roll).toBeCloseTo(-Math.atan2(0.2, 0.6));
  });

  it('rejects incomplete or degenerate face landmarks', () => {
    expect(getAccessoryAnchor([])).toBeNull();
    const degenerate = landmarks();
    degenerate[356] = { x: 0.2, y: 0.4 };
    expect(getAccessoryAnchor(degenerate)).toBeNull();
  });

  it('keeps the anchor normalized for high-resolution exports', () => {
    const anchor = getAccessoryAnchor(landmarks());
    expect(anchor?.center.x).toBe(0.5);
    expect(anchor?.center.y).toBe(0.5);
    expect(anchor?.width).toBeCloseTo(0.6);
    expect(anchor?.height).toBeCloseTo(0.6);
  });
});

describe('face accessory settings', () => {
  it('provides neutral defaults', () => {
    expect(DEFAULT_FACE_ACCESSORY_SETTINGS).toEqual({
      scale: 100,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      opacity: 100,
    });
  });

  it('clamps all controls to safe UI ranges', () => {
    expect(
      clampAccessorySettings({
        scale: 999,
        offsetX: -999,
        offsetY: 999,
        rotation: -999,
        opacity: 500,
      }),
    ).toEqual({
      scale: 160,
      offsetX: -50,
      offsetY: 50,
      rotation: -45,
      opacity: 100,
    });
  });

  it('replaces non-finite values with defaults', () => {
    expect(
      clampAccessorySettings({
        scale: Number.NaN,
        offsetX: Infinity,
        offsetY: -Infinity,
        rotation: Number.NaN,
        opacity: Number.NaN,
      }),
    ).toEqual(DEFAULT_FACE_ACCESSORY_SETTINGS);
  });
});
