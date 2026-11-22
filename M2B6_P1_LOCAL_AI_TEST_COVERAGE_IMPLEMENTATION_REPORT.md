# M2B-6 P1 — Local AI Test Coverage Implementation Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede` · **Final status:** `P1_PARTIALLY_COMPLETE_WITH_TEST_GAPS`

## 1. Preflight baseline
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; branch/HEAD as above; remote/upstream matches.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch and `main` unchanged.
- Initial worktree: staged 0, modified 14, untracked 101 (all pre-existing). M2B-6, M2B-4 and M2B-5B reports present and reviewed. No baseline discrepancy.

## 2. Test files added (test-only; no application source changed)
| File | Framework / env | Cases |
|---|---|---|
| `tests/local-ai-mediapipe.test.ts` | Vitest + jsdom, mocked MediaPipe | 9 |
| `vendor/braincut/src/lib/agent/proposals-p1.test.ts` | Vitest (vendor suite) | 6 |
| `vendor/braincut/src/lib/project/history-p1.test.ts` | Vitest (vendor suite) | 4 |
Total new cases: **19**.

## 3. Test cases by feature
**MediaPipe face landmark detection** (`portraitRetouch.ts`): local model asset path + CPU delegate; detector output passed through as normalized points (no invented coordinates); empty results → `[]`; init failure propagates and allows retry; processing exception propagates; zero-strength retouch is a no-op.
**Person segmentation** (`segmentation.ts`): successful category-mask → person mask with correct dimensions and alpha (background=0, person=255), mask `close()` called; missing category mask → `null` (no fabricated result); model init failure fails closed and retries; background mode `none` allocates no canvases; blur path snapshots source before clearing target and applies `destination-in` masking with foreground preservation.
**Editing proposal engine** (`agent/proposals.ts`): valid proposal stored as pending without touching project state; empty/oversized/incomplete proposals rejected; unsupported tools and invalid argument values rejected; stored operation list independent of later caller mutation; explicit applied/failed status with error text (no auto-application); completed-only cleanup and preview reset.
**Local history / undo-redo** (`project/history.ts`): empty history snapshot and null undo/redo; original state never mutated, undone state is new; ordering and redo-branch discard; empty patch ignored; seek/clear correctness.

## 4. Capabilities tested vs gaps
- **Successfully tested (mocked at appropriate boundaries):** all above, including negative and failure paths.
- **Not fully testable in this phase:**
  - Real MediaPipe runtime/model inference — requires browser WASM + model assets and hardware; mocked at the `@mediapipe/tasks-vision` boundary (VERIFIABLE limitation, not a source gap).
  - Actual missing-model-asset filesystem scenario — simulated via initialization failure; file existence was observed in the M2B-6 audit, not asserted in tests.
  - Cancellation/interruption — neither audited local module implements cancellation; no test added (would require production change, prohibited).
  - Root React `Home.tsx` snapshot-history UI — tested the authoritative vendor `History` class and proposal engine instead; component-level history UI has no existing test harness.
  - Unsupported-browser `getContext() === null` paths were partially covered via no-op assertions but not exhaustively across every draw helper.

## 5. Mocking strategy / no live services
- `vi.mock('@mediapipe/tasks-vision')` intercepts both static and dynamic imports; fake canvas 2D contexts implement only used methods; `fetch` is stubbed to throw in every MediaPipe test.
- Vendor proposal/history tests use existing Svelte stores and Immer only; no network, no provider, no credentials.
- No model/dataset downloads, no dependency changes, no snapshots updated.

## 6. Test counts (actual)
| Gate | Before (M2B-6 baseline) | After | Delta |
|---|---|---|---|
| `npx vitest run tests` (app) | 25 files / 188 tests | **26 files / 197 tests passed** | +1 file, +9 tests |
| `npx vitest run` (vendor) | 35 passed + 1 skipped / 350 passed | **37 passed + 1 skipped / 360 passed** (+1 skipped file count) | +2 files, +10 tests |
Combined passing tests: 538 → **557**. No test skipped or weakened by this work.

## 7. Typecheck and build results
- `npm run typecheck` → exit 0.
- `npx tsc -b` → exit 0.
- `npx vite build --config vite.config.ts` → exit 0.
All commands recorded; no unrelated files modified by them.

## 8. Security / privacy regression
Central gateway, consent, authorization grants, monotonic expiry, budget, ZDR policy, no-fallback and ledger controls were not touched (source diff for application code: none). Persistent live gate remains `false`. No credentials read, no provider requests, no external network traffic.

## 9. Final Git preservation
Final: staged 0, modified 14 (unchanged from baseline), untracked 105 (baseline 101 + three new test files + this report). Branch/HEAD unchanged; frozen tag, original branch and `main` unchanged. No commits, pushes, branch changes, or deletions.

## 10. Recommended follow-up (NOT AUTHORIZED by this task)
- Add real-browser MediaPipe smoke tests with local model assets (requires browser test setup approval).
- Add cancellation support and tests to local AI operations (requires production change approval).
- Add root React history/proposal UI tests (requires test-harness approval).
- Then proceed to M2B-6 P2 local video/audio analysis only after separate owner approval.

**Final status: `P1_PARTIALLY_COMPLETE_WITH_TEST_GAPS`** — dedicated coverage added for all in-scope existing implementations and all gates pass; remaining gaps are runtime/cancellation/UI-harness limitations documented above.
