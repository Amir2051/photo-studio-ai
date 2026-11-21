# M2B-6 P1 — Final Local AI Test Coverage Completion Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Previous report:** `M2B6_P1_LOCAL_AI_TEST_COVERAGE_IMPLEMENTATION_REPORT.md` (`P1_PARTIALLY_COMPLETE_WITH_TEST_GAPS`)
**Final status:** `P1_COMPLETE_WITH_NONBLOCKING_INFRASTRUCTURE_LIMITATIONS`

---

## 1. Preservation baseline (preflight — all checks passed)

| Item | Expected | Observed | Result |
|---|---|---|---|
| Repository root | `…\photo-studio-ai` | `C:/Users/yayam/OneDrive/Documents/Default Project/photo-studio-ai` | `VERIFIED` |
| Branch | `feature/pro-editor-professional-suite` | identical | `VERIFIED` |
| HEAD | `1ecce92…` | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | `VERIFIED` |
| Staged files | 0 | 0 | `VERIFIED` |
| Modified tracked files | 14 | 14 | `VERIFIED` |
| Untracked files | 105 | 105 (incl. 3 P1 tests + prior report) | `VERIFIED` |
| Frozen tag | `cdb1238e…` | `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73` | `VERIFIED` |
| Original branch | `cdb1238e…` | `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73` | `VERIFIED` |
| `main` | `2c451768…` | `2c4517684b5f620368ed435f583e8f2a874f4d76` | `VERIFIED` |
| Persistent live gate | `false` | `liveExecutionEnabled: false` | `VERIFIED` |

The M2B-6 architecture audit and the prior P1 report were read before any change. No baseline discrepancy was found, so work proceeded. All 14 pre-existing modified files and every pre-existing untracked file were preserved.

## 2. Independent review of the three original test files

### 2.1 `tests/local-ai-mediapipe.test.ts` (9 original cases) — `VERIFIED`
Exercises `src/lib/segmentation.ts` (`getSegmenter`, `computePersonMask`, `applyBackgroundOps`) and `src/lib/portraitRetouch.ts` (`getFaceLandmarker`, `detectFaceLandmarks`, `applyPortraitRetouch`). Assertions checked against production source:
- **Local model paths / CPU delegate** — production builds `modelAssetPath` from `import.meta.env.BASE_URL` + `models/selfie_multiclass.tflite` / `models/face_landmarker.task` and sets `delegate: 'CPU'`. The test's `toContain(...)` + `not.toMatch(/^https?:/)` assertions match and confirm local-only paths. `VERIFIED`.
- **Landmark passthrough** — `detectFaceLandmarks` maps `result.faceLandmarks` to `{x,y}` only; the test supplies its own points and checks exact passthrough. No invented coordinates. `VERIFIED`.
- **Empty detection → `[]`** — direct consequence of `.map()` over an empty array. `VERIFIED`.
- **Mask values/dimensions** — production sets RGB=255 and alpha=255 for category≠0, alpha=0 for category 0; test asserts exactly that at the model's own `width`/`height`. `VERIFIED`.
- **Missing category mask → `null`** — production returns `null` before allocating a canvas (line 60); test also asserts no canvas was created. `VERIFIED`.
- **Init failure + retry** — production `.catch()` sets the cached promise to `null` before rethrowing (segmentation line 41-44, retouch line 23-26); the test's reject-then-resucceed sequence genuinely verifies this reset. `VERIFIED`.
- **No-op modes / zero strength** — match the `ops.mode === 'none'` early return and the retouch no-op guard. `VERIFIED`.
- **Source-before-clear compositing** — production snapshots the source (lines 112-117) before `clearRect` (line 140). The original assertions only checked *that* `drawImage`/`clearRect`/`destination-in` occurred, not the ordering, so they could pass against a wrongly-ordered implementation — a false-positive risk. **Strengthened** with an `invocationCallOrder` assertion (see §4). No assertion was removed or weakened.

