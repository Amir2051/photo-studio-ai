# Milestone 2B-2 — Implementation Report

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` · **Phase:** M2B-2 only (registry, routing, consent, budget, ledger) · **Status:** implementation and verification complete; awaiting operator review

## 1. Commit hashes and branch state
- Starting HEAD: `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
- Ending HEAD: `1ecce92a04683b3dc6785b37eb36b1aeae022ede` (unchanged — no commit or push authorized)
- Branch `feature/pro-editor-professional-suite`, upstream `origin/…` → `1ecce92…`; staged index: **0 files**.

## 2. Working tree
All pre-existing work preserved: M2B-1 files (`server/ai/*` foundation, test, report), M2a implementation/reports/benchmark, generated bundle paths and stale chunks. New M2B-2 files are additive; no tracked source outside the pre-existing set was modified.

## 3. Frozen checkpoint verification
- Tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73` ✓
- Original branch `feature/pro-editor-rebuild` → `cdb1238e…` ✓
- `main` / `origin/main` → `2c4517684b5f620368ed435f583e8f2a874f4d76` ✓
No reset, clean, stash, force-push, rebase, or deletion occurred.

## 4. Files created / modified
| File | Change |
|---|---|
| `VIDEO_STUDIO_MILESTONE_2B2_BASELINE.md` | Stage A baseline report (created before implementation) |
| `server/ai/model-registry.mjs` | **Extended** M2B-1 registry: MIA display identities, provider model ID/version, modalities, pricing status/source, availability, adapter/live flags, conservative capability flags, `validateRegistry()`, `findByMiaIdentity()`; old API preserved |
| `server/ai/router.mjs` | **Created** — task taxonomy, capability + modality matching, deterministic single-model selection, MIA explanations, rejected-candidate diagnostics |
| `server/ai/consent.mjs` | **Created** — explicit consent artifacts, store, matching validator; no balance-based inference |
| `server/ai/budget.mjs` | **Created** — authoritative $0.00 pilot ceiling abstraction, reservations, confirmed-vs-unknown accounting |
| `server/ai/ledger.mjs` | **Created** — auditable attempt records with secret-field rejection |
| `server/ai/execute.mjs` | **Created** — route → live gate → consent → budget → provider → ledger orchestration; no retries, no fallback |
| `tests/m2b2-controls.test.ts` | **Created** — 16 deterministic mock-only tests |
| `VIDEO_STUDIO_MILESTONE_2B2_IMPLEMENTATION_REPORT.md` | This report |

No changes to `server/ai-gateway.mjs`, M2B-1 adapter behavior, dependencies, lockfile, env, secrets, config, or UI.

## 5. Registry contents and availability
| Internal ID | MIA identity | Provider / model | Capabilities | Pricing | Availability / live |
|---|---|---|---|---|---|
| `mistralai/mistral-nemo` | MIA Assistant | openrouter / `mistralai/mistral-nemo` | text, general chat, editing instructions only; **no** video/audio/vision/reasoning flags | operator-declared **paid**, exact price `null` / unverified | adapter-ready; `liveExecutionEnabled: false` |
| `planned/gemini-video-intelligence` | MIA Video Intelligence | none (planned, provider `null`) | all false | unknown / no source | planned, no adapter, live disabled |
| `planned/advanced-analysis` | MIA Advanced Analysis | none (provider/model `null`) | all false | unknown / no source | planned, no adapter, live disabled |

No invented price, context window, version, or capability. Dynamic `-1`/missing prices remain `unknown`, never free. `validateRegistry()` rejects duplicate IDs/identities, free classification without explicit zero prices, and live execution without adapter + verified price.

## 6. Routing behavior
- Tasks: chat, editing instructions, video understanding, scene/shot analysis, audio/dialogue, caption/transcription, complex reasoning.
- Mistral Nemo is selected only for chat and editing instructions; video/audio/complex tasks return `no_eligible_model` with the rejected candidates recorded. No substitution or fallback occurs.
- MIA-facing explanations include: "MIA Assistant can handle this … request", "MIA Video Intelligence is not enabled yet", "estimated cost is unavailable, so this request was not submitted", "needs paid processing … approval required".
- Diagnostic decisions retain provider, provider model ID, version (null), routing reason, cost class, consent requirement and rejected candidates.

## 7. Consent and spending enforcement
- Paid requests require a consent artifact matching task + model + provider; missing/mismatched consent fails with `consent_required` / `consent_mismatch`.
- A paid model with unknown price fails with `pricing_unknown` even when consent exists — no paid request is submitted without a reliable estimate.
- Free models need no paid consent.
- Budget ceiling: **$0.05 cumulative** (`MISTRAL_PILOT_CEILING_USD`), enforced server-side by reservation before execution; overspend is rejected with `budget_exceeded`; estimates are never counted as confirmed charges; unknown confirmations are labeled `unknown`.
- No automatic retries, provider switching, model fallback, or free→paid upgrade. Live execution is disabled for every registered model in M2B-2.

## 8. Ledger fields and persistence status
Recorded per attempt: request ID, timestamp, user ref, task, MIA identity, actual provider, model ID, provider model ID/version, routing reason, consent ref, prompt/completion tokens, estimated and confirmed cost, cost status (`estimated`/`confirmed`/`unknown`/`rejected`), execution status, failure category, and fallback considered/rejected flags. Ledger rejects secret-like fields (apiKey/authorization/token/secret/password/cookie).
**Persistence status: NOT DURABLE.** The ledger is an in-memory scoped abstraction (`createUsageLedger()`); counters reset on process restart. Durable server-side storage requires an approved persistence design in a later milestone. Durability is explicitly **not claimed**.

## 9. Tests executed (actual results)
| Command (cwd) | Result |
|---|---|
| `npx vitest run tests/m2b2-controls.test.ts` (root) | **16 passed** |
| `npx vitest run tests` (root) | **21 files / 131 tests passed** (M2B-1 baseline 20 / 115 → +1 file, +16 tests) |
| `npx vitest run` (`vendor/braincut`) | **35 passed + 1 skipped files, 350 passed + 1 skipped tests** (unchanged; benchmark harness skipped by design) |
| `npm run check` (`vendor/braincut`) | **0 errors, 1 pre-existing warning** |
| `npm run typecheck` (root) | **exit 0** |
| `npm run build` (`vendor/braincut`, `NODE_OPTIONS=--max-old-space-size=256`, ~478 MB free RAM) | **exit 0** — "Wrote site to build", `✔ done` |

M2B-1 tests (16) remain green within the app suite. No test was skipped, weakened, or removed. The 5 historical root-aggregate `$app/env` alias failures remain an informational harness artifact, unchanged.

## 10. Network and live-call confirmation
- **Network requests made: 0.** All M2B-2 tests injected mock `fetch` implementations; assertions verify `fetchImpl` was never called on rejection paths.
- **Live paid model requests: 0.** Live execution is disabled in the registry; `executeMiaTask` rejects before any provider call.
- `OPENROUTER_API_KEY` is not present in this process environment (presence checked only; value never printed).
- Secret-pattern scan of new `server/ai/*` sources: **0 hits**; no credentials in source, ledger, reports, Git, or browser storage.

## 11. Pilot allowance
Confirmed spend **$0.00 USD**; remaining authorized Mistral pilot allowance **$0.05 USD** — **not increased**, not spent, not reset.

## 12. Known limitations / follow-up
- Ledger and consent stores are in-memory; no durable persistence (requires approval).
- MIA UI/Control Center is not part of M2B-2 (M2B-3); no user can yet grant consent through the editor.
- Real pricing/context/capability verification from the provider catalog is not implemented; Mistral remains unverified with `liveExecutionEnabled: false`.
- Planned Video Intelligence and Advanced Analysis identities have no adapters; no live video/audio tasks.
- No live provider integration is claimed; genuine verification belongs to the separately gated M2B-4.
- Existing gateway is not yet wired to these modules (foundation/control layer only).

## 13. Rollback (non-destructive to M2B-1)
Remove only the M2B-2 additions: `server/ai/{router,consent,budget,ledger,execute}.mjs`, `tests/m2b2-controls.test.ts`, `VIDEO_STUDIO_MILESTONE_2B2_BASELINE.md`, and this report; then restore `server/ai/model-registry.mjs` from the M2B-1 version (the M2B-1 file was never committed, so keep a copy before rollback). Do **not** delete `server/ai/errors.mjs`, `provider-registry.mjs`, `providers/openrouter.mjs`, `index.mjs`, `tests/m2b1-foundation.test.ts` or any M2a/M1 artifact. No Git reset/clean is required; nothing was committed.

## 14. Final status
M2B-2 acceptance criteria (registry, routing, consent, budget, ledger, tests, no live calls) are met. **Stopping here — M2B-3 and M2B-4 are not started.** Awaiting operator review and explicit approval before any further phase.
