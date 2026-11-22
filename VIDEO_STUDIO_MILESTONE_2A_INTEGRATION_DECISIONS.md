# Milestone 2A — Integration Decisions

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` @ `1ecce92…`

## Decision 1 — Read-only checkpoint, not a parallel serializer
The Suite adapter is invoked on open and save **only to verify compatibility**. The native parser and serializer remain the single source of truth; the Suite document is derived and discarded. Rationale: avoids a second competing project representation and preserves the exact bytes users save.

## Decision 2 — Warn, never block
If the checkpoint fails, the editor shows a warning and continues with the original project. Rationale: a future adapter regression must never lock users out of their saved projects. The failure is visible (toast) rather than silent.

## Decision 3 — Duplicate-reference detection as the first media integration
Chosen because it is pure, read-only, and directly exercises the shared identity contract (`mediaIdentity`) without creating a new global registry, moving files, or touching import/relink behavior. Alternatives considered:
- *Registering imported refs* — would require a registry (M2b), out of scope.
- *Resolving refs to existing assets* — would touch `sources.ts` handle/permission flows, higher risk.
- *Missing-reference detection* — already implemented natively; duplicating it would add no value.
The panel bar reuses existing `.missing-bar` styling, so no layout redesign was needed.

## Decision 4 — History boundary unchanged
The editor's `project/history.ts` stores immer patches (compact for thousands of clips); the Suite `createHistory<T>()` stores full snapshots. Bridging them would alter undo granularity and risk the verified trial editing workflow. No connection was made. Future integration should bridge at the *operation* level (label + patch pair) rather than replacing the stack, and only after shared project state exists (M2c).

## Decision 5 — No framework or dependency changes
All integration code is TypeScript/Svelte within existing packages; no new dependency, cloud service, storage key, or `.braincut` version. Capability detection and local-first behavior remain unchanged.

## Decision 6 — Generated bundle churn preserved, not committed
The verification build changed `public/video-studio/_app/version.json`, `index.html` and `service-worker.js` and left 39 stale chunks in place. Per M1 closeout conventions, these generated artifacts were left untouched and uncommitted; source changes are independent of them (all 15 assets referenced by the current index exist and are tracked at HEAD).

## Decision 7 — Verification method
Unit tests prove adapter and identity semantics; browser tests prove the real open → save → reopen → duplicate-report → malformed-input path with a rebuilt bundle. Both are reported separately in the M2a test report; no claim rests on unit evidence alone.

## Trade-offs accepted
- Checkpoint cost is now measured: three parses + three serializations per open/save; overhead ~0.9 ms (14 KB), ~34 ms (0.64 MB), ~548 ms (5.1 MB). It is advisory and not functionally required; no performance improvement is claimed (see correction/validation report).
- Duplicate detection is heuristic and candidate-only (different upload timestamps → no match).
- Advisory checkpoint may produce warnings if the adapter drifts; later milestones must monitor them.
- Suite foundation still has no UI beyond the duplicate bar; full value arrives in M2b/M2c.
