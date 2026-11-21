# M2B-4A — MIA Live Provider Readiness Report

**Date:** 2026-11-19 · **Stage:** read-only audit and planning (no execution, no network, no changes) · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`

## 1. Verified repository baseline
- Root: `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; remote/upstream `origin/feature/pro-editor-professional-suite` → `1ecce92…`.
- Staged index: **0**; unstaged tracked: 12; untracked: 77 (M2B-1/2/3 files, reports, generated bundle paths, stale chunks). All preserved.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch `feature/pro-editor-rebuild` → `cdb1238e…`; `main`/`origin/main` → `2c451768…`. All unchanged.
- Test/build config inspected: root scripts (`test: vitest run tests`, `typecheck: tsc --noEmit`, `build: build:video-studio && tsc -b && vite build`), Vite proxy `/api/ai` → `127.0.0.1:18787`, root Vitest + jsdom via test-file docblocks, vendor Vitest suite (35 files, 1 skipped harness).
- Reports read: `VIDEO_STUDIO_MILESTONE_2B2_IMPLEMENTATION_REPORT.md`, `VIDEO_STUDIO_MILESTONE_2B3_IMPLEMENTATION_REPORT.md`.

## 2. Files and modules inspected
`server/ai/{model-registry,router,consent,budget,ledger,execute,index,provider-registry,errors}.mjs`, `server/ai/providers/openrouter.mjs`, `.d.mts` declarations, `server/ai/tests` counterparts (`tests/m2b1-foundation.test.ts`, `tests/m2b2-controls.test.ts`, `tests/m2b3-ui.test.tsx`), `src/components/MiaControlCenter.{tsx,css}`, `src/pages/Home.tsx`, `src/editor/EditorToolbar.tsx`, `server/ai-gateway.mjs`, `vite.config.ts`.

## 3. M2B-2 / M2B-3 integration assessment (verified vs gap)

| Question | Finding |
|---|---|
| Registry identifies intended Mistral model? | **Verified:** one entry `mistralai/mistral-nemo`, provider `openrouter`, MIA identity `MIA Assistant`, `declaredCost: paid`, prices `null`, `pricingStatus: unverified`, `adapterAvailable: true`, `liveExecutionEnabled: false`, capabilities limited to text/chat/editing instructions. Identity is unambiguous; verification metadata is **absent**. |
| Provider/model identity consistent? | **Verified:** registry, router decisions, consent validator and ledger all carry provider ID + provider model ID; UI diagnostics display them. Diagnostics never overwrite user-facing MIA identity. |
| Execution only through intended orchestration? | **Partial / GAP:** `executeMiaTask()` enforces route → live gate → consent → budget → provider → ledger. **But** M2B-1 `server/ai/index.mjs::executeTextTask()` still calls `provider.chat()` directly with no route/consent/budget/live checks; it is currently used only by M2B-1 tests and is **not wired** to any gateway/UI. It must be retired or wrapped before live activation. |
| Gateway can integrate without a second path? | **GAP:** `server/ai-gateway.mjs` has its own direct `fetch('https://openrouter.ai/api/v1/chat/completions')` using `OPENROUTER_API_KEY`/`AI_DEFAULT_MODEL` (fail-closed without config). That is a second execution path bypassing M2B-2. Consolidation is required. |
| UI reflects execution/failure states? | **Verified for M2B-3 scope:** non-live badge, model statuses, routing explanations, consent-required message, budget labels, in-memory label, diagnostics. No success or execution state is shown because no execution exists. Real execution statuses must be added in M2B-4B. |
| Planned models non-executable? | **Verified:** both planned identities have `availability: planned`, `adapterAvailable: false`, all capabilities false, live disabled; router rejects their tasks. |
| Bypass paths from UI/other code? | **Verified:** `MiaControlCenter.tsx` imports only pure registry/router/budget modules; it never imports `execute.mjs`, consent creation, or adapters. No UI bypass today. The two server-side gaps above are the only identified bypass candidates. |

