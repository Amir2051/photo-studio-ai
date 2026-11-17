import { describe, expect, it } from 'vitest';
import { reorderLayerSiblings } from '../src/lib/layerGroups';

const nodes = [
  { id: 'background', groupId: null },
  { id: 'one', groupId: 'group-a' },
  { id: 'two', groupId: 'group-a' },
  { id: 'three', groupId: null },
];

describe('layer group ordering', () => {
  it('reorders siblings while preserving unrelated layer positions', () => {
    const result = reorderLayerSiblings(nodes, 'two', 'one');
    expect(result?.map((layer) => layer.id)).toEqual(['background', 'two', 'one', 'three']);
  });

  it('does not move layers across group boundaries', () => {
    expect(reorderLayerSiblings(nodes, 'one', 'three')).toBeNull();
  });

  it('returns null for missing or identical layer IDs', () => {
    expect(reorderLayerSiblings(nodes, 'one', 'one')).toBeNull();
    expect(reorderLayerSiblings(nodes, 'missing', 'one')).toBeNull();
  });
});
