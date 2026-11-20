import type { MediaAvailability, SuiteMediaRef } from './types';

// A file is the same media when its name, byte size and last-write time match.
// A missing timestamp is normalized to 0 so older braincut projects (which
// have no fileName/lastModified) still match the file they were imported from.
export function mediaIdentity(fileName: string, bytes: number, lastModified: number | null): string {
  const name = fileName.trim().toLowerCase() || 'unnamed';
  return `${name}|${Math.max(0, Math.floor(bytes))}|${lastModified ?? 0}`;
}

export function identityOf(ref: SuiteMediaRef): string {
  return mediaIdentity(ref.fileName || ref.name, ref.bytes, ref.lastModified);
}

// groups of two or more refs that point at the same underlying file
export function duplicateGroups(refs: readonly SuiteMediaRef[]): string[][] {
  const byIdentity = new Map<string, string[]>();
  for (const ref of refs) {
    const key = identityOf(ref);
    const group = byIdentity.get(key);
    if (group) group.push(ref.id);
    else byIdentity.set(key, [ref.id]);
  }
  return [...byIdentity.values()].filter((group) => group.length > 1);
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
