import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const MAX_JSON_BYTES = 12 * 1024 * 1024;
const MAX_FRAME_BYTES = 1.4 * 1024 * 1024;
const MAX_TOTAL_FRAME_BYTES = 8 * 1024 * 1024;
const MAX_FRAMES = 8;
const MAX_CHAT_CHARS = 24000;
const RATE_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 20;
const DEFAULT_ALLOWED_ORIGINS = [
  'https://every-frame-first-studio.onrender.com',
  'https://studio.safenestt.com',
];

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_JSON_BYTES) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
  }
}

function createFirebaseVerifier(projectId) {
  if (!projectId) return null;
  const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: 'https://securetoken.google.com/' + projectId,
      audience: projectId,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Firebase token subject missing.');
    return payload.sub;
  };
}

function validFrame(frame) {
  if (!frame || typeof frame !== 'object') return false;
  if (typeof frame.image_data_url !== 'string') return false;
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(frame.image_data_url);
  if (!match) return false;
  const bytes = Buffer.byteLength(match[1], 'base64');
  return bytes > 0 && bytes <= MAX_FRAME_BYTES &&
    Number.isFinite(frame.timestamp_seconds) &&
    frame.timestamp_seconds >= 0 &&
    typeof frame.clip_name === 'string' &&
    frame.clip_name.length <= 240;
}

