# Milestone 2A — Independent Review

**Date:** 2026-11-19 · **Reviewer mode:** read-only audit (no source/test/file changes) · **Branch:** `feature/pro-editor-professional-suite` @ `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Verdict:** `M2A INDEPENDENT REVIEW PASSED WITH CONDITIONS — CORRECTIONS REQUIRED`

---

## 1. Baseline verification (read-only, independently performed)
- Root: `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai` ✓
- Branch: `feature/pro-editor-professional-suite`; HEAD `1ecce92…` ✓ (equals expected M1 closeout commit, not the frozen trial commit)
- Remote `origin/feature/pro-editor-professional-suite` → `1ecce92…` ✓; upstream configured ✓
- Frozen tag → `cdb1238e…`; original `feature/pro-editor-rebuild` → `cdb1238e…`; `main`/`origin/main` → `2c451768…` — all unchanged ✓
- Staged index: **0 files** ✓
- Working tree: 7 modified source/doc files + 9 untracked reports + 46 bundle paths (39 stale + 7 generated) — all preserved, nothing deleted or overwritten ✓
- No Git mutation, source/test edit, stage, commit, or push performed by this review.

## 2. Evidence classification key
- **[VERIFIED]** — directly observed in this review (code, artifacts, or freshly executed tests/browser).
- **[REPORTED]** — claimed in M2a documentation; not newly proven here.
- **[ASSUMPTION]** — inferred from code structure, not measured.
- **[UNVERIFIED]** — no evidence available in this environment.

## 3. Files reviewed
Modified source: `vendor/braincut/src/lib/editor/project-actions.ts`, `vendor/braincut/src/lib/ui/ProjectPanel.svelte`, `vendor/braincut/src/lib/suite/adapters/braincut.ts`, `vendor/braincut/src/lib/suite/adapters/braincut.test.ts`, `vendor/braincut/src/lib/suite/media.ts`, `vendor/braincut/src/lib/suite/media.test.ts`, `VIDEO_STUDIO_COMPLETE_IMPLEMENTATION_ROADMAP.md`.
Docs: `VIDEO_STUDIO_MILESTONE_2A_INTEGRATION_PLAN.md` and the four M2a reports. The complete `git diff` of all seven files was read line by line.

## 4. The five focus areas

### 4.1 File-size growth 18.6 KB → 26.7 KB — exact cause
**[VERIFIED]** The growth was **not** caused by the adapter or checkpoint. Artifacts from the browser smoke test were retrieved and compared:
- Original saved project: 18,578 bytes, **2 media entries**, IDs `6rezvn650x|yi6vsgd5mp`.
- Crafted test project (created for duplicate testing by copying one media object): 26,727 bytes, **3 media entries**, IDs `6rezvn650x|yi6vsgd5mp|duplicate-ref-test`; the injected media object serializes to ~8,031 bytes with indentation (the item carries a large embedded thumbnail).
- Re-saved crafted project: 26,727 bytes, same 3 IDs; recursive comparison against the crafted JSON found **0 differing value paths** (only JSON key ordering differs, because `parseProject` reconstructs objects).
- Separate ordinary-project check: opened the 18,578-byte file and saved it again → **18,578 bytes, 0 differing value paths, still 2 media entries** — no growth.
Conclusion: 26,727 − 18,578 = 9,149 B is entirely attributable to the deliberately injected third media reference plus formatting; no data amplification from M2a code was observed.

### 4.2 Necessity of extra parsing/serialization
**[VERIFIED]** `checkLegacyCompatibility()` performs **three parses and three serializations** per call (`parseProject`/`serializeProject` for the canonical string; `legacyBraincutToSuiteDocument` re-parses and re-serializes via `projectToSuiteDocument`; `suiteDocumentToProject` re-parses the payload and is serialized again). It is called on every open and every save.
**[VERIFIED]** It is purely advisory: its result only drives a warning toast; it never changes the project bytes or the loaded object. It is therefore **not necessary for functional correctness** — it is a drift-detection sensor for a library not otherwise used at runtime.
**[REPORTED]** M2a's implementation report says "two parses + two serializations" — understated; the code shows three of each.
**[UNVERIFIED]** Cost on large project JSON (tens of MB) — no measurement exists. This is a performance risk, not a proven defect.

### 4.3 Duplicate-media detection is strictly advisory
**[VERIFIED]** `duplicateMediaGroups()` is used in exactly one runtime location: `ProjectPanel.svelte` derives `duplicateRefs` and renders a `<div class="missing-bar">` with text only. There are no click handlers, no store writes, no `edit()` calls, no `forgetSource`, no relink, and no file operations tied to it. It cannot trigger destructive behavior.
**[VERIFIED]** Detection is identity-based (`fileName ?? name`, byte size, `lastModified ?? 0`), so two imports of the same file through the automation tool with different upload timestamps are correctly *not* flagged.

### 4.4 Ordinary legacy project information through open/save/reopen
**[VERIFIED]** Browser test on the real 18,578-byte project: open → save produced an identical-size file with **0 differing value paths** and the same media count. Adapter unit tests additionally prove wrap/unwrap deep equality with `parseProject(serializeProject(p))`.
**[VERIFIED]** Save still writes `serializeProject(p)`; open still loads `parseProject(text)`; the Suite adapter never replaces the authoritative object. No migration is triggered.

### 4.5 Unknown fields and safe failure
**[VERIFIED]** `parseProject` (`project/serialize.ts:332-347`) constructs a new `Project` from known fields only — **unknown top-level legacy fields are not preserved** by the existing workflow (pre-existing behavior, unchanged by M2a). The M2a checkpoint does not preserve or drop them; it merely stays green in their presence (unit test added).
**[VERIFIED]** Malformed JSON fails safely: helper returns `ok:false` with a reason; browser showed "Not a brainCUT project: the file is not valid JSON" with 0 console errors and the editor remained usable.
**[VERIFIED]** Adapter drift produces a warning only; the original project still opens/saves.

## 5. Independently executed validation
| Gate | Command (cwd) | Result |
|---|---|---|
| Suite tests | `npx vitest run src/lib/suite` | **27 passed** (4 files) — consistent with M2a report |
| Vendor full | `npx vitest run` (`vendor/braincut`) | **350 passed** (35 files) |
| App | `npx vitest run tests` (root) | **99 passed** (19 files) |
| Framework check | `npm run check` (`vendor/braincut`) | **0 errors, 1 pre-existing warning** |
| Root typecheck | `npm run typecheck` | **exit 0** |
| Browser | rebuilt bundle `1795133493391` | import, save, open, duplicate bar, malformed input; **0 console errors** |
| Vendor build | `npm run build` (`vendor/braincut`) | **FAILED: Rust allocator OOM** (`memory allocation of … failed`, exit 134); retried with `NODE_OPTIONS=--max-old-space-size=1024`, still OOM (exit 134) |

Build diagnosis **[VERIFIED]**: free physical RAM was ~1 GB of 15.8 GB and several Chrome/Node processes were resident, so the failure is environmental memory pressure, not a compile error; source was unchanged by this review. The M2a report's "production build passed" remains a **[REPORTED]** claim from the earlier session, **not independently reproduced here**. To avoid overwriting tracked generated artifacts under `public/video-studio/`, this review deliberately did not run the root `npm run build` (which syncs those files).

## 6. Conditions / corrections required
1. **Correct the documentation**: the checkpoint performs three parses/serializations, not two (implementation + integration decisions reports).
2. **Clarify unknown-field behavior**: state explicitly that unknown top-level legacy fields are dropped by the pre-existing strict parser; the checkpoint does not preserve them (compatibility report implies this but should say it plainly).
3. **Measure or bound the checkpoint overhead** before considering it for large projects; consider dev-only/opt-in invocation in a later milestone.
4. **Re-run the production build in a lower-memory environment** to independently confirm the reported pass; the OOM in this review is environmental, not a defect.

## 7. Other findings
- No new runtime dependency, storage key, or `.braincut` format change **[VERIFIED]**.
- Undo/redo was left unchanged as documented; suite history is not wired into editor history **[VERIFIED]**.
- All prior uncommitted reports, generated bundle files, and 39 stale chunks remain untouched **[VERIFIED]**.

## 8. Verdict
`M2A INDEPENDENT REVIEW PASSED WITH CONDITIONS — CORRECTIONS REQUIRED`

The integration is functionally safe and backward compatible, all automated tests pass, and no destructive behavior was found. The conditions above are documentation accuracy, an unmeasured performance cost, and an environment-blocked build re-verification — no material code defect was found.
