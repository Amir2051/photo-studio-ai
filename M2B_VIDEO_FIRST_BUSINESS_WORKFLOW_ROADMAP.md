# M2B — Video-First Business Workflow Roadmap

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Mode:** Read-only planning and inspection · **Final status:** `VIDEO_WORKFLOW_ROADMAP_COMPLETE`

> This report is a plan. No code, UI, tests, configuration, dependencies, generated bundles, credentials, grants, or provider settings were changed. No provider request or media upload occurred.

---

## 1. Verified existing feature inventory

Evidence is from source and call paths only, not filenames, button labels, or status documents. Vendor editor = `vendor/braincut/src`; host React app = `src`.

| Capability | Classification | Evidence (file:line) | Reality |
|---|---|---|---|
| Video import, probing, thumbnails, proxy, transcode, relink | **VERIFIED_WORKING** | `lib/media/import.ts:291-346,373-415`; `probe.ts:118-266`; `sources.ts:66-92,196-413`; `proxy.ts:42-105`; `transcode.ts:63-177`; UI `ProjectPanel.svelte`, `MediaTile.svelte` | Real picker/folder/drop → decode-capability probe → thumbnail → IDB/OPFS source → relink/restore. FFmpeg conversion requires a configured mirror (gated, not stub) |
| Preview/playback (program + source monitors, compositor) | **VERIFIED_WORKING** | `engine/player.ts:59-411`; `session.ts:135-345`; `compositor.ts:254-444,538-802`; `audio-engine.ts:52-150`; UI `ProgramMonitor`, `SourceMonitor`, `Monitor`, `Transport` | WebCodecs decode + WebGL compositing + Web Audio clock; scrub, shuttle, in/out, loop, transform drag, context-loss recovery |
| Timeline/tracks | **VERIFIED_WORKING** | `project/types.ts:17-191`; `ops.ts:127-880`; `store.ts:8-30`; `ui/timeline/Timeline.svelte:141-168,437-1297` | Real multitrack V/A lanes, lock/mute/solo/hide, drag modes, waveform bands, keyframes, markers |
| Trim, split, roll/slip/slide, ripple delete, lift/extract | **VERIFIED_WORKING** | `ops.ts:395-619`; `editor/timeline-interactions.ts:430-628`; `ToolStrip.svelte:56-72`; `shortcuts.ts:129-141` | Real, frame-snapped, linked A/V, undoable |
| Merge clips (explicit command) | **NOT_IMPLEMENTED** | No merge op in `ops.ts`/`editor/*`; only internal audio merging (`audio-graph.ts:195`) | No UI/backend |
| Transitions (video GLSL + audio curves) | **VERIFIED_WORKING** | `engine/transitions/registry.ts:488-536`; `filter.ts:41-171`; `compositor.ts:371-445`; `ops.ts:800-882` | Real cross dissolve/wipes and audio curves; drag/drop and shortcuts |
| Undo/redo/history jump | **VERIFIED_WORKING** | `project/history.ts:22-99`; `store.ts:44-161`; `HistoryPanel.svelte:20-36` | Patch-based, 200 entries, preview/commit for drags |
| Audio waveform generation + cache | **VERIFIED_WORKING** | `media/waveform.ts:9-186`; `workers/waveform.worker.ts:21-98`; `ui/timeline/ClipView.svelte:189-252` | Worker decode → min/max peaks → LRU/IndexedDB cache → canvas bars; cancellation |
| Local audio level stats + quiet-region detection | **VERIFIED_WORKING** | `media/audio-analysis.ts:17-65,215-246,266-391`; `ui/LocalAudioAnalysis.svelte:16-18,71-192,240-254`; `audio-analysis.test.ts:52-513` | Pure, deterministic, abortable; explicit status unions; detect-only (clicking a region only seeks at `:194-197`) |
| Silence/quiet-region **removal** | **NOT_IMPLEMENTED** | No consumer of `QuietRegion[]` in edit ops; `agent/tools.ts:407-1437` has no silence tool | Manual trim/split/ripple exist, but no detected-region→edit mapping |
| Transcription / subtitle generation | **PARTIALLY_IMPLEMENTED** | `captions/parse.ts:44-93`; `import-captions.ts:20-72`; `TextPanel.svelte:48-106,131-157`; no ASR anywhere; `model-registry.mjs:17-30` caps false | SRT/VTT import → caption lane works; no speech-to-text |
| Highlight / short-form clip generation | **NOT_IMPLEMENTED** | `MIAChatPanel.svelte:217` chips only fill the draft; no detector/extractor in `agent/tools.ts`; `export/frame.ts:13-37` single-frame only | Chat suggestion is UI-only for this purpose |
| Speaker detection / diarization | **NOT_IMPLEMENTED** | No speaker code; `MIAChatPanel.svelte:150` disclaims it; registry has no capability | Greenfield |
| Smart reframing / tracking | **NOT_IMPLEMENTED** | Manual transform keyframes only (`tools.ts:908-927,1087-1185`); fixed letterbox in `export/scene.ts:35-38`; `engine/profile.ts` is a profiler, not reframe | No subject/face tracking |
| Audio cleanup / normalization | **PARTIALLY_IMPLEMENTED** | `engine/effects/audio.ts:111-273` (gain, EQ, filters, compressor, reverb, delay, stereo-width); `AudioMixer.svelte:72-137`; no denoise/LUFS | Manual effects only; no auto-normalization |
| Render/export | **VERIFIED_WORKING** | `export/render.ts:35-308`; `presets.ts:15-38,241-426`; `scene.ts:28-142`; `gif.ts:44-116`; `ExportDialog.svelte:139-302,488-495` | Progress, ETA, cancel, OPFS streaming, missing-media preflight, codec fallbacks |
| Project persistence/recovery | **VERIFIED_WORKING** | `serialize.ts:5-15,112-347`; `persistence.ts:39-123`; `project-actions.ts:72-354`; `EditorPage.svelte:228-255` | Save/open/save-as, autosave, recents, relink on reopen |
| UI shell/navigation | **VERIFIED_WORKING** | `EditorPage.svelte:79-117,228-375`; `TopBar.svelte:56-112`; `commands.ts:61-256`; `shortcuts.ts:100-201`; `PanelTabs`, `Resizer`, `CommandPalette` | Real tabs/workspaces/resizers/palette/shortcuts |
| AI chat/vision/proposal/approval path | **PARTIALLY_IMPLEMENTED** | `MIAChatPanel.svelte:14,58-100,145-177`; `VisualFrameReview.svelte:104-205,258-264`; `AIReviewPanel.svelte:64-114`; `mia-proxy.mjs:159-189`; `agent/proposals.ts`, `tools.ts:84-151,407-1437` | Real metadata-only chat, local frame sampling, explicit frame approval, proposal preview/apply/reject — but editor bypasses central gateway |
| Tests for these areas | **PARTIALLY_IMPLEMENTED** | `audio-analysis.test.ts`, `waveform.test.ts`, `captions/*.test.ts`, `agent/tools.test.ts`, `project/ops.test.ts`, root `m2b2-5` tests | Strong pure-logic/security tests; no worker/UI/e2e coverage of complete workflows |

