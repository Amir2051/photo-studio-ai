import { Link, useParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { getGalleryShare, isShareExpired, type GalleryShare } from '../lib/gallery';
import './Gallery.css';

export default function Gallery(): React.JSX.Element {
  const { shareId } = useParams<{ shareId: string }>();
  const [share, setShare] = useState<GalleryShare | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'expired' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;
    if (!shareId) {
      setStatus('missing');
      return;
    }
    getGalleryShare(shareId)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setStatus('missing');
          return;
        }
        if (isShareExpired(loaded)) {
          setStatus('expired');
          return;
        }
        setShare(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (status === 'loading') {
    return (
      <main className="gallery-shell">
        <p className="gallery-note">Loading gallery…</p>
      </main>
    );
  }
  if (status === 'missing') {
    return (
      <main className="gallery-shell">
        <h1>Gallery not found</h1>
        <p className="gallery-note">This link is invalid or the gallery was removed.</p>
        <Link className="gallery-link" to="/">
          Go to Minu Studio
        </Link>
      </main>
    );
  }
  if (status === 'expired') {
    return (
      <main className="gallery-shell">
        <h1>This gallery has expired</h1>
        <p className="gallery-note">Ask the photographer for a fresh link.</p>
        <Link className="gallery-link" to="/">
          Go to Minu Studio
        </Link>
      </main>
    );
  }
  if (status === 'error' || !share) {
    return (
      <main className="gallery-shell">
        <h1>Could not load this gallery</h1>
        <p className="gallery-note">Firebase may be unavailable. Try again later.</p>
        <Link className="gallery-link" to="/">
          Go to Minu Studio
        </Link>
      </main>
    );
  }

  return (
    <main className="gallery-shell">
      <header className="gallery-header">
        <div>
          <p className="gallery-brand">MINU STUDIO</p>
          <h1>{share.name}</h1>
          <p className="gallery-note">
            {share.photos.length} photo{share.photos.length === 1 ? '' : 's'} · expires{' '}
            {new Date(share.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </header>
      <div className="gallery-grid">
        {share.photos.map((photo, index) => (
          <figure key={index}>
            <img src={photo.url} alt={photo.name} loading="lazy" />
            <figcaption>
              <span>{photo.name}</span>
              <a href={photo.url} download={photo.name}>
                Download
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
