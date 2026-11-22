# M2B-6 — Local AI Feature Readiness & Implementation Plan Audit

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede` · **Mode:** READ-ONLY audit; no implementation

## 1. Executive summary
- The **security/platform foundation is VERIFIED**: central gateway, provider routing, consent, atomic single-use authorization, monotonic expiry, per-operation grants, verified pricing with $0.001 ceiling, strict ZDR payload construction, no fallback/retry, metadata-only ledger, and 188 passing tests.
- **Already local and real:** MediaPipe face landmark detection (`src/lib/portraitRetouch.ts`) and person segmentation (`src/lib/segmentation.ts`) with model assets under `public/models/` and `public/mediapipe/` (VERIFIED files; dedicated tests NOT_FOUND_IN_AUDITED_SCOPE). Web Audio multitrack recording/waveforms and local WAV encoding exist in `src/pages/AudioStudio.tsx` (VERIFIED). Non-destructive snapshot history exists in Home.tsx / HistoryPanel and vendor project history (VERIFIED).
- **Provider-backed text chat is prepared but BLOCKED** by no authorized live test; strict OpenRouter ZDR routing is verified at application level, provider enforcement UNVERIFIED.
- **Gemini is BLOCKED** by retention policy (direct API abuse-monitoring logging; OpenRouter Gemini routes all Vertex/Safety Retention) per M2B-5B (`ZDR_ROUTING_VERIFIED_GEMINI_UNAVAILABLE`).
- Most "AI" features (image generation/editing, upscaling, STT, scene detection, object tracking, etc.) are **absent/stubbed** — no fake UI was added. Safest path: build local-first features with existing MediaPipe/Fabric/Cropper/Web Audio assets, then add remote text features only after a separately authorized live test.

## 2. Repository and preservation baseline
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; branch/HEAD as above; remote/upstream matches.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch and `main` unchanged.
- Initial worktree: staged 0, modified 14, untracked 100 (pre-existing reports, tests, generated paths). All preserved; no file modified except this report.
- Required M2B-4, M2B-5, M2B-5B reports present and read; persistent live gate `false`.

## 3. Existing architecture findings (paths / symbols)
| Area | Verified implementation | Evidence label |
|---|---|---|
| Central gateway / routing | `server/ai/central-gateway.mjs`, `execute.mjs`, `router.mjs`, `provider-registry.mjs`; only adapter transport `providers/openrouter.mjs::chat()` | VERIFIED |
| Consent / approval | `consent.mjs`, `single-use-auth.mjs::collectOperatorApproval()` (stdin phrase) | VERIFIED |
| Grant integrity | `single-use-auth.mjs`: `activeGrants` Map, `consumeTestGrant()` synchronous atomic consume, performance.now() expiry, symbol handle | VERIFIED |
| Cost | `pricing.mjs` (verified OpenRouter prices), $0.001 ceiling at consumption, estimate/confirmed split | VERIFIED |
| ZDR | adapter `provider` object with four flags; fail-closed check; owner dashboard settings in M2B-5B | VERIFIED (app/payload); UNVERIFIED (provider enforcement) |
| Ledger / persistence | `ledger.mjs` metadata-only fields, secret-field rejection; in-memory only; no durable store | VERIFIED (non-durable) |
| Caching / logging | no response cache; no prompt/response content in ledger; no cache module found | VERIFIED |
| Local face inference | `src/lib/portraitRetouch.ts::detectFaceLandmarks/applyPortraitRetouch`, MediaPipe CPU, model `public/models/face_landmarker.task` | VERIFIED (code/assets); tests PARTIALLY_VERIFIED |
| Local segmentation | `src/lib/segmentation.ts::computePersonMask/applyBackgroundOps`, `selfie_multiclass.tflite`, `BackgroundPanel.tsx` | VERIFIED (code/assets); dedicated tests NOT_FOUND_IN_AUDITED_SCOPE |
| Local audio | `src/pages/AudioStudio.tsx` Web Audio, MediaRecorder-style tracks, `encodeWav`, waveform canvas, IndexedDB | VERIFIED |
| Video media infra | `vendor/braincut/src/lib/media/{waveform,thumbnails,proxy,transcode,probe}.ts`, ffmpeg.wasm 2 GB cap, bounded caches | VERIFIED |
| Editing proposals | `vendor/braincut/src/lib/agent/{proposals,tools,proposal-preview}.ts`, `runTool`, per-operation approval | VERIFIED |
| Captions | `vendor/braincut/src/lib/captions/{parse,import-captions}.ts` SRT/VTT → title clips (manual import, no ASR) | VERIFIED |
| Undo/redo | `src/pages/Home.tsx` history/historyIndex, `src/editor/HistoryPanel.tsx`, `vendor/braincut/src/lib/project/history.ts` | VERIFIED |
| AI service stubs | `src/lib/aiService.ts` OfflineProvider, `generateScene`/segment/retouch/cull fail closed; gateway `/scene`, `/segment`, `/retouch`, `/cull-score` → 501 | VERIFIED (honest stubs) |
| MIA proxy | `server/mia-proxy.mjs` → `RZ_AGENT_URL` separate upstream, own key; not OpenRouter | VERIFIED (distinct) |
| Transcription / scene detection / tracking / upscaling / inpainting | no implementation found in audited scope | NOT_FOUND_IN_AUDITED_SCOPE |

## 4. Complete feature readiness matrix
Labels: V=VERIFIED, P=PARTIALLY_VERIFIED, N=NOT_FOUND_IN_AUDITED_SCOPE, U=UNVERIFIED, B=BLOCKED.

| Feature | Status / label | Existing files | Processing | Dependencies | Provider | ZDR | Security controls | Tests | Risk | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| AI image generation | Stub/B (V for stub) | `aiService.ts`, gateway `/scene` 501 | remote only | missing provider | required | unavailable | fail-closed | aiService test (no fabrication) | high | Block; needs verified image provider |
| Image-to-image editing | Stub/B (V) | `aiService.ts` `/retouch` | remote | missing | required | unavailable | fail-closed | aiService test | high | Block |
| Generative fill / object removal | Absent (N) | none | local model or remote | missing | optional | unavailable | none yet | none | high | Investigate local inpaint model (approval) |
| Background removal/replacement | Local implemented (P) | `src/lib/segmentation.ts`, `BackgroundPanel.tsx`, `selfie_multiclass.tflite` | local | installed MediaPipe | none | N/A | local-only, no upload | no dedicated test | low | Build local tests |
| Super-resolution/upscaling | Absent (N) | none | local WASM or remote | missing | optional | unavailable | none | none | high | Defer; needs model |
| Face retouching/enhancement | Local implemented (P) | `portraitRetouch.ts`, `BackgroundPanel`/`RetouchPanel` | local | MediaPipe assets present | none | N/A | local-only | faceAccessories/faceMakeup tests | low | Build focused tests |
| Object selection/segmentation | Person-only (P) | `segmentation.ts` | local | installed | none | N/A | local-only | no dedicated test | medium | Extend model scope after evidence |
| Smart masking/subject isolation | Partial local (P) | `MaskingPanel.tsx`, `segmentation.ts`, `imgProc` | local | installed | none | N/A | local | layerMasks tests | low | Integrate local mask generation |
| Style transfer | Local filter presets (P) | `src/lib/filters.ts`, `StyleAssistantPanel.tsx` | local (filters, not AI) | installed | none | N/A | local | styleAssistant tests | low | Label as filters, not AI style transfer |
| Image restoration/denoising | Absent (N) | none | local model or remote | missing | optional | unavailable | none | none | high | Defer |
| Scene detection | Absent (N) | none | local frame-diff or remote | none installed | optional | unavailable | none | none | medium | Prototype local frame-diff |
| Shot/clip analysis | Metadata base (P) | `media/{waveform,thumbnails,probe}.ts`, timeline interactions | local | installed | none | N/A | local | media tests | medium | Add local metadata aggregation |
| Video object tracking | Absent (N) | none | local model or remote | missing | optional | unavailable | none | none | high | Defer |
| Video background removal | Absent (N) | none | local per-frame segmentation | missing pipeline | optional | unavailable | none | none | high | Defer |
| Video enhancement/upscaling | Absent (N) | none | local/remote | missing | optional | unavailable | none | none | high | Defer |
| Automatic subtitles | Manual import only (P) | `captions/*` | local parse | installed | none | N/A | local | caption tests | medium | Needs ASR (local or approved provider) |
| Clip summarization | Absent (N) | none | remote text model | gateway ready | optional | app route verified, provider UNVERIFIED | consent/budget ready | none | medium | After live text test approval |
| Intelligent editing suggestions | Proposal engine (P) | `agent/proposals.ts`, `tools.ts`, AI Review | local apply + remote text optional | installed | optional | app verified | approval per operation | agent tests | medium | Local expansion first |
| Speech-to-text | Absent (N) | none | local WASM or remote | missing | optional | unavailable | none | none | high | Investigate local Whisper-class model |
| Speaker diarization | Absent (N) | none | local/remote | missing | optional | unavailable | none | none | high | Defer |
| Noise reduction | Absent (N) | AudioStudio Web Audio base | local DSP | Web Audio installed | none | N/A | local | none | medium | Prototype local DSP filters |
| Voice enhancement | Absent (N) | none | local DSP | missing | none | N/A | none | none | medium | Defer |
| Silence detection/removal | Absent (N) | timeline trim exists | local DSP | Web Audio installed | none | N/A | local | none | medium | Prototype local energy/VAD detector |
| Automatic chapters | Absent (N) | none | local/remote | missing | optional | unavailable | none | none | medium | After transcript capability |
| Audio summarization | Absent (N) | none | remote text | gateway ready | optional | provider UNVERIFIED | consent/budget | none | medium | After live test |
| Podcast title/description | Absent (N) | none | remote text | gateway ready | optional | provider UNVERIFIED | consent/budget | none | low | After live test |
| NL editing commands | Non-live UI + proposals (P) | `MiaControlCenter.tsx`, `agent/*` | local apply + remote generation | installed | optional | app verified | approval | m2b3 UI tests | medium | Local command parser first |
| Context-aware proposals | Implemented local (P/V) | `agent/tools.ts::runTool`, `proposals.ts` | local | installed | none for apply | N/A | per-operation approval | agent tests | low | Extend tool set with tests |
| Auto crop/composition | Absent (N) | Cropper.js present | local heuristics | installed | none | N/A | local | none | medium | Prototype local subject-aware crop |
| Color correction recommendations | Manual adjustments (P) | `AdjustmentPanel.tsx`, manualEditing | local heuristics | installed | none | N/A | local | manualEditing tests | medium | Add local histogram-based suggestions |
| Workflow automation | Partial local (P) | `agent/tools.ts`, commands | local | installed | none | N/A | approval | agent tests | medium | Extend cautiously |
| Non-destructive history/undo | Implemented (V) | Home.tsx, HistoryPanel, project/history.ts | local | installed | none | N/A | local | history tests | low | Preserve; integration tests for AI ops |

## 5. Local-first implementation opportunities
- **MediaPipe** (`@mediapipe/tasks-vision`) with `face_landmarker.task` and `selfie_multiclass.tflite` already in `public/models/`; CPU delegate; useful for face retouch, person segmentation, subject isolation. Licensing: MediaPipe Apache 2.0 (verify bundled model terms). No downloads needed.
- **Web Audio API** (native) for silence detection, basic noise gates, waveform analysis; no new deps; browser-side; privacy-safe.
- **mediabunny / ffmpeg.wasm** in vendor for demux/decode and conversions (2 GB cap); can power local frame sampling for scene detection; ffmpeg.wasm license depends on core build (LGPL/GPL) — verify before distribution.
- **Fabric.js / PixiJS / Cropper.js** installed for layers, compositing, crop; suitable for local mask/crop/subject-aware UI; MIT licenses (verify).
- **IndexedDB/OPFS** local storage and bounded caches already used.
- **No ONNX/TensorFlow/Whisper dependency found** — local STT/super-resolution requires new model + approval.
- Quality tradeoffs: CPU inference slower on large images; person-only segmentation; no general object models; no verified local ASR.

## 6. Remote provider and ZDR constraints
- OpenRouter strict ZDR route VERIFIED at app level; owner dashboard settings from M2B-5B are owner-confirmed; provider enforcement UNVERIFIED until an authorized live test.
- `zdr:true`, `data_collection:'deny'`, `allow_fallbacks:false`, `require_parameters:true` always enforced; missing policy fails closed; no retry/fallback; no free-route bypass; no prompt/response caching.
- Gemini: direct API NOT ZDR-compliant (abuse logging + developer logs); OpenRouter Gemini endpoints all Vertex/Safety Retention → OWNER_POLICY_BLOCKED. Gemini remains disabled.
- Remote-dependent text features (summaries, titles, editing suggestions generation) are "potentially compatible with verified app route, provider enforcement UNVERIFIED"; image/video/audio remote generation requires new provider investigation and likely cannot meet strict ZDR with current evidence.

## 7. Security and editing-integrity gaps
- Durable consent/ledger NOT_FOUND (in-memory only) — process restart loses audit state.
- No dedicated tests for local MediaPipe features; no tests for silence detection (absent); no tests for background removal masks.
- No general "generated vs original" content tagging in the project model (NOT_FOUND) — future AI results must be explicitly labeled and kept separate.
- No tool/plugin upload path in current AI gateway; plugins/tools external retention out of scope but must remain disabled for strict ZDR.
- No partial-failure recovery protocol for AI operations; adapter fails closed with errors; proposal engine marks failed operations, but no retry policy (correct).

## 8. Test and build results (actually run)
- `npx vitest run tests` → **25 files / 188 tests passed**.
- `npm run typecheck` → exit 0.
- `npx tsc -b` → exit 0.
- `npx vite build --config vite.config.ts` → exit 0.
No network/provider requests; no credentials used; no snapshots updated.

## 9. Recommended implementation phases (ordered by dependency and risk)
| Phase | Work | Affected files/components | Risk | Approval |
|---|---|---|---|---|
| P1 | Local AI test coverage: MediaPipe segmentation, face retouch, mask integration; preserve originals | `src/lib/segmentation.ts`, `portraitRetouch.ts`, `MaskingPanel.tsx`, new tests under `tests/` | low | none beyond normal review |
| P2 | Local video/audio analysis: frame-diff scene detection; Web Audio silence/energy detector | `vendor/braincut/src/lib/media/*`, `src/pages/AudioStudio.tsx`, new local helpers/tests | medium | owner review for scope |
| P3 | Local subject-aware crop and histogram-based color suggestions | `Cropper.js` integration, `AdjustmentPanel.tsx`, `manualEditing.ts` | medium | owner review |
| P4 | Remote text features (summaries/titles/proposals) via existing gateway | `server/ai/*`, `MiaControlCenter.tsx`, `agent/*` | medium | requires explicit live test authorization; provider enforcement UNVERIFIED |
| P5 | New local ASR / super-resolution / inpainting models | new deps/models, storage assets, tests | high | separate dependency/model approval |
| P6 | Image/video generation via provider | new provider adapter + ZDR evidence + gateway extension | high | blocked until qualifying provider verified |

## 10. Blockers and owner decisions
1. No live provider test authorized → remote text features cannot be end-to-end verified.
2. Gemini unavailable under strict ZDR; no exception authorized.
3. No local ASR/upscaling/inpainting model installed; new dependencies require approval.
4. Durable consent/ledger design needs owner decision before implementation.
5. Generated-vs-original content tagging not designed; must be specified before AI results are applied.

## 11. Final preservation verification
Final Git state: staged 0, modified 14, untracked 101 (this report added). Branch/HEAD unchanged; frozen tag/original branch/main unchanged. No source/config/env/database changes; no credentials read; no live provider requests; no deployment; no Git operations. Only this report was created.

**Final status: `M2B6_AUDIT_COMPLETE_LOCAL_FIRST_PLAN_READY_FOR_OWNER_REVIEW`**