**Generated-output note:** `public/video-studio/` and `dist/video-studio/` are compiled bundles only; they are not capability source. The host embeds them via `src/components/VideoStudioFrame.tsx:48-56`. No rebuild was performed.

---

## 2. Video workflow gaps

1. **No analyze-on-import workflow.** Metadata, waveform, quiet regions and frame sampling exist in separate tabs; no unified report attached to media.
2. **Detection ≠ removal.** Quiet regions can be found and seeking, but cannot be turned into reviewed timeline edits.
3. **No ASR.** Subtitles require an external SRT/VTT file; no transcription, word timings, or transcript editor.
4. **No highlight/short-form generation.** Suggestion chips only write chat text; no scene detection or clip assembly.
5. **No chapter model or local suggestion engine.** Titles/markers are manual or cloud-proposed from metadata only.
6. **No diarization, no tracking/reframing, no denoise/loudness normalization.**
7. **Provider boundary misalignment.** Actual editor chat goes `MIAChatPanel → mia-proxy → RZ Agent`, bypassing `central-gateway.mjs`; RZ Agent vision is a separate privacy concern. Server registry has all advanced capabilities false and live gate false.
8. **Test gap:** no end-to-end tests for any intelligent workflow; only pure logic and security gates.

---

## 3. UI-to-functionality map (mandatory engineering rule)

