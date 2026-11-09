import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Photo, UserPreferences, FilterPreset, Adjustment, AiMessage, ScenePrompt, BatchEdit } from '../lib/types';
import { CATEGORIES } from '../lib/filters';
import { generateId } from '../lib/utils';
import { getUserPreferences, saveUserPreferences, getAllFilterPresets, saveFilterPreset, updateFilterPreset, deleteFilterPreset, getAiMessages, saveAiMessage, getScenePrompts, saveScenePrompt, getBatchEdits, saveBatchEdit, savePhoto, deletePhoto } from '../lib/storage';

// ── Types ──────────────────────────────────────────────────────
interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; name: string; email: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<boolean>;
}

interface EditorState {
  activePhotoId: string | null;
  activePhoto: Photo | null;
  photos: Photo[];
  edits: Adjustment[];
  activeFilterId: string | null;
  activeFilter: FilterPreset | null;
  filterIntensity: number;
  originalDataUrl: string | null;
  setActivePhoto: (id: string | null) => void;
  setActivePhotoWithData: (
    id: string | null,
    photo: Photo,
    edits: Adjustment[],
    filterId: string | null,
    filterIntensity: number,
    original: string | null
  ) => void;
  updateActivePhotoEdits: (edits: Adjustment[]) => void;
  applyFilter: (filterId: string, intensity: number) => void;
  resetEdits: () => void;
  restoreOriginal: () => void;
}

