# M2B-6 — ZDR Endpoint Identity & Account Configuration Verification

**Date:** 2026-11-19 · **Mode:** read-only evidence gathering · **Starting point:** M2B-5 gateway consolidation report

## 1. Verified baseline and execution summary
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; branch `feature/pro-editor-professional-suite`; HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede`; remote/upstream matches.
- Frozen tag `video-studio-trial-ready-2026-11-19` and commit `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch `feature/pro-editor-rebuild` → `cdb1238e…`; `main`/`origin/main` → `2c451768…`. All unchanged.
- Working tree: staged 0; 14 modified tracked paths (pre-existing M2a/M2B work), 83 untracked paths (reports, tests, generated bundle paths, stale chunks). All preserved.
- `M2B_MISTRAL_NEMO_ZDR_GATEWAY_CONSOLIDATION_REPORT.md` read; M2B-5 implementation not repeated.
- **Executed:** one local mocked test command — `npx vitest run tests/m2b5-gateway.test.ts --reporter=verbose` → **1 file / 8 tests passed**. No other tests, no build, no network.
- `.env` and `.env.example` exist by name; their contents were **not** inspected, printed, copied, or stored. No credential/account settings access.

## 2. Endpoint identity matrix
Repository-wide search of `server/ai/*.mjs`, `server/ai/providers/*.mjs`, `server/*.mjs`, UI and reports found **no configured endpoint slug, allowlist, `provider.order`, or endpoint identifier**. The implementation intentionally uses policy filters only (`zdr`, `data_collection`, `allow_fallbacks`, `require_parameters`); the model ID `mistralai/mistral-nemo` is configured in the registry, not a specific endpoint.

| Internal endpoint name | Exact endpoint slug | Provider/model | ZDR eligibility (explicit) | Required parameters | Evidence reference | Result |
|---|---|---|---|---|---|---|
| (none configured — policy-based routing) | N/A | registry: `openrouter` / `mistralai/mistral-nemo` | Not endpoint-specific | `zdr, data_collection, allow_fallbacks, require_parameters` (request object) | `server/ai/central-gateway.mjs`, `server/ai/model-registry.mjs` | VERIFIED (configuration shape) |
| Public row: Io Net | UNKNOWN | display name only; model `mistralai/mistral-nemo` | ZDR table (display level), not exact endpoint | UNVERIFIED | `https://openrouter.ai/docs/guides/features/zdr`, retrieved 2026-11-19 | UNVERIFIED |
| Public row: DekaLLM | UNKNOWN | display name only | ZDR table (display level) | UNVERIFIED | same | UNVERIFIED |
| Public row: DeepInfra A | UNKNOWN | display name only | ZDR table (display level) | UNVERIFIED | same | UNVERIFIED |
| Public row: DeepInfra B | UNKNOWN | display name only | ZDR table (display level) | UNVERIFIED | same | UNVERIFIED |
| Public row: Parasail | UNKNOWN | display name only | ZDR table (display level) | UNVERIFIED | same | UNVERIFIED |
| Public row: Mistral | UNKNOWN | display name only | ZDR table (display level) | UNVERIFIED | same | UNVERIFIED |
| Two additional endpoints (“plus 1 more”) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | no authoritative evidence | UNVERIFIED |

**Resolution of the two unknown entries:** no authoritative public evidence was found that identifies them; they remain UNKNOWN. No slug was inferred from a display name and no allowlist was created.

## 3. Account-level ZDR verification
- Documented capability (official docs, retrieved 2026-11-19): ZDR can be enforced at account/privacy-settings level, per model group (including “All other models”), via guardrails, or per request; per-request flags can only tighten. Self-serve accounts default to allowing Safety Retention; enterprise accounts default to ZDR-only.
- **Verified account configuration: none.** No authorized account access, no credential inspection, no settings reading. Existing project reports document the capability but contain no account state.
- **Result: UNVERIFIED.** Exact evidence needed: owner-confirmed account/guardrail setting for the “All other models” group, and whether strict ZDR-only (excluding Safety Retention) is configured for the API key that will be used. No secret value needs to be shared — a boolean/statement suffices.

## 4. Routing and fallback findings (read-only source inspection)
| Control | Implementation evidence | Result |
|---|---|---|
| `zdr: true` | `central-gateway.mjs` frozen policy; `openrouter.mjs` builds `provider.zdr` and rejects if not true | VERIFIED (code) |
| `data_collection: "deny"` | policy object + adapter field + pre-transmission check | VERIFIED (code) |
| `allow_fallbacks: false` | policy object + adapter field + pre-transmission check | VERIFIED (code) |
| `require_parameters: true` | policy object; adapter adds `require_parameters` when true | VERIFIED (code) |
| Policy tampering | central gateway rejects any caller-supplied differing policy | VERIFIED (code + mocked test) |
| Missing/unknown endpoint identity | no endpoint allowlist; policy filters select dynamically; no slug is fabricated. Unknown endpoints cannot be individually verified | UNVERIFIED (endpoint-level) |
| Bypass paths | M2B-5 removed `provider.chat()` from `index.mjs` and direct OpenRouter fetch from `ai-gateway.mjs`; only `execute.mjs` calls the adapter | VERIFIED (code + test) |
| Failure fallback | `allow_fallbacks:false`, adapter fails before transmission if policy cannot be applied; no retry logic in consolidated path | VERIFIED (code); live provider behavior UNVERIFIED |

