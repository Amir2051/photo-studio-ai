# Video Studio — Complete Architecture Audit (Phase 0)

**Date:** 2026-11-19 · **Mode:** read-only architecture audit (no application file, config, Git, or environment changes)

## 0. Baseline and freeze verification

- **Repository root:** `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`
- **Branch:** `feature/pro-editor-rebuild`
- **HEAD / baseline commit:** `a79d0357218533d205d52b1b2da9a6fa6f697599` (`feat(video-studio): finalize M2.0 export workflow`) — matches expected baseline
- **Expected freeze tag:** `video-studio-trial-ready-2026-11-19`
- **Freeze tag verification:** **FAILED** — no tags exist locally (`git tag -l` empty) or remotely (`git ls-remote --tags origin` → 0 refs). The trial branch `feature/pro-editor-rebuild` is not on the remote either (17 remote heads exist, none named that). The trial verdict, trial/README docs, project-open fallback fix, and M2.1 implementation are all **uncommitted** in the working tree (59 paths).
- **Working tree:** 59 paths — 39 intentionally retained stale bundle chunks under `public/video-studio/_app/immutable/`, the uncommitted M2.1 work, the trial fix (`vendor/braincut/src/lib/editor/project-actions.ts`), rebuilt `public/video-studio/` bundle, trial docs and `trial-evidence/` screenshots.
- **Git operations performed:** read-only only (`status`, `log`, `tag -l`, `branch -a`, `remote -v`, `ls-remote`). No commit, push, tag, branch, checkout, reset, clean, or stash.

**Consequence:** the required "complete freeze → verify remote → branch → push" sequence cannot be executed. Per the prompt's stop condition, this audit stops before any Git mutation or implementation; operator decision is required on how to establish the freeze (commit/push/tag the existing trial work) or on an alternative baseline.

## 1. Existing architecture diagram

```
Minu Studio (root, React + Vite + TypeScript, BrowserRouter)
├── /cull                   Culling workspace (sessions, ratings, ZIP/CSV export)
├── /audio/*                Audio/Podcast Studio (Web Audio, waveforms, WAV encode)
├── /gallery/:shareId       Optional Supabase client-gallery delivery
├── /privacy                Privacy page
├── Home.tsx                App shell / navigation (lazy-loaded pages)
├── src/editor/*            Photo editor panels (Layers, Masking, Retouch,
│                           Adjustments, Background, Batch, Delivery, …)
└── components/VideoStudioFrame.tsx
        └── <iframe src="/video-studio/">  → static build of vendor/braincut
                brainCUT (SvelteKit 3 / Svelte 5, adapter-static)
                ├── routes/: /, /editor, /privacy, /terms, /imprint
                ├── lib/project      .braincut v1 model, ops.ts, serialize.ts,
                │                    persistence.ts (IndexedDB autosave/recents)
                ├── lib/editor       timeline-interactions.ts, project-actions.ts,
                │                    clipboard, snapping, drag, commands, shortcuts
                ├── lib/engine       compositor (PixiJS/WebGL2), media-reader,
                │                    media-cache, effects, transitions, text
                ├── lib/media        import, sources (handles/IDB), probe,
                │                    thumbnails, waveform (+worker), proxy,
                │                    transcode (ffmpeg.wasm), storage capabilities
                ├── lib/export       render.ts, presets.ts, avcc.ts, download.ts
                ├── lib/captions     SRT/VTT parse + caption-clip import
                ├── lib/agent        MIA bridge, proposal engine, 50+KB tool set
                ├── lib/storage      capability detection, storage persistence
                └── lib/ui           48 Svelte components (timeline, monitors,
                                     panels, dialogs, multicam, AI review)
```

Two independent app shells share only the browser origin and a `postMessage`-style iframe boundary. There is **no shared project model, media library, undo stack, or rendering service** across photo / video / audio today.

## 2. Technology inventory (from package.json, read-only)

