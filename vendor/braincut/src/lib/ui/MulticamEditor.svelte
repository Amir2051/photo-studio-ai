<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { importFiles } from '$lib/media/import';
  import { getBlobForMedia } from '$lib/media/sources';
  import { createClipFromMedia } from '$lib/project/defaults';
  import { addTrack, placeClips } from '$lib/project/ops';
  import { activeSequence, editSequence, mediaById, project } from '$lib/project/store';
  import { addToast, playhead, playing, selection } from '$lib/stores/app';
  import type { Clip, MediaItem, Sequence, Track } from '$lib/project/types';

  type Angle = {
    index: number;
    label: string;
    track: Track | undefined;
    audioTrack: Track | undefined;
    clip: Clip | undefined;
    media: MediaItem | undefined;
    offset: number;
  };

  let activeAngle = $state(0);
  let videoEls: Array<HTMLVideoElement | undefined> = [];
  let previewUrls = $state<Record<string, string>>({});
  let loading = $state(false);
  let status = $state('Import four camera recordings to start a synchronized multicam edit.');
  let disposed = false;
  let syncTimer: ReturnType<typeof setInterval> | null = null;

  const angleSlots = $derived.by(() => {
    const seq = $activeSequence;
    return Array.from({ length: 4 }, (_, index): Angle => {
      const prefix = `MCAM ${index + 1} · `;
      const track = seq?.tracks.find((item) => item.name.startsWith(prefix));
      const audioPrefix = `MCAM AUDIO ${index + 1} · `;
      const audioTrack = seq?.tracks.find((item) => item.name.startsWith(audioPrefix));
      const clip = track?.clips[0];
      const media = clip?.mediaId ? $mediaById.get(clip.mediaId) : undefined;
      return {
        index,
        label: track ? track.name.slice(prefix.length) : `Host ${index + 1}`,
        track,
        audioTrack,
        clip,
        media,
        offset: (clip?.start ?? 0) - (clip?.in ?? 0)
      };
    });
  });

  $effect(() => {
    const ids = angleSlots.map((angle) => angle.media?.id ?? '').filter(Boolean);
    void loadPreviews(ids);
  });

  $effect(() => {
    const slots = angleSlots;
    const urls = previewUrls;
    for (const angle of slots) {
      const video = videoEls[angle.index];
      const url = angle.media ? urls[angle.media.id] : undefined;
      if (video && url && video.dataset.mediaId !== angle.media?.id) {
        video.dataset.mediaId = angle.media!.id;
        video.src = url;
        video.load();
      }
      if (video && !angle.media && video.src) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        delete video.dataset.mediaId;
      }
    }
  });

  async function loadPreviews(ids: string[]) {
    for (const mediaId of ids) {
      if (previewUrls[mediaId]) continue;
      const media = get(mediaById).get(mediaId);
      if (!media) continue;
      const blob = await getBlobForMedia(media);
      if (!blob || disposed) continue;
      const url = URL.createObjectURL(blob);
      previewUrls = { ...previewUrls, [mediaId]: url };
    }
  }

  function syncPreviewPlayback() {
    const seq = get(activeSequence);
    const time = get(playhead);
    const isPlaying = get(playing);
    if (!seq) return;
    for (const angle of angleSlots) {
      const video = videoEls[angle.index];
      const clip = angle.clip;
      if (!video || !clip || !angle.media) continue;
      const clipTime = time - clip.start;
      if (clipTime < 0 || clipTime >= clip.duration) {
        if (!video.paused) video.pause();
        continue;
      }
      const sourceTime = clip.in + clipTime * clip.speed;
      if (Number.isFinite(sourceTime) && Math.abs(video.currentTime - sourceTime) > (isPlaying ? 0.35 : 0.04)) {
        try { video.currentTime = Math.max(0, Math.min(sourceTime, angle.media.duration)); } catch {}
      }
      if (isPlaying && video.paused) void video.play().catch(() => {});
      if (!isPlaying && !video.paused) video.pause();
    }
  }

  onMount(() => {
    syncTimer = setInterval(syncPreviewPlayback, 90);
  });

  onDestroy(() => {
    disposed = true;
    if (syncTimer) clearInterval(syncTimer);
    for (const url of Object.values(previewUrls)) URL.revokeObjectURL(url);
    for (const video of videoEls) video?.pause();
  });

  function findAngleTrack(seq: Sequence, index: number): Track | undefined {
    return seq.tracks.find((track) => track.name.startsWith(`MCAM ${index + 1} · `));
  }

  function findAngleAudioTrack(seq: Sequence, index: number): Track | undefined {
    return seq.tracks.find((track) => track.name.startsWith(`MCAM AUDIO ${index + 1} · `));
  }

  function ensureAngleTracks(seq: Sequence, index: number, label: string) {
    let videoTrack = findAngleTrack(seq, index);
    if (!videoTrack) {
      const id = addTrack(seq, 'video');
      videoTrack = seq.tracks.find((track) => track.id === id);
    }
    let audioTrack = findAngleAudioTrack(seq, index);
    if (!audioTrack) {
      const id = addTrack(seq, 'audio');
      audioTrack = seq.tracks.find((track) => track.id === id);
    }
    if (videoTrack) {
      videoTrack.name = `MCAM ${index + 1} · ${label}`;
      videoTrack.hidden = true;
      videoTrack.clips = [];
      videoTrack.transitions = [];
    }
    if (audioTrack) {
      audioTrack.name = `MCAM AUDIO ${index + 1} · ${label}`;
      audioTrack.muted = true;
      audioTrack.clips = [];
      audioTrack.transitions = [];
    }
    return { videoTrack, audioTrack };
  }

  async function assignAngle(index: number, file: File | null) {
    if (!file) return;
    if (!get(project) || !get(activeSequence)) {
      addToast('Open a project and sequence before adding camera angles.', 'warning');
      return;
    }
    loading = true;
    status = `Importing ${file.name}…`;
    try {
      const imported = await importFiles([file]);
      const media = imported.find((item) => item.status === 'ready' && item.hasVideo);
      if (!media) throw new Error('Choose a video recording with a readable picture.');
      const currentLabel = angleSlots[index].label || `Host ${index + 1}`;
      let placed = false;
      editSequence(`assign multicam angle ${index + 1}`, (seq) => {
        const { videoTrack, audioTrack } = ensureAngleTracks(seq, index, currentLabel);
        if (!videoTrack) return;
        const pair = createClipFromMedia(media, 0, { kind: 'video', fps: seq.fps });
        const placements = pair.video ? [{ trackId: videoTrack.id, clip: pair.video }] : [];
        if (audioTrack) {
          const audio = createClipFromMedia(media, 0, { kind: 'audio', fps: seq.fps }).audio;
          if (audio) placements.push({ trackId: audioTrack.id, clip: audio });
        }
        placed = placeClips(seq, placements, 'overwrite').length > 0;
      });
      if (!placed) throw new Error('Could not place this recording in the selected angle.');
      activeAngle = index;
      status = `${currentLabel} is ready · all angles share the sequence clock.`;
    } catch (error) {
      status = error instanceof Error ? error.message : 'Could not import this camera angle.';
    } finally {
      loading = false;
    }
  }

  async function importFour(files: FileList | null) {
    if (!files?.length) return;
    const pending = Array.from(files).slice(0, 4);
    const empty = angleSlots.filter((angle) => !angle.media).map((angle) => angle.index);
    const targets = [...empty, ...angleSlots.filter((angle) => angle.media).map((angle) => angle.index)];
    for (let i = 0; i < pending.length; i++) await assignAngle(targets[i], pending[i]);
    activeAngle = targets[0] ?? 0;
    if (files.length > 4) addToast('The first four recordings were assigned. Add more angles individually if needed.', 'info');
  }

  function renameAngle(index: number, label: string) {
    const clean = label.trim().slice(0, 32) || `Host ${index + 1}`;
    editSequence('rename multicam angle', (seq) => {
      let track = findAngleTrack(seq, index);
      let audioTrack = findAngleAudioTrack(seq, index);
      if (!track) {
        const id = addTrack(seq, 'video');
        track = seq.tracks.find((item) => item.id === id);
        if (track) track.hidden = true;
      }
      if (!audioTrack) {
        const id = addTrack(seq, 'audio');
        audioTrack = seq.tracks.find((item) => item.id === id);
        if (audioTrack) audioTrack.muted = true;
      }
      if (track) track.name = `MCAM ${index + 1} · ${clean}`;
      if (audioTrack) audioTrack.name = `MCAM AUDIO ${index + 1} · ${clean}`;
    });
  }

  function moveAngle(from: number, to: number) {
    if (to < 0 || to > 3 || from === to) return;
    editSequence('reorder multicam angles', (seq) => {
      const a = findAngleTrack(seq, from);
      const b = findAngleTrack(seq, to);
      const aa = findAngleAudioTrack(seq, from);
      const ba = findAngleAudioTrack(seq, to);
      if (!a) return;
      let target = b;
      if (!target) {
        const id = addTrack(seq, 'video');
        target = seq.tracks.find((item) => item.id === id);
        if (target) target.hidden = true;
      }
      let targetAudio = ba;
      if (!targetAudio) {
        const id = addTrack(seq, 'audio');
        targetAudio = seq.tracks.find((item) => item.id === id);
        if (targetAudio) targetAudio.muted = true;
      }
      if (!target) return;
      const aLabel = a.name.split(' · ').slice(1).join(' · ');
      const bLabel = b ? b.name.split(' · ').slice(1).join(' · ') : `Host ${to + 1}`;
      a.name = `MCAM ${to + 1} · ${aLabel}`;
      target.name = `MCAM ${from + 1} · ${bLabel}`;
      if (aa && targetAudio) {
        const aaLabel = aa.name.split(' · ').slice(1).join(' · ');
        const baLabel = ba ? ba.name.split(' · ').slice(1).join(' · ') : `Host ${to + 1}`;
        aa.name = `MCAM AUDIO ${to + 1} · ${aaLabel}`;
        targetAudio.name = `MCAM AUDIO ${from + 1} · ${baLabel}`;
      }
    });
    if (activeAngle === from) activeAngle = to;
    else if (activeAngle === to) activeAngle = from;
  }

  function setOffset(index: number, raw: string) {
    const offset = Number.isFinite(Number(raw)) ? Number(raw) : 0;
    const angle = angleSlots[index];
    if (!angle.media || !angle.track) return;
    const sequenceStart = Math.max(0, offset);
    const sourceIn = Math.max(0, -offset);
    if (sourceIn >= angle.media.duration) {
      addToast('That sync offset is beyond the end of this recording.', 'warning');
      return;
    }
    editSequence('sync multicam angle', (seq) => {
      const videoTrack = findAngleTrack(seq, index);
      const audioTrack = findAngleAudioTrack(seq, index);
      if (!videoTrack) return;
      const video = createClipFromMedia(angle.media!, sequenceStart, { in: sourceIn, kind: 'video', fps: seq.fps }).video;
      if (video) videoTrack.clips = [video];
      if (audioTrack) {
        const audio = createClipFromMedia(angle.media!, sequenceStart, { in: sourceIn, kind: 'audio', fps: seq.fps }).audio;
        audioTrack.clips = audio ? [audio] : [];
      }
    });
  }

  function useMic(index: number) {
    const angle = angleSlots[index];
    if (!angle.media?.hasAudio) {
      addToast(`${angle.label} has no audio track. Choose another camera microphone.`, 'warning');
      return;
    }
    editSequence('choose multicam audio source', (seq) => {
      for (let i = 0; i < 4; i++) {
        const track = findAngleAudioTrack(seq, i);
        if (track) track.muted = i !== index;
      }
    });
    status = `Using ${angle.label} as the active microphone. Other camera audio tracks are muted.`;
  }

  function cutToAngle(index: number) {
    const angle = angleSlots[index];
    const seq = get(activeSequence);
    const time = get(playhead);
    if (!seq || !angle.media || !angle.clip) return;
    if (time < angle.clip.start) {
      addToast(`${angle.label} is not synchronized at the current playhead.`, 'warning');
      return;
    }
    const sourceIn = angle.clip.in + (time - angle.clip.start) * angle.clip.speed;
    if (sourceIn >= angle.media.duration) {
      addToast('This camera angle has reached the end of its recording.', 'warning');
      return;
    }
    let cutId = '';
    editSequence(`cut to ${angle.label}`, (draft) => {
      let programTrack = draft.tracks.find((track) => track.name === 'PROGRAM · Multicam');
      if (!programTrack) {
        const id = addTrack(draft, 'video');
        programTrack = draft.tracks.find((track) => track.id === id);
        if (programTrack) programTrack.name = 'PROGRAM · Multicam';
      }
      if (!programTrack) return;
      const clip = createClipFromMedia(angle.media!, time, {
        in: sourceIn,
        kind: 'video',
        fps: draft.fps
      }).video;
      if (!clip) return;
      clip.name = `${angle.label} · ${angle.media!.name}`;
      cutId = clip.id;
      placeClips(draft, [{ trackId: programTrack.id, clip }], 'overwrite');
    });
    if (cutId) {
      selection.set([cutId]);
      status = `Program cut added · ${angle.label} at ${time.toFixed(2)}s.`;
    }
  }

  function chooseAngle(index: number) {
    activeAngle = index;
    status = `Previewing ${angleSlots[index].label}. Use “Cut to program” to switch the finished edit at the playhead.`;
  }
