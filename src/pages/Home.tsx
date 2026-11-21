import { Link } from 'react-router-dom';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LibraryToolsPanel = React.lazy(() => import('../components/LibraryToolsPanel'));
const VideoStudioFrame = React.lazy(() => import('../components/VideoStudioFrame'));
const CloudSyncPanel = React.lazy(() => import('../components/CloudSyncPanel'));
const MiaControlCenter = React.lazy(() => import('../components/MiaControlCenter'));
const ClientGalleryPanel = React.lazy(() => import('../components/ClientGalleryPanel'));
import AIDock from '../components/AIDock';
import StudioSplitter, {
  readStudioLayout,
  writeStudioLayout,
} from '../components/StudioSplitter';
import FilterThumbnail from '../components/FilterThumbnail';
import ImageLibrary from '../editor/ImageLibrary';
import EditorToolbar from '../editor/EditorToolbar';
import LayersPanel from '../editor/LayersPanel';
import HistoryPanel from '../editor/HistoryPanel';
import BatchWorkspace from '../editor/BatchWorkspace';
import EffectsPanel from '../editor/EffectsPanel';
import AdjustmentPanel from '../editor/AdjustmentPanel';
import MaskingPanel from '../editor/MaskingPanel';
import BackgroundPanel from '../editor/BackgroundPanel';
import RetouchPanel from '../editor/RetouchPanel';
import StyleAssistantPanel from '../editor/StyleAssistantPanel';
import DeliveryWorkspace from '../editor/DeliveryWorkspace';
import {
  Upload,
  Save,
  Download,
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
  Columns2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Brush,
  Wand2,
  Type,
  Crop,
  MousePointer2,
  Bandage,
  Check,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Folder,
  ArrowUpRight,
  Eye,
  EyeOff,
  Star,
  FlipHorizontal2,
  FlipVertical2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import {
  savePhoto,
  getAllPhotos,
  saveStyleRecipe,
  getStyleRecipes,
  deleteStyleRecipe,
} from '../lib/storage';
import type { Photo, FilterRecipe, StyleRecipe } from '../lib/types';
import { CATEGORIES, FILTER_LIBRARY } from '../lib/filters';
import { mapFilterRecipeToManualSettings } from '../lib/filterMapping';
import { getPreviewDimensions } from '../lib/renderSizing';
import { reorderLayerSiblings } from '../lib/layerGroups';
import {
  applyLayerMask,
  applyLayerMasks,
  layerMaskWeight,
  type LayerMask,
} from '../lib/layerMasks';
import { interpretStylePrompt, type StyleInterpretation } from '../lib/styleAssistant';
import {
  applyHealing,
  applyLocalMasks,
  renderSelectionOverlay,
  type HealStroke,
  type LocalMask,
  type SelectionState,
} from '../lib/advancedEditing';
import {
  applyManualAdjustments,
  DEFAULT_MANUAL_ADJUSTMENTS,
  type ManualAdjustmentSettings,
} from '../lib/manualEditing';
import {
  applyPortraitRetouch,
  detectFaceLandmarks,
  suppressSpecularGlare,
  type BrushStroke,
  type NormalizedPoint,
} from '../lib/portraitRetouch';
import { detectBlemishes } from '../lib/blemishDetect';
import {
  adjustmentFilter,
  loadImage,
  readAsDataUrl,
  safeExportName,
} from '../lib/domImage';
import {
  applyBackgroundOps,
  computePersonMask,
  DEFAULT_BACKGROUND_OPS,
  type BackgroundOps,
} from '../lib/segmentation';
import { applyFaceMakeup, DEFAULT_FACE_MAKEUP, type FaceMakeupSettings } from '../lib/faceMakeup';
import {
  applyFaceAccessories,
  DEFAULT_FACE_ACCESSORY_SETTINGS,
  type FaceAccessory,
  type FaceAccessorySettings,
} from '../lib/faceAccessories';

type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };
type Preset = { id: string; name: string; values: Adjustments };
type StudioLayer = {
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

type DocumentTransform = {
  crop: { x: number; y: number; width: number; height: number };
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
};
const DEFAULT_DOCUMENT_TRANSFORM: DocumentTransform = {
  crop: { x: 0, y: 0, width: 1, height: 1 },
  rotation: 0,
  flipX: false,
  flipY: false,
};

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
const DEFAULTS: Adjustments = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };

const PRESETS: Preset[] = [
  { id: 'natural', name: 'Natural', values: DEFAULTS },
  {
    id: 'portrait',
    name: 'Portrait',
    values: { brightness: 104, contrast: 96, saturation: 92, warmth: 3 },
  },
  {
    id: 'golden',
    name: 'Golden hour',
    values: { brightness: 106, contrast: 108, saturation: 112, warmth: 22 },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    values: { brightness: 96, contrast: 122, saturation: 82, warmth: -5 },
  },
  {
    id: 'mono',
    name: 'Monochrome',
    values: { brightness: 100, contrast: 115, saturation: 0, warmth: 0 },
  },
  {
    id: 'vintage',
    name: 'Soft vintage',
    values: { brightness: 106, contrast: 88, saturation: 78, warmth: 12 },
  },
  {
    id: 'vivid',
    name: 'Vivid',
    values: { brightness: 103, contrast: 112, saturation: 132, warmth: 0 },
  },
];
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const PICK_TAG = 'pro-pick';
const REJECT_TAG = 'pro-reject';
const ALBUM_TAG_PREFIX = 'pro-album:';
const RATING_TAG_PREFIX = 'pro-rating:';
const MAX_BATCH_PHOTOS = 20;
const MAX_BATCH_TOTAL_PIXELS = 80_000_000;
type BatchPhotoItem = {
  id: string;
  file: File;
  image: HTMLImageElement;
  originalPreview: string;
  previewUrl?: string;
  status?: 'ready' | 'done' | 'error';
  error?: string;
};

/** Tools exposed by the contextual inspector for each workspace.
 *  Every target is an existing panel id — no placeholder controls. */
type InspectorTool = { label: string; section: string; target: string };
const INSPECTOR_TOOLS: Record<string, InspectorTool[]> = {
  editor: [
    { label: 'Adjustments', section: 'editor', target: 'color-workspace' },
    { label: 'Masking', section: 'editor', target: 'masking-workspace' },
    { label: 'Layers', section: 'editor', target: 'layers-workspace' },
    { label: 'History', section: 'editor', target: 'history-workspace' },
  ],
  retouch: [
    { label: 'Portrait', section: 'retouch', target: 'retouch-workspace' },
    { label: 'Background', section: 'retouch', target: 'background-workspace' },
  ],
  effects: [{ label: 'Looks', section: 'effects', target: 'effects-workspace' }],
  assets: [{ label: 'Batch', section: 'assets', target: 'assets-workspace' }],
  export: [
    { label: 'Export', section: 'export', target: 'export-workspace' },
    { label: 'Gallery', section: 'export', target: 'deliver-workspace' },
  ],
  mia: [{ label: 'AI Dock', section: 'mia', target: 'mia-workspace' }],
};

async function renderStyleBlob(
  image: HTMLImageElement,
  recipe: StyleRecipe,
  format: 'image/jpeg' | 'image/png' | 'image/webp',
  maxEdge = 0,
): Promise<Blob> {
  const scale = maxEdge
    ? Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
    : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a batch preview canvas.');
  const a = recipe.adjustments;
  context.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.filter = 'none';
  if (a.warmth !== 0) {
    context.globalCompositeOperation = 'soft-light';
    context.fillStyle =
      a.warmth > 0
        ? `rgba(255, 164, 72, ${Math.min(0.22, a.warmth / 400)})`
        : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(a.warmth) / 500)})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
  }
  applyManualAdjustments(canvas, {
    ...DEFAULT_MANUAL_ADJUSTMENTS,
    ...(recipe.manualAdjustments || {}),
  });
  applyLocalMasks(canvas, recipe.localMasks || []);
  if (recipe.retouchEnabled && recipe.retouchStrength > 0) {
    const faces = await detectFaceLandmarks(image);
    applyPortraitRetouch(canvas, { strength: recipe.retouchStrength, faces, strokes: [] });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render a batch image.'))),
      format,
      0.94,
    );
  });
}

