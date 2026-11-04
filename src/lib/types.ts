// Core type definitions for Photo Editor

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic' | 'heif' | 'raw';
export type ExportFormat = 'jpeg' | 'png' | 'webp';
export type FilterCategory =
  | 'natural-portraits'
  | 'clean-skin-tones'
  | 'warm-lifestyle'
  | 'film'
  | 'vintage'
  | 'cinematic'
  | 'moody'
  | 'fashion'
  | 'luxury'
  | 'street'
  | 'travel'
  | 'landscape'
  | 'golden-hour'
  | 'night'
  | 'black-white'
  | 'soft-pastel'
  | 'cool-tones'
  | 'product'
  | 'social-media'
  | 'custom';

export type AiProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama' | 'offline';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface ImageDataSize {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

export interface Adjustment {
  type: string;
  value: number;
  min: number;
  max: number;
  default: number;
  label: string;
  unit?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  category: FilterCategory;
  description: string;
  adjustments: Record<string, { value: number; min: number; max: number; default: number }>;
  author: 'system' | 'user';
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
  usageCount?: number;
}

export interface Photo {
  id: string;
  name: string;
  type: ImageFormat;
  size: number;
  dimensions: Resolution;
  dataUrl: string; // original or preview
  dataUrlHigh: string | null; // high-res for export
  createdAt: string;
  updatedAt: string;
  edits: Adjustment[];
  filterId?: string | null; // active preset
  filterIntensity: number;
  isOriginalRequired: boolean;
  metadata?: PhotoMetadata;
  localMasks?: import('./advancedEditing').LocalMask[];
  selection?: import('./advancedEditing').SelectionState | null;
  healStrokes?: import('./advancedEditing').HealStroke[];
  documentTransform?: {
    crop: { x: number; y: number; width: number; height: number };
    rotation: 0 | 90 | 180 | 270;
    flipX: boolean;
    flipY: boolean;
  };
  studioLayers?: Array<{
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
    adjustments?: { brightness: number; contrast: number; saturation: number; warmth: number };
    mask?: import('./layerMasks').LayerMask | null;
    masks?: import('./layerMasks').LayerMask[];
  }>;
  tags: string[];
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: number;
  exposureCompensation?: number;
  gpsLat?: number;
  gpsLon?: number;
  takenAt?: string;
  orientation: number;
  width: number;
  height: number;
}

export interface EditState {
  adjustments: Adjustment[];
  redoStack: Adjustment[];
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  context?: AiMessageContext;
}

export interface AiMessageContext {
  imageDataUrl?: string;
  previousResponse?: string;
  suggestedSettings?: Adjustment[];
  suggestions?: { id: string; label: string; description: string }[];
}

export interface ScenePrompt {
  id: string;
  prompt: string;
  destination: string;
  style: 'place-inspired' | 'specific-place-reference';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
  atmosphere: 'realistic' | 'cinematic' | 'dreamy' | 'dramatic';
  backgroundBlur: number;
  realism: number;
  lighting: 'natural' | 'studio' | 'golden-hour' | 'neon' | 'dramatic';
  resultUrl?: string;
  analysis?: SceneAnalysis;
  createdAt: string;
}

export interface SceneAnalysis {
  subjectBounds?: Rect;
  subjectPose?: string;
  lightingDirection?: string;
  cameraAngle?: string;
  backgroundType?: string;
  focalLength?: number;
  depthOfField?: number;
}

export interface StyleRecipe {
  id: string;
  name: string;
  createdAt: string;
  adjustments: { brightness: number; contrast: number; saturation: number; warmth: number };
  filterIntensity: number;
  selectedFilterId: string;
  retouchStrength: number;
  retouchEnabled: boolean;
  manualAdjustments?: Record<string, number>;
  localMasks?: import('./advancedEditing').LocalMask[];
}

export interface BatchEdit {
  id: string;
  photoIds: string[];
  label: string;
  settings: Adjustment[];
  appliedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  resultUrls: string[];
}

