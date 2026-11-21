<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Clip, MediaItem } from '#lib/project/types.ts';
  import { program } from '#lib/engine/session.ts';
  import { getBlob } from '#lib/media/sources.ts';
  import { computePeaks, getPeaks, DEFAULT_PEAKS_PER_SECOND } from '#lib/media/waveform.ts';
  import {
    computeLevelStats,
    detectQuietRegions,
    type AnalysisStatus,
    type LevelStats,
    type QuietRegion,
  } from '#lib/media/audio-analysis.ts';
  import { formatTimecode } from '#lib/project/time.ts';
  import {
    regionToMarker,
    buildSilenceEditPlan,
    type QuietRegionMarker,
  } from '#lib/media/silence-edit.ts';
  import {
    quietRegionMarkers,
    quietRegionPreviewing,
    setQuietRegionMarkers,
    toggleQuietRegionMarker,
    setAllQuietRegionMarkers,
    clearQuietRegionMarkers,
  } from '#lib/stores/silence.ts';
  import { preview, commitPreview, cancelPreview, undo, redo } from '#lib/project/store.ts';
  import * as ops from '#lib/project/ops.ts';
  import { buildCommands } from '#lib/editor/commands.ts';
  import { renderStatus } from '#lib/stores/app.ts';

  let {
    clips,
    media,
    fps = 30,
  }: {
    clips: readonly Clip[];
    media: readonly MediaItem[];
    fps?: number;
  } = $props();

  interface ClipAnalysis {
    key: string;
    name: string;
    mediaName: string;
    status: AnalysisStatus;
    reason: string | null;
    stats: LevelStats | null;
    regions: readonly QuietRegion[];
  }

  let results = $state<ClipAnalysis[]>([]);
  let analyzing = $state(false);
  let analysisError = $state('');
  let expanded = $state(true);
  let controller: AbortController | null = null;

  // analysis controls: read only when Analyze is pressed, never auto-applied
  let thresholdDb = $state(-60);
  let minDuration = $state(0.25);
  let padding = $state(0);

  // true only while *this* panel's preview is in flight, so unrelated
  // previews elsewhere in the app don't make us show Apply/Cancel
  let previewActive = $state(false);
  let successMessage = $state('');

  // non-destructive: recomputes on marker/selection changes, never edits media
  let plan = $derived(buildSilenceEditPlan($quietRegionMarkers, fps, true));
  let allSelected = $derived(
    $quietRegionMarkers.length > 0 && $quietRegionMarkers.every((m) => m.selected),
  );

  // one initial pass on mount; never re-run on clips/media changes because
  // that would silently undo the user's edits and re-populate the regions
  onMount(() => {
    void analyze();
  });

  onDestroy(() => {
    controller?.abort();
    if (previewActive) {
      cancelPreview();
      quietRegionPreviewing.set(false);
    }
  });

  function db(value: number): string {
    return value.toFixed(1) + ' dB';
  }

  function statusLabel(item: ClipAnalysis): string {
    switch (item.status) {
      case 'ok':
        return item.regions.length === 1 ? '1 quiet region' : item.regions.length + ' quiet regions';
      case 'no-regions':
        return 'No quiet regions';
      case 'empty':
        return 'No waveform samples';
      case 'unavailable':
        return 'Unavailable';
      case 'invalid':
        return 'Invalid waveform';
      case 'cancelled':
        return 'Cancelled';
    }
  }

  function clampNumber(raw: string, min: number, max: number, fallback: number): number {
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  function resetPreviewState(): void {
    previewActive = false;
    quietRegionPreviewing.set(false);
  }

  async function analyze(): Promise<void> {
    // a new run supersedes the old one, including any in-flight decode
    controller?.abort();
    if (previewActive) {
      cancelPreview();
      resetPreviewState();
    }
    clearQuietRegionMarkers();
    successMessage = '';

    const current = new AbortController();
    controller = current;
    const signal = current.signal;
    analyzing = true;
    analysisError = '';
    results = [];

    const byId = new Map(media.map((item) => [item.id, item]));
    const ready: Array<{ clip: Clip; item: MediaItem; mediaId: string }> = [];
    for (const clip of clips) {
      if (clip.kind !== 'audio' || clip.enabled === false || !clip.mediaId) continue;
      const item = byId.get(clip.mediaId);
      // A linked audio clip usually points at a video media item (e.g. WebM
      // with an Opus track). Accept any ready media that actually has audio.
      if (!item || item.status !== 'ready' || !(item.kind === 'audio' || item.hasAudio)) continue;
      ready.push({ clip, item, mediaId: clip.mediaId });
    }

    const out: ClipAnalysis[] = [];
    const markers: QuietRegionMarker[] = [];
    try {
      for (const { clip, item, mediaId } of ready) {
        if (signal.aborted) return;
        const base = { key: clip.id, name: clip.name, mediaName: item.name };

        let peaks: Float32Array | null = null;
        let failure: ClipAnalysis | null = null;
        try {
          peaks = getPeaks(mediaId);
          if (!peaks && !signal.aborted) {
            const blob = await getBlob(mediaId);
            if (signal.aborted) return;
            if (!blob) {
              failure = {
                ...base,
                status: 'unavailable',
                reason: 'Source file could not be read locally',
                stats: null,
                regions: [],
              };
            } else {
              peaks = await computePeaks(item, blob, { signal });
            }
          }
        } catch (cause) {
          if (signal.aborted) return;
          failure = {
            ...base,
            status: 'unavailable',
            reason: cause instanceof Error ? cause.message : 'Waveform could not be decoded locally',
            stats: null,
            regions: [],
          };
        }

        if (signal.aborted) return;
        if (failure) {
          out.push(failure);
          continue;
        }
        if (!peaks) {
          out.push({
            ...base,
            status: 'unavailable',
            reason: 'No cached or decodable waveform',
            stats: null,
            regions: [],
          });
          continue;
        }

        const config = {
          mediaId,
          perSecond: DEFAULT_PEAKS_PER_SECOND,
          maxDurationSeconds: item.duration,
          signal,
        };
        const level = computeLevelStats(peaks, config);
        const quiet = detectQuietRegions(peaks, {
          ...config,
          thresholdDb,
          minDuration,
        });

        if (level.status === 'cancelled' || quiet.status === 'cancelled') return;
        if (level.status === 'invalid' || quiet.status === 'invalid') {
          const reason = level.status === 'invalid' ? level.reason : quiet.status === 'invalid' ? quiet.reason : null;
          out.push({ ...base, status: 'invalid', reason, stats: null, regions: [] });
          continue;
        }
        if (level.status === 'unavailable' || quiet.status === 'unavailable') {
          const reason = level.status === 'unavailable' ? level.reason : quiet.status === 'unavailable' ? quiet.reason : null;
          out.push({ ...base, status: 'unavailable', reason, stats: null, regions: [] });
          continue;
        }
        if (level.status === 'empty' || quiet.status === 'empty') {
          out.push({ ...base, status: 'empty', reason: null, stats: null, regions: [] });
          continue;
        }

        const stats =
          quiet.status === 'ok' || quiet.status === 'no-regions'
            ? quiet.stats
            : level.status === 'ok'
              ? level.stats
              : null;
        const regions = quiet.status === 'ok' ? quiet.regions : [];

        // media-time detections -> sequence-time markers, via the service.
        // key is the clip id, so the clip in this row is the owning clip.
        for (const region of regions) {
          const marker = regionToMarker({ region, clip, media: item, fps, padding });
          if (marker) markers.push(marker);
        }

        out.push({
          ...base,
          status: quiet.status === 'ok' ? 'ok' : 'no-regions',
          reason: null,
          stats,
          regions,
        });
      }
      results = out;
      setQuietRegionMarkers(markers);
    } catch (cause) {
      if (signal.aborted) return;
      analysisError = cause instanceof Error ? cause.message : 'Local audio analysis failed.';
    } finally {
      if (controller === current) analyzing = false;
    }
  }

  function seekTo(time: number): void {
    // navigation only: reads a marker's sequence time, never edits the media
    program().player.seek(time);
  }

  function selectAll(): void {
    setAllQuietRegionMarkers(!allSelected);
  }

  function clearSelection(): void {
    setAllQuietRegionMarkers(false);
  }

  function previewRemoval(): void {
    if (!plan.valid || plan.ranges.length === 0 || previewActive) return;
    successMessage = '';
    preview((draft) => {
      const seq = draft.sequences.find((s) => s.id === draft.activeSequenceId) ?? draft.sequences[0];
      if (!seq) return;
      const currentPlan = buildSilenceEditPlan($quietRegionMarkers, fps, true);
      // rightmost first: removing a later range does not move earlier times,
      // and each earlier extraction then shifts the already-trimmed tail
      const ranges = [...currentPlan.ranges].sort((a, b) => b.start - a.start);
      for (const range of ranges) ops.extractRange(seq, range.start, range.end);
    });
    previewActive = true;
    quietRegionPreviewing.set(true);
  }

  function applyRemoval(): void {
    if (!previewActive) return;
    commitPreview('Remove quiet regions');
    resetPreviewState();
    clearQuietRegionMarkers();
    // the applied regions no longer describe the timeline; drop the stale
    // summary so the user must run Analyze again before another removal
    results = [];
    successMessage = 'Quiet regions removed from the timeline. Media files were not changed.';
  }

  function cancelRemoval(): void {
    cancelPreview();
    resetPreviewState();
    successMessage = '';
  }

  function undoEdit(): void {
    undo(); // cancels any in-flight preview for us
    if (previewActive) resetPreviewState();
    successMessage = '';
  }

  function redoEdit(): void {
    redo(); // cancels any in-flight preview for us
    if (previewActive) resetPreviewState();
    successMessage = '';
  }

  function openExport(): void {
    // commands.ts exposes the command registry; run the same action the top bar
    // uses instead of inventing a second export path
    buildCommands()
      .find((command) => command.id === 'export')
      ?.action();
  }
</script>

<section class="local-analysis" aria-label="Local audio analysis">
  <header>
    <button class="toggle" onclick={() => (expanded = !expanded)} aria-expanded={expanded}>
      Local audio analysis <span class="chevron">{expanded ? '−' : '+'}</span>
    </button>
    <small>Local only · peaks stay on this device</small>
    <button class="mini" onclick={undoEdit} title="Undo last timeline edit" aria-label="Undo">Undo</button>
    <button class="mini" onclick={redoEdit} title="Redo last timeline edit" aria-label="Redo">Redo</button>
    <button
      class="mini export"
      onclick={openExport}
      disabled={$renderStatus === 'rendering'}
      title={$renderStatus === 'rendering' ? 'Rendering in progress' : 'Open the export dialog'}
      aria-label="Export video">
      Export video
    </button>
  </header>

  {#if expanded}
    <div class="controls" aria-label="Analysis controls">
      <label class="control" for="qa-threshold">
        <span>Threshold</span>
        <input
          id="qa-threshold"
          type="number"
          min={-100}
          max={0}
          step={1}
          value={thresholdDb}
          onchange={(event) => (thresholdDb = clampNumber(event.currentTarget.value, -100, 0, -60))} />
        <span>dB</span>
      </label>
      <label class="control" for="qa-min-duration">
        <span>Min quiet</span>
        <input
          id="qa-min-duration"
          type="number"
          min={0.05}
          step={0.05}
          value={minDuration}
          onchange={(event) => (minDuration = clampNumber(event.currentTarget.value, 0.05, 1e6, 0.25))} />
        <span>s</span>
      </label>
      <label class="control" for="qa-padding">
        <span>Padding</span>
        <input
          id="qa-padding"
          type="number"
          min={0}
          step={0.05}
          value={padding}
          onchange={(event) => (padding = clampNumber(event.currentTarget.value, 0, 1e6, 0))} />
        <span>s</span>
      </label>
      <button class="analyze" onclick={analyze} disabled={analyzing} aria-label="Analyze audio">
        {analyzing ? 'Analyzing…' : 'Analyze'}
      </button>
    </div>

    {#if analyzing}
      <p class="hint">Analyzing local waveforms…</p>
    {/if}
    {#if $renderStatus !== 'idle'}
      <p class="hint">Render status: {$renderStatus}</p>
    {/if}
    {#if analysisError}<p class="error">{analysisError}</p>{/if}
    {#if !results.length && !analyzing && !analysisError}
      <p class="hint">Press Analyze to scan ready audio clips with local media on this sequence.</p>
    {:else}
      <div class="results">
        {#each results as item (item.key)}
          <div class="clip">
            <div class="clip-head">
              <span class="name" title={item.mediaName}>{item.name}</span>
              <span class="status" class:warn={item.status !== 'ok' && item.status !== 'no-regions'}>{statusLabel(item)}</span>
            </div>
            {#if item.stats}
              <div class="metrics">
                <span>Peak {db(item.stats.peakDb)}</span>
                <span>RMS {db(item.stats.rmsDb)}</span>
                <span>Range {item.stats.dynamicRangeDb.toFixed(1)} dB</span>
                {#if item.stats.allSilent}<span class="muted">all buckets at zero amplitude</span>{/if}
              </div>
            {/if}
            {#if item.reason}<div class="reason">{item.reason}</div>{/if}
            {#if item.status === 'no-regions'}
              <div class="reason">No runs at or below {thresholdDb} dB lasting {minDuration}s or longer.</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if $quietRegionMarkers.length}
      <div class="edit-plan" aria-label="Proposed quiet region removals">
        <div class="plan-head">
          <strong>Quiet regions ({$quietRegionMarkers.length})</strong>
          <button
            class="mini"
            onclick={selectAll}
            aria-pressed={allSelected}
            title={allSelected ? 'Deselect all regions' : 'Select all regions'}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <button class="mini" onclick={clearSelection} title="Clear region selection">Clear</button>
        </div>

        <div class="marker-list">
          {#each $quietRegionMarkers as marker (marker.id)}
            <div class="marker">
              <input
                id={'quiet-' + marker.id}
                type="checkbox"
                checked={marker.selected}
                onchange={() => toggleQuietRegionMarker(marker.id)}
                aria-label={'Include quiet region ' + formatTimecode(marker.start, fps)} />
              <button
                class="region"
                onclick={() => seekTo(marker.start)}
                title={'Seek to ' + formatTimecode(marker.start, fps)}>
                {formatTimecode(marker.start, fps)} – {formatTimecode(marker.end, fps)}
                <small>{marker.duration.toFixed(2)}s · peak {db(marker.peakDb)}</small>
              </button>
            </div>
          {/each}
        </div>

        <div class="plan-summary">
          <span>Estimated removal: {formatTimecode(plan.totalRemoved, fps)} ({plan.totalRemoved.toFixed(2)}s)</span>
          {#if plan.warnings.length}
            <span class="warning-text">{plan.warnings.join(' · ')}</span>
          {/if}
        </div>

        <div class="actions">
          {#if previewActive}
            <span class="previewing" role="status">Previewing — Apply or Cancel</span>
            <button class="action primary" onclick={applyRemoval}>Apply</button>
            <button class="action" onclick={cancelRemoval}>Cancel</button>
          {:else}
            <button
              class="action primary"
              onclick={previewRemoval}
              disabled={!plan.valid || plan.ranges.length === 0}
              title="Preview removal in the timeline (media files are untouched)">
              Preview removal
            </button>
          {/if}
        </div>

        {#if !plan.valid || plan.ranges.length === 0}
          <p class="hint">No valid quiet ranges to remove. Select at least one region and analyze again.</p>
        {/if}
        {#if successMessage}<p class="success" role="status">{successMessage}</p>{/if}
      </div>
    {/if}
  {/if}
</section>

<style>
  .local-analysis {
    flex-shrink: 0;
    max-height: 210px;
    overflow: auto;
    padding: 7px 10px 9px;
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text-secondary);
  }

  header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 9px;
  }

  header small {
    color: var(--text-muted);
    font-size: 9px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-primary);
    font-size: 10px;
    font-weight: 500;
  }

  .chevron {
    color: var(--accent);
    font-family: var(--font-editor);
  }

  .mini,
  .action,
  .analyze {
    padding: 3px 7px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 9px;
  }

  .mini:hover:not(:disabled),
  .action:hover:not(:disabled),
  .analyze:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .mini:disabled,
  .action:disabled,
  .analyze:disabled {
    opacity: 0.5;
  }

  .export {
    margin-left: auto;
  }

  .primary {
    color: var(--accent);
    border-color: var(--accent);
  }

  .controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px 10px;
    margin-top: 7px;
  }

  .control {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
    font-size: 9px;
  }

  .control input {
    width: 50px;
    padding: 2px 4px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-family: var(--font-editor);
    font-size: 9px;
  }

  .control input:focus-visible {
    outline: none;
    border-color: var(--accent);
  }

  .analyze {
    color: var(--accent);
    border-color: var(--accent);
  }

  .hint,
  .error,
  .reason,
  .success,
  .warning-text {
    margin: 6px 0 0;
    font-size: 9px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .error {
    color: var(--error);
  }

  .warning-text {
    color: var(--warning);
  }

  .success {
    color: var(--accent);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 7px;
  }

  .clip {
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-surface);
  }

  .clip-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 10px;
  }

  .status {
    font-family: var(--font-editor);
    font-size: 9px;
    color: var(--accent);
    white-space: nowrap;
  }

  .status.warn {
    color: var(--warning);
  }

  .metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin-top: 4px;
    font-family: var(--font-editor);
    font-size: 9px;
    color: var(--text-secondary);
  }

  .metrics .muted {
    color: var(--text-muted);
  }

  .edit-plan {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }

  .plan-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .plan-head strong {
    flex: 1;
    font-size: 9px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .marker-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 5px;
  }

  .marker {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .marker input[type='checkbox'] {
    width: 11px;
    height: 11px;
    margin: 0;
    accent-color: var(--accent);
  }

  .region {
    flex: 1;
    padding: 3px 6px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-family: var(--font-editor);
    font-size: 9px;
    text-align: left;
  }

  .region:hover {
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .region small {
    display: block;
    color: var(--text-muted);
    font-size: 8px;
  }

  .plan-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 6px;
    font-family: var(--font-editor);
    font-size: 9px;
    color: var(--text-secondary);
  }

  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .previewing {
    color: var(--accent);
    font-size: 9px;
  }
</style>
