import React from 'react';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import type {
  HealStroke,
  LocalMask,
  SelectionState,
} from '../lib/advancedEditing';
import type { ManualAdjustmentSettings } from '../lib/manualEditing';

type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };

type LocalTool = 'off' | 'brush' | 'linear' | 'radial' | 'heal';
type TonalBrush = 'dodge' | 'burn' | null;
type SelectionMode = 'off' | 'add' | 'subtract';
type RetouchMode = 'off' | 'brush';

export interface MaskingPanelProps {
  hasImage: boolean;
  localTool: LocalTool;
  setLocalTool: React.Dispatch<React.SetStateAction<LocalTool>>;
  tonalBrush: TonalBrush;
  setTonalBrush: React.Dispatch<React.SetStateAction<TonalBrush>>;
  selectionMode: SelectionMode;
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionMode>>;
  selection: SelectionState | null;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState | null>>;
  selectionBrushSize: number;
  setSelectionBrushSize: React.Dispatch<React.SetStateAction<number>>;
  selectionFeather: number;
  setSelectionFeather: React.Dispatch<React.SetStateAction<number>>;
  commitSelection: (next: SelectionState | null) => void;
  localBrushSize: number;
  setLocalBrushSize: React.Dispatch<React.SetStateAction<number>>;
  localExposure: number;
  setLocalExposure: React.Dispatch<React.SetStateAction<number>>;
  localTemperature: number;
  setLocalTemperature: React.Dispatch<React.SetStateAction<number>>;
  localSaturation: number;
  setLocalSaturation: React.Dispatch<React.SetStateAction<number>>;
  localRadius: number;
  setLocalRadius: React.Dispatch<React.SetStateAction<number>>;
  localFeather: number;
  setLocalFeather: React.Dispatch<React.SetStateAction<number>>;
  localMasks: LocalMask[];
  selectedMaskId: string | null;
  setSelectedMaskId: React.Dispatch<React.SetStateAction<string | null>>;
  healStrokes: HealStroke[];
  adjustments: Adjustments;
  manualAdjustments: ManualAdjustmentSettings;
  commitSnapshot: (
    nextAdjustments: Adjustments,
    nextManual: ManualAdjustmentSettings,
    nextMasks?: LocalMask[],
    nextHeal?: HealStroke[],
  ) => void;
  updateSelectedMask: (patch: Partial<LocalMask>) => void;
  setRetouchMode: React.Dispatch<React.SetStateAction<RetouchMode>>;
}

