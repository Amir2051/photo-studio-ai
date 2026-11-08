import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './AudioStudio.css';

type AudioTrack = {
  id: string;
  name: string;
  mime: string;
  size: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  gain: number;
  offset: number;
  blob: Blob;
  updatedAt: string;
};

const DB_NAME = 'every-frame-first-audio';
const STORE = 'tracks';
const MAX_FILE_BYTES = 250 * 1024 * 1024;
const MAX_MIX_SECONDS = 15 * 60;

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local audio storage.'));
  });
}

async function getTracks(): Promise<AudioTrack[]> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as AudioTrack[]).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)));
    request.onerror = () => reject(request.error || new Error('Could not read saved audio tracks.'));
  });
}

async function saveTrack(track: AudioTrack): Promise<void> {
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not save audio track.'));
    tx.onabort = () => reject(tx.error || new Error('Audio save was interrupted.'));
  });
}

async function removeTrack(id: string): Promise<void> {
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not delete audio track.'));
  });
}

function createAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('This browser does not support Web Audio.');
  return new AudioContextConstructor();
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '0:00';
  const seconds = Math.max(0, Math.floor(value));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + ' KB';
  return (value / (1024 * 1024)).toFixed(1) + ' MB';
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const output = new ArrayBuffer(44 + frames * blockAlign);
  const view = new DataView(output);
  const writeText = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + frames * blockAlign, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, frames * blockAlign, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([output], { type: 'audio/wav' });
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function Waveform({ track, height = 92 }: { track: AudioTrack; height?: number }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = async () => {
      try {
        const context = createAudioContext();
        const decoded = await context.decodeAudioData(await track.blob.arrayBuffer());
        await context.close();
        if (cancelled) return;
        const width = Math.max(320, canvas.clientWidth * (window.devicePixelRatio || 1));
        const h = height * (window.devicePixelRatio || 1);
        canvas.width = width;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, width, h);
        const data = decoded.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / width));
        const mid = h / 2;
        ctx.fillStyle = '#75c8b5';
        for (let x = 0; x < width; x += 1) {
          let peak = 0;
          const start = x * step;
          for (let i = start; i < Math.min(start + step, data.length); i += 1) peak = Math.max(peak, Math.abs(data[i]));
          const bar = Math.max(1, peak * h * 0.82);
          ctx.fillRect(x, mid - bar / 2, 1, bar);
        }
      } catch {
        if (!cancelled) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 320;
            canvas.height = height;
            ctx.clearRect(0, 0, 320, height);
            ctx.fillStyle = '#d19c64';
            ctx.font = '12px sans-serif';
            ctx.fillText('Waveform unavailable for this file', 12, height / 2);
          }
        }
      }
    };
    void draw();
    return () => { cancelled = true; };
  }, [track.blob, height]);
  return <canvas className="audio-waveform" ref={canvasRef} aria-label={'Waveform for ' + track.name} style={{ height }} />;
}

