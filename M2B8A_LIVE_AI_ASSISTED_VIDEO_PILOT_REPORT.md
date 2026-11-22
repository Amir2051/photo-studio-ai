# M2B-8A — Controlled Live AI-Assisted Video Pilot Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Final status:** `M2B8A_PILOT_BLOCKED`
**Provider requests sent:** **0** · **Grants issued:** **0** · **Media uploaded:** none

---

## 1. Preflight results

| Check | Status | Evidence |
|---|---|---|
| Repository / branch / HEAD | PASS (preserved) | Root `…\photo-studio-ai`; branch `feature/pro-editor-professional-suite`; HEAD `1ecce92a04683b3dc6785b37eb36b1aeae022ede` |
| Working tree | PASS (preserved) | Staged 0; 24 modified; 124 untracked — unchanged from baseline |
| Protected refs | PASS | Frozen tag `cdb1238e…`; original branch `cdb1238e…`; `main` `2c451768…` |
| Existing synthetic WebM only | PASS (available) | `m2b7d-video.webm` generated locally in prior phases; no other media used |
| Live authorization gate | PASS (still `false`) | `server/ai/model-registry.mjs:59` `liveExecutionEnabled: false`; verified before any further step |
| Credential handling | PASS | `.env` exists; contents not read or printed. No token, key, grant secret or environment value exposed |
| No source/config changes | PASS | Read-only inspection only |

### AI-assisted video editing implementation
- The **video editor's** AI chat UI (`vendor/braincut/src/lib/ui/MIAChatPanel.svelte:14,27`) posts to `VITE_MIA_API_BASE_URL` / default `https://minu-studio-mia.onrender.com/api/mia` — an external RZ Agent proxy, **not** the configured OpenRouter adapter.
- The **configured OpenRouter path** is server-side only: `server/ai/central-gateway.mjs:23-75` → `server/ai/execute.mjs:35-189` → `server/ai/providers/openrouter.mjs:17-133`. It is exercised by the M2B-3 MIA Control Center as non-live diagnostics, not by a video-editing UI.
- Selected model in the registry: `mistralai/mistral-nemo` (MIA Assistant), `providerModelId` identical, `inputModalities:['text']`, `outputModalities:['text']`, capability `editingInstructions:true`, `liveExecutionEnabled:false` (`model-registry.mjs:32-60`). No video-input capability exists for this model.

### Request-level ZDR enforcement (adapter boundary) — `VERIFIED` in code
`server/ai/providers/openrouter.mjs:65-78` constructs, per request:
`provider.zdr = true`, `provider.data_collection = 'deny'`, `provider.allow_fallbacks = false`, `require_parameters = true` (when policy requires it), then fails closed before transmission if `zdr !== true`, `data_collection !== 'deny'`, or `allow_fallbacks !== false`. `central-gateway.mjs:42-47` rejects any caller-supplied policy that differs from `MIA_PRIVACY_POLICY`. `execute.mjs:68-78` rejects requests lacking the enforced policy. This is **request construction/enforcement in code**, not proof of provider-side behavior.

### Single-use grant enforcement — `VERIFIED` in code, `NOT USABLE` for this objective
`server/ai/single-use-auth.mjs`:
- Approval requires the operator to type the exact phrase `APPROVAL_PHRASE` at local stdin (`:48-70`); importing the module does not yield a grant.
- `issueTestGrant` (`:72-106`) binds the handle to a fixed operation, purpose, provider, model, endpoint, **32-token limit**, a **fixed test prompt** (`TEST_MESSAGES`: "Reply with exactly: MINISTUDIO_OPENROUTER_TEST_OK"), a fixed policy fingerprint, issuing process PID, TTL ≤ 5 min, and verified pricing ≤ $0.001.
- `isGrantCandidate` (`:108-112`) only passes the live gate for an unspent active grant.
- `consumeTestGrant` (`:115-160`) performs a synchronous check-and-consume at the final adapter boundary (`openrouter.mjs:29-48`, **before** key use or network transmission), verifying operation, process/source `local-process`, purpose, provider/model/endpoint, maxTokens, exact message fingerprint, policy fingerprint, no tools/attachments/retry/fallback, and recomputed cost. It marks `consumed = true` and removes the active grant before any `fetch`. Replay is rejected by `state.consumed` / missing active grant.

### Account-level ZDR Only setting
- Documented owner confirmation exists in `M2B5B_OPENROUTER_ZDR_AND_GEMINI_PROVIDER_READINESS_REPORT.md:12` (ZDR Only ON; model-level ZDR ON; Safety Retention OFF; first-party endpoints disabled; training/publishing endpoints OFF).
- This was not independently re-verified against the OpenRouter account in this pass: doing so would require an authenticated external request, which is outside the single authorized live request and outside preflight read-only scope. No account settings were changed.

---

## 2. Mandatory stop conditions triggered

