# M2B-9B Local Audio Peak Normalization — Implementation Report

Date: 2026-11-20
Scope: local, non-destructive clip peak normalization in the existing video editor.

## Implemented

- Added a pure, Node-safe peak-normalization calculator in `vendor/braincut/src/lib/media/audio-normalize.ts`.
- Added a per-clip **Peak normalize** action beside the existing local waveform analysis results.
- Uses measured source peak data and the existing clip Volume effect; it does not rewrite or re-encode source media.
- Targets -1 dBFS peak, caps boost at +12 dB, and respects the supported -60 dB to +12 dB clip gain range.
- Applies the same gain offset to the base volume and every numeric volume automation keyframe, preserving their relative shape and easing.
- Fails closed for silent source audio, disabled volume effects, fully muted automation, missing controls, invalid peaks, and malformed automation.
- Reports when the +12 dB boost ceiling prevents reaching the target.
- No network/provider calls, no external model, and no media upload.

## Technical limits

This is **peak normalization**, not LUFS/integrated-loudness normalization, compression, limiting, or denoising. It does not remove room noise or clicks. Automatic noise reduction is deliberately not claimed or applied; it needs a separately validated local DSP workflow with preview and rollback because aggressive gating can damage speech.

## Verification

- Focused normalization + waveform-analysis tests: 48/48 passed.
- Full Braincut vendor suite: 497 passed, 1 skipped.
- Svelte check: 0 errors, 1 existing unused-CSS warning in `MIAChatPanel.svelte`.
- Root application typecheck: passed.
- Root application tests: 204/204 passed.
- Full root production build: passed; Braincut static build synced into `public/video-studio`.
- Existing non-blocking warnings remain: large chunks, ineffective dynamic imports, and the pre-existing unused `.signout` selector.
- Build and tests used local synthetic/unit fixtures; no live AI calls and no OpenRouter credits were used.

## Next

- Exercise the new button in the running editor with synthetic audio of known peak levels; verify undo/redo and export playback.
- Add local noise-reduction/cleanup only after a separate algorithm review, listening tests, and preview/rollback UX.
- Continue long-duration and multi-pattern audio/video validation.
