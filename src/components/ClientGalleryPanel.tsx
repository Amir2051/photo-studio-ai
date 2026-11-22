import React, { useEffect, useMemo, useState } from 'react';
import type { Photo } from '../lib/types';
import { buildLocalGalleryZip, createGalleryShare, shareUrl } from '../lib/gallery';
import { getSupabaseUser } from '../lib/supabase';

interface ClientGalleryPanelProps {
  photos: Photo[];
}

export default function ClientGalleryPanel({ photos }: ClientGalleryPanelProps): React.JSX.Element {
  const [galleryName, setGalleryName] = useState('Client gallery');
  const [expiryDays, setExpiryDays] = useState(30);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getSupabaseUser().then((user) => {
      if (!cancelled) setSignedIn(Boolean(user));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    // Drop selections for photos that no longer exist in the library.
    setSelectedIds((current) => {
      const ids = new Set(photos.map((photo) => photo.id));
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [photos]);

  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedIds.has(photo.id)),
    [photos, selectedIds],
  );

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createShareLink = async () => {
    setBusy(true);
    setMessage(null);
    setLink(null);
    try {
      const result = await createGalleryShare(
        galleryName,
        expiryDays,
        selectedPhotos.map((photo) => ({
          name: photo.name,
          dataUrl: photo.dataUrlHigh || photo.dataUrl,
          width: photo.dimensions.width,
          height: photo.dimensions.height,
        })),
      );
      setLink(shareUrl(result.id));
      setMessage(
        `Gallery “${result.share.name}” published with ${result.share.photos.length} photo(s). Link expires ${new Date(result.share.expiresAt).toLocaleDateString()}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the gallery.');
    } finally {
      setBusy(false);
    }
  };

  const createLocalZip = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await buildLocalGalleryZip(
        galleryName.trim() || 'Client gallery',
        selectedPhotos.map((photo) => ({
          name: photo.name,
          dataUrl: photo.dataUrlHigh || photo.dataUrl,
          width: photo.dimensions.width,
          height: photo.dimensions.height,
        })),
      );
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.download = `${galleryName.replace(/[^a-z0-9-_ ]+/gi, '-').trim() || 'gallery'}.zip`;
      linkElement.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setMessage('Offline gallery ZIP downloaded (index.html + photos, no server needed).');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not build the gallery ZIP.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tool-panel gallery-panel" id="deliver-workspace" data-panel="deliver">
      <div className="section-title">
        <div>
          <p className="eyebrow">DELIVER</p>
          <h2>Client gallery</h2>
        </div>
        <span>{selectedPhotos.length} selected</span>
      </div>
      <p className="tool-note">
        Package saved-library photos as a private client gallery. Share links are hosted on
        Supabase (free tier, no billing required) and expire automatically; the ZIP option
        produces a fully offline gallery — nothing leaves this device.
      </p>
      {!signedIn && (
        <p className="tool-note">
          Sharing links require sign-in; the local ZIP works offline.
        </p>
      )}
      <input
        className="filter-search"
        value={galleryName}
        onChange={(event) => setGalleryName(event.target.value)}
        placeholder="Gallery name (e.g. Smith wedding — finals)"
        aria-label="Gallery name"
      />
      <div className="gallery-panel-controls">
        <label>
          Expires{' '}
          <select
            value={expiryDays}
            onChange={(event) => setExpiryDays(Number(event.target.value))}
          >
            <option value={7}>in 7 days</option>
            <option value={30}>in 30 days</option>
            <option value={90}>in 90 days</option>
          </select>
        </label>
        <button className="text-button" onClick={() => setSelectedIds(new Set(photos.map((p) => p.id)))}>
          Select all
        </button>
        <button className="text-button" onClick={() => setSelectedIds(new Set())}>
          Clear
        </button>
      </div>
      {photos.length === 0 ? (
        <p className="tool-note">
          No saved photos yet. Use “Save to library” on exports first, then select them here.
        </p>
      ) : (
        <div className="gallery-photo-grid">
          {photos.map((photo) => (
            <label key={photo.id} className="gallery-photo-item">
              <input
                type="checkbox"
                checked={selectedIds.has(photo.id)}
                onChange={() => toggle(photo.id)}
              />
              <img src={photo.dataUrl} alt={photo.name} loading="lazy" />
              <span title={photo.name}>{photo.name}</span>
            </label>
          ))}
        </div>
      )}
      <div className="retouch-actions">
        <button
          className="button button-primary"
          onClick={() => void createShareLink()}
          disabled={busy || !selectedPhotos.length || !signedIn}
        >
          {busy ? 'Publishing…' : 'Create share link'}
        </button>
        <button
          className="button button-quiet"
          onClick={() => void createLocalZip()}
          disabled={busy || !selectedPhotos.length}
        >
          Local ZIP instead
        </button>
      </div>
      {link && (
        <div className="gallery-share-result">
          <label htmlFor="gallery-share-url">Share link (send to your client)</label>
          <div className="gallery-share-row">
            <input id="gallery-share-url" readOnly value={link} onFocus={(event) => event.target.select()} />
            <button
              className="button button-quiet"
              onClick={() => navigator.clipboard?.writeText(link).then(() => setMessage('Link copied.'))}
            >
              Copy
            </button>
          </div>
        </div>
      )}
      {message && <p className="tool-note" role="status">{message}</p>}
    </section>
  );
}
