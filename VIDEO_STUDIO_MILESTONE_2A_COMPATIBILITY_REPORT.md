# Milestone 2A — Compatibility Report

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` @ `1ecce92…`

## 1. Project format
- `.braincut` v1 remains the only on-disk project format. No version bump, no migration step, no new field written.
- Save still writes exactly `serializeProject(p)` from the live project store; the Suite checkpoint observes the text but never modifies it.
- Open still parses with `parseProject(text)` and loads that object; the Suite adapter never replaces it.

## 2. Evidence that legacy data is preserved
| Check | Evidence |
|---|---|
| Wrap/unwrap equality | `suiteDocumentToProject(projectToSuiteDocument(p))` deep-equals `p` (M1 adapter test, still green) |
| Canonical checkpoint | `checkLegacyCompatibility()` compares `serializeProject(parseProject(text))` with the wrapped/unwrapped canonical form; passes on valid files |
| Unknown extra fields | The pre-existing strict `parseProject` constructs a new `Project` from known fields only, so unknown top-level legacy fields are **dropped on any open/save**. This behavior predates M2a: M2a neither introduces nor fixes it, and the checkpoint merely stays green in their presence (`futureEditorNote` test); the adapter neither drops nor rewrites data itself |
| Malformed input | Helper returns `ok:false` with a reason; editor shows "Not a brainCUT project: the file is not valid JSON" and stays usable |
| Browser round-trip | Saved project reopened with media + timeline restored; crafted project with duplicate media opened and re-saved to a valid 26.7 KB `.braincut` |
| No unintended migration | No storage-key or autosave-schema change; opening did not trigger any write |

## 3. Failure behavior
- Missing/unsupported picker: existing fallbacks unchanged (HTML input for open; download for save).
- Adapter drift (checkpoint `ok:false`): advisory warning toast only — the original project still opens/saves, so users never lose access to their files.
- Malformed project: existing clear error path remains authoritative.

## 4. Media references
- Suite identity helper uses `fileName ?? name`, byte size, and `lastModified ?? 0`; this matches the existing relink heuristic and supports older projects without timestamps.
- Duplicate references are **reported only** — no auto-merge, no file moves, no relink side effects, no new global registry.
- Missing media continues to use the existing missing/relink UI; this milestone did not alter it.

## 5. Compatibility risks / limitations
- The checkpoint performs **three parses and three serializations** per open/save (corrected after independent review). Measured overhead is ~0.9 ms for a 14 KB project, ~34 ms for a 0.64 MB project and ~548 ms for a 5.1 MB project (see `VIDEO_STUDIO_MILESTONE_2A_CORRECTION_AND_VALIDATION_REPORT.md`). It is advisory and not functionally required; no performance improvement is claimed.
- The checkpoint is advisory: if it reports a mismatch the project still opens/saves (deliberate availability-over-purity choice). The warning must be taken seriously in later milestones.
- The native strict parser (unchanged) **drops unknown top-level legacy fields**; M2a did not introduce this behavior and does not fix it. No migration or format change was added, and parser/serializer semantics were not altered.
- Browser-uploaded duplicate test files received different `lastModified` values, so identical-content uploads were not flagged — correct per the identity definition, but a known limitation of detection across re-imports.

## 6. Regression status
Vendor 350 passed, app 99 passed, typecheck 0 errors / 1 pre-existing warning, build passed, browser workflow 0 console errors. No compatibility regression versus the frozen trial checkpoint `cdb1238…`.
