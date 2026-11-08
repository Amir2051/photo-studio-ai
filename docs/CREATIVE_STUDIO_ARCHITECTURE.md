# RZ Creative Studio — Architecture and MVP Plan

Status: proposed foundation; no production code changed in this document.
Target: personal-use creative workstation with a browser edition and native macOS/Windows desktop editions.

## Product principles

- Manual editing first. AI is optional and never required to complete a workflow.
- Local-first: original media stays on the user's device unless the user explicitly exports or shares it.
- Non-destructive editing: edits are stored as project instructions; originals are preserved.
- One project format across web and desktop.
- Reuse mature media libraries; own the product UI, project model, interaction design, and workflow.
- No subscription, account system, cloud processing, telemetry, or paid API dependency in the first version.

## Existing foundation

The existing `photo-studio-ai` repository is a useful starting point, not a blank slate. Its current stack includes React 19, TypeScript, Vite, Zustand, Tailwind CSS 4, and IndexedDB-backed local storage. It already contains photo/editor state, filters, presets, and batch-edit concepts. Its current app identity and home screen are still photo-centric (SecureForge Lab), and the current package manifest does not yet include a video timeline or audio waveform engine.

Keep the current photo work intact. Extend it incrementally behind feature modules; do not rewrite the app or replace its storage model in one pass.

## Proposed monorepo structure

```text
apps/
  web/                 # Browser app (Vite/React)
  desktop/             # Tauri 2 shell; reuses the web UI
packages/
  app-shell/           # Navigation, command palette, dialogs, shared layout
  design-system/       # Tokens, controls, panels, timeline primitives
  project-core/        # Project schema, commands, undo/redo, autosave
  media-core/          # Asset registry, metadata, proxies, import/export contracts
  photo-engine/        # Canvas, layers, masks, crop, adjustments, filters
  video-engine/        # Tracks, clips, trims, transforms, transitions, render graph
  audio-engine/        # Waveforms, transport, gain, fades, routing, recording
  project-format/      # Versioned .rzstudio manifest and portable project archive
  platform-web/        # IndexedDB/OPFS, browser file access, WebCodecs adapters
  platform-desktop/    # Native filesystem, background jobs, FFmpeg process adapter
```

The repository can be migrated toward this structure gradually. Do not split the current Vite app into workspaces until the first vertical slice is stable.

## Runtime architecture

### Shared frontend
- React + TypeScript for the web and desktop UI.
- Zustand for UI/session state; keep durable project data in the project-core model rather than treating UI state as the project database.
- Workers for expensive browser-side image/audio/video tasks so the interface stays responsive.
- A command-based editing model: every edit is a typed command with apply/revert behavior. This supports undo/redo, autosave, and future collaboration without coupling the engines to UI components.

### Desktop
- Tauri 2 wraps the shared frontend for macOS and Windows.
- Rust commands provide safe file dialogs, native file access, background task orchestration, and a controlled FFmpeg process adapter.
- Never expose arbitrary shell execution to the frontend. Use a small allowlisted set of media operations.
- Keep the web frontend functional without Tauri APIs.

### Web
- Browser app uses IndexedDB for project metadata and OPFS where available for larger media files.
- Use WebCodecs when supported for low-level decode/encode; use a demux/mux library such as Mediabunny for containers. WebCodecs itself does not provide MP4/WebM demuxing or muxing.
- Provide clear capability checks and a fallback path. Browser codecs vary by browser and device.

### Project format
- A versioned JSON manifest stores canvas dimensions, frame rate, tracks, clip positions, trims, effects, layer trees, keyframes, audio routing, and references to assets.
- A portable `.rzstudio` project is a ZIP-like package containing the manifest and optionally copied media. Also support linked-media projects to avoid duplicating large source files.
- Every edit references source media; source files are never overwritten.
- Include schema migrations from version to version and autosave recovery.

## Engine choices and licensing notes

These are candidate dependencies, not a blanket legal clearance. Pin exact versions and retain each dependency's license and notices before distribution.

| Area | Candidate | License / terms | Planned use |
|---|---|---|---|
| Desktop shell | Tauri 2 | MIT or Apache-2.0 | Native macOS/Windows wrapper |
| Photo canvas/layers | Fabric.js | MIT | Selection, transforms, objects, layers, canvas interactions |
| Image processing | OpenCV 4.5+ | Apache-2.0 | Optional masks, geometry, image operations; add only when needed |
| Audio waveform | wavesurfer.js | BSD-3-Clause | Waveform display and region interaction |
| Browser audio | Web Audio API | Browser platform API | Playback, recording input, gain, fades, effects graph |
| Browser media encode/decode | WebCodecs | Browser platform API | Hardware-assisted codec access where supported |
| Browser container handling | Mediabunny | MPL-2.0 | MP4/WebM/WAV reading and writing in browser |
| Desktop media processing | FFmpeg | LGPL 2.1+ baseline; optional components/builds can trigger GPL | Native import, transcode, thumbnails, render/export |
| Local metadata DB | SQLite | Public domain | Desktop project index/settings if needed |

