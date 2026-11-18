import { Link } from 'react-router-dom';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeFile,
  filterItems,
  itemsToCsv,
  sortItems,
  type CullFilter,
  type CullItem,
  type CullSort,
} from '../lib/cull';
import { detectFaceLandmarks } from '../lib/portraitRetouch';
import {
  getCullSessions,
  saveCullSession,
  deleteCullSession,
  savePhoto,
  type CullSession,
} from '../lib/storage';
import type { Photo } from '../lib/types';
import './Cull.css';

const MAX_IMPORT = 150;

function safeExportName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_ ]+/gi, '-').trim() || 'photo';
  return base.slice(0, 80);
}

export default function Cull(): React.JSX.Element {
  const [items, setItems] = useState<CullItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('Untitled shoot');
  const [sessions, setSessions] = useState<CullSession[]>([]);
  const [filter, setFilter] = useState<CullFilter>('all');
  const [sort, setSort] = useState<CullSort>('imported');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loupeIndex, setLoupeIndex] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(0);
  const [analysisTotal, setAnalysisTotal] = useState(0);
  const [message, setMessage] = useState(
    'Import a shoot to begin. Ratings and picks stay on this device.',
  );
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCullSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const visibleItems = useMemo(() => sortItems(filterItems(items, filter), sort), [items, filter, sort]);
  const pickedCount = items.filter((item) => item.label === 'pick').length;
  const rejectedCount = items.filter((item) => item.label === 'reject').length;

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const selected = Array.from(files).filter((file) => /^image\//.test(file.type));
    if (!selected.length) {
      setMessage('Choose JPEG, PNG or WebP images.');
      return;
    }
    const limited = selected.slice(0, MAX_IMPORT);
    setAnalysisTotal(limited.length);
    setAnalyzing(0);
    setMessage(`Analyzing ${limited.length} photo(s) locally…`);
    const next: CullItem[] = [];
    for (const file of limited) {
      try {
        const { item } = await analyzeFile(file, (image) => detectFaceLandmarks(image));
        next.push({ id: crypto.randomUUID(), rating: 0, label: 'none', ...item });
      } catch {
        // A file that fails to decode is skipped, not faked.
        console.warn('[Cull] skipped unreadable file', file.name);
      }
      setAnalyzing((count) => count + 1);
    }
    setItems((current) => [...current, ...next]);
    setAnalysisTotal(0);
    setMessage(
      `${next.length} photo(s) analyzed. Assist scores are heuristics (sharpness, exposure, contrast, faces) — your eye decides.`,
    );
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<CullItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const rate = useCallback((id: string, rating: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, rating: item.rating === rating ? 0 : rating } : item,
      ),
    );
  }, []);

  const label = useCallback((id: string, next: 'pick' | 'reject') => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, label: item.label === next ? 'none' : next } : item,
      ),
    );
  }, []);

  const newSession = useCallback(() => {
    setItems([]);
    setSessionId(null);
    setSessionName('Untitled shoot');
    setSelectedIndex(0);
    setLoupeIndex(null);
    setMessage('New cull session. Import a shoot to begin.');
  }, []);

  const saveCurrentSession = useCallback(async () => {
    const id = sessionId ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const existing = sessions.find((session) => session.id === id);
    try {
      const saved = await saveCullSession({
        id,
        name: sessionName.trim() || 'Untitled shoot',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        items,
      });
      setSessionId(id);
      setSessions(await getCullSessions());
      setMessage(`Session “${saved.name}” saved on this device.`);
    } catch {
      setMessage('Session storage is unavailable in this browser. Export a CSV report instead.');
    }
  }, [items, sessionId, sessionName, sessions]);

  const loadSession = useCallback(async (session: CullSession) => {
    setItems(session.items);
    setSessionId(session.id);
    setSessionName(session.name);
    setSelectedIndex(0);
    setLoupeIndex(null);
    setMessage(`Loaded “${session.name}” (${session.items.length} photo(s)).`);
  }, []);

  const removeSession = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this saved cull session? Imported ratings will be lost.')) return;
      await deleteCullSession(id);
      setSessions(await getCullSessions());
      if (sessionId === id) newSession();
    },
    [newSession, sessionId],
  );

  const keepers = useMemo(() => items.filter((item) => item.label === 'pick'), [items]);

  const saveKeepersToLibrary = useCallback(async () => {
    if (!keepers.length) {
      setMessage('Mark at least one photo as a keeper (P) first.');
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      for (const item of keepers) {
        const photo: Photo = {
          id: crypto.randomUUID(),
          name: item.name,
          type: 'jpeg',
          size: item.size,
          dimensions: { width: item.width, height: item.height },
          dataUrl: item.dataUrl,
          dataUrlHigh: item.dataUrl,
          createdAt: now,
          updatedAt: now,
          edits: [],
          filterId: null,
          filterIntensity: 100,
          isOriginalRequired: true,
          tags: ['culled'],
        };
        await savePhoto(photo);
      }
      setMessage(`Saved ${keepers.length} keeper(s) to the local library as JPEG previews (1600px).`);
    } catch {
      setMessage('Could not save keepers to the library in this browser session.');
    } finally {
      setBusy(false);
    }
  }, [keepers]);

  const exportKeepersZip = useCallback(async () => {
    if (!keepers.length) {
      setMessage('Mark at least one photo as a keeper (P) first.');
      return;
    }
    setBusy(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const folder = zip.folder('minu-studio-keepers');
      if (!folder) throw new Error('Could not create the archive.');
      for (const item of keepers) {
        const base64 = item.dataUrl.split(',')[1];
        if (base64) folder.file(`${safeExportName(item.name)}.jpg`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'minu-studio-keepers.zip';
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Exported ${keepers.length} keeper(s) as a ZIP (full frames at 1600px preview).`);
    } catch {
      setMessage('Could not build the keeper ZIP in this browser session.');
    } finally {
      setBusy(false);
    }
  }, [keepers]);

  const exportReport = useCallback(() => {
    if (!items.length) {
      setMessage('Nothing to report yet.');
      return;
    }
    const blob = new Blob([itemsToCsv(items)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'minu-studio-cull-report.csv';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Cull report exported as CSV.');
  }, [items]);

  // Keyboard culling: arrows navigate, 1-5 rate, 0 clear, P/X label, L loupe.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const list = visibleItems;
      if (!list.length) return;
      const current = list[Math.min(selectedIndex, list.length - 1)];
      const move = (delta: number) =>
        setSelectedIndex((index) => Math.min(list.length - 1, Math.max(0, index + delta)));
      if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key >= '1' && event.key <= '5' && current) rate(current.id, Number(event.key));
      else if (event.key === '0' && current) rate(current.id, 0);
      else if ((event.key === 'p' || event.key === 'P') && current) label(current.id, 'pick');
      else if ((event.key === 'x' || event.key === 'X') && current) label(current.id, 'reject');
      else if ((event.key === 'l' || event.key === 'L') && current) setLoupeIndex(selectedIndex);
      else if (event.key === 'Escape') setLoupeIndex(null);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visibleItems, selectedIndex, rate, label]);

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, visibleItems.length - 1)));
  }, [visibleItems.length]);

  const loupeItem = loupeIndex !== null ? visibleItems[loupeIndex] : null;

  return (
    <main className="cull-shell">
      <header className="cull-header">
        <Link to="/" className="cull-brand">
          MINU STUDIO
        </Link>
        <div className="cull-header-actions">
          <input
            className="cull-session-name"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            aria-label="Session name"
          />
          <button className="cull-button cull-button-quiet" onClick={newSession}>
            New
          </button>
          <button className="cull-button cull-button-quiet" onClick={() => void saveCurrentSession()}>
            Save session
          </button>
          <button
            className="cull-button cull-button-primary"
            onClick={() => fileRef.current?.click()}
            disabled={analysisTotal > 0}
          >
            {analysisTotal > 0 ? `Analyzing ${analyzing}/${analysisTotal}` : 'Import photos'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="visually-hidden"
            onChange={(event) => {
              if (event.target.files) void importFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <div className="cull-toolbar">
        <div className="cull-stats">
          <span>{items.length} photo(s)</span>
          <span className="cull-stat-pick">{pickedCount} picked</span>
          <span className="cull-stat-reject">{rejectedCount} rejected</span>
        </div>
        <div className="cull-filters" role="group" aria-label="Filter">
          {(['all', 'picked', 'rejected', 'unrated'] as const).map((value) => (
            <button
              key={value}
              className={`cull-chip ${filter === value ? 'active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <div className="cull-sort">
          <label>
            Sort{' '}
            <select value={sort} onChange={(event) => setSort(event.target.value as CullSort)}>
              <option value="imported">Import order</option>
              <option value="score">Assist score</option>
              <option value="rating">Rating</option>
            </select>
          </label>
        </div>
        <div className="cull-actions">
          <button className="cull-button cull-button-quiet" onClick={() => void saveKeepersToLibrary()} disabled={busy}>
            Keepers → Library
          </button>
          <button className="cull-button cull-button-quiet" onClick={() => void exportKeepersZip()} disabled={busy}>
            Keepers → ZIP
          </button>
          <button className="cull-button cull-button-quiet" onClick={exportReport}>
            Report CSV
          </button>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="cull-sessions" aria-label="Saved sessions">
          <span>Sessions:</span>
          {sessions.slice(0, 6).map((session) => (
            <span key={session.id} className="cull-session-item">
              <button className="cull-chip" onClick={() => void loadSession(session)}>
                {session.name} ({session.items.length})
              </button>
              <button
                className="cull-chip cull-chip-danger"
                aria-label={`Delete ${session.name}`}
                onClick={() => void removeSession(session.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="cull-empty">
          <h1>Cull your shoot</h1>
          <p>Import photos to score sharpness, exposure and contrast locally.</p>
          <p className="cull-keys">
            Keys: <kbd>1</kbd>–<kbd>5</kbd> rate · <kbd>P</kbd> pick · <kbd>X</kbd> reject ·{' '}
            <kbd>←</kbd>
            <kbd>→</kbd> navigate · <kbd>L</kbd> loupe
          </p>
        </div>
      ) : (
        <div className="cull-grid" ref={gridRef}>
          {visibleItems.map((item, index) => (
            <figure
              key={item.id}
              className={`cull-card ${index === selectedIndex ? 'selected' : ''} ${
                item.label === 'pick' ? 'picked' : item.label === 'reject' ? 'rejected' : ''
              }`}
              tabIndex={0}
              onClick={() => setSelectedIndex(index)}
              onDoubleClick={() => setLoupeIndex(index)}
            >
              <img src={item.dataUrl} alt={item.name} loading="lazy" />
              <div className="cull-card-meta">
                <span className="cull-score" title="Heuristic assist score">
                  {item.score}
                </span>
                <div className="cull-card-text">
                  <span className="cull-item-name" title={item.name}>
                    {item.name}
                  </span>
                  <div className="cull-stars" aria-label={`Rating ${item.rating} of 5`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className={`cull-star ${item.rating >= star ? 'on' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          rate(item.id, star);
                        }}
                        aria-label={`Rate ${star}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cull-card-flags">
                  <button
                    className={`cull-flag pick ${item.label === 'pick' ? 'on' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      label(item.id, 'pick');
                    }}
                    title="Pick (P)"
                  >
                    P
                  </button>
                  <button
                    className={`cull-flag reject ${item.label === 'reject' ? 'on' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      label(item.id, 'reject');
                    }}
                    title="Reject (X)"
                  >
                    X
                  </button>
                </div>
              </div>
            </figure>
          ))}
        </div>
      )}

      <footer className="cull-footer" role="status">
        {message}
      </footer>

      {loupeItem && (
        <div
          className="cull-loupe"
          role="dialog"
          aria-modal="true"
          aria-label="Loupe view"
          onClick={() => setLoupeIndex(null)}
        >
          <img src={loupeItem.dataUrl} alt={loupeItem.name} />
          <div className="cull-loupe-bar" onClick={(event) => event.stopPropagation()}>
            <span>{loupeItem.name}</span>
            <span>Score {loupeItem.score} · {'★'.repeat(loupeItem.rating) || 'unrated'} · {loupeItem.label}</span>
            <button className="cull-button cull-button-quiet" onClick={() => setLoupeIndex(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
