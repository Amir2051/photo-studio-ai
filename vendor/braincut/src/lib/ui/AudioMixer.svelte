<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import MicrophoneRecorder from './MicrophoneRecorder.svelte';
  import LiveCameraCapture from './LiveCameraCapture.svelte';
  import MultiCameraStudio from './MultiCameraStudio.svelte';
  import { importFiles } from '$lib/media/import';
  import { createClipFromMedia } from '$lib/project/defaults';
  import { addTrack, canPlace, placeClips } from '$lib/project/ops';
  import { addToast } from '$lib/stores/app';
  import { program, type Session } from '$lib/engine/session';
  import type { Levels } from '$lib/engine/audio-engine';
  import { isAnimated, setKeyframe, valueAt } from '$lib/project/keyframes';
  import { fadeKeyframes } from '$lib/engine/effects/registry';
  import { findClipById } from '$lib/project/ops';
  import { activeSequence, commitPreview, editSequence, preview } from '$lib/project/store';
  import type { Project } from '$lib/project/types';
  import { playhead, selection } from '$lib/stores/app';
  import Fader from './Fader.svelte';
  import Meter from './Meter.svelte';
  import NumberField from './NumberField.svelte';

  let session = $state<Session | null>(null);
  let levels = $state<Levels>({});

  onMount(() => {
    const s = program();
    session = s;
    return s.audio.levels.subscribe((v) => (levels = v));
  });

  const SILENT: [number, number] = [-60, -60];
  const audioTracks = $derived($activeSequence?.tracks.filter((t) => t.kind === 'audio') ?? []);

  async function addRecording(file: File, requestedTrackId: string) {
    const imported = await importFiles([file]);
    const media = imported.find((item) => item.kind === 'audio' && item.status === 'ready');
    if (!media) throw new Error('The recording was captured, but the editor could not decode it as audio.');
    const seq = get(activeSequence);
    if (!seq) throw new Error('Open a sequence before recording audio.');
    const clip = createClipFromMedia(media, get(playhead), { kind: 'audio', fps: seq.fps }).audio;
    if (!clip) throw new Error('The captured file did not contain a usable audio stream.');
    let placedTrackId: string | null = null;
    editSequence('record microphone audio', (draftSeq) => {
      let target = draftSeq.tracks.find((track) => track.id === requestedTrackId && track.kind === 'audio' && !track.locked);
      if (!target || !canPlace(draftSeq, target.id, clip.start, clip.duration)) {
        target = draftSeq.tracks.find((track) => track.kind === 'audio' && !track.locked && canPlace(draftSeq, track.id, clip.start, clip.duration));
      }
      if (!target) {
        const newTrackId = addTrack(draftSeq, 'audio');
        target = draftSeq.tracks.find((track) => track.id === newTrackId);
      }
      if (!target) return;
      const placed = placeClips(draftSeq, [{ trackId: target.id, clip }], 'overwrite');
      if (placed.includes(clip.id)) placedTrackId = target.id;
    });
    if (!placedTrackId) throw new Error('No audio track was available for the new recording.');
    selection.set([clip.id]);
    addToast(`Recorded audio added to ${draftSeqTrackName(get(activeSequence), placedTrackId)}.`, 'success');
  }

  function draftSeqTrackName(seq: import('$lib/project/types').Sequence | null, id: string): string {
    return seq?.tracks.find((track) => track.id === id)?.name ?? 'the timeline';
  }

  function setTrack(trackId: string, patch: { volume?: number; muted?: boolean; solo?: boolean }, live: boolean) {
    const recipe = (draft: Project) => {
      const seq = draft.sequences.find((s) => s.id === draft.activeSequenceId) ?? draft.sequences[0];
      const track = seq?.tracks.find((t) => t.id === trackId);
      if (track) Object.assign(track, patch);
    };
    if (live) preview(recipe);
    else {
      preview(recipe);
      commitPreview(patch.volume !== undefined ? 'track volume' : patch.muted !== undefined ? 'mute track' : 'solo track');
    }
  }

  // the clip strip: one selected audio clip, its fixed volume and pan
  const clip = $derived.by(() => {
    const seq = $activeSequence;
    if (!seq) return null;
    const audio = $selection.map((id) => findClipById(seq, id)).filter((f) => f && f.clip.kind === 'audio');
    if (audio.length !== 1 || !audio[0]) return null;
    const c = audio[0].clip;
    const volume = c.effects.find((e) => e.type === 'volume');
    const pan = c.effects.find((e) => e.type === 'pan');
    if (!volume || !pan) return null;
    const clipTime = Math.min(c.duration, Math.max(0, $playhead - c.start));
    return {
      id: c.id,
      name: c.name,
      duration: c.duration,
      clipTime,
      level: Number(valueAt(volume, 'level', clipTime, 0)),
      pan: Number(valueAt(pan, 'pan', clipTime, 0)),
      levelAnimated: isAnimated(volume, 'level'),
      panAnimated: isAnimated(pan, 'pan')
    };
  });

  function setClipFade(direction: 'in' | 'out') {
    const selectedClip = clip;
    if (!selectedClip) return;
    editSequence(direction === 'in' ? 'fade in audio clip' : 'fade out audio clip', (seq) => {
      const target = findClipById(seq, selectedClip.id)?.clip;
      const volume = target?.effects.find((effect) => effect.type === 'volume');
      if (!target || !volume) return;
      const added = fadeKeyframes(direction, target.duration);
      const from = added[0].time;
      const to = added[added.length - 1].time;
      const kept = (volume.keyframes.level ?? []).filter((keyframe) => keyframe.time < from - 1e-6 || keyframe.time > to + 1e-6);
      volume.keyframes.level = [...kept, ...added].sort((a, b) => a.time - b.time);
    });
  }

  function setClipParam(type: 'volume' | 'pan', key: string, value: number, live: boolean) {
    const c = clip;
    if (!c) return;
    const recipe = (draft: Project) => {
      const seq = draft.sequences.find((s) => s.id === draft.activeSequenceId) ?? draft.sequences[0];
      const effect = seq && findClipById(seq, c.id)?.clip.effects.find((e) => e.type === type);
      if (!effect) return;
      // an animated param gets a keyframe where the playhead is, never a
      // static value that the curve would hide anyway
      if (isAnimated(effect, key)) setKeyframe(effect, key, c.clipTime, value);
      else effect.params[key] = value;
    };
    preview(recipe);
    if (!live) commitPreview(type === 'volume' ? 'clip volume' : 'clip pan');
  }
