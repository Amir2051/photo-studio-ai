import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Star,
  X,
  Check,
  Upload,
  Folder,
  Image as ImageIcon,
} from 'lucide-react';
import type { Photo } from '../lib/types';

const PICK = 'pro-pick';
const REJECT = 'pro-reject';
const ALBUM = 'pro-album:';

function getRating(photo: Photo): number {
  const tag = photo.tags.find((t) => t.startsWith('pro-rating:'));
  if (!tag) return 0;
  const n = Number(tag.split(':')[1]);
  return Number.isFinite(n) ? n : 0;
}
function isPick(photo: Photo): boolean {
  return photo.tags.includes(PICK);
}
function isReject(photo: Photo): boolean {
  return photo.tags.includes(REJECT);
}
function albumsOf(photo: Photo): string[] {
  return photo.tags.filter((t) => t.startsWith(ALBUM)).map((t) => t.slice(ALBUM.length));
}

export interface ImageLibraryProps {
  photos: Photo[];
  selectedId: string | null;
  onOpen: (photo: Photo) => void;
  onTogglePick: (photo: Photo) => void;
  onToggleReject: (photo: Photo) => void;
  onSetRating: (photo: Photo, rating: number) => void;
  onToggleAlbum: (photo: Photo, album: string) => void;
  onNewAlbum: (album: string) => void;
  onImportClick: () => void;
}