interface FilterState {
  searchQuery: string;
  favoritePresetIds: string[];
  favorites: Map<string, FilterPreset>;
  searchQueryChange: (q: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  getFavoritePresets: () => FilterPreset[];
  getFavoriteCategoryCount: () => number;
}

interface SceneState {
  prompts: ScenePrompt[];
  addPrompt: (prompt: Omit<ScenePrompt, 'id' | 'createdAt'>) => Promise<ScenePrompt>;
  getPrompts: () => Promise<ScenePrompt[]>;
  deletePrompt: (id: string) => Promise<void>;
}

interface BatchState {
  batchEdits: BatchEdit[];
  addBatchEdit: (edit: Omit<BatchEdit, 'id' | 'appliedAt'>) => Promise<BatchEdit>;
  getBatchEdits: () => Promise<BatchEdit[]>;
}

interface ImageState {
  currentDataUrl: string | null;
  setCurrentDataUrl: (url: string | null) => void;
}

interface ExportState {
  exporting: boolean;
  progress: number;
  setExporting: (v: boolean) => void;
  setProgress: (v: number) => void;
}

// ── App Store ──────────────────────────────────────────────────
interface AppState {
  preferences: () => Promise<UserPreferences>;
  setPreference: (key: keyof UserPreferences, value: unknown) => Promise<void>;
  categories: typeof CATEGORIES;
  filterLibrary: FilterPreset[];
  customPresets: FilterPreset[];
  addCustomPreset: (preset: FilterPreset) => Promise<FilterPreset>;
  updateCustomPreset: (preset: FilterPreset) => Promise<void>;
  deleteCustomPreset: (id: string) => Promise<void>;
  getAllPresets: () => Promise<FilterPreset[]>;
  getPresetsByCategory: (category: string) => Promise<FilterPreset[]>;
  export: ExportState;
  ai: {
    messages: AiMessage[];
    addMessage: (msg: AiMessage) => Promise<void>;
    getMessages: () => Promise<AiMessage[]>;
  };
  save: {
    photo: (photo: Photo) => Promise<Photo>;
    deletePhoto: (id: string) => Promise<void>;
    preferences: () => Promise<UserPreferences>;
    savePreferences: (prefs: Partial<UserPreferences>) => Promise<UserPreferences>;
  };
  progress: number;
  setProgress: (v: number) => void;
  // EditorState properties
  activePhotoId: string | null;
  activePhoto: Photo | null;
  photos: Photo[];
  edits: Adjustment[];
  activeFilterId: string | null;
  activeFilter: FilterPreset | null;
  filterIntensity: number;
  originalDataUrl: string | null;
  setActivePhoto: (id: string | null) => void;
  setActivePhotoWithData: (
    id: string | null,
    photo: Photo,
    edits: Adjustment[],
    filterId: string | null,
    filterIntensity: number,
    original: string | null
  ) => void;
  updateActivePhotoEdits: (edits: Adjustment[]) => void;
  applyFilter: (filterId: string, intensity: number) => void;
  resetEdits: () => void;
  restoreOriginal: () => void;
}

// ── App Store ──────────────────────────────────────────────────
export const useAppStore = create<Partial<AppState>>()((set, get) => ({
  preferences: () => getUserPreferences(),
  setPreference: async (key, value) => {
    const prefsPromise = get().preferences;
    const prefs = await prefsPromise();
    await saveUserPreferences({ [key]: value });
    set({ preferences: () => getUserPreferences() });
  },
  categories: CATEGORIES,
  filterLibrary: [],
  customPresets: [],
  addCustomPreset: async (preset) => {
    const saved = await saveFilterPreset(preset);
    set((state) => ({
      ...state,
      customPresets: [...state.customPresets, saved],
      filterLibrary: [...state.filterLibrary, saved],
    }));
    return saved;
  },
  updateCustomPreset: async (preset) => {
    const saved = await updateFilterPreset(preset);
    set((state) => ({
      ...state,
      customPresets: state.customPresets.map((p) => (p.id === preset.id ? saved : p)),
      filterLibrary: state.filterLibrary.map((p) => (p.id === preset.id ? saved : p)),
    }));
  },
  deleteCustomPreset: async (id) => {
    await deleteFilterPreset(id);
    set((state) => ({
      ...state,
      customPresets: state.customPresets.filter((p) => p.id !== id),
      filterLibrary: state.filterLibrary.filter((p) => p.id !== id),
    }));
  },
  getAllPresets: async () => getAllFilterPresets(),
  getPresetsByCategory: async (category) => {
    const all = await getAllFilterPresets();
    return all.filter((p: FilterPreset) => p.category === category);
  },
  export: {
    exporting: false,
    progress: 0,
    setExporting: (v) => set({ export: { ...get().export, exporting: v } }),
    setProgress: (v) => set({ export: { ...get().export, progress: v } }),
  },
  ai: {
    messages: [],
    addMessage: async (msg) => {
      await saveAiMessage(msg);
      set((state) => ({
        ...state,
        ai: { ...state.ai, messages: [...state.ai.messages, msg] },
      }));
    },
    getMessages: async () => {
      const messages = await getAiMessages();
      set((state) => ({ ...state, ai: { ...state.ai, messages } }));
      return messages;
    },
  },
  save: {
    photo: async (photo) => {
      const saved = await savePhoto(photo);
      set((state) => ({
        ...state,
        photos: [...state.photos, saved],
      }));
      return saved;
    },
    deletePhoto: async (id) => {
      await deletePhoto(id);
      set((state) => ({
        ...state,
        photos: state.photos.filter((p) => p.id !== id),
      }));
    },
    preferences: () => getUserPreferences(),
    savePreferences: async (prefs) => {
      await saveUserPreferences(prefs);
      return prefs as UserPreferences;
    },
  },
  progress: 0,
  setProgress: (v) => set({ progress: v }),
}));

// ── Aliases ──────────────────────────────────────────────────────
export const usePhotoEditorStore = useAppStore;
export const usePhotoStore = useAppStore;
export const useFilterStore = useAppStore;
export const useSceneStore = useAppStore;
export const useBatchStore = useAppStore;
export const useImageStore = useAppStore;
export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  login: async (_email, _password) => {
    // No authentication backend is configured. Never fabricate a logged-in user.
    set({ isAuthenticated: false, user: null });
    return false;
  },
  logout: () => {
    set({ isAuthenticated: false, user: null });
  },
  register: async (_name, _email, _password) => {
    // Registration remains disabled until a real identity provider is configured.
    set({ isAuthenticated: false, user: null });
    return false;
  },
}));
