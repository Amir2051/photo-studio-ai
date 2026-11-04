// Local-First Storage (IndexedDB)
// Persistence for photos, filters, projects, preferences, AI sessions

import { v4 as uuidv4 } from 'uuid';
import {
  Photo,
  UserPreferences,
  FilterPreset,
  PhotoMetadata,
  AiMessage,
  ScenePrompt,
  BatchEdit,
  StyleRecipe,
} from './types';

const DB_NAME = 'secureforge-lab-db';
const DB_VERSION = 2;
const STORE_PHOTOS = 'photos';
const STORE_FILTER_LIBRARY = 'filter_library';
const STORE_USER_PREFERENCES = 'user_preferences';
const STORE_AI_MESSAGES = 'ai_messages';
const STORE_SCENE_PROMPTS = 'scene_prompts';
const STORE_BATCH_EDITS = 'batch_edits';
const STORE_STYLE_RECIPES = 'style_recipes';

interface IDBRequests {
  request: IDBRequest<unknown>;
  promise: Promise<unknown>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILTER_LIBRARY)) {
        db.createObjectStore(STORE_FILTER_LIBRARY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_USER_PREFERENCES)) {
        db.createObjectStore(STORE_USER_PREFERENCES);
      }
      if (!db.objectStoreNames.contains(STORE_AI_MESSAGES)) {
        db.createObjectStore(STORE_AI_MESSAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SCENE_PROMPTS)) {
        db.createObjectStore(STORE_SCENE_PROMPTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BATCH_EDITS)) {
        db.createObjectStore(STORE_BATCH_EDITS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_STYLE_RECIPES)) {
        db.createObjectStore(STORE_STYLE_RECIPES, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Photo CRUD ────────────────────────────────────────────────────────
export async function savePhoto(photo: Photo): Promise<Photo> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    const req = store.put(photo);
    req.onsuccess = () => resolve(photo);
    req.onerror = () => reject(req.error);
  });
}

export async function getPhoto(id: string): Promise<Photo | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const store = tx.objectStore(STORE_PHOTOS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPhotos(): Promise<Photo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const store = tx.objectStore(STORE_PHOTOS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Photo[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Filter Library CRUD ───────────────────────────────────────────────
export async function saveFilterPreset(preset: FilterPreset): Promise<FilterPreset> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILTER_LIBRARY, 'readwrite');
    const store = tx.objectStore(STORE_FILTER_LIBRARY);
    const req = store.put(preset);
    req.onsuccess = () => resolve(preset);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllFilterPresets(): Promise<FilterPreset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILTER_LIBRARY, 'readonly');
    const store = tx.objectStore(STORE_FILTER_LIBRARY);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as FilterPreset[]);
    req.onerror = () => reject(req.error);
  });
}

export async function updateFilterPreset(preset: FilterPreset): Promise<FilterPreset> {
  return saveFilterPreset(preset);
}

export async function deleteFilterPreset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILTER_LIBRARY, 'readwrite');
    const store = tx.objectStore(STORE_FILTER_LIBRARY);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── User Preferences ──────────────────────────────────────────────────
const DEFAULT_PREFERENCES: UserPreferences = {
  aiProvider: 'offline',
  aiModel: 'offline-fallback',
  defaultProvider: 'offline',
  theme: 'dark',
  language: 'en',
  recentlyUsedFilters: [],
  favoriteCategories: [],
  gridSize: 4,
  safeZone: true,
  faceDetection: true,
  showMetadata: false,
  aspectRatio: 'original',
  useFacePreservation: true,
  retouchIntensity: 0.3,
};

export async function saveUserPreferences(
  prefs: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const db = await openDB();
  const existing = await getUserPreferences();
  const merged = { ...existing, ...prefs };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_USER_PREFERENCES, 'readwrite');
    const store = tx.objectStore(STORE_USER_PREFERENCES);
    const req = store.put(merged);
    req.onsuccess = () => resolve(merged);
    req.onerror = () => reject(req.error);
  });
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_USER_PREFERENCES, 'readonly');
    const store = tx.objectStore(STORE_USER_PREFERENCES);
    const req = store.get('app');
    req.onsuccess = () => resolve(req.result || DEFAULT_PREFERENCES);
    req.onerror = () => reject(req.error);
  });
}

