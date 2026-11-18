// Client gallery delivery for Minu Studio — Supabase backend.
// Minu Studio uses the free-tier Supabase project (texgwxmizyxsdzcfsjpo):
//  - Photos upload to the public `gallery-shares` Storage bucket via the
//    `create-gallery-share` Edge Function, which verifies the caller's
//    Firebase ID token before writing (service role).
//  - Shares live in the `gallery_shares` table. RLS lets anyone read rows
//    whose expiry is in the future; no client can insert/update/delete.
//  - The /gallery/:shareId route is public — anyone with the link can view
//    an unexpired gallery.
// The "Local ZIP" mode remains fully offline and needs no Supabase at all.
import { getCurrentFirebaseIdToken, auth } from './firebase';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://texgwxmizyxsdzcfsjpo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fBFeavpYj1CI4L-lTAVj2Q_V41qHK2Z';

export interface GalleryPhotoInput {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface GalleryPhotoMeta {
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface GalleryShare {
  id: string;
  ownerUid: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  photos: GalleryPhotoMeta[];
}

const MAX_GALLERY_PHOTOS = 30;
const MAX_ITEM_BYTES = 6 * 1024 * 1024;

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('A saved photo has an unsupported stored format.');
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extensionFor(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_ ]+/gi, '-').trim() || 'photo';
  return base.slice(0, 80);
}

/** Uploads photos and creates the share row. Returns the share id. */
export async function createGalleryShare(
  name: string,
  expiresInDays: number,
  photos: GalleryPhotoInput[],
): Promise<{ id: string; share: GalleryShare }> {
  const user = auth?.currentUser;
  const idToken = await getCurrentFirebaseIdToken();
  if (!user || !idToken) throw new Error('Sign in is required before creating a client gallery.');
  if (!photos.length) throw new Error('Select at least one photo for the gallery.');
  if (photos.length > MAX_GALLERY_PHOTOS) {
    throw new Error(`A gallery can contain at most ${MAX_GALLERY_PHOTOS} photos.`);
  }
  for (const photo of photos) {
    const blob = dataUrlToBlob(photo.dataUrl);
    if (blob.size > MAX_ITEM_BYTES) {
      throw new Error(`“${photo.name}” exceeds the 6 MB per-photo limit.`);
    }
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-gallery-share`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      name: name.trim() || 'Client gallery',
      expiresInDays,
      photos: photos.map((photo) => ({
        name: photo.name,
        dataUrl: photo.dataUrl,
        width: photo.width,
        height: photo.height,
      })),
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    id?: string;
    name?: string;
    expiresAt?: string;
    photos?: number;
    error?: string;
  } | null;
  if (!response.ok || !body?.id) {
    throw new Error(body?.error || `Gallery service failed (${response.status}).`);
  }
  const createdAt = new Date().toISOString();
  return {
    id: body.id,
    share: {
      id: body.id,
      ownerUid: user.uid,
      name: body.name ?? (name.trim() || 'Client gallery'),
      createdAt,
      expiresAt: body.expiresAt ?? createdAt,
      photos: photos.map((photo) => ({
        name: photo.name,
        url: '',
        width: photo.width,
        height: photo.height,
      })),
    },
  };
}

interface GalleryRow {
  id: string;
  name: string;
  created_at: string;
  expires_at: string;
  photos: Array<GalleryPhotoMeta> | null;
}

/** Loads a share document for the public gallery route (anon read, RLS-gated by expiry). */
export async function getGalleryShare(id: string): Promise<GalleryShare | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/gallery_shares?id=eq.${encodeURIComponent(id)}&select=id,name,created_at,expires_at,photos`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: 'application/json',
      },
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => null)) as GalleryRow[] | null;
  const row = rows?.[0];
  if (!row) return null;
  return {
    id: row.id,
    ownerUid: '',
    name: row.name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    photos: Array.isArray(row.photos) ? row.photos : [],
  };
}

export function shareUrl(id: string): string {
  let base = import.meta.env.BASE_URL || '/';
  // The Pages build uses './', which would produce 'host./gallery/<id>'.
  if (base === './' || base === '.') base = '/';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${window.location.origin}${normalized}/gallery/${id}`;
}

export function isShareExpired(share: GalleryShare): boolean {
  return Date.parse(share.expiresAt) < Date.now();
}

/** Builds a fully offline, self-contained HTML gallery as a ZIP blob. */
export async function buildLocalGalleryZip(
  title: string,
  photos: GalleryPhotoInput[],
): Promise<Blob> {
  if (!photos.length) throw new Error('Select at least one photo for the gallery.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const folder = zip.folder('gallery');
  if (!folder) throw new Error('Could not create the gallery archive.');

  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const entries: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const blob = dataUrlToBlob(photo.dataUrl);
    const extension = extensionFor(blob.type);
    const fileName = `${String(index + 1).padStart(3, '0')}-${sanitizeFileName(photo.name)}.${extension}`;
    folder.file(fileName, await blob.arrayBuffer());
    entries.push(
      `<figure><img src="${escape(fileName)}" alt="${escape(photo.name)}" loading="lazy"><figcaption>${escape(photo.name)}</figcaption></figure>`,
    );
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
  body { margin: 0; background: #101114; color: #eee; font-family: system-ui, sans-serif; }
  header { padding: 1.5rem 2rem; border-bottom: 1px solid #2a2b30; }
  h1 { margin: 0; font-size: 1.3rem; font-weight: 600; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; padding: 1.5rem 2rem; }
  figure { margin: 0; background: #1a1b20; border-radius: 8px; overflow: hidden; }
  img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
  figcaption { padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #9a9ba2; }
</style>
</head>
<body>
<header><h1>${escape(title)}</h1></header>
<main>
${entries.join('\n')}
</main>
</body>
</html>`;
  folder.file('index.html', html);
  return zip.generateAsync({ type: 'blob' });
}
