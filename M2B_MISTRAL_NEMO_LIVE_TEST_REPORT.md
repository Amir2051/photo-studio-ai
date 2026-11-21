# One-Time Mistral Nemo Live Test — Result (BLOCKED)

**Date:** 2026-11-20 · **Machine:** local Windows · **Project:** `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`

## 1. Environment and baseline
- Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede`; remote/upstream matches.
- Frozen tag/commit `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch and `main` unchanged.
- Initial state: staged 0, modified 14, untracked 85 — all preserved. No reset/clean/stash/overwrite.

## 2. Previous 404 diagnosis (no inference performed)
- Current registry config is correct: `mistralai/mistral-nemo` → `provider: 'openrouter'`, `providerModelId: 'mistralai/mistral-nemo'`, adapter available.
- Adapter sends the exact model ID to `https://openrouter.ai/api/v1/chat/completions` with the OpenAI-compatible body and the four strict provider flags; no malformed model ID in current code.
- Local `.env` has `AI_DEFAULT_MODEL` **not** set to `mistralai/mistral-nemo`, and `AI_ALLOWED_MODELS` does **not** contain it (checked as booleans only). The old direct-gateway path used those config values; the prior 404/`provider_unavailable` is consistent with a stale config/model allowlist or with endpoint filtering at the time. A definitive root cause cannot be established without prior logs — report as **not established**.
- Current HTTP gateway no longer uses `config.defaultModel`; it delegates to the central gateway using the registered model.

## 3. Prerequisite check and stop
- Process env: `OPENROUTER_API_KEY` absent.
- `.env` contains an `OPENROUTER_API_KEY=` line with **empty value** (length 0); no other local env file or process environment contains a key. No value was printed.
- Because the credential prerequisite could not be satisfied, the harness exited with `PREREQUISITE_FAILED` **before** enabling the in-memory live gate or calling the gateway. **No provider request was transmitted.**
- Other prerequisites that were verified: model/provider identity correct; strict policy object intact (`zdr:true`, `data_collection:'deny'`, `allow_fallbacks:false`, `require_parameters:true`); consent path available; one-request fetch wrapper and $0.001 budget / 32-token limits prepared. They were not exercised against a provider.

## 4. Request/result record
| Field | Value |
|---|---|
| Live request transmitted | **No** |
| HTTP status | None (no request) |
| Valid model response | None |
| Returned model/provider metadata | None |
| Usage / confirmed cost | Unavailable / **$0.00 spent** |
| Outbound provider calls | **0** |
| $0.001 cap | Configured in harness, not exercised |
| Max output tokens | 32 configured, not exercised |

## 5. ZDR and integrity
- Strict ZDR request policy was intact in the prepared request (all four flags); no weakening, no fallback, no retry.
- Endpoint-level strict ZDR eligibility remains independently established from the public unauthenticated ZDR registry evidence (six exact slugs, all `safety_retention:false`), not from this test.
- Live gate in the registry remains `false`; the in-memory override was never applied. Temporary harness was created outside the repository and removed afterward.
- Final Git state: staged 0, modified 14, untracked 86 (this report added); frozen refs unchanged. No source/config/env/database change, no deployment, no commit/push.

## 6. Final classifications
- **MODEL TEST: BLOCKED** — no credential value available; no request sent.
- **STRICT ZDR REQUEST POLICY: PASS** — verified in code/prepared request; not exercised live.
- **ENDPOINT-LEVEL ZDR: VERIFIED** — from public registry evidence, not from a live call.
- **COST: UNKNOWN** — no request; confirmed spend $0.00.
- **REPOSITORY INTEGRITY: PRESERVED**

**Stopping here — no retry, no credential preparation, no pilot.**
