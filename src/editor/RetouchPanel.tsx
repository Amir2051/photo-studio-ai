import React, { type Dispatch, type SetStateAction } from 'react';
import type {
  BrushStroke,
  NormalizedPoint,
} from '../lib/portraitRetouch';
import type {
  HealStroke,
  LocalMask,
  SelectionState,
} from '../lib/advancedEditing';
import type { ManualAdjustmentSettings } from '../lib/manualEditing';
import {
  DEFAULT_FACE_MAKEUP,
  type FaceMakeupSettings,
} from '../lib/faceMakeup';
import {
  DEFAULT_FACE_ACCESSORY_SETTINGS,
  type FaceAccessory,
  type FaceAccessorySettings,
} from '../lib/faceAccessories';

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

export type LocalTool = 'off' | 'brush' | 'linear' | 'radial' | 'heal';

export interface PortraitSnapshotPatch {
  selectedFilterId?: string;
  filterIntensity?: number;
  filterBaseManualSettings?: ManualAdjustmentSettings | null;
  retouchStrength?: number;
  retouchStrokes?: BrushStroke[];
  faceLandmarks?: NormalizedPoint[][];
  faceMakeup?: FaceMakeupSettings;
  faceAccessory?: FaceAccessory;
  faceAccessorySettings?: FaceAccessorySettings;
}

export interface RetouchPanelProps {
  hasImage: boolean;
  busy: boolean;
  detectingFaces: boolean;

  localTool: LocalTool;
  setLocalTool: Dispatch<SetStateAction<LocalTool>>;
  localBrushSize: number;
  setLocalBrushSize: Dispatch<SetStateAction<number>>;

  retouchMode: 'off' | 'brush';
  setRetouchMode: Dispatch<SetStateAction<'off' | 'brush'>>;
  retouchStrength: number;
  retouchStrokes: BrushStroke[];
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  faceLandmarks: NormalizedPoint[][];
  faceStrengths: Array<number | null>;
  setFaceStrengths: Dispatch<SetStateAction<Array<number | null>>>;
  glareSoftness: number;
  setGlareSoftness: Dispatch<SetStateAction<number>>;

  faceMakeup: FaceMakeupSettings;
  faceAccessory: FaceAccessory;
  faceAccessorySettings: FaceAccessorySettings;

  adjustments: Adjustments;
  manualAdjustments: ManualAdjustmentSettings;
  localMasks: LocalMask[];
  healStrokes: HealStroke[];
  selection: SelectionState | null;

  runFaceDetection: () => void;
  applyBlemishes: () => void;
  commitSnapshot: (
    nextAdjustments: Adjustments,
    nextManual: ManualAdjustmentSettings,
    nextMasks?: LocalMask[],
    nextHeal?: HealStroke[],
    nextSelection?: SelectionState | null,
    portraitPatch?: PortraitSnapshotPatch,
  ) => void;
  commitPortraitSnapshot: (patch: PortraitSnapshotPatch) => void;
  setMessage: (message: string) => void;
}