## 4. Mistral model and pricing verification checklist (pre-live)
**Constraint:** this stage had no network authorization; no official documentation was fetched. Therefore every external fact below is **UNKNOWN** until verified in M2B-4B. Registry values are recorded as *declared*, not verified.

| Field | Current value / status | Evidence required before live |
|---|---|---|
| Exact provider | `openrouter` (registry, declared) | Official provider docs / account configuration |
| Exact model identifier | `mistralai/mistral-nemo` (registry, declared) | Official model catalog entry; confirm slug resolves |
| Model availability/lifecycle | UNKNOWN | Official catalog + status page; deprecation policy |
| Input price per token | UNKNOWN (`pricing.promptPerToken = null`) | Official current pricing page/catalog snapshot with timestamp |
| Output price per token | UNKNOWN (`completionPerToken = null`) | Same |
| Additional fees/billing conditions | UNKNOWN | Official billing terms; credit purchase fee, minimums, currency |
| Context window | UNKNOWN (`contextWindow = null`) | Official model card only |
| Input modalities | Declared `text` only | Official model card; do not assume image/audio |
| Output modalities | Declared `text` only | Official model card |
| Streaming requirement | UNKNOWN / not required by current adapter | Adapter uses `stream:false`; decide if needed |
| Rate limits | UNKNOWN | Official account/provider limits |
| Authentication | Server-side `OPENROUTER_API_KEY` in gateway config (pattern verified; key absent here) | Official auth docs; key provisioning by owner |
| Data retention / privacy | UNKNOWN | Official provider terms; consent wording must reflect them |

**Blocking rule:** no paid request until price and billing basis are verified, consent carries that price basis, and the budget reservation can be calculated. Unknown price ⇒ fail closed (already implemented in `requirePaidConsent`).

## 5. Durable consent architecture proposal (NOT IMPLEMENTED)
Proposal (no tables/migrations/storage created):
- Record fields: consent ID, user/account ref (from verified JWT subject), exact task, MIA identity, actual provider ID, actual provider model ID, model version, approval timestamp, pricing basis + pricing-verification version, maximum approved cost/request budget, expiration time, revocation state, execution/attempt ID linkage, audit metadata (source, reason, actor).
- Invalidation: consent is bound to a hash of `{task, provider, model, pricingVersion}`. Any change to task, model, provider, or price invalidates it and requires fresh approval. Expired, revoked, or already-consumed consent cannot authorize another request. One consent per single execution attempt (no blanket approval).
- Storage: server-side durable store approved by owner (existing project storage conventions preferred); encrypt/limit access; never log or expose credentials; consent IDs (not secrets) flow to UI and ledger.
- Unknown price ⇒ no consent can be issued for paid execution until pricing is verified.

## 6. Durable usage-ledger architecture proposal (NOT IMPLEMENTED)
Proposal (no persistence implemented):
- Lifecycle states: `requested → reserved → submitted → confirmed | failed | unknown → reconciled`. A timed-out request remains `unknown` (never free, never zero) until provider reconciliation resolves it.
- Fields: unique attempt ID (idempotency key), request ID, user ref, task, MIA identity, provider/model/version, routing decision + reason, consent ID, pricing version, estimated cost, reserved amount, provider usage metadata (token counts when supplied), confirmed cost, state, timestamps, failure category, fallback considered/rejected flags.
- Idempotency: reject duplicate attempt IDs before reservation; reservations expire after a bounded TTL and are released on pre-submit failure or explicit cancellation. Only confirmed provider data advances to `confirmed`; estimates never do.
- Reconciliation: periodic owner-authorized job fetches provider usage and matches attempt IDs/request IDs; unmatched `unknown` attempts remain flagged, never silently resolved to $0.
- Durable storage: server-side store approved by owner; no new database dependency without approval.

