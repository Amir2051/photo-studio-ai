# Independent Security Review — Temporary Single-Use OpenRouter Authorization

**Date:** 2026-11-20 · **Mode:** read-only; no provider request · **Final status:** `SECURITY_REVIEW_COMPLETE` · **Live-test decision:** `NOT_AUTHORIZED`

## 1. Executive summary
The M2B-2 implementation report's core claims are substantiated by source and tests: the persistent live gate remains `false`; a single in-memory grant is consumed synchronously at the final adapter boundary; the request is bound to OpenRouter / `mistralai/mistral-nemo` / the exact chat-completions endpoint / exact prompt / 32 tokens / strict ZDR policy; 20 offline tests and 172 total app tests pass. Three non-critical gaps remain: human-initiator identity is not code-enforceable, the $0.001 ceiling is a caller-supplied sanity check rather than a computed cost estimate, and the grant issuer exposes an injectable clock that can extend the nominal five-minute window. None of these permits an OpenRouter request without the in-memory grant, and none permits a second request. This review does **not** authorize a live test.

## 2. Repository identity and integrity
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; branch `feature/pro-editor-professional-suite`; HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede`; remote/upstream matches.
- Frozen tag/commit `cdb1238e…`; original branch and `main` unchanged; staged index empty; 14 modified tracked; 91 untracked at start and end.
- Only this report was created. No source/test/env/config/database changes; no Git operations; no deployment.

## 3. M2B-2 report assessment
| Claim | Independent result |
|---|---|
| 20 new offline tests | VERIFIED (`tests/m2b2-temporary-auth.test.ts`, 20 cases) |
| 172/172 app tests | VERIFIED (re-ran `npx vitest run tests` → 24 files / 172 tests) |
| Typecheck passing | VERIFIED in prior implementation; not re-run in this review (read-only scope) |
| Atomic single-use consumption at final adapter | VERIFIED (source + concurrency test) |
| In-memory grant, 5-minute expiry | VERIFIED, with caveat F-03 (injectable clock) |
| Exact provider/model/endpoint/prompt/purpose/source/PID/token/cost bindings | VERIFIED |
| No retries/fallback | VERIFIED (source + tests) |
| Persistent gate false | VERIFIED |
| Zero real network requests | VERIFIED for tests (mock transports; one loopback HTTP server only in `aiGateway.test.ts`) |

## 4. Complete provider call graph
```
local caller (test harness / CLI code)
  -> server/ai/central-gateway.mjs::run()
  -> server/ai/execute.mjs::executeMiaTask()   [isGrantCandidate() lets gate pass; NO consumption]
  -> server/ai/provider-registry.mjs::getProvider('openrouter')
  -> server/ai/providers/openrouter.mjs::chat()
       -> consumeTestGrant()  [AUTHORITATIVE, synchronous, before key use or fetch]
       -> fetchImpl(endpoint, ...)  [only outbound OpenRouter transport]
  -> OpenRouter /api/v1/chat/completions
```
Other entry points accounted for:
- `server/ai/index.mjs::executeTextTask()` → central gateway (no independent provider call).
- `server/ai-gateway.mjs::createAiGatewayServer()` `/api/ai/chat` → central gateway; direct OpenRouter fetch removed (grep confirms no `openrouter.ai` fetch there).
- `server/mia-proxy.mjs` → `RZ_AGENT_URL` (default `https://rz-ai.safenestt.com`), a **separate local-service proxy with its own API key**, not an OpenRouter transport. Out of scope for this test but noted as a separate external AI path (F-06).
- No SDK invocation, background worker, or alternate gateway was found that can reach OpenRouter without the adapter. **All OpenRouter paths are accounted for.**

## 5. Grant integrity
- `issueTestGrant()` (single-use-auth.mjs:45-68) creates a frozen handle whose only own key is a `Symbol`; `JSON.stringify(handle)==='{}'`, so it cannot be serialized or transferred to another process. State lives in a module-level `WeakMap` plus a single `active` reference — memory only; no env/files/storage/logs/CLI.
- `consumeTestGrant()` (lines 78-117) checks: active handle identity, unconsumed state, expiry at consumption, PID/source, purpose, provider/model/endpoint, token limit, message fingerprint, policy fingerprint, cost ceiling, and no tools/attachments/retry/fallback. It then sets `consumed=true` and clears `active`.
- Browser/background requests are rejected by the `source === 'local-process'` requirement; browser clients have no route to the handle.
- Failed requests do not restore the grant; process restart loses it (fresh module instance test).
- Grant creation is callable by any local code importing the module — see F-01.

