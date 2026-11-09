export type GroupedLayer = {
  id: string;
  groupId?: string | null;
};

/** Reorder a layer among siblings without moving it into or out of a group. */
export function reorderLayerSiblings<T extends GroupedLayer>(
  layers: T[],
  sourceId: string,
  targetId: string,
): T[] | null {
  if (sourceId === targetId) return null;
  const source = layers.find((layer) => layer.id === sourceId);
  const target = layers.find((layer) => layer.id === targetId);
  if (!source || !target || (source.groupId || null) !== (target.groupId || null)) return null;

  const parentId = source.groupId || null;
  const siblings = layers.filter((layer) => (layer.groupId || null) === parentId);
  const from = siblings.findIndex((layer) => layer.id === sourceId);
  const to = siblings.findIndex((layer) => layer.id === targetId);
  if (from < 0 || to < 0) return null;

  const reordered = [...siblings];
  const [moving] = reordered.splice(from, 1);
  reordered.splice(to, 0, moving);
  let index = 0;
  return layers.map((layer) => ((layer.groupId || null) === parentId ? reordered[index++] : layer));
}
