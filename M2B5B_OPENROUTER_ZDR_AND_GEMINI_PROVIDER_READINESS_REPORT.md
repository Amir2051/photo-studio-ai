# M2B-5B — OpenRouter ZDR Verification & Gemini Provider Readiness

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede` · **Final status:** `ZDR_ROUTING_VERIFIED_GEMINI_UNAVAILABLE`

## 1. Repository and Git baseline
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; remote/upstream HEAD matches.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch `feature/pro-editor-rebuild` and `main` unchanged.
- Initial: staged 0, modified 14, untracked 99; M2B-3/4/5 and Gemini readiness reports present. Persistent live gate `false`.
- No source/config/env/database changes; no SafeNestT work; no deployment; no Git operations.

## 2. Owner-confirmed OpenRouter privacy configuration (as supplied)
ZDR Only ON; All other models require ZDR ON; Allow Safety Retention OFF; first-party Anthropic/OpenAI endpoints disabled; Google AI Studio disabled; Google Vertex requires Safety Retention (not acceptable under strict policy); retaining SpaceXSI endpoints disabled; paid/free endpoints that train or publish prompts OFF; 1% data discount OFF.
**These are owner-confirmed dashboard settings** — they do not by themselves prove application enforcement or provider behavior.

## 3. Credential readiness (generic status only)
| Check | Result |
|---|---|
| File exists | YES |
| Readable | YES |
| Gemini `AIza…` format | NO |
| OpenRouter-style `sk-or-…` pattern | YES |
| Provider route identified | NO — filename says Gemini, structure indicates another provider |
| Secure server-side mechanism exists | YES (`server/ai-gateway.mjs` reads `OPENROUTER_API_KEY` from process env; credentials never in frontend) |
| Secret exposure | NO — no key/prefix/suffix/partial value printed, copied, stored, or transmitted |

Credential presence does not establish billing, model availability, retention, or ZDR compliance.

## 4. OpenRouter request-path analysis (source verified)
`UI (MiaControlCenter, non-live) → central-gateway.mjs → execute.mjs → provider-registry.mjs → providers/openrouter.mjs::chat() → fetch(chat/completions) → response handling`.
1. **All OpenRouter requests use the central gateway** — only adapter transport exists; HTTP gateway direct fetch removed; M2B-1 facade delegates.
2. **ZDR routing required** — adapter always builds `provider.zdr:true`, `data_collection:'deny'`, `allow_fallbacks:false`, `require_parameters:true` and fails closed before transmission if incomplete.
3. **Payload privacy controls** — VERIFIED in source and mocked-payload tests.
4. **No silent fallback** — `allow_fallbacks:false`; no retry/fallback code; authorization rejects retry/fallback descriptors.
5. **Free-route bypass** — no free-capable model configured; declared-cost classifier treats unknown/dynamic as non-free; policy flags independent of cost class.
6. **Cache/prompt logging** — no response-caching or prompt-logging code; ledger stores token counts and cost/status metadata only; secret-like fields rejected.
7. **Discount/training options** — not set anywhere in application code (grep: no training/discount flags); dashboard OFF per owner.
8. **Model override** — frozen policy in central gateway plus grant policy fingerprint; caller-supplied differing policy rejected.
9. **Unavailable ZDR endpoint** — non-2xx maps to structured provider-unavailable/time-out errors; no fabricated success.
10. **Provider metadata** — ledger and adapter preserve provider ID, model ID, request ID headers where available, usage, cost fields.
**Application enforcement status: VERIFIED for routing controls; actual provider-side enforcement remains UNVERIFIED without an authorized live request.**

## 5. Endpoint/fallback enforcement findings
Public unauthenticated ZDR registry GET (2026-11-20): 1,050 endpoints; Mistral Nemo has six exact strict-ZDR slugs with `safety_retention:false` (`deepinfra/fp8`, `deepinfra/fp8/flex`, `dekallm/fp8`, `mistral/eu`, `parasail/fp8`, `io-net/fp16`). No fallback allowlist exists; routing is policy-filter based. Endpoint-level `data_collection:"deny"` pass/fail is not exposed by the public registry → UNVERIFIED.

## 6. Direct Gemini Developer API ZDR assessment
Official Google documentation (retrieved 2026-11-20):
- `https://ai.google.dev/gemini-api/docs/zdr` — Paid Services do not use prompts/responses for product improvement, **but prompts and responses are logged for a limited period solely for abuse monitoring**; guaranteed ZDR requires **Vertex AI with enterprise DPA**.
- `https://ai.google.dev/gemini-api/docs/logs-policy` — developer logs on by default for billing-enabled projects; retained up to **55 days**, configurable 7/14/28/55.
**Conclusion:** no-training ≠ ZDR. The direct Gemini Developer API route is **NOT ZDR-COMPLIANT** for this project.

