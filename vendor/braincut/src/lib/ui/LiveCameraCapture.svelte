<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { recordingFile } from '#lib/media/recording.ts';
  import { importFiles } from '#lib/media/import.ts';
  import { createClipFromMedia } from '#lib/project/defaults.ts';
  import { addTrack, canPlace, placeClips } from '#lib/project/ops.ts';
  import { activeSequence, editSequence } from '#lib/project/store.ts';
  import { addToast, playhead, selection } from '#lib/stores/app.ts';
  import type { Track, TrackKind } from '#lib/project/types.ts';

  let videoElement = $state<HTMLVideoElement | null>(null);
  let cameras = $state<MediaDeviceInfo[]>([]);
  let microphones = $state<MediaDeviceInfo[]>([]);
  let cameraId = $state('');
  let microphoneId = $state('');
  let includeAudio = $state(true);
  let stream = $state<MediaStream | null>(null);
  let connected = $state(false);
  let recording = $state(false);
  let elapsed = $state(0);
  let message = $state('Connect a laptop or external webcam to preview and record directly into this project.');
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      cameras = all.filter((device) => device.kind === 'videoinput');
      microphones = all.filter((device) => device.kind === 'audioinput');
      if (!cameras.some((device) => device.deviceId === cameraId)) cameraId = cameras[0]?.deviceId ?? '';
      if (!microphones.some((device) => device.deviceId === microphoneId)) microphoneId = microphones[0]?.deviceId ?? '';
    } catch {
      message = 'Could not list camera devices. Try reconnecting the camera or checking browser permissions.';
    }
  }

  onMount(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
  });

  function releaseCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    connected = false;
    if (videoElement) videoElement.srcObject = null;
  }

  onDestroy(() => {
    disposed = true;
    if (timer) clearInterval(timer);
    navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    releaseCamera();
  });

  async function connectCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      message = 'Camera access requires a secure browser context (HTTPS or localhost) and a supported browser.';
      return;
    }
    if (recording) return;
    releaseCamera();
    message = 'Requesting camera permission…';
    try {
      const constraints: MediaStreamConstraints = {
        video: cameraId ? { deviceId: { exact: cameraId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } } : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } },
        audio: includeAudio ? (microphoneId ? { deviceId: { exact: microphoneId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false }) : false
      };
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        if (!microphoneId || !includeAudio || !(error instanceof DOMException)) throw error;
        stream = await navigator.mediaDevices.getUserMedia({ ...constraints, audio: true });
      }
      connected = true;
      await refreshDevices();
      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play().catch(() => undefined);
      }
      const video = stream.getVideoTracks()[0];
      const settings = video?.getSettings();
      message = `Live preview connected${settings?.width && settings?.height ? ` · ${settings.width}×${settings.height}` : ''}${stream.getAudioTracks().length ? ' · microphone ready' : ' · video only'}.`;
    } catch (error) {
      releaseCamera();
      const name = error instanceof DOMException ? error.name : '';
      message = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Camera or microphone permission was denied. Allow access for this editor and try again.'
        : name === 'NotFoundError'
          ? 'No camera was found. Connect a webcam and refresh the device list.'
          : name === 'NotReadableError'
            ? 'The camera is busy or unavailable. Close other apps using it and try again.'
            : error instanceof Error ? error.message : 'Could not connect to the camera.';
      await refreshDevices();
    }
  }

  function freeTrack(seq: import('#lib/project/types.ts').Sequence, kind: TrackKind, start: number, duration: number, preferred?: string): Track | undefined {
    const tracks = seq.tracks.filter((track) => track.kind === kind && !track.locked);
    const chosen = tracks.find((track) => track.id === preferred && canPlace(seq, track.id, start, duration))
      ?? tracks.find((track) => canPlace(seq, track.id, start, duration));
    if (chosen) return chosen;
    const newId = addTrack(seq, kind);
    return seq.tracks.find((track) => track.id === newId);
  }

  async function addCapture(file: File) {
    const imported = await importFiles([file]);
    const media = imported.find((item) => item.kind === 'video' && item.status === 'ready' && item.hasVideo);
    if (!media) throw new Error('The recording was saved, but this browser could not decode it as video. Try WebM/VP8 or another supported browser.');
    const seq = get(activeSequence);
    if (!seq) throw new Error('Open a video sequence before recording.');
    const start = get(playhead);
    const pair = createClipFromMedia(media, start, { fps: seq.fps });
    if (!pair.video) throw new Error('The captured file did not contain a usable video stream.');
    let videoTrackId: string | null = null;
    let audioTrackId: string | null = null;
    editSequence('record live camera', (draftSeq) => {
      const videoTrack = freeTrack(draftSeq, 'video', start, pair.video!.duration);
      if (!videoTrack) return;
      const placements = [{ trackId: videoTrack.id, clip: pair.video! }];
      if (pair.audio) {
        const audioTrack = freeTrack(draftSeq, 'audio', start, pair.audio.duration);
        if (audioTrack) {
          placements.push({ trackId: audioTrack.id, clip: pair.audio });
          audioTrackId = audioTrack.id;
        }
      }
      const placed = placeClips(draftSeq, placements, 'overwrite');
      if (placed.includes(pair.video!.id)) videoTrackId = videoTrack.id;
      else if (audioTrackId) audioTrackId = null;
    });
    if (!videoTrackId) throw new Error('No unlocked video track was available for this camera recording.');
    selection.set([pair.video.id, ...(pair.audio && audioTrackId ? [pair.audio.id] : [])]);
    addToast(`Camera recording added to ${trackName(get(activeSequence), videoTrackId)}${audioTrackId ? ` + ${trackName(get(activeSequence), audioTrackId)}` : ''}.`, 'success');
  }

  function trackName(seq: import('#lib/project/types.ts').Sequence | null, id: string): string {
    return seq?.tracks.find((track) => track.id === id)?.name ?? 'timeline';
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return;
    message = 'Finishing camera recording…';
    recorder.stop();
  }

  function startRecording() {
    if (!stream || !connected) return;
    if (typeof MediaRecorder === 'undefined') {
      message = 'Recording is not supported by this browser.';
      return;
    }
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4'];
    const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        recording = false;
        if (timer) clearInterval(timer);
        timer = null;
        message = 'The browser reported a camera recording error.';
      };
      recorder.onstop = () => {
        if (timer) clearInterval(timer);
        timer = null;
        recording = false;
        elapsed = Date.now() - startedAt;
        const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'video/webm' });
        chunks = [];
        if (disposed) return;
        if (!blob.size) {
          message = 'No video data was captured. Check the camera and try again.';
          return;
        }
        const file = recordingFile(blob, blob.type, new Date(), 'camera-recording');
        message = `Importing ${file.name} into the project…`;
        void addCapture(file)
          .then(() => { if (!disposed) message = `Recorded ${file.name} and added it to the editing timeline.`; })
          .catch((error: unknown) => { if (!disposed) message = error instanceof Error ? error.message : 'Could not add the camera recording to the project.'; });
      };
      recorder.start(1000);
      startedAt = Date.now();
      elapsed = 0;
      recording = true;
      message = 'Recording live camera and microphone. Stop to add the synchronized clip to your timeline.';
      timer = setInterval(() => { elapsed = Date.now() - startedAt; }, 200);
    } catch (error) {
      message = error instanceof Error ? error.message : 'Could not start camera recording.';
    }
  }

  function disconnect() {
    if (recording) stopRecording();
    releaseCamera();
    message = 'Camera disconnected. Any completed recording remains in the project.';
  }

  const time = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