// ── AI Messages ───────────────────────────────────────────────────────
export async function saveAiMessage(message: AiMessage): Promise<AiMessage> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AI_MESSAGES, 'readwrite');
    const store = tx.objectStore(STORE_AI_MESSAGES);
    const req = store.put(message);
    req.onsuccess = () => resolve(message);
    req.onerror = () => reject(req.error);
  });
}

export async function getAiMessages(): Promise<AiMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AI_MESSAGES, 'readonly');
    const store = tx.objectStore(STORE_AI_MESSAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as AiMessage[]);
    req.onerror = () => reject(req.error);
  });
}

// ── Scene Prompts ─────────────────────────────────────────────────────
export async function saveScenePrompt(
  prompt: Omit<ScenePrompt, 'id' | 'createdAt'>,
): Promise<ScenePrompt> {
  const db = await openDB();
  const full = {
    ...prompt,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCENE_PROMPTS, 'readwrite');
    const store = tx.objectStore(STORE_SCENE_PROMPTS);
    const req = store.put(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function getScenePrompts(): Promise<ScenePrompt[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCENE_PROMPTS, 'readonly');
    const store = tx.objectStore(STORE_SCENE_PROMPTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as ScenePrompt[]);
    req.onerror = () => reject(req.error);
  });
}

// ── Batch Edits ───────────────────────────────────────────────────────
export async function saveBatchEdit(edit: Omit<BatchEdit, 'id' | 'appliedAt'>): Promise<BatchEdit> {
  const db = await openDB();
  const full = {
    ...edit,
    id: uuidv4(),
    appliedAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BATCH_EDITS, 'readwrite');
    const store = tx.objectStore(STORE_BATCH_EDITS);
    const req = store.put(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function getBatchEdits(): Promise<BatchEdit[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BATCH_EDITS, 'readonly');
    const store = tx.objectStore(STORE_BATCH_EDITS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as BatchEdit[]);
    req.onerror = () => reject(req.error);
  });
}

// ── Reusable Style Recipes ───────────────────────────────────────────
export async function saveStyleRecipe(recipe: StyleRecipe): Promise<StyleRecipe> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STYLE_RECIPES, 'readwrite');
    const request = tx.objectStore(STORE_STYLE_RECIPES).put(recipe);
    request.onsuccess = () => resolve(recipe);
    request.onerror = () => reject(request.error);
  });
}

export async function getStyleRecipes(): Promise<StyleRecipe[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_STYLE_RECIPES, 'readonly')
      .objectStore(STORE_STYLE_RECIPES)
      .getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as StyleRecipe[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    request.onerror = () => reject(request.error);
  });
}

export async function deleteStyleRecipe(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_STYLE_RECIPES, 'readwrite')
      .objectStore(STORE_STYLE_RECIPES)
      .delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ── Export ────────────────────────────────────────────────────────────
export async function exportPhotosToZip(photoIds: string[]): Promise<Blob> {
  const photos = await getAllPhotos();
  const selected = photos.filter((photo) => photoIds.includes(photo.id));
  if (!selected.length) throw new Error('No saved photos matched the requested export.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const folder = zip.folder('every-frame-first-photos');
  if (!folder) throw new Error('Could not create the photo export archive.');
  for (const photo of selected) {
    const source = photo.dataUrlHigh || photo.dataUrl;
    const match = source.match(/^data:([^;]+);base64,(.+)$/);
    if (!match)
      throw new Error('Saved photo "' + photo.name + '" has an unsupported stored image format.');
    const extension = match[1].split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const safeName = photo.name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\.[^.]+$/, '') || photo.id;
    folder.file(safeName + '.' + extension, match[2], { base64: true });
  }
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// ── Initialization ────────────────────────────────────────────────────
export async function initStorage(): Promise<void> {
  try {
    await openDB();
    // Seed default user preferences if not present
    const prefs = await getUserPreferences();
    if (!prefs.aiProvider) {
      await saveUserPreferences(DEFAULT_PREFERENCES);
    }
  } catch (e) {
    console.warn('[Storage] initStorage failed:', e);
    // Fall back to in-memory defaults
  }
}
