# M2B-6A — Public ZDR Endpoint Registry Reconciliation

**Date:** 2026-11-19 · **Mode:** read-only; unauthenticated public GET only · **Source report:** `M2B_MISTRAL_NEMO_ZDR_M2B6_VERIFICATION_REPORT.md`

## 1. Verified baseline
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; branch `feature/pro-editor-professional-suite`; HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede`; remote/upstream matches.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch → `cdb1238e…`; `main`/`origin/main` → `2c451768…`. All unchanged.
- Staged 0; 14 modified tracked files; 84 untracked paths — all pre-existing and preserved. No git mutation.

## 2. Configured model/provider identities
Repository inventory found exactly one executable model configuration:
- `server/ai/model-registry.mjs`: `id: 'mistralai/mistral-nemo'`, `provider: 'openrouter'`, `providerModelId: 'mistralai/mistral-nemo'`, `MIA Assistant`, `liveExecutionEnabled: false`.
- `server/ai/provider-registry.mjs`: only `openrouter` registered.
- Two planned entries (`planned/gemini-video-intelligence`, `planned/advanced-analysis`) have `provider: null`, no adapter, no live execution — NOT APPLICABLE to endpoint reconciliation.
No endpoint slug, allowlist, or `provider.order` is configured anywhere (M2B-5 policy-based routing).

## 3. Registry retrieval evidence
- Request: unauthenticated `GET https://openrouter.ai/api/v1/endpoints/zdr` — **no API key, no credentials, no account access**. Retrieval date **2026-11-19**.
- Response: `{"data":[...1059 endpoint records...]}`; tool-output saved outside the repository at `C:\Users\yayam\.local\share\opencode\tool-output\tool_1f74053bd001gfC1j9bz01qrwO` (inspected read-only).
- Official ZDR explanation fetched: `https://openrouter.ai/blog/insights/zero-data-retention/` (published 2026-09-11, updated 2026-10-27). Key confirmations: data policies are evaluated at **endpoint level**; the published list is the current ZDR endpoint registry; an endpoint with `safety_retention:true` is **not** ZDR; `data_collection:"deny"` is a separate control; ZDR covers provider-side retention only.

## 4. Endpoint-by-endpoint reconciliation (`model_id == mistralai/mistral-nemo`)
The registry contains **exactly six** matching endpoint records. All have `safety_retention:false`. `status` values are reported raw; their availability semantics are UNVERIFIED.

| # | Internal endpoint name | Exact endpoint slug (`tag`) | Provider / model | ZDR evidence | Required parameters (`supported_parameters`) | Status / safety | Evidence | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | (none configured) | `deepinfra/fp8` | DeepInfra / `mistralai/mistral-nemo` | present in ZDR registry; `safety_retention:false`; context 131072 | max_tokens, temperature, top_p, stop, frequency/presence/repetition_penalty, top_k, seed, min_p, logit_bias, response_format, structured_outputs, tools, tool_choice | status 0 / false | public registry, 2026-11-19 | VERIFIED (endpoint identity + ZDR listing) |
| 2 | (none configured) | `deepinfra/fp8/flex` | DeepInfra / same model | present; safety false; context 131072 | same as row 1 minus min_p/logit_bias/tools/tool_choice | status 0 / false | same | VERIFIED |
| 3 | (none configured) | `dekallm/fp8` | DekaLLM / same model | present; safety false; context 131072 | max_tokens, temperature, top_p, logit_bias, penalties, seed, stop, response_format, structured_outputs, logprobs, top_logprobs | status -2 / false | same | VERIFIED (identity/ZDR); availability UNVERIFIED |
| 4 | (none configured) | `mistral/eu` | Mistral / same model | present; safety false; context 131072; implicit caching true; EU endpoint | includes max_tokens, temperature, top_p, stop, penalties, seed, response_format, structured_outputs, tools, tool_choice | status 0 / false | same | VERIFIED |
| 5 | (none configured) | `parasail/fp8` | Parasail / same model | present; safety false; context 131072 | max_tokens, temperature, top_p, penalties, seed, stop, top_k, logit_bias, response_format, structured_outputs, logprobs, top_logprobs | status -5 / false | same | VERIFIED (identity/ZDR); availability UNVERIFIED |
| 6 | (none configured) | `io-net/fp16` | Io Net / same model | present; safety false; context 128000; implicit caching true; pricing discount 0.28 | max_tokens, temperature, seed, stop, min_p, top_k, top_p, penalties, logprobs, top_logprobs, tools, tool_choice | status 0 / false | same | VERIFIED |

