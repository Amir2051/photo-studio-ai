# Milestone 2A — Test Report

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` @ `1ecce92…` (no M2a commit) · **Verdict:** all gates passed

## Automated results (actual, post-integration)

| Gate | Command (cwd) | Result | M1 baseline |
|---|---|---|---|
| M2a/Suite tests | `npx vitest run src/lib/suite` (`vendor/braincut`) | **4 files / 27 tests passed** | 22 → +5 new tests |
| Vendor full suite | `npx vitest run` (`vendor/braincut`) | **35 files / 350 tests passed** | 345 → +5 |
| Application suite | `npx vitest run tests` (root) | **19 files / 99 tests passed** | unchanged |
| Typecheck | `npm run check` (`vendor/braincut`) | **0 errors, 1 pre-existing warning** (`MIAChatPanel.svelte` `.signout`) | unchanged |
| Production build | `npm run build` (vendor, with `NODE_OPTIONS=--max-old-space-size=512`) | **passed** (exit 0; independently reproduced in correction milestone). Original M2a run: root build, bundle version `1795133493391` | passed |

No test was skipped, weakened, or removed. The 5 historical root-aggregate `$app/env` alias-import failures remain unchanged and informational.

## New tests (5)
- `suite/adapters/braincut.test.ts`: checkpoint passes for a valid legacy file (id/name/media count); malformed input returns `ok:false` with a reason without throwing; unknown extra legacy fields stay green and native data still parses.
- `suite/media.test.ts`: `duplicateMediaGroups` detects duplicates on legacy `MediaItem`-shaped inputs; missing `lastModified` normalizes to 0.

## Browser verification (in-app Chromium, rebuilt bundle `1795133493391`)
| Step | Observed |
|---|---|
| Fresh load of editor | "Import footage" screen, editor opens, version matches rebuilt bundle |
| Import media (input fallback) | "1 file imported", media item appears in Media panel |
| Save | "Saved Untitled project"; `.braincut` download 18,578 B; no compatibility warning |
| Open saved project (input fallback) | "Opened Untitled project"; timeline/media restored; no warning |
| Open crafted project with duplicate media identity | 3 media entries; bar "1 possible duplicate media reference"; no compatibility warning |
| Save crafted project | "Saved Untitled project"; `.braincut` download 26,727 B; no warning |
| Open malformed `.braincut` | Clear error "Not a brainCUT project: the file is not valid JSON"; editor remains usable |
| Console | **0 error-level messages** across the workflow |

Note: stale hashed chunks caused an initially old JS bundle to be served from browser cache; after a cache-busting navigation, the updated ProjectPanel chunk (`Cl1vnYPf.js`) loaded and the duplicate bar appeared. This is the known service-worker/hashed-asset behavior, not an application defect.

## Legacy compatibility tests (unit + browser)
- `checkLegacyCompatibility(serializeProject(p))` → `ok:true`, id/name/media count match.
- Wrap/unwrap equality with `parseProject` proven for native projects; the unknown-field test only proves the checkpoint stays green (the pre-existing strict parser drops unknown top-level fields on save).
- Malformed JSON → safe `ok:false` in the helper and clear error toast in the browser.
- No format migration or data rewrite observed: saved bytes still come from `serializeProject(p)`.

## Conclusion
All M2a acceptance checks pass with real editor workflows and a rebuilt production bundle. No new failures versus the M1 baseline.
