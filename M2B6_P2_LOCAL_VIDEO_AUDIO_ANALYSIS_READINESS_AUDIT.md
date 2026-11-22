# M2B-6 P2 — Local Video & Audio Analysis Readiness Audit

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Audit type:** READ-ONLY feasibility and implementation-readiness audit (no P2 implementation performed)
**Final status:** `P2_PARTIALLY_READY_WITH_TEST_INFRASTRUCTURE_GAPS`

---

## 1. Executive summary

The repository contains a substantial **local-first non-linear editing substrate**, but it is split across two applications and contains almost none of the *analysis* features P2 is meant to add.

- **Architecture:** The React app has no video engine. `src/components/VideoStudioFrame.tsx:8-56` is an iframe host (`src="/video-studio/"`). The real editor is the vendored SvelteKit app `vendor/braincut/src/`, shipped as generated static output in `public/video-studio/` by `scripts/build-video-studio.mjs`. Generated JS under `public/video-studio/_app/immutable/**` is build output, not source, and is not credited as implementation evidence.
- **Video foundation is real:** import with `AbortController` cancellation (`vendor/braincut/src/lib/media/import.ts:283-289`), full timeline/clip model (`lib/project/types.ts:17-171`), WebCodecs decode via `mediabunny` with frame seeking and explicit disposal (`lib/engine/media-reader.ts:132-228`), metadata probe (`lib/media/probe.ts:118,194,228`), filmstrip/contact-sheet extraction (`lib/media/thumbnails.ts:95,193,215`), SRT/VTT caption import (`lib/captions/parse.ts:48`, `import-captions.ts:61`), and WebCodecs export with cancellation, OPFS scratch and 1.5 GB/400 MB guards (`lib/export/render.ts:42-52,178-181,238-293`).
- **Audio foundation is real:** Web Audio engine and meters (`lib/engine/audio-engine.ts:82-110`), offline render with `AbortSignal` (`lib/engine/audio-render.ts:15-19,91-100`), cancellable worker-based waveform peaks with LRU/64 MiB cache (`lib/media/waveform.ts:27-76,128-177`, `lib/media/workers/waveform.worker.ts:21-92`), real DSP effects (`lib/engine/effects/audio.ts:111-273`), and React-side WAV export (`src/pages/AudioStudio.tsx:83-115,310-347`).
- **The P2 analysis gaps are genuine absences:** scene-change detection, object tracking, person tracking, video background removal, silence detection, VAD, STT, diarization, automatic segmentation, A/V sync analysis and automatic loudness normalization are not implemented. MediaPipe in the React app is image-only (`src/lib/segmentation.ts:37`, `src/lib/portraitRetouch.ts:18`, both `runningMode: 'IMAGE'`). Server-side `videoUnderstanding`, `sceneAnalysis`, `audioDialogue`, `captionTranscription` and `transcription` are declared but uniformly `false` in `server/ai/model-registry.mjs:17-30` and therefore fail closed in `server/ai/router.mjs:41-72` — consistent with the live gate remaining `false`.
- **Privacy posture is strong:** media bytes stay on device; the only network paths are optional and gated (user-configured ffmpeg.wasm core download, explicit "approve & send selected frames", metadata-only MIA chat). Consent, single-use grants, ZDR-only policy, no-fallback, budget/expiry and ledger are enforced in `server/ai/*`. No silent uploads or remote fallbacks were found.
- **Test infrastructure is the binding constraint:** 27 app test files and 38 vendor test files exist, but no app test exercises video/audio behavior and vendor tests are pure-logic with mocked boundaries. There are **zero audio/video fixture files**, and **no Playwright/Puppeteer/happy-dom** — only jsdom and node environments. Any feature requiring real decode, canvas capture, `MediaRecorder`, `AudioContext` or WASM execution cannot be validated end-to-end today.

