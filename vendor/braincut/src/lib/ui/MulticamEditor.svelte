<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { importFiles } from '#lib/media/import.ts';
  import { recordingFile, supportedRecordingMimeType } from '#lib/media/recording.ts';
  import { getBlobForMedia } from '#lib/media/sources.ts';
  import { createClipFromMedia } from '#lib/project/defaults.ts';
  import { readDrag, endDrag } from '#lib/editor/drag.ts';
  import { addTrack, canPlace, placeClips } from '#lib/project/ops.ts';
  import { activeSequence, editSequence, mediaById, project } from '#lib/project/store.ts';
  import { addToast, playhead, playing, selection } from '#lib/stores/app.ts';
  import type { Clip, MediaItem, Sequence, Track } from '#lib/project/types.ts';

  type Angle = {
    index: number;
    label: string;
    track: Track | undefined;
    audioTrack: Track | undefined;
    hostAudioTrack: Track | undefined;
    clip: Clip | undefined;
    media: MediaItem | undefined;
    offset: number;
  };
  type WindowLayout = { x: number; y: number; w: number; h: number };
  type LayoutMode = 'grid' | 'focus' | 'horizontal' | 'vertical' | 'free';
  type WindowGesture = {
    index: number;
    mode: 'move' | 'resize';
    pointerId: number;
    startX: number;
    startY: number;
    origin: WindowLayout;
  };

  const DEFAULT_LABELS = ['Host 1', 'Host 2', 'Guest 1', 'Guest 2'];
  const LAYOUT_STORAGE_KEY = 'braincut.multicam.window-layouts.v1';
  const DEFAULT_LAYOUTS: WindowLayout[] = [
    { x: 0.015, y: 0.02, w: 0.475, h: 0.465 },
    { x: 0.51, y: 0.02, w: 0.475, h: 0.465 },
    { x: 0.015, y: 0.515, w: 0.475, h: 0.465 },
    { x: 0.51, y: 0.515, w: 0.475, h: 0.465 }
  ];

  let activeAngle = $state(0);
  let layoutMode = $state<LayoutMode>('grid');
  let windowLayouts = $state<WindowLayout[]>(DEFAULT_LAYOUTS.map((item) => ({ ...item })));
  let stageEl = $state<HTMLElement | null>(null);
  let windowGesture: WindowGesture | null = null;
  let videoEls: Array<HTMLVideoElement | undefined> = [];
  let liveVideoEls: Array<HTMLVideoElement | undefined> = [];
  let cameraDevices = $state<MediaDeviceInfo[]>([]);
  let microphoneDevices = $state<MediaDeviceInfo[]>([]);
  let cameraDeviceIds = $state(['', '', '', '']);
  let liveStreams = $state.raw<Array<MediaStream | null>>([null, null, null, null]);
  let microphoneDeviceId = $state('');
  let microphoneStream = $state.raw<MediaStream | null>(null);
  let microphoneLevel = $state(0);
  let hostAudioStreams = $state.raw<Array<MediaStream | null>>([null, null, null, null]);
  let hostAudioDeviceIds = $state(['', '', '', '']);
  let hostAudioLevels = $state([0, 0, 0, 0]);
  let hostAudioMuted = $state([false, false, false, false]);
  let hostAudioRoutes = $state<Array<'none' | 'live' | 'camera'>>(['none', 'none', 'none', 'none']);
  let hostAudioContexts: Array<AudioContext | null> = [null, null, null, null];
  let hostAudioAnalysers: Array<AnalyserNode | null> = [null, null, null, null];
  let hostAudioRecorders: Array<{ index: number; recorder: MediaRecorder; chunks: Blob[] }> = [];
  let hostAudioMeterFrame = 0;
  let microphoneMonitorContext: AudioContext | null = null;
  let microphoneAnalyser: AnalyserNode | null = null;
  let microphoneMonitorFrame = 0;
  let captureRecorders: Array<{ index: number; recorder: MediaRecorder; chunks: Blob[] }> = [];
  let microphoneRecorder: MediaRecorder | null = null;
  let microphoneChunks: Blob[] = [];
  let isRecording = $state(false);
  let recordingElapsed = $state(0);
  let recordingStartedAt = 0;
  let recordingStartTime = 0;
  let recordingTimer: ReturnType<typeof setInterval> | null = null;
  let recordingBusy = $state(false);
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
      const hostAudioTrack = seq?.tracks.find((item) => item.name.startsWith(`HOST AUDIO ${index + 1} · `));
      const clip = track?.clips[0];
      const media = clip?.mediaId ? $mediaById.get(clip.mediaId) : undefined;
      return {
        index,
        label: track ? track.name.slice(prefix.length) : DEFAULT_LABELS[index],
        track,
        audioTrack,
        hostAudioTrack,
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
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((item) =>
          item && typeof item.x === 'number' && typeof item.y === 'number' &&
          typeof item.w === 'number' && typeof item.h === 'number' &&
          [item.x, item.y, item.w, item.h].every(Number.isFinite))) {
          windowLayouts = parsed.map((item) => ({
            x: Math.max(0, Math.min(0.98, item.x)),
            y: Math.max(0, Math.min(0.98, item.y)),
            w: Math.max(0.2, Math.min(1, item.w)),
            h: Math.max(0.22, Math.min(1, item.h))
          }));
          layoutMode = 'free';
        }
      }
    } catch { /* use the default studio layout when storage is unavailable */ }
    hostAudioRoutes = angleSlots.map((angle) => {
      if (angle.hostAudioTrack?.clips.length && !angle.hostAudioTrack.muted) return 'live';
      if (angle.audioTrack?.clips.length && !angle.audioTrack.muted) return 'camera';
      return 'none';
    });
    syncTimer = setInterval(syncPreviewPlayback, 90);
    void refreshCaptureDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshCaptureDevices);
  });

  onDestroy(() => {
    disposed = true;
    if (syncTimer) clearInterval(syncTimer);
    if (recordingTimer) clearInterval(recordingTimer);
    navigator.mediaDevices?.removeEventListener?.('devicechange', refreshCaptureDevices);
    for (const item of captureRecorders) if (item.recorder.state !== 'inactive') { item.recorder.onstop = null; item.recorder.stop(); }
    if (microphoneRecorder && microphoneRecorder.state !== 'inactive') { microphoneRecorder.onstop = null; microphoneRecorder.stop(); }
    for (const item of hostAudioRecorders) if (item.recorder.state !== 'inactive') { item.recorder.onstop = null; item.recorder.stop(); }
    for (const stream of liveStreams) stream?.getTracks().forEach((track) => track.stop());
    microphoneStream?.getTracks().forEach((track) => track.stop());
    for (const stream of hostAudioStreams) stream?.getTracks().forEach((track) => track.stop());
    for (const context of hostAudioContexts) if (context) void context.close().catch(() => {});
    cancelAnimationFrame(hostAudioMeterFrame);
    cancelAnimationFrame(microphoneMonitorFrame);
    microphoneAnalyser = null;
    if (microphoneMonitorContext) void microphoneMonitorContext.close().catch(() => {});
    microphoneMonitorContext = null;
    for (const url of Object.values(previewUrls)) URL.revokeObjectURL(url);
    for (const video of videoEls) video?.pause();
    for (const video of liveVideoEls) video?.pause();
  });

  function findAngleTrack(seq: Sequence, index: number): Track | undefined {
    return seq.tracks.find((track) => track.name.startsWith(`MCAM ${index + 1} · `));
  }

  function findAngleAudioTrack(seq: Sequence, index: number): Track | undefined {
    return seq.tracks.find((track) => track.name.startsWith(`MCAM AUDIO ${index + 1} · `));
  }

  function findHostAudioTrack(seq: Sequence, index: number): Track | undefined {
    return seq.tracks.find((track) => track.name.startsWith(`HOST AUDIO ${index + 1} · `));
  }

  function ensureHostAudioTrack(seq: Sequence, index: number, label: string) {
    let track = findHostAudioTrack(seq, index);
    if (!track) {
      const id = addTrack(seq, 'audio');
      track = seq.tracks.find((item) => item.id === id);
      if (track) {
        track.name = `HOST AUDIO ${index + 1} · ${label}`;
        track.muted = false;
      }
    }
    return track;
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

  function copyAngleToSlot(from: number, to: number) {
    if (from === to || to < 0 || to > 3) return;
    const source = angleSlots[from];
    if (!source.media) {
      addToast('Choose a camera with footage before copying it.', 'info');
      return;
    }
    const label = angleSlots[to].label || `Host ${to + 1}`;
    let copied = false;
    editSequence(`copy ${source.label} to ${label}`, (seq) => {
      const { videoTrack, audioTrack } = ensureAngleTracks(seq, to, label);
      if (!videoTrack) return;
      const video = createClipFromMedia(source.media!, source.clip?.start ?? 0, { kind: 'video', in: source.clip?.in ?? 0, duration: source.clip?.duration, fps: seq.fps }).video;
      if (!video) return;
      video.name = `${source.label} (copy) · ${source.media!.name}`;
      videoTrack.clips = [video];
      if (audioTrack) {
        const audio = createClipFromMedia(source.media!, source.clip?.start ?? 0, { kind: 'audio', in: source.clip?.in ?? 0, duration: source.clip?.duration, fps: seq.fps }).audio;
        audioTrack.clips = audio ? [audio] : [];
      }
      copied = true;
    });
    if (copied) {
      activeAngle = to;
      status = `Copied ${source.label} into ${label}. The original angle remains unchanged.`;
    }
  }


  async function refreshCaptureDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameraDevices = devices.filter((device) => device.kind === 'videoinput');
      microphoneDevices = devices.filter((device) => device.kind === 'audioinput');
      if (!microphoneDevices.some((device) => device.deviceId === microphoneDeviceId)) microphoneDeviceId = microphoneDevices[0]?.deviceId ?? '';
      cameraDeviceIds = cameraDeviceIds.map((id, index) => id && cameraDevices.some((device) => device.deviceId === id) ? id : (liveStreams[index] ? id : ''));
    } catch { status = 'Could not list capture devices. Check browser permissions and try again.'; }
  }

  async function connectLiveCamera(index: number, deviceId: string) {
    if (isRecording || recordingBusy) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      status = 'Live camera capture requires HTTPS (or localhost) and a supported browser.';
      return;
    }
    if (!deviceId) return;
    if (liveStreams.some((stream, slot) => slot !== index && stream?.getVideoTracks()[0]?.getSettings().deviceId === deviceId)) {
      addToast('That camera is already connected to another angle.', 'warning');
      return;
    }
    liveStreams[index]?.getTracks().forEach((track) => track.stop());
    liveStreams = liveStreams.map((stream, slot) => slot === index ? null : stream);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } },
        audio: false
      });
      liveStreams = liveStreams.map((current, slot) => slot === index ? stream : current);
      cameraDeviceIds = cameraDeviceIds.map((id, slot) => slot === index ? deviceId : id);
      await tick();
      const video = liveVideoEls[index];
      if (video) { video.srcObject = stream; await video.play().catch(() => undefined); }
      await refreshCaptureDevices();
      activeAngle = index;
      status = `${angleSlots[index].label} live input connected · ready for synchronized recording.`;
    } catch (error) {
      status = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access for this site and reconnect.'
        : error instanceof DOMException && error.name === 'NotReadableError'
          ? 'This camera is busy in another app or browser tab.'
          : error instanceof Error ? error.message : 'Could not connect this camera.';
    }
  }

  async function disconnectLiveCamera(index: number) {
    if (isRecording || recordingBusy) return;
    liveStreams[index]?.getTracks().forEach((track) => track.stop());
    liveStreams = liveStreams.map((stream, slot) => slot === index ? null : stream);
    cameraDeviceIds = cameraDeviceIds.map((id, slot) => slot === index ? '' : id);
    await tick();
    status = `${angleSlots[index].label} disconnected. Completed recordings remain in the project.`;
  }

  async function connectMicrophone(deviceId: string) {
    if (isRecording || recordingBusy) return;
    if (!navigator.mediaDevices?.getUserMedia) { status = 'Microphone capture requires HTTPS (or localhost).'; return; }
    microphoneStream?.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
    cancelAnimationFrame(microphoneMonitorFrame);
    microphoneAnalyser = null;
    if (microphoneMonitorContext) void microphoneMonitorContext.close().catch(() => {});
    microphoneMonitorContext = null;
    microphoneLevel = 0;
    if (!deviceId) return;
    if (hostAudioDeviceIds.some((id, index) => id === deviceId && !!hostAudioStreams[index])) {
      addToast('That microphone is already assigned to a participant.', 'warning');
      return;
    }
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: {
        deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false
      } });
      microphoneDeviceId = deviceId;
      microphoneMonitorContext = new AudioContext();
      microphoneAnalyser = microphoneMonitorContext.createAnalyser();
      microphoneAnalyser.fftSize = 256;
      microphoneMonitorContext.createMediaStreamSource(microphoneStream).connect(microphoneAnalyser);
      await microphoneMonitorContext.resume();
      const sample = new Uint8Array(microphoneAnalyser.fftSize);
      const updateMeter = () => {
        if (!microphoneAnalyser) return;
        microphoneAnalyser.getByteTimeDomainData(sample);
        let sum = 0;
        for (const value of sample) { const normalized = (value - 128) / 128; sum += normalized * normalized; }
        microphoneLevel = Math.min(100, Math.round(Math.sqrt(sum / sample.length) * 260));
        microphoneMonitorFrame = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      await refreshCaptureDevices();
      status = 'Podcast microphone connected · it will be recorded as a separate editable audio track.';
    } catch (error) {
      status = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access and try again.'
        : error instanceof Error ? error.message : 'Could not connect the microphone.';
    }
  }

  function updateHostAudioMeters() {
    const next = hostAudioAnalysers.map((analyser) => {
      if (!analyser) return 0;
      const sample = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(sample);
      let sum = 0;
      for (const value of sample) { const normalized = (value - 128) / 128; sum += normalized * normalized; }
      return Math.min(100, Math.round(Math.sqrt(sum / sample.length) * 260));
    });
    hostAudioLevels = next;
    if (hostAudioAnalysers.some(Boolean)) hostAudioMeterFrame = requestAnimationFrame(updateHostAudioMeters);
  }

  async function connectHostMicrophone(index: number, deviceId: string) {
    if (isRecording || recordingBusy) return;
    if (!deviceId) return;
    if (deviceId === microphoneDeviceId && microphoneStream) {
      addToast('That microphone is already assigned as the room microphone.', 'warning');
      return;
    }
    if (hostAudioDeviceIds.some((id, slot) => slot !== index && id === deviceId && !!hostAudioStreams[slot])) {
      addToast('That microphone is already assigned to another participant.', 'warning');
      return;
    }
    hostAudioStreams[index]?.getTracks().forEach((track) => track.stop());
    if (hostAudioContexts[index]) void hostAudioContexts[index]!.close().catch(() => {});
    hostAudioAnalysers[index] = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false
      } });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      await context.resume();
      hostAudioContexts[index] = context;
      hostAudioAnalysers[index] = analyser;
      hostAudioStreams = hostAudioStreams.map((item, slot) => slot === index ? stream : item);
      hostAudioDeviceIds = hostAudioDeviceIds.map((item, slot) => slot === index ? deviceId : item);
      hostAudioMuted = hostAudioMuted.map((item, slot) => slot === index ? false : item);
      hostAudioRoutes = hostAudioRoutes.map((item, slot) => slot === index ? 'live' : item);
      editSequence(`route ${angleSlots[index].label} live microphone`, (seq) => {
        const hostTrack = ensureHostAudioTrack(seq, index, angleSlots[index].label);
        if (hostTrack) hostTrack.muted = false;
        const cameraTrack = findAngleAudioTrack(seq, index);
        if (cameraTrack) cameraTrack.muted = true;
      });
      cancelAnimationFrame(hostAudioMeterFrame);
      updateHostAudioMeters();
      await refreshCaptureDevices();
      status = `${angleSlots[index].label} microphone connected and routed to its own recording stem.`;
    } catch (error) {
      status = error instanceof DOMException && error.name === 'NotAllowedError'
        ? `Microphone permission was denied for ${angleSlots[index].label}.`
        : error instanceof Error ? error.message : `Could not connect ${angleSlots[index].label}'s microphone.`;
    }
  }

  async function disconnectHostMicrophone(index: number) {
    if (isRecording || recordingBusy) return;
    hostAudioStreams[index]?.getTracks().forEach((track) => track.stop());
    hostAudioStreams = hostAudioStreams.map((item, slot) => slot === index ? null : item);
    hostAudioDeviceIds = hostAudioDeviceIds.map((item, slot) => slot === index ? '' : item);
    hostAudioAnalysers[index] = null;
    if (hostAudioContexts[index]) void hostAudioContexts[index]!.close().catch(() => {});
    hostAudioContexts[index] = null;
    hostAudioLevels = hostAudioLevels.map((item, slot) => slot === index ? 0 : item);
    hostAudioMuted = hostAudioMuted.map((item, slot) => slot === index ? false : item);
    hostAudioRoutes = hostAudioRoutes.map((item, slot) => slot === index ? (angleSlots[index].media?.hasAudio ? 'camera' : 'none') : item);
    editSequence(`disconnect ${angleSlots[index].label} microphone`, (seq) => {
      const track = findHostAudioTrack(seq, index);
      if (track) track.muted = true;
      const cameraTrack = findAngleAudioTrack(seq, index);
      if (cameraTrack) cameraTrack.muted = !angleSlots[index].media?.hasAudio;
    });
    status = `${angleSlots[index].label} microphone disconnected.`;
  }

  function setHostMicMuted(index: number, muted: boolean) {
    hostAudioStreams[index]?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    hostAudioMuted = hostAudioMuted.map((item, slot) => slot === index ? muted : item);
    editSequence(`${muted ? 'mute' : 'unmute'} ${angleSlots[index].label}`, (seq) => {
      const track = ensureHostAudioTrack(seq, index, angleSlots[index].label);
      if (track) track.muted = muted || hostAudioRoutes[index] !== 'live';
      const cameraTrack = findAngleAudioTrack(seq, index);
      if (cameraTrack) cameraTrack.muted = muted || hostAudioRoutes[index] !== 'camera';
    });
    status = `${angleSlots[index].label} microphone ${muted ? 'muted' : 'unmuted'}.`;
  }

  function setHostAudioRoute(index: number, route: 'none' | 'live' | 'camera') {
    if (route === 'live' && !hostAudioStreams[index] && !angleSlots[index].hostAudioTrack?.clips.length) {
      addToast(`Connect a microphone for ${angleSlots[index].label} first.`, 'warning');
      return;
    }
    if (route === 'camera' && !angleSlots[index].media?.hasAudio) {
      addToast(`${angleSlots[index].label} has no recorded camera audio.`, 'warning');
      return;
    }
    hostAudioRoutes = hostAudioRoutes.map((item, slot) => slot === index ? route : item);
    if (route !== 'live') hostAudioMuted = hostAudioMuted.map((item, slot) => slot === index ? false : item);
    editSequence(`route ${angleSlots[index].label} audio`, (seq) => {
      const hostTrack = ensureHostAudioTrack(seq, index, angleSlots[index].label);
      if (hostTrack) hostTrack.muted = route !== 'live' || hostAudioMuted[index];
      const cameraTrack = findAngleAudioTrack(seq, index);
      if (cameraTrack) cameraTrack.muted = route !== 'camera' || hostAudioMuted[index];
    });
    status = `${angleSlots[index].label} audio routed to ${route === 'live' ? 'live microphone' : route === 'camera' ? 'camera recording' : 'no source'}.`;
  }

  function setHostTrackControl(index: number, patch: { muted?: boolean; solo?: boolean; volume?: number }) {
    editSequence(`adjust ${angleSlots[index].label} audio`, (seq) => {
      const track = ensureHostAudioTrack(seq, index, angleSlots[index].label);
      if (track) Object.assign(track, patch);
    });
  }

  function toggleHostSolo(index: number) {
    const current = angleSlots[index].hostAudioTrack?.solo ?? false;
    editSequence(`solo ${angleSlots[index].label}`, (seq) => {
      for (let slot = 0; slot < 4; slot++) {
        const track = slot === index ? ensureHostAudioTrack(seq, slot, angleSlots[slot].label) : findHostAudioTrack(seq, slot);
        if (track) track.solo = slot === index ? !current : false;
      }
    });
  }

  function recorderMime(types: string[]) {
    return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  }

  function startPodcastRecording() {
    if (isRecording || recordingBusy) return;
    const connected = liveStreams.map((stream, index) => ({ stream, index })).filter((item) => item.stream);
    if (!connected.length) { status = 'Connect at least one live camera before recording.'; return; }
    if (typeof MediaRecorder === 'undefined') { status = 'This browser does not support local media recording.'; return; }
    try {
      captureRecorders = connected.map(({ stream, index }) => {
        const mime = recorderMime(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']);
        const recorder = new MediaRecorder(stream!, mime ? { mimeType: mime } : undefined);
        const item = { index, recorder, chunks: [] as Blob[] };
        recorder.ondataavailable = (event) => { if (event.data.size) item.chunks.push(event.data); };
        recorder.onerror = () => { status = `Recording error on ${angleSlots[index].label}. Stop the session and check the camera.`; };
        return item;
      });
      hostAudioRecorders = hostAudioStreams.map((stream, index) => ({ stream, index })).filter((item) => item.stream && hostAudioRoutes[item.index] === 'live').map(({ stream, index }) => {
        const mime = supportedRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream!, mime ? { mimeType: mime } : undefined);
        const item = { index, recorder, chunks: [] as Blob[] };
        recorder.ondataavailable = (event) => { if (event.data.size) item.chunks.push(event.data); };
        recorder.onerror = () => { status = `Recording error on ${angleSlots[index].label} microphone.`; };
        return item;
      });
      microphoneChunks = [];
      microphoneRecorder = null;
      if (microphoneStream?.getAudioTracks().length) {
        const mime = supportedRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
        microphoneRecorder = new MediaRecorder(microphoneStream, mime ? { mimeType: mime } : undefined);
        microphoneRecorder.ondataavailable = (event) => { if (event.data.size) microphoneChunks.push(event.data); };
      }
      recordingStartTime = get(playhead);
      recordingStartedAt = Date.now();
      captureRecorders.forEach((item) => item.recorder.start(250));
      hostAudioRecorders.forEach((item) => item.recorder.start(250));
      microphoneRecorder?.start(250);
      recordingElapsed = 0;
      isRecording = true;
      const hostMicCount = hostAudioRecorders.length;
      status = `Recording ${connected.length} camera angle(s) + ${hostMicCount} participant mic(s)${microphoneRecorder ? ' + room microphone' : ''}. All stems share one start time.`;
      recordingTimer = setInterval(() => { recordingElapsed = Date.now() - recordingStartedAt; }, 200);
    } catch (error) {
      captureRecorders.forEach((item) => { if (item.recorder.state !== 'inactive') item.recorder.stop(); });
      if (microphoneRecorder && microphoneRecorder.state !== 'inactive') microphoneRecorder.stop();
      captureRecorders = [];
      hostAudioRecorders.forEach((item) => { if (item.recorder.state !== 'inactive') item.recorder.stop(); });
      hostAudioRecorders = [];
      microphoneRecorder = null;
      status = error instanceof Error ? error.message : 'Could not start the recording session.';
    }
  }

  function finishRecorder(recorder: MediaRecorder, chunks: Blob[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const finish = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        resolve(blob);
      };
      recorder.addEventListener('stop', finish, { once: true });
      recorder.addEventListener('error', () => reject(new Error('A media recorder failed while finishing.')), { once: true });
      if (recorder.state === 'inactive') finish(); else recorder.stop();
    });
  }

  async function stopPodcastRecording() {
    if (!isRecording || recordingBusy) return;
    recordingBusy = true;
    isRecording = false;
    if (recordingTimer) clearInterval(recordingTimer);
    recordingTimer = null;
    status = 'Finalizing synchronized camera and microphone files…';
    try {
      const jobs = captureRecorders.map(async (item) => {
        const blob = await finishRecorder(item.recorder, item.chunks);
        if (!blob.size) return null;
        const label = angleSlots[item.index].label;
        return { index: item.index, file: recordingFile(blob, blob.type, new Date(), `podcast-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`) };
      });
      const hostAudioJobs = hostAudioRecorders.map(async (item) => {
        const blob = await finishRecorder(item.recorder, item.chunks);
        if (!blob.size) return null;
        const label = angleSlots[item.index].label;
        return { index: item.index, file: recordingFile(blob, blob.type, new Date(), `podcast-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-mic`) };
      });
      const audioJob = microphoneRecorder
        ? finishRecorder(microphoneRecorder, microphoneChunks).then((blob) => blob.size ? recordingFile(blob, blob.type, new Date(), 'podcast-room-mic') : null)
        : Promise.resolve(null);
      const [cameraFiles, hostAudioFiles, audioFile] = await Promise.all([Promise.all(jobs), Promise.all(hostAudioJobs), audioJob]);
      const completedCameraFiles = cameraFiles.filter((item): item is { index: number; file: File } => !!item);
      const completedHostAudioFiles = hostAudioFiles.filter((item): item is { index: number; file: File } => !!item);
      const files = [...completedCameraFiles.map((item) => item.file), ...completedHostAudioFiles.map((item) => item.file), ...(audioFile ? [audioFile] : [])];
      if (!files.length) throw new Error('No media data was captured. Check the connected devices and try again.');
      const imported = await importFiles(files);
      const seq = get(activeSequence);
      if (!seq) throw new Error('Open a sequence before recording. The captured files are imported into the media bin.');
      let selectedClipIds: string[] = [];
      editSequence('add synchronized podcast recordings', (draft) => {
        for (const [fileIndex, result] of completedCameraFiles.entries()) {
          const fileMedia = imported[fileIndex];
          if (!fileMedia || !fileMedia.hasVideo || fileMedia.status !== 'ready') continue;
          const label = angleSlots[result.index].label;
          const { videoTrack } = ensureAngleTracks(draft, result.index, label);
          if (!videoTrack) continue;
          const clip = createClipFromMedia(fileMedia, recordingStartTime, { kind: 'video', fps: draft.fps }).video;
          if (clip) { clip.name = `${label} · ${fileMedia.name}`; videoTrack.clips = [clip]; videoTrack.hidden = true; videoTrack.transitions = []; selectedClipIds.push(clip.id); }
        }
        for (const [hostAudioIndex, result] of completedHostAudioFiles.entries()) {
          const audioMedia = imported[completedCameraFiles.length + hostAudioIndex];
          if (!audioMedia || audioMedia.kind !== 'audio' || audioMedia.status !== 'ready') continue;
          const label = angleSlots[result.index].label;
          const clip = createClipFromMedia(audioMedia, recordingStartTime, { kind: 'audio', fps: draft.fps }).audio;
          if (!clip) continue;
          const hostTrack = ensureHostAudioTrack(draft, result.index, label);
          if (hostTrack && !hostTrack.locked) {
            hostTrack.muted = hostAudioMuted[result.index];
            clip.name = `${label} · Microphone`;
            const placed = placeClips(draft, [{ trackId: hostTrack.id, clip }], 'overwrite');
            if (placed.includes(clip.id)) selectedClipIds.push(clip.id);
          }
        }
        if (audioFile) {
          const audioMedia = imported[completedCameraFiles.length + completedHostAudioFiles.length];
          if (audioMedia) {
            const clip = createClipFromMedia(audioMedia, recordingStartTime, { kind: 'audio', fps: draft.fps }).audio;
            if (clip) {
              let audioTrack = draft.tracks.find((track) => track.kind === 'audio' && track.name.startsWith('PODCAST AUDIO · Main Mic') && !track.locked && canPlace(draft, track.id, clip.start, clip.duration));
              if (!audioTrack) {
                const micTrackCount = draft.tracks.filter((track) => track.kind === 'audio' && track.name.startsWith('PODCAST AUDIO · Main Mic')).length;
                const id = addTrack(draft, 'audio');
                audioTrack = draft.tracks.find((track) => track.id === id);
                if (audioTrack) audioTrack.name = micTrackCount ? `PODCAST AUDIO · Main Mic ${micTrackCount + 1}` : 'PODCAST AUDIO · Main Mic';
              }
              if (audioTrack) {
                audioTrack.muted = false;
                const placed = placeClips(draft, [{ trackId: audioTrack.id, clip }], 'overwrite');
                if (placed.includes(clip.id)) selectedClipIds.push(clip.id);
              }
            }
          }
        }
      });
      if (selectedClipIds.length) selection.set(selectedClipIds);
      recordingElapsed = Date.now() - recordingStartedAt;
      status = `Podcast session imported · ${completedCameraFiles.length} camera angle(s), ${completedHostAudioFiles.length} participant mic stem(s)${audioFile ? ' + room mic' : ''}. All clips are aligned at ${recordingStartTime.toFixed(2)}s.`;
      addToast('Synchronized podcast recordings added to the BrainCUT timeline.', 'success');
    } catch (error) {
      status = error instanceof Error ? error.message : 'Could not import the podcast recordings.';
    } finally {
      captureRecorders = [];
      hostAudioRecorders = [];
      microphoneRecorder = null;
      microphoneChunks = [];
      recordingBusy = false;
    }
  }

  function recordingClock(ms: number) {
    return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  }

  function onAngleDragStart(index: number, event: DragEvent) {
    event.stopPropagation();
    event.dataTransfer?.setData('application/x-braincut-angle', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }

  function onAngleDrop(index: number, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const anglePayload = event.dataTransfer?.getData('application/x-braincut-angle');
    if (anglePayload !== undefined && anglePayload !== '') {
      const from = Number(anglePayload);
      if (Number.isInteger(from)) copyAngleToSlot(from, index);
      return;
    }
    const payload = readDrag(event);
    if (payload?.kind === 'media') {
      const media = get(mediaById).get(payload.mediaIds[0]);
      if (!media || !media.hasVideo) {
        addToast('Drop a video recording onto a camera window.', 'warning');
        return;
      }
      const label = angleSlots[index].label || `Host ${index + 1}`;
      let placed = false;
      editSequence(`copy media to ${label}`, (seq) => {
        const { videoTrack, audioTrack } = ensureAngleTracks(seq, index, label);
        if (!videoTrack) return;
        const video = createClipFromMedia(media, 0, { kind: 'video', fps: seq.fps }).video;
        if (!video) return;
        video.name = `${media.name} · ${label}`;
        videoTrack.clips = [video];
        if (audioTrack) {
          const audio = createClipFromMedia(media, 0, { kind: 'audio', fps: seq.fps }).audio;
          audioTrack.clips = audio ? [audio] : [];
        }
        placed = true;
      });
      if (placed) {
        activeAngle = index;
        status = `Copied ${media.name} into ${label}. The Media bin and original clip remain intact.`;
      }
      endDrag();
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
      const hostAudioTrack = findHostAudioTrack(seq, index);
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
      if (hostAudioTrack) hostAudioTrack.name = `HOST AUDIO ${index + 1} · ${clean}`;
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

  function saveWindowLayouts() {
    try { localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(windowLayouts)); } catch { /* storage is optional */ }
  }

  function layoutStyle(layout: WindowLayout) {
    return `left:${layout.x * 100}%;top:${layout.y * 100}%;width:${layout.w * 100}%;height:${layout.h * 100}%;`;
  }

  function focusLayout(index: number): WindowLayout[] {
    const layouts: WindowLayout[] = Array.from({ length: 4 }, () => ({ x: 0.75, y: 0.03, w: 0.235, h: 0.295 }));
    layouts[index] = { x: 0.015, y: 0.03, w: 0.715, h: 0.94 };
    const others = [0, 1, 2, 3].filter((item) => item !== index);
    others.forEach((item, position) => { layouts[item] = { x: 0.75, y: 0.03 + position * 0.32, w: 0.235, h: 0.295 }; });
    return layouts;
  }

  function applyLayout(mode: Exclude<LayoutMode, 'free'>) {
    layoutMode = mode;
    if (mode === 'grid') windowLayouts = DEFAULT_LAYOUTS.map((item) => ({ ...item }));
    else if (mode === 'focus') windowLayouts = focusLayout(activeAngle);
    else if (mode === 'horizontal') windowLayouts = Array.from({ length: 4 }, (_, index) => ({ x: 0.012 + index * 0.247, y: 0.04, w: 0.235, h: 0.92 }));
    else windowLayouts = Array.from({ length: 4 }, (_, index) => ({ x: 0.02, y: 0.015 + index * 0.247, w: 0.96, h: 0.235 }));
    saveWindowLayouts();
  }

  function beginWindowGesture(index: number, mode: 'move' | 'resize', event: PointerEvent) {
    if (!stageEl) return;
    event.preventDefault();
    event.stopPropagation();
    activeAngle = index;
    windowGesture = {
      index, mode, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      origin: { ...windowLayouts[index] }
    };
    stageEl.setPointerCapture(event.pointerId);
    layoutMode = 'free';
  }

  function moveStudioWindow(event: PointerEvent) {
    const gesture = windowGesture;
    const bounds = stageEl?.getBoundingClientRect();
    if (!gesture || !bounds || gesture.pointerId !== event.pointerId) return;
    const dx = (event.clientX - gesture.startX) / Math.max(1, bounds.width);
    const dy = (event.clientY - gesture.startY) / Math.max(1, bounds.height);
    const next = { ...gesture.origin };
    if (gesture.mode === 'move') {
      next.x = Math.max(0, Math.min(1 - next.w, gesture.origin.x + dx));
      next.y = Math.max(0, Math.min(1 - next.h, gesture.origin.y + dy));
    } else {
      next.w = Math.max(0.22, Math.min(1 - next.x, gesture.origin.w + dx));
      next.h = Math.max(0.25, Math.min(1 - next.y, gesture.origin.h + dy));
    }
    windowLayouts = windowLayouts.map((item, index) => index === gesture.index ? next : item);
  }

  function endStudioGesture(event: PointerEvent) {
    if (!windowGesture || windowGesture.pointerId !== event.pointerId) return;
    windowGesture = null;
    saveWindowLayouts();
  }

  function chooseAngle(index: number) {
    activeAngle = index;
    if (layoutMode === 'focus') {
      windowLayouts = focusLayout(index);
      saveWindowLayouts();
    }
    status = `Previewing ${angleSlots[index].label}. Use TAKE to switch the finished program at the playhead.`;
  }
</script>

<section class="multicam" aria-label="Multicam production studio">
  <header class="studio-heading">
    <div class="studio-title"><span class="live-dot"></span><div><strong>Multicam production studio</strong><small>4 camera inputs · synchronized playback · live program switching</small></div></div>
    <div class="studio-clock">SYNC <b>ON</b></div>
  </header>

  <div class="production-toolbar">
    <label class="import-all">＋ Add recordings
      <input type="file" accept="video/*" multiple onchange={(event) => void importFour(event.currentTarget.files)} />
    </label>
    <div class="layout-presets" role="group" aria-label="Camera window layout">
      <button class:chosen={layoutMode === 'grid'} type="button" onclick={() => applyLayout('grid')} aria-label="Two by two layout">2×2</button>
      <button class:chosen={layoutMode === 'focus'} type="button" onclick={() => applyLayout('focus')}>Focus</button>
      <button class:chosen={layoutMode === 'horizontal'} type="button" onclick={() => applyLayout('horizontal')}>4 across</button>
      <button class:chosen={layoutMode === 'vertical'} type="button" onclick={() => applyLayout('vertical')}>Stack</button>
    </div>
    <span class="toolbar-spacer"></span>
    <button type="button" class="take-main" onclick={() => cutToAngle(activeAngle)} disabled={!angleSlots[activeAngle].media}>TAKE · {angleSlots[activeAngle].label}</button>
  </div>

  <div class="podcast-capture" aria-label="Live podcast recording controls">
    <div class="capture-title"><span class:recording={isRecording} class="capture-led"></span><strong>LIVE PODCAST CAPTURE</strong><small>{isRecording ? 'RECORDING' : 'Connect camera inputs and a microphone'}</small><b>{recordingClock(recordingElapsed)}</b></div>
    <label class="mic-select">Room / master mic
      <select aria-label="Podcast microphone" bind:value={microphoneDeviceId} disabled={isRecording || recordingBusy || !!microphoneStream}>
        <option value="">No separate microphone</option>
        {#each microphoneDevices as device (device.deviceId)}<option value={device.deviceId}>{device.label || 'Microphone input'}</option>{/each}
      </select>
    </label>
    {#if !microphoneStream && microphoneDeviceId && !isRecording}
      <button type="button" class="capture-connect" onclick={() => void connectMicrophone(microphoneDeviceId)}>Connect mic</button>
    {:else if microphoneStream && !isRecording}
      <div class="mic-level" role="meter" aria-label="Microphone input level" aria-valuemin="0" aria-valuemax="100" aria-valuenow={microphoneLevel}><span style={`width:${microphoneLevel}%`}></span></div>
      <button type="button" class="capture-disconnect" onclick={() => void connectMicrophone('')}>Disconnect mic</button>
    {/if}
    {#if isRecording}
      <button type="button" class="capture-stop" onclick={() => void stopPodcastRecording()}>■ Stop & import all angles</button>
    {:else}
      <button type="button" class="capture-record" onclick={startPodcastRecording} disabled={recordingBusy || !liveStreams.some(Boolean)}>● Record session</button>
    {/if}
    <small class="capture-note">Each connected camera records independently. The microphone is a separate editable audio stem. All recordings start together and are placed on the shared timeline clock.</small>
  </div>

  <section class="producer-desk" aria-label="Producer audio routing desk">
    <div class="desk-heading"><div><strong>PRODUCER AUDIO DESK</strong><small>Separate participant inputs · independent routing · synchronized stems</small></div><span class:recording={isRecording} class="desk-status"><i></i>{isRecording ? 'RECORDING' : 'STANDBY'}</span></div>
    <div class="host-audio-grid">
      {#each angleSlots as angle, i (i)}
        <article class="host-audio-strip" class:host-recording={isRecording && !!hostAudioStreams[i] && hostAudioRoutes[i] === 'live'}>
          <header><span class="host-led" class:hot={isRecording && !!hostAudioStreams[i] && hostAudioRoutes[i] === 'live'} class:ready={!!hostAudioStreams[i]}></span><b>{angle.label}</b><small>{isRecording && hostAudioStreams[i] && hostAudioRoutes[i] === 'live' ? 'REC · MIC' : hostAudioStreams[i] ? 'MIC READY' : angle.media?.hasAudio ? 'CAM AUDIO' : 'NO INPUT'}</small></header>
          <label class="host-source">Microphone input
            <select aria-label={`${angle.label} microphone input`} bind:value={hostAudioDeviceIds[i]} disabled={isRecording || recordingBusy || !!hostAudioStreams[i]}>
              <option value="">Choose input…</option>
              {#each microphoneDevices as device (device.deviceId)}
                <option value={device.deviceId} disabled={(microphoneStream && device.deviceId === microphoneDeviceId) || hostAudioStreams.some((stream, slot) => slot !== i && !!stream && hostAudioDeviceIds[slot] === device.deviceId)}>{device.label || 'Audio input'}</option>
              {/each}
            </select>
          </label>
          <div class="host-actions">
            {#if hostAudioStreams[i]}
              <button type="button" class="desk-button" onclick={() => void disconnectHostMicrophone(i)} disabled={isRecording || recordingBusy}>Disconnect</button>
            {:else}
              <button type="button" class="desk-button connect" onclick={() => void connectHostMicrophone(i, hostAudioDeviceIds[i])} disabled={!hostAudioDeviceIds[i] || isRecording || recordingBusy}>Connect mic</button>
            {/if}
            <button type="button" class="desk-button" class:engaged={hostAudioMuted[i]} onclick={() => setHostMicMuted(i, !hostAudioMuted[i])} aria-pressed={hostAudioMuted[i]} disabled={hostAudioRoutes[i] === 'none'}>{hostAudioMuted[i] ? 'Unmute' : 'Mute'}</button>
            <button type="button" class="desk-button solo" class:engaged={!!angle.hostAudioTrack?.solo} onclick={() => toggleHostSolo(i)} aria-pressed={!!angle.hostAudioTrack?.solo}>Solo</button>
          </div>
          <label class="host-route">Route
            <select aria-label={`${angle.label} audio route`} value={hostAudioRoutes[i]} onchange={(event) => setHostAudioRoute(i, event.currentTarget.value as 'none' | 'live' | 'camera')}>
              <option value="none">Off</option>
              <option value="live" disabled={!hostAudioStreams[i] && !angle.hostAudioTrack?.clips.length}>Dedicated host mic</option>
              <option value="camera" disabled={!angle.media?.hasAudio}>Camera recording audio</option>
            </select>
          </label>
          <div class="host-meter-row"><span>LEVEL</span><div class="host-meter" role="meter" aria-label={`${angle.label} microphone level`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={hostAudioLevels[i]}><i style={`width:${hostAudioLevels[i]}%`}></i></div><b>{hostAudioLevels[i]}%</b></div>
          <label class="host-gain">TIMELINE GAIN <input type="range" min="-60" max="12" step="1" value={angle.hostAudioTrack?.volume ?? 0} aria-label={`${angle.label} audio gain`} disabled={!angle.hostAudioTrack} oninput={(event) => { const target = event.currentTarget; target.dataset.pending = target.value; }} onchange={(event) => setHostTrackControl(i, { volume: Number(event.currentTarget.value) })} /><output>{(angle.hostAudioTrack?.volume ?? 0) > 0 ? '+' : ''}{(angle.hostAudioTrack?.volume ?? 0)} dB</output></label>
        </article>
      {/each}
    </div>
    <small class="desk-footnote">Each host microphone records to its own editable audio track. Mute affects the live input and timeline stem; Solo isolates that participant during timeline playback. Choose Camera recording audio to use the embedded mic instead.</small>
  </section>

  <div class="studio-stage" role="group" aria-label="Movable and resizable camera windows" bind:this={stageEl} onpointermove={moveStudioWindow} onpointerup={endStudioGesture} onpointercancel={endStudioGesture}>
    <div class="stage-watermark" aria-hidden="true">MULTICAM · FOUR INPUTS</div>
    {#each angleSlots as angle, i (i)}
      <article
        class="angle-card"
        class:active={activeAngle === i}
        class:empty-drop={!angle.media}
        style={layoutStyle(windowLayouts[i])}
        ondragover={(event) => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; }}
        ondrop={(event) => onAngleDrop(i, event)}>
        <header class="window-bar">
          <button type="button" class="drag-handle" aria-label={`Move ${angle.label} window`} title="Drag to move window" onpointerdown={(event) => beginWindowGesture(i, 'move', event)}>⠿</button>
          <span class="camera-index">CAM 0{i + 1}</span>
          <input class="host-label" aria-label={`Camera ${i + 1} host label`} value={angle.label} maxlength="32" onchange={(event) => renameAngle(i, event.currentTarget.value)} />
          <button type="button" class="preview-select" class:selected={activeAngle === i} onclick={() => chooseAngle(i)}>{activeAngle === i ? 'SELECTED' : 'PREVIEW'}</button>
        </header>

        <div class="angle-video">
          {#if liveStreams[i]}
            <video bind:this={liveVideoEls[i]} autoplay muted playsinline class="live-preview"></video>
            <span class="source-chip">LIVE INPUT · {angle.media?.name ?? 'CAMERA'}</span>
          {:else if angle.media}
            <video bind:this={videoEls[i]} muted playsinline preload="metadata" draggable={!!angle.media} ondragstart={(event) => onAngleDragStart(i, event)}></video>
            <span class="source-chip">{angle.media.hasAudio ? 'VIDEO + AUDIO' : 'VIDEO ONLY'}</span>
          {:else}
            <div class="empty-angle">
              <span class="empty-camera">＋</span>
              <b>{DEFAULT_LABELS[i]}</b>
              <small>Drop a recording here or browse</small>
              <label class="browse-camera">Add video<input type="file" accept="video/*" onchange={(event) => { void assignAngle(i, event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ''; }} /></label>
            </div>
          {/if}
          <span class="angle-number">ANGLE 0{i + 1}</span>
          {#if liveStreams[i]}<span class="camera-rec-indicator" class:recording={isRecording}>{isRecording ? '● REC' : '● LIVE'}</span>{/if}
          {#if angle.media && activeAngle === i}<span class="program-indicator"><span></span> SELECTED ANGLE</span>{/if}
        </div>

        <div class="window-controls">
          <div class="window-primary-actions">
            <select aria-label={`Live camera input for ${angle.label}`} bind:value={cameraDeviceIds[i]} disabled={isRecording || recordingBusy || !!liveStreams[i]} onchange={(event) => void connectLiveCamera(i, event.currentTarget.value)}>
              <option value="">{liveStreams[i] ? 'Camera connected' : 'Connect live camera…'}</option>
              {#each cameraDevices as device (device.deviceId)}<option value={device.deviceId} disabled={liveStreams.some((stream, slot) => slot !== i && !!stream && stream.getVideoTracks()[0]?.getSettings().deviceId === device.deviceId)}>{device.label || 'Camera input'}</option>{/each}
            </select>
            {#if liveStreams[i] && !isRecording}<button type="button" class="capture-disconnect" onclick={() => void disconnectLiveCamera(i)}>Disconnect</button>{/if}
            {#if angle.media}
              <label class="replace-angle">Replace<input type="file" accept="video/*" onchange={(event) => { void assignAngle(i, event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ''; }} /></label>
              <select aria-label={`Copy ${angle.label} to another angle`} onchange={(event) => { const target = Number(event.currentTarget.value); if (Number.isInteger(target)) copyAngleToSlot(i, target); event.currentTarget.value = ''; }}>
                <option value="">Duplicate to…</option>
                {#each angleSlots as target, targetIndex}
                  {#if targetIndex !== i}<option value={targetIndex}>Cam 0{targetIndex + 1} · {target.label}</option>{/if}
                {/each}
              </select>
              <button type="button" class="take-button" onclick={() => cutToAngle(i)}>TAKE</button>
            {:else}
              <span class="awaiting-media">Awaiting camera input</span>
            {/if}
            <button type="button" class="window-size-button" aria-label={`Focus ${angle.label}`} title="Focus this camera" onclick={() => { activeAngle = i; applyLayout('focus'); }}>↗</button>
          </div>
          {#if angle.media}
            <details class="angle-settings">
              <summary>Camera settings</summary>
              <div class="settings-row">
                <label class="offset">Sync offset <input type="number" min={-angle.media.duration} max={angle.media.duration} step="0.01" value={angle.offset} onchange={(event) => setOffset(i, event.currentTarget.value)} /> sec</label>
                <span>{!angle.media.hasAudio ? 'No camera audio' : angle.audioTrack?.muted === false ? '● Active mic' : 'Audio muted'}</span>
              </div>
            </details>
          {/if}
        </div>
        <button type="button" class="resize-handle" aria-label={`Resize ${angle.label} window`} title="Drag to resize" onpointerdown={(event) => beginWindowGesture(i, 'resize', event)}><span></span></button>
      </article>
    {/each}
  </div>

  <div class="studio-footer">
    <div class="studio-workflow"><b>PRODUCTION FLOW</b><span>1 · Load cameras</span><span>2 · Sync angles</span><span>3 · Choose mic</span><span>4 · TAKE to program</span></div>
    <div class="multicam-help"><strong>Arrange your studio</strong><small>Drag each window by its ⠿ handle. Resize from the lower-right corner. Choose Focus for one large camera and three side previews. Your custom arrangement is saved on this device.</small></div>
  </div>
  <footer aria-live="polite">{#if loading}<span class="spinner"></span>{/if}{status}</footer>
</section>

<style>
  .multicam{height:100%;min-height:0;min-width:0;overflow:auto;padding:12px;box-sizing:border-box;display:flex;flex-direction:column;gap:9px;background:var(--bg-surface);color:var(--text-primary);font-family:var(--font-editor)}
  .studio-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:none}
  .studio-title{display:flex;align-items:center;gap:9px;min-width:0}.studio-title strong{display:block;font-size:15px;letter-spacing:-.02em}.studio-title small{display:block;margin-top:3px;color:var(--text-muted);font-size:10px}
  .live-dot{width:9px;height:9px;border-radius:50%;background:#34d399;box-shadow:0 0 0 4px #34d39922;flex:none}.studio-clock{font-size:9px;letter-spacing:.1em;color:var(--text-muted);font-weight:800}.studio-clock b{color:#34d399;margin-left:4px}
  .production-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;flex:none}
  .podcast-capture{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid #344258;border-radius:6px;background:linear-gradient(110deg,#152236,#101a29);color:#e7eef8;flex:none}
  .capture-title{display:flex;align-items:center;gap:7px;margin-right:auto}.capture-title strong{font-size:9px;letter-spacing:.1em}.capture-title small{font-size:8px;color:#91a4bd}.capture-title b{font:700 12px var(--font-editor);font-variant-numeric:tabular-nums}
  .capture-led{width:7px;height:7px;border-radius:50%;background:#64748b}.capture-led.recording{background:#ef4444;box-shadow:0 0 0 4px #ef444433}
  .mic-select{display:flex;align-items:center;gap:6px;color:#aebdd0;font-size:8px}.mic-select select,.window-primary-actions>select[aria-label^="Live camera"]{max-width:150px;min-width:100px;border:1px solid #3c4d65;border-radius:4px;padding:5px;background:#172438;color:#d5e0ed;font-size:8px}
  .capture-connect,.capture-disconnect,.capture-record,.capture-stop{border:1px solid #40516b;border-radius:4px;padding:6px 9px;background:#1d3550;color:#e5effb;font-size:8px;font-weight:800;cursor:pointer}.capture-record{background:#b8323b;border-color:#b8323b;color:white}.capture-stop{background:#7f1d1d;border-color:#7f1d1d;color:white}.capture-note{flex-basis:100%;color:#91a4bd;font-size:8px;line-height:1.35}.capture-record:disabled{opacity:.4;cursor:not-allowed}
  .angle-video video.live-preview{object-fit:cover}
  .import-all,.take-main,.layout-presets button{border:1px solid var(--border);border-radius:5px;background:var(--bg-elevated);color:var(--text-primary);padding:7px 9px;font-size:9px;cursor:pointer;white-space:nowrap}
  .import-all{background:var(--accent);color:white;border-color:var(--accent);font-weight:800}.import-all input,.replace-angle input,.browse-camera input{display:none}
  .layout-presets{display:flex;gap:3px;padding:3px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated)}.layout-presets button{padding:5px 8px;border:0;background:transparent;color:var(--text-muted)}.layout-presets button.chosen{background:var(--accent);color:white}
  .toolbar-spacer{flex:1}.take-main:disabled{opacity:.4;cursor:not-allowed}.take-main{background:#dc3654;color:white;border-color:#dc3654;font-weight:900;letter-spacing:.04em}
  .producer-desk{flex:none;padding:9px 10px;border:1px solid #344258;border-radius:8px;background:linear-gradient(135deg,#111d2e,#0b1421);color:#e7eef8;display:flex;flex-direction:column;gap:8px}
  .desk-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.desk-heading>div{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}.desk-heading strong{font-size:9px;letter-spacing:.12em}.desk-heading small{font-size:8px;color:#91a4bd}.desk-status{display:flex;align-items:center;gap:5px;font-size:7px;font-weight:900;letter-spacing:.1em;color:#9aacc2}.desk-status i,.host-led{display:inline-block;width:7px;height:7px;border-radius:50%;background:#64748b}.desk-status.recording i,.host-led.hot{background:#ef4444;box-shadow:0 0 0 3px #ef444433;animation:desk-pulse 1.2s infinite}.host-led.ready{background:#34d399;box-shadow:0 0 0 3px #34d39922}
  .host-audio-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.host-audio-strip{min-width:0;padding:8px;border:1px solid #34465f;border-radius:6px;background:#142238;display:flex;flex-direction:column;gap:7px}.host-audio-strip.host-recording{border-color:#b83a4a;box-shadow:inset 0 0 0 1px #b83a4a55}.host-audio-strip header{display:flex;align-items:center;gap:6px}.host-audio-strip header b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:#f1f5fb}.host-audio-strip header small{margin-left:auto;font-size:6px;font-weight:900;letter-spacing:.05em;color:#91a4bd;white-space:nowrap}
  .host-source,.host-route{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:7px;color:#9eb0c6}.host-source select,.host-route select{min-width:0;max-width:70%;border:1px solid #40516b;border-radius:3px;padding:4px;background:#0d192a;color:#dbe6f4;font-size:7px}.host-actions{display:flex;gap:4px}.desk-button{flex:1;min-width:0;border:1px solid #40516b;border-radius:3px;padding:5px 4px;background:#20334c;color:#dce8f6;font-size:7px;font-weight:800;cursor:pointer}.desk-button.connect{background:#1c5a4a;border-color:#287c65}.desk-button.solo{flex:0 0 42px}.desk-button.engaged{background:#9a303d;border-color:#c04452;color:white}.desk-button:disabled{opacity:.35;cursor:not-allowed}
  .host-meter-row{display:flex;align-items:center;gap:6px;color:#8ea3bd;font-size:6px;font-weight:900;letter-spacing:.06em}.host-meter{height:6px;flex:1;overflow:hidden;border-radius:99px;background:#26374d}.host-meter i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#34d399 0 65%,#fbbf24 80%,#ef4444);transition:width .08s}.host-meter-row b{width:25px;text-align:right;color:#c7d5e6;font-size:7px;font-variant-numeric:tabular-nums}
  .host-gain{display:flex;align-items:center;gap:6px;color:#91a4bd;font-size:6px;font-weight:900;letter-spacing:.08em}.host-gain input{min-width:0;flex:1;height:12px;accent-color:#5b9bd5}.host-gain output{width:32px;text-align:right;color:#e2ebf6;font-size:7px;font-variant-numeric:tabular-nums}.desk-footnote{font-size:7px;line-height:1.35;color:#8195ae}
  @keyframes desk-pulse{50%{box-shadow:0 0 0 5px #ef444411}}
  .studio-stage{position:relative;isolation:isolate;flex:1;min-height:410px;overflow:hidden;border:1px solid var(--border);border-radius:9px;background:radial-gradient(ellipse at 50% 0%,#1c2c4422,transparent 65%),#080d16;touch-action:none}
  .stage-watermark{position:absolute;right:10px;bottom:7px;color:#8da1ba22;font-size:9px;letter-spacing:.18em;font-weight:900;pointer-events:none}
  .angle-card{position:absolute;z-index:2;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border:1px solid #344258;border-radius:7px;background:#111a28;box-shadow:0 8px 24px #0005;transition:border-color .12s,box-shadow .12s}
  .angle-card.active{z-index:3;border-color:#e34b68;box-shadow:0 0 0 1px #e34b68,0 10px 28px #0008}.angle-card.empty-drop{border-style:dashed;border-color:#475569}.angle-card:focus-within{outline:1px solid var(--accent);outline-offset:1px}
  .window-bar{height:32px;min-height:32px;display:flex;align-items:center;gap:6px;padding:0 6px;background:#182438;border-bottom:1px solid #344258;touch-action:pan-y}
  .drag-handle{width:20px;height:23px;display:grid;place-items:center;border:0;border-radius:3px;background:transparent;color:#9fb1c9;font-size:18px;cursor:grab;touch-action:none}.drag-handle:active{cursor:grabbing}
  .camera-index{font-size:8px;color:#8fa4bf;font-weight:900;letter-spacing:.08em;white-space:nowrap}.host-label{min-width:0;flex:1;border:1px solid transparent;border-radius:3px;background:transparent;color:#f4f7fb;padding:4px 5px;font-size:10px;font-weight:800}.host-label:focus{outline:1px solid var(--accent);background:#0d1726}
  .preview-select{border:1px solid #40516b;border-radius:3px;padding:4px 6px;background:#24334a;color:#c5d2e2;font-size:7px;font-weight:900;letter-spacing:.05em;white-space:nowrap}.preview-select.selected{background:#dc3654;border-color:#dc3654;color:white}
  .angle-video{position:relative;flex:1;min-height:0;overflow:hidden;background:#03070d;display:grid;place-items:center}.angle-video video{width:100%;height:100%;object-fit:contain;display:block;background:#03070d}
  .angle-number{position:absolute;left:7px;top:7px;background:#050a12cc;color:#e6edf7;padding:4px 6px;border-radius:3px;font-size:8px;font-weight:900;letter-spacing:.08em;pointer-events:none}
  .source-chip{position:absolute;right:7px;top:7px;background:#050a12bb;color:#b9c9dc;padding:4px 6px;border-radius:3px;font-size:7px;font-weight:800;pointer-events:none}
  .camera-rec-indicator{position:absolute;right:7px;bottom:7px;padding:4px 6px;border-radius:3px;background:#14532dcc;color:#bbf7d0;font-size:7px;font-weight:900;letter-spacing:.08em}.camera-rec-indicator.recording{background:#991b1bcc;color:#fff;animation:desk-pulse 1.2s infinite}
  .program-indicator{position:absolute;left:7px;bottom:7px;display:flex;align-items:center;gap:5px;padding:4px 7px;border-radius:3px;background:#b52642e8;color:white;font-size:7px;font-weight:900;letter-spacing:.08em}.program-indicator span{width:6px;height:6px;border-radius:50%;background:white}
  .empty-angle{width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#94a3b8;gap:5px}.empty-camera{font-size:28px;color:#6f8db5}.empty-angle b{font-size:12px;color:#dce6f4}.empty-angle small{font-size:8px}
  .browse-camera,.replace-angle{border:1px solid #52647c;border-radius:4px;padding:5px 8px;color:#e4edf9;background:#1c2b40;font-size:8px;font-weight:800;cursor:pointer}
  .window-controls{flex:none;display:flex;flex-direction:column;gap:4px;padding:5px 6px;background:#111a28;border-top:1px solid #2d3a4d}
  .window-primary-actions{display:flex;align-items:center;gap:5px;min-height:22px}.window-primary-actions select{min-width:0;max-width:145px;flex:1;border:1px solid #3c4d65;border-radius:4px;padding:4px 5px;background:#172438;color:#cbd7e6;font-size:8px}
  .replace-angle{padding:4px 7px}.take-button{margin-left:auto;border:1px solid #dc3654;border-radius:4px;background:#dc3654;color:white;padding:5px 11px;font-size:8px;font-weight:900;letter-spacing:.08em;cursor:pointer}
  .window-size-button{border:1px solid #3c4d65;border-radius:4px;background:#172438;color:#c5d2e2;padding:4px 7px;font-size:11px;cursor:pointer}.awaiting-media{font-size:8px;color:#8192a8}
  .angle-settings{font-size:8px;color:#aebdd0}.angle-settings summary{cursor:pointer;user-select:none}.settings-row{display:flex;justify-content:space-between;align-items:center;gap:6px;padding-top:5px;color:#95a7bf}.offset{display:flex;align-items:center;gap:5px}.offset input{width:55px;border:1px solid #40516b;border-radius:3px;background:#0b1421;color:#f0f5fb;padding:3px;font-size:8px}
  .resize-handle{position:absolute;right:0;bottom:0;width:19px;height:19px;border:0;background:linear-gradient(135deg,transparent 48%,#7e91aa 49%,#7e91aa 55%,transparent 56%,transparent 67%,#7e91aa 68%,#7e91aa 74%,transparent 75%);cursor:nwse-resize;touch-action:none;z-index:5}.resize-handle span{position:absolute;inset:0}
  .studio-footer{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:8px;flex:none}.studio-workflow,.multicam-help{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid var(--border);border-radius:5px;background:var(--bg-elevated);font-size:8px;color:var(--text-muted)}.studio-workflow b{color:#d6e1ef;font-size:7px;letter-spacing:.1em}.studio-workflow span{white-space:nowrap}.multicam-help{display:flex;align-items:flex-start;flex-direction:column;gap:3px}.multicam-help strong{color:var(--text-primary);font-size:9px}.multicam-help small{line-height:1.35}
  footer{min-height:24px;padding:6px 8px;border-radius:4px;background:var(--bg-elevated);font-size:9px;color:var(--text-muted);line-height:1.4;flex:none}.spinner{display:inline-block;width:8px;height:8px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;margin-right:7px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:1100px){.host-audio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:900px){.studio-footer{grid-template-columns:1fr}.studio-stage{min-height:480px}.layout-presets button{padding:5px 6px}}
  @media(max-width:600px){.multicam{padding:8px}.studio-stage{min-height:620px}.angle-card{min-width:0}.studio-title strong{font-size:12px}.studio-title small{font-size:8px}.production-toolbar{gap:4px}.layout-presets button{font-size:8px;padding:5px 4px}.podcast-capture{gap:6px}.capture-title{flex-basis:100%}.mic-select{flex:1}.mic-select select{max-width:100%;min-width:0;flex:1}.host-audio-grid{grid-template-columns:1fr}.host-audio-strip{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}.host-audio-strip header{grid-column:1/-1}.host-actions{grid-column:1/-1}.host-meter-row,.host-gain{grid-column:1/-1}}
</style>