function renderStudioDocument(
  image: HTMLImageElement,
  width: number,
  height: number,
  layers: StudioLayer[],
  adjustments: Adjustments,
  manualAdjustments: ManualAdjustmentSettings,
  localMasks: LocalMask[],
  healStrokes: HealStroke[],
  retouchStrength: number,
  faceLandmarks: NormalizedPoint[][],
  retouchStrokes: BrushStroke[],
  faceMakeup: FaceMakeupSettings,
  faceAccessory: FaceAccessory,
  faceAccessorySettings: FaceAccessorySettings,
  documentTransform: DocumentTransform = DEFAULT_DOCUMENT_TRANSFORM,
  selection: SelectionState | null = null,
  background: { mask: HTMLCanvasElement | null; ops: BackgroundOps } | null = null,
  retouchOptions: { faceStrengths?: Array<number | null>; glare?: number } = {},
): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create an editing canvas.');
  const drawStack = (target: CanvasRenderingContext2D, parentId: string | null) => {
    const children = layers.filter((layer) => (layer.groupId || null) === parentId);
    for (const layer of children) {
      if (!layer.visible) continue;
      if (layer.type === 'group') {
        const groupCanvas = document.createElement('canvas');
        groupCanvas.width = width;
        groupCanvas.height = height;
        const groupContext = groupCanvas.getContext('2d');
        if (!groupContext) continue;
        drawStack(groupContext, layer.id);
        applyLayerMasks(groupCanvas, layer.masks || (layer.mask ? [layer.mask] : []));
        target.save();
        target.globalAlpha = Math.max(0, Math.min(100, layer.opacity)) / 100;
        target.globalCompositeOperation = layer.blendMode;
        target.drawImage(groupCanvas, 0, 0);
        target.restore();
        continue;
      }

      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = width;
      layerCanvas.height = height;
      const layerContext = layerCanvas.getContext('2d');
      if (!layerContext) continue;
      if (layer.type === 'image') {
        const base = document.createElement('canvas');
        base.width = width;
        base.height = height;
        const baseContext = base.getContext('2d');
        if (baseContext) {
          baseContext.drawImage(image, 0, 0, width, height);
          applyManualAdjustments(base, manualAdjustments);
          applyLocalMasks(base, localMasks, selection);
          applyHealing(base, healStrokes);
          applyPortraitRetouch(base, {
            strength: retouchStrength,
            faces: faceLandmarks,
            strokes: retouchStrokes,
            faceStrengths: retouchOptions.faceStrengths,
          });
          if ((retouchOptions.glare ?? 0) > 0 && faceLandmarks.length) {
            suppressSpecularGlare(base, faceLandmarks, retouchOptions.glare);
          }
          applyFaceMakeup(base, faceLandmarks, faceMakeup);
          applyFaceAccessories(base, faceLandmarks, faceAccessory, faceAccessorySettings);
          layerContext.drawImage(base, 0, 0);
        }
      } else if (layer.type === 'adjustment') {
        const processed = document.createElement('canvas');
        processed.width = width;
        processed.height = height;
        const pc = processed.getContext('2d');
        if (pc) {
          const layerAdjustments = layer.adjustments || adjustments;
          pc.filter = adjustmentFilter(layerAdjustments);
          pc.drawImage(target.canvas, 0, 0, width, height);
          pc.filter = 'none';
          if (layerAdjustments.warmth !== 0) {
            pc.globalCompositeOperation = 'soft-light';
            pc.fillStyle =
              layerAdjustments.warmth > 0
                ? `rgba(255, 164, 72, ${Math.min(0.22, layerAdjustments.warmth / 400)})`
                : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(layerAdjustments.warmth) / 500)})`;
            pc.fillRect(0, 0, width, height);
            pc.globalCompositeOperation = 'source-over';
          }
          applyManualAdjustments(processed, layer.manualAdjustments || DEFAULT_MANUAL_ADJUSTMENTS);
          layerContext.drawImage(processed, 0, 0);
        }
      } else if (layer.type === 'text' && layer.text) {
        const size =
          Math.max(12, layer.fontSize || 64) *
          (width / Math.max(image.naturalWidth, image.naturalHeight));
        layerContext.font = `600 ${Math.max(12, size)}px Inter, sans-serif`;
        layerContext.textAlign = 'center';
        layerContext.textBaseline = 'middle';
        layerContext.fillStyle = layer.color || '#ffffff';
        layerContext.shadowColor = '#00000099';
        layerContext.shadowBlur = Math.max(1, size * 0.12);
        layerContext.fillText(layer.text, width / 2, height / 2, width * 0.84);
      }
      applyLayerMasks(layerCanvas, layer.masks || (layer.mask ? [layer.mask] : []));
      target.save();
      target.globalAlpha = Math.max(0, Math.min(100, layer.opacity)) / 100;
      target.globalCompositeOperation = layer.blendMode;
      target.drawImage(layerCanvas, 0, 0);
      target.restore();
    }
  };
  drawStack(ctx, null);
  if (background?.mask && background.ops.mode !== 'none') {
    applyBackgroundOps(output, output, background.mask, background.ops);
  }
  const crop = documentTransform.crop;
  const sx = Math.max(0, Math.min(width - 1, Math.round(crop.x * width)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(crop.y * height)));
  const sw = Math.max(1, Math.min(width - sx, Math.round(crop.width * width)));
  const sh = Math.max(1, Math.min(height - sy, Math.round(crop.height * height)));
  const quarterTurn = documentTransform.rotation === 90 || documentTransform.rotation === 270;
  const transformed = document.createElement('canvas');
  transformed.width = quarterTurn ? sh : sw;
  transformed.height = quarterTurn ? sw : sh;
  const transformContext = transformed.getContext('2d');
  if (!transformContext) throw new Error('Your browser could not create the transformed canvas.');
  transformContext.translate(transformed.width / 2, transformed.height / 2);
  transformContext.rotate((documentTransform.rotation * Math.PI) / 180);
  transformContext.scale(documentTransform.flipX ? -1 : 1, documentTransform.flipY ? -1 : 1);
  transformContext.drawImage(output, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  return transformed;
}

export default function Home(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const batchItemsRef = useRef<BatchPhotoItem[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceMime, setSourceMime] = useState('image/jpeg');
  const [sourceFileSize, setSourceFileSize] = useState(0);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const [documentTransform, setDocumentTransform] = useState<DocumentTransform>(
    DEFAULT_DOCUMENT_TRANSFORM,
  );
  const [cropDraft, setCropDraft] = useState(DEFAULT_DOCUMENT_TRANSFORM.crop);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [layerMaskTool, setLayerMaskTool] = useState<'off' | 'reveal' | 'hide' | 'position'>('off');
  const [layerMaskBrushSize, setLayerMaskBrushSize] = useState(36);
  const [layerMaskView, setLayerMaskView] = useState(false);
  const [selectedLayerMaskId, setSelectedLayerMaskId] = useState('');
  const maskThumbnailRef = useRef<HTMLCanvasElement>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [newLayerText, setNewLayerText] = useState('Your text');
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULTS);
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustmentSettings>(
    DEFAULT_MANUAL_ADJUSTMENTS,
  );
  const [localMasks, setLocalMasks] = useState<LocalMask[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [selectionMode, setSelectionMode] = useState<'off' | 'add' | 'subtract'>('off');
  const [selectionBrushSize, setSelectionBrushSize] = useState(28);
  const [selectionFeather, setSelectionFeather] = useState(20);
  const [healStrokes, setHealStrokes] = useState<HealStroke[]>([]);
  const [localTool, setLocalTool] = useState<'off' | 'brush' | 'linear' | 'radial' | 'heal'>('off');
  const [tonalBrush, setTonalBrush] = useState<'dodge' | 'burn' | null>(null);
  const [localBrushSize, setLocalBrushSize] = useState(34);
  const [localExposure, setLocalExposure] = useState(30);
  const [localTemperature, setLocalTemperature] = useState(12);
  const [localSaturation, setLocalSaturation] = useState(15);
  const [localFeather, setLocalFeather] = useState(70);
  const [localRadius, setLocalRadius] = useState(35);
  const [selectedHslChannel, setSelectedHslChannel] = useState<HslChannel>('red');
  const [selectedCurveChannel, setSelectedCurveChannel] = useState<CurveChannel>('master');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'professional' | 'portrait'>(
    'professional',
  );
  const [history, setHistory] = useState<EditorSnapshot[]>([
    {
      adjustments: DEFAULTS,
      manualAdjustments: DEFAULT_MANUAL_ADJUSTMENTS,
      localMasks: [],
      healStrokes: [],
      selection: null,
      layers: [],
      selectedLayerId: '',
      selectedFilterId: '',
      filterIntensity: 100,
      filterBaseManualSettings: null,
      retouchStrength: 55,
      retouchStrokes: [],
      faceLandmarks: [],
      faceMakeup: DEFAULT_FACE_MAKEUP,
      faceAccessory: 'none',
      faceAccessorySettings: DEFAULT_FACE_ACCESSORY_SETTINGS,
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    'Your photos stay on this device unless you choose to export them.',
  );
  const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]);
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(
    'image/jpeg',
  );
  const [prompt, setPrompt] = useState('');
  const [styleInterpretation, setStyleInterpretation] = useState<StyleInterpretation | null>(null);
  const [activeSection, setActiveSection] = useState('editor');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [retouchMode, setRetouchMode] = useState<'off' | 'brush'>('off');
  const [retouchStrength, setRetouchStrength] = useState(55);
  const [backgroundOps, setBackgroundOps] = useState<BackgroundOps>(DEFAULT_BACKGROUND_OPS);
  const [personMask, setPersonMask] = useState<HTMLCanvasElement | null>(null);
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [faceStrengths, setFaceStrengths] = useState<Array<number | null>>([]);
  const [glareSoftness, setGlareSoftness] = useState(0);
  const [brushSize, setBrushSize] = useState(28);
  const [faceLandmarks, setFaceLandmarks] = useState<NormalizedPoint[][]>([]);
  const [retouchStrokes, setRetouchStrokes] = useState<BrushStroke[]>([]);
  const [faceMakeup, setFaceMakeup] = useState<FaceMakeupSettings>(DEFAULT_FACE_MAKEUP);
  const [faceAccessory, setFaceAccessory] = useState<FaceAccessory>('none');
  const [faceAccessorySettings, setFaceAccessorySettings] = useState<FaceAccessorySettings>(
    DEFAULT_FACE_ACCESSORY_SETTINGS,
  );
  const [detectingFaces, setDetectingFaces] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterVisibleCount, setFilterVisibleCount] = useState(24);
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [selectedFilterId, setSelectedFilterId] = useState('');
  const [favoriteFilterIds, setFavoriteFilterIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('every-frame-favorite-filters');
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  });
  const filterBaseManualRef = useRef<ManualAdjustmentSettings | null>(null);
  const [styleRecipes, setStyleRecipes] = useState<StyleRecipe[]>([]);
  const [styleRecipeName, setStyleRecipeName] = useState('');
  const [selectedStyleRecipeId, setSelectedStyleRecipeId] = useState('');
  const [batchItems, setBatchItems] = useState<BatchPhotoItem[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [adHocBatchRecipe, setAdHocBatchRecipe] = useState<StyleRecipe | null>(null);
  const batchCancelRef = useRef(false);
  const [batchFormat, setBatchFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(
    'image/jpeg',
  );

  const stageRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);

  const navigateStudio = (section: string, target: string) => {
    setActiveSection(section);
    if (section === 'retouch') setActiveWorkspace('portrait');
    if (['color', 'effects', 'compositing', 'assets'].includes(section))
      setActiveWorkspace('professional');
    window.setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      40,
    );
  };

  // Restore saved column widths / collapsed state from `studio-layout`.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const layout = readStudioLayout();
    shell.style.setProperty('--pro-left', `${layout.left}px`);
    shell.style.setProperty('--pro-right', `${layout.right}px`);
    setLibraryCollapsed(layout.collapsedLibrary);
    setToolsCollapsed(layout.collapsedTools);
  }, []);

  const toggleLibraryColumn = () => {
    const next = !libraryCollapsed;
    setLibraryCollapsed(next);
    writeStudioLayout({ ...readStudioLayout(), collapsedLibrary: next });
  };

  const toggleToolsColumn = () => {
    const next = !toolsCollapsed;
    setToolsCollapsed(next);
    writeStudioLayout({ ...readStudioLayout(), collapsedTools: next });
  };

  const persistPhotoTags = useCallback(async (photo: Photo, tags: string[]) => {
    const updated: Photo = { ...photo, tags, updatedAt: new Date().toISOString() };
    try {
      await savePhoto(updated);
      setSavedPhotos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error('Could not update library photo', error);
      setMessage('Could not save that library change. Try again.');
    }
  }, []);

  const togglePhotoTags = useCallback(
    (photo: Photo, additions: string[]) => {
      const tags = new Set(photo.tags);
      for (const tag of additions) {
        if (tags.has(tag)) {
          tags.delete(tag);
          continue;
        }
        tags.add(tag);
        if (tag === PICK_TAG) tags.delete(REJECT_TAG);
        if (tag === REJECT_TAG) tags.delete(PICK_TAG);
      }
      void persistPhotoTags(photo, [...tags]);
    },
    [persistPhotoTags],
  );

  const setPhotoRating = useCallback(
    (photo: Photo, rating: number) => {
      const tags = photo.tags.filter((tag) => !tag.startsWith(RATING_TAG_PREFIX));
      if (rating >= 1 && rating <= 5) tags.push(`${RATING_TAG_PREFIX}${rating}`);
      void persistPhotoTags(photo, tags);
    },
    [persistPhotoTags],
  );

  const createAlbumAndAssign = useCallback(
    (name: string) => {
      const albumTag = `${ALBUM_TAG_PREFIX}${name}`;
      const target = savedPhotos.find((photo) => photo.id === selectedPhotoId);
      if (!target) {
        setMessage(`Album "${name}" ready — open a saved photo to assign it.`);
        return;
      }
      if (!target.tags.includes(albumTag)) {
        void persistPhotoTags(target, [...target.tags, albumTag]);
      }
      setMessage(`“${target.name}” added to album “${name}”.`);
    },
    [persistPhotoTags, savedPhotos, selectedPhotoId],
  );

  const render = useCallback(
    (next: Adjustments, showOriginal = false) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) return;
      // Interactive rendering is capped independently from exportPhoto, which always
      // renders using the source image's natural dimensions.
      const { width, height } = getPreviewDimensions(image.naturalWidth, image.naturalHeight);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (showOriginal) {
        ctx.drawImage(image, 0, 0, width, height);
        return;
      }
      const rendered = renderStudioDocument(
        image,
        width,
        height,
        layers,
        next,
        manualAdjustments,
        localMasks,
        healStrokes,
        retouchStrength,
        faceLandmarks,
        retouchStrokes,
        faceMakeup,
        faceAccessory,
        faceAccessorySettings,
        documentTransform,
        selection,
        { mask: personMask, ops: backgroundOps },
        { faceStrengths, glare: glareSoftness },
      );
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      if (
        layerMaskView &&
        (layers
          .find((layer) => layer.id === selectedLayerId)
          ?.masks?.find((mask) => mask.id === selectedLayerMaskId) ||
          layers.find((layer) => layer.id === selectedLayerId)?.mask)
      ) {
        const activeLayer = layers.find((layer) => layer.id === selectedLayerId)!;
        const mask =
          activeLayer.masks?.find((item) => item.id === selectedLayerMaskId) || activeLayer.mask!;
        const imageData = ctx.createImageData(rendered.width, rendered.height);
        for (let y = 0; y < rendered.height; y++) {
          for (let x = 0; x < rendered.width; x++) {
            const gray = Math.round(
              layerMaskWeight(mask, x, y, rendered.width, rendered.height) * 255,
            );
            const index = (y * rendered.width + x) * 4;
            imageData.data[index] = gray;
            imageData.data[index + 1] = gray;
            imageData.data[index + 2] = gray;
            imageData.data[index + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      } else {
        ctx.drawImage(rendered, 0, 0);
        renderSelectionOverlay(canvas, selection);
      }
    },
    [
      layers,
      faceLandmarks,
      retouchStrokes,
      faceMakeup,
      faceAccessory,
      faceAccessorySettings,
      retouchStrength,
      manualAdjustments,
      localMasks,
      healStrokes,
      documentTransform,
      selection,
      personMask,
      backgroundOps,
      faceStrengths,
      glareSoftness,
    ],
  );

  useEffect(() => {
    // Coalesce rapid slider/state changes into one canvas render per animation frame.
    const frame = window.requestAnimationFrame(() => render(adjustments, compare));
    return () => window.cancelAnimationFrame(frame);
  }, [adjustments, compare, render, sourceUrl]);
  useEffect(() => {
    const canvas = maskThumbnailRef.current;
    const activeLayer = layers.find((layer) => layer.id === selectedLayerId);
    const mask =
      activeLayer?.masks?.find((item) => item.id === selectedLayerMaskId) || activeLayer?.mask;
    if (!canvas || !mask) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = 112;
    const height = 64;
    canvas.width = width;
    canvas.height = height;
    const pixels = context.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gray = Math.round(layerMaskWeight(mask, x, y, width, height) * 255);
        const index = (y * width + x) * 4;
        pixels.data[index] = gray;
        pixels.data[index + 1] = gray;
        pixels.data[index + 2] = gray;
        pixels.data[index + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const allMasks = activeLayer?.masks || (activeLayer?.mask ? [activeLayer.mask] : []);
    document.querySelectorAll<HTMLCanvasElement>('[data-layer-mask-thumb]').forEach((thumb) => {
      const thumbMask = allMasks.find((item) => item.id === thumb.dataset.layerMaskThumb);
      if (!thumbMask) return;
      const thumbContext = thumb.getContext('2d');
      if (!thumbContext) return;
      const thumbPixels = thumbContext.createImageData(thumb.width, thumb.height);
      for (let y = 0; y < thumb.height; y++)
        for (let x = 0; x < thumb.width; x++) {
          const gray = Math.round(
            layerMaskWeight(thumbMask, x, y, thumb.width, thumb.height) * 255,
          );
          const i = (y * thumb.width + x) * 4;
          thumbPixels.data[i] = gray;
          thumbPixels.data[i + 1] = gray;
          thumbPixels.data[i + 2] = gray;
          thumbPixels.data[i + 3] = 255;
        }
      thumbContext.putImageData(thumbPixels, 0, 0);
    });
  }, [layers, selectedLayerId, selectedLayerMaskId]);
  useEffect(() => {
    getAllPhotos()
      .then(setSavedPhotos)
      .catch(() => setMessage('Local photo storage is unavailable in this browser session.'));
  }, []);
  useEffect(() => {
    getStyleRecipes()
      .then(setStyleRecipes)
      .catch(() => setMessage('Style Recipe storage is unavailable.'));
  }, []);
  useEffect(() => {
    batchItemsRef.current = batchItems;
  }, [batchItems]);
  useEffect(
    () => () => {
      for (const item of batchItemsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );
  useEffect(
    () => () => {
      if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'every-frame-favorite-filters',
        JSON.stringify(favoriteFilterIds),
      );
    } catch {
      setMessage('Favorites are available for this session, but browser storage is unavailable.');
    }
  }, [favoriteFilterIds]);

  const toggleFavoriteFilter = (filterId: string) => {
    setFavoriteFilterIds((current) =>
      current.includes(filterId) ? current.filter((id) => id !== filterId) : [...current, filterId],
    );
  };
  useEffect(() => setFilterVisibleCount(24), [filterCategory, filterQuery]);
  const hasImage = Boolean(sourceUrl);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const visibleFilters = useMemo(
    () =>
      FILTER_LIBRARY.filter((filter) => {
        const categoryMatch =
          filterCategory === 'all' ||
          (filterCategory === 'favorites'
            ? favoriteFilterIds.includes(filter.id)
            : filter.category === filterCategory);
        const query = filterQuery.trim().toLowerCase();
        const queryMatch =
          !query ||
          `${filter.name} ${filter.description} ${filter.tokens.join(' ')}`
            .toLowerCase()
            .includes(query);
        return categoryMatch && queryMatch;
      }),
    [favoriteFilterIds, filterCategory, filterQuery],
  );
  const activePreset = useMemo(
    () => PRESETS.find((p) => JSON.stringify(p.values) === JSON.stringify(adjustments))?.id ?? '',
    [adjustments],
  );
  const curvePreviewPrefix =
    selectedCurveChannel === 'master'
      ? 'curve'
      : 'curve' + selectedCurveChannel[0].toUpperCase() + selectedCurveChannel.slice(1);
  const curvePreviewValue = (part: string) =>
    manualAdjustments[(curvePreviewPrefix + part) as keyof ManualAdjustmentSettings] as number;

  const portraitSnapshotFields = () => ({
    selectedFilterId,
    filterIntensity,
    filterBaseManualSettings: filterBaseManualRef.current
      ? { ...filterBaseManualRef.current }
      : null,
    retouchStrength,
    retouchStrokes: structuredClone(retouchStrokes),
    faceLandmarks: structuredClone(faceLandmarks),
    faceMakeup: structuredClone(faceMakeup),
    faceAccessory,
    faceAccessorySettings: structuredClone(faceAccessorySettings),
  });

  const commitPortraitSnapshot = (
    patch: Partial<Pick<EditorSnapshot, keyof ReturnType<typeof portraitSnapshotFields>>>,
  ) => {
    const next = { ...portraitSnapshotFields(), ...patch };
    setSelectedFilterId(next.selectedFilterId || '');
    setFilterIntensity(next.filterIntensity ?? 100);
    filterBaseManualRef.current = next.filterBaseManualSettings
      ? { ...next.filterBaseManualSettings }
      : null;
    setRetouchStrength(next.retouchStrength ?? 55);
    setRetouchStrokes(next.retouchStrokes || []);
    setFaceLandmarks(next.faceLandmarks || []);
    setFaceMakeup(next.faceMakeup || DEFAULT_FACE_MAKEUP);
    setFaceAccessory(next.faceAccessory || 'none');
    setFaceAccessorySettings(next.faceAccessorySettings || DEFAULT_FACE_ACCESSORY_SETTINGS);
    setHistory((current) =>
      [
        ...current.slice(0, historyIndex + 1),
        {
          adjustments,
          manualAdjustments,
          localMasks,
          healStrokes,
          selection,
          documentTransform,
          layers: layers.map((layer) => structuredClone(layer)),
          selectedLayerId,
          ...next,
        },
      ].slice(-60),
    );
    setHistoryIndex((index) => Math.min(index + 1, 59));
  };

  const commitSnapshot = (
    nextAdjustments: Adjustments,
    nextManual: ManualAdjustmentSettings,
    nextMasks = localMasks,
    nextHeal = healStrokes,
    nextSelection = selection,
    portraitPatch: Partial<
      Pick<
        EditorSnapshot,
        | 'selectedFilterId'
        | 'filterIntensity'
        | 'filterBaseManualSettings'
        | 'retouchStrength'
        | 'retouchStrokes'
        | 'faceLandmarks'
        | 'faceMakeup'
        | 'faceAccessory'
        | 'faceAccessorySettings'
      >
    > = {},
  ) => {
    setAdjustments(nextAdjustments);
    setManualAdjustments(nextManual);
    setLocalMasks(nextMasks);
    setHealStrokes(nextHeal);
    if (portraitPatch.selectedFilterId !== undefined)
      setSelectedFilterId(portraitPatch.selectedFilterId || '');
    if (portraitPatch.filterIntensity !== undefined)
      setFilterIntensity(portraitPatch.filterIntensity);
    if (portraitPatch.filterBaseManualSettings !== undefined) {
      filterBaseManualRef.current = portraitPatch.filterBaseManualSettings
        ? { ...portraitPatch.filterBaseManualSettings }
        : null;
    }
    if (portraitPatch.retouchStrength !== undefined)
      setRetouchStrength(portraitPatch.retouchStrength);
    if (portraitPatch.retouchStrokes !== undefined) setRetouchStrokes(portraitPatch.retouchStrokes);
    if (portraitPatch.faceLandmarks !== undefined) setFaceLandmarks(portraitPatch.faceLandmarks);
    if (portraitPatch.faceMakeup !== undefined) setFaceMakeup(portraitPatch.faceMakeup);
    if (portraitPatch.faceAccessory !== undefined) setFaceAccessory(portraitPatch.faceAccessory);
    if (portraitPatch.faceAccessorySettings !== undefined)
      setFaceAccessorySettings(portraitPatch.faceAccessorySettings);
    setHistory((current) =>
      [
        ...current.slice(0, historyIndex + 1),
        {
          adjustments: nextAdjustments,
          manualAdjustments: nextManual,
          localMasks: nextMasks,
          healStrokes: nextHeal,
          selection: nextSelection,
          documentTransform,
          layers: layers.map((layer) => ({ ...layer })),
          selectedLayerId,
          ...portraitSnapshotFields(),
          ...portraitPatch,
        },
      ].slice(-60),
    );
    setHistoryIndex((index) => Math.min(index + 1, 59));
  };

  const commitLayers = (next: StudioLayer[], nextSelectedLayerId = selectedLayerId) => {
    setLayers(next);
    setSelectedLayerId(nextSelectedLayerId);
    setHistory((current) =>
      [
        ...current.slice(0, historyIndex + 1),
        {
          adjustments,
          manualAdjustments,
          localMasks,
          healStrokes,
          selection,
          documentTransform,
          layers: next.map((layer) => ({ ...layer })),
          selectedLayerId: nextSelectedLayerId,
          ...portraitSnapshotFields(),
        },
      ].slice(-60),
    );
    setHistoryIndex((index) => Math.min(index + 1, 59));
  };

  const updateSelectedMask = (patch: Partial<LocalMask>) => {
    if (!selectedMaskId) return;
    const next = localMasks.map((mask) =>
      mask.id === selectedMaskId ? { ...mask, ...patch } : mask,
    );
    commitSnapshot(adjustments, manualAdjustments, next, healStrokes);
  };

  const commitSelection = (next: SelectionState | null) => {
    setSelection(next);
    setHistory((current) =>
      [
        ...current.slice(0, historyIndex + 1),
        {
          adjustments,
          manualAdjustments,
          localMasks,
          healStrokes,
          selection: next,
          documentTransform,
          layers: layers.map((layer) => ({ ...layer })),
          selectedLayerId,
          ...portraitSnapshotFields(),
        },
      ].slice(-60),
    );
    setHistoryIndex((index) => Math.min(index + 1, 59));
  };

  const commitDocumentTransform = (next: DocumentTransform) => {
    setDocumentTransform(next);
    setCropDraft(next.crop);
    setHistory((current) =>
      [
        ...current.slice(0, historyIndex + 1),
        {
          adjustments,
          manualAdjustments,
          localMasks,
          healStrokes,
          selection,
          documentTransform: next,
          layers: layers.map((layer) => structuredClone(layer)),
          selectedLayerId,
          ...portraitSnapshotFields(),
        },
      ].slice(-60),
    );
    setHistoryIndex((index) => Math.min(index + 1, 59));
    setCompare(false);
  };
  const rotateDocument = (degrees: 90 | -90) => {
    const rotation = ((documentTransform.rotation + degrees + 360) % 360) as 0 | 90 | 180 | 270;
    commitDocumentTransform({ ...documentTransform, rotation });
  };
  const applyCropDraft = () => {
    const x = Math.max(0, Math.min(0.9, cropDraft.x));
    const y = Math.max(0, Math.min(0.9, cropDraft.y));
    const width = Math.max(0.1, Math.min(1 - x, cropDraft.width));
    const height = Math.max(0.1, Math.min(1 - y, cropDraft.height));
    commitDocumentTransform({ ...documentTransform, crop: { x, y, width, height } });
    setMessage(
      `Crop applied: ${Math.round(width * 100)}% × ${Math.round(height * 100)}% of the source.`,
    );
  };

  const addHistory = (next: Adjustments) => {
    filterBaseManualRef.current = null;
    commitSnapshot(next, manualAdjustments, localMasks, healStrokes, selection, {
      selectedFilterId: '',
    });
  };

  const updateManualAdjustment = (key: keyof ManualAdjustmentSettings, value: number) => {
    commitSnapshot(adjustments, { ...manualAdjustments, [key]: value });
  };

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const selectedLayerManual = selectedLayer?.manualAdjustments || DEFAULT_MANUAL_ADJUSTMENTS;
  const updateLayer = (id: string, patch: Partial<StudioLayer>) => {
    const next = layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
    commitLayers(next);
  };
  const selectedLayerMask =
    selectedLayer?.masks?.find((mask) => mask.id === selectedLayerMaskId) ||
    selectedLayer?.mask ||
    null;
  const addLayerMask = (kind: LayerMask['kind']) => {
    if (!selectedLayer) return;
    const mask: LayerMask = {
      id: crypto.randomUUID(),
      name:
        kind === 'brush' ? 'Paint mask' : kind === 'linear' ? 'Linear gradient' : 'Radial gradient',
      kind,
      strokes: [],
      start: { x: 0.5, y: 0.5 },
      end: { x: 0.5, y: 0.95 },
      radius: 35,
      feather: 35,
      inverted: false,
      enabled: true,
    };
    const nextMasks = [
      ...(selectedLayer.masks || (selectedLayer.mask ? [selectedLayer.mask] : [])),
      mask,
    ];
    setSelectedLayerMaskId(mask.id);
    updateLayer(selectedLayer.id, { mask, masks: nextMasks });
    setLayerMaskTool(kind === 'brush' ? 'reveal' : 'off');
    setMessage(kind + ' layer mask added to ' + selectedLayer.name + '.');
  };
  const updateSelectedLayerMask = (patch: Partial<LayerMask>) => {
    if (!selectedLayer || !selectedLayerMask) return;
    const nextMask = { ...selectedLayerMask, ...patch };
    const currentMasks = selectedLayer.masks || (selectedLayer.mask ? [selectedLayer.mask] : []);
    const nextMasks = currentMasks.map((mask) => (mask.id === nextMask.id ? nextMask : mask));
    updateLayer(selectedLayer.id, { mask: nextMask, masks: nextMasks });
  };
  const addLayerGroup = () => {
    const group: StudioLayer = {
      id: crypto.randomUUID(),
      name: 'Group',
      type: 'group',
      visible: true,
      expanded: true,
      opacity: 100,
      blendMode: 'source-over',
    };
    if (selectedLayer?.type === 'group') group.groupId = selectedLayer.groupId || null;
    const next = [...layers, group];
    if (selectedLayer) {
      const selectedIndex = next.findIndex((layer) => layer.id === selectedLayer.id);
      if (selectedIndex >= 0) next[selectedIndex] = { ...selectedLayer, groupId: group.id };
    }
    commitLayers(next, group.id);
    setMessage(
      selectedLayer
        ? 'Created a group and placed the selected layer inside it.'
        : 'Created an empty layer group.',
    );
  };
  const toggleGroupExpanded = (id: string) => {
    const next = layers.map((layer) =>
      layer.id === id && layer.type === 'group' ? { ...layer, expanded: !layer.expanded } : layer,
    );
    commitLayers(next);
  };
  const removeSelectedLayer = () => {
    if (!selectedLayer || selectedLayer.type === 'image') return;
    if (selectedLayer.type === 'group') {
      const next = layers
        .filter((layer) => layer.id !== selectedLayer.id)
        .map((layer) =>
          layer.groupId === selectedLayer.id
            ? { ...layer, groupId: selectedLayer.groupId || null }
            : layer,
        );
      commitLayers(next, next[next.length - 1]?.id || '');
      return;
    }
    const next = layers.filter((layer) => layer.id !== selectedLayer.id);
    commitLayers(next, next[next.length - 1]?.id || '');
  };
  const addAdjustmentLayer = () => {
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      name: 'Color & tone',
      type: 'adjustment',
      visible: true,
      opacity: 100,
      blendMode: 'source-over',
      adjustments: { ...DEFAULTS },
      manualAdjustments: { ...DEFAULT_MANUAL_ADJUSTMENTS },
    };
    commitLayers([...layers, layer], layer.id);
  };
  const addTextLayer = () => {
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      name: 'Text',
      type: 'text',
      visible: true,
      opacity: 100,
      blendMode: 'source-over',
      text: newLayerText.trim() || 'Your text',
      color: '#ffffff',
      fontSize: 72,
    };
    commitLayers([...layers, layer], layer.id);
  };
  const moveLayer = (id: string, direction: -1 | 1) => {
    const index = layers.findIndex((layer) => layer.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layers.length) return;
    const next = [...layers];
    [next[index], next[target]] = [next[target], next[index]];
    commitLayers(next);
  };
  const reorderLayer = (sourceId: string, targetId: string) => {
    const next = reorderLayerSiblings(layers, sourceId, targetId);
    if (next) commitLayers(next);
  };

  const openFiles = async (files: FileList | File[]) => {
    const file = Array.from(files).find((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (!file) {
      setMessage('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage('This file is larger than 40 MB. Choose a smaller image for this browser editor.');
      return;
    }
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) {
        URL.revokeObjectURL(url);
        throw new Error(
          'This image exceeds the 24-megapixel safety limit. Create a smaller copy and try again.',
        );
      }
      if (sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(sourceUrl);
      imageRef.current = image;
      setSelectedPhotoId(null);
      setZoom(1);
      setPersonMask(null);
      setBackgroundOps(DEFAULT_BACKGROUND_OPS);
      setFaceStrengths([]);
      setGlareSoftness(0);
      setSourceUrl(url);
      setSourceName(file.name);
      setSourceMime(file.type);
      setSourceFileSize(file.size);
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
      const initialLayers: StudioLayer[] = [
        {
          id: crypto.randomUUID(),
          name: 'Background',
          type: 'image',
          visible: true,
          opacity: 100,
          blendMode: 'source-over',
        },
        {
          id: crypto.randomUUID(),
          name: 'Color & tone',
          type: 'adjustment',
          visible: true,
          opacity: 100,
          blendMode: 'source-over',
        },
      ];
      setLayers(initialLayers);
      setDocumentTransform(DEFAULT_DOCUMENT_TRANSFORM);
      setCropDraft(DEFAULT_DOCUMENT_TRANSFORM.crop);
      setSelectedLayerId(initialLayers[1].id);
      setSelectedLayerMaskId('');
      setLayerMaskView(false);
      setAdjustments(DEFAULTS);
      setManualAdjustments(DEFAULT_MANUAL_ADJUSTMENTS);
      setLocalMasks([]);
      setHealStrokes([]);
      setSelectedFilterId('');
      setFilterIntensity(100);
      filterBaseManualRef.current = null;
      setRetouchStrength(55);
      setFaceMakeup(DEFAULT_FACE_MAKEUP);
      setFaceAccessory('none');
      setFaceAccessorySettings(DEFAULT_FACE_ACCESSORY_SETTINGS);
      setHistory([
        {
          adjustments: DEFAULTS,
          manualAdjustments: DEFAULT_MANUAL_ADJUSTMENTS,
          localMasks: [],
          healStrokes: [],
          layers: initialLayers.map((layer) => ({ ...layer })),
          selectedLayerId: initialLayers[1].id,
          selectedFilterId: '',
          filterIntensity: 100,
          retouchStrength: 55,
          retouchStrokes: [],
          faceLandmarks: [],
          faceMakeup: DEFAULT_FACE_MAKEUP,
          faceAccessory: 'none',
          faceAccessorySettings: DEFAULT_FACE_ACCESSORY_SETTINGS,
        },
      ]);
      setHistoryIndex(0);
      setCompare(false);
      setFaceLandmarks([]);
      setRetouchStrokes([]);
      setRetouchMode('off');
      setMessage(
        `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} pixels · original preserved`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open this image.');
    } finally {
      setBusy(false);
    }
  };

  const updateAdjustment = (key: keyof Adjustments, value: number) =>
    addHistory({ ...adjustments, [key]: value });
  const applyPreset = (preset: Preset) => {
    addHistory({ ...preset.values });
    setCompare(false);
  };
  const applyLibraryFilter = (recipe: FilterRecipe, intensity = filterIntensity) => {
    if (!selectedFilterId || !filterBaseManualRef.current) {
      filterBaseManualRef.current = { ...manualAdjustments };
    }
    const base = filterBaseManualRef.current;
    const nextManual = mapFilterRecipeToManualSettings(recipe, intensity, base);
    commitSnapshot(adjustments, nextManual, localMasks, healStrokes, selection, {
      selectedFilterId: recipe.id,
      filterIntensity: intensity,
    });
    setCompare(false);
    setMessage(
      `Applied ${recipe.name} at ${intensity}% intensity. Full-resolution export uses the same local effects.`,
    );
  };
  const undo = () => {
    if (!canUndo) return;
    const index = historyIndex - 1;
    setHistoryIndex(index);
    setAdjustments(history[index].adjustments);
    setManualAdjustments(history[index].manualAdjustments);
    setLocalMasks(history[index].localMasks || []);
    setHealStrokes(history[index].healStrokes || []);
    setSelection(history[index].selection || null);
    setDocumentTransform(history[index].documentTransform || DEFAULT_DOCUMENT_TRANSFORM);
    if (history[index].layers) setLayers(history[index].layers.map((layer) => ({ ...layer })));
    if (history[index].selectedLayerId) setSelectedLayerId(history[index].selectedLayerId);
    setCropDraft((history[index].documentTransform || DEFAULT_DOCUMENT_TRANSFORM).crop);
    setSelectedFilterId(history[index].selectedFilterId || '');
    setFilterIntensity(history[index].filterIntensity ?? 100);
    filterBaseManualRef.current = history[index].filterBaseManualSettings
      ? { ...history[index].filterBaseManualSettings }
      : null;
    setRetouchStrength(history[index].retouchStrength ?? 55);
    setRetouchStrokes(structuredClone(history[index].retouchStrokes || []));
    setFaceLandmarks(structuredClone(history[index].faceLandmarks || []));
    setFaceMakeup(structuredClone(history[index].faceMakeup || DEFAULT_FACE_MAKEUP));
    setFaceAccessory(history[index].faceAccessory || 'none');
    setFaceAccessorySettings(
      structuredClone(history[index].faceAccessorySettings || DEFAULT_FACE_ACCESSORY_SETTINGS),
    );
  };
  const redo = () => {
    if (!canRedo) return;
    const index = historyIndex + 1;
    setHistoryIndex(index);
    setAdjustments(history[index].adjustments);
    setManualAdjustments(history[index].manualAdjustments);
    setLocalMasks(history[index].localMasks || []);
    setHealStrokes(history[index].healStrokes || []);
    setSelection(history[index].selection || null);
    setDocumentTransform(history[index].documentTransform || DEFAULT_DOCUMENT_TRANSFORM);
    if (history[index].layers) setLayers(history[index].layers.map((layer) => ({ ...layer })));
    if (history[index].selectedLayerId) setSelectedLayerId(history[index].selectedLayerId);
    setCropDraft((history[index].documentTransform || DEFAULT_DOCUMENT_TRANSFORM).crop);
    setSelectedFilterId(history[index].selectedFilterId || '');
    setFilterIntensity(history[index].filterIntensity ?? 100);
    filterBaseManualRef.current = history[index].filterBaseManualSettings
      ? { ...history[index].filterBaseManualSettings }
      : null;
    setRetouchStrength(history[index].retouchStrength ?? 55);
    setRetouchStrokes(structuredClone(history[index].retouchStrokes || []));
    setFaceLandmarks(structuredClone(history[index].faceLandmarks || []));
    setFaceMakeup(structuredClone(history[index].faceMakeup || DEFAULT_FACE_MAKEUP));
    setFaceAccessory(history[index].faceAccessory || 'none');
    setFaceAccessorySettings(
      structuredClone(history[index].faceAccessorySettings || DEFAULT_FACE_ACCESSORY_SETTINGS),
    );
  };
  const reset = () => {
    filterBaseManualRef.current = null;
    commitSnapshot(DEFAULTS, DEFAULT_MANUAL_ADJUSTMENTS, [], [], selection, {
      selectedFilterId: '',
      filterIntensity: 100,
    });
  };

  const exportPhoto = async () => {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    try {
      // Let React paint the busy state before the synchronous full-resolution canvas pass.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const output = renderStudioDocument(
        image,
        image.naturalWidth,
        image.naturalHeight,
        layers,
        adjustments,
        manualAdjustments,
        localMasks,
        healStrokes,
        retouchStrength,
        faceLandmarks,
        retouchStrokes,
        faceMakeup,
        faceAccessory,
        faceAccessorySettings,
        documentTransform,
        selection,
        { mask: personMask, ops: backgroundOps },
        { faceStrengths, glare: glareSoftness },
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Image export failed.'))),
          exportFormat,
          0.94,
        ),
      );
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${safeExportName(sourceName || 'photo', 'photo')}-edited.${exportFormat.split('/')[1]}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      setMessage(
        `Exported ${output.width.toLocaleString()} × ${output.height.toLocaleString()} pixels.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveToLibrary = async () => {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    try {
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      const preview = renderStudioDocument(
        image,
        Math.max(1, Math.round(image.naturalWidth * scale)),
        Math.max(1, Math.round(image.naturalHeight * scale)),
        layers,
        adjustments,
        manualAdjustments,
        localMasks,
        healStrokes,
        retouchStrength,
        faceLandmarks,
        retouchStrokes,
        faceMakeup,
        faceAccessory,
        faceAccessorySettings,
        documentTransform,
        selection,
        { mask: personMask, ops: backgroundOps },
        { faceStrengths, glare: glareSoftness },
      );
      const dataUrl = preview.toDataURL('image/jpeg', 0.88);
      const originalDataUrl = await readAsDataUrl(
        new File([await (await fetch(sourceUrl!)).blob()], sourceName || 'photo', {
          type: sourceMime,
        }),
      );
      const now = new Date().toISOString();
      const photo: Photo = {
        id: crypto.randomUUID(),
        name: sourceName || 'Untitled photo',
        type: sourceMime === 'image/png' ? 'png' : sourceMime === 'image/webp' ? 'webp' : 'jpeg',
        size: sourceFileSize,
        dimensions: { width: image.naturalWidth, height: image.naturalHeight },
        dataUrl,
        dataUrlHigh: originalDataUrl,
        createdAt: now,
        updatedAt: now,
        edits: [...Object.entries(adjustments), ...Object.entries(manualAdjustments)].map(
          ([type, value]) => ({
            type,
            value,
            min: 0,
            max: 200,
            default: 100,
            label: type,
          }),
        ),
        filterId: selectedFilterId || null,
        filterIntensity,
        filterBaseManualSettings: filterBaseManualRef.current
          ? { ...filterBaseManualRef.current }
          : null,
        isOriginalRequired: true,
        tags: [],
        selection: selection ? structuredClone(selection) : null,
        localMasks: localMasks.map((mask) => ({
          ...mask,
          points: mask.points.map((point) => ({ ...point })),
        })),
        healStrokes: healStrokes.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((point) => ({ ...point })),
        })),
        retouchStrength,
        retouchStrokes: structuredClone(retouchStrokes),
        faceLandmarks: structuredClone(faceLandmarks),
        faceMakeup: structuredClone(faceMakeup),
        faceAccessory,
        faceAccessorySettings: structuredClone(faceAccessorySettings),
        studioLayers: layers.map((layer) => ({
          ...layer,
          adjustments: layer.adjustments ? { ...layer.adjustments } : undefined,
          manualAdjustments: layer.manualAdjustments ? { ...layer.manualAdjustments } : undefined,
          mask: layer.mask ? structuredClone(layer.mask) : null,
          masks: (layer.masks || (layer.mask ? [layer.mask] : [])).map((mask) =>
            structuredClone(mask),
          ),
        })),
        documentTransform: structuredClone(documentTransform),
      };
      await savePhoto(photo);
      setSavedPhotos(await getAllPhotos());
      setMessage('Saved locally in this browser. No account or cloud upload was used.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this photo locally.');
    } finally {
      setBusy(false);
    }
  };

  const openSavedPhoto = async (photo: Photo) => {
    setBusy(true);
    try {
      const savedOriginal = photo.dataUrlHigh || photo.dataUrl;
      const imageMime =
        photo.type === 'png' ? 'image/png' : photo.type === 'webp' ? 'image/webp' : 'image/jpeg';
      // Older saves may have lost the Blob MIME type when converted to a File.
      const original = savedOriginal.startsWith('data:application/octet-stream;')
        ? savedOriginal.replace(/^data:application\/octet-stream;/, `data:${imageMime};`)
        : savedOriginal;
      const image = await loadImage(original);
      imageRef.current = image;
      setPersonMask(null);
      setBackgroundOps(DEFAULT_BACKGROUND_OPS);
      setFaceStrengths([]);
      setGlareSoftness(0);
      setSourceUrl(original);
      setSourceName(photo.name);
      setSourceMime(
        photo.type === 'png' ? 'image/png' : photo.type === 'webp' ? 'image/webp' : 'image/jpeg',
      );
      setSourceFileSize(photo.size);
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
      const restoredLayers = photo.studioLayers?.length
        ? photo.studioLayers
        : [
            {
              id: crypto.randomUUID(),
              name: 'Background',
              type: 'image' as const,
              visible: true,
              opacity: 100,
              blendMode: 'source-over' as GlobalCompositeOperation,
            },
            {
              id: crypto.randomUUID(),
              name: 'Color & tone',
              type: 'adjustment' as const,
              visible: true,
              opacity: 100,
              blendMode: 'source-over' as GlobalCompositeOperation,
            },
          ];
      setLayers(
        restoredLayers.map((layer) => ({
          ...layer,
          masks: layer.masks || (layer.mask ? [layer.mask] : []),
        })),
      );
      const restoredTransform = photo.documentTransform || DEFAULT_DOCUMENT_TRANSFORM;
      setDocumentTransform(restoredTransform);
      setCropDraft(restoredTransform.crop);
      setSelectedLayerId(restoredLayers[restoredLayers.length - 1].id);
      const restoredSelectedLayer = restoredLayers[restoredLayers.length - 1];
      setSelectedLayerMaskId(
        restoredSelectedLayer.masks?.[0]?.id || restoredSelectedLayer.mask?.id || '',
      );
      setLayerMaskView(false);
      const valueFor = (key: string, fallback: number, preferLast = false) => {
        const matches = preferLast ? [...photo.edits].reverse() : photo.edits;
        return matches.find((edit) => edit.type === key)?.value ?? fallback;
      };
      const restored: Adjustments = {
        brightness: valueFor('brightness', 100),
        contrast: valueFor('contrast', 100),
        saturation: valueFor('saturation', 100),
        warmth: valueFor('warmth', 0),
      };
      setAdjustments(restored);
      const restoredManual = Object.fromEntries(
        Object.keys(DEFAULT_MANUAL_ADJUSTMENTS).map((key) => [key, valueFor(key, 0, true)]),
      ) as unknown as ManualAdjustmentSettings;
      setManualAdjustments(restoredManual);
      setSelectedFilterId(photo.filterId || '');
      setFilterIntensity(photo.filterIntensity ?? 100);
      filterBaseManualRef.current = photo.filterBaseManualSettings
        ? { ...photo.filterBaseManualSettings }
        : photo.filterId
          ? { ...restoredManual }
          : null;
      const restoredRetouchStrength = photo.retouchStrength ?? 55;
      const restoredRetouchStrokes = photo.retouchStrokes || [];
      const restoredFaceLandmarks = photo.faceLandmarks || [];
      const restoredFaceMakeup = photo.faceMakeup || DEFAULT_FACE_MAKEUP;
      const restoredFaceAccessory = photo.faceAccessory || 'none';
      const restoredFaceAccessorySettings =
        photo.faceAccessorySettings || DEFAULT_FACE_ACCESSORY_SETTINGS;
      setRetouchStrength(restoredRetouchStrength);
      setRetouchStrokes(restoredRetouchStrokes);
      setFaceLandmarks(restoredFaceLandmarks);
      setFaceMakeup(restoredFaceMakeup);
      setFaceAccessory(restoredFaceAccessory);
      setFaceAccessorySettings(restoredFaceAccessorySettings);
      const restoredMasks = photo.localMasks || [];
      const restoredHealing = photo.healStrokes || [];
      setLocalMasks(restoredMasks);
      setHealStrokes(restoredHealing);
      const restoredSelection = photo.selection || null;
      setSelection(restoredSelection);
      const isDefault =
        JSON.stringify(restored) === JSON.stringify(DEFAULTS) &&
        JSON.stringify(restoredManual) === JSON.stringify(DEFAULT_MANUAL_ADJUSTMENTS) &&
        !restoredMasks.length &&
        !restoredHealing.length &&
        !restoredRetouchStrokes.length &&
        !restoredFaceLandmarks.length &&
        restoredRetouchStrength === 55 &&
        JSON.stringify(restoredFaceMakeup) === JSON.stringify(DEFAULT_FACE_MAKEUP) &&
        restoredFaceAccessory === 'none' &&
        JSON.stringify(restoredTransform) === JSON.stringify(DEFAULT_DOCUMENT_TRANSFORM);
      setHistory(
        isDefault
          ? [
              {
                adjustments: DEFAULTS,
                manualAdjustments: DEFAULT_MANUAL_ADJUSTMENTS,
                localMasks: [],
                healStrokes: [],
              },
            ]
          : [
              {
                adjustments: DEFAULTS,
                manualAdjustments: DEFAULT_MANUAL_ADJUSTMENTS,
                localMasks: [],
                healStrokes: [],
                layers: restoredLayers.map((layer) => ({ ...layer })),
                selectedLayerId: restoredLayers[restoredLayers.length - 1].id,
                selectedFilterId: photo.filterId || '',
                filterIntensity: photo.filterIntensity ?? 100,
                filterBaseManualSettings: photo.filterBaseManualSettings || null,
                retouchStrength: restoredRetouchStrength,
                retouchStrokes: structuredClone(restoredRetouchStrokes),
                faceLandmarks: structuredClone(restoredFaceLandmarks),
                faceMakeup: structuredClone(restoredFaceMakeup),
                faceAccessory: restoredFaceAccessory,
                faceAccessorySettings: structuredClone(restoredFaceAccessorySettings),
              },
              {
                adjustments: restored,
                manualAdjustments: restoredManual,
                localMasks: restoredMasks,
                healStrokes: restoredHealing,
                selection: restoredSelection,
                layers: restoredLayers.map((layer) => ({ ...layer })),
                selectedLayerId: restoredLayers[restoredLayers.length - 1].id,
                documentTransform: restoredTransform,
                selectedFilterId: photo.filterId || '',
                filterIntensity: photo.filterIntensity ?? 100,
                filterBaseManualSettings: photo.filterBaseManualSettings || null,
                retouchStrength: restoredRetouchStrength,
                retouchStrokes: structuredClone(restoredRetouchStrokes),
                faceLandmarks: structuredClone(restoredFaceLandmarks),
                faceMakeup: structuredClone(restoredFaceMakeup),
                faceAccessory: restoredFaceAccessory,
                faceAccessorySettings: structuredClone(restoredFaceAccessorySettings),
              },
            ],
      );
      setHistoryIndex(isDefault ? 0 : 1);
      setCompare(false);
      setSelectedPhotoId(photo.id);
      setZoom(1);
      setMessage('Restored the saved original and its local adjustment recipe.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not reopen this saved photo.');
    } finally {
      setBusy(false);
    }
  };

  const addBatchFiles = async (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    );
    if (!accepted.length) {
      setMessage('Choose JPEG, PNG, or WebP photos for batch editing.');
      return;
    }
    const added: BatchPhotoItem[] = [];
    let totalPixels = batchItems.reduce(
      (total, item) => total + item.image.naturalWidth * item.image.naturalHeight,
      0,
    );
    for (const file of accepted) {
      if (batchItems.length + added.length >= MAX_BATCH_PHOTOS) {
        setMessage(
          `A batch can contain up to ${MAX_BATCH_PHOTOS} photos. Remaining files were skipped.`,
        );
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        setMessage(`${file.name} exceeds the 40 MB file limit and was skipped.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        const pixels = image.naturalWidth * image.naturalHeight;
        if (pixels > MAX_PIXELS) {
          setMessage(`${file.name} exceeds the 24-megapixel limit and was skipped.`);
          continue;
        }
        if (totalPixels + pixels > MAX_BATCH_TOTAL_PIXELS) {
          setMessage(
            'This batch reached the 80-megapixel total safety limit. Export this group before adding more photos.',
          );
          continue;
        }
        totalPixels += pixels;
        const thumb = document.createElement('canvas');
        const thumbScale = Math.min(1, 360 / Math.max(image.naturalWidth, image.naturalHeight));
        thumb.width = Math.max(1, Math.round(image.naturalWidth * thumbScale));
        thumb.height = Math.max(1, Math.round(image.naturalHeight * thumbScale));
        thumb.getContext('2d')?.drawImage(image, 0, 0, thumb.width, thumb.height);
        added.push({
          id: crypto.randomUUID(),
          file,
          image,
          originalPreview: thumb.toDataURL('image/jpeg', 0.78),
        });
      } catch {
        setMessage(`${file.name} could not be opened and was skipped.`);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setBatchItems((current) => [...current, ...added]);
    if (added.length)
      setMessage(
        `Added ${added.length} photo(s) to the batch queue. Choose a Style Recipe and preview it.`,
      );
  };

  const clearBatchPreviews = () => {
    setBatchItems((current) =>
      current.map((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        const { previewUrl: _previewUrl, ...rest } = item;
        return rest;
      }),
    );
  };

  const saveCurrentStyle = async (nameOverride?: string) => {
    if (!hasImage) return;
    const name =
      nameOverride?.trim() || styleRecipeName.trim() || `My Style ${styleRecipes.length + 1}`;
    const recipe: StyleRecipe = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      adjustments: { ...adjustments },
      filterIntensity,
      selectedFilterId,
      retouchStrength,
      retouchEnabled: faceLandmarks.length > 0 || retouchStrokes.length > 0,
      manualAdjustments: { ...manualAdjustments },
      localMasks: localMasks.map((mask) => ({
        ...mask,
        points: mask.points.map((point) => ({ ...point })),
      })),
    };
    try {
      await saveStyleRecipe(recipe);
      const next = await getStyleRecipes();
      setStyleRecipes(next);
      setSelectedStyleRecipeId(recipe.id);
      clearBatchPreviews();
      setStyleRecipeName('');
      setMessage(`Saved “${name}” as a reusable Style Recipe on this device.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this Style Recipe.');
    }
  };

  const removeBatchPhoto = (id: string) =>
    setBatchItems((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });

  const selectedBatchRecipe =
    styleRecipes.find((item) => item.id === selectedStyleRecipeId) ?? adHocBatchRecipe;

  const syncCurrentEditsToBatch = () => {
    if (!hasImage) return;
    const recipe: StyleRecipe = {
      id: 'adhoc-current-edits',
      name: 'Current edits (unsaved)',
      createdAt: new Date().toISOString(),
      adjustments: { ...adjustments },
      filterIntensity,
      selectedFilterId,
      retouchStrength,
      retouchEnabled: faceLandmarks.length > 0 || retouchStrokes.length > 0,
      manualAdjustments: { ...manualAdjustments },
      localMasks: localMasks.map((mask) => ({
        ...mask,
        points: mask.points.map((point) => ({ ...point })),
      })),
    };
    setAdHocBatchRecipe(recipe);
    clearBatchPreviews();
    setMessage('Current edits are now the batch source. Preview or export the batch below.');
  };

  const previewBatch = async () => {
    const recipe = selectedBatchRecipe;
    if (!recipe || !batchItems.length) return;
    batchCancelRef.current = false;
    setBatchBusy(true);
    setBatchProgress({ current: 0, total: batchItems.length });
    try {
      const previews: BatchPhotoItem[] = [];
      for (const [index, item] of batchItems.entries()) {
        if (batchCancelRef.current) break;
        try {
          const blob = await renderStyleBlob(item.image, recipe, 'image/jpeg', 900);
          const previewUrl = URL.createObjectURL(blob);
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          previews.push({ ...item, previewUrl, status: 'done', error: undefined });
        } catch (error) {
          // One unreadable photo must not fail the whole batch.
          previews.push({
            ...item,
            status: 'error',
            error: error instanceof Error ? error.message : 'Preview failed',
          });
        }
        setBatchProgress({ current: index + 1, total: batchItems.length });
      }
      setBatchItems((current) => {
        const byId = new Map(previews.map((entry) => [entry.id, entry]));
        return current.map((entry) => byId.get(entry.id) ?? entry);
      });
      const failed = previews.filter((entry) => entry.status === 'error').length;
      const cancelled = batchCancelRef.current;
      setMessage(
        cancelled
          ? `Batch preview cancelled after ${previews.length} photo(s).`
          : failed
            ? `Preview ready with ${failed} failed photo(s) — they are marked in the grid.`
            : `Preview ready: ${recipe.name} applied to ${previews.length} photo(s).`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not preview this batch.');
    } finally {
      setBatchBusy(false);
      setBatchProgress(null);
    }
  };

  const exportBatch = async () => {
    const recipe = selectedBatchRecipe;
    if (!recipe || !batchItems.length) return;
    batchCancelRef.current = false;
    setBatchBusy(true);
    setBatchProgress({ current: 0, total: batchItems.length });
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const folder = zip.folder(safeExportName(recipe.name, 'edited-batch'));
      if (!folder) throw new Error('Could not create the export archive.');
      const extension = batchFormat.split('/')[1].replace('jpeg', 'jpg');
      const failures: string[] = [];
      let exported = 0;
      for (const [index, item] of batchItems.entries()) {
        if (batchCancelRef.current) break;
        try {
          const blob = await renderStyleBlob(item.image, recipe, batchFormat);
          const name = safeExportName(item.file.name, `photo-${index + 1}`);
          folder.file(`${String(index + 1).padStart(3, '0')}-${name}.${extension}`, blob);
          exported += 1;
          setBatchItems((current) =>
            current.map((entry) => (entry.id === item.id ? { ...entry, status: 'done' } : entry)),
          );
        } catch (error) {
          failures.push(item.file.name);
          setBatchItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Export failed',
                  }
                : entry,
            ),
          );
        }
        setBatchProgress({ current: index + 1, total: batchItems.length });
      }
      if (!exported) {
        setMessage('No photos could be exported from this batch.');
        return;
      }
      const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeExportName(recipe.name, 'style')}-batch.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setMessage(
        failures.length
          ? `Exported ${exported} photo(s); ${failures.length} failed (${failures[0]}${failures.length > 1 ? ', …' : ''}).`
          : batchCancelRef.current
            ? `Batch cancelled — exported ${exported} of ${batchItems.length} photo(s).`
            : `Exported ${exported} full-resolution photo(s) in a ZIP archive.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch export failed.');
    } finally {
      setBatchBusy(false);
      setBatchProgress(null);
    }
  };

  const loadStyleOnReference = () => {
    const recipe = styleRecipes.find((item) => item.id === selectedStyleRecipeId);
    if (!recipe) return;
    commitSnapshot(
      { ...recipe.adjustments },
      { ...DEFAULT_MANUAL_ADJUSTMENTS, ...(recipe.manualAdjustments || {}) },
      recipe.localMasks || [],
      [],
      selection,
      {
        filterIntensity: recipe.filterIntensity,
        filterBaseManualSettings: null,
        selectedFilterId: recipe.selectedFilterId,
        retouchStrength: recipe.retouchStrength,
      },
    );
    setCompare(false);
    setMessage(`Loaded “${recipe.name}” onto the reference photo.`);
  };

  const runBackgroundDetection = async () => {
    const image = imageRef.current;
    if (!image) return;
    setBackgroundBusy(true);
    try {
      const mask = await computePersonMask(image);
      setPersonMask(mask);
      setMessage(
        mask
          ? 'Person detected locally. Choose a background effect below.'
          : 'Background detection is unavailable in this browser session.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Background detection failed: ${error.message}`
          : 'Background detection failed. Check your connection and try again.',
      );
    } finally {
      setBackgroundBusy(false);
    }
  };

  const applyBlemishes = () => {
    const image = imageRef.current;
    if (!image) return;
    if (!faceLandmarks.length) {
      setMessage('Run Auto face detect first, then apply local blemish fixing.');
      return;
    }
    const spots = detectBlemishes(image, faceLandmarks);
    if (!spots.length) {
      setMessage('No clear blemish spots found. Use the heal brush for manual fixes.');
      return;
    }
    const nextHeal = [
      ...healStrokes,
      ...spots.map((spot) => ({
        points: [{ x: spot.x, y: spot.y }],
        size: Math.max(8, Math.round(spot.radius * 1000)),
      })),
    ];
    commitSnapshot(adjustments, manualAdjustments, localMasks, nextHeal);
    setMessage(
      `Applied ${spots.length} local healing stroke${spots.length === 1 ? '' : 's'} from blemish detection. Undo to revert.`,
    );
  };

  const runFaceDetection = async () => {
    const image = imageRef.current;
    if (!image) return;
    setDetectingFaces(true);
    try {
      const faces = await detectFaceLandmarks(image);
      commitPortraitSnapshot({ faceLandmarks: faces });
      setRetouchMode('off');
      setMessage(
        faces.length
          ? `Detected ${faces.length} face${faces.length === 1 ? '' : 's'} locally. Skin smoothing excludes eyes and lips.`
          : 'No faces were detected. Try the manual brush instead.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Face detection unavailable: ${error.message}`
          : 'Face detection could not start.',
      );
    } finally {
      setDetectingFaces(false);
    }
  };

  const pointerPoint = (event: React.PointerEvent<HTMLCanvasElement>): NormalizedPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };
  const startBrushStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    const point = pointerPoint(event);
    if (selectionMode !== 'off') {
      event.currentTarget.setPointerCapture(event.pointerId);
      const stroke = {
        points: [point],
        size: selectionBrushSize,
        operation: selectionMode,
      };
      setSelection((current) => ({
        strokes: [...(current?.strokes || []), stroke],
        inverted: current?.inverted || false,
        feather: selectionFeather,
      }));
      return;
    }
    if (layerMaskTool === 'position' && selectedLayerMask) {
      event.currentTarget.setPointerCapture(event.pointerId);
      updateSelectedLayerMask({ start: point, end: point });
      return;
    }
    if ((layerMaskTool === 'reveal' || layerMaskTool === 'hide') && selectedLayer) {
      event.currentTarget.setPointerCapture(event.pointerId);
      const current = selectedLayerMask || {
        id: crypto.randomUUID(),
        name: 'Paint mask',
        kind: 'brush' as const,
        strokes: [],
        start: point,
        end: point,
        radius: 35,
        feather: 35,
        inverted: false,
        enabled: true,
      };
      const nextMask: LayerMask = {
        ...current,
        kind: 'brush',
        strokes: [
          ...current.strokes,
          { points: [point], size: layerMaskBrushSize, mode: layerMaskTool },
        ],
      };
      const currentMasks = selectedLayer.masks || (selectedLayer.mask ? [selectedLayer.mask] : []);
      const nextMasks = currentMasks.some((mask) => mask.id === nextMask.id)
        ? currentMasks.map((mask) => (mask.id === nextMask.id ? nextMask : mask))
        : [...currentMasks, nextMask];
      setSelectedLayerMaskId(nextMask.id);
      updateLayer(selectedLayer.id, { mask: nextMask, masks: nextMasks });
      return;
    }
    if (localTool === 'heal') {
      event.currentTarget.setPointerCapture(event.pointerId);
      commitSnapshot(adjustments, manualAdjustments, localMasks, [
        ...healStrokes,
        { points: [point], size: localBrushSize },
      ]);
      return;
    }
    if (localTool === 'brush' || localTool === 'linear' || localTool === 'radial') {
      event.currentTarget.setPointerCapture(event.pointerId);
      const mask: LocalMask = {
        id: crypto.randomUUID(),
        name: `${localTool === 'brush' ? 'Brush' : localTool === 'linear' ? 'Linear gradient' : 'Radial gradient'} ${localMasks.length + 1}`,
        visible: true,
        kind: localTool,
        points: localTool === 'brush' ? [point] : [],
        center: point,
        end: point,
        radius: localRadius,
        feather: localFeather,
        exposure: localExposure,
        temperature: localTemperature,
        saturation: localSaturation,
        size: localBrushSize,
      };
      setSelectedMaskId(mask.id);
      commitSnapshot(adjustments, manualAdjustments, [...localMasks, mask], healStrokes);
      return;
    }
    if (retouchMode !== 'brush') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setRetouchStrokes((current) => [
      ...current,
      { points: [pointerPoint(event)], size: brushSize },
    ]);
  };
  const continueBrushStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (selectionMode !== 'off') {
      const point = pointerPoint(event);
      setSelection((current) => {
        if (!current?.strokes.length) return current;
        const strokes = current.strokes.map((stroke, i) =>
          i === current.strokes.length - 1
            ? { ...stroke, points: [...stroke.points, point] }
            : stroke,
        );
        return { ...current, strokes };
      });
      return;
    }
    if (layerMaskTool === 'position' && selectedLayer && selectedLayerMask) {
      const point = pointerPoint(event);
      const mask = {
        ...selectedLayerMask,
        end: point,
        radius: Math.max(
          5,
          Math.hypot(
            (point.x - selectedLayerMask.start.x) * 100,
            (point.y - selectedLayerMask.start.y) * 100,
          ),
        ),
      };
      const currentMasks = selectedLayer.masks || (selectedLayer.mask ? [selectedLayer.mask] : []);
      const nextMasks = currentMasks.map((item) => (item.id === mask.id ? mask : item));
      const next = layers.map((layer) =>
        layer.id === selectedLayer.id ? { ...layer, mask, masks: nextMasks } : layer,
      );
      setLayers(next);
      setHistory((items) =>
        items.map((entry, index) =>
          index === historyIndex
            ? { ...entry, layers: next.map((layer) => ({ ...layer })) }
            : entry,
        ),
      );
      return;
    }
    if (
      (layerMaskTool === 'reveal' || layerMaskTool === 'hide') &&
      selectedLayer &&
      selectedLayerMask
    ) {
      const point = pointerPoint(event);
      const mask = selectedLayerMask;
      const strokes = mask.strokes.map((stroke, index) =>
        index === mask.strokes.length - 1
          ? { ...stroke, points: [...stroke.points, point] }
          : stroke,
      );
      const updatedMask = { ...mask, strokes };
      const currentMasks = selectedLayer.masks || (selectedLayer.mask ? [selectedLayer.mask] : []);
      const nextMasks = currentMasks.map((item) => (item.id === mask.id ? updatedMask : item));
      const next = layers.map((layer) =>
        layer.id === selectedLayer.id ? { ...layer, mask: updatedMask, masks: nextMasks } : layer,
      );
      setLayers(next);
      setHistory((items) =>
        items.map((entry, index) =>
          index === historyIndex
            ? { ...entry, layers: next.map((layer) => ({ ...layer })) }
            : entry,
        ),
      );
      return;
    }
    if (localTool === 'linear' || localTool === 'radial') {
      const point = pointerPoint(event);
      const last = localMasks[localMasks.length - 1];
      if (last && last.kind === localTool) {
        const radius = Math.max(
          5,
          Math.hypot((point.x - last.center.x) * 100, (point.y - last.center.y) * 100),
        );
        const next = localMasks.map((mask, i) =>
          i === localMasks.length - 1
            ? { ...mask, end: point, radius: localTool === 'radial' ? radius : mask.radius }
            : mask,
        );
        setLocalMasks(next);
        setHistory((h) =>
          h.map((entry, i) => (i === historyIndex ? { ...entry, localMasks: next } : entry)),
        );
      }
      return;
    }
    if (localTool === 'brush') {
      const point = pointerPoint(event);
      const next = localMasks.map((mask, i) =>
        i === localMasks.length - 1 ? { ...mask, points: [...mask.points, point] } : mask,
      );
      setLocalMasks(next);
      setHistory((h) =>
        h.map((entry, i) => (i === historyIndex ? { ...entry, localMasks: next } : entry)),
      );
      return;
    }
    if (localTool === 'heal') {
      const point = pointerPoint(event);
      const next = healStrokes.map((stroke, i) =>
        i === healStrokes.length - 1 ? { ...stroke, points: [...stroke.points, point] } : stroke,
      );
      setHealStrokes(next);
      setHistory((h) =>
        h.map((entry, i) => (i === historyIndex ? { ...entry, healStrokes: next } : entry)),
      );
      return;
    }
    if (retouchMode !== 'brush') return;
    const point = pointerPoint(event);
    setRetouchStrokes((current) =>
      current.map((stroke, index) =>
        index === current.length - 1 ? { ...stroke, points: [...stroke.points, point] } : stroke,
      ),
    );
  };

  const finishBrushStroke = () => {
    if (selectionMode !== 'off' && selection) commitSelection(selection);
    if (retouchMode === 'brush' && retouchStrokes.length) {
      commitPortraitSnapshot({ retouchStrokes: structuredClone(retouchStrokes) });
    }
  };

  const suggestFromPrompt = () => {
    try {
      const result = interpretStylePrompt(prompt);
      setStyleInterpretation(result);
      commitSnapshot(result.settings, manualAdjustments, localMasks, healStrokes, selection, {
        filterIntensity: result.filterIntensity,
        selectedFilterId: result.filterId,
        ...(result.retouchEnabled ? { retouchStrength: result.retouchStrength } : {}),
      });
      filterBaseManualRef.current = null;
      if (result.retouchEnabled) void runFaceDetection();
      setCompare(false);
      setMessage(
        'Local Style Assistant prepared an editable recipe. Review it, then save it as a Style Recipe.',
      );
    } catch (error) {
      setStyleInterpretation(null);
      setMessage(
        error instanceof Error ? error.message : 'Could not interpret that style instruction.',
      );
    }
  };

  if (activeSection === 'creator') {
    return (
      <React.Suspense
        fallback={
          <main className="auth-screen">
            <p className="auth-muted">Loading Creator Studio…</p>
          </main>
        }
      >
        <VideoStudioFrame onBack={() => setActiveSection('home')} />
      </React.Suspense>
    );
  }

  if (activeSection === 'mia') {
    return (
      <React.Suspense
        fallback={
          <main className="auth-screen">
            <p className="auth-muted">Loading MIA Control Center…</p>
          </main>
        }
      >
        <MiaControlCenter onBack={() => setActiveSection('home')} />
      </React.Suspense>
    );
  }

  if (activeSection === 'cloud-sync') {
    return (
      <React.Suspense
        fallback={
          <main className="auth-screen">
            <p className="auth-muted">Loading private cloud sync…</p>
          </main>
        }
      >
        <CloudSyncPanel onBack={() => setActiveSection('home')} />
      </React.Suspense>
    );
  }

  const inspectorTools = INSPECTOR_TOOLS[activeSection] ?? INSPECTOR_TOOLS.editor;

  return (
    <div
      ref={shellRef}
      className="pro-shell"
      data-workspace={activeSection}
      data-advanced={advancedMode ? 'true' : 'false'}
      data-library-collapsed={libraryCollapsed ? 'true' : 'false'}
      data-tools-collapsed={toolsCollapsed ? 'true' : 'false'}
    >
      <EditorToolbar
        activeSection={activeSection}
        canUndo={canUndo}
        canRedo={canRedo}
        hasImage={hasImage}
        busy={busy}
        onNavigate={navigateStudio}
        onImport={() => fileInputRef.current?.click()}
        onUndo={undo}
        onRedo={redo}
        onReset={reset}
        onSave={saveToLibrary}
        onExport={exportPhoto}
      />
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files) void openFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={batchFileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            if (e.target.files) void addBatchFiles(e.target.files);
            e.target.value = '';
          }}
        />

      <ImageLibrary
        photos={savedPhotos}
        selectedId={selectedPhotoId}
        onOpen={(photo) => void openSavedPhoto(photo)}
        onTogglePick={(photo) => togglePhotoTags(photo, [PICK_TAG])}
        onToggleReject={(photo) => togglePhotoTags(photo, [REJECT_TAG])}
        onSetRating={setPhotoRating}
        onToggleAlbum={(photo, album) => togglePhotoTags(photo, [`${ALBUM_TAG_PREFIX}${album}`])}
        onNewAlbum={createAlbumAndAssign}
        onImportClick={() => fileInputRef.current?.click()}
      />
      <StudioSplitter side="left" shellRef={shellRef} />
      <section className="preview-column pro-canvas-col" id="editor-canvas">
          <div className="studio-inspector" data-testid="studio-inspector">
            <span className="studio-inspector-label">Inspector</span>
            <span className="studio-inspector-workspace">
              {activeSection.replace(/-/g, ' ')}
            </span>
            <span className="studio-inspector-divider" aria-hidden="true" />
            <div className="studio-inspector-tools">
              {inspectorTools.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  className="studio-inspector-chip"
                  onClick={() => navigateStudio(tool.section, tool.target)}
                  title={`Open ${tool.label}`}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <span className="studio-inspector-spacer" />
            <button
              type="button"
              className="studio-collapse-btn"
              onClick={toggleLibraryColumn}
              aria-pressed={libraryCollapsed}
              title={libraryCollapsed ? 'Show library column' : 'Hide library column'}
            >
              {libraryCollapsed ? (
                <PanelLeftOpen size={13} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={13} aria-hidden="true" />
              )}
              <span>Library</span>
            </button>
            <button
              type="button"
              className="studio-collapse-btn"
              onClick={toggleToolsColumn}
              aria-pressed={toolsCollapsed}
              title={toolsCollapsed ? 'Show tools column' : 'Hide tools column'}
            >
              <span>Tools</span>
              {toolsCollapsed ? (
                <PanelRightOpen size={13} aria-hidden="true" />
              ) : (
                <PanelRightClose size={13} aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="pro-canvas-toolbar">
            <span className="pro-canvas-title" title={hasImage ? sourceName : undefined}>
              {hasImage ? sourceName : 'PREVIEW CANVAS'}
            </span>
            <div className="pro-canvas-spacer" />
            {hasImage && (
              <button
                className={`pro-icon-btn ${compare ? 'active' : ''}`}
                onClick={() => setCompare((v) => !v)}
                title="Toggle before / after"
                aria-label="Toggle before and after"
                aria-pressed={compare}
              >
                <Columns2 size={15} aria-hidden="true" />
                <span>{compare ? 'Original' : 'Edited'}</span>
              </button>
            )}
            <div className="pro-zoom" aria-label="Canvas zoom">
              <button
                className="pro-icon-btn"
                onClick={() => setZoom((z) => Math.max(0.25, Number((z / 1.25).toFixed(2))))}
                disabled={!hasImage || zoom <= 0.25}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut size={15} aria-hidden="true" />
              </button>
              <span className="pro-zoom-label" aria-live="polite">
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="pro-icon-btn"
                onClick={() => setZoom((z) => Math.min(2, Number((z * 1.25).toFixed(2))))}
                disabled={!hasImage || zoom >= 2}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn size={15} aria-hidden="true" />
              </button>
              <button
                className="pro-icon-btn"
                onClick={() => setZoom(1)}
                disabled={!hasImage || zoom === 1}
                title="Fit to screen"
                aria-label="Fit to screen"
                style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}
              >
                FIT
              </button>
            </div>
            <button
              className="pro-icon-btn"
              onClick={() => {
                const stage = stageRef.current;
                if (stage?.requestFullscreen) void stage.requestFullscreen();
              }}
              disabled={!hasImage}
              title="Full-screen preview"
              aria-label="Full-screen preview"
            >
              <Maximize2 size={15} aria-hidden="true" />
            </button>
          </div>
              <div
                ref={stageRef}
                className={`preview-stage pro-stage ${hasImage ? 'has-image' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files);
                }}
              >
                {hasImage ? (
                  <>
                    <nav className="tool-rail" aria-label="Editing tools">
                      <button
                        className={localTool === 'off' && retouchMode === 'off' ? 'active' : ''}
                        title="Pointer / move"
                        aria-label="Pointer / move"
                        onClick={() => {
                          setLocalTool('off');
                          setRetouchMode('off');
                        }}
                      >
                        <MousePointer2 size={16} aria-hidden="true" />
                      </button>
                      <button
                        className={localTool === 'brush' ? 'active' : ''}
                        title="Brush mask"
                        aria-label="Brush mask"
                        onClick={() => {
                          setLocalTool('brush');
                          setRetouchMode('off');
                        }}
                      >
                        <Brush size={16} aria-hidden="true" />
                      </button>
                      <button
                        className={localTool === 'heal' ? 'active' : ''}
                        title="Healing brush"
                        aria-label="Healing brush"
                        onClick={() => {
                          setLocalTool('heal');
                          setRetouchMode('off');
                        }}
                      >
                        <Bandage size={16} aria-hidden="true" />
                      </button>
                      <button
                        className={retouchMode === 'brush' ? 'active' : ''}
                        title="Portrait retouch brush"
                        aria-label="Portrait retouch brush"
                        onClick={() => {
                          setLocalTool('off');
                          setRetouchMode('brush');
                        }}
                      >
                        <Wand2 size={16} aria-hidden="true" />
                      </button>
                      <button
                        title="Add text layer"
                        aria-label="Add text layer"
                        onClick={addTextLayer}
                      >
                        <Type size={16} aria-hidden="true" />
                      </button>
                      <button
                        title="Crop & transform"
                        aria-label="Crop and transform"
                        onClick={() => {
                          setActiveWorkspace('professional');
                          document
                            .getElementById('transform-workspace')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        <Crop size={16} aria-hidden="true" />
                      </button>
                    </nav>
                    <canvas
                      ref={canvasRef}
                      aria-label={
                        tonalBrush ? `${tonalBrush} brush photo preview` : 'Photo preview'
                      }
                      className={
                        retouchMode === 'brush' || localTool !== 'off' || layerMaskTool !== 'off'
                          ? 'retouch-brush-active'
                          : ''
                      }
                      style={{ transform: `scale(${zoom})` }}
                      onPointerDown={startBrushStroke}
                      onPointerMove={continueBrushStroke}
                      onPointerUp={finishBrushStroke}
                      onPointerCancel={finishBrushStroke}
                    />
                  </>
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">
                      <Upload size={34} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h2>Start with a photograph</h2>
                    <p>Drop an image here, or choose one from your device.</p>
                    <button
                      className="button button-primary button-large"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {busy ? 'Opening…' : 'Choose a photo'}
                    </button>
                    <small>JPEG · PNG · WebP · Up to 40 MB · 24 MP maximum</small>
                  </div>
                )}
              </div>
              <div className="pro-statusbar">
                <span className="status-message">{message}</span>
                <span className="spacer" />
                {hasImage && (
                  <span>
                    {sourceSize.width.toLocaleString()} × {sourceSize.height.toLocaleString()}
                  </span>
                )}
                <span>On-device · Private</span>
                <Link to="/privacy">Privacy</Link>
              </div>
              {hasImage && (
                <DeliveryWorkspace
                  exportFormat={exportFormat}
                  setExportFormat={setExportFormat}
                  saveToLibrary={saveToLibrary}
                  exportPhoto={exportPhoto}
                  busy={busy}
                />
              )}
              {hasImage && sourceUrl && (
                <React.Suspense
                  fallback={<p className="auth-muted">Loading advanced editor tools…</p>}
                >
                  <LibraryToolsPanel
                    sourceUrl={sourceUrl}
                    sourceName={sourceName}
                    onApplyAdjustments={({ brightness, contrast, saturation }) => {
                      commitSnapshot(adjustments, {
                        ...manualAdjustments,
                        brightness,
                        contrast,
                        saturation,
                      });
                      setCompare(false);
                    }}
                    onApplyCrop={({ crop, rotation }) => {
                      commitDocumentTransform({ ...documentTransform, crop, rotation });
                    }}
                    onApply={(blob, suffix) => {
                      if (
                        !window.confirm(
                          'Use this result as a new working image? This replaces the current editing session and resets its history. Save or export your current work first if needed.',
                        )
                      )
                        return;
                      const baseName =
                        sourceName.split('.').slice(0, -1).join('.') || sourceName || 'photo';
                      const file = new File([blob], `${baseName}-${suffix}.png`, {
                        type: 'image/png',
                      });
                      void openFiles([file]);
                    }}
                  />
                </React.Suspense>
              )}
              {savedPhotos.length > 0 && (
                <React.Suspense
                  fallback={<p className="auth-muted">Loading client gallery tools…</p>}
                >
                  <ClientGalleryPanel photos={savedPhotos} />
                </React.Suspense>
              )}
            </section>

            <StudioSplitter side="right" shellRef={shellRef} />
            <aside className="tools-column pro-tools">
              <div className="advanced-mode-row">
                <span className="advanced-mode-label">Advanced tools</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={advancedMode}
                  className={`advanced-toggle ${advancedMode ? 'on' : ''}`}
                  onClick={() => setAdvancedMode((value) => !value)}
                >
                  <span className="advanced-toggle-thumb" />
                </button>
                <span className="advanced-mode-hint">
                  {advancedMode ? 'Curves, HSL, layers and masks are shown' : 'Off — basic tools only'}
                </span>
              </div>
              <LayersPanel
                layers={layers}
                hasImage={hasImage}
                selectedLayerId={selectedLayerId}
                selectedLayer={selectedLayer}
                selectedLayerMask={selectedLayerMask}
                draggedLayerId={draggedLayerId}
                layerMaskView={layerMaskView}
                layerMaskTool={layerMaskTool}
                layerMaskBrushSize={layerMaskBrushSize}
                selectedCurveChannel={selectedCurveChannel}
                selectedHslChannel={selectedHslChannel}
                maskThumbnailRef={maskThumbnailRef}
                setDraggedLayerId={setDraggedLayerId}
                setSelectedLayerId={setSelectedLayerId}
                setSelectedLayerMaskId={setSelectedLayerMaskId}
                setLayerMaskView={setLayerMaskView}
                setLayerMaskTool={setLayerMaskTool}
                setLayerMaskBrushSize={setLayerMaskBrushSize}
                setSelectedCurveChannel={setSelectedCurveChannel}
                setSelectedHslChannel={setSelectedHslChannel}
                addLayerGroup={addLayerGroup}
                addAdjustmentLayer={addAdjustmentLayer}
                addTextLayer={addTextLayer}
                updateLayer={updateLayer}
                toggleGroupExpanded={toggleGroupExpanded}
                moveLayer={moveLayer}
                reorderLayer={reorderLayer}
                addLayerMask={addLayerMask}
                updateSelectedLayerMask={updateSelectedLayerMask}
                removeSelectedLayer={removeSelectedLayer}
              />
              <HistoryPanel
                history={history}
                historyIndex={historyIndex}
                canUndo={canUndo}
                canRedo={canRedo}
                undo={undo}
                redo={redo}
                setHistoryIndex={setHistoryIndex}
                setAdjustments={setAdjustments}
                setManualAdjustments={setManualAdjustments}
                setLocalMasks={setLocalMasks}
                setHealStrokes={setHealStrokes}
                setSelection={setSelection}
                setDocumentTransform={setDocumentTransform}
                setLayers={setLayers}
                setSelectedLayerId={setSelectedLayerId}
              />
              <BatchWorkspace
                styleRecipes={styleRecipes}
                styleRecipeName={styleRecipeName}
                setStyleRecipeName={setStyleRecipeName}
                hasImage={hasImage}
                batchBusy={batchBusy}
                saveCurrentStyle={saveCurrentStyle}
                selectedStyleRecipeId={selectedStyleRecipeId}
                setSelectedStyleRecipeId={setSelectedStyleRecipeId}
                setAdHocBatchRecipe={setAdHocBatchRecipe}
                clearBatchPreviews={clearBatchPreviews}
                setStyleRecipes={setStyleRecipes}
                batchFileInputRef={batchFileInputRef}
                syncCurrentEditsToBatch={syncCurrentEditsToBatch}
                loadStyleOnReference={loadStyleOnReference}
                selectedBatchRecipe={selectedBatchRecipe}
                adHocBatchRecipe={adHocBatchRecipe}
                batchItems={batchItems}
                setBatchItems={setBatchItems}
                removeBatchPhoto={removeBatchPhoto}
                previewBatch={previewBatch}
                exportBatch={exportBatch}
                batchFormat={batchFormat}
                setBatchFormat={setBatchFormat}
                batchProgress={batchProgress}
                batchCancelRef={batchCancelRef}
              />
              <EffectsPanel
                hasImage={hasImage}
                sourceUrl={sourceUrl}
                filterQuery={filterQuery}
                setFilterQuery={setFilterQuery}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                favoriteFilterIds={favoriteFilterIds}
                visibleFilters={visibleFilters}
                filterVisibleCount={filterVisibleCount}
                setFilterVisibleCount={setFilterVisibleCount}
                selectedFilterId={selectedFilterId}
                filterIntensity={filterIntensity}
                applyLibraryFilter={applyLibraryFilter}
                toggleFavoriteFilter={toggleFavoriteFilter}
                presets={PRESETS}
                activePreset={activePreset}
                applyPreset={applyPreset}
              />
              <AdjustmentPanel
                hasImage={hasImage}
                adjustments={adjustments}
                manualAdjustments={manualAdjustments}
                reset={reset}
                updateAdjustment={updateAdjustment}
                updateManualAdjustment={updateManualAdjustment}
                selectedCurveChannel={selectedCurveChannel}
                setSelectedCurveChannel={setSelectedCurveChannel}
                selectedHslChannel={selectedHslChannel}
                setSelectedHslChannel={setSelectedHslChannel}
                documentTransform={documentTransform}
                defaultDocumentTransform={DEFAULT_DOCUMENT_TRANSFORM}
                commitDocumentTransform={commitDocumentTransform}
                rotateDocument={rotateDocument}
                cropDraft={cropDraft}
                setCropDraft={setCropDraft}
                applyCropDraft={applyCropDraft}
              />
              <div id="masking-workspace">
              <MaskingPanel
                hasImage={hasImage}
                localTool={localTool}
                setLocalTool={setLocalTool}
                tonalBrush={tonalBrush}
                setTonalBrush={setTonalBrush}
                selectionMode={selectionMode}
                setSelectionMode={setSelectionMode}
                selection={selection}
                setSelection={setSelection}
                selectionBrushSize={selectionBrushSize}
                setSelectionBrushSize={setSelectionBrushSize}
                selectionFeather={selectionFeather}
                setSelectionFeather={setSelectionFeather}
                commitSelection={commitSelection}
                localBrushSize={localBrushSize}
                setLocalBrushSize={setLocalBrushSize}
                localExposure={localExposure}
                setLocalExposure={setLocalExposure}
                localTemperature={localTemperature}
                setLocalTemperature={setLocalTemperature}
                localSaturation={localSaturation}
                setLocalSaturation={setLocalSaturation}
                localRadius={localRadius}
                setLocalRadius={setLocalRadius}
                localFeather={localFeather}
                setLocalFeather={setLocalFeather}
                localMasks={localMasks}
                selectedMaskId={selectedMaskId}
                setSelectedMaskId={setSelectedMaskId}
                healStrokes={healStrokes}
                adjustments={adjustments}
                manualAdjustments={manualAdjustments}
                commitSnapshot={commitSnapshot}
                updateSelectedMask={updateSelectedMask}
                setRetouchMode={setRetouchMode}
              />
              </div>
              <BackgroundPanel
                hasImage={hasImage}
                backgroundBusy={backgroundBusy}
                personMask={personMask}
                backgroundOps={backgroundOps}
                runBackgroundDetection={runBackgroundDetection}
                setPersonMask={setPersonMask}
                setBackgroundOps={setBackgroundOps}
              />
              <RetouchPanel
                hasImage={hasImage}
                busy={busy}
                detectingFaces={detectingFaces}
                localTool={localTool}
                setLocalTool={setLocalTool}
                localBrushSize={localBrushSize}
                setLocalBrushSize={setLocalBrushSize}
                retouchMode={retouchMode}
                setRetouchMode={setRetouchMode}
                retouchStrength={retouchStrength}
                retouchStrokes={retouchStrokes}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                faceLandmarks={faceLandmarks}
                faceStrengths={faceStrengths}
                setFaceStrengths={setFaceStrengths}
                glareSoftness={glareSoftness}
                setGlareSoftness={setGlareSoftness}
                faceMakeup={faceMakeup}
                faceAccessory={faceAccessory}
                faceAccessorySettings={faceAccessorySettings}
                adjustments={adjustments}
                manualAdjustments={manualAdjustments}
                localMasks={localMasks}
                healStrokes={healStrokes}
                selection={selection}
                runFaceDetection={runFaceDetection}
                applyBlemishes={applyBlemishes}
                commitSnapshot={commitSnapshot}
                commitPortraitSnapshot={commitPortraitSnapshot}
                setMessage={setMessage}
              />
              <StyleAssistantPanel
                prompt={prompt}
                setPrompt={setPrompt}
                hasImage={hasImage}
                suggestFromPrompt={suggestFromPrompt}
                styleInterpretation={styleInterpretation}
                styleRecipeName={styleRecipeName}
                batchBusy={batchBusy}
                saveCurrentStyle={saveCurrentStyle}
              />
              <AIDock onOpenMia={() => navigateStudio('mia', 'mia-workspace')} />
              </aside>
    </div>
  );
}
