<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { recordingFile, supportedRecordingMimeType } from '$lib/media/recording';
  import type { Track } from '$lib/project/types';

  let { tracks, onrecord }: { tracks: Track[]; onrecord: (file: File, trackId: string) => Promise<void> | void } = $props();
  let devices = $state<Array<{ deviceId: string; label: string }>>([]);
  let deviceId = $state('');
  let trackId = $state('');
  let recording = $state(false);
  let elapsed = $state(0);
  let message = $state('Microphone recordings stay on this device.');
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  $effect(() => {
    if (!tracks.some((track) => track.id === trackId && !track.locked)) {
      trackId = tracks.find((track) => !track.locked)?.id ?? '';
    }
  });

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      devices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Microphone ${index + 1}` }));
      if (!devices.some((device) => device.deviceId === deviceId)) deviceId = devices[0]?.deviceId ?? '';
    } catch {
      message = 'Could not list microphone inputs. You can still try the default device.';
    }
  }

  function stopStream() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  onMount(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
  });

  onDestroy(() => {
    disposed = true;
    if (timer) clearInterval(timer);
    navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    stopStream();
  });

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      message = 'Microphone recording is unavailable in this browser. Use a current browser on localhost or HTTPS.';
      return;
    }
    if (!trackId) {
      message = 'Create or unlock an audio track before recording.';
      return;
    }
    message = 'Requesting microphone permission…';
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      } catch (error) {
        if (!deviceId) throw error;
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const mimeType = supportedRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        message = 'The browser reported a microphone recording error.';
        recording = false;
        if (timer) clearInterval(timer);
        timer = null;
        stopStream();
      };
      recorder.onstop = () => {
        if (timer) clearInterval(timer);
        timer = null;
        stopStream();
        recording = false;
        elapsed = Date.now() - startedAt;
        const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'audio/webm' });
        chunks = [];
        if (disposed) return;
        if (!blob.size) {
          message = 'No audio data was captured. Check your microphone and try again.';
          return;
        }
        const file = recordingFile(blob, blob.type);
        const targetTrack = trackId;
        message = 'Adding recording to the timeline…';
        void Promise.resolve(onrecord(file, targetTrack))
          .then(() => { if (!disposed) message = `Added ${file.name} to the timeline.`; })
          .catch((error: unknown) => { if (!disposed) message = error instanceof Error ? error.message : 'Could not add the recording to the timeline.'; });
      };
      recorder.start(1000);
      startedAt = Date.now();
      elapsed = 0;
      recording = true;
      message = 'Recording. Press Stop to finish and insert the clip.';
      timer = setInterval(() => { elapsed = Date.now() - startedAt; }, 200);
      await refreshDevices();
    } catch (error) {
      stopStream();
      const name = error instanceof DOMException ? error.name : '';
      message = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Microphone permission was denied. Allow microphone access for this editor and try again.'
        : name === 'NotFoundError'
          ? 'No microphone was found. Connect an input device and try again.'
          : name === 'NotReadableError'
            ? 'The microphone is busy or unavailable to the browser.'
            : error instanceof Error ? error.message : 'Microphone recording could not start.';
      await refreshDevices();
    }
  }

  function stop() {
    if (!recorder || recorder.state === 'inactive') return;
    message = 'Finishing recording…';
    recorder.stop();
  }

  const time = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
</script>

<section class="recorder" aria-label="Microphone recording">
  <div class="recorder-heading">
    <div><strong>Microphone recording</strong><small>Voiceovers and podcast tracks · local capture</small></div>
    <div class="recorder-clock"><i class:live={recording}></i>{recording ? 'REC' : 'READY'} <b>{time(elapsed)}</b></div>
  </div>
  <div class="recorder-controls">
    <label>Input
      <select aria-label="Microphone input" bind:value={deviceId} disabled={recording}>
        {#if devices.length === 0}<option value="">Default microphone</option>{/if}
        {#each devices as device (device.deviceId)}<option value={device.deviceId}>{device.label}</option>{/each}
      </select>
    </label>
    <label>Record to
      <select aria-label="Recording destination track" bind:value={trackId} disabled={recording || tracks.length === 0}>
        {#each tracks as track (track.id)}<option value={track.id} disabled={track.locked}>{track.name}{track.locked ? ' · Locked' : ''}</option>{/each}
      </select>
    </label>
    {#if recording}
      <button class="stop" onclick={stop}>■ Stop & add</button>
    {:else}
      <button class="record" onclick={start} disabled={!trackId}>● Record</button>
    {/if}
  </div>
  <p role="status">{message}</p>
</section>

<style>
  .recorder { padding: 10px 12px; border-bottom: 1px solid var(--border); background: var(--bg-surface); display: grid; gap: 8px; }
  .recorder-heading, .recorder-controls { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .recorder-heading strong { display: block; font-size: 12px; color: var(--text-primary); }
  .recorder-heading small, .recorder p { color: var(--text-muted); font-size: 10px; }
  .recorder-clock { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font: 10px var(--font-editor); }
  .recorder-clock i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
  .recorder-clock i.live { background: #ef4444; box-shadow: 0 0 0 3px #ef444422; }
  .recorder-clock b { color: var(--text-primary); font-size: 12px; }
  .recorder-controls label { display: flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 10px; }
  .recorder-controls select { min-width: 110px; max-width: 190px; background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 5px 7px; font-size: 10px; }
  .recorder-controls button { padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .record { background: var(--accent); color: #111; }
  .stop { background: #a62b32; color: white; }
  .recorder p { margin: 0; line-height: 1.4; }
</style>