export interface UserPreferences {
  aiProvider: AiProvider;
  aiModel: string;
  defaultProvider: AiProvider;
  theme: 'dark' | 'light';
  language: string;
  defaultAperture?: number;
  defaultISO?: number;
  rootPath?: string; // for iOS/Android file access
  recentlyUsedFilters: string[];
  favoriteCategories: FilterCategory[];
  gridSize: number;
  safeZone: boolean;
  faceDetection: boolean;
  showMetadata: boolean;
  aspectRatio: string;
  useFacePreservation: boolean;
  retouchIntensity: number;
}

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  width?: number;
  height?: number;
  fit: 'contain' | 'cover' | 'fill' | 'original';
  rotation: number;
  crop: { x: number; y: number; width: number; height: number };
  watermark?: string;
  watermarkPos?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface ImageFilters {
  // Exposure & Tone
  exposure: (img: ImageData, amount: number) => ImageData;
  brightness: (img: ImageData, amount: number) => ImageData;
  contrast: (img: ImageData, amount: number) => ImageData;
  gamma: (img: ImageData, amount: number) => ImageData;
  // Highlights & Shadows
  highlights: (img: ImageData, amount: number) => ImageData;
  shadows: (img: ImageData, amount: number) => ImageData;
  whites: (img: ImageData, amount: number) => ImageData;
  blacks: (img: ImageData, amount: number) => ImageData;
  // Color
  temperature: (img: ImageData, amount: number) => ImageData;
  tint: (img: ImageData, amount: number) => ImageData;
  saturation: (img: ImageData, amount: number) => ImageData;
  vibrance: (img: ImageData, amount: number) => ImageData;
  hue: (img: ImageData, amount: number) => ImageData;
  colorBalance: (img: ImageData, amount: number) => ImageData;
  // Advanced
  curves: (img: ImageData, points: number[]) => ImageData;
  // Detail
  sharpness: (img: ImageData, amount: number) => ImageData;
  clarity: (img: ImageData, amount: number) => ImageData;
  // Texture
  grain: (img: ImageData, amount: number) => ImageData;
  filmFade: (img: ImageData, amount: number) => ImageData;
  // Vignette
  vignette: (img: ImageData, amount: number) => ImageData;
  // Effects
  bloom: (img: ImageData, amount: number) => ImageData;
  glow: (img: ImageData, amount: number) => ImageData;
  dehaze: (img: ImageData, amount: number) => ImageData;
  blur: (img: ImageData, radius: number) => ImageData;
  depthOfField: (img: ImageData, amount: number) => ImageData;
  filter: (img: ImageData, preset: Record<string, number>) => ImageData;
  // Transform
  rotate: (img: ImageData, angle: number) => ImageData;
  flipHorizontal: (img: ImageData) => ImageData;
  flipVertical: (img: ImageData) => ImageData;
}

export interface FilterRecipe {
  id: string;
  name: string;
  category: FilterCategory;
  description: string;
  type: 'color' | 'luminance' | 'rgb' | 'blend' | 'transform';
  adjustments: {
    exposure?: number;
    brightness?: number;
    contrast?: number;
    temperature?: number;
    tint?: number;
    saturation?: number;
    vibrance?: number;
    shadows?: number;
    highlights?: number;
    whites?: number;
    blacks?: number;
    clarity?: number;
    grain?: number;
    filmFade?: number;
    vignette?: number;
    bloom?: number;
    dehaze?: number;
  };
  tokens: string[];
  blocking?: boolean;
  priority?: number;
}

export interface CropAspectRatio {
  name: string;
  label: string;
  width: number;
  height: number;
}

export const ASPECT_RATIOS: CropAspectRatio[] = [
  { name: 'original', label: 'Original', width: 0, height: 0 },
  { name: 'square', label: 'Square', width: 1, height: 1 },
  { name: 'portrait', label: 'Portrait', width: 4, height: 5 },
  { name: 'landscape', label: 'Landscape', width: 16, height: 9 },
  { name: 'instagram-story', label: 'Instagram Story', width: 9, height: 16 },
  { name: 'widescreen', label: 'Widescreen', width: 21, height: 9 },
  { name: 'tiktok', label: 'TikTok', width: 9, height: 19 },
  { name: 'facebook-post', label: 'Facebook Post', width: 1.91, height: 1 },
  { name: 'telegram-story', label: 'Telegram Story', width: 10, height: 17 },
];
