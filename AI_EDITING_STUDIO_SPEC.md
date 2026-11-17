# Every Frame First Studio — AI Editing Studio Specification

Status: implementation specification
Project: existing Every Frame First Studio repository
Principle: AI does the editing work; the user remains the director.

## 1. Product direction

Extend the existing photo, podcast, and video application into a professional editing studio. Use automated editing workflows such as CutAI as product inspiration, not as a source to copy. Preserve the existing photo editor and local-first media workflow.

The editor must combine:
- An AI editing assistant that analyzes real uploaded media and proposes concrete edits.
- A non-linear, multitrack timeline that remains fully editable by the user.
- A media-processing pipeline that executes approved edits and creates actual output files.
- Manual controls for every operation; AI must never become a required step.

## 2. Repository baseline observed

The current working branch is `fix/photo-studio-core-repair`, at commit `65ca09a`, and was reported 27 commits behind its configured remote at inspection time.

The working tree already contains modified tracked files and numerous untracked files. Do not reset, clean, stash, checkout another branch, pull, or overwrite existing local work without separate explicit approval.

Existing video/podcast foundations observed:
- `src/components/MediaCreatorStudio.tsx`: current creator workspace and editing UI.
- `src/lib/mediaTimeline.ts`: clip timing, splitting, and source-time mapping.
- `src/lib/mediaExportGraph.ts`: FFmpeg filter graph construction, overlays, subtitles, and audio mixing.
- `src/lib/mediaFfmpeg.ts`: browser FFmpeg.wasm loader.
- `src/lib/mediaImport.ts`: local video/audio file classification and import types.
- `src/lib/mediaWaveform.ts`: waveform peak extraction.
- `@ffmpeg/ffmpeg`, `@ffmpeg/core`, Web Audio, React, TypeScript, Zustand, Fabric, and PixiJS are already present in the package manifest.

The current product is local-first. Original media is imported in the browser; do not upload user media to a cloud provider by default.

## 3. AI editing workflow

1. Import media locally and create a durable project/media record.
2. Extract metadata and generate analysis derivatives where supported.
3. Transcribe speech with word-level timestamps and speaker labels when available.
4. Analyze silence, pauses, filler words, repeated phrases, likely mistakes, scene changes, highlights, and audio quality.
5. Present findings with evidence: source media ID, time range, transcript span, analysis method/provider, confidence, and limitations.
6. Convert accepted recommendations into explicit timeline commands/operations.
7. Preview the proposed result before execution.
8. Let the user approve, reject, or revise each recommendation or a selected group.
9. Execute approved operations through the media engine and render a new output.
10. Preserve the original source, project history, and ability to undo/revise.

AI output must be treated as suggestions, not facts. Do not silently delete content or claim certainty when analysis is ambiguous.

## 4. Core capabilities

### AI-assisted editing
- Speech transcription and transcript-based navigation/editing.
- Silence and pause detection.
- Filler-word and repeated-phrase detection.
- Candidate mistake/retake identification.
- Highlight and short-clip suggestions.
- Scene/shot boundary detection.
- Audio issue detection and cleanup suggestions.
- Natural-language edit requests translated into inspectable timeline operations.
- Caption drafting, title suggestions, and social aspect-ratio variants.

### Manual editing
- Multitrack video and audio timeline with waveforms.
- Frame/time accurate split, trim, move, and track assignment.
- Transcript-linked editing.
- Titles, captions, overlays, transitions, and markers.
- Per-clip color controls and a path toward curves, masks, keyframes, and adjustment layers.
- Audio gain, EQ, compression, noise reduction, and mixing.
- Undo/redo and non-destructive effect/operation stacks.

### Export
- Execute the actual project timeline through FFmpeg or a suitable browser/native media engine.
- Export common landscape, portrait, and square deliverables.
- Support subtitle sidecars and burned-in captions.
- Report codec/browser/worker limitations accurately.
- Avoid copying unnecessarily large source media into memory or a single FFmpeg virtual filesystem when a streaming/proxy strategy is available.

## 5. Data and safety model

