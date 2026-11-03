import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  savePhoto,
  getAllPhotos,
  saveStyleRecipe,
  getStyleRecipes,
  deleteStyleRecipe,
} from '../lib/storage';
import type { Photo, FilterRecipe, StyleRecipe } from '../lib/types';
import { CATEGORIES, FILTER_LIBRARY } from '../lib/filters';
import { interpretStylePrompt, type StyleInterpretation } from '../lib/styleAssistant';
import {
  applyHealing,
  applyLocalMasks,
  type HealStroke,
  type LocalMask,
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

type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };
type Preset = { id: string; name: string; values: Adjustments };
type EditorSnapshot = {
  adjustments: Adjustments;
  manualAdjustments: ManualAdjustmentSettings;
  localMasks: LocalMask[];
  healStrokes: HealStroke[];
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

function toFilterAdjustments(recipe: FilterRecipe, intensity: number): Adjustments {
  const amount = Math.max(0, Math.min(100, intensity)) / 100;
  const values = recipe.adjustments;
  return {
    brightness: Math.max(
      50,
      Math.min(150, 100 + ((values.exposure ?? 0) + (values.brightness ?? 0)) * 100 * amount),
    ),
    contrast: Math.max(50, Math.min(160, 100 + (values.contrast ?? 0) * 100 * amount)),
    saturation: Math.max(0, Math.min(180, 100 + (values.saturation ?? 0) * 100 * amount)),
    warmth: Math.max(-60, Math.min(60, (values.temperature ?? 0) * 200 * amount)),
  };
}
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
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULTS);
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustmentSettings>(
    DEFAULT_MANUAL_ADJUSTMENTS,
  );
  const [localMasks, setLocalMasks] = useState<LocalMask[]>([]);
  const [healStrokes, setHealStrokes] = useState<HealStroke[]>([]);
  const [localTool, setLocalTool] = useState<'off' | 'brush' | 'linear' | 'radial' | 'heal'>('off');
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
  const [retouchMode, setRetouchMode] = useState<'off' | 'brush'>('off');
  const [retouchStrength, setRetouchStrength] = useState(35);
  const [brushSize, setBrushSize] = useState(28);
  const [faceLandmarks, setFaceLandmarks] = useState<NormalizedPoint[][]>([]);
  const [retouchStrokes, setRetouchStrokes] = useState<BrushStroke[]>([]);
  const [detectingFaces, setDetectingFaces] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [selectedFilterId, setSelectedFilterId] = useState('');
  const [styleRecipes, setStyleRecipes] = useState<StyleRecipe[]>([]);
  const [styleRecipeName, setStyleRecipeName] = useState('');
  const [selectedStyleRecipeId, setSelectedStyleRecipeId] = useState('');
  const [batchItems, setBatchItems] = useState<BatchPhotoItem[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchFormat, setBatchFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>(
    'image/jpeg',
  );

  const render = useCallback(
    (next: Adjustments, showOriginal = false) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) return;
      const maxPreviewEdge = 2200;
      const scale = Math.min(1, maxPreviewEdge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = showOriginal ? 'none' : adjustmentFilter(next);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      if (!showOriginal && next.warmth !== 0) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle =
          next.warmth > 0
            ? `rgba(255, 164, 72, ${Math.min(0.22, next.warmth / 400)})`
            : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(next.warmth) / 500)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (!showOriginal) {
        applyManualAdjustments(canvas, manualAdjustments);
        applyLocalMasks(canvas, localMasks);
        applyHealing(canvas, healStrokes);
        applyPortraitRetouch(canvas, {
          strength: retouchStrength,
          faces: faceLandmarks,
          strokes: retouchStrokes,
        });
      }
    },
    [faceLandmarks, retouchStrokes, retouchStrength, manualAdjustments, localMasks, healStrokes],
  );

  useEffect(() => {
    render(adjustments, compare);
  }, [adjustments, compare, render, sourceUrl, showSaved]);
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

  const hasImage = Boolean(sourceUrl);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const visibleFilters = useMemo(
    () =>
      FILTER_LIBRARY.filter((filter) => {
        const categoryMatch = filterCategory === 'all' || filter.category === filterCategory;
        const query = filterQuery.trim().toLowerCase();
        const queryMatch =
          !query ||
          `${filter.name} ${filter.description} ${filter.tokens.join(' ')}`
            .toLowerCase()
            .includes(query);
        return categoryMatch && queryMatch;
      }),
    [filterCategory, filterQuery],
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

  const commitSnapshot = (
    nextAdjustments: Adjustments,
    nextManual: ManualAdjustmentSettings,
    nextMasks = localMasks,
    nextHeal = healStrokes,
  ) => {
    setAdjustments(nextAdjustments);
    setManualAdjustments(nextManual);
    setLocalMasks(nextMasks);
    setHealStrokes(nextHeal);
    setHistory((current) =>
      [
        ...current.slice(0, historyIndex + 1),
        {
          adjustments: nextAdjustments,
          manualAdjustments: nextManual,
          localMasks: nextMasks,
          healStrokes: nextHeal,
        },
      ].slice(-60),
    );
    setHistoryIndex((index) => Math.min(index + 1, 59));
  };

  const addHistory = (next: Adjustments) => {
    setSelectedFilterId('');
    commitSnapshot(next, manualAdjustments);
  };

  const updateManualAdjustment = (key: keyof ManualAdjustmentSettings, value: number) => {
    commitSnapshot(adjustments, { ...manualAdjustments, [key]: value });
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
      setAdjustments(DEFAULTS);
      setManualAdjustments(DEFAULT_MANUAL_ADJUSTMENTS);
      setLocalMasks([]);
      setHealStrokes([]);
      setHistory([
        {
          adjustments: DEFAULTS,
          manualAdjustments: DEFAULT_MANUAL_ADJUSTMENTS,
          localMasks: [],
          healStrokes: [],
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
    addHistory(toFilterAdjustments(recipe, intensity));
    setSelectedFilterId(recipe.id);
    setFilterIntensity(intensity);
    setCompare(false);
    setMessage(
      `Applied ${recipe.name} at ${intensity}% intensity. The original remains untouched.`,
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
  };
  const redo = () => {
    if (!canRedo) return;
    const index = historyIndex + 1;
    setHistoryIndex(index);
    setAdjustments(history[index].adjustments);
    setManualAdjustments(history[index].manualAdjustments);
    setLocalMasks(history[index].localMasks || []);
    setHealStrokes(history[index].healStrokes || []);
  };
  const reset = () => {
    setSelectedFilterId('');
    commitSnapshot(DEFAULTS, DEFAULT_MANUAL_ADJUSTMENTS, [], []);
  };

  const exportPhoto = async () => {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    try {
      const output = document.createElement('canvas');
      output.width = image.naturalWidth;
      output.height = image.naturalHeight;
      const ctx = output.getContext('2d');
      if (!ctx) throw new Error('Your browser could not create an export canvas.');
      ctx.filter = adjustmentFilter(adjustments);
      ctx.drawImage(image, 0, 0);
      ctx.filter = 'none';
      if (adjustments.warmth !== 0) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle =
          adjustments.warmth > 0
            ? `rgba(255, 164, 72, ${Math.min(0.22, adjustments.warmth / 400)})`
            : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(adjustments.warmth) / 500)})`;
        ctx.fillRect(0, 0, output.width, output.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      applyManualAdjustments(output, manualAdjustments);
      applyLocalMasks(output, localMasks);
      applyHealing(output, healStrokes);
      applyPortraitRetouch(output, {
        strength: retouchStrength,
        faces: faceLandmarks,
        strokes: retouchStrokes,
      });
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
      const preview = document.createElement('canvas');
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      preview.width = Math.round(image.naturalWidth * scale);
      preview.height = Math.round(image.naturalHeight * scale);
      const ctx = preview.getContext('2d');
      if (!ctx) throw new Error('Could not create a preview.');
      ctx.filter = adjustmentFilter(adjustments);
      ctx.drawImage(image, 0, 0, preview.width, preview.height);
      ctx.filter = 'none';
      if (adjustments.warmth !== 0) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle =
          adjustments.warmth > 0
            ? `rgba(255, 164, 72, ${Math.min(0.22, adjustments.warmth / 400)})`
            : `rgba(78, 145, 255, ${Math.min(0.18, Math.abs(adjustments.warmth) / 500)})`;
        ctx.fillRect(0, 0, preview.width, preview.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      applyManualAdjustments(preview, manualAdjustments);
      applyLocalMasks(preview, localMasks);
      applyHealing(preview, healStrokes);
      applyPortraitRetouch(preview, {
        strength: retouchStrength,
        faces: faceLandmarks,
        strokes: retouchStrokes,
      });
      const dataUrl = preview.toDataURL('image/jpeg', 0.88);
      const originalDataUrl = await readAsDataUrl(
        new File([await (await fetch(sourceUrl!)).blob()], sourceName || 'photo'),
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
        filterIntensity: 100,
        isOriginalRequired: true,
        tags: [],
        localMasks: localMasks.map((mask) => ({
          ...mask,
          points: mask.points.map((point) => ({ ...point })),
        })),
        healStrokes: healStrokes.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((point) => ({ ...point })),
        })),
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
      const original = photo.dataUrlHigh || photo.dataUrl;
      const image = await loadImage(original);
      imageRef.current = image;
      setSourceUrl(original);
      setSourceName(photo.name);
      setSourceMime(
        photo.type === 'png' ? 'image/png' : photo.type === 'webp' ? 'image/webp' : 'image/jpeg',
      );
      setSourceFileSize(photo.size);
      setSourceSize({ width: image.naturalWidth, height: image.naturalHeight });
      const valueFor = (key: string, fallback: number) =>
        photo.edits.find((edit) => edit.type === key)?.value ?? fallback;
      const restored: Adjustments = {
        brightness: valueFor('brightness', 100),
        contrast: valueFor('contrast', 100),
        saturation: valueFor('saturation', 100),
        warmth: valueFor('warmth', 0),
      };
      setAdjustments(restored);
      const restoredManual = Object.fromEntries(
        Object.keys(DEFAULT_MANUAL_ADJUSTMENTS).map((key) => [key, valueFor(key, 0)]),
      ) as unknown as ManualAdjustmentSettings;
      setManualAdjustments(restoredManual);
      const restoredMasks = photo.localMasks || [];
      const restoredHealing = photo.healStrokes || [];
      setLocalMasks(restoredMasks);
      setHealStrokes(restoredHealing);
      const isDefault =
        JSON.stringify(restored) === JSON.stringify(DEFAULTS) &&
        JSON.stringify(restoredManual) === JSON.stringify(DEFAULT_MANUAL_ADJUSTMENTS) &&
        !restoredMasks.length &&
        !restoredHealing.length;
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
              },
              {
                adjustments: restored,
                manualAdjustments: restoredManual,
                localMasks: restoredMasks,
                healStrokes: restoredHealing,
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
    );
    setFilterIntensity(recipe.filterIntensity);
    setSelectedFilterId(recipe.selectedFilterId);
    setRetouchStrength(recipe.retouchStrength);
    setLocalMasks(recipe.localMasks || []);
    setHealStrokes([]);
    setCompare(false);
    setMessage(`Loaded “${recipe.name}” onto the reference photo.`);
  };

  const runFaceDetection = async () => {
    const image = imageRef.current;
    if (!image) return;
    setDetectingFaces(true);
    try {
      const faces = await detectFaceLandmarks(image);
      setFaceLandmarks(faces);
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

  const suggestFromPrompt = () => {
    try {
      const result = interpretStylePrompt(prompt);
      setStyleInterpretation(result);
      addHistory(result.settings);
      setFilterIntensity(result.filterIntensity);
      setSelectedFilterId(result.filterId);
      if (result.retouchEnabled) {
        setRetouchStrength(result.retouchStrength);
        void runFaceDetection();
      }
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

      <main className="studio-main">
        <section className="workspace-heading">
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
            <section className="preview-column">
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
                  <canvas
                    ref={canvasRef}
                    aria-label="Photo preview"
                    className={
                      retouchMode === 'brush' || localTool !== 'off' ? 'retouch-brush-active' : ''
                    }
                    onPointerDown={startBrushStroke}
                    onPointerMove={continueBrushStroke}
                  />
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
                <div className="export-bar">
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
                  onClick={() => setActiveWorkspace('portrait')}
                >
                  Portrait Studio
                </button>
              </div>
              <section className="tool-panel style-workflow-panel">
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
                <section className="tool-panel filter-library-panel">
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
                    {CATEGORIES.filter((category) => category.id !== 'custom').map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <div className="filter-list">
                    {visibleFilters.slice(0, 24).map((filter) => (
                      <button
                        key={filter.id}
                        className={`filter-option ${selectedFilterId === filter.id ? 'selected' : ''}`}
                        onClick={() => applyLibraryFilter(filter)}
                        disabled={!hasImage}
                      >
                        <span>
                          <strong>{filter.name}</strong>
                          <small>{filter.description}</small>
                        </span>
                        <span className="filter-apply-mark">
                          {selectedFilterId === filter.id ? '✓' : '＋'}
                        </span>
                      </button>
                    ))}
                    {!visibleFilters.length && (
                      <p className="tool-note">No filters match that search.</p>
                    )}
                    {visibleFilters.length > 24 && (
                      <p className="tool-note">
                        Showing 24 of {visibleFilters.length}. Narrow the search to find a specific
                        look.
                      </p>
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
                        setFilterIntensity(value);
                        const recipe = FILTER_LIBRARY.find((item) => item.id === selectedFilterId);
                        if (recipe) applyLibraryFilter(recipe, value);
                      }}
                    />
                  </label>
                  <p className="tool-note">
                    The catalogue applies the supported tone and color controls. Grain, vignette,
                    bloom, and advanced color effects are being added separately.
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
                <section className="tool-panel">
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
                        onClick={() => setLocalTool(tool)}
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
                  <div className="retouch-actions">
                    <button
                      className="text-button"
                      disabled={!localMasks.length && !healStrokes.length}
                      onClick={() => commitSnapshot(adjustments, manualAdjustments, [], [])}
                    >
                      Clear local edits
                    </button>
                    <span className="tool-note">
                      {localMasks.length} mask(s) · {healStrokes.length} healing stroke(s)
                    </span>
                  </div>
                </section>
              )}
              {activeWorkspace === 'portrait' && (
                <section className="tool-panel retouch-panel">
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">PORTRAIT TOOLS</p>
                      <h2>Retouch</h2>
                    </div>
                    <span className="offline-tag">ON DEVICE</span>
                  </div>
                  <p className="tool-note">
                    Choose automatic face-aware smoothing or paint only the areas you want to
                    soften. Your photo stays on this device.
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
                      onChange={(e) => setRetouchStrength(Number(e.target.value))}
                    />
                  </label>
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
                        setFaceLandmarks([]);
                        setRetouchStrokes([]);
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