</script>

<div class="mixer">
  <MultiCameraStudio />
  <LiveCameraCapture />
  <MicrophoneRecorder tracks={audioTracks} onrecord={addRecording} />
  {#if !$activeSequence}
    <div class="empty">No sequence open</div>
  {:else}
    <div class="strips">
      {#each audioTracks as track (track.id)}
        <div class="strip" class:muted={track.muted}>
          <div class="name" title={track.name}>{track.name}</div>
          <div class="body">
            <Fader
              value={track.volume}
              label="{track.name} level"
              oninput={(db) => setTrack(track.id, { volume: db }, true)}
              onchange={(db) => setTrack(track.id, { volume: db }, false)} />
            <Meter levels={levels[track.id] ?? SILENT} />
          </div>
          <div class="toggles">
            <button class="toggle m" class:on={track.muted} title="Mute" aria-pressed={track.muted} onclick={() => setTrack(track.id, { muted: !track.muted }, false)}>M</button>
            <button class="toggle s" class:on={track.solo} title="Solo" aria-pressed={track.solo} onclick={() => setTrack(track.id, { solo: !track.solo }, false)}>S</button>
          </div>
        </div>
      {/each}

      <div class="strip master">
        <div class="name">Master</div>
        <div class="body">
          <Meter levels={levels.master ?? SILENT} />
        </div>
        <div class="toggles"></div>
      </div>

      <div class="strip clip">
        <div class="name" title={clip?.name}>{clip ? clip.name : 'Clip'}</div>
        {#if clip}
          <div class="body">
            <Fader
              value={clip.level}
              label="Clip level"
              oninput={(db) => setClipParam('volume', 'level', db, true)}
              onchange={(db) => setClipParam('volume', 'level', db, false)} />
          </div>
          <div class="fade-actions" aria-label="Audio fade controls">
            <button type="button" onclick={() => setClipFade('in')} title="Fade in over 1 second">Fade in</button>
            <button type="button" onclick={() => setClipFade('out')} title="Fade out over 1 second">Fade out</button>
          </div>
          <div class="pan">
            <span class="pan-label">Pan</span>
            <NumberField
              value={clip.pan}
              min={-100}
              max={100}
              step={1}
              precision={0}
              label="Clip pan"
              oninput={(v) => setClipParam('pan', 'pan', v, true)}
              onchange={(v) => setClipParam('pan', 'pan', v, false)} />
          </div>
          {#if clip.levelAnimated || clip.panAnimated}
            <div class="animated" title="Edits write a keyframe at the playhead">
              animated
            </div>
          {/if}
        {:else}
          <div class="clip-empty">Select an audio clip</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .mixer {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--bg-surface);
  }

  .strips {
    flex: 1;
    display: flex;
    gap: 1px;
    padding: 6px 4px;
    overflow-x: auto;
    overflow-y: hidden;
    background: var(--border);
    min-height: 0;
  }

  .strip {
    display: flex;
    flex-direction: column;
    width: 92px;
    flex-shrink: 0;
    background: var(--bg-surface);
    padding: 4px 6px;
    gap: 6px;
    min-height: 0;
  }

  .strip.master {
    width: 64px;
    margin-left: 4px;
  }

  .strip.clip {
    margin-left: auto;
    width: 132px;
    border-left: 1px solid var(--border);
    padding-left: 10px;
  }

  .strip.muted .body {
    opacity: 0.5;
  }

  .name {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }

  .body {
    flex: 1;
    display: flex;
    gap: 6px;
    min-height: 100px;
  }

  .toggles {
    display: flex;
    gap: 2px;
    justify-content: center;
    height: 20px;
    flex-shrink: 0;
  }

  .toggle {
    width: 22px;
    height: 20px;
    font-family: var(--font-editor);
    font-size: 10px;
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .toggle:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .toggle.m.on {
    color: #111;
    background: var(--error);
    border-color: var(--error);
  }

  .toggle.s.on {
    color: #111;
    background: var(--warning);
    border-color: var(--warning);
  }

  .fade-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .fade-actions button {
    flex: 1;
    min-width: 0;
    padding: 5px 4px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-size: 10px;
  }

  .fade-actions button:hover {
    border-color: var(--accent);
    color: var(--text-primary);
    background: var(--accent-dim);
  }

  .pan {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .pan-label {
    font-size: 11px;
    color: var(--text-muted);
  }

  .animated {
    font-size: 10px;
    color: var(--accent);
    text-align: center;
    flex-shrink: 0;
  }

  .clip-empty {
    flex: 1;
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    padding-top: 12px;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    color: var(--text-muted);
  }
</style>
