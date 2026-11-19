import { describe, expect, it } from 'vitest';
import { collectMemory, memoryDeltas } from './performance';

describe('collectMemory', () => {
  it('reports an unmeasured heap when the browser exposes nothing', () => {
    const report = collectMemory({ now: () => 12 });
    expect(report.heap.source).toBe('none');
    expect(report.heap.usedBytes).toBeNull();
    expect(report.heap.limitBytes).toBeNull();
    expect(report.dom.source).toBe('none');
    expect(report.collectedAt).toBe(12);
  });

  it('collects the pieces the long-form protocol asks about', () => {
    const report = collectMemory({
      timelineLogicalClips: 25,
      peaks: { entries: 3, bytes: 1200 },
      frames: { readers: 2, cursors: 1, images: 0, imageBytes: 0, frames: 4 },
      dom: { source: 'count', nodes: 42 },
    });
    expect(report.peaks).toEqual({ entries: 3, bytes: 1200 });
    expect(report.frames).toEqual({ readers: 2, cursors: 1, images: 0, imageBytes: 0, frames: 4 });
    expect(report.timeline).toEqual({ logicalClips: 25 });
    expect(report.dom).toEqual({ source: 'count', nodes: 42 });
  });

  it('computes deltas only between two collected samples', () => {
    const before = collectMemory({ now: () => 0 });
    const after = collectMemory({ now: () => 5 });
    const delta = memoryDeltas(before, after);
    // nothing was measured as a heap source, so no delta is invented
    expect(delta.heapUsedDeltaBytes).toBeNull();
    expect(delta.domNodesDelta).toBeNull();
  });
});
