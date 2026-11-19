# Video Studio — Technology and API Recommendations (Phase 0)

**Date:** 2026-11-19 · Read-only recommendations; no dependency installed or changed

## 1. Keep (evidence-backed, do not replace without cause)
- **mediabunny + WebCodecs** for demux/decode/encode and export — working, verified H.264/AAC output.
- **PixiJS/WebGL2 compositor** for preview and effects — working with bounded frame caches.
- **Svelte 5 / SvelteKit (video) + React/Vite (photo/audio)** — both healthy and tested; a forced framework unification is not justified.
- **IndexedDB/idb-keyval + OPFS + File System Access** with capability detection (`lib/storage/capabilities.ts`) and fallbacks.
- **Vitest** (vendor 323 / app 99 tests), **svelte-check** (0 errors, 1 pre-existing warning), **Vite build**.
- **Worker-based waveform generation** and the bounded `PeaksCache` (64 entries / 64 MB, M2.1).

## 2. Evaluate before adopting (per-feature, local-first)

| Technology | Why | Check before adoption | Fallback |
|---|---|---|---|
| ONNX Runtime Web | Local STT/image models for M4/M7 | WASM size, license, mobile memory | Keep AI proposal text-only; no local inference |
| MediaPipe Tasks Vision (already a root dep) | Segmentation, face/subject detection for M6/M7 | Browser support, model download consent | Existing photo background tool remains |
| Web Audio DSP (native) | EQ/comp/limiter/meters for M4 | Node-based graph design, CPU cost | Basic gain/pan only |
| ffmpeg.wasm (existing) | Codec conversion for unsupported inputs | Mirror availability, LGPL/GPL build flavor, 2 GB cap | Clear "convert required" message; no silent failure |
| WebGPU | Future acceleration only | Real browser support, shader rewrite cost | Stay on WebGL2 |

## 3. Optional external services (never mandatory)
- **Supabase** already powers optional auth/gallery and a fail-closed AI gateway (`jose`, JWT/JWKS, rate limits, model allowlist). Keep secrets **server-side**; no API keys in browser bundles.
- **Cloud AI adapters** (transcription/LLM/image) should sit behind a provider-neutral interface with explicit user consent, clear local/cloud indicators, and no automatic paid requests. Scene generation must remain disabled until a real provider is implemented (currently 501).
- **No new paid service** is required for M1–M6; defer M10 until separately approved.

## 4. Licensing review checklist (verify before shipping, not done in audit)
- `mediabunny`, `@ffmpeg/ffmpeg` (core build license matters), `pixi.js` / `pixi-filters`, `gl-transitions`, `gifenc`, `@mediapipe/tasks-vision`, `fabric`, `cropperjs`, Supabase JS, `immer`, `idb-keyval`, `tinykeys`, fonts/media assets. Record exact versions and licenses in a NOTICE file before distribution.
- FFmpeg core loaded from a configurable mirror → distribution and GPL/LGPL obligations depend on the chosen core build.

## 5. Security/privacy requirements for all new work
- Validate every imported file, `.braincut` JSON (existing strict shape parser), and any future archive extraction paths (no path traversal).
- Never log media bytes, prompts, bearer tokens, or provider credentials.
- Explicit consent before any upload; local-first default with visible processing indicators.
- Capability detection before using File System Access, OPFS, WebCodecs, Worker, OffscreenCanvas.
- Service-worker versioning must invalidate stale hashed chunks (historical stale-chunk issue).

## 6. API design principles for the suite
- Additive, versioned project schema; old `.braincut` v1 must open unchanged; migration tests required for any change.
- One shared media-reference abstraction with per-studio adapters; no duplicate relink implementations.
- Provider-neutral AI adapter interface (`transcribe`, `analyze`, `propose`, `enhance`) with model confidence and proposal/approval semantics.
- Export job abstraction carrying format/resolution/fps/codec/bitrate/audio settings; file-size numbers labeled "estimate".
- Device-capability profile exposed to UI so unsupported features are explained, not shown as broken buttons.
