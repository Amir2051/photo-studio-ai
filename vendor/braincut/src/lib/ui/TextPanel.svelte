<script lang="ts">
  import Icon from './Icon.svelte';
  import { createTitleClip } from '#lib/project/defaults.ts';
  import { editSequence, activeSequence } from '#lib/project/store.ts';
  import { overwriteClip } from '#lib/project/ops.ts';
  import {
    insertCaptionCues,
  } from '#lib/captions/import-captions.ts';
  import {
    captionPositionBox,
    isCaptionTrack,
    type CaptionPosition,
  } from '#lib/captions/defaults.ts';
  import { parseCaptions } from '#lib/captions/parse.ts';
  import { preferences } from '#lib/stores/preferences.ts';
  import { addToast, dialog, selection, playhead } from '#lib/stores/app.ts';
  import type { Sequence, TitleData } from '#lib/project/types.ts';

  const selectedTitle = $derived.by(() => {
    const seq = $activeSequence;
    if (!seq) return null;
    return seq.tracks.flatMap((track) => track.clips).find((clip) => $selection.includes(clip.id) && clip.kind === 'title') ?? null;
  });
  const titleCount = $derived($activeSequence?.tracks.reduce((n, track) => n + track.clips.filter((clip) => clip.kind === 'title').length, 0) ?? 0);

  // captions are the title clips sitting on the dedicated lane
  const captionLane = $derived(($activeSequence?.tracks ?? []).find((track) => isCaptionTrack(track)) ?? null);
  const captionCount = $derived(captionLane?.clips.length ?? 0);

  function editSelected() {
    if (selectedTitle) dialog.set({ kind: 'title', clipId: selectedTitle.id });
  }

  function addTitle(text: string) {
    const seq = $activeSequence;
    if (!seq) return;
    const track = [...seq.tracks].reverse().find((item) => item.kind === 'video' && !item.locked);
    if (!track) { addToast('Unlock a video track to add a title', 'warning'); return; }
    const clip = createTitleClip($playhead, $preferences.stillImageDuration, text);
    editSequence('add title', (draft) => overwriteClip(draft, track.id, clip, $playhead));
    selection.set([clip.id]);
    dialog.set({ kind: 'title', clipId: clip.id });
  }

  let importing = $state(false);
  let captionFileInput: HTMLInputElement | null = $state(null);

  async function importCaptions(file: File) {
    importing = true;
    try {
      const text = await file.text();
      const { cues, format, dropped } = parseCaptions(text);
      if (cues.length === 0) {
        addToast(dropped > 0 ? `No usable cues found (${dropped} skipped)` : 'No cues found in that file', 'warning');
        return;
      }
      editSequence('import captions', (draft) => {
        insertCaptionCues(draft, cues);
      });
      addToast(
        `${cues.length} caption${cues.length === 1 ? '' : 's'} imported${dropped > 0 ? ` (${dropped} skipped)` : ''} from ${format.toUpperCase()}`,
        'success',
      );
      // the cues live on the lane, so scroll focus there if the UI supports it
      if (captionLane) selection.set([]);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not read that caption file', 'warning');
    } finally {
      importing = false;
      if (captionFileInput) captionFileInput.value = '';
    }
  }

  function onCaptionFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void importCaptions(file);
  }

  function positionCaptions(position: CaptionPosition) {
    const box = captionPositionBox(position);
    let positioned = 0;
    editSequence(`place captions ${position}`, (draft) => {
      for (const track of draft.tracks) {
        if (!isCaptionTrack(track)) continue;
        for (const clip of track.clips) {
          if (clip.title) {
            clip.title.box = { ...box };
            positioned += 1;
          }
        }
      }
    });
    addToast(`${positioned} caption${positioned === 1 ? '' : 's'} repositioned`, 'success');
  }

  function clearCaptions() {
    let removed = 0;
    editSequence('clear captions', (draft) => {
      const lane = draft.tracks.find((track) => isCaptionTrack(track));
      if (!lane) return;
      removed = lane.clips.length;
      lane.clips = [];
    });
    addToast(removed > 0 ? `${removed} caption${removed === 1 ? '' : 's'} removed` : 'No captions to clear', 'info');
  }
</script>

