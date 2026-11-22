import { writable } from 'svelte/store';

// Holds only the user-approved visual analysis until the MIA panel is opened.
// Raw frames stay in the Visual Intelligence component and are never persisted here.
export const pendingVisualAnalysis = writable<string | null>(null);
