# M2B-8C — Vertex AI Privacy and Integration Feasibility Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Mode:** Read-only research and architecture review · **Final status:** `M2B8C_FEASIBILITY_COMPLETE`

> The feasibility review itself is complete. Provider enablement remains **BLOCKED** on owner/Google contractual evidence and a fresh authorization decision. No provider was activated, no grant created, no code changed.

---

## 1. Executive decision

**Decision matrix outcome:** **Technically viable but contractual assurance unavailable.**

- **Vertex AI / Gemini Enterprise Agent Platform is the only Google Gemini route with a documented path toward the project's strict ZDR posture.** The Gemini Developer API is **not viable** (55-day abuse-monitoring retention with possible human review, no opt-out, no ZDR contract, no regional pinning). OpenRouter Gemini routes remain blocked by the owner's Safety Retention rule (prior M2B-5B finding).
- **Vertex AI technical controls are documented and sufficient in principle**: `store=false` for stateless Interactions, request-response logging off by default, durable caching disabled via project `cacheConfig`, no Search/Maps grounding (use Web Grounding for Enterprise), regional endpoints, ADC/service account, schema-constrained JSON, WebM input.
- **Contractual ZDR is not proven by those controls.** The decisive question is which agreement governs the billing account: online Google Cloud Platform Terms of Service (abuse prompt logging up to 90 days, human review possible) vs. **Google Cloud Master Agreement** (customers "exempt from prompt logging … and from human review … by default"). No Master Agreement, DPA amendment, or negotiated ZDR addendum is available for inspection in this repository.
- **The actual video-editor AI chat does not use the policy-enforcing gateway.** It goes `MIAChatPanel.svelte → mia-proxy.mjs → external RZ Agent`. The smallest safe integration is to repoint the editor chat to a central-gateway-backed route and add Gemini as a server-side provider with a **separate** Gemini grant. The central gateway can be reused unchanged; RZ Agent proxy need not change for chat, but its vision path remains an out-of-gateway residual risk.
- **Video understanding is documented; "editing proposals" and quiet-section detection are not model capabilities.** They must be application-level composition and local audio signal analysis respectively.
- **Conclusion:** Do not enable Gemini. Obtain contractual evidence, owner decisions, and credentials first. This review completes the feasibility work; it does not approve or implement a provider.

---

## 2. Official privacy and contractual evidence

### 2.1 Service distinctions (current naming)

| Service | Endpoint / contract | ZDR relevance |
|---|---|---|
| **Gemini Developer API** (Google AI Studio / `generativelanguage.googleapis.com`) | Gemini API Additional ToS (effective 2026-03-23), Developers Terms; paid tier = Cloud billing | **Not viable.** 55-day abuse retention, no opt-out, no ZDR contract, global processing |
| **"Gemini API in Vertex AI" / "Vertex AI Gemini API"** (historical names) | `aiplatform.googleapis.com`; GCP ToS / Service Specific Terms / CDPA | Same backend as current Agent Platform; renamed, not a separate service |
| **Gemini Enterprise Agent Platform** (current developer platform, formerly Vertex AI generative AI) | `aiplatform.googleapis.com`; GCP ToS + Service Specific Terms + CDPA + optional Advanced AI Safety Addendum | Only route with documented ZDR configuration portfolio |
| **Gemini Enterprise app** (employee workspace app) | `business.gemini.google`; separate editions/terms | Not a model-serving route; ZDR not stated publicly (UNVERIFIED) |
| **Gemini for Google Cloud** (console/IDE assistant) | Google Cloud console; GCP ToS + CDPA | Not relevant to MaaS inference |

Rename evidence: `https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes` (2026-11-20), release notes 2026-04-22, Google Cloud blog 2026-04-22. Old URLs redirect.

### 2.2 Abuse monitoring, human review, contract tier

