# Controlled Live-Test Proposal — M2B (NOT EXECUTED)

**Date:** 2026-11-20 · **Status:** PROPOSAL ONLY — live gate remains `false`; no request authorized by this document.

## 1. Operation
- Provider: **OpenRouter** (only OpenRouter transport: `server/ai/providers/openrouter.mjs`).
- Endpoint: `https://openrouter.ai/api/v1/chat/completions` (existing adapter default).
- Model: **`mistralai/mistral-nemo`** (registry + public ZDR registry).
- Operation: one text chat completion; **no image transmitted**, no tools, no external data, no user files.

## 2. Prompt and limits
- Prompt: `Reply with exactly: MINISTUDIO_OPENROUTER_TEST_OK` (exact grant-bound message).
- Maximum output tokens: **32** (`max_tokens: 32`, grant-bound).
- Expected input tokens: ~17 (verified estimator: ~13 content + 4 overhead).
- Pricing basis: io.net endpoint $0.01656/M input, $0.0216/M output (OpenRouter model page, 2026-11-19).
- Computed estimate: ~$0.00000098 (1e-6 USD), well below $0.001.
- Maximum expected cost: **$0.001** hard ceiling; maximum permitted cost: **$0.001**.
- Actual provider billing: UNKNOWN until a real response reports it.

## 3. Privacy / ZDR configuration
- Request fields: `provider.zdr = true`, `provider.data_collection = 'deny'`, `provider.allow_fallbacks = false`, `provider.require_parameters = true`.
- Account: owner-confirmed "All other models: ZDR Only"; Safety Retention toggle state not inferred.
- Endpoint selection: use public ZDR registry slugs; policy filters must not be relaxed; no fallback.
- Data transmitted: only the exact harmless prompt above; no image, no PII, no project data.
- Local retention: ledger metadata only (no prompt/response); no temp files created.
- Distinguish: source config VERIFIED, payload construction VERIFIED, provider docs VERIFIED, provider enforcement UNVERIFIED, end-to-end ZDR UNVERIFIED.

## 4. Credential source and availability
- Required exact path: `C:\Users\yayam\Documents\openrouter.env.txt`.
- Current existence: **NO** (checked 2026-11-20). Contents never accessed.
- Process env key: empty/absent. No credential loaded or copied; project `.env` untouched.
- Credential must be supplied by owner at the exact path; no key in source, Git, reports, or chat.

## 5. Authorization and disable procedure
- Grant requires explicit operator approval phrase via local stdin (`collectOperatorApproval`), monotonic 5-minute expiry, operation isolation, and atomic single-use consumption at the adapter.
- Persistent live gate stays `false`; no permanent env override.
- Rollback/disable: call `revokeTestGrant()`; restart process to drop in-memory grants; no source change needed.
- No retries, no fallback, no second request. If the one request fails, stop.

## 6. Preconditions before execution
1. Credential file present at exact path with nonempty key (presence checked only).
2. Owner explicitly authorizes this exact test in a separate instruction.
3. Verify computed estimate <= $0.001 once more from current pricing.
4. Use a one-request transport wrapper; assert exactly one outbound call.
5. Record HTTP status, request ID, provider/model echo, usage, and reported cost (or mark unavailable).

## 7. Risks
- Provider may return 404 if strict filters exclude all endpoints or route/pricing changed; stop on failure.
- Local estimate is not a billing guarantee; report actual provider cost if returned, otherwise UNKNOWN.
- Successful response does not prove endpoint-level ZDR; only independent evidence can.

**No request has been sent. Awaiting explicit owner approval.**