**Recommendation:** proceed only with *bounded* P2 work: local, pure-logic analysis over already-exposed metadata and peak data, unit-tested with existing Vitest infrastructure. Defer frame-decode-dependent features until browser integration tooling and synthetic fixtures are approved; defer speech/speaker analysis until a model/dependency and ZDR review are approved. Keep all live gates `false` and add no cloud processing.

---

## 2. Verified repository baseline and preservation check

| Item | Expected | Observed | Result |
|---|---|---|---|
| Repository root | `…\photo-studio-ai` | `C:/Users/yayam/OneDrive/Documents/Default Project/photo-studio-ai` | VERIFIED |
| Branch | `feature/pro-editor-professional-suite` | identical | VERIFIED |
| HEAD | `1ecce92…` | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | VERIFIED |
| Staged files | 0 (P1 end state) | 0 | VERIFIED |
| Modified tracked files | 14 | 14 | VERIFIED |
| Untracked files | 107 | 107 | VERIFIED |
| Frozen tag | `cdb1238e…` | `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73` | VERIFIED |
| Original branch | `cdb1238e…` | `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73` | VERIFIED |
| `main` | `2c451768…` | `2c4517684b5f620368ed435f583e8f2a874f4d76` | VERIFIED |
| Persistent live gate | `false` | `liveExecutionEnabled: false` in `server/ai/model-registry.mjs` | VERIFIED |

Prior P1 report and M2B-6 audit are present and were read. No baseline discrepancy was found. All operations were file reads and read-only shell/grep commands; no builds, tests, installs, network calls, credential reads, or private-media inspection occurred.

---

## 3. Existing video capability inventory

Location legend: **R** = `src/` (React app), **V** = `vendor/braincut/src/` (vendored SvelteKit editor), **B** = built output `public/video-studio/` (generated; not credited as source).

| Capability | Classification | Evidence | Notes |
|---|---|---|---|
| Video import / playback | `IMPLEMENTED_BUT_UNVERIFIED` | V `lib/media/import.ts:10-52,133,220,291,348-403` | File picker, drag-drop, folder handles; real cancel at `:283-289`. No dedicated test. |
| Timeline playback | `IMPLEMENTED_AND_VERIFIED` | V `lib/engine/player.ts:59,126-162,276,360` + `player.test.ts` | Audio-clock driven via compositor canvas; no `<video>` timeline playback. |
| `<video>` element / object URLs | `PARTIALLY_IMPLEMENTED` | V `lib/ui/LiveCameraCapture.svelte:219`, `MulticamEditor.svelte:49-50,160-161`, `media/probe.ts:159-166` | Only live camera/multicam preview and SVG sizing; `revokeObjectURL` cleanup present. |
| Timeline / clip data model | `IMPLEMENTED_AND_VERIFIED` | V `lib/project/types.ts:17-171` + `ops.test.ts`, `serialize.test.ts`, `store.test.ts` | Full NLE model: tracks, clips, speed, effects, keyframes, transitions, markers. |
| Frame extraction / seeking | `IMPLEMENTED_BUT_UNVERIFIED` | V `lib/engine/media-reader.ts:132,138,173,228,315-316` | WebCodecs `VideoSampleSink`, read-ahead, keyframe restart, explicit `close()`/`dispose()`. |
| `HTMLVideoElement.currentTime`/`seeked`/`requestVideoFrameCallback` | `NOT_IMPLEMENTED` | Searched R+V; only live multicam sync hit | Timeline seeking is WebCodecs time-based. |
| Video metadata & duration | `IMPLEMENTED_AND_VERIFIED` | V `lib/media/probe.ts:118,170,193-195,220-229,248` + `probe.test.ts` | Codec, rotation, alpha, fps, duration, channels, sampleRate. No bitrate probe. |
| Scene-change detection | `NOT_IMPLEMENTED` | Searched R+V for histogram/frame-diff/scene-cut; only scopes display `lib/ui/Scopes.svelte:2,16,84,118` and disabled task label `server/ai/router.mjs:12` | No algorithm. |
| Keyframe extraction / contact sheets | `PARTIALLY_IMPLEMENTED` | V `lib/media/thumbnails.ts:95,193,215`; `lib/ui/VisualFrameReview.svelte:60-104,195-199` | Sampled-time filmstrips work; note `lib/project/keyframes.ts` is animation keyframes, not video I-frames. |
| Object tracking | `NOT_IMPLEMENTED` | Searched R+V for tracking IDs, bounding boxes, optical flow, mean shift | Absent. |
| Person detection / tracking (video) | `NOT_IMPLEMENTED` | R `lib/portraitRetouch.ts:11-18`, `lib/segmentation.ts:30-39` are `IMAGE` mode only | No `detectForVideo`/`segmentForVideo` or temporal tracking. |
| Video background removal | `NOT_IMPLEMENTED` | R `lib/segmentation.ts:54-56` takes `HTMLImageElement`; sole caller `src/pages/Home.tsx:1949` is a still image | Image-only implementation exists; no video path. |
| Subtitles / captions | `IMPLEMENTED_AND_VERIFIED` | V `lib/captions/parse.ts:1,48`, `import-captions.ts:35-71` + `parse.test.ts`, `import-captions.test.ts` | Real SRT/VTT → caption track cues. No auto-transcription (capability false). |
| Video export / rendering | `IMPLEMENTED_BUT_UNVERIFIED` | V `lib/export/render.ts:119,183,193,238-293`; `presets.ts:15-38` | WebCodecs encode + mux, cancel, OPFS scratch. Render itself untested. |
| FFmpeg / browser-native processing | `IMPLEMENTED_BUT_UNVERIFIED` (disabled by default) | V `lib/media/transcode.ts:15-47,63-126` (`@ffmpeg/ffmpeg` ^0.12.15); `lib/export/render.ts:193`; `lib/ui/LiveCameraCapture.svelte:157-202` | ffmpeg core fetched at runtime from a user-configured mirror; not vendored. WebCodecs + MediaRecorder also used. |

