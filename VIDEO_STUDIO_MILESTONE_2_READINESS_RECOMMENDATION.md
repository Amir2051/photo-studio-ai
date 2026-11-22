# Milestone 2 — Readiness Recommendation (READ-ONLY)

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` at `1ecce92…` · No M2 implementation started.

## 1. Current foundation (what M1 actually delivered)
`lib/suite/*` provides: versioned `SuiteDocument` with native `payload`; media identity/duplicate/missing helpers; framework-neutral `createHistory<T>()`; strict serialization; and a legacy `.braincut` v1 adapter. It is **not wired into any runtime path** — value is unlocked only by integration.

## 2. Assessment of the requested capabilities

| # | Capability | Depends on | Risk | Notes |
|---|---|---|---|---|
| 1 | Shared project manager/lifecycle | suite adapter + storage abstraction | Medium | Can wrap existing autosave/recents first; no format change required |
| 2 | Shared media registry/asset management | media identity helpers, `sources.ts` adapter | Medium | Duplicate detection exists as pure logic; UI/registry is missing |
| 3 | Foundation integrated into editor runtime | 1 + 2, careful adapter boundary | **High** | Must not disturb verified import/save/export; do in narrow slices |
| 4 | Shared undo/redo across editor operations | bridge between immer history and `createHistory` | High | Different snapshot granularities; bridge only where needed, keep native history |
| 5 | Slip/slide/roll editing | existing `ops.ts`, timeline tests | Medium | Pure model ops + unit tests first, then UI handles |
| 6 | Ripple insert and track grouping | `ops.ts`, `timeline-interactions.ts` | Medium | Linked A/V and snapping interactions must be regression-tested |
| 7 | Configurable keyboard shortcuts | `shortcuts.ts`, `commands.ts`, preferences store | Low–Medium | Prefs schema addition with defaults; no existing bindings break |
| 8 | Caching/proxies/large-project performance | M2.1 bounded caches, capability detection | **High** | Needs real 10/30 min and 4K media; otherwise claims stay NOT VERIFIED |
| 9 | A/V sync and long-form editing | 8 + player/session work | High | Requires device/media fixtures and playback measurements |
| 10 | Mobile/PWA compatibility | capability detection, touch UI | **High** | No touch timeline today; browser filesystem/background limits are real |

Cross-cutting constraints: local-first default, hybrid/optional AI only (no mandatory paid calls), preserve `.braincut` v1, keep the frozen tag recoverable, no production/config changes.

## 3. Recommended milestone breakdown (working increments, not disconnected modules)

**M2a — Foundation integration slice (smallest useful increment).**
Wrap the existing video project open/save path with `legacyBraincutToSuiteDocument` / `suiteDocumentToProject` behind a feature flag or internal call, and drive one low-risk shared operation (e.g., media duplicate detection in the Media panel) through `suite/media`. Ship with tests proving byte-for-byte legacy compatibility and unchanged import/save/export behavior.

**M2b — Shared media registry.**
Introduce a registry service over existing `sources.ts`/identity helpers: bins, tags, favorites, search, duplicate candidates, missing/relink status. Add unit tests for identity/missing/duplicate behavior with real `.braincut` fixtures. Keep proxies/caches unchanged.

**M2c — Project lifecycle manager.**
Recent projects, autosave status, local backup/recovery, and suite-document version display; reuse existing IndexedDB persistence. No new project format on disk; suite envelope only for export/archive. Acceptance: create→edit→save→reopen across video and one other studio using the same manager surface.

**M2d — Editing depth (user-visible value).**
Slip/slide/roll, ripple insert, track grouping, configurable shortcuts and keyboard reference. Pure ops + tests first, then UI. Acceptance: undo/redo exactness, save/reopen preservation, no timeline drift, existing trial demo path still passes.

**M2e — Media performance (evidence-gated).**
Proxy switching, background thumbnail/peak generation, bounded cache tuning, long-form test protocol run with real 10/30 min and 4K media. Acceptance: measured numbers in a report; otherwise explicit NOT VERIFIED — no claims from small fixtures.

**M2f — A/V sync, long-form and mobile/PWA (separate approvals).**
Only after M2e measurements; touch timeline and device capability UX with real device testing.

## 4. Dependencies and sequencing rules
- 1 → 3 → 4: integration before cross-surface undo; never bridge history before the project boundary exists.
- 2 → 3 → 8: registry before cache/proxy work that depends on asset identity.
- 5/6/7 can proceed in parallel with 2/3 **if** confined to `ops.ts`, timeline components and preferences with tests.
- 9/10 require hardware/media fixtures; treat as evidence-gated, not calendar-driven.
- AI remains a later, optional layer: proposal/approval flow already exists in `lib/agent`; no paid provider by default.

## 5. Acceptance tests for the next increment (M2a)
1. `npx vitest run src/lib/suite` and vendor suite stay green (≥345 tests at this commit).
2. Legacy `.braincut` v1 saved by the existing editor opens unchanged after adapter integration; adapter tests cover wrap/unwrap equality.
3. Media duplicate detection in the Media panel identifies only true candidates; no auto-merge, no relink side effects.
4. Browser smoke: import → preview → timeline → save → reopen → export → playback unchanged; 0 console errors.
5. App suite 99 passed, typecheck 0 errors, production build passed.
6. Milestone report documents any new dependency, preference key, or storage key before merge.

## 6. Verdict for readiness
The M1 foundation is sound and testable but **not yet integrated**; M2a (integration slice) is the safest next increment because it converts library code into user-visible behavior while keeping the verified trial path intact. Do not begin M2 without a separate explicit implementation prompt.

**Status: READ-ONLY RECOMMENDATION — NO M2 IMPLEMENTATION PERFORMED.**
