<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { get } from 'svelte/store';
  import { recordingFile } from '$lib/media/recording';
  import { importFiles } from '$lib/media/import';
  import { createClipFromMedia } from '$lib/project/defaults';
  import { addTrack, canPlace, placeClips } from '$lib/project/ops';
  import { activeSequence, editSequence } from '$lib/project/store';
  import { addToast, playhead, selection } from '$lib/stores/app';
  import { wakeGuestSignal } from '$lib/guestSignal';
  import type { Sequence, Track, TrackKind } from '$lib/project/types';

  type Source = { id: string; name: string; deviceId: string; stream: MediaStream; video: HTMLVideoElement; audioEnabled: boolean };
  let cameras = $state<MediaDeviceInfo[]>([]);
  let slots = $state.raw<Source[]>([]);
  let selected = $state('');
  let layout = $state<'single'|'split'|'pip'|'quad'>('single');
  let title = $state('');
  let subtitle = $state('');
  let screen = $state<Source | null>(null);
  let canvas: HTMLCanvasElement;
  let connected = $state(false);
  let recording = $state(false);
  let seconds = $state(0);
  let status = $state('Connect up to four cameras, then choose a program view.');
  let frame = 0;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let startedAt = 0;
  type AudioMix = { context: AudioContext; stream: MediaStream; nodes: MediaStreamAudioSourceNode[]; gains: Map<string, GainNode> };
  let recordingAudioMix: AudioMix | null = null;
  let broadcastAudioMix: AudioMix | null = null;
  type GuestStem = { recorder: MediaRecorder; chunks: Blob[]; output: MediaStream; mix: AudioMix; name: string };
  let guestStems = new Map<string, GuestStem>();
  let disposed = false;
  let whipEndpoint = $state('');
  let whipToken = $state('');
  let broadcasting = $state(false);
  let broadcastStatus = $state('Not connected');
  let peer: RTCPeerConnection | null = null;
  let whipSessionUrl = '';
  let broadcastStream: MediaStream | null = null;
  let broadcastStartedAt = 0;
  let bitrateKbps = $state(0);
  let streamFps = $state(0);
  let latencyMs = $state(0);
  let statsTimer: ReturnType<typeof setInterval> | null = null;
  let previousOutbound: { bytes: number; timestamp: number; frames: number } | null = null;
  type Guest = { id: string; name: string; status: string; audioEnabled: boolean; videoEnabled: boolean; quality: string };
  let guestPeers = new Map<string, RTCPeerConnection>();
  const guestSourcePending = new Set<string>();
  let guests = $state<Guest[]>([]);
  let roomSocket = $state<WebSocket | null>(null);
  let roomCode = $state('');
  let guestToken = $state('');
  let roomStatus = $state('No production room open');
  let roomBusy = $state(false);
  let roomIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

  async function refresh() {
    try { cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); }
    catch { status = 'Could not list cameras. Check browser permissions.'; }
  }
  onMount(() => { void refresh(); navigator.mediaDevices?.addEventListener?.('devicechange', refresh); });
  function release(source: Source) { source.stream.getTracks().forEach((t) => t.stop()); }
  function releaseAudio(mix: AudioMix | null) {
    if (!mix) return; mix.nodes.forEach((n) => { try { n.disconnect(); } catch {} });
    mix.gains.forEach((g) => { try { g.disconnect(); } catch {} });
    mix.stream.getTracks().forEach((t) => t.stop()); void mix.context.close().catch(() => {});
  }
  function teardown() {
    cancelAnimationFrame(frame); slots.forEach(release); slots = [];
    if (screen) release(screen); screen = null; releaseAudio(recordingAudioMix); releaseAudio(broadcastAudioMix); recordingAudioMix = null; broadcastAudioMix = null; connected = false;
  }
  onDestroy(() => {
    disposed = true; if (timer) clearInterval(timer);
    stopBroadcast(false); closeRoom();
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    teardown(); navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
  });

  async function addCamera(deviceId: string) {
    if (!deviceId || slots.length >= 4 || slots.some((s) => s.deviceId === deviceId)) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: true });
      const video = document.createElement('video'); video.srcObject = stream; video.muted = true; video.playsInline = true; await video.play();
      const device = cameras.find((d) => d.deviceId === deviceId);
      const source = { id: `cam-${deviceId}`, name: device?.label || `Camera ${slots.length + 1}`, deviceId, stream, video, audioEnabled: true };
      slots = [...slots, source]; if (!selected) selected = source.id;
      connected = true; status = `${slots.length} camera source${slots.length === 1 ? '' : 's'} connected.`; startPreview();
    } catch (e) { status = e instanceof Error ? e.message : 'Could not connect camera.'; }
  }
  async function addScreen() {
    if (!navigator.mediaDevices?.getDisplayMedia || screen) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30 } }, audio: true });
      const video = document.createElement('video'); video.srcObject = stream; video.muted = true; video.playsInline = true; await video.play();
      screen = { id: 'screen', name: 'Screen share', deviceId: '', stream, video, audioEnabled: true };
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (screen) { release(screen); screen = null; status = 'Screen sharing stopped.'; } });
      connected = true; status = 'Screen share connected.'; startPreview();
    } catch (e) { status = e instanceof Error ? e.message : 'Screen sharing was cancelled.'; }
  }
  function allSources() { return [...slots, ...(screen ? [screen] : [])]; }
  function startPreview() { if (!canvas) return; cancelAnimationFrame(frame); const draw = () => { renderFrame(); frame = requestAnimationFrame(draw); }; draw(); }
  function drawFit(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, x: number, y: number, w: number, h: number) {
    if (video.readyState < 2 || !video.videoWidth) return;
    const scale = Math.max(w / video.videoWidth, h / video.videoHeight); const sw = w / scale, sh = h / scale;
    ctx.drawImage(video, (video.videoWidth-sw)/2, (video.videoHeight-sh)/2, sw, sh, x, y, w, h);
  }
  function renderFrame() {
    if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height; ctx.fillStyle = '#080b11'; ctx.fillRect(0,0,w,h);
    const sources = allSources(); const primary = sources.find((s) => s.id === selected) ?? sources[0];
    if (layout === 'split' && sources.length > 1) {
      const secondary = sources.find((s) => s.id !== primary?.id);
      if (primary) drawFit(ctx, primary.video, 0,0,w/2,h);
      if (secondary) drawFit(ctx,secondary.video,w/2,0,w/2,h);
      ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
    } else if (layout === 'quad') {
      sources.slice(0,4).forEach((s,i)=>{const x=(i%2)*w/2,y=Math.floor(i/2)*h/2;drawFit(ctx,s.video,x,y,w/2,h/2);ctx.strokeStyle='#111827';ctx.lineWidth=3;ctx.strokeRect(x,y,w/2,h/2);});
    } else {
      if (primary) drawFit(ctx, primary.video, 0,0,w,h);
      if (layout === 'pip' && sources.length > 1) {
        const secondary = sources.find((s) => s.id !== primary?.id); if (secondary) { const pw=w*.32,ph=h*.32;ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=24;drawFit(ctx,secondary.video,w-pw-34,34,pw,ph);ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.strokeRect(w-pw-34,34,pw,ph);ctx.restore(); }
      }
    }
    if (title || subtitle) { const boxH=subtitle?112:76;ctx.fillStyle='rgba(5,9,18,.78)';ctx.fillRect(0,h-boxH,w,boxH);ctx.fillStyle='#fff';ctx.font='600 40px Inter, sans-serif';ctx.fillText(title,48,h-boxH+48,w-96);if(subtitle){ctx.fillStyle='#cbd5e1';ctx.font='26px Inter, sans-serif';ctx.fillText(subtitle,48,h-22,w-96);} }
  }
  async function captureSourceAudio(source: Source): Promise<AudioMix | null> {
    if (!source.audioEnabled || !source.stream.getAudioTracks().length) return null;
    const context = new AudioContext(); const destination = context.createMediaStreamDestination();
    const node = context.createMediaStreamSource(new MediaStream(source.stream.getAudioTracks())); const gain = context.createGain();
    gain.gain.value = 1; node.connect(gain); gain.connect(destination); await context.resume();
    return { context, stream: destination.stream, nodes: [node], gains: new Map([[source.id, gain]]) };
  }
  async function captureAudio(): Promise<AudioMix | null> {
    const streams = allSources().filter((s)=>s.audioEnabled && s.stream.getAudioTracks().length);
    if (!streams.length) return null;
    const context = new AudioContext(); const destination = context.createMediaStreamDestination();
    const mix: AudioMix = { context, stream: destination.stream, nodes: [], gains: new Map() };
    for (const source of streams) { const node=context.createMediaStreamSource(source.stream);const gain=context.createGain();gain.gain.value=1;node.connect(gain);gain.connect(destination);mix.nodes.push(node);mix.gains.set(source.id,gain); }
    await context.resume(); return mix;
  }
  function freeTrack(seq: Sequence, kind: TrackKind, start: number, duration: number): Track | undefined {
    const available=seq.tracks.filter(t=>t.kind===kind&&!t.locked);const found=available.find(t=>canPlace(seq,t.id,start,duration));if(found)return found;
    const id=addTrack(seq,kind);return seq.tracks.find(t=>t.id===id);
  }
  async function importGuestStem(file: File) {
    const imported = await importFiles([file]); const media = imported.find(m => m.kind === 'audio' && m.status === 'ready');
    if (!media) throw new Error(`Guest audio stem ${file.name} could not be decoded.`);
    const seq = get(activeSequence); if (!seq) throw new Error('Open a sequence before recording.');
    const start = get(playhead); const pair = createClipFromMedia(media, start, { fps: seq.fps }); if (!pair.audio) throw new Error('No audio stream found in guest stem.');
    let audioTrackId: string | null = null;
    editSequence('record guest audio stem', draft => { const track = freeTrack(draft, 'audio', start, pair.audio!.duration); if (!track) return; const placed = placeClips(draft, [{ trackId: track.id, clip: pair.audio! }], 'overwrite'); if (placed.includes(pair.audio!.id)) audioTrackId = track.id; });
    if (!audioTrackId) throw new Error(`No unlocked audio track available for ${file.name}.`);
    selection.set([pair.audio.id]);
  }
  async function importProgram(file: File) {
    const imported=await importFiles([file]);const media=imported.find(m=>m.kind==='video'&&m.status==='ready'&&m.hasVideo);
    if(!media)throw new Error('The program recording could not be decoded.');const seq=get(activeSequence);if(!seq)throw new Error('Open a sequence before recording.');
    const start=get(playhead);const pair=createClipFromMedia(media,start,{fps:seq.fps});if(!pair.video)throw new Error('No video stream found in the recording.');
    let vId:string|null=null,aId:string|null=null;
    editSequence('record multicamera program',(draft)=>{const v=freeTrack(draft,'video',start,pair.video!.duration);if(!v)return;const placements=[{trackId:v.id,clip:pair.video!}];if(pair.audio){const a=freeTrack(draft,'audio',start,pair.audio.duration);if(a){placements.push({trackId:a.id,clip:pair.audio});aId=a.id;}}const placed=placeClips(draft,placements,'overwrite');if(placed.includes(pair.video!.id))vId=v.id;});
    if(!vId)throw new Error('No unlocked video track available.');selection.set([pair.video.id,...(pair.audio&&aId?[pair.audio.id]:[])]);addToast('Multicamera program recording added to timeline.','success');
  }

  function waitForIce(pc: RTCPeerConnection, timeoutMs = 12000): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timeout); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
      const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
      const timeout = setTimeout(() => { if (done) return; done = true; pc.removeEventListener('icegatheringstatechange', check); reject(new Error('ICE candidate gathering timed out. Check network access and TURN/STUN configuration.')); }, timeoutMs);
      pc.addEventListener('icegatheringstatechange', check);
    });
  }
  const guestSignalBase = (import.meta.env.VITE_GUEST_SIGNAL_URL || '').replace(/\/$/, '');
  function roomSocketUrl() { if (guestSignalBase) return `${guestSignalBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')}/ws`; const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'; return `${protocol}//${location.host}/guest-signal/ws`; }
  async function createProductionRoom() {
    if (roomBusy || roomSocket) return; roomBusy = true; roomStatus = 'Creating private production room…';
    try {
      const healthUrl = guestSignalBase ? `${guestSignalBase}/health` : `${location.origin}/guest-signal/health`;
      await wakeGuestSignal(healthUrl, {
        onWaiting: () => { roomStatus = 'Waking the guest-room service. If it has been idle, this can take about a minute…'; },
      });
      roomStatus = 'Guest-room service ready · creating private room…';
      const response = await fetch(`${guestSignalBase}/api/guest-rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not create room.');
      const room = await response.json(); roomCode = room.roomCode;
      const socket = new WebSocket(`${roomSocketUrl()}?room=${encodeURIComponent(room.roomCode)}&role=host&token=${encodeURIComponent(room.hostToken)}`); roomSocket = socket;
      socket.onopen = () => { roomStatus = 'Room signaling connected · waiting for host authorization'; if (guestStatsTimer) clearInterval(guestStatsTimer); guestStatsTimer = setInterval(() => void refreshGuestQuality(), 3000); };
      socket.onmessage = (event) => { const message = JSON.parse(event.data);
        if (message.type === 'host-ready') { roomIceServers = message.iceServers ?? roomIceServers; roomStatus = 'Room open · share guest invitation'; socket.send(JSON.stringify({ type: 'invite-guests' })); }
        else if (message.type === 'guest-invite') { guestToken = message.guestToken; roomStatus = 'Room open · invitation ready'; }
        else if (message.type === 'guest-joined') { void connectRoomGuest(message.guestId); }
        else if (message.type === 'answer') { const pc = guestPeers.get(message.guestId); if (pc) void pc.setRemoteDescription({ type: 'answer', sdp: message.sdp }).then(() => updateGuest(message.guestId, { status: 'Connected' })).catch(() => updateGuest(message.guestId, { status: 'Answer rejected' })); }
        else if (message.type === 'guest-left') { removeRoomGuest(message.guestId); }
        else if (message.type === 'guest-status') { const label = message.status.replaceAll('-', ' '); updateGuest(message.guestId, { status: label }); }
        else if (message.type === 'error') roomStatus = message.message;
        else if (message.type === 'room-closed') { roomStatus = 'Room closed'; closeRoom(false); }
      };
      socket.onerror = () => { roomStatus = 'Room signaling connection failed. Check the local signaling service.'; };
      socket.onclose = () => { if (roomSocket === socket) { roomSocket = null; if (!disposed) roomStatus = 'Room signaling disconnected'; } };
    } catch (e) { roomStatus = e instanceof Error ? e.message : 'Could not create production room.'; roomCode = ''; }
    finally { roomBusy = false; }
  }
  async function connectRoomGuest(guestId: string) {
    if (!roomSocket || guestPeers.has(guestId)) return;
    const pc = new RTCPeerConnection({ iceServers: roomIceServers, bundlePolicy: 'max-bundle' }); guestPeers.set(guestId, pc);
    guests = [...guests, { id: guestId, name: `Guest ${guests.length + 1}`, status: 'Negotiating', audioEnabled: true, videoEnabled: true, quality: 'Measuring…' }];
    pc.addTransceiver('video', { direction: 'recvonly' }); pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = (event) => { const stream = event.streams[0] ?? new MediaStream([event.track]); if (!stream.getVideoTracks().length || slots.some(source => source.id === `guest-${guestId}`) || guestSourcePending.has(guestId)) return; guestSourcePending.add(guestId);
      const video = document.createElement('video'); video.srcObject = stream; video.muted = true; video.playsInline = true;
      void video.play().then(() => { if (disposed || guestPeers.get(guestId) !== pc) return; const source: Source = { id: `guest-${guestId}`, name: guests.find(g=>g.id===guestId)?.name ?? 'Participant', deviceId: '', stream, video, audioEnabled: true }; slots = [...slots, source]; if (!selected) selected = source.id; connected = true; guestSourcePending.delete(guestId); startPreview(); updateGuest(guestId, { status: 'Live' }); }).catch(() => { guestSourcePending.delete(guestId); updateGuest(guestId, { status: 'Video playback blocked' }); });
    };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') updateGuest(guestId, { status: 'Connected' }); else if (['failed','disconnected','closed'].includes(pc.connectionState)) updateGuest(guestId, { status: pc.connectionState }); };
    try { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await waitForIce(pc, 20000); roomSocket?.send(JSON.stringify({ type: 'offer', guestId, sdp: pc.localDescription?.sdp })); }
    catch (e) { updateGuest(guestId, { status: e instanceof Error ? e.message : 'Offer failed' }); }
  }
  function updateGuest(id: string, patch: Partial<Guest>) { guests = guests.map(guest => guest.id === id ? { ...guest, ...patch } : guest); }
  function removeRoomGuest(id: string) { guestSourcePending.delete(id); const pc = guestPeers.get(id); if (pc) { pc.ontrack = null; pc.close(); guestPeers.delete(id); } const source = slots.find(item => item.id === `guest-${id}`); if (source) { release(source); slots = slots.filter(item => item.id !== source.id); } guests = guests.filter(guest => guest.id !== id); if (selected === `guest-${id}`) selected = slots[0]?.id ?? ''; connected = allSources().length > 0; }
  function guestControl(id: string, action: 'mute-audio'|'enable-audio'|'disable-video'|'enable-video'|'kick') { roomSocket?.send(JSON.stringify({ type: 'host-control', guestId: id, action })); if (action === 'kick') removeRoomGuest(id); if (action === 'mute-audio' || action === 'enable-audio') { const source = slots.find(item => item.id === `guest-${id}`); if (source) { const enabled = action === 'enable-audio'; for (const mix of [recordingAudioMix, broadcastAudioMix]) { const gain = mix?.gains.get(source.id); if (gain && mix) gain.gain.setTargetAtTime(enabled ? 1 : 0, mix.context.currentTime, 0.015); } slots = slots.map(item => item.id === source.id ? { ...item, audioEnabled: enabled } : item); updateGuest(id, { audioEnabled: enabled }); } } if (action === 'disable-video' || action === 'enable-video') updateGuest(id, { videoEnabled: action === 'enable-video' }); }
  async function refreshGuestQuality() { for (const [id, pc] of guestPeers) { try { const stats = await pc.getStats(); let rtt = 0, bitrate = 0; stats.forEach(report => { if (report.type === 'candidate-pair' && report.state === 'succeeded' && (report.selected || report.nominated)) rtt = Math.round((report.currentRoundTripTime || 0) * 1000); if (report.type === 'inbound-rtp' && report.kind === 'video') bitrate = Math.round((report.bytesReceived || 0) / 1024); }); updateGuest(id, { quality: `${rtt ? `${rtt} ms RTT` : 'RTT —'} · ${bitrate ? `${bitrate} KB received` : 'video waiting'}` }); } catch { updateGuest(id, { quality: 'Stats unavailable' }); } } }
  let guestStatsTimer: ReturnType<typeof setInterval> | null = null;
  function closeRoom(showStatus = true) { if (guestStatsTimer) clearInterval(guestStatsTimer); guestStatsTimer = null; for (const id of [...guestPeers.keys()]) removeRoomGuest(id); if (roomSocket) { roomSocket.onclose = null; roomSocket.close(); roomSocket = null; } roomCode = ''; guestToken = ''; if (showStatus) roomStatus = 'Production room closed'; }
  async function copyGuestInvite() { const invite = `${new URL(`${base}/guest.html`, location.origin)}#room=${encodeURIComponent(roomCode)}&token=${encodeURIComponent(guestToken)}`; try { await navigator.clipboard.writeText(invite); roomStatus = 'Guest invitation link copied.'; } catch { roomStatus = `Copy blocked · guest link: ${invite}`; } }

  async function startBroadcast() {
    if (broadcasting || !allSources().length) return;
    const endpoint = whipEndpoint.trim();
    if (!/^https:\/\//i.test(endpoint)) { broadcastStatus = 'Enter a secure HTTPS WHIP endpoint.'; return; }
    try {
      broadcastStatus = 'Preparing secure WebRTC connection…';
      const video = canvas.captureStream(30);
      broadcastAudioMix = await captureAudio();
      const audio = broadcastAudioMix?.stream.getAudioTracks() ?? [];
      broadcastStream = new MediaStream([...video.getVideoTracks(), ...audio]);
      peer = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
      broadcastStream.getTracks().forEach((track) => peer!.addTrack(track, broadcastStream!));
      peer.onconnectionstatechange = () => {
        if (!peer) return;
        if (peer.connectionState === 'connected') { broadcasting = true; broadcastStatus = 'Live · WebRTC connected'; }
        else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') { broadcasting = false; broadcastStatus = `Connection ${peer.connectionState}. Check the endpoint/network.`; }
      };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer); await waitForIce(peer);
      broadcastStatus = 'Negotiating with streaming destination…';
      const headers: Record<string,string> = { 'Content-Type': 'application/sdp', 'Accept': 'application/sdp' };
      if (whipToken.trim()) headers.Authorization = `Bearer ${whipToken.trim()}`;
      const response = await fetch(endpoint, { method: 'POST', headers, body: peer.localDescription?.sdp ?? offer.sdp, redirect: 'error' });
      if (!response.ok) throw new Error(`WHIP server returned HTTP ${response.status}. Check endpoint, token and CORS settings.`);
      const answer = await response.text();
      if (!answer.startsWith('v=0')) throw new Error('The streaming service returned an invalid SDP answer.');
      const location = response.headers.get('Location');
      whipSessionUrl = location ? new URL(location, endpoint).toString() : '';
      await peer.setRemoteDescription({ type: 'answer', sdp: answer });
      broadcasting = true; broadcastStartedAt = Date.now(); broadcastStatus = 'Connecting to destination…';
      previousOutbound = null; statsTimer = setInterval(() => { void refreshBroadcastStats(); }, 2000);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start WebRTC broadcast.';
      broadcastStatus = message.includes('Failed to fetch') ? 'Could not reach WHIP server. Verify HTTPS, endpoint and cross-origin (CORS) support.' : message;
      stopBroadcast(false);
    }
  }
  async function refreshBroadcastStats() {
    if (!peer || peer.connectionState !== 'connected') return;
    try {
      const reports = await peer.getStats(); let outbound: RTCOutboundRtpStreamStats | undefined; let pair: RTCIceCandidatePairStats | undefined;
      reports.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.kind === 'video' && !report.isRemote) outbound = report as RTCOutboundRtpStreamStats;
        if (report.type === 'candidate-pair' && (report as RTCIceCandidatePairStats).state === 'succeeded' && ((report as RTCIceCandidatePairStats & { selected?: boolean }).selected || (report as RTCIceCandidatePairStats).nominated)) pair = report as RTCIceCandidatePairStats;
      });
      if (outbound) { const now = outbound.timestamp; const bytes = outbound.bytesSent ?? 0; const frames = outbound.framesEncoded ?? 0; if (previousOutbound && now > previousOutbound.timestamp) { const elapsed=(now-previousOutbound.timestamp)/1000; bitrateKbps=Math.max(0,Math.round(((bytes-previousOutbound.bytes)*8/elapsed)/1000)); streamFps=Math.max(0,Math.round((frames-previousOutbound.frames)/elapsed)); } previousOutbound={bytes,timestamp:now,frames}; }
      if (pair?.currentRoundTripTime != null) latencyMs=Math.round(pair.currentRoundTripTime*1000);
    } catch { /* stats are optional; keep the last reported values */ }
  }
  function stopBroadcast(sendDelete = true) {
    if (sendDelete && whipSessionUrl) {
      const headers: Record<string,string> = {}; if (whipToken.trim()) headers.Authorization = `Bearer ${whipToken.trim()}`;
      void fetch(whipSessionUrl, { method: 'DELETE', headers, keepalive: true }).catch(() => {});
    }
    whipSessionUrl = ''; if (statsTimer) clearInterval(statsTimer); statsTimer = null; previousOutbound = null; bitrateKbps = 0; streamFps = 0; latencyMs = 0; if (peer) { peer.onconnectionstatechange = null; peer.close(); peer = null; }
    if (broadcastStream) { broadcastStream.getTracks().forEach((track) => track.stop()); broadcastStream = null; }
    releaseAudio(broadcastAudioMix); broadcastAudioMix = null; broadcasting = false;
    if (!disposed && broadcastStatus.startsWith('Live')) broadcastStatus = `Broadcast ended · ${clock(Math.floor((Date.now()-broadcastStartedAt)/1000))}`;
  }

  function finishGuestStems(): Promise<void>[] {
    const jobs: Promise<void>[] = [];
    for (const [id, stem] of guestStems) {
      const job = new Promise<void>(resolve => {
        const finish = () => { const blob = new Blob(stem.chunks, { type: stem.recorder.mimeType || 'audio/webm' }); stem.output.getTracks().forEach(track => track.stop()); releaseAudio(stem.mix); guestStems.delete(id); if (!blob.size || disposed) { resolve(); return; } const file = recordingFile(blob, blob.type, new Date(), `guest-${id}-audio`); void importGuestStem(file).then(resolve).catch(error => { status = error instanceof Error ? error.message : `Could not import ${stem.name} audio.`; resolve(); }); };
        stem.recorder.addEventListener('stop', finish, { once: true }); if (stem.recorder.state !== 'inactive') stem.recorder.stop(); else finish();
      }); jobs.push(job);
    }
    return jobs;
  }
  function stopRecording() { if(recorder&&recorder.state!=='inactive')recorder.stop(); }
  async function startRecording() {
    if(!allSources().length||recording)return;
    try {
      const videoStream=canvas.captureStream(30);recordingAudioMix=await captureAudio();const audioTracks=recordingAudioMix?.stream.getAudioTracks()??[];const output=new MediaStream([...videoStream.getVideoTracks(),...audioTracks]);
      const types=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported(t))??'';
      recorder=new MediaRecorder(output,mime?{mimeType:mime}:undefined);chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{recording=false;status='The browser reported a program recording error.';};
      recorder.onstop=()=>{if(timer)clearInterval(timer);timer=null;recording=false;seconds=Math.floor((Date.now()-startedAt)/1000);const blob=new Blob(chunks,{type:recorder?.mimeType||mime||'video/webm'});chunks=[];output.getTracks().forEach(t=>t.stop());releaseAudio(recordingAudioMix);recordingAudioMix=null;const stemJobs=finishGuestStems();if(disposed)return;if(!blob.size){status='No program frames were captured.';return;}const file=recordingFile(blob,blob.type,new Date(),'multicam-program');status='Importing program mix and isolated guest audio stems…';void Promise.all([importProgram(file),...stemJobs]).then(()=>{if(!disposed)status=`Program mix and ${stemJobs.length} isolated guest audio stem(s) added to the timeline.`;}).catch(e=>{if(!disposed)status=e instanceof Error?e.message:'Could not import the program recording.';});};
      guestStems.clear();
      for (const source of slots.filter(item => item.id.startsWith('guest-') && item.audioEnabled)) {
        const mix = await captureSourceAudio(source); if (!mix) continue;
        const stemOutput = new MediaStream(mix.stream.getAudioTracks());
        const stemTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];
        const stemMime = stemTypes.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
        const stemRecorder = new MediaRecorder(stemOutput, stemMime ? { mimeType: stemMime } : undefined);
        const stem: GuestStem = { recorder: stemRecorder, chunks: [], output: stemOutput, mix, name: source.name };
        stemRecorder.ondataavailable = event => { if (event.data.size) stem.chunks.push(event.data); };
        guestStems.set(source.id, stem); stemRecorder.start(1000);
      }
      recorder.start(1000);startedAt=Date.now();seconds=0;recording=true;status=`Recording program mix${guestStems.size ? ` plus ${guestStems.size} isolated guest audio stem(s)` : ''}.`;timer=setInterval(()=>seconds=Math.floor((Date.now()-startedAt)/1000),250);
    } catch(e) { status=e instanceof Error?e.message:'Could not start program recording.';releaseAudio(recordingAudioMix);recordingAudioMix=null; }
  }
  function toggleSourceAudio(id:string) {
    const nextEnabled = !allSources().find((source) => source.id === id)?.audioEnabled;
    for (const mix of [recordingAudioMix, broadcastAudioMix]) { const gain=mix?.gains.get(id); if (gain && mix) gain.gain.setTargetAtTime(nextEnabled ? 1 : 0, mix.context.currentTime, 0.015); }
    slots = slots.map((source) => source.id === id ? { ...source, audioEnabled: !source.audioEnabled } : source);
    if (screen?.id === id) screen = { ...screen, audioEnabled: !screen.audioEnabled };
  }
  function removeSource(id:string) { if(recording)return;const source=allSources().find(s=>s.id===id);if(!source)return;if(source.id==='screen'){release(source);screen=null;}else{release(source);slots=slots.filter(s=>s.id!==id);}if(selected===id)selected=allSources()[0]?.id??'';connected=allSources().length>0; }
  const clock=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