| Tier | Retention / human review | Contract dependency |
|---|---|---|
| Developer API | **55 days** prompts/context/output; possible human review via internal governance platform; legal/regulatory disclosures | No opt-out; paid tier only stops product-improvement training |
| Agent Platform, standard Google models | Abuse prompt logging **up to 90 days** in customer region/multi-region; human review possible under online GCP ToS | **Master Agreement customers exempt from prompt logging and human review by default** |
| Google Frontier Models (Service Specific Terms §34) | 30 days **inside Customer's Account**, automated tools only; no human-review right; prevails over GCP ToS §4.3 | Master Agreement = "ZDR-aligned"; under online terms human review may still occur |
| Advanced AI (Anthropic/OpenAI partner models) | 30 days **outside Customer's Account**, automated review **or human review** need-to-know; opt-out "may not be possible" | Advanced AI Safety Addendum (2026-07-30), per-project consent; avoid for strict ZDR |
| Partner/Open MaaS | Prompt logging off by default; some partner ZDR only on approved projects, account-team + provider approval | `store:false` alone does **not** enable partner ZDR |

**Exact Master Agreement language** (Agent Platform abuse-monitoring doc, 2026-11-20): "customers with a Google Cloud Master Agreement are exempt from prompt logging for this abuse monitoring by default" and "...are exempt from human review for this abuse monitoring by default."

### 2.3 Technical controls: what they do and do not guarantee

| Control | Level | Guarantees | Does NOT guarantee |
|---|---|---|---|
| `store=false` (Interactions API) | Request | No server-side interaction persistence; stateless; incompatible with `background`/`deferred` | Abuse logs, request-response logs, caching, grounding retention, audit logs, billing/operational metadata, partner logging |
| Request-response logging | Project/per-model | Off by default; keep off | Can share with MaaS partners if enabled |
| Cloud Audit Logs | Org/project | Admin Activity always on (metadata only); Data Access off by default; DATA_READ excludes prompt/response payloads | Absence of all logs; immutable retention (30/400 days) |
| Caching | Project | In-memory RAM ≤24h considered ZDR-compatible; disable durable for ZDR (default-on) | CMEK for durable cache; in-use location on global endpoint |
| Grounding | Request/product | Web Grounding for Enterprise logs no customer data | Search (3 days Agent Platform / 30 days Developer API) and Maps (30 days) storage cannot be disabled |
| Regional endpoint | Request URL | In-use processing in chosen region for supported models | Data residency on global endpoint; every model in every region; ZDR ≠ residency |
| Access Transparency | Project | Logs Google personnel access | Full coverage (exclusions: RAG Engine, Agent Retrieval, custom containers, Vizier, etc.) |

**A configuration option is not contractual ZDR.** The ZDR position depends on agreement tier + model tier + signed addenda.

### 2.4 Unresolved contractual questions (must be answered by owner/Google)
- Which agreement governs the billing account (Master Agreement vs online GCP ToS)?
- Is there a negotiated DPA amendment / ZDR-specific addendum, with precedence over §34 and the Advanced AI Safety Addendum, and remedies?
- Master Agreement eligibility/process; abuse-monitoring exception request mechanism if on online terms.
- Current Frontier/Advanced model designations and per-model ZDR feasibility (documents conflict on one Frontier model label).
- Approved partner-model ZDR list and cross-project approval transfer.
- CDPA Appendix 4 subprocessor list, processing countries, and audit mechanics under §7.5.
- Written confirmation that ZDR and residency can be combined for the chosen regional endpoint/model.

