<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import type { MediaItem } from '#lib/project/types.ts';
  import { getBlobForMedia } from '#lib/media/sources.ts';
  import { computePeaks } from '#lib/media/waveform.ts';
  import { computeLevelStats, detectQuietRegions } from '#lib/media/audio-analysis.ts';
  import { normalizeMediaMetadata } from '#lib/media/media-metadata.ts';

  let { media, onClose }: { media: MediaItem; onClose: () => void } = $props();
  let busy = $state(false);
  let progress = $state(0);
  let error = $state('');
  let levels = $state<ReturnType<typeof computeLevelStats> | null>(null);
  let quiet = $state<ReturnType<typeof detectQuietRegions> | null>(null);
  let controller: AbortController | null = null;
  const metadata = $derived(normalizeMediaMetadata({ ...media }));

  onDestroy(() => controller?.abort());

  async function analyze(): Promise<void> {
    controller?.abort();
    const run = new AbortController();
    controller = run;
    busy = true;
    error = '';
    levels = null;
    quiet = null;
    progress = 0;
    try {
      if (media.status !== 'ready') throw new Error('This media is not ready. Relink or convert it before analysis.');
      if (!media.hasAudio) {
        progress = 1;
        return;
      }
      const blob = await getBlobForMedia(media);
      if (!blob) throw new Error('The source file is unavailable. Relink it and try again.');
      const peaks = await computePeaks(media, blob, { signal: run.signal, onProgress: (value) => { if (!run.signal.aborted) progress = value; } });
      if (run.signal.aborted) return;
      levels = computeLevelStats(peaks, { mediaId: media.id });
      quiet = detectQuietRegions(peaks, { mediaId: media.id, minDuration: 0.35, mergeGap: 0.12 });
    } catch (cause) {
      if (!run.signal.aborted) error = cause instanceof Error ? cause.message : 'Local analysis failed.';
    } finally {
      if (controller === run) busy = false;
    }
  }

  function cancel(): void {
    controller?.abort();
    busy = false;
  }

  function db(value: number): string {
    return Number.isFinite(value) ? value.toFixed(1) + ' dBFS' : '—';
  }

  $effect(() => { void analyze(); });
</script>

<dialog open class="local-analysis" aria-label="Local media analysis">
  <header>
    <div><span class="eyebrow">LOCAL MEDIA REPORT</span><h3>{media.name}</h3></div>
    <button class="close" onclick={onClose} aria-label="Close report"><Icon name="x" size={15} /></button>
  </header>
  <p class="privacy"><Icon name="shield-check" size={13} /> Metadata and waveform analysis run on this device. No media is uploaded and no AI provider is contacted.</p>
  <div class="metadata">
    <span>{metadata.dimensions ?? 'Dimensions unavailable'}</span>
    <span>{metadata.fps === null ? 'Frame rate unavailable' : metadata.fps + ' fps'}</span>
    <span>{metadata.duration ?? 'Duration unavailable'}</span>
    <span>{(metadata.container ?? media.mimeType) || 'Format unavailable'}</span>
    <span>{metadata.videoCodec ?? 'Video codec unavailable'}</span>
    <span>{metadata.audioCodec ?? 'Audio codec unavailable'}</span>
  </div>
  {#if busy}
    <div class="progress"><span style="width: {Math.round(progress * 100)}%"></span></div>
    <p class="status">Building local waveform… {Math.round(progress * 100)}%</p>
    <button class="secondary" onclick={cancel}>Cancel analysis</button>
  {:else if error}
    <p class="error">{error}</p><button class="secondary" onclick={analyze}>Retry</button>
  {:else if levels}
    {#if levels.status === 'ok'}
      <div class="metrics">
        <article><small>Peak</small><strong>{db(levels.stats.peakDb)}</strong></article>
        <article><small>Average RMS</small><strong>{db(levels.stats.rmsDb)}</strong></article>
        <article><small>Dynamic range</small><strong>{levels.stats.dynamicRangeDb.toFixed(1)} dB</strong></article>
      </div>
      {#if levels.stats.allSilent}<p class="notice">This audio appears silent or nearly silent.</p>{/if}
    {:else}<p class="notice">Audio levels unavailable: {levels.status === 'unavailable' || levels.status === 'invalid' ? levels.reason : levels.status}.</p>{/if}
    {#if quiet && (quiet.status === 'ok' || quiet.status === 'no-regions')}
      <div class="quiet"><strong>{quiet.regions.length} quiet region{quiet.regions.length === 1 ? '' : 's'} detected</strong>
        <p>Potential pauses to review in the timeline. Detection is advisory; nothing was cut.</p>
        {#each quiet.regions.slice(0, 12) as region, i}
          <div class="region"><span>{i + 1}. {region.start.toFixed(2)}–{region.end.toFixed(2)}s</span><span>{region.duration.toFixed(2)}s · {db(region.meanDb)}</span></div>
        {/each}
        {#if quiet.regions.length > 12}<small>Showing first 12 of {quiet.regions.length} regions.</small>{/if}
      </div>
    {:else if quiet}<p class="notice">Quiet-region detection: {quiet.status === 'unavailable' || quiet.status === 'invalid' ? quiet.reason : quiet.status}.</p>{/if}
  {:else if !media.hasAudio}
    <p class="notice">This item has no audio track. The media metadata above was inspected locally.</p>
  {/if}
  <footer><span>Read-only report · {new Date().toLocaleString()}</span><button class="secondary" onclick={onClose}>Done</button></footer>
</dialog>

<style>
  .local-analysis{position:absolute;z-index:80;inset:12px;margin:0;max-width:none;max-height:none;box-sizing:border-box;overflow:auto;padding:16px;background:var(--bg-elevated);border:1px solid var(--border-strong);box-shadow:0 14px 44px #0008;color:var(--text-primary);display:flex;flex-direction:column;gap:12px;font:12px var(--font-ui)}
  header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border);padding-bottom:10px}
  h3{font-size:15px;font-weight:600;margin:4px 0 0;overflow-wrap:anywhere}
  .eyebrow{font:10px var(--font-editor);letter-spacing:.12em;color:var(--accent)}
  button{cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:inherit;padding:6px 10px}
  .close{padding:4px;display:flex}.privacy,.status{color:var(--text-muted);display:flex;align-items:center;gap:6px}
  .metadata{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .metadata span{padding:7px;background:var(--bg-surface);border:1px solid var(--border);overflow-wrap:anywhere}
  .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  article{padding:10px;background:var(--bg-surface);border:1px solid var(--border);display:flex;flex-direction:column;gap:5px}
  article small{color:var(--text-muted)}article strong{font:14px var(--font-editor)}
  .progress{height:4px;background:var(--border)}.progress span{display:block;height:100%;background:var(--accent);transition:width .1s}
  .quiet{border:1px solid var(--border);padding:10px}.quiet>strong{font-size:13px}.quiet p{color:var(--text-muted);margin:5px 0 10px}
  .region{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-top:1px solid var(--border);font:11px var(--font-editor)}
  .region span:last-child{color:var(--text-muted);text-align:right}.notice{padding:8px;background:var(--bg-surface);border-left:2px solid var(--accent)}
  .error{color:var(--error)}footer{margin-top:auto;border-top:1px solid var(--border);padding-top:10px;display:flex;align-items:center;justify-content:space-between;color:var(--text-muted)}
  @media(max-width:520px){.metadata{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.region{flex-direction:column}}
</style>
