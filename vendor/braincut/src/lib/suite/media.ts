import type { MediaAvailability, SuiteMediaRef } from './types';

// A file is the same media when its name, byte size and last-write time match.
// A missing timestamp is normalized to 0 so older braincut projects (which
// have no fileName/lastModified) still match the file they were imported from.
export function mediaIdentity(fileName: string, bytes: number, lastModified: number | null): string {
  const name = fileName.trim().toLowerCase() || 'unnamed';
  return `${name}|${Math.max(0, Math.floor(bytes))}|${lastModified ?? 0}`;
}

export interface MediaIdentityInput {
  name: string;
  fileName?: string | null;
  // MediaItem uses fileSize; SuiteMediaRef uses bytes
  fileSize?: number;
  bytes?: number;
  lastModified?: number | null;
}

export function identityKeyOf(item: MediaIdentityInput): string {
  return mediaIdentity(item.fileName ?? item.name, item.bytes ?? item.fileSize ?? 0, item.lastModified ?? null);
}

// Works on the lightweight shape already present on MediaItem, so the media
// panel can detect duplicate references without building a SuiteDocument.
export function duplicateMediaGroups<T extends MediaIdentityInput>(items: readonly T[]): T[][] {
  const byIdentity = new Map<string, T[]>();
  for (const item of items) {
    const key = identityKeyOf(item);
    const group = byIdentity.get(key);
    if (group) group.push(item);
    else byIdentity.set(key, [item]);
  }
  return [...byIdentity.values()].filter((group) => group.length > 1);
}

export function identityOf(ref: SuiteMediaRef): string {
  return mediaIdentity(ref.fileName || ref.name, ref.bytes, ref.lastModified);
}

// groups of two or more refs that point at the same underlying file
export function duplicateGroups(refs: readonly SuiteMediaRef[]): string[][] {
  return duplicateMediaGroups(refs).map((group) => group.map((ref) => ref.id));
}

// refs whose opaque storage reference is gone or not resolvable any more
export function unavailableRefs(
  refs: readonly SuiteMediaRef[],
  available: ReadonlySet<string>,
): SuiteMediaRef[] {
  return refs.filter((ref) => ref.reference !== null && !available.has(ref.reference));
}

export function availabilityOf(available: boolean, hadReference: boolean): MediaAvailability {
  if (available) return 'ready';
  return hadReference ? 'missing' : 'unknown';
}
