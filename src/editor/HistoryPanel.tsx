import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import type {
  HealStroke,
  LocalMask,
  SelectionState,
} from '../lib/advancedEditing';
import type { ManualAdjustmentSettings } from '../lib/manualEditing';
import type { BrushStroke, NormalizedPoint } from '../lib/portraitRetouch';
import type { FaceMakeupSettings } from '../lib/faceMakeup';
import type { FaceAccessory, FaceAccessorySettings } from '../lib/faceAccessories';
import { type StudioLayer, type Adjustments } from './LayersPanel';
import { type DocumentTransform } from './AdjustmentPanel';

// DEFAULT_DOCUMENT_TRANSFORM is module-level in Home.tsx but not exported, so it
// is re-declared locally with the identical value to keep this component
// self-contained.
const DEFAULT_DOCUMENT_TRANSFORM: DocumentTransform = {
  crop: { x: 0, y: 0, width: 1, height: 1 },
  rotation: 0,
  flipX: false,
  flipY: false,
};

// EditorSnapshot is module-level in Home.tsx but not exported, so it is
// re-declared locally (same shape) to keep this component self-contained.
type EditorSnapshot = {
  documentTransform?: DocumentTransform;
  adjustments: Adjustments;
  manualAdjustments: ManualAdjustmentSettings;
  localMasks: LocalMask[];
  healStrokes: HealStroke[];
  selection?: SelectionState | null;
  layers?: StudioLayer[];
  selectedLayerId?: string;
  selectedFilterId?: string;
  filterIntensity?: number;
  filterBaseManualSettings?: ManualAdjustmentSettings | null;
  retouchStrength?: number;
  retouchStrokes?: BrushStroke[];
  faceLandmarks?: NormalizedPoint[][];
  faceMakeup?: FaceMakeupSettings;
  faceAccessory?: FaceAccessory;
  faceAccessorySettings?: FaceAccessorySettings;
};

export interface HistoryPanelProps {
  history: EditorSnapshot[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  setAdjustments: React.Dispatch<React.SetStateAction<Adjustments>>;
  setManualAdjustments: React.Dispatch<React.SetStateAction<ManualAdjustmentSettings>>;
  setLocalMasks: React.Dispatch<React.SetStateAction<LocalMask[]>>;
  setHealStrokes: React.Dispatch<React.SetStateAction<HealStroke[]>>;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState | null>>;
  setDocumentTransform: React.Dispatch<React.SetStateAction<DocumentTransform>>;
  setLayers: React.Dispatch<React.SetStateAction<StudioLayer[]>>;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string>>;
}

export default function HistoryPanel({
  history,
  historyIndex,
  canUndo,
  canRedo,
  undo,
  redo,
  setHistoryIndex,
  setAdjustments,
  setManualAdjustments,
  setLocalMasks,
  setHealStrokes,
  setSelection,
  setDocumentTransform,
  setLayers,
  setSelectedLayerId,
}: HistoryPanelProps): React.JSX.Element {
  return (
              <section className="tool-panel history-panel" id="history-workspace" data-panel="adjust">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">NON-DESTRUCTIVE WORKFLOW</p>
                    <h2>History</h2>
                  </div>
                  <span>{history.length} states</span>
                </div>
                <div className="history-timeline">
                  {history.map((entry, index) => (
                    <button
                      key={index}
                      className={`history-entry ${index === historyIndex ? 'current' : ''}`}
                      onClick={() => {
                        setHistoryIndex(index);
                        setAdjustments(entry.adjustments);
                        setManualAdjustments(entry.manualAdjustments);
                        setLocalMasks(entry.localMasks);
                        setHealStrokes(entry.healStrokes);
                        setSelection(entry.selection || null);
                        setDocumentTransform(entry.documentTransform || DEFAULT_DOCUMENT_TRANSFORM);
                        if (entry.layers) setLayers(entry.layers.map((layer) => ({ ...layer })));
                        if (entry.selectedLayerId) setSelectedLayerId(entry.selectedLayerId);
                      }}
                    >
                      <span className="history-dot" />
                      <span>
                        <strong>{index === 0 ? 'Original state' : `Edit state ${index}`}</strong>
                        <small>
                          {index === historyIndex
                            ? 'Current state'
                            : index < historyIndex
                              ? 'Previous state'
                              : 'Redo state'}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="history-footer">
                  <button className="button button-quiet" onClick={undo} disabled={!canUndo}>
                    <Undo2 size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} /> Undo
                  </button>
                  <button className="button button-quiet" onClick={redo} disabled={!canRedo}>
                    <Redo2 size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} /> Redo
                  </button>
                </div>
              </section>
  );
}