| Area | Root (photo/audio shell) | Vendor braincut (video studio) |
|---|---|---|
| UI | React, react-router-dom, Tailwind 4, lucide-react | Svelte 5, SvelteKit 3, Tailwind 4 |
| Graphics | PixiJS, fabric.js, cropper.js, @mediapipe/tasks-vision | PixiJS + pixi-filters, gl-transitions, WebGL2 shaders |
| Media | Web Audio API, canvas | mediabunny (demux/decode/encode), WebCodecs, @ffmpeg/ffmpeg + @ffmpeg/util, gifenc |
| Storage | IndexedDB (photo), IndexedDB (`every-frame-first-audio`), Supabase JS (opt-in) | idb-keyval (project/recents/peaks/sources), OPFS, File System Access API |
| State | React state + module stores | Svelte stores + immer history (200-step undo) |
| Tests | Vitest + jsdom + @testing-library (19 files / 99 tests) | Vitest (31 files / 323 tests) |
| PWA | `public/manifest.json`, `public/sw.js` (`minu-studio-shell-v2`) | `public/video-studio/service-worker.js` (`braincut-app-*`) |
| Optional cloud | Supabase Auth/Storage, server AI gateway (`jose`, `ws`) | loopback MCP bridge to local claude code server |

## 3. Functionality inventory and classification

### Implemented and real (not mocks)
- **Video import:** native picker, folder picker, drag-and-drop, relink, grant-all, progress/cancel, unsupported-file rejection, HTML-input fallbacks (M1.8/M2.0).
- **Timeline:** 6 tracks default (V1–V3, A1–A3), add/move/trim/split/ripple/delete, linked A/V, snapping, zoom, scroll, markers, in/out, keyframes, 67 effects, 7 transitions, 200-step undo — all mutate the real `Project` model via `ops.ts`.
- **Preview:** PixiJS/WebGL2 compositor with frame-accurate seek, bounded frame caches (FRAME_CACHE 4, MAX_SCRUBS, 512 MB image bound), preview quality 1/8–Full, multicam editor, recording.
- **Audio:** worker-generated min/max waveform peaks, bounded LRU `PeaksCache` (64 entries/64 MB, M2.1), audio clip handling, volume/pan effects.
- **Project persistence:** `.braincut` v1 JSON (references only), IndexedDB autosave/recents, save/download fallback, open fallback (fixed this milestone), missing-media relink.
- **Export:** mediabunny + WebCodecs H.264/AAC MP4 plus WebM/MOV/MKV/GIF/WAV presets, in-memory <400 MB / OPFS scratch otherwise, picker→download fallback, cancel/progress, verified playable output (trial report).
- **Captions:** SRT/VTT parse → timed title clips on a caption track.
- **AI-adjacent:** proposal engine with preview/approve flow and ~50 KB of read/write tools; MIA bridge to a **loopback-only** MCP server; capability detection module; opt-in memory profiler.
- **Photo studio:** layers, masking, retouch, adjustments, background removal (MediaPipe), batch and delivery workspaces, non-destructive project documents.
- **Podcast studio:** Web Audio multitrack, waveform canvas, mic recording, WAV encoding, remote guest signaling server.

### Partial / incomplete
- **ffmpeg.wasm conversion:** real, but requires a configured ffmpeg mirror (`preferences.ffmpegMirror`) and is capped at 2 GB input; no bundled core verified in-repo.
- **Proxy workflow:** real generation, but `useProxies` defaults off; no auto-proxy/regenerate sweep.
- **Cloud AI:** server gateway exists and is fail-closed (JWT/JWKS, rate limits, model allowlist); the active editor does **not** expose a connected cloud AI chat; scene-generation endpoint returns 501.
- **AI analysis:** `lib/agent/visual-analysis.ts` is a 275-byte stub — no real scene/face/subject analysis in the video studio.
- **Long-form performance:** bounded caches and virtualization are implemented and unit-tested, but only an 8-second fixture was browser-tested; 10 min/30 min/multi-hour and 4K remain unverified.
- **Export size estimate:** content-blind bits-per-pixel heuristic, not an estimate from actual encoder settings.
- **Mobile/PWA:** manifest and service workers exist; touch/gesture timeline editing and mobile export were not found as implemented features.

