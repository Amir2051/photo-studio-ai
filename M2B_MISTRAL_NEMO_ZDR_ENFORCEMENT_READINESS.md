# Mistral Nemo — ZDR Enforcement Readiness (closure audit)

**Date:** 2026-11-19 · **Mode:** read-only audit and verification planning · **Baseline report:** `M2B_MISTRAL_NEMO_ENDPOINT_PRIVACY_VERIFICATION.md`

## 1. Executive decision: **NO-GO for implementation**

Critical privacy requirements are **not all verifiable** today: exact endpoint slugs remain UNKNOWN, account-level ZDR-only configuration is unverified (owner-only), the exact per-endpoint behaviour of the proposed routing policy is partly undocumented, and two gateway bypass paths remain open with only proposed (not implemented) closures. Per the final decision rule, implementation cannot be authorized yet.

No provider API call was made; no tests/builds were run; no source, gateway, config, credential, or Git change was made. Confirmed spend **$0.00**.

## 2. Repository integrity (recorded before inspection)
- Repository/working dir: `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`.
- Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede`; remote/upstream matches.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch `feature/pro-editor-rebuild` → `cdb1238e…`; `main`/`origin/main` → `2c451768…`. All unchanged.
- Staged 0; modified 12; untracked 79 (pre-existing M2B work, reports, generated bundle paths, stale chunks). Nothing altered by this audit.

## 3. Endpoint evidence matrix (A)
Official public sources (retrieved earlier, not repeated): OpenRouter ZDR page `https://openrouter.ai/docs/guides/features/zdr` (Zero Retention Endpoints table), model page `https://openrouter.ai/mistralai/mistral-nemo`, provider logging table `https://openrouter.ai/docs/guides/privacy/provider-logging`, routing docs `https://openrouter.ai/docs/guides/routing/provider-selection`. A read-only search of all project reports and M2B modules found **no exact endpoint slug** anywhere — only provider display names.

| Provider (public name) | Exact endpoint slug/variant | ZDR | Safety retention | Data collection | Verdict | Evidence |
|---|---|---|---|---|---|---|
| Io Net (`io.net`) | UNKNOWN | Eligible (ZDR table) | No | Zero retention / does not train | **UNVERIFIED → not allowlist-eligible** | ZDR table + provider table; slug not published |
| DekaLLM | UNKNOWN | Eligible | No | Zero retention / does not train | **UNVERIFIED → not allowlist-eligible** | same |
| DeepInfra (row A) | UNKNOWN | Eligible | No | Zero retention / does not train | **UNVERIFIED → not allowlist-eligible** | same |
| DeepInfra (row B) | UNKNOWN | Eligible | No | Zero retention / does not train | **UNVERIFIED → not allowlist-eligible** | same |
| Parasail | UNKNOWN | Eligible | No | Zero retention / does not train | **UNVERIFIED → not allowlist-eligible** | same |
| Mistral | UNKNOWN | Eligible | No | Zero retention / does not train | **UNVERIFIED → not allowlist-eligible** | same |
| Two additional endpoints implied by “plus 1 more” (io.net, Mistral) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | **UNKNOWN → ineligible** | No reliable public evidence |

**Finding A:** exact endpoint identifiers cannot be established from public docs or project artifacts. No slug allowlist may be created. Policy-based filtering is the only evidence-supported routing approach, and it still requires account verification (below). No endpoint is independently verified to satisfy both controls at exact-endpoint level.

## 4. Account-level enforcement findings (B)
Official documentation establishes the *capability*, not our configuration:
- ZDR can be enforced globally, per model group, via guardrails, or per request (`provider.zdr: true`); per-request enforcement is an “OR” with account/guardrail settings and can only tighten, never relax.
- For the “All other models” group (which includes Mistral Nemo), the owner chooses whether ZDR-enforced requests may also use Safety Retention endpoints. Default: self-serve accounts **allow Safety Retention**; enterprise accounts **ZDR only**.
- Guardrail fields `enforce_zdr_other`, `allow_safety_retention_other`; if the account is ZDR-only, a guardrail cannot allow Safety Retention.

**Status:** `DOCUMENTED, NOT ACCOUNT-VERIFIED`. No sign-in, private settings access, or credential inspection was performed. The owner must confirm (without disclosing secrets) which ZDR/“All other models” policy is configured and whether strict ZDR-only (excluding Safety Retention) is required. Request-level `zdr: true` plus `data_collection: "deny"` can tighten routing but cannot override a lax account setting; if the account permits Safety Retention, a ZDR request may still use Safety Retention endpoints unless account/guardrail are ZDR-only or Safety Retention is explicitly excluded. **Closure:** owner confirmation + end-to-end test with a non-sensitive diagnostic that asserts the served endpoint's data policy before any prompt is submitted (test specified, not run).

