import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMiaProxyServer } from '../server/mia-proxy.mjs';

const origin = 'https://every-frame-first-studio.onrender.com';
let server;
let baseUrl;
let gateway;

async function start(options = {}) {
  gateway = options.gateway ?? {
    run: vi.fn(async () => ({
      ok: false,
      error: { code: 'live_execution_disabled', message: 'Qwen live execution is disabled. No request was sent.' },
    })),
  };
  server = createMiaProxyServer({
    config: {
      openRouterApiKey: 'test-openrouter-key',
      allowedOrigins: [origin],
      ...options.config,
    },
    verifyToken: options.verifyToken ?? (async (token) => {
      if (token !== 'valid-token') throw new Error('invalid');
      return 'user-123';
    }),
    fetchImpl: options.fetchImpl ?? vi.fn(),
    gateway,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  return server;
}

afterEach(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  server = undefined;
  gateway = undefined;
});

describe('Mini Studio MIA OpenRouter gateway', () => {
  it('serves a health check without exposing configuration', async () => {
    await start();
    const response = await fetch(baseUrl + '/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'minu-studio-mia-proxy' });
  });

  it('rejects requests without a valid Studio bearer token', async () => {
    await start();
    const response = await fetch(baseUrl + '/api/mia/chat', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello', system: 'system' }),
    });
    expect(response.status).toBe(401);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  it('routes MIA chat to the selected Qwen model through the central gateway', async () => {
    const fetchImpl = vi.fn();
    await start({ fetchImpl });
    const response = await fetch(baseUrl + '/api/mia/chat', {
      method: 'POST',
      headers: { origin, authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Help edit this', system: 'Project metadata only' }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'live_execution_disabled' });
    expect(gateway.run).toHaveBeenCalledOnce();
    expect(gateway.run.mock.calls[0][0]).toMatchObject({
      modelId: 'qwen/qwen3.8-27b',
      task: 'chat',
      inputModalities: ['text'],
      outputModalities: ['text'],
      messages: [
        { role: 'system', content: 'Project metadata only' },
        { role: 'user', content: 'Help edit this' },
      ],
      maxTokens: 500,
      maxEstimatedCostUsd: 0.001,
      userRef: 'user-123',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports the configured provider and model while keeping live execution disabled', async () => {
    await start();
    const response = await fetch(baseUrl + '/api/mia/vision/status', {
      headers: { origin, authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      available: false,
      provider: 'OpenRouter · Near AI (ZDR-pinned)',
      model: 'qwen/qwen3.8-27b',
      max_frames: 8,
      live_execution_enabled: false,
    });
  });

  it('rejects more than eight frames before invoking the central gateway', async () => {
    await start();
    const frame = { timestamp_seconds: 1, clip_name: 'clip', image_data_url: 'data:image/jpeg;base64,YWJj' };
    const response = await fetch(baseUrl + '/api/mia/vision/analyze', {
      method: 'POST',
      headers: { origin, authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ approved: true, instruction: 'Analyze', frames: Array.from({ length: 9 }, () => frame) }),
    });
    expect(response.status).toBe(400);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  it('refuses to analyze frames unless the approval flag is explicit', async () => {
    await start();
    const response = await fetch(baseUrl + '/api/mia/vision/analyze', {
      method: 'POST',
      headers: { origin, authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({
        approved: false,
        instruction: 'Analyze',
        frames: [{ timestamp_seconds: 1, clip_name: 'clip', image_data_url: 'data:image/jpeg;base64,YWJj' }],
      }),
    });
    expect(response.status).toBe(400);
    expect(gateway.run).not.toHaveBeenCalled();
  });

  it('sends only explicitly approved still frames to the central gateway and makes no provider request while disabled', async () => {
    const fetchImpl = vi.fn();
    await start({ fetchImpl });
    const response = await fetch(baseUrl + '/api/mia/vision/analyze', {
      method: 'POST',
      headers: { origin, authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({
        approved: true,
        instruction: 'Describe visible content',
        frames: [{ timestamp_seconds: 1, clip_name: 'clip', image_data_url: 'data:image/jpeg;base64,YWJj' }],
      }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'live_execution_disabled' });
    expect(gateway.run).toHaveBeenCalledOnce();
    expect(gateway.run.mock.calls[0][0]).toMatchObject({
      modelId: 'qwen/qwen3.8-27b',
      task: 'scene_analysis',
      inputModalities: ['image'],
      outputModalities: ['text'],
      maxTokens: 500,
      maxEstimatedCostUsd: 0.001,
    });
    expect(gateway.run.mock.calls[0][0].messages[0].content[1]).toMatchObject({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,YWJj' },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects unapproved browser origins', async () => {
    await start();
    const response = await fetch(baseUrl + '/api/mia/vision/status', {
      headers: { origin: 'https://attacker.example', authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(403);
    expect(gateway.run).not.toHaveBeenCalled();
  });
});
