import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { savePhoto, getAllPhotos } from '../lib/storage';
import type { Photo } from '../lib/types';

type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };
type Preset = { id: string; name: string; values: Adjustments };
const DEFAULTS: Adjustments = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };
const PRESETS: Preset[] = [
  { id: 'natural', name: 'Natural', values: DEFAULTS },
  {
    id: 'portrait',
    name: 'Portrait',
    values: { brightness: 104, contrast: 96, saturation: 92, warmth: 3 },
  },
  {
    id: 'golden',
    name: 'Golden hour',
    values: { brightness: 106, contrast: 108, saturation: 112, warmth: 22 },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    values: { brightness: 96, contrast: 122, saturation: 82, warmth: -5 },
  },
  {
    id: 'mono',
    name: 'Monochrome',
    values: { brightness: 100, contrast: 115, saturation: 0, warmth: 0 },
  },
  {
    id: 'vintage',
    name: 'Soft vintage',
    values: { brightness: 106, contrast: 88, saturation: 78, warmth: 12 },
  },
  {
    id: 'vivid',
    name: 'Vivid',
    values: { brightness: 103, contrast: 112, saturation: 132, warmth: 0 },
  },
];
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;

function adjustmentFilter(a: Adjustments): string {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
}
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('This image format could not be decoded by your browser.'));
    image.src = src;
  });
}