### 2.2 `vendor/braincut/src/lib/agent/proposals-p1.test.ts` (6 cases) — `VERIFIED`
Reviewed against `agent/proposals.ts`:
- `createEditProposal` throws `between 1 and 20 operations` for 0 or 21 ops (lines 259-261) and validates `projectId` via `string(input.projectId, 'projectId', 128)` (line 264). `VERIFIED`.
- `operations: input.operations.map(validateProposalOperation)` (line 271) returns fresh objects — the "independent operation list" test is valid. `VERIFIED`.
- `updateProposalOperation` sets status and truncates error text to 500 chars (lines 277-291); the applied/failed status test matches. `VERIFIED`.
- `clearCompletedProposals` keeps proposals with ≥1 pending op (line 295); the mixed-status cleanup test matches. `VERIFIED`.
- No proposal path calls `project.set` — the "no auto-application" assertion reflects the real contract. `VERIFIED`.

### 2.3 `vendor/braincut/src/lib/project/history-p1.test.ts` (4 cases) — `VERIFIED`
Reviewed against `project/history.ts`:
- `push` returns early on empty patches (line 30) — the "ignores invalid operations" test is valid. `VERIFIED`.
- `push` truncates the redo branch via `this.entries.length = this.cursor` (line 31) — "discards redo on new operation" and the resulting `[1, 3]` state are correct. `VERIFIED`.
- `snapshot()` shape, `undo`/`redo` (including `null` on empty), `seek`, `clear`, and Immer patch non-mutation all match lines 37-99. `VERIFIED`.

**Review outcome:** no test was found to assert behavior the production code does not implement. No mock was found that bypasses the behavior its test claims to verify, except the compositing ordering weakness in §2.1, which has been corrected.

## 3. Assertions corrected and why

| Test | Change | Reason |
|---|---|---|
| `snapshots the source before clearing the target…` | Added `invocationCallOrder` check that snapshot `drawImage` runs before target `clearRect` | The original assertions could pass even if the target were cleared first — which would corrupt the caller's source when target===source. The added assertion tests the actual non-destructive guarantee instead of only the presence of calls. |

No assertions were deleted, relaxed, or changed to accommodate a failure; test counts increased only.

## 4. Additional tests added

| File | Tests | Classification |
|---|---|---|
| `tests/local-ai-mediapipe.test.ts` | +2 deterministic "missing local asset" cases (segmentation + face landmarks): `forVisionTasks` rejects → honest error, no canvas/mask fabricated, and the failed-init cache is cleared so a later init succeeds. Fresh `?missing-asset=1` module IDs guarantee isolated cached-init state. | `VERIFIED` |
| `tests/local-ai-history-ui.test.tsx` (new) | +5 React `HistoryPanel` cases: renders states/current label; undo/redo disabled when no history; footer callbacks fire; clicking "Original state" restores that snapshot into all state setters without mutating it; empty history is a disabled no-op. | `VERIFIED` |

Mocks remain at genuine boundaries: only `@mediapipe/tasks-vision` (external model runtime) and `document.createElement('canvas')` (fake 2D context) are mocked; `fetch` is stubbed to throw. The UI tests render the real presentational component with prop-injected `vi.fn()` setters — no network, no provider, no credentials, no model downloads.

## 5. Browser/WASM runtime test outcome — `NOT_TESTABLE_WITH_EXISTING_INFRASTRUCTURE`

`package.json` has no Playwright, Puppeteer, or happy-dom. Only `jsdom` is installed, which has no WebAssembly/MediaPipe WASM or GPU canvas execution support. Running the real `@mediapipe/tasks-vision` initialization path would require installing browser-automation tooling and serving/loading the model bundle — all explicitly out of scope. The existing tests therefore mock the runtime at the documented boundary and are reported as **mocked-boundary tests**, not real-runtime tests. The local assets were confirmed present in the earlier M2B-6 audit (`public/models/face_landmarker.task`, `public/models/selfie_multiclass.tflite`, `public/mediapipe/vision_wasm_internal.wasm`); they were not modified, deleted, or fetched.

## 6. Missing-asset test outcome — `VERIFIED`

