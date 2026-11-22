import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createCentralGateway } from './ai/central-gateway.mjs';

const BODY_LIMIT = 128 * 1024;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 8000;
const MAX_TOTAL_CHARS = 24000;
const RATE_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT = 20;
const MAX_RATE_BUCKETS = 10000;
const RATE_BUCKET_CLEANUP_INTERVAL = 256;
const UPSTREAM_TIMEOUT_MS = 30000;
const MINU_STUDIO_SUPABASE_URL = 'https://texgwxmizyxsdzcfsjpo.supabase.co';

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > BODY_LIMIT)
    throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT)
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
  }
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MESSAGES) {
    throw Object.assign(new Error('Provide between 1 and 20 messages.'), { status: 400 });
  }
  let total = 0;
  const messages = value.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !['user', 'assistant'].includes(item.role) ||
      typeof item.content !== 'string' ||
      !item.content.trim() ||
      item.content.length > MAX_MESSAGE_CHARS
    ) {
      throw Object.assign(
        new Error('Each message must have a valid user or assistant role and non-empty text.'),
        { status: 400 },
      );
    }
    total += item.content.length;
    return { role: item.role, content: item.content };
  });
  if (total > MAX_TOTAL_CHARS)
    throw Object.assign(new Error('Combined message content is too large.'), { status: 413 });
  if (messages.at(-1).role !== 'user')
    throw Object.assign(new Error('The final message must be from the user.'), { status: 400 });
  return messages;
}

function createTokenVerifier(config) {
  if (!config.authJwksUrl || !config.authIssuer || !config.authAudience) return null;
  let jwks;
  try {
    const jwksUrl = new URL(config.authJwksUrl);
    if (jwksUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(jwksUrl.hostname))
      return null;
    jwks = createRemoteJWKSet(jwksUrl);
  } catch {
    return null;
  }
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.authIssuer,
      audience: config.authAudience,
      algorithms: ['RS256', 'ES256'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub)
      throw new Error('Token subject is missing.');
    return payload.sub;
  };
}