---

## 4. Existing audio capability inventory

| Capability | Classification | Evidence | Notes |
|---|---|---|---|
| Web Audio API primitives | `IMPLEMENTED_AND_VERIFIED` | R `src/pages/AudioStudio.tsx:66-70,310-337`; V `lib/engine/audio-engine.ts:82-110`, `audio-render.ts:91-100`, `effects/audio.ts:49-85`; `audio-math.test.ts` | Genuine DSP. No `AudioWorklet`. |
| Audio playback | `IMPLEMENTED_BUT_UNVERIFIED` | R `src/pages/AudioStudio.tsx:285-304,436-442` | Real `<audio>` element; no automated test. |
| Audio recording | `IMPLEMENTED_BUT_UNVERIFIED` | V `lib/ui/MicrophoneRecorder.svelte:59-139`, `media/recording.ts:1-17` + `recording.test.ts` | `getUserMedia` + `MediaRecorder` → timeline. Browser processing explicitly disabled (raw capture). |
| Waveform generation | `IMPLEMENTED_AND_VERIFIED` | R `src/pages/AudioStudio.tsx:128-176`; V `lib/media/waveform.ts:27-76,99-177`, `workers/waveform.worker.ts:21-92`; `waveform.test.ts` | Real min/max peaks, LRU + 64 MiB budget, cancellable. No wavesurfer dependency. |
| Audio decode / encode | `IMPLEMENTED_AND_VERIFIED` | R `AudioStudio.tsx:137,254,322`; V `lib/engine/media-reader.ts:332-334,521`; `transcode.ts:25-40`; `presets.test.ts` | Browser + mediabunny decode; ffmpeg only for unsupported codecs. |
| WAV export | `IMPLEMENTED_BUT_UNVERIFIED` | R `AudioStudio.tsx:83-115,117-126,306-347` | Correct-looking RIFF/PCM writer; no dedicated test. |
| Noise reduction | `PARTIALLY_IMPLEMENTED` | V `lib/engine/effects/audio.ts:122-162` (BiquadFilter HP/LP/BP/EQ, compressor) | Generic tone/dynamics only — no denoiser, spectral gate or voice isolation. |
| Silence detection | `NOT_IMPLEMENTED` | Searched all sources; only `audio-math.ts:7` `SILENCE_DB = -60` floor and silent waveform buckets | No detector or region finder. M2B-6 audit lists it as planned only. |
| Voice activity detection | `NOT_IMPLEMENTED` | Searched VAD/speech-detection; `audio-engine.ts:102-110` analyser feeds meters only | Absent. |
| Speech-to-text | `STUB_ONLY` | `server/ai/router.mjs:13-14` declares tasks; `model-registry.mjs:17-30,32-101` sets all speech capabilities `false`; `MIAChatPanel.svelte:150` states unavailable | Fail-closed declarative stubs. No Web Speech API, Whisper or provider SDK. |
| Speaker diarization | `NOT_IMPLEMENTED` | No diarization code; planning doc says "Defer"; `MIAChatPanel.svelte:150` states unavailable | Absent. |
| Audio segmentation | `NOT_IMPLEMENTED` | R manual trim only `AudioStudio.tsx:414-417`; V clip split at `ClipView.svelte:311-313` | No automatic silence/transcript-driven segmentation. |
| Volume normalization | `PARTIALLY_IMPLEMENTED` | R `AudioStudio.tsx:298,329,416`; V `audio-graph.ts:31-36,66-86`, `effects/audio.ts:112-120,145-162` | Gain/dB and compression; no automatic LUFS/peak normalization. |
| Audio cleanup / enhancement | `PARTIALLY_IMPLEMENTED` | V `lib/engine/effects/audio.ts:111-273` (gain, EQ, filters, compressor, reverb, delay, stereo-width, mute) | Real effects in preview and offline render; no denoise/de-esser/limiter. |
| Podcast editing & A/V sync | `PARTIALLY_IMPLEMENTED` | V `audio-engine.ts:125-140` (AudioContext clock transport), `ui/AudioMixer.svelte:141-203`, `transitions/registry.ts:458-486` (crossfade), `export/render.ts:238-285` (shared sequence time) | Real mixing/crossfade/export sync; no ducking, automatic sync analysis, beat detection or loudness metering. |

