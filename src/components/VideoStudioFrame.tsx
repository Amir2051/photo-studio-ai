import React, { useLayoutEffect, useRef } from 'react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, getCurrentFirebaseIdToken } from '../lib/firebase';

type VideoStudioFrameProps = {
  onBack: () => void;
};

/** Hosts the dedicated local-first video editor as an isolated same-origin application. */
export default function VideoStudioFrame({ onBack }: VideoStudioFrameProps): React.JSX.Element {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useLayoutEffect(() => {
    const handleAuthRequest = async (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame?.contentWindow || event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
      if (typeof event.data?.requestId !== 'string') return;
      if (event.data?.type === 'studio-auth-action-request') {
        const requestId = event.data.requestId;
        const respond = (payload: Record<string, unknown>) => frame.contentWindow?.postMessage({ type: 'studio-auth-action-response', requestId, ...payload }, event.origin);
        try {
          if (!auth) throw new Error('Studio sign-in is not configured. The Firebase web-app settings are missing.');
          const email = typeof event.data.email === 'string' ? event.data.email.trim() : '';
          const password = typeof event.data.password === 'string' ? event.data.password : '';
          if (!email) throw new Error('Enter your email address.');
          if (event.data.action === 'sign_in') {
            await signInWithEmailAndPassword(auth, email, password);
          } else if (event.data.action === 'sign_up') {
            if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
            await createUserWithEmailAndPassword(auth, email, password);
          } else if (event.data.action === 'reset_password') {
            await sendPasswordResetEmail(auth, email);
            respond({ ok: true, notice: 'If an account exists for that email, a password reset message has been sent.' });
            return;
          } else {
            throw new Error('Unsupported sign-in action.');
          }
          const token = await getCurrentFirebaseIdToken();
          const user = auth.currentUser;
          if (!token || !user) throw new Error('Studio sign-in completed, but the secure session could not be verified.');
          respond({ ok: true, token, user: { id: user.uid, email: user.email ?? '' } });
        } catch (cause) {
          const code = (cause as { code?: string }).code;
          const messages: Record<string, string> = {
            'auth/email-already-in-use': 'An account already exists for this email. Try signing in instead.',
            'auth/invalid-email': 'Enter a valid email address.',
            'auth/invalid-credential': 'Email or password is incorrect.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
            'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
            'auth/operation-not-allowed': 'Email/password sign-in is not enabled for the Studio Firebase project.',
            'auth/network-request-failed': 'Could not reach Firebase. Check your connection.',
          };
          respond({ ok: false, error: (code && messages[code]) || (cause instanceof Error ? cause.message : 'Studio authentication failed.') });
        }
        return;
      }
      if (event.data?.type !== 'studio-auth-token-request') return;
      try {
        const token = await getCurrentFirebaseIdToken();
        const user = auth?.currentUser;
        frame.contentWindow.postMessage({
          type: 'studio-auth-token-response',
          requestId: event.data.requestId,
          token,
          user: user ? { id: user.uid, email: user.email ?? '' } : null,
          error: token ? null : !auth
            ? 'Firebase sign-in is not configured in this local Studio build. Add the VITE_FIREBASE_* web-app settings before MIA login can work.'
            : 'You are not signed in to Every Frame First Studio yet. Sign in to the main Studio account, then reopen MIA.',
        }, event.origin);
      } catch {
        frame.contentWindow.postMessage({
          type: 'studio-auth-token-response',
          requestId: event.data.requestId,
          token: null,
          user: null,
        }, event.origin);
      }
    };
    window.addEventListener('message', handleAuthRequest);
    return () => window.removeEventListener('message', handleAuthRequest);
  }, []);

  return (
    <main className="video-studio-frame-shell">
      <header className="video-studio-frame-bar">
        <button className="button button-quiet" type="button" onClick={onBack}>
          ← Photo workspace
        </button>
        <span className="video-studio-frame-brand">EVERY FRAME FIRST <i>/</i> VIDEO STUDIO</span>
        <span className="video-studio-frame-local"><i /> LOCAL MEDIA</span>
      </header>
      <iframe
        ref={frameRef}
        className="video-studio-frame"
        src="/video-studio/"
        title="Every Frame First professional video editor"
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
        referrerPolicy="same-origin"
      />
    </main>
  );
}
