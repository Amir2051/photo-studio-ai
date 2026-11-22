// Shared, framework-neutral contracts for the professional suite. These types
// intentionally have no React/Svelte imports: each studio adapts its own native
// document to and from SuiteDocument without changing its own model.

export const SUITE_FORMAT = 'minu-suite' as const;
export const SUITE_VERSION = 1 as const;

export type StudioKind = 'video' | 'photo' | 'audio';
export type MediaKind = 'video' | 'audio' | 'image' | 'other';
export type MediaOrigin = 'user-file' | 'file-handle' | 'proxy' | 'generated';
export type MediaAvailability = 'ready' | 'missing' | 'permission-needed' | 'unknown';

export interface SuiteMediaRef {
  id: string;
  name: string;
  fileName: string;
  kind: MediaKind;
  origin: MediaOrigin;
  availability: MediaAvailability;
  // stable identity for duplicate/missing detection (name + size + last write)
  identity: string;
  // opaque key interpreted by the owning studio's storage adapter
  reference: string | null;
  mimeType: string;
  bytes: number;
  duration: number;
  lastModified: number | null;
  relativePath: string | null;
  meta: Record<string, string | number | boolean | null>;
}

export interface SuiteDocument {
  format: typeof SUITE_FORMAT;
  version: typeof SUITE_VERSION;
  id: string;
  name: string;
  studio: StudioKind;
  createdAt: number;
  modifiedAt: number;
  // normalized, shared view of the media used by this document
  media: SuiteMediaRef[];
  // the native studio document, preserved verbatim; authoritative for all
  // studio-specific state (timeline, layers, tracks, effects, ...)
  payload: Record<string, unknown>;
}