**Placeholder check:** UI labels such as "MIA Video Intelligence", "scene_analysis" and "caption_transcription" are **not** working features — their registry capabilities are `false` and the router fails closed (`server/ai/router.mjs:41-72`). Conversely, the earlier `VIDEO_STUDIO_COMPLETE_ARCHITECTURE_AUDIT.md:90` claim that EQ/compressor/noise reduction etc. are "not found" is inaccurate for the vendor source; those effects are implemented in `lib/engine/effects/audio.ts`.

---

## 5. Local-processing feasibility matrix

Priority order from the task. "Logic-testable" = unit-testable with current Vitest + node/jsdom (mocked boundaries).

| # | Candidate feature | Existing substrate | New code required | Dependencies | Local-only? | Testability now | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Video metadata / technical analysis | `probe.ts:118,194,228` already emits duration, fps, codec, resolution, rotation, alpha; `probe.test.ts` | Optional analysis projection/UI over `ProbeResult` | Existing `mediabunny` | Yes — no upload | Logic-testable from `ProbeResult`; end-to-end decode needs a real browser | `FEASIBLE_NOW_BOUNDED` |
| 2 | Waveform / audio-level analysis | `waveform.ts` peaks + LRU cache + worker; `audio-math.ts` dB/gain; `waveform.test.ts`, `audio-math.test.ts` | RMS/peak statistics and time-bucket aggregation over existing peaks | Existing | Yes | Logic-testable; real `AudioBuffer`/worker path needs browser | `FEASIBLE_NOW_BOUNDED` |
| 3 | Silence / quiet-section detection | Peaks provide per-bucket amplitude; `SILENCE_DB = -60` floor exists | Energy threshold + region grouping over peaks (and a React-side path) | Existing | Yes | Logic-testable; real-audio validation needs fixtures + browser | `FEASIBLE_NOW_BOUNDED` |
| 4 | Scene-change detection | Decoded frames via `media-reader.ts`; scopes display only | Histogram/frame-difference algorithm over decoded frames | No new package strictly required | Yes if kept local | Needs real decode → browser integration unavailable | `NEEDS_BROWSER_INTEGRATION` |
| 5 | Keyframe extraction / contact sheets | Already implemented: `thumbnails.ts:95,193,215`, `VisualFrameReview.svelte:60-104` | Wire existing filmstrip into analysis UI; no new algorithm needed | Existing | Yes (cloud frame upload is separate, explicitly gated) | Logic parts testable; canvas extraction needs browser | `FEASIBLE_NOW_BOUNDED` / browser for E2E |
| 6 | A/V sync analysis | `audio-engine.ts:125-140`, `export/render.ts:238-285` share sequence time | New analysis comparing audio energy events to frame/scene boundaries | Existing | Yes | Needs real media decode + fixtures → not currently possible | `NEEDS_BROWSER_INTEGRATION` |
| 7 | Local speech / speaker analysis | None; capabilities false in registry; no model or SDK | Whisper-class or VAD model + adapter, ZDR/privacy review | **New model/package required** | Must be verified; remote inference is out of scope | Not testable without model + browser | `REQUIRES_APPROVAL` |

