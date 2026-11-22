import { describe, expect, it } from 'vitest';
import { createHistory } from './history';

describe('shared suite history', () => {
  it('starts empty', () => {
    const h = createHistory<number>();
    expect(h.current).toBeNull();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.size).toBe(0);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  it('records labels and walks back and forward', () => {
    const h = createHistory<number>({ now: () => 10 });
    h.push(1, 'open');
    h.push(2, 'trim');
    expect(h.current).toEqual({ state: 2, label: 'trim', at: 10 });
    expect(h.canUndo).toBe(true);
    expect(h.undo()?.state).toBe(1);
    expect(h.current?.label).toBe('open');
    expect(h.canRedo).toBe(true);
    expect(h.redo()?.state).toBe(2);
    expect(h.canRedo).toBe(false);
  });

  it('drops the redo branch after a new edit', () => {
    const h = createHistory<string>();
    h.push('a', 'first');
    h.push('b', 'second');
    h.undo();
    expect(h.canRedo).toBe(true);
    h.push('c', 'third');
    expect(h.canRedo).toBe(false);
    expect(h.redo()).toBeNull();
    expect(h.current?.state).toBe('c');
  });

  it('bounds the stack to the configured limit', () => {
    const h = createHistory<number>({ limit: 3 });
    for (let i = 1; i <= 6; i++) h.push(i, `edit ${i}`);
    expect(h.size).toBe(3);
    expect(h.current?.state).toBe(6);
    expect(h.undo()?.state).toBe(5);
    expect(h.undo()?.state).toBe(4);
    expect(h.undo()).toBeNull();
  });

  it('keeps only the current entry with a limit of one', () => {
    const h = createHistory<number>({ limit: 1 });
    h.push(1, 'a');
    h.push(2, 'b');
    h.push(3, 'c');
    expect(h.size).toBe(1);
    expect(h.current?.state).toBe(3);
    expect(h.canUndo).toBe(false);
    expect(h.undo()).toBeNull();
  });

  it('falls back to the default limit for a non-finite limit', () => {
    const h = createHistory<number>({ limit: Number.NaN });
    for (let i = 0; i < 5; i++) h.push(i, `edit ${i}`);
    expect(h.size).toBe(5);
    expect(h.current?.state).toBe(4);
  });

  it('clears all state', () => {
    const h = createHistory<number>();
    h.push(1, 'a');
    h.push(2, 'b');
    h.clear();
    expect(h.size).toBe(0);
    expect(h.current).toBeNull();
  });
});
