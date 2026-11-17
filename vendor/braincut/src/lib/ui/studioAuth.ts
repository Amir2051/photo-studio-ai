export type StudioIdentity = { id: string; email: string };
export type StudioAuth = { token: string; user: StudioIdentity };

const REQUEST_TIMEOUT_MS = 8000;

/** Requests the already-authenticated Studio user's Firebase ID token from the same-origin parent shell. */
export async function getStudioAuth(): Promise<StudioAuth> {
  if (window.parent === window) {
    const { getDirectStudioAuth } = await import('./directStudioAuth');
    return getDirectStudioAuth();
  }
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Studio sign-in could not be verified. Sign in to Every Frame First Studio and reopen MIA.'));
    }, REQUEST_TIMEOUT_MS);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type !== 'studio-auth-token-response' || event.data.requestId !== requestId) return;
      cleanup();
      if (typeof event.data.token !== 'string' || !event.data.token || !event.data.user?.id) {
        reject(new Error(typeof event.data.error === 'string' && event.data.error
          ? event.data.error
          : 'Sign in to Every Frame First Studio to use MIA.'));
        return;
      }
      resolve({ token: event.data.token, user: { id: event.data.user.id, email: event.data.user.email || '' } });
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'studio-auth-token-request', requestId }, window.location.origin);
  });
}


export type StudioAuthAction = 'sign_in' | 'sign_up' | 'reset_password';

/** Runs Studio Firebase authentication in the trusted parent shell; credentials never leave the browser. */
export async function performStudioAuth(action: StudioAuthAction, email: string, password = ''): Promise<{ token?: string; user?: StudioIdentity; notice?: string }> {
  if (window.parent === window) {
    const { performDirectStudioAuth } = await import('./directStudioAuth');
    return performDirectStudioAuth(action, email, password);
  }
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Studio sign-in timed out. Reload the editor and try again.'));
    }, REQUEST_TIMEOUT_MS);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type !== 'studio-auth-action-response' || event.data.requestId !== requestId) return;
      cleanup();
      if (!event.data.ok) {
        reject(new Error(typeof event.data.error === 'string' ? event.data.error : 'Studio authentication failed.'));
        return;
      }
      resolve({
        ...(typeof event.data.token === 'string' ? { token: event.data.token } : {}),
        ...(event.data.user?.id ? { user: { id: event.data.user.id, email: event.data.user.email || '' } } : {}),
        ...(typeof event.data.notice === 'string' ? { notice: event.data.notice } : {}),
      });
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'studio-auth-action-request', requestId, action, email, password }, window.location.origin);
  });
}