Cross-cutting: no ffmpeg core is vendored — the transcode path (`transcode.ts:25-39`) downloads core JS/WASM from a configurable mirror at runtime, so any ffmpeg-dependent P2 feature would introduce a network dependency despite media staying local. That requires separate approval.

---

## 6. Privacy and resource assessment

**Common guarantees for all proposed features:** processing stays on-device (frames decoded with WebCodecs, composited on canvas, peaks computed in a worker; audio decoded in-browser). Media bytes are not uploaded by any analysis path. Result data is stored locally (IndexedDB/OPFS/in-memory caches). Explicit gates exist for the only optional off-device paths: ffmpeg core download (`transcode.ts:15-39`), selected still-frame upload with an "Approve & send" action (`VisualFrameReview.svelte:125,206-221`), and metadata-only MIA chat (`MIAChatPanel.svelte:14,27,99`). Server controls enforce ZDR-only policy (`central-gateway.mjs:12-17`), fail-closed policy mismatch (`:38-47`), consent (`consent.mjs:11-65`), single-use grants with TTL and atomic consume (`single-use-auth.mjs:34-35,72-160`), no-fallback (`router.mjs:67`), budget ceiling (`budget.mjs:1-14`), and secret-field rejection in the ledger (`ledger.mjs:5,12-15`). The live gate remains `false` (`model-registry.mjs:58-59,79,99`).

| Proposed feature | On-device | Media leaves machine | Memory / CPU | Interruptible | Large-file safety | Temp cleanup | Result storage |
|---|---|---|---|---|---|---|---|
| Metadata analysis | Yes | No | Negligible (uses existing probe) | N/A (fast) | Inherits probe; no full decode for header data | N/A | In-memory / local |
| Waveform & level analysis | Yes | No | Worker + bounded LRU (64 MiB) | Yes — `computePeaks({signal})`, worker cancel | Vendor streams; React `AudioStudio` decodes whole file with 250 MB cap → risk near cap | `forgetPeaks()`, `sample.close()`, `input.dispose()` | Local IndexedDB + cache |
| Silence detection | Yes | No | Low if derived from cached peaks | Yes (same signal path) | Same as waveform | Same | Local |
| Scene-change detection | Yes | No | Higher — one histogram/diff per decoded frame; needs frame budgeting | No existing cancellation in analysis; must be added | Must bound decoded frame count; `media-reader` read-ahead + disposal helps | `VideoFrame.close()` must be enforced | Local |
| Keyframe / contact sheet | Yes | No | Moderate; LRU bitmap cache with `close()` | Partially (existing thumbnail paths) | Sampled times, not all frames | `ImageBitmap.close()` | Local |
| A/V sync analysis | Yes | No | Moderate (peaks + sparse frames) | Must be added | Same bounds as waveform + frames | Same | Local |
| Speech / speaker | Unknown pending model | Must ensure remote inference is out of scope | High for local models | Model-dependent | Model-dependent | Model-dependent | Must be local |