**Configured model match:** the repository's `mistralai/mistral-nemo` matches the registry `model_id` on all six rows exactly. The configured `provider: 'openrouter'` is the gateway, not an endpoint provider; endpoint providers are the underlying names above. No slug was inferred from a display name — each slug is the registry `tag` value.

**Required-parameter note:** `require_parameters: true` will exclude endpoints lacking a requested parameter. For the pilot's basic `messages`/`max_tokens` task, all six list `max_tokens`. Tool-calling is supported by `deepinfra/fp8`, `mistral/eu`, `io-net/fp16` only (among these); no tool calls are authorized for the pilot.

## 5. Previously unknown entries
- The earlier six display-name rows now have **exact registry slugs** (rows 1–6 above).
- The two “plus 1 more” hints from the model price page are **not identifiable as distinct ZDR endpoints**: the ZDR registry has exactly six Nemo records, already accounted for. They are therefore retained as **UNVERIFIED / not eligible** for any allowlist. No slug was invented for them.

## 6. Data-collection classification
The ZDR registry records do **not** expose a `data_collection` field. Provider-level documentation (`https://openrouter.ai/docs/guides/privacy/provider-logging`, retrieved earlier) lists the relevant providers as zero-retention / does-not-train, but that is **provider-level, not endpoint-level**. Endpoint-specific `data_collection:"deny"` pass/fail remains **UNVERIFIED**. The M2B-5 request-level flag is still enforced in code; actual filtering behavior requires an authorized live/account preflight.

## 7. Account-level verification
No account access, authentication, or settings inspection was performed. Account-level ZDR-only configuration for the “All other models” group remains **UNVERIFIED** pending direct owner confirmation. Request-level `zdr:true` can only tighten, not relax, account policy (official blog confirmation).

## 8. Remaining blockers
1. Account-level ZDR-only configuration (owner confirmation only).
2. Endpoint-specific `data_collection:"deny"` classification (not present in public registry).
3. `status` code semantics and live availability of the six endpoints (not verified; several show negative status values).
4. Behavior when all filters reject endpoints (documented error expectation, not observed live).
5. No pilot/request is authorized; live execution remains disabled in the registry.

## 9. Repository integrity and verification verdicts
- **Endpoint identity verification: PASS** — six exact slugs established from authoritative registry.
- **Endpoint-specific ZDR eligibility: PASS** — all six records are in the ZDR registry with `safety_retention:false`.
- **Account-level ZDR configuration: UNVERIFIED.**
- **Code-level privacy enforcement: PASS** (M2B-5, unchanged).
- **End-to-end ZDR compliance: UNVERIFIED** — account config and endpoint-level data-collection classification remain open.
- **Pilot readiness: UNVERIFIED** — no authorization or live verification.
- **Application-wide privacy boundaries: UNVERIFIED** — provider ZDR covers inference only.

No source/config/env/credential/database changes; no provider inference or account API calls; no commit/push/deploy; no dependency installation. Only the unauthenticated GET above and the official blog page were fetched, plus local read-only file inspection. **Provider API/inference calls: 0** (the GET was to a public registry endpoint, not inference). **Confirmed spend: $0.00 USD; pilot allowance $0.05 unchanged.** Frozen tag, original branch, `main`, and all existing work preserved.

**Stopping here — no fixes, no allowlist changes, no pilot.**

---

## 15. Final verification (owner account evidence supplied — 2026-11-19)

### 15.1 Account-level evidence (owner-confirmed)
The owner inspected OpenRouter Privacy Settings and confirmed:
- **“All other models: ZDR Only”** — account-level ZDR enforcement is enabled for the model group containing `mistralai/mistral-nemo`. This is **OWNER-CONFIRMED**.
- The Safety Retention option is displayed separately. **Its exact enabled/disabled state is UNVERIFIED** and was not inferred from the supplied text (no account access was performed).

### 15.2 Fresh registry evidence
- Unauthenticated `GET https://openrouter.ai/api/v1/endpoints/zdr` re-fetched on **2026-11-19**; no API key, no account authentication.
- Tool-output evidence (outside repository): `C:\Users\yayam\.local\share\opencode\tool-output\tool_1f743a8cb00142tuhntPRuzhO2`.
- Response: 1,051 public ZDR endpoint records; exactly **6** with `model_id == 'mistralai/mistral-nemo'`; **0** with `safety_retention: true`.

