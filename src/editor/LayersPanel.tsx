import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Folder,
  Image as ImageIcon,
  SlidersHorizontal,
  Type,
} from 'lucide-react';
import {
  DEFAULT_MANUAL_ADJUSTMENTS,
  type ManualAdjustmentSettings,
} from '../lib/manualEditing';
import type { LayerMask } from '../lib/layerMasks';

export type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
};

export type StudioLayer = {
  id: string;
  name: string;
  type: 'image' | 'adjustment' | 'text' | 'group';
  groupId?: string | null;
  expanded?: boolean;
  visible: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  text?: string;
  color?: string;
  fontSize?: number;
  adjustments?: Adjustments;
  manualAdjustments?: ManualAdjustmentSettings;
  mask?: LayerMask | null;
  masks?: LayerMask[];
};

const BLEND_MODES: GlobalCompositeOperation[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
];

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
export type HslChannel = (typeof HSL_CHANNEL_OPTIONS)[number];

const CURVE_CHANNEL_OPTIONS = ['master', 'red', 'green', 'blue'] as const;
export type CurveChannel = (typeof CURVE_CHANNEL_OPTIONS)[number];

const DEFAULTS: Adjustments = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };

export type LayerMaskTool = 'off' | 'reveal' | 'hide' | 'position';

export interface LayersPanelProps {
  layers: StudioLayer[];
  hasImage: boolean;
  selectedLayerId: string;
  selectedLayer: StudioLayer | null;
  selectedLayerMask: LayerMask | null;
  draggedLayerId: string | null;
  layerMaskView: boolean;
  layerMaskTool: LayerMaskTool;
  layerMaskBrushSize: number;
  selectedCurveChannel: CurveChannel;
  selectedHslChannel: HslChannel;
  maskThumbnailRef: React.RefObject<HTMLCanvasElement | null>;
  setDraggedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedLayerMaskId: React.Dispatch<React.SetStateAction<string>>;
  setLayerMaskView: React.Dispatch<React.SetStateAction<boolean>>;
  setLayerMaskTool: React.Dispatch<React.SetStateAction<LayerMaskTool>>;
  setLayerMaskBrushSize: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCurveChannel: React.Dispatch<React.SetStateAction<CurveChannel>>;
  setSelectedHslChannel: React.Dispatch<React.SetStateAction<HslChannel>>;
  addLayerGroup: () => void;
  addAdjustmentLayer: () => void;
  addTextLayer: () => void;
  updateLayer: (id: string, patch: Partial<StudioLayer>) => void;
  toggleGroupExpanded: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;
  reorderLayer: (sourceId: string, targetId: string) => void;
  addLayerMask: (kind: LayerMask['kind']) => void;
  updateSelectedLayerMask: (patch: Partial<LayerMask>) => void;
  removeSelectedLayer: () => void;
}

