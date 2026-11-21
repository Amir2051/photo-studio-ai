<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Clip, ClipNoiseReduction, MediaItem } from '#lib/project/types.ts';
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
  import { preview, commitPreview, cancelPreview, undo, redo, editSequence } from '#lib/project/store.ts';
  import * as ops from '#lib/project/ops.ts';
  import { buildCommands } from '#lib/editor/commands.ts';
  import { addToast, renderStatus } from '#lib/stores/app.ts';
  import { calculatePeakNormalization, withPeakNormalization } from '#lib/media/audio-normalize.ts';
  import { captureNoiseProfile } from '#lib/media/spectral-denoise.ts';
  import { mergePieces, type AudioPiece } from '#lib/engine/audio-graph.ts';

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

  let noiseClipId = $state('');
  let noiseStart = $state(0);
  let noiseEnd = $state(2);
  let noiseStrength = $state(1);
  let noiseFloor = $state(0.12);
  let noiseThreshold = $state(1.15);
  let noiseSmoothing = $state(2);
  let noiseBusy = $state(false);
  let noiseMessage = $state('');
  let noiseError = $state('');
  let noisePreviewActive = $state(false);
  let pendingNoise = $state<ClipNoiseReduction | null>(null);
  let originalNoise = $state<ClipNoiseReduction | null>(null);
  let noiseController: AbortController | null = null;
  let noiseTarget = $derived(clips.find((clip) => clip.id === noiseClipId && clip.kind === 'audio') ?? null);
  let noiseTargetMedia = $derived(noiseTarget?.mediaId ? media.find((item) => item.id === noiseTarget.mediaId) ?? null : null);

  // non-destructive: recomputes on marker/selection changes, never edits media
  let plan = $derived(buildSilenceEditPlan($quietRegionMarkers, fps, true));
  let allSelected = $derived(
    $quietRegionMarkers.length > 0 && $quietRegionMarkers.every((m) => m.selected),
  );

  // one initial pass on mount; never re-run on clips/media changes because
  // that would silently undo the user's edits and re-populate the regions
  onMount(() => {
    const first = clips.find((clip) => clip.kind === 'audio' && clip.enabled && !!clip.mediaId);
    if (first) {
      noiseClipId = first.id;
      noiseStart = first.in;
      noiseEnd = Math.min(first.in + 2, media.find((item) => item.id === first.mediaId)?.duration ?? first.in + 2);
      if (first.noiseReduction) {
        noiseStrength = first.noiseReduction.strength;
        noiseFloor = first.noiseReduction.floor;
        noiseThreshold = first.noiseReduction.threshold;
        noiseSmoothing = first.noiseReduction.frequencySmoothing;
      }
    }
    void analyze();
  });

  onDestroy(() => {
    controller?.abort();
    noiseController?.abort();
    if (noisePreviewActive) cancelPreview();
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
    if (noisePreviewActive) cancelNoiseReduction();
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

  function normalizePeak(item: ClipAnalysis): void {
    if (!item.stats || item.status === 'invalid' || item.status === 'unavailable' || item.status === 'empty') return;

    let message = 'The clip could not be normalized.';
    let tone: 'success' | 'warning' = 'warning';
    editSequence('Peak normalize audio clip', (seq) => {
      const found = ops.findClipById(seq, item.key);
      if (!found || found.clip.kind !== 'audio') return;
      const volume = found.clip.effects.find((effect) => effect.type === 'volume');
      const result = calculatePeakNormalization(item.stats!.peakDb, volume);
      if ('reason' in result) {
        message = result.reason;
        return;
      }
      if (!volume) return;
      Object.assign(volume, withPeakNormalization(volume, result.deltaDb));
      tone = result.status === 'limited' ? 'warning' : 'success';
      message = result.status === 'limited'
        ? 'Gain increased by ' + result.deltaDb.toFixed(1) + ' dB; target limited to ' + result.resultingPeakDb.toFixed(1) + ' dBFS.'
        : 'Estimated source peak after gain: ' + result.resultingPeakDb.toFixed(1) + ' dBFS.';
    });
    addToast(message, tone);
  }


  function chooseNoiseClip(id: string): void {
    if (noisePreviewActive) cancelNoiseReduction();
    noiseClipId = id;
    const clip = clips.find((item) => item.id === id);
    const item = clip?.mediaId ? media.find((entry) => entry.id === clip.mediaId) : null;
    noiseStart = clip?.in ?? 0;
    noiseEnd = Math.min((clip?.in ?? 0) + 2, item?.duration ?? (clip?.in ?? 0) + 2);
    noiseMessage = '';
    noiseError = '';
    noiseStrength = 1;
    noiseFloor = 0.12;
    noiseThreshold = 1.15;
    noiseSmoothing = 2;
    if (clip?.noiseReduction) {
      noiseStrength = clip.noiseReduction.strength;
      noiseFloor = clip.noiseReduction.floor;
      noiseThreshold = clip.noiseReduction.threshold;
      noiseSmoothing = clip.noiseReduction.frequencySmoothing;
    }
  }

  function cloneNoiseSettings(settings: ClipNoiseReduction): ClipNoiseReduction {
    return {
      enabled: settings.enabled,
      profile: {
        version: settings.profile.version,
        sampleRate: settings.profile.sampleRate,
        fftSize: settings.profile.fftSize,
        hopSize: settings.profile.hopSize,
        magnitudes: Array.from(settings.profile.magnitudes),
        capturedFrames: settings.profile.capturedFrames,
        capturedAt: settings.profile.capturedAt,
        sourceStart: settings.profile.sourceStart,
        sourceEnd: settings.profile.sourceEnd,
      },
      strength: settings.strength,
      floor: settings.floor,
      threshold: settings.threshold,
      frequencySmoothing: settings.frequencySmoothing,
    };
  }

  function updateNoisePreview(): void {
    if (!pendingNoise) {
      if (!noiseTarget?.noiseReduction) return;
      originalNoise = cloneNoiseSettings(noiseTarget.noiseReduction);
      pendingNoise = cloneNoiseSettings(noiseTarget.noiseReduction);
      pendingNoise.enabled = true;
    }
    pendingNoise = {
      ...pendingNoise, strength: noiseStrength, floor: noiseFloor,
      threshold: noiseThreshold, frequencySmoothing: noiseSmoothing,
    };
    const settings = cloneNoiseSettings(pendingNoise);
    preview((draft) => {
      const sequence = draft.sequences.find((seq) => seq.id === draft.activeSequenceId) ?? draft.sequences[0];
      const found = sequence ? ops.findClipById(sequence, noiseClipId) : null;
      if (found) found.clip.noiseReduction = settings;
    }, { commitOnEdit: false });
    noisePreviewActive = true;
  }

  $effect(() => {
    const saved = noiseTarget?.noiseReduction;
    if (saved && !noisePreviewActive) {
      noiseStrength = saved.strength;
      noiseFloor = saved.floor;
      noiseThreshold = saved.threshold;
      noiseSmoothing = saved.frequencySmoothing;
    }
    if (!saved && !noisePreviewActive &&
        noiseMessage.startsWith('Spectral noise reduction applied')) {
      noiseMessage = '';
    }
  });

  async function captureNoiseSample(): Promise<void> {
    if (!noiseTarget || !noiseTargetMedia || noiseBusy) return;
    if (!Number.isFinite(noiseStart) || !Number.isFinite(noiseEnd) ||
        noiseStart < 0 || noiseEnd <= noiseStart || noiseEnd > noiseTargetMedia.duration ||
        noiseEnd - noiseStart < 0.1) {
      noiseError = 'Choose a valid noise-only source range (at least 0.1 seconds).';
      return;
    }
    if (noisePreviewActive) cancelNoiseReduction();
    noiseController?.abort();
    const current = new AbortController();
    noiseController = current;
    noiseBusy = true;
    noiseError = '';
    noiseMessage = 'Decoding the selected noise-only sample locally…';
    try {
      const session = program();
      const reader = await session.cache.reader(noiseTargetMedia);
      if (!reader || !reader.hasAudio) throw new Error('The selected media has no decodable audio track.');
      const pieces: AudioPiece[] = [];
      for await (const piece of reader.audio(noiseStart, noiseEnd)) {
        if (current.signal.aborted) return;
        pieces.push(piece);
      }
      if (current.signal.aborted) return;
      const merged = mergePieces(session.audio.ctx, pieces);
      if (!merged) throw new Error('No audio samples were decoded from that range.');
      if (merged.buffer.numberOfChannels > 2) throw new Error('Spectral noise reduction currently supports mono and stereo sources only.');
      const channelProfiles = Array.from({ length: Math.min(2, merged.buffer.numberOfChannels) }, (_, channel) =>
        captureNoiseProfile(merged.buffer.getChannelData(channel), merged.buffer.sampleRate, current.signal),
      );
      if (current.signal.aborted) return;
      const validProfiles = channelProfiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null);
      if (validProfiles.length === 0) throw new Error('The sample is too short or invalid. Select at least 1024 samples of steady background noise.');
      const profile = {
        ...validProfiles[0],
        magnitudes: Float32Array.from(validProfiles[0].magnitudes, (_, index) =>
          validProfiles.reduce((sum, candidate) => sum + candidate.magnitudes[index], 0) / validProfiles.length,
        ),
        capturedFrames: Math.min(...validProfiles.map((candidate) => candidate.capturedFrames)),
      };
      originalNoise = null;
      pendingNoise = {
        enabled: true,
        profile: {
          version: profile.version, sampleRate: profile.sampleRate, fftSize: profile.fftSize,
          hopSize: profile.hopSize, magnitudes: Array.from(profile.magnitudes),
          capturedFrames: profile.capturedFrames, capturedAt: Date.now(),
          sourceStart: noiseStart, sourceEnd: noiseEnd,
        },
        strength: noiseStrength, floor: noiseFloor, threshold: noiseThreshold,
        frequencySmoothing: noiseSmoothing,
      };
      const settings = cloneNoiseSettings(pendingNoise);
      preview((draft) => {
        const sequence = draft.sequences.find((seq) => seq.id === draft.activeSequenceId) ?? draft.sequences[0];
        const found = sequence ? ops.findClipById(sequence, noiseClipId) : null;
        if (found) found.clip.noiseReduction = settings;
      }, { commitOnEdit: false });
      noisePreviewActive = true;
      noiseMessage = 'Noise profile captured from ' + (noiseEnd - noiseStart).toFixed(2) + 's. Preview is active; Apply to keep it or Cancel to discard.';
    } catch (cause) {
      if (!current.signal.aborted) noiseError = cause instanceof Error ? cause.message : 'Noise profile capture failed.';
      noiseMessage = '';
    } finally {
      if (noiseController === current) noiseBusy = false;
    }
  }

  function applyNoiseReduction(): void {
    if (!noisePreviewActive) return;
    commitPreview('Apply spectral noise reduction');
    noisePreviewActive = false;
    pendingNoise = null;
    originalNoise = null;
    noiseMessage = 'Spectral noise reduction applied to this clip. Use Undo to revert.';
  }

  function cancelNoiseReduction(): void {
    if (noisePreviewActive) cancelPreview();
    noisePreviewActive = false;
    pendingNoise = null;
    if (originalNoise) {
      noiseStrength = originalNoise.strength;
      noiseFloor = originalNoise.floor;
      noiseThreshold = originalNoise.threshold;
      noiseSmoothing = originalNoise.frequencySmoothing;
    }
    originalNoise = null;
    noiseMessage = 'Noise reduction preview discarded.';
  }

  function toggleNoiseBypass(): void {
    if (!noiseTarget?.noiseReduction) return;
    editSequence('Toggle spectral noise reduction', (seq) => {
      const found = ops.findClipById(seq, noiseClipId);
      if (found?.clip.noiseReduction) found.clip.noiseReduction.enabled = !found.clip.noiseReduction.enabled;
    });
  }

  function removeNoiseProfile(): void {
    if (noisePreviewActive) cancelNoiseReduction();
    editSequence('Clear spectral noise profile', (seq) => {
      const found = ops.findClipById(seq, noiseClipId);
      if (found) delete found.clip.noiseReduction;
    });
    noiseMessage = 'Noise profile removed from this clip.';
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
      for (const range of ranges) {
        const owner = ops.findClipById(seq, range.clipId);
        if (!owner || owner.track.kind !== 'audio' || owner.track.locked) continue;
        ops.extractRange(seq, range.start, range.end, [owner.track.id]);
      }
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
    <section class="denoise" aria-label="Spectral noise reduction">
      <div class="denoise-head">
        <strong>Spectral noise reduction</strong>
        <small>Local DSP · original media stays untouched</small>
      </div>
      <div class="controls">
        <label class="control" for="denoise-clip">Audio clip</label>
        <select id="denoise-clip" value={noiseClipId} onchange={(event) => chooseNoiseClip(event.currentTarget.value)}>
          {#each clips.filter((clip) => clip.kind === 'audio' && !!clip.mediaId) as clip (clip.id)}
            <option value={clip.id}>{clip.name}</option>
          {/each}
        </select>
        <label class="control" for="denoise-start">Noise sample from (s)
          <input id="denoise-start" type="number" min="0" step="0.1" value={noiseStart}
            onchange={(event) => (noiseStart = clampNumber(event.currentTarget.value, 0, noiseTargetMedia?.duration ?? 0, noiseStart))} />
        </label>
        <label class="control" for="denoise-end">to (s)
          <input id="denoise-end" type="number" min="0" step="0.1" value={noiseEnd}
            onchange={(event) => (noiseEnd = clampNumber(event.currentTarget.value, 0, noiseTargetMedia?.duration ?? 0, noiseEnd))} />
        </label>
        <button class="action primary" onclick={captureNoiseSample} disabled={noiseBusy || !noiseTarget || !noiseTargetMedia}>
          {noiseBusy ? 'Capturing…' : 'Capture noise profile'}
        </button>
      </div>
      {#if noiseTarget?.noiseReduction || pendingNoise}
        <div class="controls">
          <label class="control" for="denoise-strength">Strength {noiseStrength.toFixed(2)}
            <input id="denoise-strength" type="range" min="0" max="2" step="0.05" value={noiseStrength}
              onchange={(event) => { noiseStrength = Number(event.currentTarget.value); updateNoisePreview(); }} />
          </label>
          <label class="control" for="denoise-floor">Detail floor {noiseFloor.toFixed(2)}
            <input id="denoise-floor" type="range" min="0.03" max="0.5" step="0.01" value={noiseFloor}
              onchange={(event) => { noiseFloor = Number(event.currentTarget.value); updateNoisePreview(); }} />
          </label>
          <label class="control" for="denoise-threshold">Threshold {noiseThreshold.toFixed(2)}
            <input id="denoise-threshold" type="range" min="0.5" max="3" step="0.05" value={noiseThreshold}
              onchange={(event) => { noiseThreshold = Number(event.currentTarget.value); updateNoisePreview(); }} />
          </label>
          <label class="control" for="denoise-smoothing">Frequency smoothing
            <input id="denoise-smoothing" type="number" min="0" max="4" step="1" value={noiseSmoothing}
              onchange={(event) => { noiseSmoothing = Math.round(clampNumber(event.currentTarget.value, 0, 4, 2)); updateNoisePreview(); }} />
          </label>
          {#if noisePreviewActive}
            <span class="previewing" role="status">Previewing in playback</span>
            <button class="action primary" onclick={applyNoiseReduction}>Apply</button>
            <button class="action" onclick={cancelNoiseReduction}>Cancel</button>
          {:else if noiseTarget?.noiseReduction}
            <button class="action" onclick={toggleNoiseBypass}>{noiseTarget.noiseReduction.enabled ? 'Bypass' : 'Enable'}</button>
            <button class="action" onclick={removeNoiseProfile}>Clear profile</button>
          {/if}
        </div>
      {:else}
        <p class="hint">Select a noise-only section of the recording (room tone, fan, or hiss), capture its profile, then adjust strength while listening to the clip.</p>
      {/if}
      {#if noiseMessage}<p class="success" role="status">{noiseMessage}</p>{/if}
      {#if noiseError}<p class="error" role="alert">{noiseError}</p>{/if}
    </section>
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
              <div class="clip-actions">
                <button
                  class="mini"
                  onclick={() => normalizePeak(item)}
                  disabled={item.stats.allSilent}
                  title="Adjust clip gain non-destructively toward -1 dBFS peak">
                  Peak normalize
                </button>
                <small>Local · non-destructive · max +12 dB</small>
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

  .denoise {
    margin: 7px 0;
    padding: 7px 8px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--bg-surface);
  }

  .denoise-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
  }

  .denoise-head strong {
    color: var(--text-primary);
    font-size: 10px;
    font-weight: 600;
  }

  .denoise-head small {
    color: var(--text-muted);
    font-size: 9px;
  }

  .denoise select {
    max-width: 180px;
    padding: 3px 5px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: 9px;
  }

  .denoise input[type='range'] {
    width: 82px;
    padding: 0;
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

  .clip-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 5px;
  }

  .clip-actions small {
    color: var(--text-muted);
    font-size: 8px;
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