1. **Endpoint-level ZDR / `data_collection:"deny"` provider enforcement cannot be verified before sending.** M2B5B report `:43` and `:80` state explicitly that `data_collection:"deny"` pass/fail behavior is **UNVERIFIED** without an authorized live test, and that the public registry does not expose it. The authorization requires endpoint-level enforcement to be verified *before* sending and forbids claiming ZDR from the account setting alone. **BLOCKED.**
2. **No existing OpenRouter-backed "AI-assisted video editing" workflow exists.** The only video-editor AI chat uses the external RZ Agent proxy (onrender), not OpenRouter. The only grant-enabled OpenRouter path sends a fixed ping prompt with 32 tokens. A quiet-section/trim instruction cannot be sent under that grant. Using it would either switch providers (prohibited) or invent a new workflow (prohibited). **BLOCKED.**
3. **The single-use grant cannot carry the authorized editing instruction.** Its message fingerprint is pinned to a fixed test prompt; any editing instruction fails `prompt_mismatch` before transmission. Issuing a differently-shaped grant would require source/config changes, which are prohibited. **BLOCKED.**
4. **Operator approval mechanism not satisfied.** Grants require the exact approval phrase typed at local stdin by the operator; the owner's authorization message is not that phrase, and synthesizing it would misrepresent operator approval. **BLOCKED.**
5. **Model capability mismatch.** The configured model is text-only (`inputModalities:['text']`); no video/media input path exists to the OpenRouter adapter. Sending a "video editing" instruction would be text-only metadata reasoning, not the existing video-editing workflow. **BLOCKED.**

Per the mission's stop conditions, no request was sent, no grant was issued, and no workaround was implemented.

---

## 3. Objective outcomes

| Phase / task | Classification | Result |
|---|---|---|
| Preflight repository, gate, model, credentials | `PASS` | All verified read-only; live gate `false` |
| Request-level ZDR construction in adapter | `PASS` | Code-level enforcement verified in `openrouter.mjs:65-78` |
| Endpoint-level ZDR / data-collection enforcement by provider | `BLOCKED` | Explicitly UNVERIFIED in prior report; cannot verify without a live request |
| Single-use grant design / replay resistance | `PASS (code review)` | Synchronous consume before network; replay rejected |
| Existing OpenRouter AI-assisted video editing workflow | `BLOCKED` | None exists; video UI uses external RZ Agent proxy |
| Grant usable for editing instruction | `BLOCKED` | Fixed 32-token test prompt pinned by fingerprint |
| Live provider request | `NOT TESTED` | Intentionally not sent; request count 0 |
| Grant issuance / consumption / replay rejection in a live run | `NOT TESTED` | No grant issued; replay behavior verified only by code review |
| AI response and editing proposal | `NOT TESTED` | No response obtained |
| Output validation / original clip preservation | `NOT VERIFIED` | No operation performed; original synthetic clip untouched |

---

## 4. Provider, model and network isolation
- Intended provider/model: OpenRouter / `mistralai/mistral-nemo` (text-only). No request was made, so no response, model echo, or usage data exists.
- Network destinations contacted during this pass: none for AI/provider purposes. Only local file reads and local server status checks were performed; no browser page was driven in this mission.
- No media, prompt, or credential was transmitted. No OpenRouter, MIA/onrender, Gemini, or other external AI provider request occurred.
- Live gate remains `false`. No settings, permissions, or provider configuration changed.

---

## 5. Preservation and Git status

| Item | Before | After |
|---|---|---|
| Branch | `feature/pro-editor-professional-suite` | unchanged |
| HEAD | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | unchanged |
| Staged | 0 | 0 |
| Modified (git status) | 24 | 24 |
| Untracked | 124 | 125 (this report added) |
| Frozen tag | `cdb1238e…` | unchanged |
| Original / main | `cdb1238e…` / `2c451768…` | unchanged |
| Live gate | `false` | `false` |

No source, configuration, environment, credential, provider setting, consent/grant/budget/ledger logic, database, generated bundle or production data was changed. No dependency installed, no server started, no build, deploy, commit, push, reset or branch/tag change.

---

## 6. Resolution required before any live pilot
1. Obtain independent, pre-send evidence that OpenRouter enforces `data_collection:"deny"` for the chosen Mistral Nemo endpoint(s) (e.g., provider documentation/contract or an owner-provided account-level attestation that covers endpoint behavior), without relying on the "ZDR Only" label alone.
2. Authorize (or provide) an existing OpenRouter-backed video-editing workflow whose request shape is compatible with the grant — or explicitly authorize a new narrow grant shape limited to a non-sensitive editing instruction, implemented only after separate approval.
3. Provide the operator approval through the application's actual local approval mechanism (exact phrase at local stdin), not by simulating it in code.
4. Confirm how a text-only model is acceptable for the intended "video editing" proposal, or provide an approved model with the required input modality.

**STOP — no live request was sent. Await explicit owner direction; do not proceed to fixes, new grants, retries, or P3.**