### 15.3 Complete endpoint matrix (final)
All six exact registry slugs below are `STRICT ZDR` — they appear in the ZDR registry **and** have `safety_retention: false`. No Nemo endpoint in the registry is `SAFETY RETENTION`.

| Exact slug (`tag`) | Provider name | Model ID | Registry match | ZDR class | Safety retention | Status (raw) | Context | Evidence | Result |
|---|---|---|---|---|---|---|---|---|---|
| `deepinfra/fp8/flex` | DeepInfra | `mistralai/mistral-nemo` | yes | STRICT ZDR | false | 0 | 131072 | registry GET, 2026-11-19 | VERIFIED |
| `dekallm/fp8` | DekaLLM | same | yes | STRICT ZDR | false | −2 | 131072 | same | VERIFIED (identity/ZDR); availability UNVERIFIED |
| `mistral/eu` | Mistral | same | yes | STRICT ZDR | false | 0 | 131072 | same | VERIFIED |
| `parasail/fp8` | Parasail | same | yes | STRICT ZDR | false | −5 | 131072 | same | VERIFIED (identity/ZDR); availability UNVERIFIED |
| `io-net/fp16` | Io Net | same | yes | STRICT ZDR | false | 0 | 128000 | same | VERIFIED |
| `deepinfra/fp8` | DeepInfra | same | yes | STRICT ZDR | false | 0 | 131072 | same | VERIFIED |

- Two previously unknown “plus 1 more” entries: **NOT LISTED** as distinct endpoint records in the public ZDR registry (only the six above exist) → remain **UNVERIFIED / ineligible**; no slug invented.
- Configured model identity: `mistralai/mistral-nemo` matches registry `model_id` exactly; `openrouter` in the repository is the gateway, not an endpoint provider. No endpoint slug or allowlist is configured in the repository (policy-based routing only).
- Endpoint-level `data_collection:"deny"` pass/fail is not a field in the public registry → remains UNVERIFIED, though request-level enforcement is present in code.

### 15.4 Policy behavior (read-only source + mocked tests)
- Account ZDR enforcement is respected: request flags can only tighten; owner-confirmed account setting is at least as strict.
- Request-level `zdr:true`, `data_collection:'deny'`, `allow_fallbacks:false`, `require_parameters:true` are enforced by `central-gateway.mjs` → `execute.mjs` → `openrouter.mjs`; policy tampering rejected; adapter refuses to transmit if final provider object is incomplete.
- No endpoint is represented as Safety Retention (all `safety_retention:false`), so the unresolved toggle state does not change these six endpoints’ strict-ZDR classification.
- Unknown/ineligible endpoints fail closed; no alternate gateway or direct provider path remains (M2B-5). Local mocked test re-run: `npx vitest run tests/m2b5-gateway.test.ts` → **8 passed**, zero provider calls.

### 15.5 Final verdicts
| # | Item | Verdict |
|---|---|---|
| 1 | Account-level ZDR Only (“All other models”) | **OWNER-CONFIRMED** |
| 2 | Safety Retention toggle state | **UNVERIFIED** |
| 3 | Exact endpoint identity (six slugs) | **VERIFIED** |
| 4 | Strict ZDR endpoint eligibility | **VERIFIED** |
| 5 | Safety Retention endpoint eligibility | **NOT APPLICABLE** (zero Nemo endpoints with `safety_retention:true`) |
| 6 | Code-level enforcement | **PASS** |
| 7 | End-to-end strict ZDR readiness | **UNVERIFIED** — endpoint-level `data_collection:"deny"` filtering and live request behavior remain unobserved |
| 8 | Pilot readiness | **UNVERIFIED** — no pilot authorized; live execution still disabled |

### 15.6 Integrity / execution confirmation
Baseline re-verified: branch `feature/pro-editor-professional-suite`, HEAD `1ecce92…`, frozen tag/commit `cdb1238e…`, original branch and `main` unchanged; staged 0, 14 modified, 85 untracked preserved. No source/config/env/credential/database changes, no account access, no inference calls, no commits. Only the unauthenticated public GET and local mocked tests were executed. **Provider inference calls: 0. Confirmed spend: $0.00 USD; $0.05 allowance unchanged.**

**Stopping — no fixes or pilot.**