</script>

<section class="multi-studio" aria-label="Multicamera production studio">
  <header><div><strong>Multicamera Production Studio</strong><small>Live switcher · program graphics · mixed recording</small></div><span class:recording>{recording?'● ON AIR / RECORDING':connected?'● SOURCES READY':'○ STANDBY'}</span></header>
  <div class="program"><canvas bind:this={canvas} width="1920" height="1080"></canvas><div class="program-label">PROGRAM · {layout.toUpperCase()}</div></div>
  <div class="source-grid">
    {#each allSources() as source (source.id)}
      <div class="source-card">
        <button class:active={selected===source.id} class="source" onclick={()=>selected=source.id}><span>{source.name}</span><small>{source.video.videoWidth||'—'} × {source.video.videoHeight||'—'}</small><b>{selected===source.id?'PROGRAM':'PREVIEW'}</b></button>
        <button class="source-audio" class:muted={!source.audioEnabled} aria-label={`${source.audioEnabled ? 'Mute' : 'Unmute'} ${source.name} audio`} aria-pressed={source.audioEnabled} onclick={()=>toggleSourceAudio(source.id)}>{source.audioEnabled ? 'AUDIO ON' : 'MUTED'}</button>
        {#if !recording}<button class="remove-source" aria-label={`Remove ${source.name}`} onclick={()=>removeSource(source.id)}>×</button>{/if}
      </div>
    {/each}
    {#if allSources().length===0}<div class="empty">No live sources connected</div>{/if}
  </div>
  <div class="controls">
    <label>Add camera<select aria-label="Add camera" value="" onchange={(e)=>addCamera(e.currentTarget.value)}><option value="">Choose webcam…</option>{#each cameras as camera}<option value={camera.deviceId} disabled={slots.some(s=>s.deviceId===camera.deviceId)}>{camera.label||'Camera'}</option>{/each}</select></label>
    <button onclick={addScreen} disabled={!!screen||recording}>＋ Share screen</button>
    <label>Program layout<select bind:value={layout}><option value="single">Single camera</option><option value="split">Side by side</option><option value="pip">Picture in picture</option><option value="quad">2 × 2 multiview</option></select></label>
  </div>
  <div class="graphics"><label>Lower-third title<input bind:value={title} maxlength="80" placeholder="Show title / speaker name"/></label><label>Subtitle<input bind:value={subtitle} maxlength="120" placeholder="Guest, role or topic"/></label></div>
  <section class="guest-panel" aria-label="Remote guest connection">
    <div class="broadcast-heading"><strong>PRODUCER · GUEST ROOM</strong><span>{roomStatus}</span></div>
    {#if !roomSocket}<button class="guest-action" onclick={createProductionRoom} disabled={roomBusy || recording}>＋ Open private guest room</button>{:else}
      <div class="room-code"><span>ROOM CODE</span><strong>{roomCode}</strong><button class="guest-action" onclick={copyGuestInvite} disabled={!guestToken}>Copy guest invitation</button></div>
      <div class="guest-roster">{#each guests as guest (guest.id)}<article class="guest-row"><div><strong>{guest.name}</strong><small>{guest.status} · {guest.quality}</small></div><div class="guest-controls"><button onclick={()=>guestControl(guest.id,guest.audioEnabled?'mute-audio':'enable-audio')}>{guest.audioEnabled?'Mute':'Unmute'}</button><button onclick={()=>guestControl(guest.id,guest.videoEnabled?'disable-video':'enable-video')}>{guest.videoEnabled?'Stop cam':'Enable cam'}</button><button class="guest-close" onclick={()=>guestControl(guest.id,'kick')}>Remove</button></div></article>{/each}{#if guests.length===0}<small>Room is open · waiting for participants (up to 4 guests)</small>{/if}</div>
      <button class="guest-close" onclick={()=>closeRoom()}>Close guest room</button>
    {/if}
    <small>Room signaling carries connection metadata only. Audio/video travels peer-to-peer. Internet guests require HTTPS; STUN is enabled. Configure TURN on the signaling server for restrictive networks.</small>
  </section>
  <section class="broadcast" aria-label="Live broadcast output">
    <div class="broadcast-heading"><strong>LIVE BROADCAST · WHIP / WEBRTC</strong><span>{broadcastStatus}</span></div>
    <label>WHIP ingest endpoint<input bind:value={whipEndpoint} type="url" placeholder="https://stream.example.com/whip/…" autocomplete="off" spellcheck="false" disabled={broadcasting}/></label>
    <label>Bearer token <small>Optional · session only · never saved in project</small><input bind:value={whipToken} type="password" placeholder="Paste streaming access token" autocomplete="new-password" disabled={broadcasting}/></label>
    {#if broadcasting}<button class="end-broadcast" onclick={()=>stopBroadcast()}>■ End broadcast</button>{:else}<button class="go-live" onclick={startBroadcast} disabled={!connected||!whipEndpoint.trim()}>● Go live</button>{/if}
    {#if broadcasting}<div class="stream-stats"><span>VIDEO OUT <b>{bitrateKbps} kb/s</b></span><span>ENCODE <b>{streamFps} fps</b></span><span>ROUND TRIP <b>{latencyMs} ms</b></span></div>{/if}
    <small>Requires a WHIP-compatible HTTPS destination with browser CORS enabled (including exposed Location header). No stream key is stored in project files.</small>
  </section>
  <footer><span>{status}</span><b>{clock(seconds)}</b>{#if recording}<button class="stop" onclick={stopRecording}>■ Stop & add program to timeline</button>{:else}<button class="record" onclick={startRecording} disabled={!connected}>● Record program mix</button>{/if}</footer>
</section>

<style>
.room-code{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px;background:var(--bg-surface);border-radius:4px}.room-code span{font:9px var(--font-editor);color:var(--text-muted)}.room-code strong{font:700 18px var(--font-editor);letter-spacing:.12em}.guest-roster{display:grid;gap:6px}.guest-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid var(--border);border-radius:4px}.guest-row>div:first-child{display:grid;gap:3px}.guest-row strong{font-size:10px}.guest-row small{font-size:9px;color:var(--text-muted)}.guest-controls{display:flex;gap:4px;flex-wrap:wrap}.guest-controls button{border:1px solid var(--border);border-radius:4px;padding:5px 7px;background:var(--bg-surface);color:var(--text-primary);font-size:9px}.guest-panel{display:grid;gap:7px;padding:10px;border:1px solid var(--border);border-radius:5px;background:var(--bg-elevated)}.guest-action,.guest-close{justify-self:start;border:0;border-radius:4px;padding:8px 12px;color:white;background:#245c86;font-size:10px}.guest-close{background:#7f1d1d}.guest-panel small{font-size:9px;color:var(--text-muted)}.broadcast{display:grid;gap:7px;padding:10px;border:1px solid var(--border);border-radius:5px;background:var(--bg-elevated)}.broadcast-heading{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.broadcast-heading strong{font-size:10px}.broadcast-heading span,.broadcast small,.broadcast>small{font-size:9px;color:var(--text-muted)}.broadcast label{display:grid;gap:4px;font-size:9px;color:var(--text-muted)}.broadcast input{width:100%;box-sizing:border-box;background:var(--bg-surface);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:7px;font-size:10px}.stream-stats{display:flex;gap:14px;flex-wrap:wrap;font:9px var(--font-editor);color:var(--text-muted)}.stream-stats b{color:var(--text-primary);margin-left:3px}.broadcast button{justify-self:start;border:0;border-radius:4px;padding:8px 12px;color:white;font-size:10px}.broadcast .go-live{background:#b8323b}.broadcast .end-broadcast{background:#7f1d1d}.multi-studio{padding:12px;border-bottom:1px solid var(--border);background:var(--bg-surface);display:grid;gap:10px;color:var(--text-primary)}header,footer,.controls,.graphics,.source-grid{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}header strong{display:block;font-size:12px}header small{display:block;color:var(--text-muted);font-size:10px;margin-top:3px}header>span{font:10px var(--font-editor);color:var(--text-muted)}header>span.recording{color:#ef4444}.program{position:relative;width:100%;aspect-ratio:16/9;max-height:260px;background:#080b11;border-radius:5px;overflow:hidden}.program canvas{width:100%;height:100%;display:block;object-fit:contain}.program-label{position:absolute;left:8px;top:8px;background:#111c;color:#fff;padding:4px 6px;border-radius:3px;font:9px var(--font-editor)}.source-card{position:relative;min-width:100px;flex:1;display:flex}.source{width:100%;min-width:0;background:var(--bg-elevated);border:1px solid var(--border);border-radius:4px;padding:8px;color:var(--text-secondary);text-align:left;display:grid;gap:4px}.source.active{border-color:var(--accent);color:var(--text-primary)}.source span{font-size:10px;font-weight:600}.source small,.source b{font:9px var(--font-editor);color:var(--text-muted)}.source b{color:var(--accent)}.source-audio{position:absolute;left:5px;bottom:4px;border:0;border-radius:3px;background:#172033;color:#a7f3d0;font:8px var(--font-editor);padding:3px 5px}.source-audio.muted{color:#fca5a5;background:#351b23}.remove-source{position:absolute;right:5px;top:4px;border:0;background:transparent;color:var(--text-muted);font-size:15px;padding:0 4px}.empty{font-size:10px;color:var(--text-muted);padding:10px}.controls label,.graphics label{display:grid;gap:4px;font-size:9px;color:var(--text-muted)}.controls select,.graphics input{background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:6px;font-size:10px;min-width:110px}.graphics{justify-content:flex-start}.graphics label{flex:1}.graphics input{width:100%;box-sizing:border-box}.controls button,footer button{border:1px solid var(--border);border-radius:4px;padding:7px 10px;font-size:10px;background:var(--bg-elevated);color:var(--text-primary)}footer{justify-content:flex-start}footer span{font-size:9px;color:var(--text-muted);flex:1;min-width:160px}footer b{font:11px var(--font-editor)}footer .record{background:#b8323b;color:white;border:0}footer .stop{background:#8f242b;color:white;border:0}button:disabled{opacity:.45;cursor:not-allowed}
</style>
