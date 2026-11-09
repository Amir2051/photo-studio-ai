import React from 'react';

type VideoStudioFrameProps = {
  onBack: () => void;
};

/** Hosts the dedicated local-first video editor as an isolated same-origin application. */
export default function VideoStudioFrame({ onBack }: VideoStudioFrameProps): React.JSX.Element {
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