export function createMiaProxyServer({
  config = {},
  fetchImpl = globalThis.fetch,
  verifyToken = createFirebaseVerifier(config.firebaseProjectId),
  now = Date.now,
} = {}) {
  const allowedOrigins = config.allowedOrigins || DEFAULT_ALLOWED_ORIGINS;
  const rateLimits = new Map();

  return createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('x-request-id', requestId);
    const origin = req.headers.origin || '';
    const corsHeaders = {};
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['access-control-allow-origin'] = origin;
      corsHeaders['access-control-allow-methods'] = 'GET, POST, OPTIONS';
      corsHeaders['access-control-allow-headers'] = 'Authorization, Content-Type';
      corsHeaders['access-control-max-age'] = '600';
      corsHeaders.vary = 'Origin';
    }
    if (req.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.includes(origin)) return json(res, 403, { error: 'Origin not allowed.', requestId });
      res.writeHead(204, corsHeaders);
      return res.end();
    }
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { status: 'ok', service: 'every-frame-first-mia-proxy' });
    }
    if (origin && !allowedOrigins.includes(origin)) return json(res, 403, { error: 'Origin not allowed.', requestId });
    if (!verifyToken || !config.serviceApiKey || !config.rzAgentUrl) {
      return json(res, 503, { error: 'MIA proxy authentication or upstream configuration is unavailable.', requestId }, corsHeaders);
    }
    const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(req.headers.authorization || '');
    if (!match) return json(res, 401, { error: 'Sign in to Every Frame First Studio to use MIA.', requestId }, corsHeaders);

    let userId;
    try {
      userId = await verifyToken(match[1]);
    } catch {
      return json(res, 401, { error: 'Your Studio session is invalid or expired. Sign in again.', requestId }, corsHeaders);
    }

    const timestamp = now();
    let bucket = rateLimits.get(userId);
    if (!bucket || timestamp - bucket.start >= RATE_WINDOW_MS) {
      bucket = { start: timestamp, count: 0 };
      rateLimits.set(userId, bucket);
    }
    bucket.count += 1;
    if (bucket.count > (config.maxRequestsPerMinute || DEFAULT_RATE_LIMIT)) {
      return json(res, 429, { error: 'MIA request limit reached. Try again shortly.', requestId }, { ...corsHeaders, 'retry-after': '60' });
    }

    const upstreamBase = config.rzAgentUrl.replace(/\/$/, '');
    const upstreamHeaders = { 'X-Api-Key': config.serviceApiKey, 'X-Studio-User-Id': userId, 'Content-Type': 'application/json' };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 45000);
    try {
      if (req.method === 'GET' && req.url === '/api/mia/vision/status') {
        const upstream = await fetchImpl(upstreamBase + '/v1/studio/vision/status', {
          method: 'GET', headers: { 'X-Api-Key': config.serviceApiKey, 'X-Studio-User-Id': userId }, signal: controller.signal,
        });
        const data = await upstream.json().catch(() => ({}));
        return json(res, upstream.status, data, corsHeaders);
      }

      if (req.method !== 'POST') return json(res, 404, { error: 'Not found.', requestId }, corsHeaders);
      if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
        return json(res, 415, { error: 'Content-Type must be application/json.', requestId }, corsHeaders);
      }
      const body = await readJson(req);

      if (req.url === '/api/mia/chat') {
        if (typeof body?.message !== 'string' || !body.message.trim() || body.message.length > 8000 ||
            typeof body?.system !== 'string' || body.system.length > MAX_CHAT_CHARS ||
            (body.session_id != null && (typeof body.session_id !== 'string' || body.session_id.length > 200))) {
          return json(res, 400, { error: 'MIA chat request is invalid or too large.', requestId }, corsHeaders);
        }
        const upstream = await fetchImpl(upstreamBase + '/v1/chat', {
          method: 'POST', headers: upstreamHeaders,
          body: JSON.stringify({ message: body.message, system: body.system, ...(body.session_id ? { session_id: body.session_id } : {}) }),
          signal: controller.signal,
        });
        const data = await upstream.json().catch(() => ({}));
        return json(res, upstream.status, data, corsHeaders);
      }

      if (req.url === '/api/mia/vision/analyze') {
        const frames = body?.frames;
        if (!Array.isArray(frames) || frames.length < 1 || frames.length > MAX_FRAMES ||
            typeof body?.instruction !== 'string' || body.instruction.length > 2000 || !frames.every(validFrame)) {
          return json(res, 400, { error: 'Select between 1 and 8 valid still frames for visual analysis.', requestId }, corsHeaders);
        }
        const totalBytes = frames.reduce((sum, frame) => sum + Buffer.byteLength(frame.image_data_url.split(',')[1], 'base64'), 0);
        if (totalBytes > MAX_TOTAL_FRAME_BYTES) {
          return json(res, 413, { error: 'Selected frames exceed the 8 MB total limit.', requestId }, corsHeaders);
        }
        const upstream = await fetchImpl(upstreamBase + '/v1/studio/vision/analyze', {
          method: 'POST', headers: upstreamHeaders, body: JSON.stringify(body), signal: controller.signal,
        });
        const data = await upstream.json().catch(() => ({}));
        return json(res, upstream.status, data, corsHeaders);
      }

      return json(res, 404, { error: 'Not found.', requestId }, corsHeaders);
    } catch (error) {
      const status = error?.name === 'AbortError' ? 504 : error?.status || 502;
      const message = status === 504 ? 'The MIA service timed out.' : status === 413 ? error.message : 'The MIA service could not complete the request.';
      return json(res, status, { error: message, requestId }, corsHeaders);
    } finally {
      clearTimeout(timeout);
    }
  });
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const config = {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 10000),
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    serviceApiKey: process.env.STUDIO_MIA_SERVICE_API_KEY,
    rzAgentUrl: process.env.RZ_AGENT_URL || 'https://rz-ai.safenestt.com',
    allowedOrigins: (process.env.STUDIO_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(',')).split(',').map((item) => item.trim()).filter(Boolean),
    maxRequestsPerMinute: Number(process.env.MIA_RATE_LIMIT_PER_MINUTE || DEFAULT_RATE_LIMIT),
  };
  createMiaProxyServer({ config }).listen(config.port, config.host, () => {
    process.stdout.write('Every Frame First MIA proxy listening on ' + config.host + ':' + config.port + '\n');
  });
}