## 5. Acceptance-test coverage matrix (8 tests, re-run locally)
| # | Test name | File / case | Behavior verified | Result | Remaining gap |
|---|---|---|---|---|---|
| 1 | Compliant ZDR request construction | `tests/m2b5-gateway.test.ts` case 1 | outbound body includes `zdr:true`, `data_collection:'deny'`, `allow_fallbacks:false`, `require_parameters:true` | PASS | No live provider confirmation |
| 2 | No fallback to non-ZDR | case 2 | altered policy rejected before network | PASS | Provider honoring `allow_fallbacks:false` unverified live |
| 3 | Fail-closed no compliant endpoint | case 3 | policy application failure aborts before fetch | PASS | Real endpoint unavailability path unverified |
| 4 | Unsupported parameters | case 4 | unsupported/extra policy rejected | PASS | Exact provider error semantics UNVERIFIED |
| 5 | Both bypass paths blocked | case 5 | source scan asserts no direct adapter/fetch in legacy paths | PASS | Future code may add new paths — needs CI guard |
| 6 | Direct provider refusal | case 6 | adapter without policy throws | PASS | N/A |
| 7 | Log/ledger hygiene | case 7 | sensitive marker absent from console/ledger | PASS | Production logging config not separately audited |
| 8 | Consent/budget before transmission | case 8 | rejection recorded, zero fetches, consent/budget objects present | PASS | Live consent UI flow is M2B-3 non-live; no end-to-end paid test |

## 6. Privacy-boundary assessment
| Area | ZDR coverage | Status |
|---|---|---|
| Inference routing | ZDR filters apply to provider routing for inference only | VERIFIED (docs + code flags) |
| Application logs | Not covered by ZDR; local code stores metadata only; tests assert no prompt leakage | VERIFIED (current code) |
| Uploaded / temporary files | Not covered by ZDR; MIA UI has no upload path, image gateway endpoints return 501 | VERIFIED (current code) |
| Tools / plugins | ZDR does not cover tool/plugin backends; proposal tools act on local project only | VERIFIED (code) + DOCUMENTED (docs) |
| Provider request metadata | OpenRouter stores token counts, latency, request metadata even under ZDR | DOCUMENTED |
| Error reporting / telemetry | Gateway emits generic messages; no telemetry endpoint in inspected modules | VERIFIED (inspected code) |
| Intermediary metadata / CSAM exception | CSAM screening applies even to ZDR; flagged content may be retained | DOCUMENTED |
| Local storage / retention | Ledger/consent are in-memory; no durable storage; not protected by provider ZDR | VERIFIED (code) |

Inference-level ZDR is **not** application-wide privacy compliance.

## 7. Remaining blockers
1. Exact endpoint slugs/variants for the six public ZDR rows; two additional endpoints remain unidentified.
2. Per-endpoint `supported_parameters` and availability status.
3. Owner confirmation of account-level ZDR-only configuration for “All other models”.
4. Live behavior when all policy filters reject endpoints (documented error expectation, not observed).
5. CI guard to prevent future direct-provider paths from reappearing.

## 8. Final readiness verdicts
| Area | Verdict |
|---|---|
| 1. Code-level privacy enforcement | **PASS** |
| 2. Endpoint identity verification | **UNVERIFIED** |
| 3. Endpoint-specific ZDR eligibility | **UNVERIFIED** |
| 4. Account-level ZDR configuration | **UNVERIFIED** |
| 5. Routing and fallback enforcement | **PASS** (code-level; live behavior unverified) |
| 6. Application-wide privacy boundaries | **UNVERIFIED** (documented/assessed, not runtime-verified end to end) |
| 7. End-to-end ZDR compliance | **UNVERIFIED** — cannot be PASS while endpoint identity, endpoint eligibility, or account configuration remain unverified |
| 8. Pilot readiness | **UNVERIFIED** — no-go until blockers 1–4 are closed |

## 9. Integrity and safety confirmation
No source/config/env/credential/database change; no provider API or inference call; no account access; no deployment; no commit/push/merge/reset/clean/stash/checkout. Only the 8 local mocked tests were run and this report was created. **Provider API/inference calls: 0. Confirmed spend: $0.00 USD; pilot allowance $0.05 unchanged.** Frozen tag/commit, original branch, `main`, and all existing work preserved.

**Stopping here — no fixes, no pilot request.**