## 7. Gateway integration proposal (minimal, NOT IMPLEMENTED)
1. Keep `executeMiaTask()` as the **only** execution path; route the existing `/api/ai/chat` handler (or a new `/api/ai/mia` endpoint) through it after JWT verification.
2. Retire or wrap `server/ai/index.mjs::executeTextTask()` so it cannot call a provider without M2B-2 gates.
3. Remove/guard the gateway's direct OpenRouter `fetch` so it cannot bypass routing, consent, budget or ledger; reuse `server/ai/providers/openrouter.mjs`.
4. Supply credentials server-side only from gateway config; reject requests when absent before network.
5. Map structured errors (`consent_required`, `pricing_unknown`, `budget_exceeded`, `rate_limited`, `provider_timeout`, etc.) to safe HTTP responses for MIA.
6. Record every attempt in the ledger; keep provider diagnostics in admin-only responses.
7. UI consumes execution status/attempt IDs; no client-side provider call path.

## 8. $0.05 pilot verification protocol (PROPOSAL — do not execute in 4A)
- Ceiling: **$0.05 cumulative**, unchanged. Current confirmed spend **$0.00**; remaining **$0.05** (no authorized request has consumed it).
- Exact model: `mistralai/mistral-nemo` only; task: one synthetic short text prompt (e.g., "Return the word 'ok'"), max 500 output tokens.
- Preflight: verify official current price + billing conditions; compute estimate; confirm `liveExecutionEnabled` explicitly for this pilot only; verify credentials server-side.
- Require explicit task/model/provider-specific consent carrying the verified price basis.
- Reserve estimated cost in the authoritative budget before submission; reject if it would exceed remaining allowance.
- Submit **one** request through `executeMiaTask()` with no retry and no fallback; record request ID, provider usage and any confirmed cost.
- Post-request: reconcile provider usage; update ledger; report actual tokens/cost and remaining allowance.
- Stop conditions: unknown/unverifiable pricing, price change, credential failure, rate limit, malformed response, timeout with unknown outcome, any estimate above remaining allowance, or any unexpected usage. Stop immediately; no additional calls without new approval.

## 9. MIA Video Intelligence / Advanced Analysis readiness (planned, non-executable)
- **Video Intelligence:** needs verified video-input and audio/dialogue capability, timestamped observations, long-video strategy (segmentation/proxies), supported formats/size limits, and cost model. No provider selected; Gemini-family is only a planning note. Keep `planned`, no adapter, no live execution.
- **Advanced Analysis:** needs verified complex-reasoning and long-context capability, structured output, evidence grounding, and latency/cost bounds. No provider selected; no imaginary adapter. Keep `planned`.
- Neither identity may execute or be represented as available in M2B-4B without evidence and owner approval.

## 10. Security and testing gap analysis
Existing coverage (reported, not re-run here): M2B-1 16 tests, M2B-2 16 tests, M2B-3 13 UI tests; app 144, vendor 350 + 1 skipped; typecheck 0 errors.
Gaps for M2B-4B tests: expired/revoked consent; pricing-version change invalidation; duplicate attempt idempotency; timeout-with-unknown-outcome accounting; provider auth failure and rate limiting via the gateway; malformed provider responses; gateway bypass prevention (including `executeTextTask` removal); ledger reconciliation; UI status consistency for `submitted`/`unknown`/`reconciled`; secret leakage in gateway error bodies. No live provider test may be used to prove routing logic.

## 11. Prioritized M2B-4B plan (PROPOSAL, not started)
1. Owner decisions: approve official-doc verification with network access; provide/provision credentials server-side; approve durable consent + ledger storage; approve gateway consolidation.
2. Verify Mistral model facts from official docs; record pricing version; update registry with verified metadata (no invented values) only after verification.
3. Retire/wrap the M2B-1 direct execution path and the gateway's direct OpenRouter fetch.
4. Implement durable consent + ledger behind approved storage abstraction; keep single `executeMiaTask` gate.
5. Wire gateway to `executeMiaTask` with structured errors and admin diagnostics; add gateway bypass tests.
6. Enable pilot live execution for exactly one model under the protocol in §8; reconcile and report.
7. Reassess Video Intelligence / Advanced Analysis with evidence before selecting providers.