**No silent uploads, external fallbacks or remote processing were found in any media-analysis path.**

---

## 7. Test coverage and infrastructure gaps

- **Inventory:** 27 app test files (`tests/`) and 38 vendor test files (37 passing + 1 skipped — `vendor/braincut/src/lib/suite/checkpoint.perf.test.ts`, gated by `M2B_BENCH`). Baseline from P1: app 27 files/204 passing, vendor 360 passing +1 skipped, combined 564.
- **No app-level video/audio behavior tests.** App tests mentioning "video"/"audio" are gating/rejection assertions (`m2b2-controls.test.ts:58-59,82-95,200`), UI option selection (`m2b3-ui.test.tsx:53,60`), ffmpeg cache-name strings (`serviceWorkerCacheIsolation.test.ts`), or capability metadata (`m2b1-foundation.test.ts:125`).
- **Vendor has genuine pure-logic coverage:** `waveform.test.ts`, `recording.test.ts`, `probe.test.ts`, `audio-math.test.ts`, `captions/parse.test.ts`, `import-captions.test.ts`, `export/avcc.test.ts`, `player.test.ts`, `timeline-interactions.test.ts`, `project/ops.test.ts`. All use mocked boundaries/node environment; none exercise real decoding, `MediaRecorder`, `AudioContext`, WASM or ffmpeg.
- **Zero media fixtures:** no `.mp4/.webm/.wav/.mp3/.mov/.m4a/.ogg/.mkv/.aac/.flac` files anywhere (excluding `node_modules`, `dist`, `.git`). No designated audio/video test fixture exists.
- **Browser-runtime limits:** no Playwright, Puppeteer or happy-dom in either manifest or `node_modules`. App uses jsdom only in three files via `// @vitest-environment jsdom`; vendor config sets `environment: 'node'` (`vendor/braincut/vite.config.ts:38-41`). No `vitest.config.*` exists. Real browser/WASM/canvas/video-decode integration testing is **not currently possible**.
- **Cancellation test gaps:** vendor has `AbortSignal` in waveform, audio render, export, import and transcode; the React local AI paths have none (P1 §8). Any new long-running analysis must define and test its own interruption behavior.
- **Conclusion:** pure-logic tests for metadata projection, peak/statistics and silence grouping are feasible now. Any test requiring real media decoding needs browser tooling and synthetic fixtures — both require separate approval.

---

## 8. Prioritized implementation roadmap

### Tier 1 — feasible with existing infrastructure (no new packages, no new models)
1. **Local media technical-analysis panel** (metadata: duration, resolution, fps, codec, rotation, channels, sample rate)
   - *Outcome:* users inspect technical properties of imported media locally.
   - *Existing code:* `vendor/braincut/src/lib/media/probe.ts`, `types.ts`, `sources.ts`, `lib/ui/Inspector`-style panels.
   - *New code:* a read-only analysis view and projection helpers over `ProbeResult`.
   - *Dependencies:* existing `mediabunny` sufficient.
   - *Privacy:* fully local; no upload.
   - *Tests:* Vitest logic tests over `ProbeResult` fixtures; mocked boundaries.
   - *Risk/complexity:* low.
   - *Acceptance:* renders correct values for sample `ProbeResult`; no fetch call; no production source changed outside authorized scope.