## 6. Atomic consumption and concurrency
`consumeTestGrant()` is fully synchronous: validation and `state.consumed = true` occur with no `await` between them, so in JS's single-threaded event loop at most one concurrent caller can pass. Test 13 (`Promise.allSettled` with two adapter calls sharing one grant) confirmed exactly one success and exactly one transport call. Two simultaneous `issueTestGrant()` calls overwrite `active`; the earlier handle fails `active !== handle` (denial of service only, no unauthorized request). Reentrant calls consume once. Failure after consumption (mock transport throw) leaves the grant consumed (test 14).

## 7. Process identity and human authorization
The implementation verifies only `process.pid` equality between issuance and consumption and the caller-supplied `source` string. **PID binding does not prove human identity** and does not prevent another process under the same OS user from issuing its own grant (it can import the module). Threat model:
- **Local authorized operator:** can issue a grant by running local code — intended, but identity is not attested.
- **Same-user local process:** can issue its own grant; cannot steal an existing handle from another process, but does not need to (F-01).
- **Browser client / remote client:** cannot obtain the handle; denied.
- **Background worker:** in-process code with direct access to the handle could consume it, but no such path exists in the current call graph; `source` must be `local-process`.
Smallest safe improvement (not implemented): require an explicit interactive local attestation step at issuance (e.g., operator-supplied one-time confirmation through a local-only channel) — requires owner approval.

## 8. Model and endpoint binding
Exact equality checks against `TEST_MODEL`, `TEST_PROVIDER`, `TEST_ENDPOINT` (single-use-auth.mjs:96-98; adapter lines 30-45). The adapter builds `endpoint` from `options.baseUrl`; a changed base URL produces a descriptor mismatch and fails before transmission. No caller-controlled override after authorization: the descriptor is built from the same variables used for the fetch body, with no `await` in between (no TOCTOU window within a call).

## 9. Prompt and token-limit binding
The grant stores `JSON.stringify(TEST_MESSAGES)` and the adapter computes the same fingerprint from `messages.map(({role,content})=>...)` (adapter line 38). Extra fields on message objects are ignored by both fingerprint and outbound body (line 58), so they cannot smuggle content. A different prompt is denied (test 7). `maxTokens` must equal 32 exactly (line 99); the adapter passes it to `max_tokens` (line 59). No normalization ambiguity found for the exact authorized prompt.

## 10. Cost enforcement
The `maxEstimatedCostUsd` descriptor is a **caller-supplied ceiling check** (`<= $0.001`, line 108), not a computed estimate: no input-token counting, no price catalog lookup, no system/hidden message accounting, no alias resolution, and no rounding analysis exist. The budget module reserves the ceiling, but the ceiling is passed in by the caller. Consequently the $0.001 figure is a **local estimate guard, not a provider billing guarantee**; actual charges can only be known from a provider response. Pricing is not hard-coded (adapter returns `cost: {estimate:null, confirmed:null}`). Conservative preflight recommendation: fetch current catalog pricing for the exact model, compute an upper-bound estimate from the exact prompt plus 32 output tokens, and require that value <= $0.001 before issuing the grant. Owner approval required to implement.

## 11. ZDR / privacy
- Strict policy originates from frozen `MIA_PRIVACY_POLICY` in `central-gateway.mjs` (`zdr:true`, `dataCollection:'deny'`, `allowFallbacks:false`, `requireParameters:true`) and from `TEST_POLICY` in the grant module; caller-supplied differing policy is rejected at the gateway and at consumption.
- Adapter builds `provider: {zdr:true, data_collection:'deny', allow_fallbacks:false, require_parameters:true}` (lines 65-70) and fails before transmission if any field is missing (lines 73-75).
- No alternate adapter drops these fields; no fallback path exists. No prompt/response content is logged by the adapter/ledger.
- **Distinction:** (1) source config VERIFIED; (2) final constructed payload VERIFIED by mocked test inspection; (3) provider documentation supports the parameters (official OpenRouter docs, previously retrieved); (4) actual provider enforcement UNVERIFIED; (5) end-to-end ZDR UNVERIFIED. Do not treat this as end-to-end ZDR verification.