## 12. Blockers and owner decisions required
- Authorization to consult official provider documentation (network) and to record verified pricing.
- Credential provisioning without pasting secrets into source/chat; confirm where the server key lives.
- Approval of durable storage for consent and ledger (no schema changes permitted in 4A).
- Approval to modify the gateway and retire the M2B-1 direct call path.
- Explicit authorization for the single $0.05 pilot request after preflight verification.

## 13. Exact confirmation of what was and was not executed
**Executed in 4A:** read-only Git inspection (`status`, `rev-parse`, `log`, `tag`, `ls-remote`, `diff` counters), file reads, and creation of this report only.
**Not executed:** no provider/model API request; no network request of any kind; no free or paid test call; no live execution flag change; no adapter or gateway modification; no credential/env change; no budget change (still $0.00 confirmed / $0.05 remaining); no database/schema/storage implementation; no test suite or build run; no commit/push; no M2B-4B work.

**Verdict:** `M2B-4A READINESS AUDIT COMPLETE — OWNER DECISIONS REQUIRED BEFORE M2B-4B` (planning status only; no live operation authorized or performed).

**Stopping and awaiting owner review.**

---

## 14. Official-documentation findings (appended 2026-11-19 — M2B-4B preparation)

**Scope:** owner-authorized official-documentation research only. No provider API/inference call was made; no credential was inspected or changed; no code, gateway, environment, budget, or Git state was modified. The only network access was to public official documentation pages listed below.

### 14.1 Official sources and retrieval date
| Source | URL | Retrieved |
|---|---|---|
| OpenRouter model page (canonical doc) | `https://openrouter.ai/mistralai/mistral-nemo` and `https://openrouter.ai/mistralai/mistral-nemo/llms.txt` | 2026-11-19 |
| Mistral AI announcement — Mistral NeMo | `https://mistral.ai/news/mistral-nemo` | 2026-11-19 |
| OpenRouter — Zero Data Retention | `https://openrouter.ai/docs/guides/features/zdr` | 2026-11-19 |
| OpenRouter — Provider routing (`zdr`, `data_collection`) | `https://openrouter.ai/docs/guides/routing/provider-selection` | 2026-11-19 |
| OpenRouter — Data collection / privacy | `https://openrouter.ai/docs/guides/privacy/data-collection` | 2026-11-19 |
| OpenRouter — Pricing | `https://openrouter.ai/pricing` (referenced by the model page; not re-fetched in this pass) | referenced |

### 14.2 Verified facts (official docs)
- **Model identity:** `mistralai/mistral-nemo` — “Mistral: Mistral Nemo”; Mistral AI states Mistral NeMo is a **12B model built in collaboration with NVIDIA**, released under Apache 2.0 weights (base and instruct).
- **Context:** Mistral AI documents a context window of **up to 128k tokens** (= 131,072 tokens). The exact context value advertised on the OpenRouter listing was not present in the retrieved document — see unresolved items.
- **Capabilities:** multilingual text model, strong in English, French, German, Spanish, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi; trained for function/tool calling. OpenRouter lists `tools`, `tool_choice`, `response_format`, `temperature`, `max_tokens`, `seed`, `stream` among accepted parameters for this listing — tool/function calling is therefore **provider-dependent**, not guaranteed on every route.
- **Modality classification:** text input / text output. **Not a video- or audio-understanding model.** It must not be routed to MIA Video Intelligence tasks or transcription/audio tasks.
- **Endpoint contract:** `POST https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer …`, `model: "mistralai/mistral-nemo"`, optional `stream`; non-stream response carries `choices[0].message.content` and `usage.{prompt_tokens, completion_tokens, total_tokens, cost}` when provided. Errors: 400/401/402/403/404/429/502 (failed generations are documented as not billed).
- **EU routing (informational):** available via `eu.openrouter.ai` (Mistral endpoint, Business/Enterprise plan) with fail-closed regional routing. Not part of the current pilot plan.

### 14.3 OpenRouter provider-specific pricing table (retrieved 2026-11-19)
Standard variant, per 1M tokens, as published on the model page (pay-as-you-go; OpenRouter states no markup on provider inference price):

