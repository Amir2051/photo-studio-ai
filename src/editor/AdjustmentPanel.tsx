import React from 'react';
import { RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import type { ManualAdjustmentSettings } from '../lib/manualEditing';

type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };

export interface DocumentTransform {
  crop: { x: number; y: number; width: number; height: number };
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
}

type CropRect = DocumentTransform['crop'];

// These literal option lists are module-level in Home.tsx but are also used by
// another panel there, so they cannot be moved; they are re-declared locally to
// keep this component self-contained.
const HSL_CHANNEL_OPTIONS = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
] as const;
type HslChannel = (typeof HSL_CHANNEL_OPTIONS)[number];
const CURVE_CHANNEL_OPTIONS = ['master', 'red', 'green', 'blue'] as const;
type CurveChannel = (typeof CURVE_CHANNEL_OPTIONS)[number];

// Helpers used only by this panel, moved here module-level.
const computeCurvePreviewPrefix = (channel: CurveChannel): string =>
  channel === 'master'
    ? 'curve'
    : 'curve' + channel[0].toUpperCase() + channel.slice(1);

const computeCurvePreviewValue = (
  prefix: string,
  settings: ManualAdjustmentSettings,
  part: string,
): number => settings[(prefix + part) as keyof ManualAdjustmentSettings] as number;

export interface AdjustmentPanelProps {
  hasImage: boolean;
  adjustments: Adjustments;
  manualAdjustments: ManualAdjustmentSettings;
  reset: () => void;
  updateAdjustment: (key: keyof Adjustments, value: number) => void;
  updateManualAdjustment: (key: keyof ManualAdjustmentSettings, value: number) => void;
  selectedCurveChannel: CurveChannel;
  setSelectedCurveChannel: React.Dispatch<React.SetStateAction<CurveChannel>>;
  selectedHslChannel: HslChannel;
  setSelectedHslChannel: React.Dispatch<React.SetStateAction<HslChannel>>;
  documentTransform: DocumentTransform;
  defaultDocumentTransform: DocumentTransform;
  commitDocumentTransform: (next: DocumentTransform) => void;
  rotateDocument: (degrees: 90 | -90) => void;
  cropDraft: CropRect;
  setCropDraft: React.Dispatch<React.SetStateAction<CropRect>>;
  applyCropDraft: () => void;
}