- Original recordings are immutable source assets.
- Edits are represented as versioned project/timeline data, not destructive source-file changes.
- Every AI recommendation has a stable ID and explicit status: proposed, approved, rejected, applied, or failed.
- Store provenance for analysis: provider/model, processing time, source IDs, timestamp ranges, confidence, and known limitations.
- Store transcript segments with source timestamps and speaker metadata when available.
- Undo/redo must cover both manual and AI-generated timeline changes.
- Preview and export must use the same authoritative project state.
- No cloud upload, external publishing, production deployment, account connection, or paid provider usage without explicit user approval.
- Keep API credentials server-side; never expose secrets in browser bundles or logs.
- Fail honestly when a provider, codec, or analysis capability is unavailable. No mock success or fabricated analysis.

## 6. Suggested architecture

- Project model: versioned project, sequence, tracks, clips, media assets, effects, keyframes, transcript segments, markers, and operation history.
- Media storage: local OPFS/File System Access where supported, with IndexedDB metadata and fallback behavior.
- Preview: browser-native decode/WebCodecs where supported, Web Audio for audio, and GPU compositing with feature detection/fallbacks.
- Processing: FFmpeg for reliable media transforms/export; use workers/proxies/chunking where practical to control memory.
- AI adapters: provider-neutral interfaces for transcription, speech analysis, scene analysis, and language-model edit planning.
- AI edit planner: validated schema that emits timeline operations only; never runs arbitrary model-generated shell commands or FFmpeg arguments.
- Execution: deterministic compiler from validated project operations to media-engine operations/filter graphs.
- UI: analysis panel, transcript editor, proposal review/approval controls, preview, and existing timeline.

## 7. Implementation phases

### Phase 0 — Baseline and safety
- Record current Git status and baseline commit.
- Inspect current routes, editor component, timeline model, persistence, and tests.
- Keep all existing local changes intact.
- Identify existing feature coverage and regressions before modifying behavior.

### Phase 1 — Durable project and operation model
- Add versioned project/timeline schema and migrations.
- Add immutable source-asset references and project save/reopen.
- Add typed, validated edit operations and operation history.
- Add tests for serialization, validation, and undo/redo.

### Phase 2 — Transcript and media analysis
- Add provider-neutral transcription/analysis contracts.
- Implement transcript segment model and timeline synchronization.
- Add silence/filler/highlight analysis adapters only where a real provider or deterministic signal-processing implementation exists.
- Display provenance, confidence, and unavailable states.

### Phase 3 — AI proposal and approval workflow
- Convert model recommendations into validated timeline operations.
- Show before/after previews and exact time ranges.
- Support individual approve/reject/edit and batch approval.
- Keep proposed changes separate from the active project until approved.

### Phase 4 — Editing and render execution
- Compile approved project state into the existing FFmpeg/export pipeline.
- Add tests that compare expected edit graph behavior and timeline timing.
- Add render progress, cancellation, failure recovery, and output validation.
- Preserve original media and allow re-render after revisions.

### Phase 5 — Professional editing depth
- Expand track controls, snapping, linked A/V, transitions, keyframes, masks, color tools, audio processing, and social exports.
- Prioritize durable project/media management and correctness over decorative UI.
- Add browser capability detection and fallback behavior.

## 8. Acceptance criteria

A feature is not complete merely because the UI displays a control or a mock analysis result.

- Imported source media remains unchanged.
- Projects can be saved, reopened, and relinked without losing timeline state.
- Transcript timestamps align with the source media.
- AI proposals identify the exact source and time range and can be individually reviewed.
- Rejecting a proposal leaves the project unchanged.
- Approving a proposal creates a reversible timeline operation.
- Preview and final export reflect the same approved timeline.
- Export produces a playable file whose duration, tracks, and edits match the project.
- Provider/codec failures are visible and do not produce false-success states.
- Existing photo editing and current media import/edit/export behavior remain covered by regression tests.

## 9. Immediate engineering guardrails

- Do not replace the existing editor or start a disconnected application.
- Do not rewrite the photo editor as part of the video milestone.
- Do not pull/rebase/reset the current branch while the working tree is dirty.
- Do not overwrite pre-existing untracked work.
- Work in small, reviewable changes and run focused tests plus typecheck/build after each meaningful increment.
- Keep this document as the product/engineering contract and update it when implementation decisions materially change.


