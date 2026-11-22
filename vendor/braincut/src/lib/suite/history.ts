// Framework-neutral undo/redo for any editing surface. The existing video
// editor keeps its immer-based history; this stack is for shared suite state
// and future photo/audio surfaces, so it takes plain snapshots and has no
// store/dependency on Svelte or React.

export interface HistoryEntry<T> {
  state: T;
  label: string;
  at: number;
}

export interface SuiteHistory<T> {
  push(state: T, label: string): void;
  undo(): HistoryEntry<T> | null;
  redo(): HistoryEntry<T> | null;
  clear(): void;
  readonly current: HistoryEntry<T> | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
}

export interface HistoryOptions {
  limit?: number;
  now?: () => number;
}

export function createHistory<T>(opts: HistoryOptions = {}): SuiteHistory<T> {
  const requested = opts.limit;
  const limit = typeof requested === 'number' && Number.isFinite(requested)
    ? Math.max(1, Math.floor(requested))
    : 200;
  const now = opts.now ?? (() => Date.now());
  let past: HistoryEntry<T>[] = [];
  let present: HistoryEntry<T> | null = null;
  let future: HistoryEntry<T>[] = [];

  return {
    push(state, label) {
      // a new edit invalidates the redo branch, like every desktop NLE
      future = [];
      if (present) past.push(present);
      // slice(-0) is slice(0), so the limit-1 case must be explicit
      past = limit > 1 ? past.slice(-(limit - 1)) : [];
      present = { state, label, at: now() };
    },
    undo() {
      const previous = past.pop();
      if (!previous) return null;
      if (present) future.push(present);
      present = previous;
      return previous;
    },
    redo() {
      const next = future.pop();
      if (!next) return null;
      if (present) past.push(present);
      present = next;
      return next;
    },
    clear() {
      past = [];
      future = [];
      present = null;
    },
    get current() {
      return present;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    get size() {
      return past.length + (present ? 1 : 0) + future.length;
    },
  };
}
