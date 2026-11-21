import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Persistence for the resizable / collapsible studio shell.
 * Only local state is read and written here — no network or provider calls.
 */
export const STUDIO_LAYOUT_KEY = 'studio-layout';

export interface StudioLayout {
  left: number;
  right: number;
  collapsedLibrary: boolean;
  collapsedTools: boolean;
}

export const DEFAULT_STUDIO_LAYOUT: StudioLayout = {
  left: 264,
  right: 320,
  collapsedLibrary: false,
  collapsedTools: false,
};

export const LEFT_MIN = 200;
export const LEFT_MAX = 460;
export const RIGHT_MIN = 260;
export const RIGHT_MAX = 520;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function readStudioLayout(): StudioLayout {
  if (typeof window === 'undefined') return { ...DEFAULT_STUDIO_LAYOUT };
  try {
    const raw = window.localStorage.getItem(STUDIO_LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_STUDIO_LAYOUT };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STUDIO_LAYOUT };
    const record = parsed as Record<string, unknown>;
    const left =
      typeof record.left === 'number' && Number.isFinite(record.left)
        ? clamp(record.left, LEFT_MIN, LEFT_MAX)
        : DEFAULT_STUDIO_LAYOUT.left;
    const right =
      typeof record.right === 'number' && Number.isFinite(record.right)
        ? clamp(record.right, RIGHT_MIN, RIGHT_MAX)
        : DEFAULT_STUDIO_LAYOUT.right;
    return {
      left,
      right,
      collapsedLibrary: record.collapsedLibrary === true,
      collapsedTools: record.collapsedTools === true,
    };
  } catch (error) {
    console.warn('[studio-layout] Could not read saved layout; using defaults.', error);
    return { ...DEFAULT_STUDIO_LAYOUT };
  }
}

export function writeStudioLayout(layout: StudioLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDIO_LAYOUT_KEY, JSON.stringify(layout));
  } catch (error) {
    console.warn('[studio-layout] Could not persist layout.', error);
  }
}

export interface StudioSplitterProps {
  /** Which column the handle resizes: the library (left) or tools (right). */
  side: 'left' | 'right';
  shellRef: React.RefObject<HTMLDivElement | null>;
  min?: number;
  max?: number;
}

/**
 * Pointer-drag column splitter. Writes --pro-left / --pro-right on the shell
 * element and persists the result under localStorage key `studio-layout`.
 * All listeners are removed on pointer-up/cancel and on unmount.
 */
export default function StudioSplitter({
  side,
  shellRef,
  min,
  max,
}: StudioSplitterProps): React.JSX.Element {
  const minWidth = min ?? (side === 'left' ? LEFT_MIN : RIGHT_MIN);
  const maxWidth = max ?? (side === 'left' ? LEFT_MAX : RIGHT_MAX);
  const cleanupRef = useRef<(() => void) | null>(null);

  const stopDrag = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    },
    [],
  );

  const applyWidth = useCallback(
    (width: number) => {
      const shell = shellRef.current;
      if (!shell) return;
      const clamped = clamp(Math.round(width), minWidth, maxWidth);
      shell.style.setProperty(side === 'left' ? '--pro-left' : '--pro-right', `${clamped}px`);
      const layout = readStudioLayout();
      writeStudioLayout(
        side === 'left' ? { ...layout, left: clamped } : { ...layout, right: clamped },
      );
    },
    [maxWidth, minWidth, shellRef, side],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    const shell = shellRef.current;
    if (!shell) return;
    event.preventDefault();

    const handleMove = (moveEvent: PointerEvent): void => {
      const rect = shell.getBoundingClientRect();
      const raw =
        side === 'left' ? moveEvent.clientX - rect.left : rect.right - moveEvent.clientX;
      applyWidth(raw);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const step = event.key === 'ArrowLeft' ? -16 : event.key === 'ArrowRight' ? 16 : 0;
    if (!step) return;
    event.preventDefault();
    // For the right column, moving the handle right makes the column narrower.
    applyWidth(readStudioLayout()[side] + (side === 'left' ? step : -step));
  };

  return (
    <div
      className="studio-splitter"
      data-studio-splitter={side}
      data-testid={`studio-splitter-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`${side === 'left' ? 'Library' : 'Tools'} column resize handle`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <span className="studio-splitter-grip" aria-hidden="true" />
    </div>
  );
}