export default function ImageLibrary({
  photos,
  selectedId,
  onOpen,
  onTogglePick,
  onToggleReject,
  onSetRating,
  onToggleAlbum,
  onNewAlbum,
  onImportClick,
}: ImageLibraryProps): React.JSX.Element {
  const [albumFilter, setAlbumFilter] = useState<string>('all');
  const [rejectOnly, setRejectOnly] = useState(false);
  const [pickOnly, setPickOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const albums = useMemo(() => {
    const set = new Set<string>();
    for (const photo of photos) for (const album of albumsOf(photo)) set.add(album);
    return [...set].sort();
  }, [photos]);

  const visible = useMemo(
    () =>
      photos.filter((photo) => {
        if (rejectOnly && !isReject(photo)) return false;
        if (pickOnly && !isPick(photo)) return false;
        if (albumFilter !== 'all' && !albumsOf(photo).includes(albumFilter)) return false;
        return true;
      }),
    [photos, albumFilter, rejectOnly, pickOnly],
  );

  const selectedIndex = visible.findIndex((photo) => photo.id === selectedId);
  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex >= 0 && selectedIndex < visible.length - 1;

  const goPrev = () => { if (canPrev) onOpen(visible[selectedIndex - 1]); };
  const goNext = () => { if (canNext) onOpen(visible[selectedIndex + 1]); };

  // Keep the selected thumbnail in view when navigating.
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>(`[data-photo-id="${selectedId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <aside className="pro-library" aria-label="Image library">
      <div className="pro-library-head">
        <h2>Library</h2>
        <span className="count">{visible.length} shown</span>
        <button className="pro-icon-btn" type="button" onClick={onImportClick} title="Import photos" aria-label="Import photos">
          <Upload size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>Import</span>
        </button>
      </div>

      <div className="pro-filter-row" role="tablist" aria-label="Library filters">
        <button
          className={`pro-chip ${albumFilter === 'all' && !rejectOnly && !pickOnly ? 'active' : ''}`}
          onClick={() => { setAlbumFilter('all'); setRejectOnly(false); setPickOnly(false); }}
          role="tab"
          aria-selected={albumFilter === 'all' && !rejectOnly && !pickOnly}
        >
          All
        </button>
        <button
          className={`pro-chip ${pickOnly ? 'active' : ''}`}
          onClick={() => { setPickOnly((v) => !v); setRejectOnly(false); }}
          role="tab"
          aria-selected={pickOnly}
        >
          <Check size={11} aria-hidden="true" /> Picks
        </button>
        <button
          className={`pro-chip ${rejectOnly ? 'active' : ''}`}
          onClick={() => { setRejectOnly((v) => !v); setPickOnly(false); }}
          role="tab"
          aria-selected={rejectOnly}
        >
          <X size={11} aria-hidden="true" /> Rejected
        </button>
        {albums.map((album) => (
          <button
            key={album}
            className={`pro-chip ${albumFilter === album ? 'active' : ''}`}
            onClick={() => setAlbumFilter((current) => (current === album ? 'all' : album))}
            role="tab"
            aria-selected={albumFilter === album}
          >
            <Folder size={11} aria-hidden="true" /> {album}
          </button>
        ))}
        <button
          className="pro-chip"
          onClick={() => {
            const name = window.prompt('New album name')?.trim();
            if (name) onNewAlbum(name);
          }}
          title="Create an album and assign the open photo to it"
          aria-label="Create album"
        >
          <FolderPlus size={11} aria-hidden="true" /> New album
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="pro-empty">
          <ImageIcon size={22} strokeWidth={1.5} aria-hidden="true" />
          <p>
            <strong>No photos here yet</strong><br />
            Import a JPEG, PNG or WebP, or save an edit to your library.
          </p>
        </div>
      ) : (
        <div className="pro-filmstrip" ref={scrollRef} aria-label="Photo filmstrip">
          {visible.map((photo) => {
            const rating = getRating(photo);
            const picked = isPick(photo);
            const rejected = isReject(photo);
            const selected = photo.id === selectedId;
            return (
              <button
                key={photo.id}
                type="button"
                className={`pro-film ${selected ? 'selected' : ''}`}
                data-photo-id={photo.id}
                onClick={() => onOpen(photo)}
                aria-label={`Open ${photo.name}${selected ? ' (selected)' : ''}`}
                aria-pressed={selected}
              >
                <img src={photo.dataUrl} alt="" loading="lazy" />
                <span className="film-name">{photo.name}</span>
                <span className="film-flags" aria-hidden="true">
                  {rating > 0 && <span className="pro-flag rating">{rating}</span>}
                  {picked && <span className="pro-flag pick"><Check size={9} /></span>}
                  {rejected && <span className="pro-flag reject"><X size={9} /></span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="pro-library-foot">
        <div className="nav" aria-label="Navigate photos">
          <button type="button" onClick={goPrev} disabled={!canPrev} aria-label="Previous photo">
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={goNext} disabled={!canNext} aria-label="Next photo">
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
        <span>{selectedIndex >= 0 ? `${selectedIndex + 1} of ${visible.length}` : 'Nothing selected'}</span>
        <button
          type="button"
          onClick={() => selectedIndex >= 0 && onTogglePick(visible[selectedIndex])}
          disabled={selectedIndex < 0}
          aria-label="Toggle pick"
          title="Pick (mark as keeper)"
        >
          <Check size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => selectedIndex >= 0 && onToggleReject(visible[selectedIndex])}
          disabled={selectedIndex < 0}
          aria-label="Toggle reject"
          title="Reject"
        >
          <X size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => selectedIndex >= 0 && onSetRating(visible[selectedIndex], 0)}
          disabled={selectedIndex < 0}
          aria-label="Clear rating"
          title="Clear rating"
        >
          <Star size={12} aria-hidden="true" />
        </button>
      </div>

      {/* Rating strip: rate + assign album for the selected photo */}
      {selectedIndex >= 0 && (
        <div className="pro-library-foot" style={{ borderTop: 0, paddingTop: 0 }}>
          <span aria-hidden="true" style={{ fontSize: '10px', color: 'var(--pro-text-lo)' }}>Rate</span>
          <div className="nav" role="radiogroup" aria-label="Photo rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={getRating(visible[selectedIndex]) === n}
                onClick={() => onSetRating(visible[selectedIndex], n)}
                title={`${n} star${n > 1 ? 's' : ''}`}
                aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                style={{ color: getRating(visible[selectedIndex]) >= n ? 'var(--pro-accent-hi)' : 'var(--pro-text-lo)' }}
              >
                <Star size={13} fill={getRating(visible[selectedIndex]) >= n ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            ))}
          </div>
          <select
            value=""
            onChange={(event) => {
              const album = event.target.value;
              if (album) onToggleAlbum(visible[selectedIndex], album);
            }}
            aria-label="Assign selected photo to album"
            title="Assign selected photo to album"
            style={{ height: 24, fontSize: 10, borderRadius: 6, border: '1px solid var(--pro-line)', background: 'var(--pro-panel-2)', color: 'var(--pro-text-mid)' }}
          >
            <option value="">+ Album</option>
            {albums.map((album) => {
              const inAlbum = albumsOf(visible[selectedIndex]).includes(album);
              return (
                <option key={album} value={album}>
                  {inAlbum ? '✓ ' : ''}{album}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => selectedIndex >= 0 && onSetRating(visible[selectedIndex], 0)}
            aria-label="Clear rating"
          >
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      )}
    </aside>
  );
}
