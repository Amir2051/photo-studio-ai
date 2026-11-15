import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMiaProxyServer } from '../server/mia-proxy.mjs';

const origin = 'https://every-frame-first-studio.onrender.com';
const serviceKey = 'test-service-key';
let server;
let baseUrl;

async function start(options = {}) {
  server = createMiaProxyServer({
    config: {
      firebaseProjectId: 'photo-editor-rz',
      serviceApiKey: serviceKey,
      rzAgentUrl: 'https://rz-ai.safenestt.com',
      allowedOrigins: [origin],
      ...options.config,
    },
    verifyToken: options.verifyToken ?? (async (token) => {
      if (token !== 'valid-firebase-token') throw new Error('invalid');
      return 'firebase-user-123';
    }),
    fetchImpl: options.fetchImpl ?? vi.fn(async () => Response.json({ reply: 'Hello from MIA', session_id: 's1' })),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  return server;
}

afterEach(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  server = undefined;
});

describe('Every Frame First MIA proxy', () => {
  it('serves a health check without exposing configuration', async () => {
    await start();
    const response = await fetch(baseUrl + '/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'every-frame-first-mia-proxy' });
  });

  it('rejects requests without a valid Studio Firebase bearer token', async () => {
    await start();
    const response = await fetch(baseUrl + '/api/mia/chat', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello', system: 'system' }),
    });
    expect(response.status).toBe(401);
  });

  it('forwards chat with the server-only RZ service credential', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ reply: 'Hello from RZ', session_id: 'session-2' }));
    await start({ fetchImpl });
    const response = await fetch(baseUrl + '/api/mia/chat', {
      method: 'POST',
      headers: { origin, authorization: 'Bearer valid-firebase-token', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Help edit this', system: 'Project metadata only' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reply: 'Hello from RZ' });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0]).toBe('https://rz-ai.safenestt.com/v1/chat');
    expect(fetchImpl.mock.calls[0][1].headers['X-Api-Key']).toBe(serviceKey);
  });

  it('rejects more than eight frames before forwarding them', async () => {
    const fetchImpl = vi.fn();
    await start({ fetchImpl });
    const frame = { timestamp_seconds: 1, clip_name: 'clip', image_data_url: 'data:image/jpeg;base64,YWJj' };
    const response = await fetch(baseUrl + '/api/mia/vision/analyze', {
      method: 'POST',
      headers: { origin, authorization: 'Bearer valid-firebase-token', 'content-type': 'application/json' },
      body: JSON.stringify({ instruction: 'Analyze', frames: Array.from({ length: 9 }, () => frame) }),
    });
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects unapproved browser origins', async () => {
    await start();
    const response = await fetch(baseUrl + '/api/mia/vision/status', {
      headers: { origin: 'https://attacker.example', authorization: 'Bearer valid-firebase-token' },
    });
    expect(response.status).toBe(403);
  });
});
