// Minu Studio — read a client gallery share.
// Public by link: anyone with the share id can view an UNEXPIRED gallery.
// Expired shares and unknown ids both return 404. Photo URLs are short-lived
// signed Storage URLs; nothing else is exposed (no owner identifiers).
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SIGNED_URL_TTL_SECONDS = 3600;

function cors(): HeadersInit {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors() });
}

const PUBLIC_OBJECT_PREFIX = '/storage/v1/object/public/gallery-shares/';
const SIGNED_OBJECT_PREFIX = '/storage/v1/object/sign/gallery-shares/';

function pathFromStoredUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = new RegExp('(?:' + [PUBLIC_OBJECT_PREFIX, SIGNED_OBJECT_PREFIX].join('|') + ')([^?]+)(?:\\?.*)?$').exec(
    value,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

interface StoredPhoto {
  name?: unknown;
  url?: unknown;
  path?: unknown;
  width?: unknown;
  height?: unknown;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (request.method !== 'POST')
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY)
    return jsonResponse({ error: 'Server is not configured.' }, 503);

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return jsonResponse({ error: 'Not found.' }, 404);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: row, error } = await supabase
    .from('gallery_shares')
    .select('id, name, expires_at, photos')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return jsonResponse({ error: 'Not found.' }, 404);
  if (Date.parse(String(row.expires_at)) <= Date.now()) {
    return jsonResponse({ error: 'Not found.' }, 404);
  }

  const photos = Array.isArray(row.photos) ? (row.photos as StoredPhoto[]) : [];
  const paths = photos.map((photo) => {
    if (typeof photo.path === 'string' && photo.path.trim()) return photo.path.trim();
    return pathFromStoredUrl(photo.url);
  });
  const presentPaths = paths.filter((path): path is string => Boolean(path));

  let signedByPath = new Map<string, string>();
  if (presentPaths.length) {
    const { data: signedList } = await supabase.storage
      .from('gallery-shares')
      .createSignedUrls(presentPaths, SIGNED_URL_TTL_SECONDS);
    for (const item of signedList ?? []) {
      if (item.signedUrl && item.path) signedByPath.set(item.path, item.signedUrl);
    }
  }

  const resultPhotos = photos.map((photo, index) => {
    const path = paths[index];
    const url = (path && signedByPath.get(path)) || '';
    return {
      name: typeof photo.name === 'string' ? photo.name : 'photo-' + (index + 1),
      url,
      width: Number(photo.width) || 0,
      height: Number(photo.height) || 0,
    };
  });

  return jsonResponse({
    id: row.id,
    name: row.name,
    expiresAt: row.expires_at,
    photos: resultPhotos,
  });
});
