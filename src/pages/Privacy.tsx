import { Link } from 'react-router-dom';
import React from 'react';
import './Privacy.css';

export default function Privacy(): React.JSX.Element {
  return (
    <main className="privacy-shell">
      <p className="privacy-brand">MINU STUDIO</p>
      <h1>Your photos stay yours</h1>
      <p className="privacy-lede">
        Minu Studio is private by default. Editing happens on your device; nothing is uploaded
        without an explicit action.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>Photo decoding, adjustments, masks, healing, retouching, and exports — all in your browser.</li>
        <li>Face detection, skin smoothing, blemish detection, and background segmentation run locally via MediaPipe. No image data is sent to a server for these.</li>
        <li>Your photo library, Style Recipes, and cull sessions live in this browser's IndexedDB.</li>
        <li>Photo culling assist scores are deterministic heuristics (sharpness, exposure, contrast, face presence). They never leave this device.</li>
      </ul>

      <h2>What uses the network</h2>
      <ul>
        <li>
          <strong>Firebase Authentication</strong> — sign-in (email/password) in the photo-editor-rz project.
        </li>
        <li>
          <strong>Cloud AI (optional, off unless configured)</strong> — chat and image features route through
          a fail-closed server-side gateway. Image bytes are uploaded only when you explicitly invoke a cloud
          feature and the gateway is configured; otherwise those features are disabled and report honestly.
        </li>
        <li>
          <strong>Client galleries</strong> — when you publish a gallery, the photos you select are uploaded to
          Firebase Storage (photo-editor-rz) and a share document is written to Firestore. Anyone with the
          unguessable link can view until the expiry. You can delete galleries via the owner account.
          The "Local ZIP" delivery mode never uses the network.
        </li>
        <li>
          <strong>Cloud sync (optional)</strong> — if you enable it, reusable Style Recipes (not photos) sync to
          your private workspace.
        </li>
      </ul>

      <h2>What never happens</h2>
      <ul>
        <li>Your photos are not used for AI model training.</li>
        <li>No silent uploads: editing features have no hidden network calls.</li>
        <li>The gateway does not log image payloads, prompts, or tokens, and returns no upstream diagnostics.</li>
        <li>No tracking pixels or ad networks in the app.</li>
      </ul>

      <h2>Data on this device</h2>
      <p>
        Clearing browser storage (or uninstalling the PWA) deletes your local library, recipes and cull
        sessions. Backups are your responsibility: use "Save to library" exports and the keeper ZIP tools.
      </p>

      <Link className="privacy-back" to="/">
        ← Back to Minu Studio
      </Link>
    </main>
  );
}
