<script lang="ts">
  import type { QuietRegionMarker } from '#lib/media/silence-edit.ts';
  import { timeToX } from '#lib/editor/timeline-interactions.ts';
  import { quietRegionMarkers } from '#lib/stores/silence.ts';

  let {
    zoom,
    scroll,
    width,
    fps = 30
  }: {
    zoom: number;
    scroll: number;
    width: number;
    fps?: number;
  } = $props();

  // same visible window the ruler draws ticks for
  const viewEnd = $derived(scroll + width / zoom);
  const visible = $derived(
    $quietRegionMarkers.filter((m) => m.end >= scroll && m.start <= viewEnd),
  );

  function barLeft(m: QuietRegionMarker): number {
    return timeToX(m.start, zoom, scroll);
  }

  function barWidth(m: QuietRegionMarker): number {
    return Math.max(2, (m.end - m.start) * zoom);
  }

  function frameLabel(seconds: number): string {
    return `${Math.round(seconds * fps)}f`;
  }
</script>

<!-- informational only: pointer-events none so ruler scrubbing is untouched -->
<div class="quiet-overlay" aria-hidden="true">
  {#each visible as marker (marker.id)}
    {@const left = barLeft(marker)}
    {@const barW = barWidth(marker)}
    <div
      class="quiet-bar"
      class:selected={marker.selected}
      style="left: {left}px; width: {barW}px"
      title="Quiet {marker.start.toFixed(2)}s–{marker.end.toFixed(2)}s · {frameLabel(
        marker.duration,
      )} · {marker.peakDb.toFixed(1)} dB">
      {#if barW > 48}
        <span class="quiet-label">quiet</span>
      {/if}
    </div>
  {/each}
  {#if visible.length > 0}
    <div class="quiet-count">{visible.length} quiet</div>
  {/if}
</div>

<style>
  .quiet-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }

  .quiet-bar {
    position: absolute;
    bottom: 2px;
    height: 9px;
    background: var(--warning);
    border-radius: 1px;
    opacity: 0.4;
    overflow: hidden;
  }

  .quiet-bar.selected {
    opacity: 0.85;
    box-shadow: 0 0 0 1px var(--warning);
  }

  .quiet-label {
    display: block;
    padding-left: 3px;
    font-family: var(--font-editor);
    font-size: 8px;
    line-height: 9px;
    color: var(--bg-surface);
    white-space: nowrap;
  }

  .quiet-count {
    position: absolute;
    right: 4px;
    bottom: 1px;
    font-family: var(--font-editor);
    font-size: 9px;
    line-height: 10px;
    color: var(--warning);
    opacity: 0.8;
  }
</style>