export default function RetouchPanel({
  hasImage,
  busy,
  detectingFaces,
  localTool,
  setLocalTool,
  localBrushSize,
  setLocalBrushSize,
  retouchMode,
  setRetouchMode,
  retouchStrength,
  retouchStrokes,
  brushSize,
  setBrushSize,
  faceLandmarks,
  faceStrengths,
  setFaceStrengths,
  glareSoftness,
  setGlareSoftness,
  faceMakeup,
  faceAccessory,
  faceAccessorySettings,
  adjustments,
  manualAdjustments,
  localMasks,
  healStrokes,
  selection,
  runFaceDetection,
  applyBlemishes,
  commitSnapshot,
  commitPortraitSnapshot,
  setMessage,
}: RetouchPanelProps): React.JSX.Element {
  return (
                <section className="tool-panel retouch-panel" id="retouch-workspace" data-panel="retouch">
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">PORTRAIT TOOLS</p>
                      <h2>Retouch</h2>
                    </div>
                    <span className="offline-tag">ON DEVICE</span>
                  </div>
                  <p className="tool-note">
                    Detect faces for a feathered skin mask that protects eyes, brows and lips, or
                    paint a precise area. The preview and full-resolution export use the same
                    resolution-scaled retouch strength. Processing stays on this device.
                  </p>
                  <div className="retouch-actions">
                    <button
                      className={
                        localTool === 'heal' ? 'button button-primary' : 'button button-quiet'
                      }
                      onClick={() => setLocalTool(localTool === 'heal' ? 'off' : 'heal')}
                      disabled={!hasImage}
                    >
                      Healing / blemish brush
                    </button>
                    <button
                      className="text-button"
                      onClick={() => commitSnapshot(adjustments, manualAdjustments, localMasks, [])}
                      disabled={!healStrokes.length}
                    >
                      Clear healing
                    </button>
                  </div>
                  {localTool === 'heal' && (
                    <label className="range-control">
                      <span>
                        <span>Healing brush size</span>
                        <strong>{localBrushSize}</strong>
                      </span>
                      <input
                        type="range"
                        min="8"
                        max="100"
                        value={localBrushSize}
                        onChange={(e) => setLocalBrushSize(Number(e.target.value))}
                      />
                    </label>
                  )}
                  {localTool === 'heal' && (
                    <p className="retouch-hint">
                      Paint over a small blemish. The editor blends nearby pixels locally; this is a
                      basic clone-style healing tool, not content-aware reconstruction.
                    </p>
                  )}
                  <div className="retouch-actions">
                    <button
                      className={`button ${retouchMode === 'off' && faceLandmarks.length ? 'button-primary' : 'button-quiet'}`}
                      onClick={() => void runFaceDetection()}
                      disabled={!hasImage || detectingFaces || busy}
                    >
                      {detectingFaces ? 'Detecting…' : 'Auto face detect'}
                    </button>
                    <button
                      className={`button ${retouchMode === 'brush' ? 'button-primary' : 'button-quiet'}`}
                      onClick={() => setRetouchMode(retouchMode === 'brush' ? 'off' : 'brush')}
                      disabled={!hasImage}
                    >
                      Brush
                    </button>
                  </div>
                  <div
                    className="retouch-strength-presets"
                    aria-label="Skin smoothing strength presets"
                  >
                    <button
                      type="button"
                      className={retouchStrength === 30 ? 'selected' : ''}
                      onClick={() => commitPortraitSnapshot({ retouchStrength: 30 })}
                      disabled={!hasImage}
                    >
                      Subtle
                    </button>
                    <button
                      type="button"
                      className={retouchStrength === 55 ? 'selected' : ''}
                      onClick={() => commitPortraitSnapshot({ retouchStrength: 55 })}
                      disabled={!hasImage}
                    >
                      Balanced
                    </button>
                    <button
                      type="button"
                      className={retouchStrength === 78 ? 'selected' : ''}
                      onClick={() => commitPortraitSnapshot({ retouchStrength: 78 })}
                      disabled={!hasImage}
                    >
                      Strong
                    </button>
                  </div>
                  <label className="range-control">
                    <span>
                      <span>Skin smoothing</span>
                      <strong>{retouchStrength}%</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={retouchStrength}
                      disabled={!hasImage}
                      onChange={(e) =>
                        commitPortraitSnapshot({ retouchStrength: Number(e.target.value) })
                      }
                    />
                  </label>
                  {faceLandmarks.length > 0 && (
                    <div className="per-face-controls">
                      <div className="section-title">
                        <div>
                          <p className="eyebrow">PER-FACE</p>
                          <h3>Face-specific smoothing</h3>
                        </div>
                        {faceStrengths.some((value) => value !== null && value !== undefined) && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => setFaceStrengths([])}
                          >
                            Use global
                          </button>
                        )}
                      </div>
                      {faceLandmarks.map((_, index) => {
                        const value = faceStrengths[index] ?? retouchStrength;
                        return (
                          <label className="range-control" key={index}>
                            <span>
                              <span>Face {index + 1}</span>
                              <strong>{Math.round(value)}%</strong>
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={value}
                              onChange={(event) =>
                                setFaceStrengths((current) => {
                                  const next = faceLandmarks.map(
                                    (_face, faceIndex) => current[faceIndex] ?? null,
                                  );
                                  next[index] = Number(event.target.value);
                                  return next;
                                })
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <label className="range-control">
                    <span>
                      <span>Glasses glare soften</span>
                      <strong>{glareSoftness}%</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={glareSoftness}
                      disabled={!hasImage || !faceLandmarks.length}
                      onChange={(e) => setGlareSoftness(Number(e.target.value))}
                    />
                  </label>
                  <button
                    className="button button-quiet"
                    onClick={applyBlemishes}
                    disabled={!hasImage || !faceLandmarks.length || busy}
                  >
                    Auto-fix blemishes (local)
                  </button>
                  <div className="makeup-controls">
                    <div className="section-title">
                      <div>
                        <p className="eyebrow">FACE-AWARE EFFECTS</p>
                        <h3>Makeup</h3>
                      </div>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => commitPortraitSnapshot({ faceMakeup: DEFAULT_FACE_MAKEUP })}
                        disabled={!hasImage}
                      >
                        Reset
                      </button>
                    </div>
                    <p className="retouch-hint">
                      Local landmark-aligned blush, lip tint and eye color. Run Auto face detect
                      first.
                    </p>
                    {(
                      [
                        ['blush', 'Blush'],
                        ['lipstick', 'Lip color'],
                        ['eyeshadow', 'Eye color'],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="range-control" key={key}>
                        <span>
                          <span>{label}</span>
                          <strong>{faceMakeup[key]}%</strong>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={faceMakeup[key]}
                          disabled={!hasImage || !faceLandmarks.length}
                          onChange={(event) =>
                            commitPortraitSnapshot({
                              faceMakeup: { ...faceMakeup, [key]: Number(event.target.value) },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="makeup-controls accessory-controls">
                    <div className="section-title">
                      <div>
                        <p className="eyebrow">LANDMARK-TRACKED OVERLAYS</p>
                        <h3>Accessories & lenses</h3>
                      </div>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          commitSnapshot(
                            adjustments,
                            manualAdjustments,
                            localMasks,
                            healStrokes,
                            selection,
                            {
                              faceAccessory: 'none',
                              faceAccessorySettings: DEFAULT_FACE_ACCESSORY_SETTINGS,
                            },
                          );
                        }}
                        disabled={!hasImage || faceAccessory === 'none'}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="retouch-hint">
                      Choose a vector overlay anchored to detected facial landmarks. Run Auto face
                      detect first.
                    </p>
                    <label className="range-control">
                      <span>
                        <span>Effect</span>
                      </span>
                      <select
                        value={faceAccessory}
                        disabled={!hasImage || !faceLandmarks.length}
                        onChange={(event) =>
                          commitPortraitSnapshot({
                            faceAccessory: event.target.value as FaceAccessory,
                          })
                        }
                      >
                        <option value="none">No accessory</option>
                        <option value="glasses">Classic glasses</option>
                        <option value="sunglasses">Dark sunglasses</option>
                        <option value="bunny-ears">Bunny ears</option>
                        <option value="puppy">Puppy face</option>
                        <option value="heart-eyes">Heart eyes</option>
                        <option value="freckles">Freckles</option>
                        <option value="flower-crown">Flower crown</option>
                        <option value="crown">Golden crown</option>
                      </select>
                    </label>
                    {faceAccessory !== 'none' && (
                      <div className="accessory-adjustments">
                        {(
                          [
                            ['scale', 'Size', 50, 160, '%'],
                            ['offsetX', 'Horizontal position', -50, 50, ''],
                            ['offsetY', 'Vertical position', -50, 50, ''],
                            ['rotation', 'Rotation', -45, 45, '°'],
                            ['opacity', 'Opacity', 0, 100, '%'],
                          ] as const
                        ).map(([key, label, min, max, suffix]) => (
                          <label className="range-control" key={key}>
                            <span>
                              <span>{label}</span>
                              <strong>
                                {faceAccessorySettings[key]}
                                {suffix}
                              </strong>
                            </span>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              value={faceAccessorySettings[key]}
                              disabled={!hasImage || !faceLandmarks.length}
                              onChange={(event) =>
                                commitPortraitSnapshot({
                                  faceAccessorySettings: {
                                    ...faceAccessorySettings,
                                    [key]: Number(event.target.value),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            commitPortraitSnapshot({
                              faceAccessorySettings: DEFAULT_FACE_ACCESSORY_SETTINGS,
                            })
                          }
                        >
                          Reset positioning
                        </button>
                      </div>
                    )}
                    <span className="tool-note">
                      {faceLandmarks.length
                        ? `${faceLandmarks.length} face(s) tracked`
                        : 'Waiting for face detection'}
                    </span>
                  </div>
                  {retouchMode === 'brush' && (
                    <label className="range-control">
                      <span>
                        <span>Brush size</span>
                        <strong>{brushSize}</strong>
                      </span>
                      <input
                        type="range"
                        min="8"
                        max="80"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                      />
                    </label>
                  )}
                  <div className="retouch-actions">
                    <button
                      className="text-button"
                      onClick={() => {
                        commitSnapshot(
                          adjustments,
                          manualAdjustments,
                          localMasks,
                          healStrokes,
                          selection,
                          {
                            faceLandmarks: [],
                            retouchStrokes: [],
                            faceMakeup: DEFAULT_FACE_MAKEUP,
                            faceAccessory: 'none',
                            faceAccessorySettings: DEFAULT_FACE_ACCESSORY_SETTINGS,
                          },
                        );
                        setRetouchMode('off');
                        setMessage('Portrait retouch cleared.');
                      }}
                      disabled={!hasImage || (!faceLandmarks.length && !retouchStrokes.length)}
                    >
                      Clear retouch
                    </button>
                    <span className="tool-note">
                      {faceLandmarks.length
                        ? `${faceLandmarks.length} detected face(s)`
                        : `${retouchStrokes.length} brush stroke(s)`}
                    </span>
                  </div>
                  {retouchMode === 'brush' && (
                    <p className="retouch-hint">
                      Paint directly over skin in the preview. Avoid eyes, eyebrows, lips, and hair.
                    </p>
                  )}
                </section>
  );
}
