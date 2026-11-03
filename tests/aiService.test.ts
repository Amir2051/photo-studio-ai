import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineProvider, OpenRouterProvider } from '../src/lib/aiService';
import type { AiMessage } from '../src/lib/types';

const message: AiMessage = {
  id: 'message-1',
  role: 'user',
  content: 'Make the photo warmer',
  timestamp: new Date().toISOString(),
};

afterEach(() => vi.unstubAllGlobals());

describe('AI service security boundary', () => {
  it('routes browser requests to the server gateway and never forwards a legacy API key', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        requestUrl = String(url);
        requestInit = init;
        return new Response(JSON.stringify({ content: 'Use a small warmth adjustment.' }), {
          status: 200,
        });
      }),
    );
    const provider = new OpenRouterProvider(
      'sk-test-secret-that-must-not-leak',
      'test-model',
      async () => 'short-lived-session-token',
    );
    await expect(provider.chat([message])).resolves.toBe('Use a small warmth adjustment.');
    expect(requestUrl).toBe('/api/ai/chat');
    expect(requestInit?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer short-lived-session-token',
    });
    expect(String(requestInit?.body)).not.toContain('sk-test-secret-that-must-not-leak');
  });

  it('requires a session token before making a cloud AI request', async () => {
    const provider = new OpenRouterProvider();
    await expect(provider.chat([message])).rejects.toThrow(/sign in is required/i);
  });

  it('does not advertise cloud image upload before scene generation exists', () => {
    const provider = new OpenRouterProvider();
    expect(provider.supportsImages).toBe(false);
    expect(provider.canUploadToCloud()).toBe(false);
  });

  it('does not invent a scene when no image-generation gateway is configured', async () => {
    const provider = new OfflineProvider();
    await expect(provider.generateScene('aGVsbG8=', 'Place me in Paris')).rejects.toThrow(
      /not configured|unavailable/i,
    );
  });

  it('surfaces gateway failures rather than returning fabricated content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('unavailable', { status: 503 })),
    );
    const provider = new OpenRouterProvider(undefined, undefined, async () => 'session-token');
    await expect(provider.chat([message])).rejects.toThrow(/503/);
  });
});
