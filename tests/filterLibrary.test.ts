import { describe, expect, it } from 'vitest';
import { CATEGORIES, FILTER_LIBRARY, FILTERS_BY_CATEGORY } from '../src/lib/filters';

describe('filter catalogue', () => {
  it('initializes category groups and preserves every catalogue entry', () => {
    expect(FILTER_LIBRARY).toHaveLength(226);
    expect(new Set(FILTER_LIBRARY.map((filter) => filter.id)).size).toBe(FILTER_LIBRARY.length);
    expect(Object.values(FILTERS_BY_CATEGORY).flat()).toHaveLength(FILTER_LIBRARY.length);
    expect(FILTERS_BY_CATEGORY['natural-portraits'].length).toBeGreaterThan(0);
    expect(FILTERS_BY_CATEGORY.custom).toEqual([]);
  });

  it('provides category labels for every non-custom filter group', () => {
    const labelled = new Set(CATEGORIES.map((category) => category.id));
    for (const category of Object.keys(FILTERS_BY_CATEGORY)) {
      if (
        category !== 'custom' &&
        FILTERS_BY_CATEGORY[category as keyof typeof FILTERS_BY_CATEGORY].length
      ) {
        expect(labelled.has(category as (typeof CATEGORIES)[number]['id'])).toBe(true);
      }
    }
  });
});