## 12. Retry and fallback
No retry loop, attempt counter, or fallback provider exists in the adapter or gateway. `allow_fallbacks:false` is always sent; `descriptor.retry/fallback` must be false (line 111). Tests 19-20 verify source shape and denial. A transport error consumes the grant and throws once (tests 14). No second request is possible from the current code.

## 13. Offline test assessment
Established before execution: all OpenRouter transports are mocked (`fetchImpl` or `mockTransport()`), no test loads credentials, no test contacts a provider, `aiGateway.test.ts` uses a local loopback HTTP server with a mocked upstream, and tests only mutate in-memory state. Re-ran `npx vitest run tests` → **24 files / 172 tests passed** (no external network). The reported result is reproducible.

## 14. Credential-path status
`C:\Users\yayam\Documents\openrouter.env.txt` exists: **NO** (rechecked; consistent). Credential contents accessed: **NO**. No credential loaded or copied.

## 15. Findings ranked by severity
| ID | Severity | Status | Location | Scenario / consequence | Unauthorized request? | Second request? | Remediation / owner approval |
|---|---|---|---|---|---|---|---|
| F-01 | MEDIUM | VERIFIED (limitation) | `single-use-auth.mjs:45-68` | Any local code can issue a grant; PID binding does not prove human identity. Operator intent is not code-attested. | Yes, by local code with module access | No | Interactive local attestation at issuance; **owner approval required** |
| F-02 | MEDIUM | VERIFIED (behavior), UNRESOLVED (risk) | `single-use-auth.mjs:108`; `central-gateway.mjs` | $0.001 ceiling is a caller-supplied sanity check, not a computed estimate; no price/token accounting. Cannot guarantee billing cap. | No | No | Compute estimate from verified catalog + exact prompt/32 tokens before grant; **owner approval required** |
| F-03 | LOW | VERIFIED | `single-use-auth.mjs:45,62-63` | `now` injection in `issueTestGrant` can set a far-future `expiresAt` while TTL is clamped; nominal 5-minute window can be bypassed by local callers. | No (grant still required) | No | Remove `now` from production API or clamp absolute expiry; **owner approval required** |
| F-04 | LOW | VERIFIED | `single-use-auth.mjs:29` | A second grant overwrites `active`; first becomes unusable (denial only). | No | No | Optional queue/reject-second-grant behavior; **owner approval required** |
| F-05 | INFORMATIONAL | VERIFIED | `tests/helpers/one-shot-grant.ts` | Test helper issues grants without human attestation; test-only, not a production path. | No | No | None |
| F-06 | INFORMATIONAL | VERIFIED | `server/mia-proxy.mjs:140-184,210` | Separate external AI transport (`RZ_AGENT_URL`) with its own key; not OpenRouter and not covered by this grant. Broader privacy review must account for it. | No (different service) | No | Document in global privacy model; **owner approval** for any change |

No CRITICAL or HIGH findings. No verified vulnerability permits an OpenRouter request without the in-memory grant or permits a second request.

## 16. Required remediation
Only if owner approves: F-01 interactive attestation, F-02 computed estimate, F-03 clock hardening. None is required to conclude this review; all require source changes, which this task forbids.

## 17. Remaining blockers
Human identity attestation; reliable pre-transmission cost estimation; expiry clock hardening; endpoint-level `data_collection:"deny"` provider behavior still unproven without a live request; credential file currently absent.

## 18. Live-test readiness decision
`NOT_AUTHORIZED` — this review is read-only and does not grant permission to transmit a request. Code-level controls are PASS; end-to-end ZDR and provider billing remain UNVERIFIED.

**Final status: `SECURITY_REVIEW_COMPLETE`. Zero provider requests sent. Persistent live gate remains `false`. Repository preserved.**