## 5. Routing policy evaluation (C)
Proposed policy: `zdr: true`, `data_collection: "deny"`, `allow_fallbacks: false`, `require_parameters: true`.

Official request format (Provider Routing doc): the `provider` object in the Chat Completions request body accepts `order`, `allow_fallbacks`, `data_collection`, `zdr`, `require_parameters`; example usage:
```
provider: { zdr: true, data_collection: "deny", allow_fallbacks: false, require_parameters: true }
```
Documented semantics: `data_collection: "deny"` — only providers that do not collect user data; SDK docs state a request errors if no provider meets the requirement. `allow_fallbacks: false` disables backup providers. `require_parameters: true` — only providers supporting all request parameters. Official error list includes 400 (malformed request or unsupported parameter) and 404 (unknown model or no provider can serve).

**What is proven:** the fields and general semantics are documented; the policy shape is valid. **What is not proven (UNVERIFIED):** exact per-endpoint `supported_parameters`, whether an unsupported parameter is rejected outright or ignored when `require_parameters` is used, whether an all-filters-fail request always produces an error rather than a silent downgrade, and whether any of the six endpoints is actually available at request time. No policy was implemented or submitted.

## 6. Gateway bypass analysis (D)
| Path | Exact file / function | How it bypasses | Direct provider? | Remediation | Closure test |
|---|---|---|---|---|---|
| 1 | `server/ai/index.mjs::executeTextTask()` (lines 9–33) | Calls `getProvider(providerId).chat()` directly with a caller-supplied key; no router, consent check, budget reservation, live gate, privacy flags, or ledger record | Yes — via `server/ai/providers/openrouter.mjs` | Retire the function or wrap it so `executeMiaTask()` is the only entry point; delete/neutralize the M2B-1 test that calls it directly | Static test asserting no exported function calls `provider.chat` outside `execute.mjs`; runtime test with mocked fetch proving a call without consent/budget is rejected |
| 2 | `server/ai-gateway.mjs`, request handler inside `createAiGatewayServer()` — direct `fetchImpl('https://openrouter.ai/api/v1/chat/completions', …)` (≈lines 239–270) | For `/api/ai/chat`, validates JWT/body then sends `messages` directly to OpenRouter using `OPENROUTER_API_KEY`/`AI_DEFAULT_MODEL`, with `max_tokens: 700`, no `provider.zdr`, no `data_collection`, no router/consent/budget/ledger; fail-closed only on missing config | Yes — direct OpenRouter call | Replace the direct fetch with `executeMiaTask()`; forward structured errors; keep JWT auth; remove the second provider path | Integration test with mocked upstream asserting every outbound request carries the policy object and that no consent/budget failure can still produce a provider call |

Both paths are **BLOCKED** until remediated and tested. No source was changed.

## 7. Data-retention boundary analysis (E)
| Area | Assessment | Status |
|---|---|---|
| Application logs | Inspected `server/ai-gateway.mjs` and `server/ai/*.mjs`: no console logging of prompts/responses; ledger stores token counts only, not content | VERIFIED (source inspection only; no runtime proof) |
| Prompt/response persistence | M2B-2 ledger/consent structures contain no content fields; in-memory only. No durable store exists | VERIFIED for current code |
| Plugins / tools | Official docs: ZDR applies to provider routing for inference only, not plugins/tools. M2B proposal tools operate on local project state; no external plugin path in the MIA flow | DOCUMENTED, NOT ACCOUNT-VERIFIED (tool behaviour not runtime-tested) |
| File uploads | MIA UI has no file input; M2B gateway image endpoints return 501; no cloud media upload path active | VERIFIED for current code |
| OpenRouter metadata | Official docs: token counts, latency and request metadata are stored by OpenRouter even under ZDR; anonymous prompt categorization may occur | DOCUMENTED |
| Error / telemetry | Gateway returns generic error messages and a request ID; no telemetry endpoint found in inspected MIA modules | VERIFIED for inspected modules |
| CSAM screening | Official docs: applies to all inference including ZDR; flagged content may be retained for review/reporting. ZDR is not absolute | DOCUMENTED |