## 7. Gemini through OpenRouter ZDR assessment
Public ZDR registry query: 46 Gemini-model rows; **all** are Google Vertex endpoints (`google-vertex/global`, `/priority`, `/flex`, `/us`, `/us-central1`) with **`safety_retention: true`**. Owner settings: Allow Safety Retention OFF; Google AI Studio disabled; Vertex endpoints requiring Safety Retention not acceptable. Therefore **no qualifying Gemini route exists under the current policy**; Gemini is unavailable. No exception enabled; no silent reroute to OpenRouter/Mistral.

## 8. Provider/model routing matrix
| Provider/model | Route | ZDR eligibility | Owner policy | Fallback | Endpoint identity recorded | Safe to enable |
|---|---|---|---|---|---|---|
| OpenRouter / `mistralai/mistral-nemo` | 6 strict-ZDR slugs, policy filters | VERIFIED_ZDR_ROUTE (public registry; provider enforcement UNVERIFIED) | not blocked | disabled | yes | Prepared; live gate still false |
| Direct Gemini Developer API | `generativelanguage.googleapis.com` | NOT ZDR (abuse logging + developer logs) | blocked by strict ZDR | n/a | n/a | **No** |
| Gemini via OpenRouter (Google AI Studio) | disabled endpoint | not established | OWNER_POLICY_BLOCKED | n/a | n/a | **No** |
| Gemini via OpenRouter (Vertex) | 46 rows, safety_retention=true | RETENTION_POLICY_UNVERIFIED / blocked | OWNER_POLICY_BLOCKED | n/a | yes (registry) | **No** |
| Planned video/advanced identities | no provider/model | NOT IMPLEMENTED | n/a | n/a | n/a | No |

## 9. M2B-4 control verification
Central gateway VERIFIED; server-side credentials VERIFIED; explicit stdin approval VERIFIED; monotonic expiry VERIFIED; atomic single-use consumption + per-operation isolation VERIFIED; verified pricing + $0.001 ceiling VERIFIED; no fallback/retry VERIFIED; fail-closed selection VERIFIED; no false-success VERIFIED; no secret/prompt logging VERIFIED. Persistent live gate remains `false`.

## 10. Regression results (actually run)
- `npx vitest run tests` → **25 files / 188 tests passed**.
- `npm run typecheck` → exit 0.
- `npx tsc -b` → exit 0.
- `npx vite build --config vite.config.ts` → exit 0.
All transports mocked; no real credentials used; no external provider requests.

## 11. Git integrity comparison
Before: staged 0, modified 14, untracked 99. After: staged 0, modified 14, untracked 100 (this report only). Frozen refs unchanged; no unrelated work altered.

## 12. Remaining blockers
1. Direct Gemini API retention policy fails strict ZDR.
2. All OpenRouter Gemini routes require Safety Retention (owner OFF) or disabled Google AI Studio.
3. Supplied credential format does not confirm Gemini route.
4. Endpoint-level `data_collection:"deny"` behavior and actual provider enforcement remain UNVERIFIED without an authorized live test.
5. No live request is authorized in this phase.

## 13. Recommended next step
Keep Gemini **disabled**. Continue with the prepared OpenRouter Mistral Nemo strict-ZDR path only if the owner separately authorizes the exact live test; otherwise no provider use. If Gemini-class capability is required later, evaluate Vertex AI with independently verified enterprise ZDR/DPA and explicit owner approval before any user data is transmitted.

**Final status: `ZDR_ROUTING_VERIFIED_GEMINI_UNAVAILABLE`. Zero live provider requests; no credential exposed; live gate false.**
