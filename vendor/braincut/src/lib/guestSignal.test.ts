import { describe, expect, it, vi } from 'vitest';
import { wakeGuestSignal } from './guestSignal';

describe('wakeGuestSignal', () => {
  it('waits for an idle service to wake before room creation', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'ok' }) });
    const onWaiting = vi.fn();

    await expect(wakeGuestSignal('https://signal.example/health', {
      fetcher,
      sleep: async () => {},
      onWaiting,
    })).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://signal.example/health', expect.objectContaining({ method: 'GET', cache: 'no-store' }));
    expect(onWaiting).toHaveBeenNthCalledWith(1, 1);
    expect(onWaiting).toHaveBeenNthCalledWith(2, 2);
  });

  it('does not repeat a non-retryable configuration error', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });

    await expect(wakeGuestSignal('/health', { fetcher, sleep: async () => {} }))
      .rejects.toThrow(/HTTP 403/);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('provides a timeout signal and retries a transient network failure', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('temporary network error'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: 'ok' }) });

    await expect(wakeGuestSignal('/health', { fetcher, sleep: async () => {} }))
      .resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