| Provider endpoint | Input $/M tokens | Output $/M tokens |
|---|---:|---:|
| io.net | 0.01656 | 0.0216 |
| DekaLLM | 0.018 | 0.03 |
| DeepInfra | 0.0232 | 0.024 |
| DeepInfra (alternate) | 0.029 | 0.03 |
| Parasail | 0.03 | 0.03 |
| Mistral | 0.15 | 0.15 |
| Mistral (EU in-region) | 0.15 | 0.15 |

Documented range across listed providers: input **$0.01656–$0.15/M**, output **$0.0216–$0.15/M**.
**Weighted average: UNKNOWN** — the retrieved official page did not expose a single weighted-average figure, so none is invented here.
**Warnings:** prices can change; the actual serving provider is selected by OpenRouter routing (price, throughput, latency, reliability and request constraints), so the **actual price depends on the route chosen**. Provider lists on the page were partial (“plus 1 more; see the model page for the full price list”). Credit-purchase fees/billing conditions must be re-verified from `https://openrouter.ai/pricing` before the pilot.

### 14.4 Privacy / routing controls (official docs)
- `provider.zdr: true` — restricts inference routing to ZDR endpoints; Safety Retention endpoints are additionally eligible only if account/guardrail settings allow them. Per-request setting is an “OR” with account/guardrail enforcement and cannot weaken it.
- `provider.data_collection: "deny"` — only providers that do not collect user data; documented behavior when no provider meets the requirement is an **error** (fail-closed). Default is `"allow"`.
- OpenRouter states that when a provider/endpoint policy cannot be established it conservatively assumes retention and training; endpoint-specific policy may differ from a provider's default, so **ZDR eligibility must be verified for the exact endpoint** serving `mistralai/mistral-nemo` — do not assume all Mistral Nemo providers qualify.
- OpenRouter states it does not store prompts/responses by default (opt-in logging / product-improvement settings off by default), but stores request metadata (tokens, latency), performs anonymous input categorization when not opted in, and has a documented CSAM-screening exception including ZDR traffic.
- **Required fail-closed behavior for M2B-4B:** configure `data_collection: "deny"` and, if strict ZDR is required, `zdr: true`, with no automatic provider fallback (`allow_fallbacks: false`). If no endpoint satisfies the configured privacy requirement, the request must error before submission — no silent relaxation, no alternate provider.

### 14.5 Verified vs unresolved
**Verified:** model identity and 12B/NVIDIA origin, 128k context claim, text/multilingual/function-calling capabilities, not video/audio, endpoint and error contract, per-provider price points above, routing/privacy controls and their documented fail-closed semantics.
**UNKNOWN / unresolved:** exact OpenRouter listing context field; weighted-average price; full provider list (page truncated); exact provider rate limits for this model; lifecycle/deprecation status of the OpenRouter listing; ZDR eligibility of the exact endpoint(s) that would serve the pilot; current credit-purchase fee/billing conditions; provider data-retention terms for the chosen endpoint. All must be established with explicit preflight verification before live execution.

### 14.6 Remaining pre-live blockers (unchanged plus new)
- Owner decision: authorize the exact privacy posture (`data_collection: "deny"` and whether strict `zdr: true` is required), acknowledging that ZDR-only may make some Mistral Nemo endpoints unavailable and the request must then fail.
- Verify ZDR eligibility for the exact endpoint, current price/route and full provider list before consent can cite a price basis.
- Resolve the two bypass paths identified in §3 (M2B-1 direct `executeTextTask`, gateway's direct OpenRouter fetch) before enabling any execution.
- Credentials, durable consent/ledger, and gateway changes remain owner-gated. No live pilot request is authorized by this documentation update.

### 14.7 Execution confirmation
Official documentation pages listed in §14.1 were fetched for research. **Provider API/inference calls: 0. Free or paid model requests: 0. Project execution/tests/builds: 0. Credential/environment/config/Git changes: 0. Confirmed spend: $0.00 USD; remaining M2B-4A pilot allowance: $0.05 USD (unchanged).** No live model activation occurred.

