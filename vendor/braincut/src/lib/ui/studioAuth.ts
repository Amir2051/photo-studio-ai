export type StudioIdentity = { id: string; email: string };
export type StudioAuth = { token: string; user: StudioIdentity };

const REQUEST_TIMEOUT_MS = 8000;

/** Requests the already-authenticated Studio user's Supabase access token from the same-origin parent shell. */
export async function getStudioAuth(): Promise<StudioAuth> {
  if (window.parent === window) throw new Error('Open the video editor inside Minu Studio.');
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Studio sign-in could not be verified. Sign in to Minu Studio and reopen MIA.'));
    }, REQUEST_TIMEOUT_MS);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type !== 'studio-auth-token-response' || event.data.requestId !== requestId) return;
      cleanup();
      if (typeof event.data.token !== 'string' || !event.data.token || !event.data.user?.id) {
        reject(new Error('Sign in to Minu Studio to use MIA.'));
        return;
      }
      resolve({ token: event.data.token, user: { id: event.data.user.id, email: event.data.user.email || '' } });
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'studio-auth-token-request', requestId }, window.location.origin);
  });
}
