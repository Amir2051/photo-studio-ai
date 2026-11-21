# Milestone 1 — Architecture Decisions

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite`

## ADR-1 — Additive foundation, no runtime rewrites
**Decision:** introduce `lib/suite/*` as standalone modules; do not modify any existing editor runtime file in this milestone.
**Why:** the frozen trial is a verified release; changing import/save/export paths would risk regressions for no milestone benefit. New contracts can be adopted incrementally.
**Trade-off:** no user-visible improvement yet; value is realized by later milestones.

## ADR-2 — Native document stays authoritative (`payload`)
**Decision:** `SuiteDocument` holds normalized media refs plus a verbatim copy of the native studio document in `payload`; studio parsers remain the source of truth.
**Why:** avoids a risky universal project schema across timeline, layer, and audio models, and guarantees `.braincut` v1 compatibility.
**Trade-off:** shared consumers must read normalized fields for cross-studio features and defer to `payload` for studio-specific detail.

## ADR-3 — Versioned envelope with strict validation
**Decision:** `minu-suite` v1 envelope, validated with explicit type/enum checks and loud errors; legacy `.braincut` is wrapped by an adapter, not silently upgraded on disk.
**Why:** future migrations need a version signal; silent coercion could lose edits.
**Trade-off:** one more serialization layer for suite-level documents.

## ADR-4 — Media identity = name + size + last-write
**Decision:** normalize case, floor bytes, treat missing timestamp as 0.
**Why:** matches the existing `sources.ts` relink heuristic and supports older `.braincut` files without timestamps.
**Trade-off:** files with identical name/size/time but different content can collide (rare); handled as duplicate *candidates*, not automatic merges.

## ADR-5 — Framework-neutral history stack
**Decision:** `createHistory<T>()` with plain snapshots; no Svelte/React store dependency.
**Why:** one shape usable by video, photo, and audio surfaces; trivially unit-testable.
**Trade-off:** the video editor keeps its immer-based history for now; a bridge/adapter is a later decision. Snapshot cost grows with state size — consumers should store compact state.

## ADR-6 — Keep existing engines and dependencies
**Decision:** reuse mediabunny/WebCodecs, PixiJS/WebGL2, Web Audio, idb-keyval/OPFS, Vitest; no new dependency in M1.
**Why:** all are working and tested in the frozen release; replacement requires evidence.
**Trade-off:** advanced local AI and WebGPU remain deferred.

## ADR-7 — Local-first, cloud optional
**Decision:** no network calls in new modules; cloud gateway remains fail-closed and unchanged.
**Why:** core product must work offline without accounts or keys.
**Trade-off:** shared project sync/collaboration stays a future, separately approved milestone.

## ADR-8 — Generated bundle churn excluded from the milestone
**Decision:** production build was run for verification, but rebuilt static bundle files were left uncommitted alongside the pre-existing 39 stale chunks.
**Why:** M1 changed no runtime code; committing timestamp-only bundle churn would obscure the milestone diff.
**Trade-off:** the branch working tree carries generated artifacts that must be classified in a later cleanup (never delete without approval).

## Boundaries for future milestones
- No `.braincut` v1 rewrite; any format change needs versioning, migration tests and recovery.
- No mandatory backend, accounts, or paid APIs.
- No mobile capability claims without device testing; no long-form claims without real media.
- Each future milestone must keep the frozen tag recoverable and pass the same gates recorded in the M1 test report.
