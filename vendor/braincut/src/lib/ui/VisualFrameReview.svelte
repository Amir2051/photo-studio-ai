<script lang="ts">
  import { get } from 'svelte/store';
  import Icon from './Icon.svelte';
  import { activeSequence, project } from '#lib/project/store.ts';
  import { getBlob } from '#lib/media/sources.ts';
  import { filmstripFrames } from '#lib/media/thumbnails.ts';
  import type { MediaItem } from '#lib/project/types.ts';

  let { onClose }: { onClose: () => void } = $props();
  type Candidate = { key: string; mediaId: string; mediaName: string; clipName: string; sequenceTime: number; sourceTime: number };
  type ReviewFrame = Candidate & { dataUrl: string; selected: boolean };
  let frames = $state<ReviewFrame[]>([]);
  let busy = $state(false);
  let error = $state('');
  let interval = $state('3');
  let maxFrames = $state('12');
  let progress = $state('');
  let copied = $state(false);

  function candidates(): Candidate[] {
    const current = get(project);
    const sequence = get(activeSequence);
    if (!current || !sequence) return [];
    const mediaById = new Map(current.media.map((item) => [item.id, item]));
    const list: Candidate[] = [];
    const step = Number(interval);
    const limit = Number(maxFrames);
    for (const track of sequence.tracks.filter((item) => item.kind === 'video' && !item.hidden)) {
      for (const clip of track.clips) {
        if (!clip.enabled || clip.kind !== 'video' || !clip.mediaId) continue;
        const media = mediaById.get(clip.mediaId);
        if (!media || media.kind !== 'video' || !media.hasVideo || media.status !== 'ready') continue;
        const count = Math.max(1, Math.ceil(clip.duration / step));
        for (let i = 0; i < count && list.length < limit; i++) {
          const offset = Math.min(clip.duration, Math.min(clip.duration - 0.001, (i + 0.5) * step));
          if (offset < 0) continue;
          list.push({
            key: clip.id + ':' + i,
            mediaId: media.id,
            mediaName: media.name,
            clipName: clip.name,
            sequenceTime: clip.start + offset,
            sourceTime: Math.max(0, clip.in + (clip.reverse ? Math.max(0, clip.duration - offset) : offset) * clip.speed),
          });
        }
        if (list.length >= limit) return list;
      }
    }
    return list;
  }

  async function sample(): Promise<void> {
    if (busy) return;
    busy = true;
    error = '';
    frames = [];
    copied = false;
    try {
      const current = get(project);
      const sequence = get(activeSequence);
      if (!current || !sequence) throw new Error('Open a project and select a sequence first.');
      const picks = candidates();
      if (!picks.length) throw new Error('No available video clips were found on visible video tracks.');
      const mediaById = new Map(current.media.map((item) => [item.id, item]));
      const grouped = new Map<string, Candidate[]>();
      for (const pick of picks) grouped.set(pick.mediaId, [...(grouped.get(pick.mediaId) ?? []), pick]);
      const extracted: ReviewFrame[] = [];
      let done = 0;
      for (const [mediaId, group] of grouped) {
        const media = mediaById.get(mediaId) as MediaItem;
        progress = 'Reading ' + media.name + ' locally…';
        const blob = await getBlob(media.id);
        if (!blob) throw new Error('Could not read "' + media.name + '". Relink the original media and try again.');
        const bitmaps = await filmstripFrames(media, blob, {
          times: group.map((item) => Math.min(media.duration, item.sourceTime)),
          width: 480,
        });
        for (let i = 0; i < group.length; i++) {
          const bitmap = bitmaps[i];
          if (!bitmap) continue;
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.drawImage(bitmap, 0, 0);
          extracted.push({ ...group[i], dataUrl: canvas.toDataURL('image/jpeg', 0.78), selected: true });
          done++;
        }
      }
      frames = extracted;
      if (!frames.length) throw new Error('No frames could be decoded from these clips in this browser.');
      progress = 'Extracted ' + done + ' frame' + (done === 1 ? '' : 's') + ' on this device.';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Frame extraction failed.';
    } finally {
      busy = false;
    }
  }

  function toggleFrame(key: string): void {
    frames = frames.map((frame) => frame.key === key ? { ...frame, selected: !frame.selected } : frame);
  }

  function selectAll(value: boolean): void {
    frames = frames.map((frame) => ({ ...frame, selected: value }));
  }

  async function copyReviewSummary(): Promise<void> {
    const selected = frames.filter((frame) => frame.selected);
    const summary = selected.map((frame) => frame.clipName + ' · sequence ' + frame.sequenceTime.toFixed(2) + 's · source ' + frame.sourceTime.toFixed(2) + 's').join('\n');
    await navigator.clipboard.writeText('Locally sampled frames for review (image pixels remain on this device):\n' + summary);
    copied = true;
  }
</script>

