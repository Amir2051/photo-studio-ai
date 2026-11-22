# Milestone 1 — Test Report

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` · **Starting/final commit:** `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`

## Commands and exact results

| Gate | Command (cwd) | Result | Baseline comparison |
|---|---|---|---|
| New M1 tests | `npx vitest run src/lib/suite` (`vendor/braincut`) | **4 files / 20 tests passed** | new |
| Vendor full suite | `npx vitest run` (`vendor/braincut`) | **35 files / 343 tests passed** | frozen baseline 31 / 323 → +4 files, +20 tests |
| Application suite | `npx vitest run tests` (repo root) | **19 files / 99 tests passed** | unchanged |
| Type checking | `npm run check` (`vendor/braincut`) | **0 errors, 1 pre-existing warning** (`MIAChatPanel.svelte` `.signout`) | unchanged |
| Production build | `npm run build` (repo root) | **passed** (chunk-size advisory only); bundle version `1795131435182` | passed at baseline |
| Browser smoke | open `http://127.0.0.1:4176/video-studio/?m1-smoke=…` in in-app Chromium | editor loaded, version matched rebuilt bundle, **0 console errors** | passed at baseline |

## New test coverage

| File | Cases |
|---|---|
| `suite/history.test.ts` | empty state; push/undo/redo with labels; redo-branch invalidation; depth limit; clear; injected clock |
| `suite/media.test.ts` | stable case-insensitive identity; negative/null byte handling; ref identity; duplicate groups; unavailable refs; missing vs unknown availability |
| `suite/serialize.test.ts` | nested-payload round-trip; envelope detection; invalid JSON/format/version; malformed refs/fields; invalid enums and non-primitive metadata |
| `suite/adapters/braincut.test.ts` | media-ref mapping; exact legacy project round-trip; `.braincut` v1 wrap/unwrap; missing-media and proxy/generated mapping; loud failure on tampered payload |

## Save/reopen and playback/export regression evidence
- Vendor suite includes the existing `project/serialize`, `project/store`, `project/ops`, `export/presets`, `export/avcc`, `media/probe`, `engine/player` and related tests — all green within the 343 passed.
- The new adapter test explicitly proves legacy save/reopen compatibility at the document layer (`legacyBraincutToSuiteDocument` → `suiteDocumentToProject` equals `parseProject` of the original `.braincut` v1 JSON).
- Full browser import → preview → timeline → save/reopen → H.264 MP4 export → playback was verified at the frozen baseline (`VIDEO_STUDIO_TRIAL_READINESS_REPORT.md`); Milestone 1 changed no runtime module (new code is not imported by the app), and the rebuilt bundle loaded with zero console errors. A full re-export was therefore not repeated; this is stated explicitly rather than claimed as newly verified.
- The exported artifact from the frozen trial remains valid: `Sequence_1.mp4`, 1,533,559 B, MP4 `ftyp`, video+audio tracks, 8.320 s.

## Failures and interpretation
- No new failures. No test skipped, weakened, or suppressed.
- Root aggregate `npx vitest run` historically reports 5 `$app/env` alias-import failures for vendor tests pulled into the app resolution context (agent×3, editor timeline-interactions, stores preferences). These are unchanged from the frozen baseline, informational, and do not affect the vendor suite, app suite, or production build. They are not concealed here.
- The only typecheck warning is the pre-existing `.signout` CSS warning in `MIAChatPanel.svelte`.

## Conclusion
All Milestone 1 gates pass and the new tests are included in the reported vendor total. No regressions versus the frozen trial baseline were observed.