2. **Audio level / waveform statistics**
   - *Outcome:* RMS/peak overview and loudness distribution from existing peaks.
   - *Existing code:* `lib/media/waveform.ts`, `workers/waveform.worker.ts`, `lib/engine/audio-math.ts`.
   - *New code:* statistics helper over peak buckets.
   - *Dependencies:* none.
   - *Privacy:* local; cached results stay local.
   - *Tests:* unit tests for statistics with synthetic peak arrays (no media files).
   - *Risk:* low–medium (React path decodes whole file; must not increase peak memory).
   - *Acceptance:* deterministic stats; cancellation honored; no network.
3. **Silence / quiet-section detection**
   - *Outcome:* list of quiet regions usable for manual cleanup.
   - *Existing code:* peak buckets + `SILENCE_DB` floor.
   - *New code:* thresholding + region grouping; detect-only (no destructive edit).
   - *Dependencies:* none.
   - *Privacy:* local.
   - *Tests:* synthetic peak sequences covering empty, all-silent, all-loud, boundary thresholds and fragmentation.
   - *Risk:* medium (threshold calibration).
   - *Acceptance:* correct regions on synthetic data; no false "success" on empty input; no auto-edit.
4. **Contact-sheet wiring into analysis UI**
   - *Outcome:* reuse existing sampled filmstrips for visual review.
   - *Existing code:* `thumbnails.ts:95,193,215`, `VisualFrameReview.svelte:60-104,195-199`.
   - *New code:* UI integration only; keep cloud frame upload gated and disabled by default.
   - *Dependencies:* none.
   - *Privacy:* local unless the existing explicit approval path is used.
   - *Tests:* component logic with mocked frame data; real extraction requires browser (deferred).
   - *Risk:* low–medium.

### Tier 2 — requires browser integration tooling and/or fixtures (separate approval)
5. **Scene-change detection** — new histogram/frame-diff logic over decoded frames; needs real-browser decode tests, synthetic video fixtures, frame-budget and cancellation design. No new package strictly required, but test tooling approval required. *Risk: high.*
6. **A/V sync analysis** — new event-correlation logic; needs real media with known offsets and browser decode. *Risk: high.*
7. **End-to-end validation of Tier 1 features** — requires Playwright/Puppeteer, synthetic media fixtures, and a browser test harness. *Risk: medium.*

### Tier 3 — requires model/dependency and privacy approval (separate authorization)
8. **Local speech / speaker analysis** — needs an offline-capable model (e.g. Whisper-class) with model download, ZDR/privacy review, memory budget, and new tests. Cloud inference is explicitly out of scope. *Risk: high.*
9. **ffmpeg-dependent analysis** — would require approving the runtime WASM core download (currently from a configurable mirror) or vendoring the core; conflicts with strict offline claims unless resolved. *Risk: high.*

Explicitly out of scope for all tiers: any remote AI processing, enabling the live gate, changing consent/approval/ZDR/budget controls, adding cloud fallbacks, or automatic destructive edits.

---

## 9. Dependency / model requirements requiring separate approval

| Item | Why needed | Current state | Approval needed |
|---|---|---|---|
| Playwright or Puppeteer (+ browser binaries) | Real decode/canvas/MediaRecorder/AudioContext/WASM integration tests | Not installed in either manifest or `node_modules` | Yes — new dev dependency + browser download |
| Synthetic audio/video fixtures | Deterministic E2E and threshold calibration | Zero media fixtures in repo | Yes — test-only fixture creation/download |
| `@ffmpeg/core` (WASM core) | Any ffmpeg.wasm-backed analysis | Not vendored; downloaded at runtime from a mirror (`transcode.ts:25-39`) | Yes — network/vendoring + offline-policy review |
| Offline speech/VAD model + runtime | Speech-to-text, speaker analysis | No model, no SDK, capabilities `false` | Yes — model download, ZDR/privacy review, memory budget |
| Browser-automation config (`vitest.config.*` or Playwright config) | Needed to run browser tests at all | No vitest config; node/jsdom only | Yes — test infrastructure change |