## 10. Implementation log — Phase 1 security baseline (2026-11-15)

Implemented in the existing brainCUT source and rebuilt into `public/video-studio/`:
- Removed URL-query activation of the localhost agent bridge. The bridge can only be enabled from the editor's explicit Preferences/command action.
- Made local-agent connection consent session-only. Legacy persisted `claudeBridge=true` values are reset to off at startup and are not written as durable consent.
- Added a fail-closed approval callback to the agent tool dispatcher. Only `status`, `get_timeline`, `list_media`, and `catalog` are read-only; every other tool call requires an explicit per-call approval. Missing approval handlers and denied prompts reject the operation before its handler runs.
- Added visible-tab/browser-confirm checks so background tabs or unavailable approval prompts cannot authorize writes. This is an interim safety gate; replace the native confirmation with a first-class proposal review panel before introducing AI-generated edit batches.
- Added upload destination validation: HTTPS is required for remote export uploads, HTTP is allowed only for loopback development, and URL credentials are rejected.
- Added incoming call payload size/shape checks, protocol-version validation, and duplicate in-flight call-ID rejection.
- Confirmed the current integration branch already scopes root service-worker cleanup to the `every-frame-first-shell-` namespace; no duplicate change was needed.
- Updated editor preferences help text and the bundled editor README to describe the consent and approval behavior.

Verification after implementation:
- brainCUT unit tests on the current integration branch: 255 passed across 23 files.
- brainCUT Svelte diagnostics: 0 errors, 0 warnings.
- brainCUT static production build: successful; existing chunk-size and dynamic-import warnings remain.
- Root integration-branch deployment tests: 82 passed across 17 files (the exact `npx vitest run tests` command used by the production Pages workflow).
- Root TypeScript typecheck and Vite production build on the integration branch: successful; the existing large-chunk warning remains.
- Rebuilt `vendor/braincut/build/` on the current integration branch and synchronized it to `public/video-studio/` without deleting older hashed assets. Confirmed the new approval code is present and query-based auto-connect code is absent from the generated client bundle.

Release scope: the `fix/phase1-secure-agent` integration branch will trigger the repository's GitHub Pages workflow on push. This release changes only the editor source and published static build; it does not deploy Base44 backend resources, alter databases, start the local agent service, connect an AI provider, transcribe media, or upload user media. The local-agent bridge remains off by default.


## 11. Implementation log — Phase 2 AI edit review (2026-11-15)

Implemented on a separate development branch based on the deployed Phase 1 commit:
- Added a typed proposal model with a strict allowlist of timeline operations, required/optional argument validation, field bounds, per-operation status, and a 20-operation proposal cap.
- Added the browser `propose_edits` tool. It can create a review queue but does not mutate the project or history.
- Added the **AI Review** bottom-panel tab, pending-count badge, operation summaries/rationales, readable media/clip/time arguments, and a status-bar link back to an active preview.
- Added non-destructive visual previews for add clip, add title, split, trim, move, delete, transition, and marker operations. Previews update the existing timeline/program monitor without marking the project dirty or adding history.
- Applying a preview commits exactly one undoable history step. Cancelling restores the pre-preview project. A normal edit or sequence/project switch cancels an unapproved AI preview rather than silently committing it.
- Added tests for proposal validation, no-side-effect queue creation, preview cancellation, preview commit, and sequence-switch safety.

Verification on the Phase 2 branch:
- brainCUT tests: 272 passed across 25 files.
- Svelte diagnostics: 0 errors, 0 warnings.
- Root app tests: 82 passed across 17 files.
- Video-studio and root production builds: successful; existing bundle-size and ineffective dynamic-import warnings remain.

Integration boundary: the `braincut-mcp` server is maintained separately and its source is not present in this repository/worktree. The browser now accepts `propose_edits`, but the external MCP server must advertise that tool and its schema before a connected Claude Code agent can invoke the proposal workflow. Until that server-side registry is updated, the new panel is ready for proposals but the connected agent still uses the Phase 1 per-operation confirmation path. No Phase 2 deployment, provider connection, transcription, or media upload has been performed.
