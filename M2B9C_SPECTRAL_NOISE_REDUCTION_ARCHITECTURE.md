# M2B9C — Spectral Noise Reduction Architecture

Status: engineering design / implementation gate  
Scope: local-only audio processing for Mini Studio / Braincut  
Repository branch at inspection: `feature/pro-editor-professional-suite`

## Product outcome

Provide a real, adjustable spectral noise-reduction effect for spoken-word and video production. Users can capture a noise-only sample, preview reduction, adjust strength and speech preservation, apply the result non-destructively, and undo/redo it. Original source media remains unchanged.

This must be an actual frequency-domain noise-reduction algorithm. A gate, high-pass filter, EQ preset, or generic expander is not an acceptable substitute.

## Verified current architecture

- Audio effects are declared in `src/lib/engine/effects/registry.ts`.
- `src/lib/engine/effects/audio.ts` creates effects as standard Web Audio nodes.
- `src/lib/engine/audio-graph.ts` builds the clip effect chain used by the editor player.
- `src/lib/engine/audio-render.ts` renders audio in short, independent `OfflineAudioContext` chunks for export.
- The existing effect runtime interface is node-based: input, output, update, destroy.
- The current graph is intentionally shared between live playback and offline export.
- The existing local audio analysis panel already demonstrates non-destructive timeline preview / apply / cancel patterns, but does not provide a reusable decoded-audio processing pipeline or noise-profile capture.

## Why a simple Web Audio node is insufficient

Spectral denoising needs to estimate the noise spectrum from a user-selected noise-only region, transform incoming audio into overlapping frequency frames, attenuate bins whose energy is consistent with the learned noise, and reconstruct the signal with overlap-add. It must avoid musical-noise artifacts and preserve consonants / quiet speech.

A ScriptProcessor-only or playback-only implementation would be inconsistent, deprecated, or unsuitable for export. A worklet-only implementation also cannot simply be assumed to run in the existing OfflineAudioContext export path. The existing exporter renders bounded chunks, so denoiser state and overlap must be carried across chunk boundaries or the processor must receive a correctly padded continuous segment.

## Required architecture

### 1. Shared DSP core

Create a pure, deterministic DSP module with no DOM, network, provider, or Web Audio dependencies:
- windowed STFT and inverse STFT with tested perfect-reconstruction behavior when reduction is zero;
- user-captured noise-profile estimation, including validation for too-short, silent, clipped, or speech-contaminated samples;
- smoothed spectral gain estimation with bounded attenuation and a speech-preservation control;
- overlap-add with explicit frame padding and boundary handling;
- finite-value checks, bounded memory, cancellation/progress hooks at block boundaries;
- deterministic output for identical input/profile/settings.

Use a documented FFT implementation with no unreviewed runtime dependency. Keep channel handling explicit; default linked stereo profile estimation should avoid image shifts and phase damage.

### 2. Profile capture and persistence

- Let the user select a noise-only range on an audio clip and capture it locally.
- Store the compact profile as project metadata associated with the clip/source identity, not as a replacement media file.
- Validate profile compatibility against sample rate / channel layout.
- Make profile replacement and clearing undoable.
- Do not silently infer a noise profile from speech or quiet-region detection.

### 3. Playback integration

The player must consume the same DSP core and profile/settings as export. Preferred design: a dedicated AudioWorklet processor that runs the shared algorithm in real time, with a clear unsupported status if worklets are unavailable. Define bounded buffering, latency, reset/seek behavior, and profile transfer. Do not silently bypass the effect while showing it as enabled.

### 4. Export integration

The exporter must process continuous clip audio with correct overlap and state across its chunk boundaries. It must not reset the spectral envelope at every chunk, produce clicks at joins, or require decoding an entire long source into unbounded memory. Playback and export must use the same parameter semantics and algorithm version.

### 5. User experience

- Noise profile: Capture, Replace, Clear; show sample duration and validation result.
- Controls: reduction amount, sensitivity / floor, and speech-preservation setting, with conservative defaults.
- Preview: audition processed audio against bypass, without committing.
- Apply: commit only effect parameters/profile metadata to the project; never overwrite source media.
- Cancel: restore the exact pre-preview state.
- Undo/redo: restore settings and profile state.
- Status must distinguish profile missing, incompatible profile, processing unavailable, and successful processing.
- Explain that aggressive reduction can create artifacts and that a clean noise-only sample gives better results.

## Acceptance tests

### DSP correctness
- Zero reduction reproduces the input within a documented numerical tolerance.
- Silence remains finite and silent; no NaN / Infinity.
- Identical profile and input produce deterministic output.
- A synthetic stationary noise bed is measurably reduced.
- A synthetic speech-like signal over noise retains intelligibility proxies (harmonic / transient energy and level) within documented limits.
- Sibilant / fricative-like high-frequency bursts are not erased by default settings.
- Stereo phase / channel relationship is preserved within tolerance.
- No clicks at start/end or block boundaries.
- Invalid profile, sample-rate mismatch, too-short profile, and clipped profile fail closed with actionable status.
- Cancellation releases buffers and does not leave worker/worklet state running.

### Engine integration
- Same clip settings and profile are used in live playback and export.
- Seek, pause/resume, loop, reverse playback, and effect bypass have defined behavior.
- Export chunk boundaries are artifact-free and independent of chunk size.
- Disabled effect is bit-identical to bypass path where practical.
- Missing profile never silently produces a false-success result.

### Product verification
- Synthetic speech + fan / HVAC / broadband noise fixture.
- Synthetic music + noise fixture to detect over-reduction.
- UI preview / bypass / apply / cancel / undo / redo.
- Export WAV and video, then inspect audio for clicks, drift, and processing parity.
- Hands-on browser test at the target desktop layout before demo.

## Delivery sequence

1. Build and test the standalone DSP core and synthetic fixtures.
2. Add noise-profile capture and project metadata lifecycle.
3. Integrate the processor into real-time playback with explicit capability checks.
4. Integrate stateful processing into chunked export and verify parity.
5. Add UI preview / apply / cancel / undo / redo.
6. Run full tests, Svelte checks, build, synthetic playback/export, and hands-on UI review.
7. Sync the nested editor bundle into the root app only after all checks pass.

## Guardrails

- Local processing only; no AI provider, OpenRouter, remote API, or network call.
- Use synthetic test media only; do not use client/customer media.
- Do not alter credentials, environment variables, databases, billing, or provider settings.
- Do not deploy or touch production.
- Preserve existing peak-normalization and audio-analysis work.
- Do not label a gate, EQ preset, or filter chain as spectral noise reduction.
- Do not mark playback/export verification complete until both paths have actually been exercised.

## Current milestone result

Architecture inspection completed. No source files were modified in this design pass. The repository was clean at inspection start. Implementation should begin with the standalone DSP core and synthetic fixtures, then integrate it into both playback and export as a single feature.