</script>

<section class="camera-capture" aria-label="Live camera and recording">
  <div class="heading">
    <div><strong>Live Camera & Recording</strong><small>Laptop webcam · USB webcam · synchronized audio</small></div>
    <span class:live={recording} class="status"><i></i>{recording ? 'RECORDING' : connected ? 'LIVE' : 'OFFLINE'} <b>{time(elapsed)}</b></span>
  </div>
  <div class="preview-wrap">
    <video bind:this={videoElement} autoplay muted playsinline></video>
    {#if !connected}<div class="preview-placeholder"><span>◉</span><b>Camera preview</b><small>Connect a camera to see the live feed</small></div>{/if}
    {#if recording}<span class="rec-dot">● REC</span>{/if}
  </div>
  <div class="device-controls">
    <label>Camera
      <select aria-label="Camera input" bind:value={cameraId} disabled={connected}>
        {#if cameras.length === 0}<option value="">Default camera</option>{/if}
        {#each cameras as camera (camera.deviceId)}<option value={camera.deviceId}>{camera.label || 'Camera'}</option>{/each}
      </select>
    </label>
    <label>Microphone
      <select aria-label="Camera microphone" bind:value={microphoneId} disabled={connected || !includeAudio}>
        {#if microphones.length === 0}<option value="">Default microphone</option>{/if}
        {#each microphones as microphone (microphone.deviceId)}<option value={microphone.deviceId}>{microphone.label || 'Microphone'}</option>{/each}
      </select>
    </label>
    <label class="audio-toggle"><input type="checkbox" bind:checked={includeAudio} disabled={connected}/> Include audio</label>
    <button class="refresh" onclick={refreshDevices} disabled={connected}>↻ Devices</button>
  </div>
  <div class="actions">
    {#if !connected}
      <button class="connect" onclick={connectCamera}>Connect camera</button>
    {:else}
      {#if recording}
        <button class="stop" onclick={stopRecording}>■ Stop & add to timeline</button>
      {:else}
        <button class="record" onclick={startRecording}>● Record to project</button>
      {/if}
      <button class="disconnect" onclick={disconnect} disabled={recording}>Disconnect</button>
    {/if}
  </div>
  <p role="status">{message}</p>
</section>

<style>
  .camera-capture { padding: 10px 12px; border-bottom: 1px solid var(--border); background: var(--bg-surface); display: grid; gap: 8px; }
  .heading, .device-controls, .actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .heading strong { display: block; font-size: 12px; color: var(--text-primary); }
  .heading small, .camera-capture p { color: var(--text-muted); font-size: 10px; }
  .status { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font: 10px var(--font-editor); }
  .status i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
  .status.live i { background: #ef4444; box-shadow: 0 0 0 3px #ef444422; }
  .status b { color: var(--text-primary); font-size: 12px; }
  .preview-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; max-height: 190px; overflow: hidden; border-radius: 5px; background: #080b11; display: grid; place-items: center; }
  video { width: 100%; height: 100%; object-fit: contain; display: block; }
  .preview-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: #9ca3af; }
  .preview-placeholder span { font-size: 23px; color: var(--accent); }
  .preview-placeholder b { font-size: 11px; }
  .preview-placeholder small { font-size: 9px; }
  .rec-dot { position: absolute; top: 8px; left: 8px; padding: 4px 7px; border-radius: 3px; color: white; background: #a62b32; font: 10px var(--font-editor); }
  .device-controls label { display: flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 10px; }
  .device-controls select { min-width: 95px; max-width: 145px; background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 5px; font-size: 10px; }
  .device-controls .audio-toggle { gap: 4px; }
  .device-controls input { accent-color: var(--accent); }
  .device-controls button, .actions button { padding: 6px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .refresh, .disconnect { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }
  .connect { background: var(--accent); color: #111; }
  .record { background: #b8323b; color: white; }
  .stop { background: #a62b32; color: white; }
  .camera-capture p { margin: 0; line-height: 1.4; }
</style>
