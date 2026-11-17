import React, { useLayoutEffect, useRef } from 'react';
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
      if (event.data?.type !== 'studio-auth-token-request' || typeof event.data.requestId !== 'string') return;
      try {
        const token = await getCurrentFirebaseIdToken();
        const user = auth?.currentUser;
        frame.contentWindow.postMessage({
          type: 'studio-auth-token-response',
          requestId: event.data.requestId,
          token,
          user: user ? { id: user.uid, email: user.email ?? '' } : null,
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