### Missing / placeholder (do not mark complete)
- Professional color scopes (histogram/waveform/RGB parade/vectorscope), LUT import, shot matching.
- Motion tracking, stabilization, slip/slide/roll edits, nested sequences (not located), magnetic track grouping.
- Podcast studio EQ/compressor/limiter/noise reduction/voice isolation/ducking/loudness meters/beat detection (not found).
- Local transcription / speech recognition / ONNX Runtime Web (no dependency present).
- Social reframing/subject-aware crop, export queue with retry, portable project packages/archives.
- Shared cross-studio media library, project manager, unified undo; cloud backup/collaboration (explicitly future).

## 4. Reusable components

| Asset | Reuse for |
|---|---|
| `lib/project/{types,ops,serialize,store,history}.ts` | Shared project model foundation (with versioned extension) |
| `lib/editor/timeline-interactions.ts` + `TrackLane.svelte`/`ClipView.svelte` | Timeline foundation M1 |
| `lib/engine/{compositor,media-reader,media-cache}.ts` | Rendering/performance foundation M2/M5 |
| `lib/media/{import,sources,probe,thumbnails,waveform,proxy,capabilities}.ts` | Shared ingestion/media library M2 |
| `lib/export/{render,presets,download}.ts` | Export center M8 |
| `lib/captions/*` + `lib/agent/{proposals,proposal-preview,tools}.ts` | AI assistant M7 |
| `src/pages/AudioStudio.tsx` + `src/editor/*` | Podcast M4 / Photo M6 foundations |
| `capabilities.ts`, `persist.ts` | Device-aware PWA M9 |

## 5. Architecture weaknesses / risks

1. **Three separate applications** (React photo/audio, Svelte video, Node gateways) with no shared project/media/undo layer — the central risk to the "suite" vision.
2. **Iframe boundary** isolates the editor; styling, routing, deep links, and cross-studio drag/drop need an explicit contract.
3. **Divergent persistence**: multiple IndexedDB databases/stores and file-handle semantics; no unified storage abstraction or quota reporting across studios.
4. **`.braincut` v1 has no migration framework** — any format change needs versioning, migration tests, and backward compatibility.
5. **FFmpeg mirror dependency and 2 GB cap**; no verified bundled core.
6. **Performance claims unverified beyond 8 s**; long-form memory behavior unmeasured.
7. **Mobile**: no touch timeline/gesture layer; File System Access/WebCodecs/OPFS support varies; background rendering and unrestricted filesystem access are impossible on many mobile browsers.
8. **AI**: local inference dependencies absent; cloud path is optional but currently not wired into the editor; risk of accidental paid calls if adapters are added without consent gates.
9. **Service-worker cache invalidation** requires careful versioning (historical stale-chunk issue).
10. **Licensing/security**: dependency licenses (notably ffmpeg.wasm build flavor, mediabunny, gl-transitions) must be verified before distribution; imported media and `.braincut` files need validation and archive path checks.

## 6. Audit verdict

**`ARCHITECTURE AUDIT COMPLETE — BLOCKERS REQUIRE OPERATOR DECISION`**

The codebase is a solid foundation for phased implementation, but the required freeze state (`video-studio-trial-ready-2026-11-19` tag and pushed trial branch) does not exist locally or remotely, while all trial work is uncommitted. That is a hard stop under the prompt's release-protection rules. No implementation, Git mutation, or branch creation was performed. See `VIDEO_STUDIO_COMPLETE_PRODUCT_GAP_ANALYSIS.md` and `VIDEO_STUDIO_COMPLETE_IMPLEMENTATION_ROADMAP.md` for the safe paths forward.