**Key official sources** (dates where shown): Developer API [zdr](https://ai.google.dev/gemini-api/docs/zdr) 2026-09-14, [abuse monitoring](https://ai.google.dev/gemini-api/docs/usage-policies) 2026-06-09, [terms](https://ai.google.dev/gemini-api/terms) 2026-03-23, [logs policy](https://ai.google.dev/gemini-api/docs/logs-policy) 2026-10-26; Agent Platform [ZDR](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) 2026-11-20, [abuse monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring) 2026-11-20, [data residency](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency) 2026-11-19, [security controls](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/security-controls) 2026-11-17, [request-response logging](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/request-response-logging), [interactions developer guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/interactions/developer-guide), [audit logging](https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/general/audit-logging) 2026-11-19, [Advanced AI Safety Addendum](https://cloud.google.com/terms/advanced-ai-safety-addendum) 2026-07-30, [CDPA](https://cloud.google.com/terms/data-processing-addendum), [Service Specific Terms](https://cloud.google.com/terms/service-terms) §§18/31(b)/34.

---

## 3. Actual editor-to-provider architecture map

```
Current (actual video-editor AI chat):
MIAChatPanel.svelte:14,153-156  →  mia-proxy.mjs:159-172  →  RZ Agent /v1/chat
        (metadata-only prompt, :58-100,145-152)               (external upstream)
        proposal parse :102-132 → AIReviewPanel.svelte:64-125 (apply only after approval)

Policy-enforcing path (NOT used by editor):
ai-gateway.mjs:242-254 → central-gateway.mjs:23-75 → execute.mjs:35-189 → provider.chat()
        OpenRouter adapter: providers/openrouter.mjs:17-133
```

- `MIAChatPanel.svelte` sends `{message, system, session_id?}` and expects `{reply, session_id?}`; system prompt is metadata-only and includes the tool schema as text (`:145-152`); project/sequence IDs are revalidated before proposals are created (`:119-121`).
- `mia-proxy.mjs` has origin/JWT/rate-limit controls but **no** ZDR policy construction, consent, budget, ledger, live gate, or grant consumption. It is a transparent relay; redirecting it to Gemini would bypass the audited controls.
- `ai-gateway.mjs` is same-origin, JWT-verified, rate-limited, hard-wired to OpenRouter credentials/model (`:204-213,244-254`), and loopback-only by default (`:276`). Its request/response shapes differ from MIA chat.
- Central gateway modules are provider-neutral: `central-gateway.mjs` already accepts `providerId` (`:34`); `execute.mjs`, `router.mjs`, `consent.mjs`, `ledger.mjs`, `index.mjs`, `errors.mjs` need no changes.
- Local media is local-only: `sources.ts:42-43,66-92,156-188`, `opfs.ts:8-23,87-117`, `probe.ts:118-132,170-266`; no silent upload. `VisualFrameReview.svelte:174-205,258-264` sends selected frames only after explicit approval.

**Conclusion:** RZ Agent proxy need not change for chat if the UI is repointed to a gateway-backed route; central gateway can be reused; privacy/authorization controls must remain in the server path. The RZ Agent vision path remains outside the gateway and is an explicitly accepted residual risk unless separately addressed.

---

## 4. Recommended future integration design (not implemented)

**Smallest additive change (Option A):**
1. **New** `server/ai/providers/gemini.mjs` implementing the existing `chat()` contract; consume a Gemini grant at the top of `chat()` before credential use/network; assert ZDR request construction; normalize response. Mirror `openrouter.mjs:21-133`, especially `:29-48,75-78`.
2. **New** `server/ai/gemini-grant.mjs` (or separate additive family) with its own approval phrase, purpose, provider/model/endpoint pins, media scope, TTL, cost ceiling, atomic synchronous consume, replay rejection, and cost recomputation. **Do not alter OpenRouter grant constants** (`single-use-auth.mjs:11-26,72-160`).
3. **Additive** `provider-registry.mjs` registration; real `model-registry.mjs` entry with verified provider/model/capabilities/modalities/pricing; `pricing.mjs` verified price; separate Gemini budget ceiling (do not reuse Mistral $0.05 pilot).
4. **Additive** `ai-gateway.mjs` route/shim: accept MIA chat shape, call `createCentralGateway().run(...)` with server-selected Gemini provider/credential, return `{reply, session_id?}`. Keep same-origin, JWT, rate limit, allowlist; never accept provider/model/base URL from browser.
5. **Additive** `MIAChatPanel.svelte` transport target change only; preserve system prompt, metadata-only context, proposal parsing, and approval-before-apply.
6. Keep `central-gateway.mjs`, `execute.mjs`, `router.mjs`, `consent.mjs`, `ledger.mjs`, `index.mjs`, `errors.mjs`, proposal contract, and local media code unchanged.
7. Add tests mirroring `tests/m2b2-temporary-auth.test.ts:60-188` and `tests/m2b5-gateway.test.ts:59-71`: grant/replay/atomicity, policy fail-closed, no direct fetch, allowlist, no client credentials.
8. Deploy the gateway reachable from the Studio origin (same-origin/reverse proxy), not by widening CORS.

**Anti-bypass controls:** byte-identical policy match (`central-gateway.mjs:12-17,45-47`; `execute.mjs:69-78`; adapter assertion), live gate (`:82-94`), grant consume before fetch, server-only credentials, provider/model allowlist, no retry/fallback, origin/CSRF/JWT/rate-limit, ledger sanitization.

---

## 5. Video and audio capability assessment

| Capability | Status | Evidence / implication |
|---|---|---|
| WebM input | **VERIFIED** (with doc inconsistency) | `video/webm` in video-understanding MIME lists on both surfaces; generic inference reference omits it — validate with a real request before production |
| Size limits | VERIFIED | Developer API: File API 20 GB paid/2 GB free, inline <100 MB (best practice <20 MB). Agent Platform: inline 256 MB, GCS ~2 GiB, Interactions payload 256 MiB |
| Timestamped understanding | VERIFIED | 1 FPS static default, audio 1 Kbps mono, timestamps every second; `MM:SS`/`H:MM:SS` ≤1 FPS, subsecond form >1 FPS; fps range (0,24]; agentic mode not on `gemini-3.5-flash` |
| Structured JSON | VERIFIED | Interactions `response_format` with `mime_type:'application/json'` + schema; GenerateContent `responseMimeType`/`responseSchema` legacy/deprecated fields |
| Video editing suggestions/proposals | **NOT VERIFIED** as model capability | Analysis models describe/segment/answer/timestamp; no edit-action proposals documented. Omni/Veo generate new video, not proposal objects. App must compose proposals from structured output |
| Quiet-section detection | **NOT VERIFIED** | No silence/quiet-region API documented for recorded media. Live API VAD is streaming turn-taking only; transcription preserves pauses but does not return regions |
| Non-speech audio caveat | VERIFIED | Official: models "might make mistakes recognizing sound that's not speech"; audio downsampled to 16 Kbps mono |
| Local signal pipeline need | **INFERRED** | RMS/VAD/silence segmentation, frame-accurate boundaries, and non-speech confidence should stay local, using existing app code (`audio-analysis.ts` already does quiet regions) |
| Suitable models (do not call) | VERIFIED | `gemini-4-hydrogen` / `carbon` / `argon` (agentic long-form, regional `us`/`eu`), or `gemini-3.5-flash` (no agentic). Selection blocked until region/contract verified |

**Model capability ≠ application workflow capability:** Gemini can understand and describe video with timestamps and emit schema-constrained JSON. It does not natively provide the project's trim/split/marker proposal workflow or deterministic silence detection; those remain application logic and local analysis.

---

## 6. Authorization and consent requirements

- Existing grant design (`single-use-auth.mjs`): private Symbol/WeakSet handles, operator phrase from local stdin, one grant per operation, ≤5 min TTL, verified price ceiling, synchronous check-and-consume, exact fingerprints for provider/model/endpoint, prompt, policy, token count, request shape, process/source, replay rejection, and cost recomputation before `consumed=true` (`:29-35,55-106,114-160`).
- **Must not reuse or alter the OpenRouter grant** (pins: provider `openrouter`, model `mistralai/mistral-nemo`, endpoint, fixed test prompt, 32 tokens, `source='local-process'`). A Gemini browser chat would fail multiple checks and broadening them would weaken an audited control.
- A future Gemini grant should preserve: atomic consume before fetch; exact request fingerprint (messages/media scope); provider + model + endpoint binding; privacy-policy fingerprint byte-identical to `MIA_PRIVACY_POLICY`; media scope (metadata-only vs explicit frames/video); TTL; cost ceiling from verified Gemini pricing; replay/expiry/shape rejection; fail-closed on any mismatch.
- Consent (`consent.mjs:51-63`) binds to task/model/provider and rejects unknown price; pricing (`pricing.mjs`) must know the exact Gemini model before consent/budget can work. Live gate stays false until a separate owner decision.
- No grant was issued, consumed, or modified in this review.

---

## 7. Unresolved blockers and owner dependencies

**Repository/public-documentation blockers (cannot be resolved here):**
1. Contract tier (Master Agreement vs online GCP ToS) and any negotiated ZDR addendum/DPA amendment.
2. Master Agreement eligibility/process; abuse-monitoring exception mechanism if on online terms.
3. Model tier designation (Frontier/Advanced) and per-model ZDR feasibility; conflicting Frontier label in docs.
4. Approved partner-model ZDR list; subprocessor/processing-country appendix; audit rights mechanics.
5. Written confirmation that ZDR + regional processing can be combined for chosen model/endpoint.

**Owner decisions required:**
- Approve Vertex AI as provider (explicitly not approved today); select model and region; accept cost/pricing; accept residual RZ Agent vision risk or fund its remediation; approve source changes and a new Gemini grant design; approve any live test separately.

**Infrastructure prerequisites (not created):**
- Google Cloud project + billing account + `aiplatform.googleapis.com` enabled + IAM (`roles/aiplatform.user` or least-privilege `aiplatform.endpoints.predict`) + ADC/service account; verified pricing entry; gateway same-origin deployment.

**Technical work (not performed):** additive adapter/registration/model/pricing/grant/gateway/UI-shim changes and tests, as listed in §4.

---

## 8. Claim classification

- **VERIFIED (local source):** provider boundaries; live gate; grant mechanics; provider-independent proposal contract; local-only media; absence of Google credentials/SDKs; editor chat uses RZ Agent, not central gateway.
- **VERIFIED (official docs retrieved):** service renames/distinctions; Developer API 55-day abuse retention/no opt-out; Agent Platform Master Agreement exemptions; §34 Frontier 30-day in-account logging; Advanced AI addendum retention/human review; request-response logging defaults; `store=false` scope; caching/grounding/session retention; regional endpoint caveats; WebM/timestamp/JSON capabilities; non-speech caveat.
- **INFERRED:** minimal additive integration design; application-level editing proposals; local pipeline for silence detection; cost/performance implications.
- **UNVERIFIED:** contract tier for this project; negotiated addenda; partner approvals; subprocessor list; quota limits; Workload Identity specifics; ZDR for Gemini Enterprise app; quiet-section detection as a model feature; WebM on the generic inference reference (doc inconsistency).
- **UNSUPPORTED / not claimed:** that Gemini is approved, configured, credentialed, ZDR-guaranteed for this project, or operational in the editor; that ZDR is proven by `store=false`; that a model understanding video provides silence detection or applies edits.

---

## 9. Git state before and after

| Item | Before | After |
|---|---|---|
| Branch | `feature/pro-editor-professional-suite` | unchanged |
| HEAD | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | unchanged |
| Staged | 0 | 0 |
| Modified | 24 | 24 |
| Untracked | 126 | 127 (this report added) |
| Frozen tag | `cdb1238e…` | unchanged |
| Original / main | `cdb1238e…` / `2c451768…` | unchanged |
| Live gate | `false` | `false` |

No source, tests, configuration, environment, credentials, provider settings, ZDR settings, consent/grant/budget/ledger implementation, database, generated bundle or production data was changed. No Google Cloud project/billing/IAM/ADC/service account was created or configured; no SDK/dependency installed; no provider request, prompt, media upload, grant, server restart, deployment, commit, push, reset or branch/tag change occurred. The OpenRouter integration remains intact and unchanged.

**STOP — await owner review. No implementation or live provider test is authorized by this report.**