</script>

<section class="multicam" aria-label="Synchronized multicamera editor">
  <header class="heading">
    <div><strong>Multicam editor</strong><small>4 synchronized angles · independent camera recordings</small></div>
    <span class="sync-indicator">● SHARED TIMELINE CLOCK</span>
  </header>

  <div class="toolbar">
    <label class="import-all">＋ Import up to 4 recordings
      <input type="file" accept="video/*" multiple onchange={(event) => void importFour(event.currentTarget.files)} />
    </label>
    <button type="button" class="mic-button" onclick={() => useMic(activeAngle)} disabled={!angleSlots[activeAngle].media?.hasAudio}>Use {angleSlots[activeAngle].label} audio</button>
  </div>

  <div class="angle-grid">
    {#each angleSlots as angle, i (i)}
      <article class:active={activeAngle === i} class="angle-card" draggable={!!angle.media} ondragstart={(event) => event.dataTransfer?.setData('text/plain', String(i))} ondragover={(event) => event.preventDefault()} ondrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer?.getData('text/plain')); if (Number.isInteger(from)) moveAngle(from, i); }}>
        <div class="angle-video">
          {#if angle.media}
            <video bind:this={videoEls[i]} muted playsinline preload="metadata"></video>
          {:else}
            <div class="empty-angle"><span>＋</span><small>Camera angle {i + 1}</small></div>
          {/if}
          <span class="angle-number">ANGLE {i + 1}</span>
          {#if angle.media}<button type="button" class="choose" onclick={() => chooseAngle(i)}>{activeAngle === i ? 'SELECTED' : 'PREVIEW'}</button>{/if}
        </div>
        <div class="angle-details">
          <input aria-label={`Angle ${i + 1} name`} value={angle.label} maxlength="32" onchange={(event) => renameAngle(i, event.currentTarget.value)} />
          <small>{angle.media ? angle.media.name : 'No recording assigned'}</small>
          <div class="angle-actions">
            <label class="add-angle">{angle.media ? 'Replace' : 'Add video'}
              <input type="file" accept="video/*" onchange={(event) => { void assignAngle(i, event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ''; }} />
            </label>
            <button type="button" aria-label={`Move angle ${i + 1} left`} onclick={() => moveAngle(i, i - 1)} disabled={i === 0 || !angle.media}>←</button>
            <button type="button" aria-label={`Move angle ${i + 1} right`} onclick={() => moveAngle(i, i + 1)} disabled={i === 3 || !angle.media}>→</button>
            {#if angle.media}<button type="button" class="cut" onclick={() => cutToAngle(i)}>Cut to program</button>{/if}
          </div>
          {#if angle.media}
            <label class="offset">Sync offset (seconds)
              <input type="number" min={-angle.media.duration} max={angle.media.duration} step="0.01" value={angle.offset} onchange={(event) => setOffset(i, event.currentTarget.value)} />
            </label>
            <small>{!angle.media.hasAudio ? 'No audio in this recording' : angle.audioTrack?.muted === false ? '● Active microphone' : 'Audio muted'}</small>
          {/if}
        </div>
      </article>
    {/each}
  </div>

  <div class="multicam-help">
    <strong>How to edit</strong>
    <ol>
      <li>Import the four recordings or add each angle separately.</li>
      <li>Rename each window and adjust sync offsets if cameras started at different times.</li>
      <li>Play the timeline. All four previews follow the same timecode.</li>
      <li>Select an angle and press <b>Cut to program</b> whenever you want to switch cameras.</li>
    </ol>
    <small>Camera originals stay in Media. Angle tracks are preserved and hidden from the final picture; the PROGRAM track contains your editable camera switches.</small>
  </div>
  <footer aria-live="polite">{#if loading}<span class="spinner"></span>{/if}{status}</footer>
</section>

<style>
  .multicam{height:100%;min-height:0;min-width:0;overflow:auto;padding:14px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;background:var(--bg-surface);color:var(--text-primary);font-family:var(--font-editor)}
  .heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
  .heading strong{display:block;font-size:15px}.heading small{display:block;margin-top:3px;color:var(--text-muted);font-size:10px}
  .sync-indicator{white-space:nowrap;color:#34d399;font-size:8px;font-weight:700;letter-spacing:.04em}
  .toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .import-all,.mic-button,.add-angle,.angle-actions button{border:1px solid var(--border);border-radius:4px;background:var(--bg-elevated);color:var(--text-primary);padding:7px 8px;font-size:9px;cursor:pointer}
  .import-all{background:var(--accent);color:white;border-color:var(--accent);font-weight:700}
  .import-all input,.add-angle input{display:none}
  .mic-button:disabled{opacity:.4}
  .angle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;flex:1;align-content:start}
  .angle-card{min-width:0;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--bg-elevated)}
  .angle-card.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .angle-video{position:relative;aspect-ratio:16/9;min-height:105px;background:#070b13;overflow:hidden}
  .angle-video video{width:100%;height:100%;object-fit:cover;display:block}
  .empty-angle{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--text-muted);gap:3px}
  .empty-angle span{font-size:24px;color:var(--accent)}.empty-angle small{font-size:8px}
  .angle-number{position:absolute;left:5px;top:5px;background:#070b13dd;color:white;padding:3px 5px;border-radius:3px;font-size:8px;font-weight:700}
  .choose{position:absolute;right:5px;bottom:5px;border:0;border-radius:3px;padding:4px 6px;background:#0c1728dd;color:white;font-size:8px}
  .angle-details{padding:7px;display:grid;gap:5px}
  .angle-details>input{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface);color:var(--text-primary);padding:6px;font-size:10px;font-weight:700}
  .angle-details>small{font-size:8px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .angle-actions{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
  .angle-actions button{padding:5px 7px}.angle-actions button:disabled{opacity:.3}
  .add-angle{padding:5px 7px}
  .angle-actions .cut{margin-left:auto;background:var(--accent);border-color:var(--accent);color:white;font-weight:700}
  .offset{display:flex;align-items:center;justify-content:space-between;gap:5px;color:var(--text-muted);font-size:8px}
  .offset input{width:64px;background:var(--bg-surface);border:1px solid var(--border);border-radius:3px;color:var(--text-primary);padding:4px;font-size:9px}
  .multicam-help{padding:9px;border:1px solid var(--border);border-radius:5px;background:var(--bg-elevated);font-size:9px;color:var(--text-secondary)}
  .multicam-help strong{color:var(--text-primary);font-size:10px}.multicam-help ol{margin:6px 0 7px;padding-left:18px;display:grid;gap:4px}.multicam-help small{color:var(--text-muted);line-height:1.4}
  footer{min-height:28px;padding:7px 8px;border-radius:4px;background:var(--bg-elevated);font-size:9px;color:var(--text-muted);line-height:1.4}
  .spinner{display:inline-block;width:8px;height:8px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;margin-right:7px;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:640px){.angle-grid{grid-template-columns:1fr}.angle-video{min-height:150px}}
</style>
