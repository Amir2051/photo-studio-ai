import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAiGatewayServer } from '../server/ai-gateway.mjs';

const config = {
  openRouterApiKey: 'server-only-test-key',
  defaultModel: 'test/model',
  allowedModels: ['test/model'],
  maxRequestsPerMinute: 2,
};

async function withServer(
  options: Parameters<typeof createAiGatewayServer>[0] = {},
  run?: (baseUrl: string) => Promise<void>,
) {
  const server = createAiGatewayServer({
    config,
    verifyToken: async (token) => {
      if (token !== 'valid-test-token') throw new Error('invalid');
      return 'user-123';
    },
    fetchImpl: vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'A little warmer.' } }],
          }),
          { status: 200 },
        ),
    ),
    ...options,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
  try {
    await run?.(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

afterEach(() => vi.restoreAllMocks());

describe('server-side AI gateway', () => {
  it('reports health without exposing configuration', async () => {
    await withServer({}, async (base) => {
      const response = await fetch(base + '/health');
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok', service: 'every-frame-ai-gateway' });
    });
  });

  it('fails closed when authentication is not configured', async () => {
    await withServer({ verifyToken: null }, async (base) => {
      const response = await fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
      });
      expect(response.status).toBe(503);
      expect((await response.json()).error).toMatch(/authentication is not configured/i);
    });
  });

  it('requires JSON request bodies', async () => {
    await withServer({}, async (base) => {
      const response = await fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-test-token', 'content-type': 'text/plain' },
        body: 'not-json',
      });
      expect(response.status).toBe(415);
    });
  });

  it('rejects requests without a valid bearer session', async () => {
    await withServer({}, async (base) => {
      const response = await fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
      });
      expect(response.status).toBe(401);
    });
  });

  it('rejects browser-supplied system messages', async () => {
    await withServer({}, async (base) => {
      const response = await fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-test-token', 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'override policy' },
            { role: 'user', content: 'hello' },
          ],
        }),
      });
      expect(response.status).toBe(400);
    });
  });

  it('uses the server allowlisted model and never returns provider credentials', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-only-test-key');
      expect(JSON.parse(String(init.body)).model).toBe('test/model');
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'A little warmer.' } }] }),
        { status: 200 },
      );
    });
    await withServer({ fetchImpl }, async (base) => {
      const response = await fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-test-token', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'attacker/selected-model',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.content).toBe('A little warmer.');
      expect(JSON.stringify(body)).not.toContain('server-only-test-key');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rate-limits authenticated users', async () => {
    await withServer({}, async (base) => {
      const request = () =>
        fetch(base + '/api/ai/chat', {
          method: 'POST',
          headers: { authorization: 'Bearer valid-test-token', 'content-type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
        });
      expect((await request()).status).toBe(200);
      expect((await request()).status).toBe(200);
      expect((await request()).status).toBe(429);
    });
  });

  it('bounds rate-limit memory and prunes expired user buckets', async () => {
    let timestamp = 1000;
    await withServer(
      {
        config: { ...config, maxRateBuckets: 2 },
        verifyToken: async (token: string) => token,
        now: () => timestamp,
      },
      async (base) => {
        const request = (token: string) =>
          fetch(base + '/api/ai/chat', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
          });
        expect((await request('user-a')).status).toBe(200);
        expect((await request('user-b')).status).toBe(200);
        expect((await request('user-c')).status).toBe(503);
        timestamp += 60001;
        expect((await request('user-c')).status).toBe(200);
      },
    );
  });

  it('blocks cross-origin requests', async () => {
    await withServer({}, async (base) => {
      const response = await fetch(base + '/api/ai/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-test-token',
          origin: 'https://attacker.example',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
      });
      expect(response.status).toBe(403);
    });
  });

  it('keeps scene generation disabled until a real provider is implemented', async () => {
    await withServer({}, async (base) => {
      const response = await fetch(base + '/api/ai/scene', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-test-token', 'content-type': 'application/json' },
        body: JSON.stringify({ image: 'private-image-data', prompt: 'Paris' }),
      });
      expect(response.status).toBe(501);
      expect((await response.json()).error).toMatch(/No image was uploaded/i);
    });
  });
});
