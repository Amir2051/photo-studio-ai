type FetchResponse = Pick<Response, 'ok' | 'status' | 'json'>;
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<FetchResponse>;

type WakeOptions = {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  fetcher?: Fetcher;
  sleep?: (delayMs: number) => Promise<void>;
  onWaiting?: (attempt: number) => void;
};

const sleep = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

/** Wake an idle signaling service before sending a non-idempotent room-creation request. */
export async function wakeGuestSignal(healthUrl: string, options: WakeOptions = {}): Promise<void> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const timeoutMs = Math.max(1, options.timeoutMs ?? 75_000);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 2_000);
  const fetcher = options.fetcher ?? fetch;
  const pause = options.sleep ?? sleep;
  let lastError = 'The signaling service is not ready.';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    options.onWaiting?.(attempt);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(healthUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      if (response.ok) {
        const body = await response.json().catch(() => null) as { status?: unknown } | null;
        if (body?.status === 'ok') return;
        lastError = 'The signaling service returned an invalid health response.';
      } else {
        lastError = `The signaling service returned HTTP ${response.status}.`;
        if (response.status < 500 && response.status !== 429) break;
      }
    } catch (error) {
      lastError = error instanceof Error && error.name === 'AbortError'
        ? 'The signaling service took too long to wake up.'
        : 'The signaling service could not be reached yet.';
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < attempts) await pause(retryDelayMs * attempt);
  }

  throw new Error(`${lastError} Try again in a moment.`);
}