| Planned feature | User entry point | Controls / panels needed | Progress & errors | Preview / approval / undo | Final visibility |
|---|---|---|---|---|---|
| Analyze on import | Media panel + TopBar "Analyze" | Analyzer chooser, per-media status, report panel | Determinate progress, cancel, named codec errors | Report is non-mutating; "Use findings" creates one undoable step | Findings attached to media item and report panel |
| **Remove quiet regions (first slice)** | Analysis tab (existing) + command palette | Region checkboxes, threshold/minDuration/mergeGap/padding, Preview/Apply/Cancel | "Analyzing…", "N regions / X seconds", unavailable/invalid/cancelled statuses | Temporary `preview()`, summary, Apply = one `commitPreview`, Reject, normal Undo | Timeline shrinks; History shows one step; region list updates |
| Transcribe → captions | Analysis/Text tab | Language/model selector, transcript editor, segment timings, confidence | Progress + cancel; "unavailable" for silent audio | Preview captions in Program; approve import as caption lane; one undo step | Caption lane + title clips visible in timeline |
| Highlights/short clips | Analysis/Media | Target duration, platform, count, ranked cards with timecodes | Scoring progress; "no candidates" state | Preview candidate, approve/reject, create clips as one step | New clips/sequence in editor |
| Chapters/titles/suggestions | Analysis/MIA | Chapter list, title fields, evidence links | Generation progress; low-confidence warnings | Approve insertion of markers/titles; undo | Markers/titles in timeline |
| Speaker-aware editing | Audio/Analysis | Speaker lane, labels, filters | Cluster progress; "unknown" for noisy audio | Per-speaker filter preview; approval before edits | Speaker labels on regions/captions |
| Smart reframing | Program monitor/Effects | Platform presets, safe-zone overlay, ROI keyframes | Tracking progress; lost-subject warnings | Preview ROI animation; approve; undo | Reframed sequence + export size |
| Audio cleanup/normalize | AudioMixer/Analysis | Target level, threshold, A/B preview | Measurement progress; "all silent" warning | Preview gain changes; approve; one undo step | Updated meters/effects in mixer |
| Export reliability | TopBar Export (exists) | Post-export verification, remediation hints | Existing progress/ETA/cancel; add verification result | N/A | Exported file + verification status |

**Rule:** a feature is complete only when UI invokes real functionality, results are not simulated, errors/progress are shown, changes are previewed and approved, and end-to-end tests exist.

---

## 4. Ranked business workflow priorities

Ranking considers time saved, local feasibility, risk, and dependency on unapproved providers.

1. **Detect and remove silence/unnecessary pauses** — local, detection proven, edit primitives exist, biggest repetitive-time sink. **First slice.**
2. **Audio cleanup and level normalization** — local, measurement exists, uses current effects; strong second.
3. **Import footage and automatically analyze it** — local, mostly orchestration of existing analyzers; broad discoverability win.
4. **Render/export reliably** — already working; incremental verification/presets only; low new time savings.
5. **Transcribe + generate editable subtitles** — high business value but needs ASR (new model/provider/ZDR review); BLOCKED pending approval.
6. **Chapters/titles/editing suggestions** — depends partly on model-based generation; can be partially local (markers from quiet regions) but natural-language titles need a provider.
7. **Highlights/short-form clips** — needs scene/energy heuristics and assembly; medium-high build.
8. **Smart reframing** — needs tracking; medium-large build, correctness risk.
9. **Speaker-aware editing** — needs diarization model + sensitive biometric handling; largest build, defer.

---

## 5. Recommended first implementation slice

**Workflow: automatic silence/quiet-region removal — local only.**

