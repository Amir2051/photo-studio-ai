import {
  SUITE_FORMAT,
  SUITE_VERSION,
  type MediaAvailability,
  type MediaKind,
  type MediaOrigin,
  type StudioKind,
  type SuiteDocument,
  type SuiteMediaRef,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bad(path: string, expected: string): never {
  throw new Error(`Not a suite document: ${path} should be ${expected}`);
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string') bad(path, 'a string');
  return value;
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) bad(path, 'a number');
  return value;
}

function nullableNum(value: unknown, path: string): number | null {
  return value === null ? null : num(value, path);
}

function nullableStr(value: unknown, path: string): string | null {
  return value === null ? null : str(value, path);
}

function oneOf<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) bad(path, `one of ${allowed.join(', ')}`);
  return value as T;
}

const STUDIOS: readonly StudioKind[] = ['video', 'photo', 'audio'];
const MEDIA_KINDS: readonly MediaKind[] = ['video', 'audio', 'image', 'other'];
const MEDIA_ORIGINS: readonly MediaOrigin[] = ['user-file', 'file-handle', 'proxy', 'generated'];
const AVAILABILITY: readonly MediaAvailability[] = ['ready', 'missing', 'permission-needed', 'unknown'];

function metaOf(value: unknown, path: string): Record<string, string | number | boolean | null> {
  if (!isRecord(value)) bad(path, 'an object');
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') out[key] = entry;
    else bad(`${path}.${key}`, 'a primitive value');
  }
  return out;
}

function payloadOf(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) bad('payload', 'an object');
  return value;
}

function parseRef(value: unknown, path: string): SuiteMediaRef {
  if (!isRecord(value)) bad(path, 'an object');
  return {
    id: str(value.id, `${path}.id`),
    name: str(value.name, `${path}.name`),
    fileName: str(value.fileName, `${path}.fileName`),
    kind: oneOf(value.kind, `${path}.kind`, MEDIA_KINDS),
    origin: oneOf(value.origin, `${path}.origin`, MEDIA_ORIGINS),
    availability: oneOf(value.availability, `${path}.availability`, AVAILABILITY),
    identity: str(value.identity, `${path}.identity`),
    reference: nullableStr(value.reference, `${path}.reference`),
    mimeType: str(value.mimeType, `${path}.mimeType`),
    bytes: num(value.bytes, `${path}.bytes`),
    duration: num(value.duration, `${path}.duration`),
    lastModified: nullableNum(value.lastModified, `${path}.lastModified`),
    relativePath: nullableStr(value.relativePath, `${path}.relativePath`),
    meta: metaOf(value.meta, `${path}.meta`),
  };
}

// Versioned envelope for suite documents. Legacy .braincut v1 files are not
// this format; the braincut adapter wraps them before they reach this layer.
export function serializeSuiteDocument(doc: SuiteDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function parseSuiteDocument(text: string): SuiteDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Not a suite document: invalid JSON');
  }
  if (!isRecord(raw)) bad('root', 'an object');
  if (raw.format !== SUITE_FORMAT) bad('format', `'${SUITE_FORMAT}'`);
  if (raw.version !== SUITE_VERSION) bad('version', `${SUITE_VERSION}`);
  if (!Array.isArray(raw.media)) bad('media', 'an array');
  return {
    format: SUITE_FORMAT,
    version: SUITE_VERSION,
    id: str(raw.id, 'id'),
    name: str(raw.name, 'name'),
    studio: oneOf(raw.studio, 'studio', STUDIOS),
    createdAt: num(raw.createdAt, 'createdAt'),
    modifiedAt: num(raw.modifiedAt, 'modifiedAt'),
    media: raw.media.map((entry, i) => parseRef(entry, `media[${i}]`)),
    payload: payloadOf(raw.payload),
  };
}

export function looksLikeSuiteDocument(text: string): boolean {
  try {
    const raw = JSON.parse(text) as unknown;
    return isRecord(raw) && raw.format === SUITE_FORMAT;
  } catch {
    return false;
  }
}