export default function Home(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceMime, setSourceMime] = useState('image/jpeg');
  const [sourceFileSize, setSourceFileSize] = useState(0);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULTS);
  const [history, setHistory] = useState<Adjustments[]>([DEFAULTS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    'Your photos stay on this device unless you choose to export them.',
  );
  const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]);
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(
    'image/jpeg',
  );
  const [prompt, setPrompt] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  const render = useCallback((next: Adjustments, showOriginal = false) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const maxPreviewEdge = 2200;
    const scale = Math.min(1, maxPreviewEdge / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = showOriginal ? 'none' : adjustmentFilter(next);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    if (!showOriginal && next.warmth !== 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle =
        next.warmth > 0
          ? `rgba(255, 164, 72, ${Math.min(0.22, next.warmth / 400)})`
          : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(next.warmth) / 500)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }, []);

  useEffect(() => {
    render(adjustments, compare);
  }, [adjustments, compare, render, sourceUrl, showSaved]);
  useEffect(() => {
    getAllPhotos()
      .then(setSavedPhotos)
      .catch(() => setMessage('Local photo storage is unavailable in this browser session.'));
  }, []);
  useEffect(
    () => () => {
      if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );

  const hasImage = Boolean(sourceUrl);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const activePreset = useMemo(
    () => PRESETS.find((p) => JSON.stringify(p.values) === JSON.stringify(adjustments))?.id ?? '',
    [adjustments],
  );

  const addHistory = (next: Adjustments) => {
    setAdjustments(next);
    setHistory((current) => [...current.slice(0, historyIndex + 1), next].slice(-60));
    setHistoryIndex((index) => Math.min(index + 1, 59));
  };

  const openFiles = async (files: FileList | File[]) => {
    const file = Array.from(files).find((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (!file) {
      setMessage('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage('This file is larger than 40 MB. Choose a smaller image for this browser editor.');
      return;
    }
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) {
        URL.revokeObjectURL(url);
        throw new Error(
          'This image exceeds the 24-megapixel safety limit. Create a smaller copy and try again.',
        );
      }
      if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
      imageRef.current = image;
      setSourceUrl(url);
      setSourceName(file.name);
      setSourceMime(file.type);
      setSourceFileSize(file.size);
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
      setAdjustments(DEFAULTS);
      setHistory([DEFAULTS]);
      setHistoryIndex(0);
      setCompare(false);
      setMessage(
        `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} pixels · original preserved`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open this image.');
    } finally {
      setBusy(false);
    }
  };

  const updateAdjustment = (key: keyof Adjustments, value: number) =>
    addHistory({ ...adjustments, [key]: value });
  const applyPreset = (preset: Preset) => {
    addHistory({ ...preset.values });
    setCompare(false);
  };
  const undo = () => {
    if (!canUndo) return;
    const index = historyIndex - 1;
    setHistoryIndex(index);
    setAdjustments(history[index]);
  };
  const redo = () => {
    if (!canRedo) return;
    const index = historyIndex + 1;
    setHistoryIndex(index);
    setAdjustments(history[index]);
  };
  const reset = () => addHistory(DEFAULTS);

  const exportPhoto = async () => {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    try {
      const output = document.createElement('canvas');
      output.width = image.naturalWidth;
      output.height = image.naturalHeight;
      const ctx = output.getContext('2d');
      if (!ctx) throw new Error('Your browser could not create an export canvas.');
      ctx.filter = adjustmentFilter(adjustments);
      ctx.drawImage(image, 0, 0);
      ctx.filter = 'none';
      if (adjustments.warmth !== 0) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle =
          adjustments.warmth > 0
            ? `rgba(255, 164, 72, ${Math.min(0.22, adjustments.warmth / 400)})`
            : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(adjustments.warmth) / 500)})`;
        ctx.fillRect(0, 0, output.width, output.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Image export failed.'))),
          exportFormat,
          0.94,
        ),
      );
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${sourceName.replace(/\.[^.]+$/, '') || 'photo'}-edited.${exportFormat.split('/')[1]}`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setMessage(
        `Exported ${output.width.toLocaleString()} × ${output.height.toLocaleString()} pixels.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveToLibrary = async () => {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    try {
      const preview = document.createElement('canvas');
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      preview.width = Math.round(image.naturalWidth * scale);
      preview.height = Math.round(image.naturalHeight * scale);
      const ctx = preview.getContext('2d');
      if (!ctx) throw new Error('Could not create a preview.');
      ctx.filter = adjustmentFilter(adjustments);
      ctx.drawImage(image, 0, 0, preview.width, preview.height);
      ctx.filter = 'none';
      if (adjustments.warmth !== 0) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle =
          adjustments.warmth > 0
            ? `rgba(255, 164, 72, ${Math.min(0.22, adjustments.warmth / 400)})`
            : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(adjustments.warmth) / 500)})`;
        ctx.fillRect(0, 0, preview.width, preview.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      const dataUrl = preview.toDataURL('image/jpeg', 0.88);
      const originalDataUrl = await readAsDataUrl(
        new File([await (await fetch(sourceUrl!)).blob()], sourceName || 'photo'),
      );
      const now = new Date().toISOString();
      const photo: Photo = {
        id: crypto.randomUUID(),
        name: sourceName || 'Untitled photo',
        type: sourceMime === 'image/png' ? 'png' : sourceMime === 'image/webp' ? 'webp' : 'jpeg',
        size: sourceFileSize,
        dimensions: { width: image.naturalWidth, height: image.naturalHeight },
        dataUrl,
        dataUrlHigh: originalDataUrl,
        createdAt: now,
        updatedAt: now,
        edits: Object.entries(adjustments).map(([type, value]) => ({
          type,
          value,
          min: 0,
          max: 200,
          default: 100,
          label: type,
        })),
        filterIntensity: 100,
        isOriginalRequired: true,
        tags: [],
      };
      await savePhoto(photo);
      setSavedPhotos(await getAllPhotos());
      setMessage('Saved locally in this browser. No account or cloud upload was used.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this photo locally.');
    } finally {
      setBusy(false);
    }
  };

  const openSavedPhoto = async (photo: Photo) => {
    setBusy(true);
    try {
      const original = photo.dataUrlHigh || photo.dataUrl;
      const image = await loadImage(original);
      imageRef.current = image;
      setSourceUrl(original);
      setSourceName(photo.name);
      setSourceMime(
        photo.type === 'png' ? 'image/png' : photo.type === 'webp' ? 'image/webp' : 'image/jpeg',
      );
      setSourceFileSize(photo.size);
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
      const valueFor = (key: string, fallback: number) =>
        photo.edits.find((edit) => edit.type === key)?.value ?? fallback;
      const restored: Adjustments = {
        brightness: valueFor('brightness', 100),
        contrast: valueFor('contrast', 100),
        saturation: valueFor('saturation', 100),
        warmth: valueFor('warmth', 0),
      };
      setAdjustments(restored);
      setHistory(
        JSON.stringify(restored) === JSON.stringify(DEFAULTS) ? [DEFAULTS] : [DEFAULTS, restored],
      );
      setHistoryIndex(JSON.stringify(restored) === JSON.stringify(DEFAULTS) ? 0 : 1);
      setCompare(false);
      setShowSaved(false);
      setMessage('Restored the saved original and its local adjustment recipe.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not reopen this saved photo.');
    } finally {
      setBusy(false);
    }
  };

  const suggestFromPrompt = () => {
    const text = prompt.toLowerCase();
    let next = { ...adjustments };
    if (/bright|lighten|exposure/.test(text)) next.brightness = Math.min(150, next.brightness + 12);
    if (/dark|moody/.test(text)) next.brightness = Math.max(65, next.brightness - 12);
    if (/contrast|dramatic|cinematic/.test(text)) next.contrast = Math.min(160, next.contrast + 12);
    if (/warm|golden|sunset/.test(text)) next.warmth = Math.min(60, next.warmth + 15);
    if (/cool|blue/.test(text)) next.warmth = Math.max(-60, next.warmth - 15);
    if (/vivid|colorful|saturat/.test(text)) next.saturation = Math.min(180, next.saturation + 18);
    if (/muted|desaturat|black.?and.?white|monochrome/.test(text))
      next.saturation = Math.max(0, next.saturation - 30);
    if (JSON.stringify(next) === JSON.stringify(adjustments)) {
      setMessage(
        'No matching local adjustment found. Try “brighter”, “warmer”, “cinematic”, or “muted”. This helper works locally and is not a connected AI model.',
      );
      return;
    }
    addHistory(next);
    setMessage(
      'Applied a local editing recipe from your instruction. This is not a generative AI edit.',
    );
  };

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Every Frame First Studio home"
        >
          <span className="brand-mark">EF</span>
          <span>
            <strong>EVERY FRAME FIRST</strong>
            <small>PHOTO STUDIO</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="local-indicator">
            <i /> LOCAL EDITING
          </span>
          <button className="button button-quiet" onClick={() => setShowSaved((v) => !v)}>
            {showSaved
              ? 'Close library'
              : `Library${savedPhotos.length ? ` (${savedPhotos.length})` : ''}`}
          </button>
          <button className="button button-primary" onClick={() => fileInputRef.current?.click()}>
            ＋ Add photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files) void openFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </header>

      <main className="studio-main">
        <section className="workspace-heading">
          <div>
            <p className="eyebrow">YOUR CREATIVE WORKSPACE</p>
            <h1>
              Make every frame <em>count.</em>
            </h1>
            <p className="subheading">A thoughtful photo editor. Your original stays untouched.</p>
          </div>
          {hasImage && (
            <div className="history-actions">
              <button className="icon-button" disabled={!canUndo} onClick={undo} aria-label="Undo">
                ↶
              </button>
              <button className="icon-button" disabled={!canRedo} onClick={redo} aria-label="Redo">
                ↷
              </button>
              <button className="button button-quiet" onClick={reset}>
                Reset edits
              </button>
            </div>
          )}
        </section>

        {showSaved ? (
          <section className="library-panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">ON THIS DEVICE</p>
                <h2>Your photo library</h2>
              </div>
              <span>{savedPhotos.length} saved</span>
            </div>
            {savedPhotos.length ? (
              <div className="saved-grid">
                {savedPhotos.map((photo) => (
                  <button
                    className="saved-card"
                    key={photo.id}
                    onClick={() => void openSavedPhoto(photo)}
                  >
                    <img src={photo.dataUrl} alt="" />
                    <div>
                      <strong>{photo.name}</strong>
                      <small>
                        {photo.dimensions.width} × {photo.dimensions.height} · Open edit
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-library">
                Your saved photos will appear here. Save an edit to keep a local copy.
              </p>
            )}
          </section>
        ) : (
          <div className="editor-layout">
            <section className="preview-column">
              <div className="preview-toolbar">
                <span>{hasImage ? sourceName : 'PREVIEW CANVAS'}</span>
                {hasImage && (
                  <button
                    className={`compare-toggle ${compare ? 'active' : ''}`}
                    onClick={() => setCompare((v) => !v)}
                    title="Hold or tap to compare with original"
                  >
                    ◐ {compare ? 'Original' : 'Compare'}
                  </button>
                )}
              </div>
              <div
                className={`preview-stage ${hasImage ? 'has-image' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files);
                }}
              >
                {hasImage ? (
                  <canvas ref={canvasRef} aria-label="Photo preview" />
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">↥</div>
                    <h2>Start with a photograph</h2>
                    <p>Drop an image here, or choose one from your device.</p>
                    <button
                      className="button button-primary button-large"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {busy ? 'Opening…' : 'Choose a photo'}
                    </button>
                    <small>JPEG · PNG · WebP · Up to 40 MB · 24 MP maximum</small>
                  </div>
                )}
              </div>
              <div className="preview-footer">
                <span>{message}</span>
                {hasImage && (
                  <span>
                    {sourceSize.width.toLocaleString()} × {sourceSize.height.toLocaleString()}
                  </span>
                )}
              </div>
              {hasImage && (
                <div className="export-bar">
                  <label className="format-select">
                    Export as{' '}
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                    >
                      <option value="image/jpeg">JPEG · High quality</option>
                      <option value="image/png">PNG · Lossless</option>
                      <option value="image/webp">WebP · Compact</option>
                    </select>
                  </label>
                  <button className="button button-quiet" onClick={saveToLibrary} disabled={busy}>
                    Save to library
                  </button>
                  <button className="button button-primary" onClick={exportPhoto} disabled={busy}>
                    ↓ Export photo
                  </button>
                </div>
              )}
            </section>

            <aside className="tools-column">
              <section className="tool-panel">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">QUICK LOOKS</p>
                    <h2>Presets</h2>
                  </div>
                  <span>01 / 07</span>
                </div>
                <div className="preset-grid">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`preset-chip ${activePreset === preset.id ? 'selected' : ''}`}
                      onClick={() => applyPreset(preset)}
                      disabled={!hasImage}
                    >
                      <span className={`preset-swatch swatch-${preset.id}`} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="tool-panel">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">FINE TUNING</p>
                    <h2>Adjustments</h2>
                  </div>
                  <button className="text-button" onClick={reset} disabled={!hasImage}>
                    Reset
                  </button>
                </div>
                {(
                  [
                    ['brightness', 'Brightness', 50, 150, '%'],
                    ['contrast', 'Contrast', 50, 160, '%'],
                    ['saturation', 'Saturation', 0, 180, '%'],
                    ['warmth', 'Temperature', -60, 60, ''],
                  ] as const
                ).map(([key, label, min, max, unit]) => (
                  <label className="range-control" key={key}>
                    <span>
                      <span>{label}</span>
                      <strong>
                        {adjustments[key]}
                        {unit}
                      </strong>
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={adjustments[key]}
                      disabled={!hasImage}
                      onChange={(e) => updateAdjustment(key, Number(e.target.value))}
                    />
                  </label>
                ))}
                <p className="tool-note">
                  Edits are applied to a fresh render of your original image. Moving a slider never
                  overwrites the source.
                </p>
              </section>
              <section className="tool-panel assistant-panel">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">LOCAL EDITING HELPER</p>
                    <h2>Describe the look</h2>
                  </div>
                  <span className="offline-tag">OFFLINE</span>
                </div>
                <p>
                  Suggest a basic recipe using words like “warmer”, “brighter”, “cinematic”, or
                  “muted”. No AI service is connected yet.
                </p>
                <div className="prompt-row">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && hasImage && suggestFromPrompt()}
                    placeholder="e.g. warm cinematic light"
                    disabled={!hasImage}
                  />
                  <button
                    onClick={suggestFromPrompt}
                    disabled={!hasImage || !prompt.trim()}
                    aria-label="Apply local recipe"
                  >
                    ↗
                  </button>
                </div>
                <p className="tool-note">
                  Generative scene placement and cloud AI are not enabled. No fabricated AI results.
                </p>
              </section>
            </aside>
          </div>
        )}
      </main>
      <footer className="studio-footer">
        <span>EVERY FRAME FIRST STUDIO</span>
        <span>Private by default · Processing stays in your browser</span>
        <span>AI features require a configured secure service</span>
      </footer>
    </div>
  );
}