Flow:
1. Import synthetic video with known silence; waveforms/peaks computed locally.
2. `detectQuietRegions` finds timestamped quiet regions (already verified in browser).
3. UI lists regions with checkboxes, timecodes, threshold/min-duration/padding controls.
4. User previews candidate removal (temporary `preview()`), adjusts selections.
5. Apply as **one** non-destructive project edit (`commitPreview`): frame-snapped ripple/extract across linked A/V, with leading/trailing handles and padding.
6. Program monitor shows edited result; History shows one step; Undo restores exactly.
7. Export to WebM/MP4 and verify duration/content.

**Why this slice:** detector is proven and tested; edit primitives (`rippleDelete`, `extractRange`, `trimEdges`, `splitClipsAt`), atomic preview/commit, History, and approval pattern all exist; no new dependency, model, provider, credential, or grant; composable template for later slices; directly targets a high-frequency manual task.

**Not assumed:** detection currently only seeks; removal must be newly implemented and tested.

---

## 6. Exact files/components likely to change

| File | Likely change |
|---|---|
| `vendor/braincut/src/lib/ui/LocalAudioAnalysis.svelte` | Add region selection, controls, Preview/Apply/Cancel, summary, errors; keep stats/read-only display |
| `vendor/braincut/src/lib/media/audio-analysis.ts` | Small pure helpers for padding/time mapping; preserve status unions and node-safety |
| **new** `vendor/braincut/src/lib/media/silence-edit.ts` + `.test.ts` | Pure `QuietRegion[] → frame-snapped edit list` mapper (ripple/extract, padding, clamping, missing-media guard) |
| `vendor/braincut/src/lib/project/store.ts` | Reuse `preview`/`commitPreview`/`edit`; no semantic change expected |
| `vendor/braincut/src/lib/project/ops.ts` | Reuse `extractRange`/`rippleDelete`/`linkedClips`; add a batch range-removal helper only if needed |
| `vendor/braincut/src/lib/editor/commands.ts` | Add palette command "Remove quiet regions" |
| `vendor/braincut/src/lib/EditorPage.svelte` | Wire Analysis-tab entry point / props |
| `vendor/braincut/src/lib/stores/app.ts`, `ui/Dialogs.svelte` | Only if a batch-confirmation dialog is added |
| `vendor/braincut/src/lib/media/audio-analysis.test.ts` | Extend region→edit/padding/boundary cases |
| New e2e/component tests | Worker decode, ClipView/LocalAudioAnalysis UI, region→edit preview/apply/undo, export verification |

No generated bundle rebuild is authorized in this planning phase; when implementation is approved, the documented local build process must be used and verified.

---

## 7. End-to-end acceptance matrix

| Test | Steps | Pass criteria |
|---|---|---|
| Real media import | Import synthetic WebM with known silences | Metadata exact; waveform peaks present; no network |
| Timeline interactions | Select, trim, split, ripple, undo on fixture | Frame-snapped, linked A/V preserved, one History step per action |
| Editing accuracy | 4 s fixture with two 0.5 s silences | Exactly 2 regions detected; applying removes exactly those ranges (+ configured padding) |
| A/V sync | Compare audio and video clip starts after ripple | Linked clips remain aligned within one frame |
| Undo/recovery | Apply, then Undo/Redo/History jump | Original starts/durations restored exactly; no orphaned edits |
| Subtitle correctness (future) | SRT/VTT round-trip through `parseCaptions` | Cue order/timing preserved; caption lane one undoable step |
| Export integrity | Export edited sequence to WebM/MP4 | Valid file; duration matches edited timeline; missing source aborts with filename; cancel leaves no partial output |
| Large files/long videos | OPFS scratch path with >400 MB simulated fixture | Backpressure, progress, no crash; cleanup after completion/failure |
| UI responsiveness | Run analysis/apply on 10-minute synthetic clip | Progress shown; cancel responsive; no frozen monitor |
| Provider failures (future/BYOK) | Invalid credential, ZDR mismatch, grant replay | Fail before transmission; no media sent; honest error; no retries/fallback |
| Privacy | Spy on network during local slice | Zero external requests; peaks stay in local cache |

