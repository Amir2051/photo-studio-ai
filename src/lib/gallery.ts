// Client gallery delivery for Minu Studio.
// Two delivery modes:
//  1. Firebase share link — photos uploaded to Firebase Storage (photo-editor-rz),
//     a share document written to Firestore, returned as an unguessable URL.
//     Anyone with the link can view until the expiry; uploads require sign-in.
//  2. Local gallery ZIP — a fully offline, self-contained HTML gallery.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';

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

const COLLECTION = 'galleryShares';
const MAX_GALLERY_PHOTOS = 100;
const MAX_ITEM_BYTES = 25 * 1024 * 1024;

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

/** Uploads photos and creates the share document. Returns the share id. */
export async function createGalleryShare(
  name: string,
  expiresInDays: number,
  photos: GalleryPhotoInput[],
): Promise<{ id: string; share: GalleryShare }> {
  if (!storage || !db) {
    throw new Error('Firebase Storage/Firestore is not configured for this build.');
  }
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in is required before creating a client gallery.');
  if (!photos.length) throw new Error('Select at least one photo for the gallery.');
  if (photos.length > MAX_GALLERY_PHOTOS) {
    throw new Error(`A gallery can contain at most ${MAX_GALLERY_PHOTOS} photos.`);
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  const uploaded: GalleryPhotoMeta[] = [];
  for (const [index, photo] of photos.entries()) {
    const blob = dataUrlToBlob(photo.dataUrl);
    if (blob.size > MAX_ITEM_BYTES) {
      throw new Error(`“${photo.name}” exceeds the 25 MB per-photo limit.`);
    }
    const extension = extensionFor(blob.type);
    const path = `gallery-shares/${id}/${String(index + 1).padStart(3, '0')}-${sanitizeFileName(photo.name)}.${extension}`;
    await uploadBytes(ref(storage, path), blob, { contentType: blob.type });
    uploaded.push({
      name: photo.name,
      url: await getDownloadURL(ref(storage, path)),
      width: photo.width,
      height: photo.height,
    });
  }

  const share: GalleryShare = {
    id,
    ownerUid: user.uid,
    name: name.trim() || 'Client gallery',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    photos: uploaded,
  };
  await setDoc(doc(db, COLLECTION, id), share);
  return { id, share };
}

/** Loads a share document for the public gallery route. */
export async function getGalleryShare(id: string): Promise<GalleryShare | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  if (!snapshot.exists()) return null;
  return snapshot.data() as GalleryShare;
}

export function shareUrl(id: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/gallery/${id}`;
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
