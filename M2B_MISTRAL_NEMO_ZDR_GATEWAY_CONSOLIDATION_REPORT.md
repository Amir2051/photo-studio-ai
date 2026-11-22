# M2B-5 — ZDR Gateway Consolidation Report

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede` (no commit made)

## 1. Before / after architecture
**Before:** three independent inference paths — (a) `server/ai/index.mjs::executeTextTask()` called a provider adapter directly; (b) `server/ai-gateway.mjs::createAiGatewayServer()` performed its own OpenRouter `fetch()`; (c) M2B-2 `executeMiaTask()` enforced consent/budget/ledger but was not the sole entry point.
**After:** one boundary — `server/ai/central-gateway.mjs` → `executeMiaTask()` → provider registry → OpenRouter adapter. Both legacy paths delegate to it; the HTTP gateway has no provider-specific fetch. Live execution remains disabled in the registry, so all paths fail closed before network.

## 2. AI inference entry-point inventory (call graph)
| Entry point | Route | Policy enforcement |
|---|---|---|
| `MiaControlCenter.tsx` | imports registry/router/budget only | **No execution path**; no consent creation |
| `executeTextTask()` (`server/ai/index.mjs`) | → central gateway → executeMiaTask | Consent/privacy/budget/live gate/ledger |
| `createAiGatewayServer()` `/api/ai/chat` (`server/ai-gateway.mjs`) | JWT + origin + rate limit → central gateway | Same gates; no direct provider fetch |
| `executeMiaTask()` (`server/ai/execute.mjs`) | router → live gate → consent → budget → adapter → ledger | Central policy object required |
| `createOpenRouterAdapter().chat()` | only called by executeMiaTask | Injects `provider.zdr/data_collection/allow_fallbacks/require_parameters` |
| `server/mia-proxy.mjs` | local MIA service (`/v1/chat`, vision endpoints) | Separate local service proxy, **not** an OpenRouter/paid-provider path; unchanged, documented as out of paid-provider scope |

Direct OpenRouter URL now appears only in the adapter's base URL constant. No `provider.chat()` call remains outside `execute.mjs`.

## 3. Bypass remediation
- **Path 1 — `server/ai/index.mjs::executeTextTask()`:** removed direct `getProvider(...).chat()`; now delegates to `createCentralGateway(...).run()` with the public `{ ok, ... }` shape preserved. Without consent/live enablement it returns `live_execution_disabled` and makes zero network calls.
- **Path 2 — `server/ai-gateway.mjs` HTTP handler:** removed the direct `fetchImpl('https://openrouter.ai/api/v1/chat/completions', …)` block; now calls the central gateway with the server config key and verified user ID. Policy failures map to 503 (or 429 for rate limiting), no provider request. JWT/origin/rate-limit/501 endpoint behavior preserved.

## 4. Files changed / created
Modified: `server/ai/index.mjs`, `server/ai/execute.mjs`, `server/ai/providers/openrouter.mjs`, `server/ai-gateway.mjs`, `tests/m2b1-foundation.test.ts`, `tests/m2b2-controls.test.ts`, `tests/aiGateway.test.ts` (legacy expectations tightened, not removed).
Created: `server/ai/central-gateway.mjs`, `tests/m2b5-gateway.test.ts`, this report.
No environment, credential, database, dependency, or UI files changed.

## 5. Routing policy enforcement
`MIA_PRIVACY_POLICY = { zdr:true, dataCollection:'deny', allowFallbacks:false, requireParameters:true }` is frozen and applied by the central gateway. Any caller-supplied policy that differs is rejected (`privacy_policy_mismatch`); `executeMiaTask` rejects absent/incomplete policy (`privacy_policy_missing`); the adapter refuses to transmit if the final provider object lacks ZDR/deny/no-fallback. No silent downgrade, fallback, or alternate adapter. Endpoint slugs are **not** hard-coded.

## 6. Privacy and logging protections
- Policy flags are request-level only; OpenRouter account-level ZDR configuration remains UNVERIFIED and is not claimed.
- Ledger remains metadata-only: no prompts, completions, headers, or keys. Tests assert a sensitive marker never appears in logs or ledger records.
- Gateway errors are generic; no raw provider payloads or credentials are returned. Secret-pattern scan of `server/ai*` and gateway: 0 hits. No credential value was inspected.
- Out-of-scope data paths (app logs, plugins/tools, file uploads, OpenRouter metadata, CSAM screening) remain documented in prior reports; no ZDR overclaim is made.

## 7. Acceptance test results (all mocked, zero provider calls)
| Test | Result |
|---|---|
| `tests/m2b5-gateway.test.ts` (8 new tests) | **8 passed** |
| `npx vitest run tests` (root) | **23 files / 152 tests passed** (baseline 144 → +8) |
| `npx vitest run` (`vendor/braincut`) | **35 passed + 1 skipped files, 350 passed + 1 skipped tests** |
| `npm run typecheck` (root) | **exit 0** |
| `npx tsc -b` + `npx vite build` | **exit 0 / exit 0** |

The 8 tests cover compliant request construction, policy-tamper rejection, fail-closed policy application, unsupported parameters, both bypass closures (static + runtime), direct-provider refusal, log/ledger hygiene, and consent/budget enforcement before transmission. No test was skipped, removed, or weakened; legacy gateway tests were updated to assert fail-closed behavior instead of the removed direct call.

## 8. Remaining blockers (unchanged)
Exact endpoint slugs; the two unidentified endpoint rows; account-level ZDR-only configuration; per-endpoint `supported_parameters`; behavior when all filters reject endpoints. Live execution is still disabled, so end-to-end provider behavior is unverified.

## 9. Security limitations
Code-level enforcement cannot prove OpenRouter account/guardrail behavior, actual endpoint eligibility, or that a future live request will be served by a compliant endpoint. `mia-proxy.mjs` remains a separate local-service path outside paid-provider scope. No automatic retries exist in the consolidated path; provider retry semantics were not tested live.

## 10. Rollback
All changes are uncommitted. Revert by restoring `server/ai/index.mjs`, `server/ai/execute.mjs`, `server/ai/providers/openrouter.mjs`, `server/ai-gateway.mjs` and the three legacy test files from HEAD, then deleting `server/ai/central-gateway.mjs`, `tests/m2b5-gateway.test.ts` and this report. Frozen tag/original branch/main require no action. No database or generated-artifact changes to reverse.

## 11. Git integrity
Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92…`, remote matches; frozen tag and commit `cdb1238e…`, original branch and `main` `2c451768…` unchanged. No commit/push/merge, no reset/clean/stash, no deployment; pre-existing modified and untracked work preserved.

## 12. Provider calls and spend
**Provider API/inference calls: 0** (all tests use mocked fetch). **Confirmed spend: $0.00 USD**; pilot allowance remains **$0.05**, not increased or spent.

## Final decision
**Code-level privacy enforcement: PASS** — one central policy boundary; both bypasses closed with tests.
**End-to-end ZDR compliance: NO-GO** — account-level/endpoint-level evidence remains unresolved and no live verification is authorized.

**Stopping here — no provider calls, no credential preparation, no pilot request.**
