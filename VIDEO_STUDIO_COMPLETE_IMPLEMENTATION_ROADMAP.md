# Video Studio — Complete Implementation Roadmap (Phase 0)

**Date:** 2026-11-19 · **Status:** M1 foundation implemented and awaiting review; no M2+ work started

## Status update — 2026-11-19 (Milestone 1 foundation)
- **Completed:** shared suite contracts (`lib/suite/types.ts`), media identity/lifecycle helpers (`media.ts`), framework-neutral history (`history.ts`), versioned suite serialization (`serialize.ts`), legacy `.braincut` v1 adapter (`adapters/braincut.ts`), 20 new tests, and the three M1 reports.
- **Verification:** vendor 343 passed (baseline 323 + 20 new), app 99 passed, typecheck 0 errors / 1 pre-existing warning, production build passed, browser smoke 0 console errors. No regressions.
- **Not done by design:** no UI wiring, no cross-studio project manager, no editing-tool expansion, no media/performance feature work, no M2+ work.
- **Next:** operator review of M1 reports, then the video editing foundation (slip/slide/roll, ripple insert, track grouping, shortcut configuration), then M2 media/performance.

## 0. Gate before any implementation — RESOLVED
The freeze now exists: `feature/pro-editor-rebuild` and annotated tag `video-studio-trial-ready-2026-11-19` both resolved at `cdb1238e…` locally and remotely before the development branch was created. `feature/pro-editor-professional-suite` was created from that commit and pushed normally.

## 0. Gate before any implementation (RESOLVED — see status update above)
Freeze tag and remote branch were verified at `cdb1238e…`; the professional-suite branch was created from that commit. Historical note: before the freeze operation, the tag did not exist and the operation was blocked until operator authorization.

## 1. Safe implementation boundaries

- Allowed: additive modules, new tests, local browser verification, docs, per-milestone commits/pushes on the new branch after approval.
- Prohibited without explicit approval: `.braincut` format changes without migration tests, production backend/db/env changes, paid services, forced sign-in, dependency replacements, mobile performance claims from small fixtures, merge to main, deployment.
- The frozen trial branch/tag must remain untouched.

## 2. Phased sequence

| Phase | Outcome | Affected modules | Complexity | Key dependencies |
|---|---|---|---|---|
| **P1 Suite foundation** — DONE (2026-11-19) | Shared project/media/undo/service contracts (no UI rewrite) | new `suite/` interfaces; adapters over existing `project/*`, `media/*`, `engine/*` | Medium | Freeze resolution; compatibility tests |
| **M1a Video editing foundation** — NEXT | Slip/slide/roll, track groups, nested sequences where feasible, shortcut config, workspaces | `lib/editor/*`, `ui/timeline/*`, `stores/preferences` | High | P1; 200+ vendor tests green |
| **M2 Media & performance** | Bins/tags/search, background thumbs/peaks, archives, measured long-form behavior | `lib/media/*`, `project/persistence`, `storage/*` | High | Real long media fixtures |
| **M3 Color grading** | Full primary/secondary controls + scopes affecting render/export | `engine/compositor`, `engine/effects`, new grade model | High | P1; engine filter pipeline |
| **M4 Audio/Podcast** | Mixer, EQ/comp/limiter/denoise/ducking, transcription hook | `src/pages/AudioStudio.tsx`, `lib/media/waveform`, optional local STT | High | Audio DSP choice |
| **M5 Motion/VFX** | Animated titles, keyframes, masks, chroma, tracking/stabilization | `engine/text`, `effects`, `ui/timeline` | High | M1 keyframes |
| **M6 Photo Studio** | RAW verification, brushes/healing, lens corrections, batch | `src/editor/*` panels | High | Decoder availability |
| **M7 Hybrid AI** | Provider-neutral adapters, local-first, proposal/approval flow | `lib/agent/*`, optional ONNX/MediaPipe, server gateway | High | Consent gates; no paid calls by default |
| **M8 Social workflows** | Reframing presets, multi-version export queue, templates | `lib/export/*`, `templates/*` | Medium | M2 performance |
| **M9 PWA device experience** | Touch timeline, gestures, quota UI, offline recovery | root `sw.js`, `VideoStudioFrame`, UI CSS | Medium | Device testing (tablet/mobile) |
| **M10 Cloud/collab (optional)** | Accounts, backup, sync, review comments | new server adapters + Supabase | Very high | Separate approval; production changes |

## 3. Milestone 1 acceptance criteria (next work item after gate)
1. Slip/slide/roll and ripple insert operations mutate the project model and serialize correctly.
2. Undo/redo restores exact prior state; save/reopen preserves edits (existing `.braincut` v1 files still open).
3. Configurable shortcuts and a keyboard-reference UI exist; no shortcut regressions.
4. Track group/lock/mute/visibility and context menus operate on real state.
5. Vendor suite ≥ 323 tests, app suite ≥ 99 tests, typecheck 0 errors, production build passes, browser smoke of import→edit→save→reopen→export still passes.
6. Feature status register updated; milestone report committed separately.

## 4. Per-milestone ceremony (mandatory)
Acceptance criteria → affected modules → smallest coherent change → targeted tests → regression suites → production build → real browser → save/reopen → media playback → export where relevant → measured performance → documented limitations → separate commit → push branch → milestone report.

## 5. Risk controls
- Time-box each milestone; escalate if the timeline rendering model needs redesign (M1) or if a dependency requires paid/production changes (M4/M7/M10).
- Treat long-form numbers as NOT VERIFIED until the M2.1 protocol is run with real 10/30 min and 4K media.
- Keep AI proposals explicit, editable, approvable, and undoable; never silently overwrite edits.
- Validate all imported files and project archives; no unsafe extraction paths.
