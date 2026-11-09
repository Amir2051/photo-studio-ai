<script lang="ts">
  import Icon from './Icon.svelte';
  import { createTitleClip } from '$lib/project/defaults';
  import { editSequence, activeSequence } from '$lib/project/store';
  import { overwriteClip } from '$lib/project/ops';
  import { preferences } from '$lib/stores/preferences';
  import { addToast, dialog, selection, playhead } from '$lib/stores/app';

  const selectedTitle = $derived.by(() => {
    const seq = $activeSequence;
    if (!seq) return null;
    return seq.tracks.flatMap((track) => track.clips).find((clip) => $selection.includes(clip.id) && clip.kind === 'title') ?? null;
  });
  const titleCount = $derived($activeSequence?.tracks.reduce((n, track) => n + track.clips.filter((clip) => clip.kind === 'title').length, 0) ?? 0);

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
    <kbd>＋</kbd>
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
  <p class="hint">Tip: select a title clip and choose <b>Edit style</b> to change its font, size, alignment, stroke and shadow.</p>
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
</style>
