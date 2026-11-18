// Minu Studio — create a client gallery share.
// Verifies the caller's Supabase access token (auth.getUser), then uploads the
// selected photos to the PRIVATE gallery-shares bucket and inserts a
// gallery_shares row via the service role. Anonymous readers get time-limited
// signed URLs through the get-gallery-share function, never direct access.
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

function fail(status: number, message = 'The request could not be completed.'): Response {
  return jsonResponse({ error: message }, status);
}

function base64ToBytes(input: string): Uint8Array | null {
  try {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function verifySupabaseAccessToken(token: string): Promise<{ uid: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Server is not configured.');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error('Invalid or expired session.');
  return { uid: data.user.id };
}

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

function sniffMime(mime: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png')
    return (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    );
  if (mime === 'image/webp')
    return (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    );
  return false;
}

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
  if (request.method !== 'POST') return fail(405, 'Method not allowed.');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return fail(503, 'Server is not configured.');

  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > MAX_BODY_BYTES) return fail(413, 'Request body is too large.');

  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9\-_.]+)$/.exec(authorization);
  if (!match) return fail(401, 'A sign-in session is required.');

  let uid: string;
  try {
    ({ uid } = await verifySupabaseAccessToken(match[1]));
  } catch {
    return fail(401, 'Invalid or expired session.');
  }

  let body: {
    name?: unknown;
    expiresInDays?: unknown;
    photos?: Array<{ name?: unknown; dataUrl?: unknown; width?: unknown; height?: unknown }>;
  };
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Request body must be valid JSON.');
  }

  const name =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : 'Client gallery';
  const expiryDays = Number(body.expiresInDays);
  if (!Number.isFinite(expiryDays) || expiryDays < 1 || expiryDays > 90) {
    return fail(400, 'expiresInDays must be between 1 and 90.');
  }
  if (!Array.isArray(body.photos) || body.photos.length === 0 || body.photos.length > MAX_PHOTOS) {
    return fail(400, 'Provide between 1 and 30 photos.');
  }

  // Validate everything before uploading anything so a bad photo can never
  // leave orphaned objects behind.
  const decoded: Array<{
    photoName: string;
    mime: string;
    bytes: Uint8Array;
    extension: string;
    width: number;
    height: number;
  }> = [];
  for (const [index, photo] of body.photos.entries()) {
    const photoName =
      typeof photo.name === 'string' && photo.name.trim() ? photo.name.trim() : 'photo-' + (index + 1);
    const dataUrl = typeof photo.dataUrl === 'string' ? photo.dataUrl : '';
    const parsed = IMAGE_DATA_URL.exec(dataUrl);
    if (!parsed) return fail(400, 'A photo has an unsupported format.');
    const mime = 'image/' + parsed[1];
    const bytes = base64ToBytes(parsed[2]);
    if (!bytes || bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
      return fail(400, 'A photo exceeds the 6 MB limit.');
    }
    if (!sniffMime(mime, bytes)) return fail(400, 'A photo failed content validation.');
    decoded.push({
      photoName,
      mime,
      bytes,
      extension: extensionFor(mime),
      width: Math.max(0, Math.round(Number(photo.width) || 0)),
      height: Math.max(0, Math.round(Number(photo.height) || 0)),
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const shareId = crypto.randomUUID();
  const uploaded: Array<{ name: string; path: string; width: number; height: number }> = [];
  const uploadedPaths: string[] = [];

  // Upload with all-or-nothing semantics: on any failure, remove what we wrote.
  for (const [index, item] of decoded.entries()) {
    const path =
      shareId + '/' + String(index + 1).padStart(3, '0') + '-' + sanitizeFileName(item.photoName) + '.' + item.extension;
    const { error: uploadError } = await supabase.storage
      .from('gallery-shares')
      .upload(path, item.bytes.buffer, { contentType: item.mime, upsert: false });
    if (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from('gallery-shares').remove(uploadedPaths);
      return fail(502, 'Upload failed. Please try again.');
    }
    uploadedPaths.push(path);
    uploaded.push({ name: item.photoName, path, width: item.width, height: item.height });
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
    await supabase.storage.from('gallery-shares').remove(uploadedPaths);
    return fail(500, 'Could not save the gallery.');
  }

  return jsonResponse({ id: shareId, name, expiresAt, photos: uploaded.length });
});
