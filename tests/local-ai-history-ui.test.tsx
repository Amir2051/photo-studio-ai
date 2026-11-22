// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HistoryPanel, { type HistoryPanelProps } from '../src/editor/HistoryPanel';

afterEach(() => cleanup());

// HistoryPanel is a pure presentational component driven entirely by props,
// so history behaviour can be exercised without importing Home.tsx or any
// production state. Only the props it actually reads are populated.
function makeProps(over: Partial<HistoryPanelProps> = {}): HistoryPanelProps {
  const snapshot = (tag: string) => ({
    adjustments: { tag },
    manualAdjustments: {},
    localMasks: [],
    healStrokes: [],
  });
  const base = {
    history: [snapshot('original'), snapshot('first'), snapshot('second')],
    historyIndex: 2,
    canUndo: true,
    canRedo: false,
    undo: vi.fn(),
    redo: vi.fn(),
    setHistoryIndex: vi.fn(),
    setAdjustments: vi.fn(),
    setManualAdjustments: vi.fn(),
    setLocalMasks: vi.fn(),
    setHealStrokes: vi.fn(),
    setSelection: vi.fn(),
    setDocumentTransform: vi.fn(),
    setLayers: vi.fn(),
    setSelectedLayerId: vi.fn(),
  } as unknown as HistoryPanelProps;
  return { ...base, ...over };
}

describe('P1 — local editing-history UI (non-destructive)', () => {
  it('renders the history states and marks the current one', () => {
    render(<HistoryPanel {...makeProps()} />);
    expect(screen.getByText('3 states')).toBeTruthy();
    expect(screen.getByText('Original state')).toBeTruthy();
    expect(screen.getByText('Edit state 1')).toBeTruthy();
    expect(screen.getByText('Edit state 2')).toBeTruthy();
    expect(screen.getByText('Current state')).toBeTruthy();
    expect(screen.getAllByText('Previous state')).toHaveLength(2);
  });

  it('disables undo and redo when there is no history to traverse', () => {
    const props = makeProps({ canUndo: false, canRedo: false });
    render(<HistoryPanel {...props} />);
    expect((screen.getByRole('button', { name: /Undo/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Redo/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('invokes undo and redo callbacks from the footer controls', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    render(<HistoryPanel {...makeProps({ undo, redo, canUndo: true, canRedo: true })} />);
    fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
    fireEvent.click(screen.getByRole('button', { name: /Redo/ }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it('restores the original snapshot from the timeline without mutating it', () => {
    const props = makeProps();
    const original = props.history[0] as HistoryPanelProps['history'][number];
    render(<HistoryPanel {...props} />);
    fireEvent.click(screen.getByText('Original state').closest('button')!);

    expect(props.setHistoryIndex).toHaveBeenCalledWith(0);
    expect(props.setAdjustments).toHaveBeenCalledWith(original.adjustments);
    expect(props.setManualAdjustments).toHaveBeenCalledWith(original.manualAdjustments);
    expect(props.setLocalMasks).toHaveBeenCalledWith(original.localMasks);
    expect(props.setHealStrokes).toHaveBeenCalledWith(original.healStrokes);
    expect(original.localMasks).toEqual([]); // original snapshot left intact
  });

  it('handles an empty history as a no-op with disabled controls', () => {
    const props = makeProps({ history: [], historyIndex: 0, canUndo: false, canRedo: false });
    render(<HistoryPanel {...props} />);
    expect(screen.getByText('0 states')).toBeTruthy();
    expect(screen.queryByText('Original state')).toBeNull();
    expect((screen.getByRole('button', { name: /Undo/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Redo/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
