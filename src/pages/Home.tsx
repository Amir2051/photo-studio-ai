import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LibraryToolsPanel = React.lazy(() => import('../components/LibraryToolsPanel'));
const VideoStudioFrame = React.lazy(() => import('../components/VideoStudioFrame'));
const CloudSyncPanel = React.lazy(() => import('../components/CloudSyncPanel'));
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
  type BrushStroke,
  type NormalizedPoint,
} from '../lib/portraitRetouch';
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
const MAX_BATCH_PHOTOS = 20;
const MAX_BATCH_TOTAL_PIXELS = 80_000_000;
type BatchPhotoItem = {
  id: string;
  file: File;
  image: HTMLImageElement;
  originalPreview: string;
  previewUrl?: string;
};

function adjustmentFilter(a: Adjustments): string {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
}
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('This image format could not be decoded by your browser.'));
    image.src = src;
  });
}

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

function safeExportName(name: string, fallback: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\.[^.]+$/, '')
      .trim() || fallback
  ).slice(0, 100);
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
          });
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

type FilterThumbnailProps = { sourceUrl: string | null; recipe: FilterRecipe };

/** Renders each catalogue look against the current photo using the real export pipeline. */
function FilterThumbnail({ sourceUrl, recipe }: FilterThumbnailProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const canvas = canvasRef.current;
    if (!canvas || !sourceUrl) return;

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      const width = 112;
      const height = 84;
      canvas.width = width;
      canvas.height = height;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.clearRect(0, 0, width, height);
      context.drawImage(
        image,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      const settings = mapFilterRecipeToManualSettings(recipe, 100, DEFAULT_MANUAL_ADJUSTMENTS);
      applyManualAdjustments(canvas, settings);
      if (!cancelled) setReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setReady(false);
    };
    image.src = sourceUrl;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [sourceUrl, recipe]);

  return (
    <span className={`filter-thumb-wrap${ready ? ' ready' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="filter-thumb" />
      {!ready && <span className="filter-thumb-placeholder">Preview</span>}
    </span>
  );
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
  const [showSaved, setShowSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('creator');
  const [retouchMode, setRetouchMode] = useState<'off' | 'brush'>('off');
  const [retouchStrength, setRetouchStrength] = useState(55);
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
  const [batchFormat, setBatchFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(
    'image/jpeg',
  );

  const navigateStudio = (section: string, target: string) => {
    setActiveSection(section);
    setShowSaved(false);
    if (section === 'retouch') setActiveWorkspace('portrait');
    if (['color', 'effects', 'compositing', 'assets'].includes(section))
      setActiveWorkspace('professional');
    if (section === 'library') setShowSaved(true);
    window.setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      40,
    );
  };

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
    ],
  );

  useEffect(() => {
    // Coalesce rapid slider/state changes into one canvas render per animation frame.
    const frame = window.requestAnimationFrame(() => render(adjustments, compare));
    return () => window.cancelAnimationFrame(frame);
  }, [adjustments, compare, render, sourceUrl, showSaved]);
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
      link.download = `${sourceName.replace(/\.[^.]+$/, '') || 'photo'}-edited.${exportFormat.split('/')[1]}`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
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
      setShowSaved(false);
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

  const previewBatch = async () => {
    const recipe = styleRecipes.find((item) => item.id === selectedStyleRecipeId);
    if (!recipe || !batchItems.length) return;
    setBatchBusy(true);
    try {
      const previews: BatchPhotoItem[] = [];
      for (const item of batchItems) {
        const blob = await renderStyleBlob(item.image, recipe, 'image/jpeg', 900);
        const previewUrl = URL.createObjectURL(blob);
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        previews.push({ ...item, previewUrl });
      }
      setBatchItems(previews);
      setMessage(`Preview ready: “${recipe.name}” applied to ${previews.length} photo(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not preview this batch.');
    } finally {
      setBatchBusy(false);
    }
  };

  const exportBatch = async () => {
    const recipe = styleRecipes.find((item) => item.id === selectedStyleRecipeId);
    if (!recipe || !batchItems.length) return;
    setBatchBusy(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const folder = zip.folder(safeExportName(recipe.name, 'edited-batch'));
      if (!folder) throw new Error('Could not create the export archive.');
      const extension = batchFormat.split('/')[1].replace('jpeg', 'jpg');
      for (const [index, item] of batchItems.entries()) {
        const blob = await renderStyleBlob(item.image, recipe, batchFormat);
        const name = safeExportName(item.file.name, `photo-${index + 1}`);
        folder.file(`${String(index + 1).padStart(3, '0')}-${name}.${extension}`, blob);
      }
      const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeExportName(recipe.name, 'style')}-batch.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Exported ${batchItems.length} full-resolution photo(s) in a ZIP archive.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch export failed.');
    } finally {
      setBatchBusy(false);
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

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Every Frame First Studio home"
        >
          <span className="brand-mark">EF</span>
          <span>
            <strong>EVERY FRAME FIRST</strong>
            <small>PHOTO STUDIO</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="local-indicator">
            <i /> LOCAL EDITING
          </span>
          <button className="button button-quiet" onClick={() => setShowSaved((v) => !v)}>
            {showSaved
              ? 'Close library'
              : `Library${savedPhotos.length ? ` (${savedPhotos.length})` : ''}`}
          </button>
          <button className="button button-primary" onClick={() => fileInputRef.current?.click()}>
            ＋ Add photo
          </button>
        </div>
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
      </header>

      <aside className="studio-sidebar" aria-label="Studio navigation">
        <div className="sidebar-workspace-label">WORKSPACE</div>
        <button
          className={`sidebar-link ${activeSection === 'home' ? 'active' : ''}`}
          onClick={() => navigateStudio('home', 'studio-home')}
        >
          <span className="sidebar-icon">⌂</span>
          <span>Overview</span>
          <kbd>H</kbd>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'editor' ? 'active' : ''}`}
          onClick={() => navigateStudio('editor', 'editor-canvas')}
        >
          <span className="sidebar-icon">▧</span>
          <span>Photo editor</span>
          <kbd>1</kbd>
        </button>
        <div className="sidebar-divider" />
        <div className="sidebar-workspace-label">EDITING SUITES</div>
        <button
          className={`sidebar-link ${activeSection === 'retouch' ? 'active' : ''}`}
          onClick={() => navigateStudio('retouch', 'retouch-workspace')}
        >
          <span className="sidebar-icon">✧</span>
          <span>Retouch studio</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'color' ? 'active' : ''}`}
          onClick={() => navigateStudio('color', 'color-workspace')}
        >
          <span className="sidebar-icon">◉</span>
          <span>Color lab</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'compositing' ? 'active' : ''}`}
          onClick={() => navigateStudio('compositing', 'layers-workspace')}
        >
          <span className="sidebar-icon">▤</span>
          <span>Compositing</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'effects' ? 'active' : ''}`}
          onClick={() => navigateStudio('effects', 'effects-workspace')}
        >
          <span className="sidebar-icon">✺</span>
          <span>Effects</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'creator' ? 'active' : ''}`}
          onClick={() => setActiveSection('creator')}
        >
          <span className="sidebar-icon">▶</span>
          <span>Video Studio</span>
        </button>
        <div className="sidebar-divider" />
        <div className="sidebar-workspace-label">PROJECT</div>
        <button
          className={`sidebar-link ${activeSection === 'assets' ? 'active' : ''}`}
          onClick={() => navigateStudio('assets', 'assets-workspace')}
        >
          <span className="sidebar-icon">▦</span>
          <span>Assets & presets</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'history' ? 'active' : ''}`}
          onClick={() => navigateStudio('history', 'history-workspace')}
        >
          <span className="sidebar-icon">◷</span>
          <span>History</span>
          <span className="sidebar-count">{Math.max(0, history.length - 1)}</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'library' ? 'active' : ''}`}
          onClick={() => navigateStudio('library', 'studio-home')}
        >
          <span className="sidebar-icon">▣</span>
          <span>Photo library</span>
          <span className="sidebar-count">{savedPhotos.length}</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'cloud-sync' ? 'active' : ''}`}
          onClick={() => setActiveSection('cloud-sync')}
        >
          <span className="sidebar-icon">⇄</span>
          <span>Cloud sync</span>
        </button>
        <button
          className={`sidebar-link ${activeSection === 'export' ? 'active' : ''}`}
          onClick={() => navigateStudio('export', 'export-workspace')}
        >
          <span className="sidebar-icon">⇧</span>
          <span>Export center</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <i /> Local engine ready
          </div>
          <small>EVERY FRAME FIRST STUDIO</small>
        </div>
      </aside>

      <main className="studio-main">
        <section className="video-first-launch" aria-labelledby="video-first-title">
          <div className="video-first-copy">
            <p className="eyebrow">PRIMARY WORKSPACE · VIDEO PRODUCTION</p>
            <h2 id="video-first-title">Professional Video Studio</h2>
            <p>Import footage, edit a real multitrack timeline, mix sound, finish color and export your film.</p>
          </div>
          <button className="button button-primary video-first-launch-button" type="button" onClick={() => setActiveSection('creator')}>
            Open Video Studio <span aria-hidden="true">→</span>
          </button>
        </section>
        <section className="workspace-heading" id="studio-home">
          <div>
            <p className="eyebrow">YOUR CREATIVE WORKSPACE</p>
            <h1>
              Make every frame <em>count.</em>
            </h1>
            <p className="subheading">A thoughtful photo editor. Your original stays untouched.</p>
          </div>
          {hasImage && (
            <div className="history-actions">
              <button className="icon-button" disabled={!canUndo} onClick={undo} aria-label="Undo">
                ↶
              </button>
              <button className="icon-button" disabled={!canRedo} onClick={redo} aria-label="Redo">
                ↷
              </button>
              <button className="button button-quiet" onClick={reset}>
                Reset edits
              </button>
            </div>
          )}
        </section>
        <section className="studio-overview-strip" aria-label="Workspace status">
          <div className="overview-stat">
            <span className="overview-icon">▧</span>
            <div>
              <small>DOCUMENT</small>
              <strong>{hasImage ? sourceName : 'No document open'}</strong>
              <em>
                {hasImage
                  ? `${sourceSize.width.toLocaleString()} × ${sourceSize.height.toLocaleString()}`
                  : 'Import an image to begin'}
              </em>
            </div>
          </div>
          <div className="overview-stat">
            <span className="overview-icon">◈</span>
            <div>
              <small>EDIT HISTORY</small>
              <strong>{hasImage ? `${historyIndex} changes` : 'Ready for edits'}</strong>
              <em>{canUndo ? 'Undo available' : 'No pending changes'}</em>
            </div>
          </div>
          <div className="overview-stat">
            <span className="overview-icon">▤</span>
            <div>
              <small>LAYERS</small>
              <strong>{hasImage ? `${layers.length} layers` : 'Waiting for image'}</strong>
              <em>{layers.filter((layer) => layer.visible).length} visible</em>
            </div>
          </div>
          <div className="overview-stat engine-stat">
            <span className="engine-pulse" />
            <div>
              <small>PROCESSING</small>
              <strong>On-device engine</strong>
              <em>Private · No upload required</em>
            </div>
          </div>
        </section>

        {showSaved ? (
          <section className="library-panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">ON THIS DEVICE</p>
                <h2>Your photo library</h2>
              </div>
              <span>{savedPhotos.length} saved</span>
            </div>
            {savedPhotos.length ? (
              <div className="saved-grid">
                {savedPhotos.map((photo) => (
                  <button
                    className="saved-card"
                    key={photo.id}
                    onClick={() => void openSavedPhoto(photo)}
                  >
                    <img src={photo.dataUrl} alt="" />
                    <div>
                      <strong>{photo.name}</strong>
                      <small>
                        {photo.dimensions.width} × {photo.dimensions.height} · Open edit
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-library">
                Your saved photos will appear here. Save an edit to keep a local copy.
              </p>
            )}
          </section>
        ) : (
          <div className="editor-layout">
            <section className="preview-column" id="editor-canvas">
              <div className="preview-toolbar">
                <span>{hasImage ? sourceName : 'PREVIEW CANVAS'}</span>
                {hasImage && (
                  <button
                    className={`compare-toggle ${compare ? 'active' : ''}`}
                    onClick={() => setCompare((v) => !v)}
                    title="Hold or tap to compare with original"
                  >
                    ◐ {compare ? 'Original' : 'Compare'}
                  </button>
                )}
              </div>
              <div
                className={`preview-stage ${hasImage ? 'has-image' : ''}`}
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
                        ↖
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
                        ◉
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
                        ✳
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
                        ✧
                      </button>
                      <button
                        title="Add text layer"
                        aria-label="Add text layer"
                        onClick={addTextLayer}
                      >
                        T
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
                        ⌗
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
                      onPointerDown={startBrushStroke}
                      onPointerMove={continueBrushStroke}
                      onPointerUp={finishBrushStroke}
                      onPointerCancel={finishBrushStroke}
                    />
                  </>
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">↥</div>
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
              <div className="preview-footer">
                <span>{message}</span>
                {hasImage && (
                  <span>
                    {sourceSize.width.toLocaleString()} × {sourceSize.height.toLocaleString()}
                  </span>
                )}
              </div>
              {hasImage && (
                <div className="export-bar" id="export-workspace">
                  <label className="format-select">
                    Export as{' '}
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                    >
                      <option value="image/jpeg">JPEG · High quality</option>
                      <option value="image/png">PNG · Lossless</option>
                      <option value="image/webp">WebP · Compact</option>
                    </select>
                  </label>
                  <button className="button button-quiet" onClick={saveToLibrary} disabled={busy}>
                    Save to library
                  </button>
                  <button className="button button-primary" onClick={exportPhoto} disabled={busy}>
                    ↓ Export photo
                  </button>
                </div>
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
            </section>

            <aside className="tools-column">
              <div className="workspace-switcher" role="tablist" aria-label="Editing workspace">
                <button
                  role="tab"
                  aria-selected={activeWorkspace === 'professional'}
                  className={activeWorkspace === 'professional' ? 'active' : ''}
                  onClick={() => setActiveWorkspace('professional')}
                >
                  Professional Studio
                </button>
                <button
                  role="tab"
                  aria-selected={activeWorkspace === 'portrait'}
                  className={activeWorkspace === 'portrait' ? 'active' : ''}
                  onClick={() => {
                    setActiveWorkspace('portrait');
                    if (hasImage && !faceLandmarks.length && !detectingFaces)
                      void runFaceDetection();
                  }}
                >
                  Portrait Studio
                </button>
              </div>
              <section className="tool-panel layer-panel" id="layers-workspace">
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
                    ＋ Group
                  </button>
                  <button
                    className="button button-quiet"
                    disabled={!hasImage}
                    onClick={addAdjustmentLayer}
                  >
                    ＋ Adjustment
                  </button>
                  <button
                    className="button button-quiet"
                    disabled={!hasImage}
                    onClick={addTextLayer}
                  >
                    ＋ Text
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
                          {layer.visible ? '◉' : '○'}
                        </button>
                        {layer.type === 'group' && (
                          <button
                            className="layer-visibility"
                            aria-label={`${layer.expanded === false ? 'Expand' : 'Collapse'} ${layer.name}`}
                            onClick={() => toggleGroupExpanded(layer.id)}
                          >
                            {layer.expanded === false ? '▸' : '▾'}
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
                            {layer.type === 'image'
                              ? '▧'
                              : layer.type === 'adjustment'
                                ? '◐'
                                : layer.type === 'group'
                                  ? '▣'
                                  : 'T'}
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
                            ↑
                          </button>
                          <button
                            aria-label={`Move ${layer.name} down`}
                            onClick={() => moveLayer(layer.id, -1)}
                          >
                            ↓
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
                              ↑
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
                              ↓
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
              <section className="tool-panel history-panel" id="history-workspace">
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
                    ↶ Undo
                  </button>
                  <button className="button button-quiet" onClick={redo} disabled={!canRedo}>
                    ↷ Redo
                  </button>
                </div>
              </section>
              <section className="tool-panel style-workflow-panel" id="assets-workspace">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">REFERENCE → REPEAT</p>
                    <h2>Style Recipes</h2>
                  </div>
                  <span>{styleRecipes.length} saved</span>
                </div>
                <p className="tool-note">
                  Finish editing this reference photo, save its settings, then apply the same look
                  to a group of photos.
                </p>
                <input
                  className="filter-search"
                  value={styleRecipeName}
                  onChange={(e) => setStyleRecipeName(e.target.value)}
                  placeholder="Name this style (e.g. Warm Studio)"
                  disabled={!hasImage}
                />
                <button
                  className="button button-primary style-save-button"
                  onClick={() => void saveCurrentStyle()}
                  disabled={!hasImage || batchBusy}
                >
                  Save current edits as Style Recipe
                </button>
                <div className="style-recipe-row">
                  <select
                    className="filter-category-select"
                    value={selectedStyleRecipeId}
                    onChange={(e) => {
                      setSelectedStyleRecipeId(e.target.value);
                      clearBatchPreviews();
                    }}
                  >
                    <option value="">Choose a saved recipe</option>
                    {styleRecipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-button"
                    disabled={!selectedStyleRecipeId}
                    onClick={() => {
                      const recipe = styleRecipes.find((item) => item.id === selectedStyleRecipeId);
                      if (recipe && window.confirm(`Delete “${recipe.name}”?`))
                        void deleteStyleRecipe(recipe.id).then(() =>
                          getStyleRecipes().then(setStyleRecipes),
                        );
                    }}
                  >
                    Delete
                  </button>
                </div>
                <div className="batch-actions">
                  <button
                    className="button button-quiet"
                    onClick={() => batchFileInputRef.current?.click()}
                    disabled={batchBusy}
                  >
                    ＋ Add batch photos
                  </button>
                  <button
                    className="button button-quiet"
                    onClick={loadStyleOnReference}
                    disabled={!hasImage || !selectedStyleRecipeId}
                  >
                    Load onto reference
                  </button>
                </div>
                {batchItems.length > 0 && (
                  <>
                    <div className="batch-summary">
                      <strong>{batchItems.length} photo(s) queued</strong>
                      <button
                        className="text-button"
                        onClick={() => {
                          for (const item of batchItems)
                            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                          setBatchItems([]);
                        }}
                      >
                        Clear batch
                      </button>
                    </div>
                    <div className="batch-photo-grid">
                      {batchItems.map((item) => (
                        <div className="batch-photo-card" key={item.id}>
                          <img src={item.previewUrl || item.originalPreview} alt={item.file.name} />
                          <span title={item.file.name}>{item.file.name}</span>
                          <button
                            className="batch-remove"
                            onClick={() => removeBatchPhoto(item.id)}
                            aria-label={`Remove ${item.file.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="batch-actions">
                      <button
                        className="button button-quiet"
                        onClick={() => void previewBatch()}
                        disabled={batchBusy || !selectedStyleRecipeId}
                      >
                        {batchBusy ? 'Working…' : 'Preview recipe on all'}
                      </button>
                    </div>
                    <label className="format-select batch-format-select">
                      Export format{' '}
                      <select
                        value={batchFormat}
                        onChange={(e) => setBatchFormat(e.target.value as typeof batchFormat)}
                      >
                        <option value="image/jpeg">JPEG</option>
                        <option value="image/png">PNG</option>
                        <option value="image/webp">WebP</option>
                      </select>
                    </label>
                    <button
                      className="button button-primary style-save-button"
                      onClick={() => void exportBatch()}
                      disabled={batchBusy || !selectedStyleRecipeId}
                    >
                      {batchBusy
                        ? 'Processing…'
                        : `Export ${batchItems.length} edited photos (.zip)`}
                    </button>
                  </>
                )}
                <p className="tool-note">
                  Recipes store global tone settings and retouch strength locally. Face smoothing is
                  detected separately on each target photo; hand-painted brush marks are specific to
                  the reference and are not copied.
                </p>
              </section>
              {activeWorkspace === 'professional' && (
                <section className="tool-panel filter-library-panel" id="effects-workspace">
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">FILTER LIBRARY</p>
                      <h2>Explore looks</h2>
                    </div>
                    <span>{FILTER_LIBRARY.length} looks</span>
                  </div>
                  <input
                    className="filter-search"
                    type="search"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search portraits, film, cinematic…"
                  />
                  <select
                    className="filter-category-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">All categories</option>
                    <option value="favorites">★ Favorites ({favoriteFilterIds.length})</option>
                    {CATEGORIES.filter((category) => category.id !== 'custom').map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <div className="filter-list">
                    {visibleFilters.slice(0, filterVisibleCount).map((filter) => (
                      <article className="filter-card" key={filter.id}>
                        <button
                          className={`filter-option ${selectedFilterId === filter.id ? 'selected' : ''}`}
                          onClick={() => applyLibraryFilter(filter)}
                          disabled={!hasImage}
                          aria-pressed={selectedFilterId === filter.id}
                        >
                          <FilterThumbnail sourceUrl={sourceUrl} recipe={filter} />
                          <span className="filter-option-copy">
                            <strong>{filter.name}</strong>
                            <small>{filter.description}</small>
                          </span>
                          <span className="filter-apply-mark">
                            {selectedFilterId === filter.id ? '✓' : '＋'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`filter-favorite ${favoriteFilterIds.includes(filter.id) ? 'is-favorite' : ''}`}
                          onClick={() => toggleFavoriteFilter(filter.id)}
                          aria-label={`${favoriteFilterIds.includes(filter.id) ? 'Remove' : 'Add'} ${filter.name} ${favoriteFilterIds.includes(filter.id) ? 'from' : 'to'} favorites`}
                          aria-pressed={favoriteFilterIds.includes(filter.id)}
                        >
                          {favoriteFilterIds.includes(filter.id) ? '★' : '☆'}
                        </button>
                      </article>
                    ))}
                    {!visibleFilters.length && (
                      <p className="tool-note">
                        No filters match. Try another search or save a few looks with ☆.
                      </p>
                    )}
                    {visibleFilters.length > filterVisibleCount && (
                      <button
                        type="button"
                        className="button button-quiet filter-load-more"
                        onClick={() => setFilterVisibleCount((count) => count + 24)}
                      >
                        Load 24 more looks · {visibleFilters.length - filterVisibleCount} remaining
                      </button>
                    )}
                  </div>
                  <label className="range-control filter-intensity-control">
                    <span>
                      <span>Filter intensity</span>
                      <strong>{filterIntensity}%</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterIntensity}
                      disabled={!hasImage || !selectedFilterId}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const recipe = FILTER_LIBRARY.find((item) => item.id === selectedFilterId);
                        if (recipe) applyLibraryFilter(recipe, value);
                      }}
                    />
                  </label>
                  <p className="tool-note">
                    Filters use local pixel processing for exposure, tone, color, grain, vignette,
                    and detail. Some cinematic glow and bloom recipes remain in the next effects
                    pass.
                  </p>
                </section>
              )}
              {activeWorkspace === 'professional' && (
                <section className="tool-panel">
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">QUICK LOOKS</p>
                      <h2>Presets</h2>
                    </div>
                    <span>01 / 07</span>
                  </div>
                  <div className="preset-grid">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className={`preset-chip ${activePreset === preset.id ? 'selected' : ''}`}
                        onClick={() => applyPreset(preset)}
                        disabled={!hasImage}
                      >
                        <span className={`preset-swatch swatch-${preset.id}`} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {activeWorkspace === 'professional' && (
                <section className="tool-panel" id="color-workspace">
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
              )}
              {activeWorkspace === 'professional' && (
                <section className="tool-panel" id="transform-workspace">
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
                      ↶ Rotate left
                    </button>
                    <button
                      className="button button-quiet"
                      disabled={!hasImage}
                      onClick={() => rotateDocument(90)}
                    >
                      ↷ Rotate right
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
                      ⇋ Flip horizontal
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
                      ⇵ Flip vertical
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
                      onClick={() => commitDocumentTransform(DEFAULT_DOCUMENT_TRANSFORM)}
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
              )}
              {activeWorkspace === 'professional' && (
                <section className="tool-panel">
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
                      ☼ Dodge
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
                      ◐ Burn
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
                              {mask.visible === false ? '◉̸' : '◉'}
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
              )}
              {activeWorkspace === 'portrait' && (
                <section className="tool-panel retouch-panel" id="retouch-workspace">
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
              )}
              <section className="tool-panel assistant-panel">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">LOCAL EDITING HELPER</p>
                    <h2>Describe the look</h2>
                  </div>
                  <span className="offline-tag">OFFLINE</span>
                </div>
                <p>
                  Describe the look in plain language. The on-device assistant converts recognized
                  directions into editable color settings, filter choices, and optional face-aware
                  smoothing. Nothing is sent to a cloud model.
                </p>
                <div className="prompt-row">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && hasImage && suggestFromPrompt()}
                    placeholder="e.g. warm luxury fashion campaign, soft skin"
                    disabled={!hasImage}
                  />
                  <button
                    onClick={suggestFromPrompt}
                    disabled={!hasImage || !prompt.trim()}
                    aria-label="Interpret style instruction"
                  >
                    ↗
                  </button>
                </div>
                {styleInterpretation && (
                  <div className="style-assistant-result">
                    <strong>Proposed editing recipe</strong>
                    <ul>
                      {styleInterpretation.explanation.map((line, index) => (
                        <li key={`${index}-${line}`}>{line}</li>
                      ))}
                    </ul>
                    <div className="style-assistant-values">
                      <span>Brightness {Math.round(styleInterpretation.settings.brightness)}%</span>
                      <span>Contrast {Math.round(styleInterpretation.settings.contrast)}%</span>
                      <span>Saturation {Math.round(styleInterpretation.settings.saturation)}%</span>
                      <span>Warmth {Math.round(styleInterpretation.settings.warmth)}</span>
                    </div>
                    <button
                      className="button button-primary style-save-button"
                      onClick={() => {
                        void saveCurrentStyle(styleRecipeName.trim() || 'AI Style Recipe');
                      }}
                      disabled={!hasImage || batchBusy}
                    >
                      Save proposed look as Style Recipe
                    </button>
                  </div>
                )}
                <p className="tool-note">
                  This is a local rule-based assistant, not a connected generative AI model.
                  Advanced effects and cloud language-model interpretation are not enabled.
                </p>
              </section>
            </aside>
          </div>
        )}
      </main>
      <footer className="studio-footer">
        <span>EVERY FRAME FIRST STUDIO</span>
        <span>Private by default · Processing stays in your browser</span>
        <span>AI features require a configured secure service</span>
      </footer>
    </div>
  );
}
