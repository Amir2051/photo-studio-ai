import { codecName, roundFrameRate } from './probe';
import { formatDuration } from '#lib/project/time.ts';

export type MediaMetadataInput = Readonly<Partial<Record<string, unknown>>> | null | undefined;

export interface NormalizedMediaMetadata {
  name: string;
  kind: string | null;
  width: number | null;
  height: number | null;
  dimensions: string | null;
  fps: number | null;
  durationSeconds: number | null;
  duration: string | null;
  hasVideo: boolean | null;
  hasAudio: boolean | null;
  channels: number | null;
  sampleRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  container: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  fileSize: string | null;
  status: string | null;
  statusReason: string | null;
  meta: Record<string, string | number | boolean | null>;
}

export interface MetadataRow {
  readonly label: string;
  readonly value: string;
}

type RawRecord = Readonly<Partial<Record<string, unknown>>>;

const STATUSES = ['ready', 'unsupported', 'missing', 'converting'] as const;

function asRecord(input: MediaMetadataInput): RawRecord {
  return input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function trimmed(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// mirrors opfs.ts formatBytes, kept local so this module stays free of
// browser-storage imports. unknown sizes are handled by formatFileSize.
function formatBytes(bytes: number): string {
  if (bytes >= 1 << 30) return `${(bytes / (1 << 30)).toFixed(1)} GB`;
  if (bytes >= 1 << 20) return `${Math.round(bytes / (1 << 20))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function numberOrNull(value: unknown): number | null {
  return finite(value) ? value : null;
}

function normalizeDurationSeconds(value: unknown): number | null {
  return finite(value) && value >= 0 ? value : null;
}

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return (STATUSES as readonly string[]).includes(value) ? value : null;
}

export function normalizeDimension(value: number | null | undefined): number | null {
  return finite(value) && value > 0 && Number.isInteger(value) ? value : null;
}

export function normalizeFps(fps: number | null | undefined): number | null {
  if (!finite(fps) || fps <= 0) return null;
  const rounded = roundFrameRate(fps);
  return Number.isFinite(rounded) ? rounded : null;
}

export function normalizeCodec(codec: string | null | undefined): string | null {
  const text = typeof codec === 'string' && codec.trim() ? codec.trim() : null;
  if (text === null) return null;
  const named = codecName(text);
  return named === 'unknown' ? null : named;
}

export function normalizeContainer(container: string | null | undefined): string | null {
  if (typeof container !== 'string') return null;
  const text = container.trim().toLowerCase();
  return text || null;
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!finite(bytes) || bytes < 0) return null;
  return formatBytes(bytes);
}

export function formatMetadataDuration(
  seconds: number | null | undefined,
  kind?: string | null,
): string | null {
  if (kind === 'image') return null;
  if (!finite(seconds) || seconds < 0) return null;
  return formatDuration(seconds);
}

export function normalizeMediaMetadata(input: MediaMetadataInput): NormalizedMediaMetadata {
  const raw = asRecord(input);
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const kind = trimmed(raw.kind);
  const width = normalizeDimension(numberOrNull(raw.width));
  const height = normalizeDimension(numberOrNull(raw.height));
  const dimensions = width !== null && height !== null ? `${width}×${height}` : null;
  const fps = normalizeFps(numberOrNull(raw.fps));
  const durationSeconds = kind === 'image' ? null : normalizeDurationSeconds(raw.duration);
  const duration = formatMetadataDuration(durationSeconds, kind);
  const hasVideo = typeof raw.hasVideo === 'boolean' ? raw.hasVideo : null;
  const hasAudio = typeof raw.hasAudio === 'boolean' ? raw.hasAudio : null;
  const channels = finite(raw.channels) && raw.channels >= 0 ? raw.channels : null;
  const sampleRate = finite(raw.sampleRate) && raw.sampleRate > 0 ? raw.sampleRate : null;
  const videoCodec = normalizeCodec(trimmed(raw.videoCodec));
  const audioCodec = normalizeCodec(trimmed(raw.audioCodec));
  const container = normalizeContainer(trimmed(raw.container));
  const mimeType = trimmed(raw.mimeType);
  const fileSizeBytes = finite(raw.fileSize) && raw.fileSize >= 0 ? raw.fileSize : null;
  const fileSize = formatFileSize(fileSizeBytes);
  const status = normalizeStatus(raw.status);
  const statusReason = trimmed(raw.statusReason);

  const meta: Record<string, string | number | boolean | null> = {};
  const put = (key: string, value: string | number | boolean | null): void => {
    if (value !== null && !(typeof value === 'number' && !Number.isFinite(value))) meta[key] = value;
  };
  put('name', name);
  put('kind', kind);
  put('width', width);
  put('height', height);
  put('fps', fps);
  put('duration', durationSeconds);
  put('hasVideo', hasVideo);
  put('hasAudio', hasAudio);
  put('channels', channels);
  put('sampleRate', sampleRate);
  put('videoCodec', videoCodec);
  put('audioCodec', audioCodec);
  put('container', container);
  put('mimeType', mimeType);
  put('fileSize', fileSizeBytes);
  put('status', status);
  put('statusReason', statusReason);

  return {
    name,
    kind,
    width,
    height,
    dimensions,
    fps,
    durationSeconds,
    duration,
    hasVideo,
    hasAudio,
    channels,
    sampleRate,
    videoCodec,
    audioCodec,
    container,
    mimeType,
    fileSizeBytes,
    fileSize,
    status,
    statusReason,
    meta,
  };
}

export function metadataRows(input: MediaMetadataInput): readonly MetadataRow[] {
  const m = normalizeMediaMetadata(input);
  const rows: MetadataRow[] = [];
  const add = (label: string, value: string | null): void => {
    if (value !== null && value !== '') rows.push({ label, value });
  };
  add('Dimensions', m.dimensions);
  add('Frame rate', m.fps === null ? null : String(m.fps));
  add('Duration', m.duration);
  add('Video codec', m.videoCodec);
  add('Audio codec', m.audioCodec);
  add('Container', m.container);
  add('Channels', m.channels === null ? null : String(m.channels));
  add('Sample rate', m.sampleRate === null ? null : String(m.sampleRate));
  add('File size', m.fileSize);
  add('Status reason', m.statusReason);
  return rows;
}