<div class="text-panel">
  <div class="intro">
    <span class="eyebrow">TEXT & TITLES</span>
    <h3>Make your video say something.</h3>
    <p>Add a title at the playhead, then customize its typography, color, outline, shadow and placement.</p>
  </div>
  <button class="primary" onclick={() => addTitle('Your story starts here')}>
    <Icon name="type" size={16} />
    <span><strong>Add a title</strong><small>Creates an editable title clip at the playhead</small></span>
    <kbd>T</kbd>
  </button>
  <div class="section-head"><span>QUICK START</span><span>{titleCount} title{titleCount === 1 ? '' : 's'} in project</span></div>
  <div class="templates">
    <button class="template" onclick={() => addTitle('Your story starts here')}><span class="sample lower">Your story starts here</span><span>Lower third</span></button>
    <button class="template" onclick={() => addTitle('BIG TITLE')}><span class="sample bold">BIG TITLE</span><span>Headline</span></button>
    <button class="template" onclick={() => addTitle('A little more context')}><span class="sample subtitle">A little more context</span><span>Subtitle</span></button>
  </div>
  <div class="edit-row">
    <div><strong>Selected title</strong><small>{selectedTitle?.name ?? 'Select a title clip on the timeline'}</small></div>
    <button class="secondary" disabled={!selectedTitle} onclick={editSelected}><Icon name="sliders" size={13}/> Edit style</button>
  </div>

  <div class="section-head captions-head"><span>CAPTIONS</span><span>{captionCount} cue{captionCount === 1 ? '' : 's'} in lane</span></div>
  <div class="caption-intro">
    <p>Import an <code>.srt</code> or <code>.vtt</code> file. One cue becomes one clip on the caption lane; timing, stroke and background carry through to preview and export.</p>
  </div>
  <div class="caption-actions">
    <button class="primary caption-button" type="button" onclick={() => captionFileInput?.click()} disabled={importing}>
      <Icon name="captions" size={16} />
      <span><strong>{importing ? 'Importing…' : 'Import captions'}</strong><small>.srt or .vtt, replaces existing cues on the lane</small></span>
    </button>
    <input
      bind:this={captionFileInput}
      class="visually-hidden"
      type="file"
      accept=".srt,.vtt,.txt"
      aria-label="Import SRT or WebVTT captions"
      onchange={onCaptionFileChange}
    />
  </div>
  <div class="caption-positions" aria-label="Caption position">
    <button type="button" class="secondary" onclick={() => positionCaptions('lower-third')}>Lower third</button>
    <button type="button" class="secondary" onclick={() => positionCaptions('upper-third')}>Upper third</button>
    <button type="button" class="secondary" onclick={() => positionCaptions('center')}>Center</button>
  </div>
  <div class="caption-danger-row">
    <button type="button" class="text-button danger" onclick={clearCaptions} disabled={captionCount === 0}>Clear captions</button>
  </div>
  <p class="hint">Tip: captions are title clips on the caption lane — drag, trim, split and edit them with the normal text tools. Choose <b>Edit style</b> for stroke, weight and placement.</p>
</div>

<style>
  .text-panel{padding:16px;display:flex;flex-direction:column;gap:16px;overflow:auto;color:var(--text-primary)}
  .intro .eyebrow,.section-head{font-size:9px;letter-spacing:.12em;font-weight:700;color:var(--text-muted)}
  h3{font-size:16px;margin:7px 0 5px;font-weight:650}.intro p,.hint{font-size:11px;line-height:1.55;color:var(--text-secondary);margin:0}
  .primary{display:flex;align-items:center;gap:11px;text-align:left;padding:12px;border:1px solid rgba(141,165,255,.38);border-radius:9px;background:linear-gradient(110deg,rgba(91,111,210,.22),rgba(75,54,130,.18));color:var(--text-primary)}
  .primary>span{display:flex;flex:1;flex-direction:column;gap:3px}.primary small,.edit-row small{font-size:10px;color:var(--text-muted)}kbd{border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--text-muted)}
  .section-head{display:flex;justify-content:space-between}.templates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.template{min-width:0;display:flex;flex-direction:column;gap:7px;text-align:left;font-size:10px;color:var(--text-secondary)}
  .sample{height:62px;border:1px solid var(--border);border-radius:6px;background:linear-gradient(135deg,#111b32,#25203f);display:flex;align-items:center;justify-content:center;color:white;text-align:center;padding:5px;overflow:hidden}.lower{font-size:9px;align-items:end;padding-bottom:10px}.bold{font-size:14px;font-weight:800;letter-spacing:.05em}.subtitle{font-size:9px;font-style:italic}
  .edit-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;border-top:1px solid var(--border)}.edit-row>div{display:flex;flex-direction:column;gap:4px;min-width:0}.edit-row strong{font-size:11px}.secondary{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;font-size:10px;white-space:nowrap}.secondary:disabled{opacity:.35;cursor:not-allowed}.hint{font-size:10px}

  .captions-head{border-top:1px solid var(--border);padding-top:14px}
  .caption-intro p{font-size:11px;line-height:1.55;color:var(--text-secondary);margin:0}
  .caption-intro code{background:rgba(255,255,255,.06);border-radius:3px;padding:0 3px;font-size:10px}
  .caption-actions{display:flex;gap:8px}
  .caption-button{flex:1;min-width:0}
  .caption-positions{display:flex;gap:6px}
  .caption-positions .secondary{flex:1;justify-content:center}
  .caption-danger-row{display:flex;justify-content:flex-end}
  .danger{color:#e07a6a}.danger:hover{color:#ff9c8a}
  .visually-hidden{position:absolute;width:1px;height:1px;clip:rect(0 0 0 0);overflow:hidden}
  .text-button{background:transparent;border:none;color:var(--text-secondary);font-size:10px;cursor:pointer;padding:4px 6px}
  .text-button:hover{color:var(--text-primary)}
  .text-button:disabled{opacity:.35;cursor:not-allowed}
</style>