export default function AudioStudio(): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Import audio files to start a real multitrack session. Your files stay in this browser.');
  const [playingId, setPlayingId] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');
  const [exportName, setExportName] = useState('every-frame-first-mix.wav');

  useEffect(() => {
    let alive = true;
    void getTracks().then((items) => {
      if (!alive) return;
      setTracks(items);
      setSelectedId(items[0]?.id || '');
    }).catch((error: unknown) => {
      if (alive) setMessage(error instanceof Error ? error.message : 'Could not load local audio projects.');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPlayerUrl('');
      return;
    }
    const track = tracks.find((item) => item.id === selectedId);
    if (!track) return;
    const url = URL.createObjectURL(track.blob);
    setPlayerUrl(url);
    setPlayingId('');
    return () => URL.revokeObjectURL(url);
  }, [selectedId, tracks]);

  const selectedTrack = tracks.find((track) => track.id === selectedId) || null;
  const sessionDuration = useMemo(
    () => tracks.reduce((max, track) => Math.max(max, track.offset + Math.max(0, track.trimEnd - track.trimStart)), 0),
    [tracks],
  );

  const persist = useCallback(async (track: AudioTrack) => {
    try {
      await saveTrack({ ...track, updatedAt: new Date().toISOString() });
      setMessage('Saved locally: ' + track.name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this track.');
    }
  }, []);

  const updateTrack = (id: string, patch: Partial<AudioTrack>) => {
    const current = tracks.find((track) => track.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    setTracks((items) => items.map((track) => track.id === id ? next : track));
    void persist(next);
  };

  const importFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!selected.length) return;
    setBusy(true);
    let imported = 0;
    try {
      for (const file of selected) {
        if (!file.type.startsWith('audio/')) {
          setMessage('Skipped ' + file.name + ': choose an audio file.');
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setMessage('Skipped ' + file.name + ': files must be 250 MB or smaller.');
          continue;
        }
        const context = createAudioContext();
        let decoded: AudioBuffer;
        try {
          decoded = await context.decodeAudioData(await file.arrayBuffer());
        } finally {
          await context.close();
        }
        const track: AudioTrack = {
          id: crypto.randomUUID(),
          name: file.name,
          mime: file.type || 'audio/octet-stream',
          size: file.size,
          duration: decoded.duration,
          trimStart: 0,
          trimEnd: decoded.duration,
          gain: 1,
          offset: 0,
          blob: file,
          updatedAt: new Date().toISOString(),
        };
        await saveTrack(track);
        setTracks((items) => [...items, track]);
        setSelectedId(track.id);
        imported += 1;
      }
      setMessage(imported ? imported + ' real audio file(s) imported and saved in this browser.' : 'No audio files were imported.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Audio import failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const playTrack = async (track: AudioTrack) => {
    const player = playerRef.current;
    if (!player || !playerUrl || track.id !== selectedId) {
      setSelectedId(track.id);
      return;
    }
    try {
      if (playingId === track.id) {
        player.pause();
        setPlayingId('');
        return;
      }
      player.currentTime = track.trimStart;
      player.volume = Math.max(0, Math.min(1, track.gain));
      await player.play();
      setPlayingId(track.id);
    } catch {
      setMessage('Playback could not start. Check the browser audio permission and try again.');
    }
  };

  const exportMix = async () => {
    if (!tracks.length) return;
    setBusy(true);
    setMessage('Rendering the actual audio tracks into a WAV mix…');
    let context: OfflineAudioContext | null = null;
    try {
      const duration = Math.max(...tracks.map((track) => track.offset + track.trimEnd - track.trimStart));
      if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_MIX_SECONDS) {
        throw new Error('Mix duration must be between 1 second and 15 minutes for this browser export.');
      }
      const sampleRate = 44100;
      context = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
      for (const track of tracks) {
        const decodeContext = createAudioContext();
        let decoded: AudioBuffer;
        try {
          decoded = await decodeContext.decodeAudioData(await track.blob.arrayBuffer());
        } finally {
          await decodeContext.close();
        }
        const source = context.createBufferSource();
        source.buffer = decoded;
        const gain = context.createGain();
        gain.gain.value = Math.max(0, Math.min(2, track.gain));
        source.connect(gain);
        gain.connect(context.destination);
        const startAt = Math.max(0, track.offset);
        const trimStart = Math.max(0, Math.min(track.duration, track.trimStart));
        const clipDuration = Math.max(0, Math.min(track.duration - trimStart, track.trimEnd - trimStart));
        if (clipDuration > 0) source.start(startAt, trimStart, clipDuration);
      }
      const rendered = await context.startRendering();
      const safeName = exportName.toLowerCase().endsWith('.wav') ? exportName : exportName + '.wav';
      downloadBlob(encodeWav(rendered), safeName.replace(/[\\/:*?"<>|]+/g, '-'));
      setMessage('WAV mix exported from ' + tracks.length + ' actual audio track(s).');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not render the audio mix.');
    } finally {
      context = null;
      setBusy(false);
    }
  };

  const deleteSelected = async (track: AudioTrack) => {
    if (!window.confirm('Delete "' + track.name + '" from this browser project?')) return;
    try {
      await removeTrack(track.id);
      setTracks((items) => items.filter((item) => item.id !== track.id));
      setSelectedId((current) => current === track.id ? (tracks.find((item) => item.id !== track.id)?.id || '') : current);
      setMessage('Deleted ' + track.name + ' from local storage.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete the track.');
    }
  };

  return (
    <div className="audio-studio">
      <header className="audio-header">
        <Link className="audio-brand" to="/">EVERY FRAME FIRST <span>/ AUDIO STUDIO</span></Link>
        <div className="audio-header-actions">
          <span className="audio-local-badge"><i /> LOCAL PROJECT</span>
          <Link className="audio-back-link" to="/">Photo Studio</Link>
          <button className="audio-primary" onClick={() => inputRef.current?.click()} disabled={busy}>＋ Import audio</button>
        </div>
        <input ref={inputRef} hidden type="file" accept="audio/*" multiple onChange={(event) => { if (event.target.files) void importFiles(event.target.files); }} />
      </header>

      <main className="audio-main">
        <div className="audio-title-row">
          <div>
            <p className="audio-eyebrow">CREATIVE WORKSPACE / SOUND</p>
            <h1>Podcast <em>Studio</em></h1>
            <p className="audio-subtitle">A real, local-first multitrack audio workspace. Imported source files are stored in this browser; no demo tracks are preloaded.</p>
          </div>
          <div className="audio-project-stats">
            <div><strong>{tracks.length}</strong><span>TRACKS</span></div>
            <div><strong>{formatTime(sessionDuration)}</strong><span>SESSION</span></div>
          </div>
        </div>

        <section className="audio-workspace">
          <div className="audio-workspace-head">
            <div><span className="audio-eyebrow">SESSION TIMELINE</span><h2>Multitrack editor</h2></div>
            <span className="audio-file-count">{loading ? 'Loading saved files…' : tracks.length + ' saved source file(s)'}</span>
          </div>
          {tracks.length === 0 ? (
            <div className="audio-empty">
              <div className="audio-empty-icon">♫</div>
              <h3>{loading ? 'Opening your audio library' : 'Start with your own recordings'}</h3>
              <p>{loading ? 'Reading saved audio files from this browser.' : 'Import WAV, MP3, M4A, AAC, OGG or other browser-supported audio files. Your imported files become the actual tracks in this session.'}</p>
              {!loading && <button className="audio-primary" onClick={() => inputRef.current?.click()} disabled={busy}>Choose audio files</button>}
            </div>
          ) : (
            <div className="audio-track-list">
              {tracks.map((track, index) => (
                <article className={'audio-track' + (track.id === selectedId ? ' selected' : '')} key={track.id}>
                  <div className="audio-track-top">
                    <button className="audio-track-select" onClick={() => setSelectedId(track.id)} aria-pressed={track.id === selectedId}>
                      <span className="audio-track-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="audio-track-name">{track.name}<small>{formatTime(track.duration)} · {formatBytes(track.size)} · {track.mime}</small></span>
                    </button>
                    <div className="audio-track-actions">
                      <button onClick={() => void playTrack(track)} disabled={track.id !== selectedId} title={playingId === track.id ? 'Pause' : 'Play from trim start'}>{playingId === track.id ? 'Ⅱ' : '▶'}</button>
                      <button onClick={() => void deleteSelected(track)} title="Remove track">×</button>
                    </div>
                  </div>
                  <Waveform track={track} />
                  <div className="audio-track-controls">
                    <label>Trim in <strong>{formatTime(track.trimStart)}</strong><input type="range" min="0" max={Math.max(0, track.trimEnd - 0.1)} step="0.05" value={track.trimStart} onChange={(event) => updateTrack(track.id, { trimStart: Math.min(Number(event.target.value), track.trimEnd - 0.05) })} /></label>
                    <label>Trim out <strong>{formatTime(track.trimEnd)}</strong><input type="range" min={Math.min(track.duration, track.trimStart + 0.05)} max={track.duration} step="0.05" value={track.trimEnd} onChange={(event) => updateTrack(track.id, { trimEnd: Math.max(Number(event.target.value), track.trimStart + 0.05) })} /></label>
                    <label>Gain <strong>{Math.round(track.gain * 100)}%</strong><input type="range" min="0" max="2" step="0.01" value={track.gain} onChange={(event) => updateTrack(track.id, { gain: Number(event.target.value) })} /></label>
                    <label>Start offset <strong>{formatTime(track.offset)}</strong><input type="range" min="0" max="300" step="0.25" value={track.offset} onChange={(event) => updateTrack(track.id, { offset: Number(event.target.value) })} /></label>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="audio-message" role="status">{message}</div>
        </section>

        <section className="audio-export-panel">
          <div><p className="audio-eyebrow">REAL RENDER / WAV</p><h2>Export your mix</h2><p>Mixes the imported audio files using each track's trim, gain and start offset, then renders a downloadable stereo WAV file in your browser.</p></div>
          <div className="audio-export-controls">
            <label>Output filename<input value={exportName} onChange={(event) => setExportName(event.target.value)} /></label>
            <button className="audio-primary" onClick={() => void exportMix()} disabled={busy || tracks.length === 0}>{busy ? 'Processing…' : 'Render and export WAV'}</button>
          </div>
        </section>
        <p className="audio-privacy-note">Privacy: source audio and edit settings are saved in this browser's IndexedDB. Export rendering happens on this device. Clearing browser site data removes this local project.</p>
      </main>

      <audio ref={playerRef} src={playerUrl || undefined} onEnded={() => setPlayingId('')} onPause={() => setPlayingId('')} onTimeUpdate={() => {
        const player = playerRef.current;
        if (player && selectedTrack && player.currentTime >= selectedTrack.trimEnd) {
          player.pause();
          setPlayingId('');
        }
      }} />
    </div>
  );
}