export default function AdjustmentPanel(props: AdjustmentPanelProps): React.JSX.Element {
  const {
    hasImage,
    adjustments,
    manualAdjustments,
    reset,
    updateAdjustment,
    updateManualAdjustment,
    selectedCurveChannel,
    setSelectedCurveChannel,
    selectedHslChannel,
    setSelectedHslChannel,
    documentTransform,
    defaultDocumentTransform,
    commitDocumentTransform,
    rotateDocument,
    cropDraft,
    setCropDraft,
    applyCropDraft,
  } = props;
  const curvePreviewPrefix = computeCurvePreviewPrefix(selectedCurveChannel);
  const curvePreviewValue = (part: string) =>
    computeCurvePreviewValue(curvePreviewPrefix, manualAdjustments, part);

  return (
    <>
      <section className="tool-panel" id="color-workspace" data-panel="adjust">
        <div className="section-title">
          <div>
            <p className="eyebrow">FINE TUNING</p>
            <h2>Adjustments</h2>
          </div>
          <button className="text-button" onClick={reset} disabled={!hasImage}>
            Reset
          </button>
        </div>
        {(
          [
            ['brightness', 'Brightness', 50, 150, '%'],
            ['contrast', 'Contrast', 50, 160, '%'],
            ['saturation', 'Saturation', 0, 180, '%'],
            ['warmth', 'Temperature', -60, 60, ''],
          ] as const
        ).map(([key, label, min, max, unit]) => (
          <label className="range-control" key={key}>
            <span>
              <span>{label}</span>
              <strong>
                {adjustments[key]}
                {unit}
              </strong>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              value={adjustments[key]}
              disabled={!hasImage}
              onChange={(e) => updateAdjustment(key, Number(e.target.value))}
            />
          </label>
        ))}
        <div className="manual-control-groups">
          <h3>Light & tone</h3>
          {(
            [
              ['exposure', 'Exposure', -200, 200, ' EV'],
              ['highlights', 'Highlights', -100, 100, '%'],
              ['shadows', 'Shadows', -100, 100, '%'],
              ['whites', 'Whites', -100, 100, '%'],
              ['blacks', 'Blacks', -100, 100, '%'],
            ] as const
          ).map(([key, label, min, max, unit]) => (
            <label className="range-control" key={key}>
              <span>
                <span>{label}</span>
                <strong>
                  {key === 'exposure'
                    ? (manualAdjustments[key] / 100).toFixed(2)
                    : manualAdjustments[key]}
                  {unit}
                </strong>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={manualAdjustments[key]}
                disabled={!hasImage}
                onChange={(e) => updateManualAdjustment(key, Number(e.target.value))}
              />
            </label>
          ))}
          <h3>Color</h3>
          {(
            [
              ['tint', 'Tint', -100, 100, ''],
              ['vibrance', 'Vibrance', -100, 100, '%'],
              ['hue', 'Hue', -180, 180, '°'],
            ] as const
          ).map(([key, label, min, max, unit]) => (
            <label className="range-control" key={key}>
              <span>
                <span>{label}</span>
                <strong>
                  {manualAdjustments[key]}
                  {unit}
                </strong>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={manualAdjustments[key]}
                disabled={!hasImage}
                onChange={(e) => updateManualAdjustment(key, Number(e.target.value))}
              />
            </label>
          ))}
          <h3>RGB tone curve</h3>
          <label className="range-control">
            <span>
              <span>Curve channel</span>
            </span>
            <select
              className="filter-category-select"
              value={selectedCurveChannel}
              onChange={(e) => setSelectedCurveChannel(e.target.value as CurveChannel)}
            >
              {CURVE_CHANNEL_OPTIONS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel === 'master' ? 'Master RGB' : channel.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <div
            className="tone-curve-preview"
            aria-label={selectedCurveChannel + ' tone curve preview'}
          >
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label="Tone curve with adjustable shadow, dark, light and highlight points"
            >
              <path d="M0 0 V100 H100" className="tone-curve-axis" />
              <path
                d="M0 100 L19 81 L44 56 L69 31 L88 12 L100 0"
                className="tone-curve-gridline"
              />
              <polyline
                points={
                  '0,100 19,' +
                  (100 -
                    Math.max(
                      0,
                      Math.min(100, 19 + curvePreviewValue('Shadows') * 0.19),
                    )) +
                  ' 44,' +
                  (100 -
                    Math.max(0, Math.min(100, 44 + curvePreviewValue('Darks') * 0.19))) +
                  ' 69,' +
                  (100 -
                    Math.max(0, Math.min(100, 69 + curvePreviewValue('Lights') * 0.19))) +
                  ' 88,' +
                  (100 -
                    Math.max(
                      0,
                      Math.min(100, 88 + curvePreviewValue('Highlights') * 0.12),
                    )) +
                  ' 100,0'
                }
                className="tone-curve-line"
              />
            </svg>
            <span>Shadows</span>
            <span>Highlights</span>
          </div>
          {(
            [
              ['Shadows', 'Shadow point'],
              ['Darks', 'Dark midtone'],
              ['Lights', 'Light midtone'],
              ['Highlights', 'Highlight point'],
            ] as const
          ).map(([part, label]) => {
            const key = (curvePreviewPrefix + part) as keyof ManualAdjustmentSettings;
            return (
              <label className="range-control" key={key}>
                <span>
                  <span>{label}</span>
                  <strong>{manualAdjustments[key]}</strong>
                </span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={manualAdjustments[key]}
                  disabled={!hasImage}
                  onChange={(e) => updateManualAdjustment(key, Number(e.target.value))}
                />
              </label>
            );
          })}
          <h3>Selective HSL</h3>
          <label className="range-control">
            <span>
              <span>Color range</span>
            </span>
            <select
              className="filter-category-select"
              value={selectedHslChannel}
              onChange={(e) => setSelectedHslChannel(e.target.value as HslChannel)}
            >
              {HSL_CHANNEL_OPTIONS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel[0].toUpperCase() + channel.slice(1)}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['Hue', 'Hue', -100, 100, '°'],
              ['Saturation', 'Saturation', -100, 100, '%'],
              ['Luminance', 'Luminance', -100, 100, '%'],
            ] as const
          ).map(([suffix, label, min, max, unit]) => {
            const key = ('hsl' +
              selectedHslChannel[0].toUpperCase() +
              selectedHslChannel.slice(1) +
              suffix) as keyof ManualAdjustmentSettings;
            return (
              <label className="range-control" key={key}>
                <span>
                  <span>{label}</span>
                  <strong>
                    {manualAdjustments[key]}
                    {unit}
                  </strong>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={manualAdjustments[key]}
                  disabled={!hasImage}
                  onChange={(e) => updateManualAdjustment(key, Number(e.target.value))}
                />
              </label>
            );
          })}
          <h3>Detail</h3>
          {(
            [
              ['clarity', 'Clarity', -100, 100],
              ['texture', 'Texture', -100, 100],
              ['sharpening', 'Sharpening', 0, 100],
              ['noiseReduction', 'Noise reduction', 0, 100],
            ] as const
          ).map(([key, label, min, max]) => (
            <label className="range-control" key={key}>
              <span>
                <span>{label}</span>
                <strong>{manualAdjustments[key]}%</strong>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={manualAdjustments[key]}
                disabled={!hasImage}
                onChange={(e) => updateManualAdjustment(key, Number(e.target.value))}
              />
            </label>
          ))}
          <h3>Effects</h3>
          {(
            [
              ['grain', 'Film grain', 0, 100, '%'],
              ['vignette', 'Vignette', -100, 100, '%'],
            ] as const
          ).map(([key, label, min, max, unit]) => (
            <label className="range-control" key={key}>
              <span>
                <span>{label}</span>
                <strong>
                  {manualAdjustments[key]}
                  {unit}
                </strong>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={manualAdjustments[key]}
                disabled={!hasImage}
                onChange={(e) => updateManualAdjustment(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <p className="tool-note">
          Professional controls render from the untouched original. Exposure, tonal range,
          tint, vibrance, hue, grain and vignette are processed locally.
        </p>
      </section>
      <section className="tool-panel" id="transform-workspace" data-panel="adjust">
        <div className="section-title">
          <div>
            <p className="eyebrow">DOCUMENT GEOMETRY</p>
            <h2>Crop & transform</h2>
          </div>
          <span className="offline-tag">NON-DESTRUCTIVE</span>
        </div>
        <div className="retouch-actions">
          <button
            className="button button-quiet"
            disabled={!hasImage}
            onClick={() => rotateDocument(-90)}
          >
            <RotateCcw size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Rotate left
          </button>
          <button
            className="button button-quiet"
            disabled={!hasImage}
            onClick={() => rotateDocument(90)}
          >
            <RotateCw size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Rotate right
          </button>
        </div>
        <div className="retouch-actions">
          <button
            className={`button ${documentTransform.flipX ? 'button-primary' : 'button-quiet'}`}
            disabled={!hasImage}
            onClick={() =>
              commitDocumentTransform({
                ...documentTransform,
                flipX: !documentTransform.flipX,
              })
            }
          >
           <FlipHorizontal2 size={12} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />Flip horizontal
          </button>
          <button
            className={`button ${documentTransform.flipY ? 'button-primary' : 'button-quiet'}`}
            disabled={!hasImage}
            onClick={() =>
              commitDocumentTransform({
                ...documentTransform,
                flipY: !documentTransform.flipY,
              })
            }
          >
           <FlipVertical2 size={12} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />Flip vertical
          </button>
        </div>
        {(
          [
            ['Left', 'x', 0, 90],
            ['Top', 'y', 0, 90],
            ['Width', 'width', 10, 100 - Math.round(cropDraft.x * 100)],
            ['Height', 'height', 10, 100 - Math.round(cropDraft.y * 100)],
          ] as const
        ).map(([label, key, min, max]) => (
          <label className="range-control" key={key}>
            <span>
              <span>Crop {label}</span>
              <strong>{Math.round(cropDraft[key] * 100)}%</strong>
            </span>
            <input
              type="range"
              min={min}
              max={Math.max(min, max)}
              value={Math.round(cropDraft[key] * 100)}
              disabled={!hasImage}
              onChange={(event) =>
                setCropDraft((current) => ({
                  ...current,
                  [key]: Number(event.target.value) / 100,
                }))
              }
            />
          </label>
        ))}
        <div className="retouch-actions">
          <button
            className="button button-primary"
            disabled={!hasImage}
            onClick={applyCropDraft}
          >
            Apply crop
          </button>
          <button
            className="text-button"
            disabled={!hasImage}
            onClick={() => commitDocumentTransform(defaultDocumentTransform)}
          >
            Reset geometry
          </button>
        </div>
        <p className="tool-note">
          Crop coordinates are relative to the original image. Rotation and flips remain
          editable, and the same transform is used for preview, local save, and
          full-resolution export.
        </p>
      </section>
    </>
  );
}
