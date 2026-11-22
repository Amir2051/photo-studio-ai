import { writable } from 'svelte/store';
import { browser } from '$app/env';

import {
  defaultAudioTransition,
  defaultTransitionDuration,
  defaultVideoTransition,
} from '#lib/engine/transitions/defaults.ts';

export interface Preferences {
  // seconds a still gets when it lands on the timeline
  stillImageDuration: number;
  defaultTransitionDuration: number;
  defaultVideoTransition: string;
  defaultAudioTransition: string;
  // fraction of the sequence size the program monitor renders at
  previewQuality: number;
  autoSave: boolean;
  snapping: boolean;
  // where the ffmpeg core is fetched from the first time a file needs
  // converting, empty string turns conversion off entirely
  ffmpegMirror: string;
  useProxies: boolean;
  showThumbnails: boolean;
  showWaveforms: boolean;
  hardwareAcceleration: 'no-preference' | 'prefer-hardware' | 'prefer-software';
  audioScrubbing: boolean;
  timecodeFormat: 'timecode' | 'frames' | 'seconds';
  thumbnailSize: number;
  // height of the generated preview proxy in pixels; the original always
  // drives exports, the proxy only stands in while editing
  proxyHeight: number;
  // session-only consent: never restore a localhost agent connection on reload
  claudeBridge: boolean;
  claudePort: number;
}

// proxy heights stay sane whatever the UI passes; an even number keeps
// encoders that require even dimensions happy
export function normalizeProxyHeight(input: number): number {
  if (!Number.isFinite(input)) return 540;
  const clamped = Math.min(1080, Math.max(144, Math.round(input)));
  return Math.max(2, Math.floor(clamped / 2) * 2);
}

const defaults: Preferences = {
  stillImageDuration: 5,
  defaultTransitionDuration,
  defaultVideoTransition,
  defaultAudioTransition,
  previewQuality: 0.25,
  autoSave: true,
  snapping: true,
  ffmpegMirror: '',
  useProxies: false,
  showThumbnails: true,
  showWaveforms: true,
  hardwareAcceleration: 'no-preference',
  audioScrubbing: false,
  timecodeFormat: 'timecode',
  thumbnailSize: 96,
  proxyHeight: 540,
  claudeBridge: false,
  claudePort: 7331,
};

function createPreferencesStore() {
  let initial = defaults;
  if (browser) {
    try {
      const stored = localStorage.getItem('braincut-preferences');
      if (stored) initial = { ...defaults, ...JSON.parse(stored), claudeBridge: false };
    } catch {}
  }

  const { subscribe, set, update } = writable<Preferences>(initial);

  return {
    subscribe,
    set(value: Preferences) {
      set(value);
      if (browser) {
        // A localhost agent connection is a session consent, not a durable preference.
        localStorage.setItem('braincut-preferences', JSON.stringify({ ...value, claudeBridge: false }));
      }
    },
    update(fn: (prefs: Preferences) => Preferences) {
      update((current) => {
        const next = fn(current);
        if (browser) {
          // Never restore local-agent consent automatically on a later visit.
          localStorage.setItem('braincut-preferences', JSON.stringify({ ...next, claudeBridge: false }));
        }
        return next;
      });
    },
  };
}

export const preferences = createPreferencesStore();
