import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { syncStyleRecipesToCloud } from '../lib/cloudSync';

export default function CloudSyncPanel({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Your photo and video files remain on this device.');
  const email = auth?.currentUser?.email || '';

  const sync = async () => {
    setBusy(true);
    setMessage('Syncing saved Style Recipes…');
    try {
      const result = await syncStyleRecipesToCloud();
      setMessage(
        `Sync complete · ${result.uploaded} uploaded · ${result.downloaded} downloaded · ${result.total} available on this device.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloud sync could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cloud-sync-page">
      <div className="cloud-sync-toolbar">
        <button className="button button-quiet" onClick={onBack} type="button">
          ← Back to studio
        </button>
        <span className="cloud-sync-private"><i /> PRIVATE CLOUD WORKSPACE</span>
      </div>
      <div className="cloud-sync-card">
        <p className="eyebrow">CROSS-DEVICE WORKFLOW</p>
        <h1>Keep your creative recipes in sync.</h1>
        <p className="cloud-sync-intro">
          Back up reusable Style Recipes to your private Every Frame First workspace and bring
          recipes from another device into this library.
        </p>
        <div className="cloud-sync-account">
          <span>Studio account</span>
          <strong>{email || 'Sign in to your studio account first'}</strong>
        </div>
        <button className="button button-primary cloud-sync-action" onClick={() => void sync()} disabled={!email || busy} type="button">
          {busy ? 'Syncing…' : 'Sync Style Recipes'}
        </button>
        <p className="cloud-sync-message" role="status" aria-live="polite">{message}</p>
        <div className="cloud-sync-privacy">
          <h2>What syncs</h2>
          <ul>
            <li>Saved Style Recipes and their adjustment settings</li>
            <li>Recipe names and timestamps for cross-device recovery</li>
          </ul>
          <h2>What stays local</h2>
          <ul>
            <li>Original photos, video, audio, and exports</li>
            <li>Large media files and private source images</li>
          </ul>
          <p>Media is never uploaded automatically by this sync action.</p>
        </div>
      </div>
    </section>
  );
}