## 8. Privacy acceptance matrix
| Requirement | Status | Evidence / component | Risk | Closure test |
|---|---|---|---|---|
| Exact endpoint slugs identified | **UNVERIFIED** | Public docs + repo search; no slugs | Cannot enforce an explicit allowlist | Obtain slugs in authorized preflight; assert configured allowlist matches |
| Six endpoints ZDR-eligible (display level) | **VERIFIED** (docs) | OpenRouter ZDR table | Display ≠ exact endpoint | Per-request policy assertion in test |
| Two additional endpoints | **UNKNOWN** | Model page “plus 1 more” | Unclassified endpoints may serve traffic | Enumerate endpoints in authorized preflight; mark ineligible until classified |
| Account ZDR-only / Safety Retention setting | **DOCUMENTED, NOT ACCOUNT-VERIFIED** | ZDR docs | Lax setting permits Safety Retention | Owner confirmation + policy assertion test |
| `zdr: true` + `data_collection: "deny"` supported | **DOCUMENTED, NOT ACCOUNT-VERIFIED** | Routing docs | Unsupported param behaviour unknown | Mocked upstream test asserting outbound policy object |
| `allow_fallbacks: false` effective | **DOCUMENTED, NOT ACCOUNT-VERIFIED** | Routing docs | Silent fallback | Negative test: compliant endpoint unavailable ⇒ error, no call |
| `require_parameters: true` behaviour | **UNVERIFIED** | Routing docs | Unsupported params may be ignored | Test with unsupported parameter; expect rejection |
| No provider request without consent/budget | **BLOCKED** | Two bypass paths (§6) | Privacy policy bypassed | Closure tests in §6 |
| No prompt/response in app logs/ledger | **VERIFIED** (code) | Source inspection | Future code may add logging | Static + runtime log-scrub test |
| ZDR covers plugins/tools/external logs | **NOT APPLICABLE** (does not) | ZDR docs | False sense of protection | Documentation review + tool-path audit |
| CSAM exception understood | **VERIFIED** (docs) | ZDR docs | Retention in edge case | N/A (documentation) |
| No live calls / zero spend during audit | **VERIFIED** | This audit | N/A | N/A |

## 9. Required remediation (not performed)
1. Obtain exact endpoint slugs and per-endpoint `supported_parameters`/status via an owner-authorized preflight; keep unknowns ineligible.
2. Owner confirms account/guardrail ZDR-only policy for “All other models”.
3. Retire/wrap `executeTextTask()`; replace gateway direct fetch with `executeMiaTask()`; add the policy object to every outbound request.
4. Add closure tests from §6 and §8 before any live pilot.
5. Only then consider a separately authorized pilot under the existing $0.05 ceiling.

## 10. Proposed acceptance tests (specified, not executed)
1. **Compliant endpoint selection:** mock endpoint list with ZDR/no-collect endpoints; assert router selects one and outbound request carries both flags.
2. **No fallback:** make compliant endpoint unavailable with `allow_fallbacks: false`; assert error and zero provider calls.
3. **No compliant endpoint:** assert rejection before network when all endpoints are non-ZDR or collecting.
4. **Unsupported policy parameters:** send an unsupported parameter with `require_parameters: true`; assert documented rejection/safe handling, never silent ignore.
5. **Bypass prevention:** static and runtime tests proving no code path other than `executeMiaTask()` can reach a provider (covers both §6 paths).
6. **Log hygiene:** capture logs during a mocked task; assert no prompt/response content appears.
7. **No unauthorized persistence:** assert no tool/plugin path uploads media or stores content; ledger records contain only metadata.
8. **Provider errors/retries:** assert 400/401/402/403/404/429/502 map to structured errors and **no** automatic retry/fallback.

## 11. Exact remaining owner decisions
- Authorize an endpoint-identity preflight (documentation/listing access) to resolve the six slugs and two unknown endpoints.
- Confirm, without sharing secrets, the OpenRouter account/guardrail ZDR-only policy for “All other models” and whether strict ZDR (excluding Safety Retention) is mandated.
- Approve gateway consolidation and retirement of the M2B-1 direct path.
- Approve the acceptance-test suite before any pilot; keep the $0.05 ceiling unchanged.

## 12. Final repository integrity confirmation
Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92…`, frozen tag `cdb1238e…`, original branch and `main` unchanged; staged index 0; no source/config/env/credential/database change; no tests or builds run; no deployment. **Provider API/inference calls: 0. Confirmed spend: $0.00 USD; pilot allowance $0.05 unchanged.**

**Decision: NO-GO. Stopping here — no implementation, no credential preparation, no pilot request.**