---

## 8. Provider/BYOK requirements

- Business will use its own paid AI provider account after deployment. Design for **server-side credential handling only**; no client `VITE_*` keys, no browser-stored credentials.
- Reuse `central-gateway.mjs` as the sole policy path; never let the editor talk directly to a provider. Current `MIAChatPanel → mia-proxy → RZ Agent` bypass must be corrected for any provider-backed feature.
- Provider allowlist server-side; never accept provider/model/base URL from browser (`ai-gateway.mjs:204-213` model).
- **Vertex AI is not approved.** M2B-8C: technically viable but contractual ZDR assurance unavailable; Gemini Developer API not approved; OpenRouter Gemini routes blocked by Safety Retention policy. No Vertex enablement, credentials, calls, or grants authorized.
- Preserve M2B-3 single-use authorization. Do not reuse or modify the OpenRouter grant (pinned to OpenRouter/Mistral/fixed test prompt/32 tokens/`source='local-process'`). Any BYOK provider needs a separate grant family with atomic consume, exact fingerprinting, provider/model/endpoint binding, media scope, replay rejection, and fail-closed behavior.
- BYOK prerequisites when approved: business-owned GCP or provider account/billing, verified pricing for consent/budget, DPA/ZDR evidence, IAM/ADC or provider key stored server-side, same-origin gateway deployment.
- RZ Agent vision remains a separate privacy concern; cloud frame sending must retain explicit "Approve & send" gating and ZDR review.

---

## 9. Privacy and authorization blockers

1. **No approved AI provider** for semantic video features. Local-only slice avoids this.
2. **Editor bypasses central gateway** for chat/vision; provider-backed features require architecture change + owner approval.
3. **RZ Agent upstream ZDR cannot be enforced from this repo**; its vision path is a residual risk.
4. **ASR, diarization, reframing require new models/dependencies** and model-download/ZDR review — out of scope for first slice.
5. **Generated bundle is stale** relative to source; no rebuild authorized. New UI will not appear in the running iframe until an approved rebuild.
6. **No live provider calls, grants, credential configuration, or production data** may be used in this phase.

---

## 10. Expected measurable time savings and measurement

No marketing estimates. Measure with the protocol below and report medians/ranges.

- **Baseline (manual):** for each fixed synthetic clip, operator removes all pauses by scrubbing, splitting, ripple-deleting. Record: wall-clock seconds from start to target timeline; input actions (seek/split/delete); History steps created; corrections/undos; re-renders.
- **Workflow:** same clip, same target cut, using Analyze → review regions → Preview → Apply. Record the same metrics plus detected regions, accepted regions unchanged, and time spent reviewing.
- **Units:** seconds of operator time **per minute of source footage**; actions **per removed pause**; History steps **per equivalent final timeline**; acceptance rate = accepted/detected regions; rework rate = undos/applied edits; export first-attempt pass rate.
- **Choice of N:** fix the number of clips and operators before measurement (e.g., N clips × M operators); report raw values, median and range.
- **Acceptance for time saving:** final timeline must match target cut timecodes; action count and operator time must be lower than baseline; rework and export failures must not increase.
- **Instrumentation:** local-only timing/action counters; no PII, no telemetry upload.

---

## 11. Preservation confirmation

| Item | Before | After |
|---|---|---|
| Branch | `feature/pro-editor-professional-suite` | unchanged |
| HEAD | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | unchanged |
| Staged | 0 | 0 |
| Modified | 24 | 24 |
| Untracked | 127 | 128 (this report added) |
| Frozen tag | `cdb1238e…` | unchanged |
| Original / main | `cdb1238e…` / `2c451768…` | unchanged |
| Live gate | `false` | `false` |

No source, UI, tests, configuration, dependency, generated bundle, credential, grant, provider setting, database or production data changed. No media upload, live provider call, grant creation/consumption, server restart, deployment, commit, push, reset or branch/tag change occurred.

**STOP — implementation is not authorized by this roadmap. Await owner review and explicit approval.**
