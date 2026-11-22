# Milestone 2B-1 — Server Foundation Implementation Report

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD (start and end):** `1ecce92a04683b3dc6785b37eb36b1aeae022ede` · **Phase status:** COMPLETE — AWAITING OPERATOR APPROVAL FOR M2B-2

## 1. Repository and preservation
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; remote/upstream verified at `1ecce92…`.
- Frozen tag → `cdb1238e…`; original `feature/pro-editor-rebuild` → `cdb1238e…`; `main`/`origin/main` → `2c451768…` — unchanged.
- Staged index: **0 files**. No commit, push, reset, clean, stash, or deletion.
- All M2a source, reports, benchmark harness, generated bundle files and stale chunks preserved; tracked modifications listed in Git are the pre-existing M2a/generated set, not M2B-1 changes.

## 2. Files created (all new; no existing source modified)
| File | Purpose |
|---|---|
| `server/ai/errors.mjs` | Fail-closed error taxonomy (`invalid_credentials`, `rate_limited`, `provider_timeout`, `provider_unavailable`, `provider_response`) and public error projection with no secret leakage |
| `server/ai/model-registry.mjs` | Server-side model catalog; explicit-cost classification (0/0 = free, positive = paid, missing/`-1`/unknown = **never free**); pilot `mistralai/mistral-nemo` marked operator-declared paid with **no invented price**; conservative capability flags |
| `server/ai/providers/openrouter.mjs` | OpenRouter adapter on the existing OpenAI-compatible `/chat/completions` wire format; normalized result (content, usage, model echo, cost placeholders); server-injected key; abort/timeout and HTTP status mapping |
| `server/ai/provider-registry.mjs` | Provider registry with only `openrouter` registered; unknown providers fail closed |
| `server/ai/index.mjs` | Common `executeTextTask` request/response contract returning `{ ok, ... }` or `{ ok:false, error:{code,message} }` |
| `tests/m2b1-foundation.test.ts` | 16 deterministic tests using injected mock fetch — no live calls |
| `VIDEO_STUDIO_MILESTONE_2B1_IMPLEMENTATION_REPORT.md` | This report |

Existing `server/ai-gateway.mjs`, `AiProvider`, proposal engine, tool system, MIA guardrails and MCP bridge were **left untouched**; they are the reuse boundary for later phases. No dependency, package.json, lockfile, env, secret, or config change.

## 3. Tests executed (actual results)
| Gate | Command | Result |
|---|---|---|
| M2B-1 unit tests | `npx vitest run tests/m2b1-foundation.test.ts` (root) | **16 passed** |
| Application suite | `npx vitest run tests` (root) | **20 files / 115 tests passed** (baseline 19 / 99 → +1 file, +16 tests) |
| Vendor suite | `npx vitest run` (`vendor/braincut`) | **35 passed + 1 skipped files, 350 passed + 1 skipped tests** (unchanged) |
| Framework check | `npm run check` (`vendor/braincut`) | **0 errors, 1 pre-existing warning** |
| Root typecheck | `npm run typecheck` | **exit 0** |
| Vendor production build | `npm run build` (`vendor/braincut`, `NODE_OPTIONS=--max-old-space-size=256`, free RAM ~1,479 MB) | **exit 0** — "Wrote site to build", `✔ done` |

An earlier build attempt with a 512 MB heap at ~726 MB free RAM hit the environmental Rust allocator OOM (exit 134); no dependency or build-config change was made — only the Node heap environment variable was constrained.

## 4. Security checks (verified)
- Adapter accepts the API key **only as a server-supplied argument**; missing/empty key throws `InvalidCredentialsError` before any fetch (tested).
- Source scan in tests asserts no `window`, `localStorage`, or `sessionStorage` references in `server/ai/*`, and that the test key string appears nowhere in source or results.
- Error projection returns generic, redacted messages; no headers, payloads, or credentials in errors/results.
- No live provider call was made; `OPENROUTER_API_KEY` is **not present** in this process environment (presence checked, value never printed).
- No secret written to source, logs, reports, Git, or browser storage.

## 5. Provider integration status
- **OpenRouter adapter implemented and mocked-tested** against the OpenAI-compatible chat-completions path with model `mistralai/mistral-nemo`, `max_tokens: 500`, `stream:false`.
- Response normalization records provider-echoed model ID, prompt/completion token counts, and `cost: { estimate: null, confirmed: null }` with `pricingKnown:false` — no estimated cost is asserted as real.
- **Genuine live integration: NOT VERIFIED** (M2B-4 is a separate gated phase; no credential present; no paid call authorized in this phase).

## 6. Usage / cost status for the authorized pilot
| Metric | Value |
|---|---|
| Live requests made | 0 |
| Input / output tokens used | 0 / 0 |
| Confirmed cost | $0.00 USD |
| Remaining authorized pilot allowance | **$0.05 USD** (untouched) |

## 7. Known limitations / out of scope for M2B-1
- No task router, consent gate, spending ledger, budgets or entitlements yet — these are M2B-2.
- No MIA/editor UI wiring, model selector, or Control Center yet — M2B-3.
- Existing gateway is not yet wired to the new adapter; the common contract is foundation-only.
- Pilot model price is unknown (declared paid, no invented number); capability flags are conservative pending catalog verification.
- Build in this environment requires a constrained Node heap; documented, not "fixed" via config.
- No live provider capability has been claimed as verified.

## 8. Rollback considerations
All M2B-1 changes are **additive new files**. Reverting M2B-1 = removing `server/ai/**`, `tests/m2b1-foundation.test.ts` and this report; no tracked source, frozen ref, generated artifact, dependency, or environment setting needs alteration. Nothing was committed, so `git restore` of pre-existing files is unnecessary.

## 9. Phase verdict
`M2B-1 FOUNDATION COMPLETE — AWAITING OPERATOR APPROVAL FOR M2B-2`

Stopping at the phase gate as authorized. M2B-2 (routing, consent and cost accounting) will not begin without explicit operator approval.