export function createAiGatewayServer({
  config = {},
  fetchImpl = globalThis.fetch,
  verifyToken = createTokenVerifier(config),
  now = Date.now,
} = {}) {
  const rateBuckets = new Map();
  let requestsSinceCleanup = 0;
  const maxRateBuckets =
    Number.isSafeInteger(config.maxRateBuckets) && config.maxRateBuckets > 0
      ? config.maxRateBuckets
      : MAX_RATE_BUCKETS;
  return createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('x-request-id', requestId);
    res.setHeader('referrer-policy', 'no-referrer');

    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { status: 'ok', service: 'minu-studio-ai-gateway' });
    }
    if (
      req.method !== 'POST' ||
      ![
        '/api/ai/chat',
        '/api/ai/scene',
        '/api/ai/segment',
        '/api/ai/retouch',
        '/api/ai/cull-score',
      ].includes(req.url)
    ) {
      return sendJson(res, 404, { error: 'Not found.', requestId });
    }

    const origin = req.headers.origin;
    if (origin) {
      const expected = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      if (origin !== expected)
        return sendJson(res, 403, { error: 'Cross-origin requests are not allowed.', requestId });
    }
    if (!verifyToken)
      return sendJson(res, 503, {
        error: 'AI gateway authentication is not configured.',
        requestId,
      });
    if (
      !String(req.headers['content-type'] || '')
        .toLowerCase()
        .startsWith('application/json')
    ) {
      return sendJson(res, 415, { error: 'Content-Type must be application/json.', requestId });
    }

    const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(req.headers.authorization || '');
    if (!match)
      return sendJson(res, 401, { error: 'A valid sign-in session is required.', requestId });
    let userId;
    try {
      userId = await verifyToken(match[1]);
    } catch {
      return sendJson(res, 401, { error: 'The sign-in session is invalid or expired.', requestId });
    }

    const timestamp = now();
    requestsSinceCleanup += 1;
    const existingBucket = rateBuckets.get(userId);
    if (
      existingBucket === undefined &&
      (rateBuckets.size >= maxRateBuckets ||
        requestsSinceCleanup % RATE_BUCKET_CLEANUP_INTERVAL === 0)
    ) {
      for (const [id, candidate] of rateBuckets) {
        if (timestamp - candidate.start >= RATE_WINDOW_MS) rateBuckets.delete(id);
      }
    }

    let bucket = rateBuckets.get(userId);
    if (!bucket) {
      if (rateBuckets.size >= maxRateBuckets) {
        return sendJson(
          res,
          503,
          {
            error: 'AI request capacity is temporarily unavailable. Try again shortly.',
            requestId,
          },
          { 'retry-after': '60' },
        );
      }
      bucket = { start: timestamp, count: 0 };
      rateBuckets.set(userId, bucket);
    }
    if (timestamp - bucket.start >= RATE_WINDOW_MS) {
      bucket.start = timestamp;
      bucket.count = 0;
    }
    bucket.count += 1;
    if (bucket.count > (config.maxRequestsPerMinute || DEFAULT_RATE_LIMIT)) {
      return sendJson(
        res,
        429,
        { error: 'AI request limit reached. Try again shortly.', requestId },
        {
          'retry-after': String(Math.ceil((bucket.start + RATE_WINDOW_MS - timestamp) / 1000)),
        },
      );
    }

    if (
      !config.openRouterApiKey ||
      !config.defaultModel ||
      !config.allowedModels?.includes(config.defaultModel)
    ) {
      return sendJson(res, 503, {
        error: 'The server-side AI provider is not configured.',
        requestId,
      });
    }
    if (req.url === '/api/ai/scene') {
      return sendJson(res, 501, {
        error: 'Scene generation is not enabled. No image was uploaded.',
        requestId,
      });
    }
    if (req.url === '/api/ai/segment') {
      return sendJson(res, 501, {
        error: 'Background segmentation is not enabled. No image was uploaded.',
        requestId,
      });
    }
    if (req.url === '/api/ai/retouch') {
      return sendJson(res, 501, {
        error: 'Cloud retouching is not enabled. No image was uploaded.',
        requestId,
      });
    }
    if (req.url === '/api/ai/cull-score') {
      return sendJson(res, 501, {
        error: 'Cloud cull scoring is not enabled. No image was uploaded.',
        requestId,
      });
    }

    try {
      const body = await readJson(req);
      const messages = validateMessages(body?.messages);
      // All provider access now goes through the single policy-enforcing
      // gateway. No direct provider fetch remains in this server.
      const gateway = createCentralGateway({
        apiKey: config.openRouterApiKey,
        fetchImpl,
      });
      const result = await gateway.run({
        task: 'chat',
        modelId: config.defaultModel,
        messages,
        consentRef: body?.consentRef ?? null,
        userRef: userId,
        maxTokens: 500,
      });
      if (!result.ok) {
        const status =
          result.error?.code === 'credentials_missing' ||
          result.error?.code === 'privacy_policy_missing' ||
          result.error?.code === 'privacy_policy_unsupported' ||
          result.error?.code === 'live_execution_disabled'
            ? 503
            : 400;
        return sendJson(res, status, { error: result.error?.message ?? 'The request was rejected.', requestId });
      }
      return sendJson(res, 200, { content: result.content, requestId });
    } catch (error) {
      if (res.headersSent) return;
      const status = error?.status || 500;
      return sendJson(res, status, { error: status >= 500 ? 'The AI request could not be completed.' : error.message, requestId });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = {
    host: process.env.AI_GATEWAY_HOST || '127.0.0.1',
    port: Number(process.env.AI_GATEWAY_PORT || 18787),
    authJwksUrl: MINU_STUDIO_SUPABASE_URL + '/auth/v1/.well-known/jwks.json',
    authIssuer: MINU_STUDIO_SUPABASE_URL + '/auth/v1',
    authAudience: 'authenticated',
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    defaultModel: process.env.AI_DEFAULT_MODEL || 'qwen/qwen3.8-27b',
    allowedModels: (process.env.AI_ALLOWED_MODELS || 'qwen/qwen3.8-27b')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    appUrl: process.env.APP_URL,
  };
  const server = createAiGatewayServer({ config });
  server.listen(config.port, config.host, () => {
    process.stdout.write(`AI gateway listening on ${config.host}:${config.port}\n`);
  });
}