<section class="visual-review">
  <header class="visual-head">
    <div><strong>Visual Intelligence</strong><small>Local frame sampler · no upload</small></div>
    <button class="close" onclick={onClose} aria-label="Close frame review"><Icon name="x" size={15} /></button>
  </header>
  <p class="privacy">Frames are decoded in your browser from the original media. Nothing is sent to RZ Agent, MIA, or another provider by this tool.</p>
  <div class="controls">
    <label>Sample interval
      <select bind:value={interval}><option value="1">Every 1 second</option><option value="2">Every 2 seconds</option><option value="3">Every 3 seconds</option><option value="5">Every 5 seconds</option><option value="10">Every 10 seconds</option></select>
    </label>
    <label>Maximum frames
      <select bind:value={maxFrames}><option value="6">6 frames</option><option value="12">12 frames</option><option value="20">20 frames</option><option value="30">30 frames</option></select>
    </label>
    <button class="sample" disabled={busy} onclick={sample}><Icon name="scan-search" size={14} />{busy ? 'Sampling…' : 'Sample timeline'}</button>
  </div>
  {#if progress}<p class="progress">{progress}</p>{/if}
  {#if error}<p class="error">{error}</p>{/if}
  {#if frames.length}
    <div class="selection-bar"><span>{frames.filter((frame) => frame.selected).length} of {frames.length} selected</span><button onclick={() => selectAll(true)}>Select all</button><button onclick={() => selectAll(false)}>Clear</button></div>
    <div class="frame-grid">
      {#each frames as frame (frame.key)}
        <button class:chosen={frame.selected} class="frame" onclick={() => toggleFrame(frame.key)} aria-pressed={frame.selected}>
          <img src={frame.dataUrl} alt={'Frame from ' + frame.clipName} />
          <span class="frame-check"><Icon name={frame.selected ? 'check-circle-2' : 'circle'} size={14} /></span>
          <span class="frame-meta">{frame.clipName}<small>Timeline {frame.sequenceTime.toFixed(2)}s · Source {frame.sourceTime.toFixed(2)}s</small></span>
        </button>
      {/each}
    </div>
    <div class="next-step">
      <strong>Ready for visual review</strong>
      <p>These frames are selected locally. A vision provider has not been connected, so there is no send action yet. Your approval will be required before any future provider receives image data.</p>
      <button disabled={!frames.some((frame) => frame.selected)} onclick={copyReviewSummary}><Icon name="copy" size={13} />{copied ? 'Summary copied' : 'Copy timestamp list'}</button>
    </div>
  {:else if !busy}
    <div class="empty"><Icon name="images" size={25} /><strong>No frames sampled yet</strong><span>Choose a sampling interval, then extract a contact sheet from the active sequence.</span></div>
  {/if}
</section>

<style>
  .visual-review{flex:1;min-height:0;overflow:auto;padding:12px;background:var(--bg-elevated);color:var(--text-primary)}
  .visual-head{display:flex;align-items:center;justify-content:space-between}.visual-head strong,.visual-head small{display:block}.visual-head strong{font-size:12px}.visual-head small{margin-top:2px;color:var(--text-muted);font-size:9px}.close{display:grid;place-items:center;width:27px;height:27px;border:1px solid var(--border);border-radius:5px}
  .privacy{padding:8px 9px;margin:10px 0;border:1px solid color-mix(in srgb,var(--success) 35%,var(--border));border-radius:5px;background:var(--bg-surface);color:var(--text-secondary);font-size:9px;line-height:1.5}
  .controls{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.controls label{display:flex;flex-direction:column;gap:4px;color:var(--text-muted);font-size:9px}.controls select{min-width:112px;padding:7px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface);color:var(--text-primary);font-size:10px}.sample,.next-step button{display:flex;align-items:center;gap:6px;padding:7px 9px;border-radius:4px;background:var(--accent);color:white;font-size:10px}.sample:disabled{opacity:.5}
  .progress,.error{font-size:9px;margin:8px 0;color:var(--text-secondary)}.error{color:var(--error)}
  .selection-bar{display:flex;align-items:center;gap:9px;margin:12px 0 7px;color:var(--text-muted);font-size:9px}.selection-bar span{margin-right:auto}.selection-bar button{padding:4px 6px;border:1px solid var(--border);border-radius:4px}
  .frame-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px}.frame{position:relative;overflow:hidden;text-align:left;border:1px solid var(--border);border-radius:5px;background:var(--bg-surface);opacity:.68}.frame.chosen{border-color:var(--accent);opacity:1}.frame img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#090b10}.frame-check{position:absolute;top:6px;right:6px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.7);color:white}.chosen .frame-check{color:#8ee6b2}.frame-meta{display:block;padding:6px;font-size:9px;color:var(--text-primary);overflow-wrap:anywhere}.frame-meta small{display:block;margin-top:3px;color:var(--text-muted);font-size:8px}
  .next-step{margin-top:12px;padding:10px;border:1px solid var(--border);border-radius:5px;background:var(--bg-surface)}.next-step strong{font-size:10px}.next-step p{margin:5px 0 8px;color:var(--text-secondary);font-size:9px;line-height:1.5}.next-step button:disabled{opacity:.4}
  .empty{min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-muted);text-align:center;font-size:9px}.empty strong{color:var(--text-primary);font-size:11px}.empty span{max-width:280px;line-height:1.5}
</style>