No dependency, package manifest, lockfile, model or binary was added, changed or downloaded during this audit.

---

## 10. Explicit blockers and unresolved questions

**Blockers**
- `BLOCKED` — Real-browser runtime testing: no Playwright/Puppeteer/happy-dom; jsdom cannot run WebCodecs/MediaPipe WASM/canvas capture. Confirmed independently in P1 §5.
- `BLOCKED` — No media fixtures: silence/scene/sync thresholds cannot be validated deterministically without synthetic media.
- `BLOCKED` — Speech/speaker analysis: no model, no adapter, all relevant registry capabilities `false`, live gate `false`; requires model + ZDR approval before any work.
- `BLOCKED` — Any ffmpeg-core-dependent feature: core is not vendored and is fetched at runtime; strict local-only positioning requires an explicit decision.

**Unresolved questions for the owner**
1. Should P2 analysis live in the React app (`src/`), the vendored Svelte editor (`vendor/braincut/src/`), or both? The two codebases duplicate media concepts (React `AudioStudio` vs vendor audio engine), and the video app is consumed as generated static output.
2. Is synthetic fixture generation (test-only, e.g. a few short generated WAV/WebM files) approved as part of a future test-harness phase?
3. Is browser-automation tooling approval in scope for P2, or should P2 remain unit-test-only with documented E2E gaps?
4. Should scene-change/silence detection be strictly detect-and-report, or may later phases apply destructive edits? (This audit assumes detect-only.)
5. Should the ffmpeg mirror download remain user-configurable and off by default, or be vendored for offline guarantees?
6. How should P2 results be persisted (local IndexedDB/OPFS vs in-memory only), and what retention/cleanup policy applies?

**Known implementation risks (not blockers)**
- React `AudioStudio.tsx:21` caps files at 250 MB but decodes the entire buffer into memory for waveforms (`:137`) — a memory risk near the cap.
- No cancellation in React local AI paths (`src/lib/segmentation.ts`, `src/lib/portraitRetouch.ts`).
- `src/components/VideoStudioFrame.tsx:12-37` bridges Supabase tokens into the iframe via `postMessage` (origin/source checked) — any future cross-app analysis API must preserve that boundary.
- Earlier documentation (`VIDEO_STUDIO_COMPLETE_ARCHITECTURE_AUDIT.md:90`) misstates vendor audio effects as absent; rely on source, not that doc.

---

## 11. Final recommendation

**`P2_PARTIALLY_READY_WITH_TEST_INFRASTRUCTURE_GAPS`.**

The underlying local editing platform is substantially ready: media probe, waveform peaks, frame extraction, captions, timeline, Web Audio and export are genuine and mostly unit-tested. A bounded first slice of P2 — metadata projection, audio-level statistics and silence/quiet-region detection — can be implemented locally with existing dependencies and verified with existing Vitest patterns, without touching provider/gateway/ZDR/approval controls or the persistent live gate.

However, the repository is **not** ready for a full P2: frame-decode-dependent analysis (scene change, A/V sync) and speech/speaker analysis are blocked by missing browser integration tooling, missing media fixtures, and missing models — all requiring separate owner approval. No cloud processing should be introduced, and the live gate must remain `false`.

**Completion verification (read-only):** branch and HEAD unchanged; staged 0; modified 14; untracked 108 (prior 107 + this report); no packages, models, binaries, media, external services or provider requests added or used; live gate still `false`. The SHA-256 of this report is reported in the accompanying delivery message (a file cannot contain its own hash).

**STOP — P2 implementation not started; P3 not started. Await explicit owner review and authorization.**
