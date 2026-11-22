import { describe, expect, it } from 'vitest';
import {
  computeScore,
  filterItems,
  itemsToCsv,
  sortItems,
  type CullItem,
} from '../src/lib/cull';

function makeItem(patch: Partial<CullItem> = {}): CullItem {
  return {
    id: 'id-1',
    name: 'IMG_0001.jpg',
    size: 1000,
    lastModified: 100,
    dataUrl: 'data:image/jpeg;base64,AAAA',
    width: 1600,
    height: 1200,
    rating: 0,
    label: 'none',
    score: 50,
    sharpness: 0.5,
    exposure: 0.45,
    contrast: 0.5,
    faces: 0,
    ...patch,
  };
}

describe('computeScore', () => {
  it('rewards sharp, well-exposed frames over blurry, dark ones', () => {
    const sharp = computeScore({ sharpness: 0.9, exposure: 0.45, contrast: 0.6 }, 0);
    const blurry = computeScore({ sharpness: 0.05, exposure: 0.08, contrast: 0.1 }, 0);
    expect(sharp).toBeGreaterThan(blurry);
    expect(sharp).toBeLessThanOrEqual(100);
    expect(blurry).toBeGreaterThanOrEqual(0);
  });

  it('applies only a small bonus for faces present', () => {
    const withFace = computeScore({ sharpness: 0.5, exposure: 0.45, contrast: 0.5 }, 1);
    const without = computeScore({ sharpness: 0.5, exposure: 0.45, contrast: 0.5 }, 0);
    expect(withFace - without).toBeLessThanOrEqual(5);
  });
});

describe('filterItems', () => {
  const items = [
    makeItem({ id: 'a', label: 'pick', rating: 4 }),
    makeItem({ id: 'b', label: 'reject' }),
    makeItem({ id: 'c' }),
    makeItem({ id: 'd', rating: 3 }),
  ];

  it('filters by picked, rejected and unrated', () => {
    expect(filterItems(items, 'picked').map((i) => i.id)).toEqual(['a']);
    expect(filterItems(items, 'rejected').map((i) => i.id)).toEqual(['b']);
    expect(filterItems(items, 'unrated').map((i) => i.id)).toEqual(['c']);
    expect(filterItems(items, 'all')).toHaveLength(4);
  });
});

describe('sortItems', () => {
  it('sorts by score and rating without mutating the input', () => {
    const items = [
      makeItem({ id: 'low', score: 10, rating: 1, lastModified: 3 }),
      makeItem({ id: 'high', score: 90, rating: 5, lastModified: 1 }),
      makeItem({ id: 'mid', score: 50, rating: 3, lastModified: 2 }),
    ];
    expect(sortItems(items, 'score').map((i) => i.id)).toEqual(['high', 'mid', 'low']);
    expect(sortItems(items, 'rating').map((i) => i.id)).toEqual(['high', 'mid', 'low']);
    expect(sortItems(items, 'imported').map((i) => i.id)).toEqual(['high', 'mid', 'low']);
    expect(items.map((i) => i.id)).toEqual(['low', 'high', 'mid']);
  });
});

describe('itemsToCsv', () => {
  it('escapes filenames containing quotes and commas', () => {
    const csv = itemsToCsv([makeItem({ name: 'my, "best" shot.jpg' })]);
    expect(csv).toContain('"my, ""best"" shot.jpg"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
