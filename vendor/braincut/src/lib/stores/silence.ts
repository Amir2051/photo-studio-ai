import { writable } from 'svelte/store';
import type { QuietRegionMarker } from '#lib/media/silence-edit.ts';

// sequence-time ranges flagged as (near) silence. selection is kept on the
// markers themselves so the timeline overlay and any edit actions stay in sync
export const quietRegionMarkers = writable<QuietRegionMarker[]>([]);

// whether the detected quiet regions are being auditioned right now
export const quietRegionPreviewing = writable(false);

export function setQuietRegionMarkers(markers: QuietRegionMarker[]): void {
  quietRegionMarkers.set(markers);
}

export function toggleQuietRegionMarker(id: string): void {
  quietRegionMarkers.update((markers) =>
    markers.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)),
  );
}

export function setAllQuietRegionMarkers(selected: boolean): void {
  quietRegionMarkers.update((markers) => markers.map((m) => ({ ...m, selected })));
}

export function clearQuietRegionMarkers(): void {
  quietRegionMarkers.set([]);
}