Closed with two deterministic tests at the `FilesetResolver.forVisionTasks` boundary, which is the real boundary that resolves the locally-served WASM bundle. A rejection simulates a missing/404 local asset without touching real files or the network. Both paths return an honest error (no false success, no fabricated mask/landmarks) and both verify the production retry behavior after a failed initialization.

## 7. React editing-history UI test outcome — `VERIFIED`

A UI harness already existed (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, and the `tests/m2b3-ui.test.tsx` convention), so no dependency or production change was needed. `HistoryPanel` is a pure props-driven component; it was rendered directly with injected spies. All requested UI behaviors (undo/redo interaction, empty history, disabled controls, state synchronization, original-state preservation) are covered. `Home.tsx` itself was not imported or modified.

## 8. Cancellation limitation — `NOT_IMPLEMENTED`

A direct search of `src/lib/portraitRetouch.ts` and `src/lib/segmentation.ts` found no `cancel`, `abort`, `AbortSignal`, or interruption support. Per the authorization, no cancellation behavior was invented or implied in tests. This is recorded as a separate future *feature* gap, not a P1 test failure and not a regression.

## 9. Full regression results

| Gate | Prior P1 baseline | This run | Exit |
|---|---|---|---|
| `npx vitest run tests` (app) | 26 files / 197 passed | **27 files / 204 passed** | 0 |
| `npx vitest run` (vendor) | 37 passed + 1 skipped / 360 passed + 1 skipped | **37 passed + 1 skipped / 360 passed + 1 skipped** | 0 |
| `npm run typecheck` | 0 errors | 0 errors | 0 |
| `npx tsc -b` | exit 0 | exit 0 | 0 |
| `npx vite build --config vite.config.ts` | exit 0 | exit 0 | 0 |

Combined passing tests: 557 → **564** (+7: 2 missing-asset + 5 UI). The single skipped vendor test/file is pre-existing and unchanged. No test was skipped, weakened, or deleted by this work.

## 10. Exact files added or modified

- **Modified (test-only):** `tests/local-ai-mediapipe.test.ts` — strengthened compositing assertion, +2 missing-asset tests.
- **Added (test-only):** `tests/local-ai-history-ui.test.tsx` — +5 React history UI tests.
- **Unchanged:** `vendor/braincut/src/lib/agent/proposals-p1.test.ts`, `vendor/braincut/src/lib/project/history-p1.test.ts` (reviewed, no changes needed).
- **Added (report):** `M2B6_P1_FINAL_LOCAL_AI_TEST_COVERAGE_COMPLETION_REPORT.md`.

No production source, provider adapter, gateway, consent/approval/ZDR control, model asset, dependency/lockfile, environment/config, database/backend, or existing report was changed.

## 11. Final Git preservation comparison

Final state: branch `feature/pro-editor-professional-suite`, HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede`, staged 0, modified 14 (unchanged from baseline), untracked 107 (baseline 105 + `tests/local-ai-history-ui.test.tsx` + this report; the other new tests were already counted in the 105). Frozen tag `cdb1238e…`, original branch and `main` all unchanged; live gate still `false`. No commits, pushes, resets, rebases, stashes, branch switches, or deployments.

## 12. Remaining gaps requiring separate owner approval

- **Real-browser MediaPipe WASM smoke tests** — require installing browser-automation tooling and serving model assets (dependency/infrastructure approval). `NOT_TESTABLE_WITH_EXISTING_INFRASTRUCTURE`.
- **Cancellation/interruption support and tests** — production feature work, currently `NOT_IMPLEMENTED`; separate feature authorization required.
- **M2B-6 P2** (local video/audio analysis) — not started; requires separate owner approval.

**Final status: `P1_COMPLETE_WITH_NONBLOCKING_INFRASTRUCTURE_LIMITATIONS`** — all feasible test-only gaps were closed (missing-asset coverage and React history UI coverage added using existing infrastructure), the three original test files were independently verified against real production contracts, and all regression gates pass. The only remaining limitations are the absence of browser-automation infrastructure for genuine WASM runtime testing and the fact that cancellation is not implemented; neither is a P1 test gap. Awaiting owner review; P2 not started.
