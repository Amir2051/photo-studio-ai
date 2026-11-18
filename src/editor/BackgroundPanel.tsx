import React from 'react';
import { DEFAULT_BACKGROUND_OPS, type BackgroundOps } from '../lib/segmentation';

export interface BackgroundPanelProps {
  /** Whether a source image is currently loaded. */
  hasImage: boolean;
  /** True while on-device person segmentation is running. */
  backgroundBusy: boolean;
  /** The detected person mask canvas, or null when not yet detected / cleared. */
  personMask: HTMLCanvasElement | null;
  /** Current background operation settings. */
  backgroundOps: BackgroundOps;
  /** Runs on-device person detection (MediaPipe selfie segmentation). */
  runBackgroundDetection: () => Promise<void>;
  /** Clears (or sets) the detected person mask. */
  setPersonMask: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>;
  /** Updates the background operation settings; accepts value or updater fn. */
  setBackgroundOps: React.Dispatch<React.SetStateAction<BackgroundOps>>;
}

/**
 * AI BACKGROUND panel: on-device person segmentation tools.
 * Detect the person in the photo with MediaPipe, then blur, dim, or replace
 * the background. Detection runs entirely in the browser; nothing is uploaded.
 */
export default function BackgroundPanel({
  hasImage,
  backgroundBusy,
  personMask,
  backgroundOps,
  runBackgroundDetection,
  setPersonMask,
  setBackgroundOps,
}: BackgroundPanelProps): React.JSX.Element {
  return (
    <section className="tool-panel background-panel" id="background-workspace" data-panel="retouch">
      <div className="section-title">
        <div>
          <p className="eyebrow">AI BACKGROUND</p>
          <h2>Background tools</h2>
        </div>
        <span className="offline-tag">ON DEVICE</span>
      </div>
      <p className="tool-note">
        Detect the person in your photo with MediaPipe, then blur, dim, or replace the
        background. Detection runs entirely in your browser; nothing is uploaded.
      </p>
      <div className="retouch-actions">
        <button
          className="button button-primary"
          onClick={() => void runBackgroundDetection()}
          disabled={!hasImage || backgroundBusy}
        >
          {backgroundBusy
            ? 'Detecting…'
            : personMask
              ? 'Re-detect person'
              : 'Detect person'}
        </button>
        {personMask && (
          <button
            className="button button-quiet"
            onClick={() => {
              setPersonMask(null);
              setBackgroundOps(DEFAULT_BACKGROUND_OPS);
            }}
          >
            Clear detection
          </button>
        )}
      </div>
      {personMask && (
        <>
          <div className="retouch-actions">
            {(
              [
                ['none', 'Off'],
                ['blur', 'Blur'],
                ['dim', 'Dim'],
                ['color', 'Color'],
                ['gradient', 'Gradient'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                className={`button ${backgroundOps.mode === mode ? 'button-primary' : 'button-quiet'}`}
                onClick={() => setBackgroundOps((ops) => ({ ...ops, mode }))}
              >
                {label}
              </button>
            ))}
          </div>
          {backgroundOps.mode === 'blur' && (
            <label className="range-control">
              <span>
                <span>Background blur</span>
                <strong>{backgroundOps.blur}</strong>
              </span>
              <input
                type="range"
                min={4}
                max={60}
                value={backgroundOps.blur}
                onChange={(event) =>
                  setBackgroundOps((ops) => ({ ...ops, blur: Number(event.target.value) }))
                }
              />
            </label>
          )}
          {backgroundOps.mode === 'dim' && (
            <label className="range-control">
              <span>
                <span>Background dim</span>
                <strong>{Math.round(backgroundOps.dim * 100)}%</strong>
              </span>
              <input
                type="range"
                min={0}
                max={80}
                value={Math.round(backgroundOps.dim * 100)}
                onChange={(event) =>
                  setBackgroundOps((ops) => ({
                    ...ops,
                    dim: Number(event.target.value) / 100,
                  }))
                }
              />
            </label>
          )}
          {backgroundOps.mode === 'color' && (
            <label className="range-control">
              <span>
                <span>Background color</span>
                <strong>{backgroundOps.color}</strong>
              </span>
              <input
                type="color"
                value={backgroundOps.color}
                onChange={(event) =>
                  setBackgroundOps((ops) => ({ ...ops, color: event.target.value }))
                }
              />
            </label>
          )}
          <p className="tool-note">
            Person is kept fully untouched; only the background is modified. Works in
            preview, full-resolution export, and library saves.
          </p>
        </>
      )}
    </section>
  );
}
