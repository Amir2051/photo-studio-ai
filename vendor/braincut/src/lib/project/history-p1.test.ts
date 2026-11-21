import { describe, expect, it } from 'vitest';
import { produceWithPatches } from 'immer';
import { History } from './history';

interface State { items: number[]; }

function edit(h: History<State>, state: State, label: string, recipe: (d: State) => void): State {
  const [next, patches, inverse] = produceWithPatches(state, recipe);
  h.push(label, patches, inverse);
  return next;
}

describe('P1 — non-destructive local history', () => {
  it('starts empty and never mutates the original state', () => {
    const h = new History<State>();
    const original: State = { items: [] };
    expect(h.snapshot()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, entries: [], index: 0 });
    expect(h.undo(original)).toBeNull();
    expect(h.redo(original)).toBeNull();
    const next = edit(h, original, 'add', (d) => void d.items.push(1));
    expect(next).not.toBe(original);
    expect(original.items).toEqual([]);
    const undone = h.undo(next)!;
    expect(undone.state.items).toEqual([]);
    expect(next.items).toEqual([1]);
  });

  it('keeps ordering and discards redo on a new operation', () => {
    const h = new History<State>();
    let s: State = { items: [] };
    s = edit(h, s, 'one', (d) => void d.items.push(1));
    s = edit(h, s, 'two', (d) => void d.items.push(2));
    expect(h.labels).toEqual(['one', 'two']);
    s = h.undo(s)!.state;
    expect(h.canRedo).toBe(true);
    s = edit(h, s, 'three', (d) => void d.items.push(3));
    expect(h.canRedo).toBe(false);
    expect(s.items).toEqual([1, 3]);
  });

  it('ignores invalid (empty) operations and preserves original state', () => {
    const h = new History<State>();
    const original: State = { items: [] };
    h.push('no-op', [], []);
    expect(h.length).toBe(0);
    expect(h.snapshot().entries).toEqual([]);
    expect(original.items).toEqual([]);
  });

  it('supports safe seek and clear for displayed history', () => {
    const h = new History<State>();
    let s: State = { items: [] };
    for (const n of [1, 2, 3]) s = edit(h, s, `add ${n}`, (d) => void d.items.push(n));
    s = h.seek(s, 1);
    expect(s.items).toEqual([1]);
    s = h.seek(s, 3);
    expect(s.items).toEqual([1, 2, 3]);
    h.clear();
    expect(h.snapshot().entries).toEqual([]);
  });
});