Important licensing controls:
- FFmpeg is not one uniform license in every build. Optional GPL components and codec libraries can change the obligations. Use a deliberately selected LGPL-compatible build for the first version, document enabled components, and include the required notices/source-offer or relinking materials where applicable. Do not bundle an arbitrary third-party FFmpeg binary.
- Mediabunny is MPL-2.0; if modified, comply with its file-level source disclosure requirements for covered files.
- Tauri, Fabric.js, OpenCV, wavesurfer.js and SQLite have comparatively permissive terms, but preserve required notices and review transitive dependencies.
- Do not depend on Remotion for the core editor. Its current license has special restrictions and paid licensing for some automated/editor/rendering-service use cases; it adds avoidable licensing complexity.
- Re-check the exact version and license of every dependency at implementation time. This is engineering guidance, not legal advice.

## First working version: v0.1

Goal: one end-to-end project that can import, edit, save, reopen, and export at least one photo, one video, and one audio file. Prioritize reliable basics over AI features or an enormous effects catalog.

### Shared foundation
- Dark, compact studio UI with a left project/media rail, central workspace, contextual inspector, and bottom timeline where relevant.
- Create/open/rename project.
- Import media by file picker and drag/drop.
- Media bin with thumbnails, duration, dimensions, audio metadata, and missing-file warnings.
- Autosave, undo/redo, and crash-recovery snapshot.
- Versioned project manifest and local-only storage.

### Photo v0.1
- Open JPEG, PNG, and WebP.
- Crop, rotate, resize, flip.
- Exposure, contrast, saturation, temperature, highlights/shadows.
- Basic layers: image, text, and shape; reorder, hide/show, opacity.
- Undo/redo and export PNG/JPEG.
- Preserve the original image; export a rendered copy.

### Video v0.1
- Import MP4 and MOV where supported.
- One video track and one audio track initially.
- Timeline ruler, playhead, zoom, clip move, trim, split, delete, and reorder.
- Preview playback and basic transform/crop.
- Add a title/text overlay and simple fade in/out.
- Export MP4 at 720p/1080p with a small, explicit set of frame-rate/quality presets.
- Desktop export uses the controlled FFmpeg adapter; browser export uses WebCodecs + Mediabunny when supported and reports unsupported formats clearly.

### Audio v0.1
- Import WAV, MP3, and M4A where browser/OS support permits.
- Waveform display, play/pause, seek, trim, split, gain, fade in/out, mute, and solo.
- Record microphone input with permission and input-device selection.
- Export WAV first; add MP3 export through a verified encoder path.
- No advanced noise-removal promise in v0.1; add denoise after the basic signal chain is stable.

### Explicitly out of scope for v0.1
- AI generative editing, cloud rendering, collaboration, accounts, asset marketplace, advanced keyframes, multicam, advanced color grading, 3D, plugin marketplace, mobile app, and subscription/billing.
- Do not add paid APIs or send user media to an AI provider by default.

## Build sequence and acceptance gates

1. **Foundation audit:** map current photo editor components, stores, storage schema, and tests; identify what can be reused. No broad rewrite.
2. **Project core:** add versioned project manifest, asset registry, command history, autosave, and import pipeline. Acceptance: create/save/reopen a project without losing edits.
3. **Photo vertical slice:** connect existing photo editor to project-core; add layers and non-destructive adjustments. Acceptance: edit and export a sample image; original remains unchanged.
4. **Audio vertical slice:** waveform, transport, trim/split/gain/fades, microphone recording. Acceptance: import, edit, save/reopen, export a WAV.
5. **Video vertical slice:** single video + audio track, trim/split, preview, title, export. Acceptance: produce a playable MP4 and reopen the editable project.
6. **Desktop shell:** package the stable shared app with Tauri; implement native file dialogs and FFmpeg worker. Acceptance: launch and complete all three sample workflows on macOS; then build/test Windows separately.
7. **Hardening:** large-file tests, memory limits, interrupted-export recovery, keyboard accessibility, dependency/license inventory, and backup/restore.

## Performance guardrails for the 2019 Intel MacBook Pro

- Treat 1080p as the initial target. Do not promise smooth 4K multicam or heavy GPU effects.
- Generate thumbnails and optional low-resolution proxies for video previews.
- Stream/chunk large files; do not load entire video files into JavaScript memory.
- Use workers/background tasks and release decoded frames/audio buffers promptly.
- Provide a quality/performance setting and show estimated export size/progress.
- Keep originals on disk and use temporary caches that can be cleared safely.

## Privacy and safety defaults

- Local-only by default; no sign-in or cloud upload.
- Microphone/camera permissions only when the user starts recording.
- Explicit confirmation before overwriting or deleting source files; default exports go to a new file.
- No secrets or API keys in frontend code.
- AI integrations, if ever added, are opt-in per action and explain whether media leaves the device.

## Definition of done for v0.1

A user can create a project, import one photo/video/audio asset, make basic edits in each module, undo/redo, close the app, reopen the project, and export PNG, WAV, and MP4 outputs without modifying the source media. The same project schema is understood by the web and desktop builds, with capability differences clearly shown.
