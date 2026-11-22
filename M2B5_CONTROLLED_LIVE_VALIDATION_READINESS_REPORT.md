# M2B-5 — Controlled Live AI Validation Readiness Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`

## 1. Repository integrity (verified)
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; remote/upstream HEAD matches `1ecce92…`.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch `feature/pro-editor-rebuild` and `main` unchanged.
- Working tree: staged 0, modified tracked 14, untracked 97 — matches the previously reported M2B-4 state; all work preserved.
- No reset/clean/stash/checkout/commit/push/deploy; persistent live gate remains `false`.

## 2. M2B-4 verification (source-inspected, no weakening)
| Control | Evidence | Status |
|---|---|---|
| Central gateway + routing | `central-gateway.mjs`, `execute.mjs`, `router.mjs` | VERIFIED |
| Explicit stdin operator approval | `collectOperatorApproval()` exact phrase | VERIFIED |
| Single-use grant, per-operation isolation, atomic consumption | `single-use-auth.mjs` (`activeGrants` Map, symbol handle, synchronous consume) | VERIFIED |
| Monotonic expiry ≤5 min | `performance.now()`, `MAX_EXPIRY_MS`, no caller clock | VERIFIED |
| Verified pricing + $0.001 ceiling | `pricing.mjs`; recomputed at consumption | VERIFIED |
| Strict ZDR payload | adapter builds `provider` flags and fails closed if incomplete | VERIFIED |
| Ledger/privacy | metadata-only fields, secret-field rejection; no prompt/response content | VERIFIED |
| Mocked provider tests | 25 files / 188 tests | VERIFIED |

## 3. Credential availability
- Expected credential source `C:\Users\yayam\Documents\openrouter.env.txt`: **exists NO** (checked only; no other paths searched).
- Credential contents accessed: **NO**. Not printed, copied, added to Git, or loaded into a process. Project `.env` unchanged.
- **No credential available to the test process → live request impossible in this phase.**

## 4. Provider and model selection
- Provider: **OpenRouter** (only OpenRouter transport `server/ai/providers/openrouter.mjs`).
- Model: **`mistralai/mistral-nemo`** (registry, public ZDR registry, six eligible endpoint slugs).
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`.
- Capability: text chat only; no tools, no image/audio; matches the proposed harmless prompt.
- Pricing: io.net endpoint $0.01656/M input, $0.0216/M output — OpenRouter model page, retrieved 2026-11-19 (`pricing.mjs`).
- No model substitution proposed; no other provider initialized.

## 5. Exact proposed single test (NOT executed)
Payload (no credential value shown):
```json
{
  "model": "mistralai/mistral-nemo",
  "messages": [{ "role": "user", "content": "Reply with exactly: MINISTUDIO_OPENROUTER_TEST_OK" }],
  "max_tokens": 32,
  "stream": false,
  "provider": {
    "zdr": true,
    "data_collection": "deny",
    "allow_fallbacks": false,
    "require_parameters": true
  }
}
```
- Purpose: `M2B_OPENROUTER_CONTROLLED_TEST`; operation-bound grant with explicit approval phrase.
- Expected response: assistant content exactly `MINISTUDIO_OPENROUTER_TEST_OK`; HTTP 200.
- Limits: prompt ≈17 tokens; max output 32 tokens; no image/file/PII/project content transmitted.
- Estimated cost: **$0.00000097272** (verified local computation); **hard maximum $0.001**.
- Privacy/ZDR payload fields as above; no fallback; no retry; no tools.
- Logging/retention: ledger metadata only (request ID, model, token counts, cost fields, status); no prompt/response content logged locally; no temp files created.
- Expected audit events: approval recorded in-memory; grant issued/consumed; attempt record with estimated cost; after live run, provider usage/cost recorded if returned (otherwise UNKNOWN).
- Rollback/stop: `revokeTestGrant()` and process restart clear in-memory authorization; live gate remains false; stop immediately on any failure, HTTP error, or unexpected cost — no second request.

## 6. ZDR verification levels
| Level | Status | Evidence |
|---|---|---|
| Source-level payload safeguards | VERIFIED | `central-gateway.mjs` frozen policy; adapter fail-closed check |
| Constructed request payload | VERIFIED | mocked transport asserts the four `provider` fields |
| Provider documentation | VERIFIED (documented, not enforced) | OpenRouter ZDR docs/model page retrieved earlier |
| Account-level ZDR configuration | PARTIALLY VERIFIED | owner-confirmed "All other models: ZDR Only"; Safety Retention toggle not inferred |
| Endpoint-level data-collection behavior | UNVERIFIED | public ZDR registry lists endpoints but no `data_collection` field |
| End-to-end provider enforcement | UNVERIFIED | requires an authorized live request and provider evidence |

Do not treat the above as end-to-end ZDR verification.

## 7. Regression verification (actually run)
- `npx vitest run tests` → **25 files / 188 tests passed** (matches M2B-4 baseline).
- `npm run typecheck` → exit 0.
- `npx tsc -b` → exit 0.
- `npx vite build --config vite.config.ts` → exit 0.
All provider transports remained mocked; no real credentials loaded; no external provider request.

## 8. Remaining blockers
1. Expected credential file absent; no credential available to the process.
2. Owner has not explicitly authorized this exact live request.
3. Endpoint-level data-collection filtering and actual provider ZDR enforcement remain unverified.
4. Actual billing can only be known from a provider response; local estimate is not a billing guarantee.

## 9. Live testing authorized?
**No.** This report prepares, but does not authorize, the live request. The persistent live gate remains `false`; zero provider requests sent.

**Final status: BLOCKED_BY_CREDENTIALS**