export default function LayersPanel({
  layers,
  hasImage,
  selectedLayerId,
  selectedLayer,
  selectedLayerMask,
  draggedLayerId,
  layerMaskView,
  layerMaskTool,
  layerMaskBrushSize,
  selectedCurveChannel,
  selectedHslChannel,
  maskThumbnailRef,
  setDraggedLayerId,
  setSelectedLayerId,
  setSelectedLayerMaskId,
  setLayerMaskView,
  setLayerMaskTool,
  setLayerMaskBrushSize,
  setSelectedCurveChannel,
  setSelectedHslChannel,
  addLayerGroup,
  addAdjustmentLayer,
  addTextLayer,
  updateLayer,
  toggleGroupExpanded,
  moveLayer,
  reorderLayer,
  addLayerMask,
  updateSelectedLayerMask,
  removeSelectedLayer,
}: LayersPanelProps): React.JSX.Element {
  const selectedLayerManual = selectedLayer?.manualAdjustments || DEFAULT_MANUAL_ADJUSTMENTS;
  return (
    <section className="tool-panel layer-panel" id="layers-workspace" data-panel="advanced">
      <div className="section-title">
        <div>
          <p className="eyebrow">DOCUMENT STACK</p>
          <h2>Layers</h2>
        </div>
        <span>{layers.length} layers</span>
      </div>
      <div className="layer-add-actions">
        <button
          className="button button-quiet"
          disabled={!hasImage}
          onClick={addLayerGroup}
        >
          + Group
        </button>
        <button
          className="button button-quiet"
          disabled={!hasImage}
          onClick={addAdjustmentLayer}
        >
          + Adjustment
        </button>
        <button
          className="button button-quiet"
          disabled={!hasImage}
          onClick={addTextLayer}
        >
          + Text
        </button>
      </div>
      <div className="layer-list" role="listbox" aria-label="Document layers">
        {[...layers]
          .reverse()
          .filter((layer) => {
            if (!layer.groupId) return true;
            const parent = layers.find((candidate) => candidate.id === layer.groupId);
            return parent?.type !== 'group' || parent.expanded !== false;
          })
          .map((layer) => (
            <div
              key={layer.id}
              draggable
              onDragStart={(event) => {
                setDraggedLayerId(layer.id);
                document.body.dataset.draggedLayerId = layer.id;
                event.dataTransfer.setData('text/plain', layer.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId =
                  event.dataTransfer.getData('text/plain') ||
                  document.body.dataset.draggedLayerId ||
                  draggedLayerId;
                if (sourceId) reorderLayer(sourceId, layer.id);
                delete document.body.dataset.draggedLayerId;
                setDraggedLayerId(null);
              }}
              onDragEnd={() => {
                delete document.body.dataset.draggedLayerId;
                setDraggedLayerId(null);
              }}
              className={`layer-row ${selectedLayerId === layer.id ? 'selected' : ''} ${layer.type === 'group' ? 'layer-group-row' : ''}`}
              style={{ marginLeft: layer.groupId ? 18 : 0 }}
            >
              <button
                className="layer-visibility"
                aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
              >
                {layer.visible ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
              </button>
              {layer.type === 'group' && (
                <button
                  className="layer-visibility"
                  aria-label={`${layer.expanded === false ? 'Expand' : 'Collapse'} ${layer.name}`}
                  onClick={() => toggleGroupExpanded(layer.id)}
                >
                  {layer.expanded === false ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                </button>
              )}
              <button
                className="layer-select"
                role="option"
                aria-selected={selectedLayerId === layer.id}
                onClick={() => {
                  setSelectedLayerId(layer.id);
                  setLayerMaskView(false);
                  setLayerMaskTool('off');
                }}
              >
                <span className={`layer-thumb layer-thumb-${layer.type}`}>
                  {layer.type === 'image' ? (
                    <ImageIcon size={13} aria-hidden="true" />
                  ) : layer.type === 'adjustment' ? (
                    <SlidersHorizontal size={13} aria-hidden="true" />
                  ) : layer.type === 'group' ? (
                    <Folder size={13} aria-hidden="true" />
                  ) : (
                    <Type size={13} aria-hidden="true" />
                  )}
                </span>
                <span>
                  <strong>{layer.name}</strong>
                  <small>
                    {layer.type === 'image'
                      ? 'Pixel layer'
                      : layer.type === 'adjustment'
                        ? 'Adjustment layer'
                        : layer.type === 'group'
                          ? layers.filter((child) => child.groupId === layer.id).length +
                            ' child layers'
                          : 'Type layer'}
                  </small>
                </span>
              </button>
              <span className="layer-reorder">
                <button
                  aria-label={`Move ${layer.name} up`}
                  onClick={() => moveLayer(layer.id, 1)}
                >
                  <ChevronUp size={12} aria-hidden="true" />
                </button>
                <button
                  aria-label={`Move ${layer.name} down`}
                  onClick={() => moveLayer(layer.id, -1)}
                >
                  <ChevronDown size={12} aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
      </div>
      {selectedLayer && (
        <div className="layer-properties">
          <label className="layer-name-control">
            <span>Layer name</span>
            <input
              value={selectedLayer.name}
              onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
            />
          </label>
          <div className="layer-mask-panel">
            <strong>Layer mask</strong>
            <div className="layer-mask-list">
              {(
                selectedLayer.masks || (selectedLayer.mask ? [selectedLayer.mask] : [])
              ).map((mask, index) => (
                <div className="layer-mask-item" key={mask.id}>
                  <canvas
                    data-layer-mask-thumb={mask.id}
                    width="56"
                    height="32"
                    aria-label={(mask.name || 'Layer mask') + ' thumbnail'}
                  />
                  <button
                    className={
                      selectedLayerMask?.id === mask.id
                        ? 'button button-primary'
                        : 'button button-quiet'
                    }
                    onClick={() => {
                      setSelectedLayerMaskId(mask.id);
                      setLayerMaskView(false);
                      setLayerMaskTool('off');
                    }}
                  >
                    {mask.name || mask.kind + ' mask ' + (index + 1)}
                  </button>
                  <button
                    className="button button-quiet"
                    aria-label="Move mask up"
                    onClick={() => {
                      const all = [
                        ...(selectedLayer.masks ||
                          (selectedLayer.mask ? [selectedLayer.mask] : [])),
                      ];
                      if (index > 0) {
                        [all[index - 1], all[index]] = [all[index], all[index - 1]];
                        updateLayer(selectedLayer.id, { masks: all });
                      }
                    }}
                  >
                    <ChevronUp size={12} aria-hidden="true" />
                  </button>
                  <button
                    className="button button-quiet"
                    aria-label="Move mask down"
                    onClick={() => {
                      const all = [
                        ...(selectedLayer.masks ||
                          (selectedLayer.mask ? [selectedLayer.mask] : [])),
                      ];
                      if (index < all.length - 1) {
                        [all[index + 1], all[index]] = [all[index], all[index + 1]];
                        updateLayer(selectedLayer.id, { masks: all });
                      }
                    }}
                  >
                    <ChevronDown size={12} aria-hidden="true" />
                  </button>
                  <button
                    className="button button-quiet"
                    aria-label={
                      (mask.enabled ? 'Disable ' : 'Enable ') + (mask.name || 'mask')
                    }
                    onClick={() => {
                      const nextMask = { ...mask, enabled: !mask.enabled };
                      const all =
                        selectedLayer.masks ||
                        (selectedLayer.mask ? [selectedLayer.mask] : []);
                      updateLayer(selectedLayer.id, {
                        mask:
                          selectedLayerMask?.id === mask.id
                            ? nextMask
                            : selectedLayer.mask,
                        masks: all.map((item) => (item.id === mask.id ? nextMask : item)),
                      });
                    }}
                  >
                    {mask.enabled ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
            <div className="layer-mask-actions">
              <button
                className="button button-quiet"
                onClick={() => addLayerMask('brush')}
              >
                + Paint mask
              </button>
              <button
                className="button button-quiet"
                onClick={() => addLayerMask('linear')}
              >
                + Linear
              </button>
              <button
                className="button button-quiet"
                onClick={() => addLayerMask('radial')}
              >
                + Radial
              </button>
            </div>
            <div className="layer-mask-preview">
              {selectedLayer.masks?.length || selectedLayer.mask ? (
                <>
                  <canvas
                    ref={maskThumbnailRef}
                    aria-label="Live grayscale layer mask thumbnail"
                  />
                  <span>
                    {(
                      selectedLayerMask?.kind ||
                      selectedLayer.mask?.kind ||
                      'brush'
                    ).toUpperCase()}{' '}
                    · {selectedLayerMask?.strokes.length || 0} stroke(s)
                  </span>
                </>
              ) : (
                'No mask attached'
              )}
            </div>
            {!(selectedLayer.masks?.length || selectedLayer.mask) ? (
              <p>No mask selected. Add a mask above to begin.</p>
            ) : (
              <>
                <label className="layer-name-control">
                  <span>Mask name</span>
                  <input
                    value={selectedLayerMask?.name || ''}
                    placeholder="Layer mask"
                    onChange={(event) =>
                      updateSelectedLayerMask({ name: event.target.value })
                    }
                  />
                </label>
                <div className="layer-mask-actions">
                  <button
                    className={
                      layerMaskView ? 'button button-primary' : 'button button-quiet'
                    }
                    onClick={() => setLayerMaskView((value) => !value)}
                  >
                    {layerMaskView ? 'Return to image' : 'Edit mask view'}
                  </button>
                  <button
                    className={
                      layerMaskTool === 'reveal'
                        ? 'button button-primary'
                        : 'button button-quiet'
                    }
                    onClick={() =>
                      setLayerMaskTool(layerMaskTool === 'reveal' ? 'off' : 'reveal')
                    }
                  >
                    Reveal brush
                  </button>
                  <button
                    className={
                      layerMaskTool === 'hide'
                        ? 'button button-primary'
                        : 'button button-quiet'
                    }
                    onClick={() =>
                      setLayerMaskTool(layerMaskTool === 'hide' ? 'off' : 'hide')
                    }
                  >
                    Hide brush
                  </button>
                  {selectedLayerMask?.kind !== 'brush' && (
                    <button
                      className={
                        layerMaskTool === 'position'
                          ? 'button button-primary'
                          : 'button button-quiet'
                      }
                      onClick={() =>
                        setLayerMaskTool(
                          layerMaskTool === 'position' ? 'off' : 'position',
                        )
                      }
                    >
                      Position gradient
                    </button>
                  )}
                  <button
                    className="button button-quiet"
                    onClick={() =>
                      updateSelectedLayerMask({ inverted: !selectedLayerMask?.inverted })
                    }
                  >
                    Invert
                  </button>
                  <button
                    className="button button-quiet"
                    onClick={() =>
                      updateSelectedLayerMask({ enabled: !selectedLayerMask?.enabled })
                    }
                  >
                    {selectedLayerMask?.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <label className="range-control">
                  <span>
                    <span>Mask brush size</span>
                    <strong>{layerMaskBrushSize}</strong>
                  </span>
                  <input
                    type="range"
                    min="5"
                    max="140"
                    value={layerMaskBrushSize}
                    onChange={(event) =>
                      setLayerMaskBrushSize(Number(event.target.value))
                    }
                  />
                </label>
                <label className="range-control">
                  <span>
                    <span>Mask feather</span>
                    <strong>{selectedLayerMask?.feather || 0}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedLayerMask?.feather || 0}
                    onChange={(event) =>
                      updateSelectedLayerMask({ feather: Number(event.target.value) })
                    }
                  />
                </label>
                {selectedLayerMask?.kind !== 'brush' && (
                  <label className="range-control">
                    <span>
                      <span>Gradient radius</span>
                      <strong>{selectedLayerMask?.radius || 35}%</strong>
                    </span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={selectedLayerMask?.radius || 35}
                      onChange={(event) =>
                        updateSelectedLayerMask({ radius: Number(event.target.value) })
                      }
                    />
                  </label>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    const remaining = (
                      selectedLayer.masks ||
                      (selectedLayer.mask ? [selectedLayer.mask] : [])
                    ).filter((mask) => mask.id !== selectedLayerMask?.id);
                    const nextActive = remaining[remaining.length - 1] || null;
                    updateLayer(selectedLayer.id, { mask: nextActive, masks: remaining });
                    setSelectedLayerMaskId(nextActive?.id || '');
                    setLayerMaskTool('off');
                  }}
                >
                  Remove layer mask
                </button>
              </>
            )}
          </div>
          <label className="range-control">
            <span>
              <span>Opacity</span>
              <strong>{selectedLayer.opacity}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLayer.opacity}
              onChange={(e) =>
                updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })
              }
            />
          </label>
          {selectedLayer.type !== 'group' && (
            <label className="layer-name-control">
              <span>Layer group</span>
              <select
                value={selectedLayer.groupId || ''}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, { groupId: e.target.value || null })
                }
              >
                <option value="">No group</option>
                {layers
                  .filter((layer) => layer.type === 'group')
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="layer-name-control">
            <span>Blend mode</span>
            <select
              value={selectedLayer.blendMode}
              onChange={(e) =>
                updateLayer(selectedLayer.id, {
                  blendMode: e.target.value as GlobalCompositeOperation,
                })
              }
            >
              {BLEND_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.replace('-', ' ')}
                </option>
              ))}
            </select>
          </label>
          {selectedLayer.type === 'adjustment' && (
            <div className="layer-adjustment-controls">
              <p className="tool-note">
                This layer has its own editable tone, color, curves and HSL settings.
                Changes remain separate from the background and other layers.
              </p>
              <h4>Light & color</h4>
              {(
                [
                  ['exposure', 'Exposure', -200, 200, ''],
                  ['brightness', 'Brightness', -100, 100, ''],
                  ['contrast', 'Contrast', -100, 100, ''],
                  ['highlights', 'Highlights', -100, 100, ''],
                  ['shadows', 'Shadows', -100, 100, ''],
                  ['whites', 'Whites', -100, 100, ''],
                  ['blacks', 'Blacks', -100, 100, ''],
                  ['temperature', 'Temperature', -100, 100, ''],
                  ['tint', 'Tint', -100, 100, ''],
                  ['vibrance', 'Vibrance', -100, 100, ''],
                  ['saturation', 'Saturation', -100, 100, ''],
                ] as const
              ).map(([key, label, min, max, unit]) => (
                <label className="range-control" key={key}>
                  <span>
                    <span>{label}</span>
                    <strong>
                      {selectedLayerManual[key]}
                      {unit}
                    </strong>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={selectedLayerManual[key]}
                    onChange={(event) =>
                      updateLayer(selectedLayer.id, {
                        manualAdjustments: {
                          ...selectedLayerManual,
                          [key]: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
              <details className="layer-advanced-controls">
                <summary>Tone curve & effects</summary>
                <label className="layer-name-control">
                  <span>Tone curve channel</span>
                  <select
                    value={selectedCurveChannel}
                    onChange={(event) =>
                      setSelectedCurveChannel(event.target.value as CurveChannel)
                    }
                  >
                    {CURVE_CHANNEL_OPTIONS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel === 'master' ? 'Master RGB' : channel.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ['Shadows', 'Shadows'],
                    ['Darks', 'Darks'],
                    ['Lights', 'Lights'],
                    ['Highlights', 'Highlights'],
                  ] as const
                ).map(([part, label]) => {
                  const prefix =
                    selectedCurveChannel === 'master'
                      ? 'curve'
                      : 'curve' +
                        selectedCurveChannel[0].toUpperCase() +
                        selectedCurveChannel.slice(1);
                  const key = (prefix + part) as keyof ManualAdjustmentSettings;
                  return (
                    <label className="range-control" key={key}>
                      <span>
                        <span>{label}</span>
                        <strong>{selectedLayerManual[key]}</strong>
                      </span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedLayerManual[key]}
                        onChange={(event) =>
                          updateLayer(selectedLayer.id, {
                            manualAdjustments: {
                              ...selectedLayerManual,
                              [key]: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  );
                })}
                {(
                  [
                    ['grain', 'Film grain'],
                    ['vignette', 'Vignette'],
                    ['filmFade', 'Film fade'],
                    ['bloom', 'Bloom'],
                    ['dehaze', 'Dehaze'],
                    ['clarity', 'Clarity'],
                    ['sharpening', 'Sharpening'],
                    ['noiseReduction', 'Noise reduction'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="range-control" key={key}>
                    <span>
                      <span>{label}</span>
                      <strong>{selectedLayerManual[key]}</strong>
                    </span>
                    <input
                      type="range"
                      min={key === 'vignette' || key === 'dehaze' ? -100 : 0}
                      max={100}
                      value={selectedLayerManual[key]}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, {
                          manualAdjustments: {
                            ...selectedLayerManual,
                            [key]: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
                <label className="layer-name-control">
                  <span>HSL color range</span>
                  <select
                    value={selectedHslChannel}
                    onChange={(event) =>
                      setSelectedHslChannel(event.target.value as HslChannel)
                    }
                  >
                    {HSL_CHANNEL_OPTIONS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel[0].toUpperCase() + channel.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                {(['Hue', 'Saturation', 'Luminance'] as const).map((part) => {
                  const key = ('hsl' +
                    selectedHslChannel[0].toUpperCase() +
                    selectedHslChannel.slice(1) +
                    part) as keyof ManualAdjustmentSettings;
                  return (
                    <label className="range-control" key={key}>
                      <span>
                        <span>
                          {selectedHslChannel} {part}
                        </span>
                        <strong>{selectedLayerManual[key]}</strong>
                      </span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedLayerManual[key]}
                        onChange={(event) =>
                          updateLayer(selectedLayer.id, {
                            manualAdjustments: {
                              ...selectedLayerManual,
                              [key]: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  );
                })}
              </details>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  updateLayer(selectedLayer.id, {
                    manualAdjustments: { ...DEFAULT_MANUAL_ADJUSTMENTS },
                    adjustments: { ...DEFAULTS },
                  })
                }
              >
                Reset this adjustment layer
              </button>
            </div>
          )}
          {selectedLayer.type === 'text' && (
            <>
              <label className="layer-name-control">
                <span>Text content</span>
                <input
                  value={selectedLayer.text || ''}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { text: e.target.value })
                  }
                />
              </label>
              <label className="layer-name-control">
                <span>Text color</span>
                <input
                  type="color"
                  value={selectedLayer.color || '#ffffff'}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { color: e.target.value })
                  }
                />
              </label>
              <label className="range-control">
                <span>
                  <span>Font size</span>
                  <strong>{selectedLayer.fontSize || 72}px</strong>
                </span>
                <input
                  type="range"
                  min="16"
                  max="180"
                  value={selectedLayer.fontSize || 72}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                  }
                />
              </label>
            </>
          )}
          <button
            className="text-button layer-delete"
            disabled={selectedLayer.type === 'image'}
            onClick={removeSelectedLayer}
          >
            {selectedLayer.type === 'group'
              ? 'Ungroup and remove'
              : 'Remove selected layer'}
          </button>
        </div>
      )}
    </section>
  );
}
