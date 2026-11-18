// Minu Studio — create a client gallery share.
// Verifies the caller's Supabase access token (auth.getUser),
// then uploads the selected photos to the public gallery-shares bucket and
// inserts a gallery_shares row via the service role. No client can write
// directly; reads for unexpired shares are public by link.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_PHOTOS = 30;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const MAX_BODY_BYTES = 24 * 1024 * 1024;

function cors(): HeadersInit {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type, apikey',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors() });
}

function base64ToBytes(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifySupabaseAccessToken(token: string): Promise<{ uid: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Server is not configured.');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error('Invalid or expired session.');
  return { uid: data.user.id };
}

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

function sanitizeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_ ]+/gi, '-').trim() || 'photo';
  return base.slice(0, 80);
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY)
    return jsonResponse({ error: 'Server is not configured.' }, 503);

  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > MAX_BODY_BYTES) return jsonResponse({ error: 'Request body is too large.' }, 413);

  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9\-_.]+)$/.exec(authorization);
  if (!match) return jsonResponse({ error: 'A sign-in session is required.' }, 401);

  let uid: string;
  try {
    ({ uid } = await verifySupabaseAccessToken(match[1]));
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Invalid sign-in session.' },
      401,
    );
  }

  let body: {
    name?: unknown;
    expiresInDays?: unknown;
    photos?: Array<{ name?: unknown; dataUrl?: unknown; width?: unknown; height?: unknown }>;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : 'Client gallery';
  const expiryDays = Number(body.expiresInDays);
  if (!Number.isFinite(expiryDays) || expiryDays < 1 || expiryDays > 90)
    return jsonResponse({ error: 'expiresInDays must be between 1 and 90.' }, 400);
  if (!Array.isArray(body.photos) || body.photos.length === 0 || body.photos.length > MAX_PHOTOS)
    return jsonResponse({ error: 'Provide between 1 and ' + MAX_PHOTOS + ' photos.' }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const shareId = crypto.randomUUID();
  const uploaded: Array<{ name: string; url: string; width: number; height: number }> = [];

  for (const [index, photo] of body.photos.entries()) {
    const photoName = typeof photo.name === 'string' && photo.name.trim() ? photo.name.trim() : 'photo-' + (index + 1);
    const dataUrl = typeof photo.dataUrl === 'string' ? photo.dataUrl : '';
    const parsed = IMAGE_DATA_URL.exec(dataUrl);
    if (!parsed) return jsonResponse({ error: 'Photo "' + photoName + '" has an unsupported format.' }, 400);
    const mime = 'image/' + parsed[1];
    const bytes = base64ToBytes(parsed[2]);
    if (bytes.length > MAX_PHOTO_BYTES)
      return jsonResponse({ error: 'Photo "' + photoName + '" exceeds the 6 MB limit.' }, 400);
    const width = Math.max(0, Math.round(Number(photo.width) || 0));
    const height = Math.max(0, Math.round(Number(photo.height) || 0));

    const path = shareId + '/' + String(index + 1).padStart(3, '0') + '-' + sanitizeFileName(photoName) + '.' + extensionFor(mime);
    const { error: uploadError } = await supabase.storage
      .from('gallery-shares')
      .upload(path, bytes.buffer, { contentType: mime, upsert: false });
    if (uploadError) {
      return jsonResponse({ error: 'Upload failed for "' + photoName + '": ' + uploadError.message }, 502);
    }
    uploaded.push({
      name: photoName,
      url: SUPABASE_URL + '/storage/v1/object/public/gallery-shares/' + path,
      width,
      height,
    });
  }

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const { error: insertError } = await supabase.from('gallery_shares').insert({
    id: shareId,
    owner_uid: uid,
    name,
    expires_at: expiresAt,
    photos: uploaded,
  });
  if (insertError) {
    return jsonResponse({ error: 'Could not save the gallery: ' + insertError.message }, 500);
  }

  return jsonResponse({ id: shareId, name, expiresAt, photos: uploaded.length });
});