export default function MaskingPanel({
  hasImage,
  localTool,
  setLocalTool,
  tonalBrush,
  setTonalBrush,
  selectionMode,
  setSelectionMode,
  selection,
  setSelection,
  selectionBrushSize,
  setSelectionBrushSize,
  selectionFeather,
  setSelectionFeather,
  commitSelection,
  localBrushSize,
  setLocalBrushSize,
  localExposure,
  setLocalExposure,
  localTemperature,
  setLocalTemperature,
  localSaturation,
  setLocalSaturation,
  localRadius,
  setLocalRadius,
  localFeather,
  setLocalFeather,
  localMasks,
  selectedMaskId,
  setSelectedMaskId,
  healStrokes,
  adjustments,
  manualAdjustments,
  commitSnapshot,
  updateSelectedMask,
  setRetouchMode,
}: MaskingPanelProps): React.JSX.Element {
  return (
    <section className="tool-panel" data-panel="advanced">
      <div className="section-title">
        <div>
          <p className="eyebrow">LOCAL ADJUSTMENTS</p>
          <h2>Masking & healing</h2>
        </div>
        <span className="offline-tag">ON DEVICE</span>
      </div>
      <p className="tool-note">
        Choose a brush, linear gradient, or radial mask, then paint or place it on the
        preview. Healing uses nearby pixels and stays local to this photo.
      </p>
      <div className="retouch-actions">
        {(['off', 'brush', 'linear', 'radial', 'heal'] as const).map((tool) => (
          <button
            key={tool}
            className={
              localTool === tool ? 'button button-primary' : 'button button-quiet'
            }
            disabled={!hasImage}
            onClick={() => {
              setLocalTool(tool);
              if (tool === 'brush' || tool === 'off') setTonalBrush(null);
            }}
          >
            {tool === 'off'
              ? 'Select'
              : tool === 'brush'
                ? 'Brush mask'
                : tool === 'linear'
                  ? 'Gradient'
                  : tool === 'radial'
                    ? 'Radial'
                    : 'Healing'}
          </button>
        ))}
      </div>
      <div className="selection-workspace">
        <strong>Selection brush</strong>
        <p className="tool-note">
          Paint a selection, then local brush/gradient adjustments are restricted to the
          selected area.
        </p>
        <div className="retouch-actions">
          <button
            className={
              selectionMode === 'add' ? 'button button-primary' : 'button button-quiet'
            }
            disabled={!hasImage}
            onClick={() => {
              setSelectionMode(selectionMode === 'add' ? 'off' : 'add');
              setLocalTool('off');
            }}
          >
            Add selection
          </button>
          <button
            className={
              selectionMode === 'subtract'
                ? 'button button-primary'
                : 'button button-quiet'
            }
            disabled={!hasImage}
            onClick={() => {
              setSelectionMode(selectionMode === 'subtract' ? 'off' : 'subtract');
              setLocalTool('off');
            }}
          >
            Subtract
          </button>
          <button
            className="button button-quiet"
            disabled={!selection}
            onClick={() =>
              commitSelection(
                selection ? { ...selection, inverted: !selection.inverted } : null,
              )
            }
          >
            Invert
          </button>
          <button
            className="button button-quiet"
            disabled={!selection}
            onClick={() => commitSelection(null)}
          >
            Clear
          </button>
        </div>
        <label className="range-control">
          <span>
            <span>Selection brush size</span>
            <strong>{selectionBrushSize}</strong>
          </span>
          <input
            type="range"
            min="5"
            max="120"
            value={selectionBrushSize}
            onChange={(e) => setSelectionBrushSize(Number(e.target.value))}
          />
        </label>
        <label className="range-control">
          <span>
            <span>Selection feather</span>
            <strong>{selectionFeather}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={selectionFeather}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSelectionFeather(value);
              setSelection((current) =>
                current ? { ...current, feather: value } : current,
              );
            }}
          />
        </label>
        <span className="tool-note">
          {selection
            ? `${selection.strokes.length} selection stroke(s) · ${selection.inverted ? 'inverted' : 'normal'}`
            : 'No active selection'}
        </span>
      </div>
      <div className="retouch-actions" aria-label="Tonal brushes">
        <button
          className={
            tonalBrush === 'dodge' ? 'button button-primary' : 'button button-quiet'
          }
          disabled={!hasImage}
          onClick={() => {
            setTonalBrush('dodge');
            setLocalTool('brush');
            setRetouchMode('off');
            setLocalExposure(28);
            setLocalTemperature(0);
            setLocalSaturation(0);
          }}
        >
          <Sun size={12} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />Dodge
        </button>
        <button
          className={
            tonalBrush === 'burn' ? 'button button-primary' : 'button button-quiet'
          }
          disabled={!hasImage}
          onClick={() => {
            setTonalBrush('burn');
            setLocalTool('brush');
            setRetouchMode('off');
            setLocalExposure(-28);
            setLocalTemperature(0);
            setLocalSaturation(0);
          }}
        >
          <Moon size={12} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />Burn
        </button>
      </div>
      {tonalBrush && localTool === 'brush' && (
        <p className="tool-note">
          {tonalBrush === 'dodge' ? 'Dodge brightens' : 'Burn darkens'} the painted area
          with a feathered exposure mask. Adjust exposure below for strength, then paint
          directly on the photo. Select Brush mask to return to general local
          adjustments.
        </p>
      )}
      <label className="range-control">
        <span>
          <span>Brush size</span>
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
      {(
        [
          ['Local exposure', localExposure, setLocalExposure],
          ['Local temperature', localTemperature, setLocalTemperature],
          ['Local saturation', localSaturation, setLocalSaturation],
        ] as const
      ).map(([label, value, setter]) => (
        <label className="range-control" key={label}>
          <span>
            <span>{label}</span>
            <strong>{value}</strong>
          </span>
          <input
            type="range"
            min="-100"
            max="100"
            value={value}
            onChange={(e) => setter(Number(e.target.value))}
          />
        </label>
      ))}
      <label className="range-control">
        <span>
          <span>Mask radius</span>
          <strong>{localRadius}%</strong>
        </span>
        <input
          type="range"
          min="10"
          max="80"
          value={localRadius}
          onChange={(e) => setLocalRadius(Number(e.target.value))}
        />
      </label>
      <label className="range-control">
        <span>
          <span>Mask feather</span>
          <strong>{localFeather}%</strong>
        </span>
        <input
          type="range"
          min="5"
          max="100"
          value={localFeather}
          onChange={(e) => setLocalFeather(Number(e.target.value))}
        />
      </label>
      <div className="mask-workspace" aria-label="Mask workspace">
        <div className="mask-workspace-heading">
          <strong>Mask workspace</strong>
          <span className="tool-note">{localMasks.length} mask(s)</span>
        </div>
        {localMasks.length === 0 ? (
          <p className="tool-note">
            Paint a brush, linear, or radial mask to manage it here.
          </p>
        ) : (
          <div className="mask-list">
            {localMasks.map((mask, index) => (
              <div
                className={`mask-row ${selectedMaskId === mask.id ? 'selected' : ''}`}
                key={mask.id}
              >
                <button
                  className="mask-select"
                  onClick={() => setSelectedMaskId(mask.id)}
                  aria-pressed={selectedMaskId === mask.id}
                >
                  <span>{mask.name || `${mask.kind} mask ${index + 1}`}</span>
                  <small>
                    {mask.kind} · {mask.exposure > 0 ? '+' : ''}
                    {mask.exposure} EV
                  </small>
                </button>
                <button
                  className="icon-button"
                  aria-label={`${mask.visible === false ? 'Show' : 'Hide'} ${mask.name || 'mask'}`}
                  title={
                    mask.visible === false ? 'Show mask effect' : 'Hide mask effect'
                  }
                  onClick={() => {
                    const next = localMasks.map((item) =>
                      item.id === mask.id
                        ? { ...item, visible: item.visible === false }
                        : item,
                    );
                    commitSnapshot(adjustments, manualAdjustments, next, healStrokes);
                  }}
                >
                  {mask.visible === false ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${mask.name || 'mask'}`}
                  title="Delete mask"
                  onClick={() => {
                    const next = localMasks.filter((item) => item.id !== mask.id);
                    setSelectedMaskId(next.at(-1)?.id || null);
                    commitSnapshot(adjustments, manualAdjustments, next, healStrokes);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {selectedMaskId && localMasks.some((mask) => mask.id === selectedMaskId) && (
          <div className="mask-selected-note">
            Selected mask:{' '}
            {localMasks.find((mask) => mask.id === selectedMaskId)?.name ||
              'Untitled mask'}
            . Edit this mask below; the active selection remains applied when it is
            rendered and exported.
            {(() => {
              const mask = localMasks.find((item) => item.id === selectedMaskId);
              if (!mask) return null;
              return (
                <div className="selected-mask-controls">
                  {(
                    [
                      ['Exposure', 'exposure', -100, 100],
                      ['Temperature', 'temperature', -100, 100],
                      ['Saturation', 'saturation', -100, 100],
                      ['Feather', 'feather', 0, 100],
                      ['Brush size', 'size', 5, 120],
                    ] as const
                  ).map(([label, key, min, max]) => (
                    <label className="range-control" key={key}>
                      <span>
                        <span>{label}</span>
                        <strong>{mask[key]}</strong>
                      </span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={mask[key]}
                        onChange={(event) =>
                          updateSelectedMask({ [key]: Number(event.target.value) })
                        }
                      />
                    </label>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <div className="retouch-actions">
        <button
          className="text-button"
          disabled={!localMasks.length && !healStrokes.length}
          onClick={() => {
            setSelectedMaskId(null);
            commitSnapshot(adjustments, manualAdjustments, [], []);
          }}
        >
          Clear local edits
        </button>
        <span className="tool-note">{healStrokes.length} healing stroke(s)</span>
      </div>
    </section>
  );
}
