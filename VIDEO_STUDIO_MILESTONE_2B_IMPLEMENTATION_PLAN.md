# Video Studio — Milestone 2B Implementation Plan (READ-ONLY PLANNING)

**Date:** 2026-11-19 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede` · **Status:** plan only — no source, dependency, config, secret, or Git changes

## 0. Formal M2a acceptance acknowledgment
The operator formally accepted Milestone 2a, including its documented checkpoint overhead limitation (`~0.9 ms` at 14 KB, `~34 ms` at 0.64 MB, `~548 ms` at 5.1 MB) and completed corrections, based on the implementation, independent review and correction/validation reports. The overhead is **acknowledged, not eliminated**; M2B must not claim it was optimized away and must respect the M2a project-size boundary (~1 MB JSON for unconditional checkpoint use).

Preflight verified: root/branch/HEAD/remote match; frozen tag `cdb1238e…` and tag object, original branch, `main`/`origin/main` unchanged; staged index empty; all 65 working-tree paths (M2a source, reports, generated bundle files, 39 stale chunks) preserved.

## 1. Verified current architecture

| Component | Location | Current state (verified) |
|---|---|---|
| Agent proposal engine | `vendor/braincut/src/lib/agent/proposals.ts` | Real, typed `EditProposal` with 1–20 validated operations, per-operation approval states, preview store. **Reuse as-is.** |
| Editing tool system | `agent/tools.ts` (~52 KB), `tools.test.ts` | Real tool handlers + `runTool(name,args,ctx)`, approval requests in `ToolContext`; tests pass. **Reuse/extend.** |
| Local MCP bridge | `agent/bridge.ts`, `protocol.ts` | Loopback-only `ws://127.0.0.1:7331/ws`; session consent; external server (`braincut-mcp`) required, not bundled. Local-only by design. |
| Visual analysis | `agent/visual-analysis.ts` (275 B) | Placeholder store for user-approved analysis text only; no analysis implementation. **Extend, do not simulate.** |
| MIA chat UI | `ui/MIAChatPanel.svelte` | Prompt injection defenses, fenced `edit_proposal` parsing, explicit statement that transcription/motion/audio analysis are unavailable. **Integrate model selection here + AI Review panel.** |
| Root AI adapter | `src/lib/aiService.ts` | `AiProvider` interface (`chat`, `generateScene`, `segmentImage`, `retouchImage`, `scoreCull`, `canUploadToCloud`), `OfflineProvider` (honest local guidance, no fake results), `OpenRouterProvider` browser adapter calling same-origin `/api/ai/*` with Supabase bearer token; no browser API keys. **Extend into common model interface.** |
| Supabase adapter | `src/lib/supabaseAiProvider.ts`, `supabase.ts` | Token-on-demand adapter for future cloud UI; editor remains local-first. |
| Server gateway | `server/ai-gateway.mjs` | JWT/JWKS verification, allowlist, 128 KB body cap, 20 messages, rate limit, 30 s timeout, fail-closed. **Hard-wired to OpenRouter** (`OPENROUTER_API_KEY`, single `AI_DEFAULT_MODEL`); `/chat` only; `/scene`, `/segment`, `/retouch`, `/cull-score` return 501. No usage/cost ledger, no model registry, no paid consent, no fallback routing. |
| Captions | `vendor/braincut/src/lib/captions/*` | Real SRT/VTT parse → timed title clips. **Reuse for subtitle output from transcription.** |
| Suite foundation | `vendor/braincut/src/lib/suite/*` + M2a adapters | Versioned document/media identity, read-only compatibility checkpoint, duplicate bar. **Reuse for project context; respect size boundary.** |

No OpenAI/Anthropic/Gemini/ONNX SDK dependency exists today (`package.json`). MediaPipe tasks-vision, Supabase JS, PixiJS, mediabunny are present.

## 2. Proposed M2B architecture

```
Browser (editor + Minu Studio shell)
  AI Control Center (model/provider selector, capabilities, cost/usage, consents)
  MIA Chat / AI Review  ──uses──> existing proposal engine + tool system
  Task router (client hint only) ──POST /api/ai/tasks──> server
  Common ModelClient interface (chat / vision / transcribe / structure)
        │
Server (new server/ai/ module, behind existing fail-closed gateway pattern)
  ProviderRegistry ─ ProviderAdapter[] (OpenRouter-compatible, OpenAI, Anthropic, Gemini, local)
  ModelRegistry (catalog snapshot + capability matrix + free/paid classification)
  CapabilityResolver, Router (task, preference, budget, latency, availability, quality)
  ConsentGate (paid usage explicit opt-in per request/session), EntitlementStore
  UsageLedger + CostEstimator (estimate vs confirmed), BudgetLimits, History
  Retry/RateLimit/Fallback (free-only fallback unless explicit paid consent)
  AvailabilityMonitor (cached /models probe)
        │
Providers: OpenRouter free+paid catalog | OpenAI | Anthropic | Gemini | local/offline
```
**Boundary:** no provider credential, API key, or secret ever reaches browser code/storage/logs. The browser sends a Supabase bearer token and gets results, estimates, capability lists, and consent prompts only. Local/offline tasks stay in-browser (MediaPipe; optional local STT later).

## 3. Provider comparison and recommendations (sources checked 2026-11-19)
Provider facts below are from official documentation consulted during planning; exact prices change and **must be re-verified from provider docs at implementation time** — no price is hard-coded in this plan.

| Provider | Access / SDK | Capabilities relevant to M2B | Cost/free model facts | Feasibility |
|---|---|---|---|---|
| **OpenRouter** (compatibility layer) | OpenAI-compatible REST; `openai` SDK with base URL `https://openrouter.ai/api/v1`; `GET /api/v1/models` exposes pricing/modality | Chat, vision, tool calling, structured output; audio transcription and image endpoints via OpenAI-compatible paths; multi-provider routing; `:free` variants and `openrouter/free` router | Free models exist; free tier 50 req/day (1,000/day after $10 credit purchase); priced models post per-token rates; catalog uses sentinels `-1` (dynamic routers) and `0` (free) that must be handled explicitly; credit purchase fee ~5.5% | **First integration target**: one key unlocks free + paid + many models; existing gateway already speaks this wire format. Do not treat `:free` as free without checking availability/quota. |
| **OpenAI** | `openai` TS SDK / Responses API; REST | Text, image understanding, structured output, audio transcription with `srt`/`vtt`/`verbose_json`, diarization, word timestamps — directly useful for captions and speaker ID | Published per-million-token pricing by model (e.g., cheaper mini/Luna tiers vs frontier); no universal free tier for API | Good direct adapter for transcription + text; requires own account/key. |
| **Anthropic** | Messages API (direct or via OpenRouter) | Strong text/reasoning, image input; no native transcription/video | Paid per token; no free tier generally | Useful as optional premium writing/assistant model; route via OpenRouter first to avoid new SDK. |
| **Google Gemini** | `@google/genai` (Interactions API default since mid-2026) or OpenRouter | Text, image, audio, video, PDF; `gemini-3.5-transcribe` supports diarization + word-level timestamps; long context | Documented free tier (limited models, free tokens, product-improvement clause) and paid tier with higher limits/context caching | Strong for footage/scene understanding and transcription; free tier must be labeled with its data-use caveat. |
| **Local / offline** | MediaPipe tasks-vision (present); optional ONNX Runtime Web (new, approval needed) | Segmentation, face/object detection, local scene heuristics; local STT only after adding a model | No per-call cost; device resource limits | Free-by-construction; use for privacy-sensitive tasks and to keep core product usable offline. |

**Recommendation:** Implement the **OpenRouter-compatible adapter first** (reuses existing gateway, gives genuine free and paid models with one credential), then add direct OpenAI (transcription/SRT) and Gemini (multimodal) adapters behind the same interface; Anthropic via OpenRouter initially. Do not add native SDK dependencies until an adapter needs a capability the compatible REST path cannot provide.

## 4. Free and paid model strategy
- **Free classification:** only models with catalog `pricing.prompt == 0 && pricing.completion == 0` (handle `-1` dynamic routers separately as *unknown cost*, never "free"), plus local/offline models. Show limitations (rate limits, context, data-use terms).
- **Paid classification:** all others; show published estimate per million tokens, with "estimate" label and source timestamp.
- **Selection controls:** provider + model selector, capability badges, availability state, preferred model per task (chat/transcribe/analyze/retouch), fallback model, estimated cost, last-known status.
- **Routing:** task type → required capabilities → eligible models → user preference → entitlement/budget → availability/latency. Never silently switch free→paid; a paid request requires an explicit consent event recorded in the ledger. If paid unavailable/over budget: report and offer eligible free alternative.

## 5. Security and credential design
- Credentials live server-side only (existing pattern: `OPENROUTER_API_KEY`, etc.), ideally in a secret manager or `.env` on the gateway host; **no changes to production env/secrets in this planning milestone**.
- Keep JWT/JWKS verification, origin checks, body/message caps, allowlist, timeout; add per-user ledger keys derived from verified token subject.
- No key or raw media in logs; redact request IDs only. Explicit consent before uploading media to any cloud provider; show "local vs cloud" indicator.
- Treat project text as untrusted (existing MIA prompt already does); validate all provider JSON; cap response sizes.

## 6. Usage and cost controls
- `usage_events` ledger: timestamp, user, task, provider, model, input/output tokens, estimated cost (from catalog snapshot), confirmed cost if provider returns it, consent record, success/failure.
- Per-user soft/hard budgets and optional spending limits; subscription entitlement flags (source to be decided by operator); usage history UI; free-vs-paid labels everywhere. No payment collection or billing changes.

## 7. Phased implementation sequence (approval gates between phases)
1. **M2B-1 (server foundation):** provider/model registries, common adapter interface, capability matrix, catalog fetch with `-1`/`0` handling, availability monitor, gateway refactor to adapters, tests with mocked responses. **Gate:** operator approval of adapter list + credentials source.
2. **M2B-2 (routing, consent, accounting):** task router, consent gate, usage ledger, budget/entitlement checks, fallback rules; test matrix items 3–13. **Gate:** operator decision on entitlement/budget policy.
3. **M2B-3 (editor integration):** AI Control Center UI, model/provider selectors, MIA/chat uses chosen model, proposals still require per-operation approval; transcription → existing caption clips; titles/summaries/task history. **Gate:** browser smoke + no regression to trial workflow.
4. **M2B-4 (genuine verification):** authorized live calls for each integrated provider with test credentials; record real model IDs and costs; mark unverified capabilities clearly. **Gate:** operator authorization for live provider usage.
5. **M2B-5 (hardening):** rate limits, retries, cancellation, progress, size-boundary checks, performance with small/medium/large projects.

## 8. Required dependencies (not installed; approval required)
- Initially none if adapters use `fetch` against OpenAI-compatible endpoints.
- Optional: `openai` (TS SDK), `@anthropic-ai/sdk`, `@google/genai`, `onnxruntime-web` for local STT. Each needs maintenance/license/bundle-size review and an explicit dependency approval before `npm install`/lockfile change.

## 9. Test and acceptance matrix (planned)
| # | Required case | Planned test |
|---|---|---|
| 1–2 | Free / paid model selection | registry/catalog fixtures with `0` and paid prices; selector state tests |
| 3 | Adapter compatibility | one shared adapter contract test suite across all adapters |
| 4 | Capability detection | capability matrix from catalog modalities; unsupported task rejected |
| 5–7 | Invalid creds, timeouts, rate limits | mocked 401/504/429 + retry/backoff assertions |
| 8–9 | Free→paid restriction, explicit paid consent | router refuses paid without consent event; ledger assertion |
| 10–12 | Budget, accounting, entitlements | ledger + budget/entitlement unit tests |
| 13 | Browser credential isolation | static scan + browser test: no key strings in bundle/storage |
| 14–16 | Unavailable model, provider switching, task failure | mocked catalog/provider failure paths |
| 17 | Project-context preservation | proposal tests against M1/M2a project fixtures; no mutation before approval |
| 18 | Actual task execution | **live authorized calls only**; otherwise mark NOT VERIFIED |

Gates: vendor suite (currently 350 + 1 skipped harness), app 99, typecheck, production build, browser smoke of import→edit→save→export; no M2a checkpoint claims changed.

## 10. Risks and unresolved operator decisions
- **Credentials/accounts:** which OpenRouter/OpenAI/Gemini/Anthropic accounts and keys; where secrets are stored; no secret-store changes permitted here.
- **Live verification:** no genuine provider call is authorized yet; mocked tests alone cannot satisfy completion criterion 18.
- **Entitlements/budgets:** source of truth for subscription state and spending limits must be specified.
- **Pricing drift:** catalog prices/rate limits change; estimates must be fetched/cached with timestamp and clearly labeled.
- **Data privacy:** cloud analysis requires explicit media-upload consent; free tiers may use data for product improvement (Gemini documented).
- **Project-size boundary:** avoid re-parsing large projects in AI context building; respect M2a measured limits.
- **No implementation authorized:** this plan does not change source, dependencies, env, secrets, or Git state.

## 11. Explicit approval gates before implementation
1. Approve this plan and the M2B-1 scope (provider/model registry + OpenRouter-compatible adapter first).
2. Specify authorized provider accounts/credential storage and whether new SDK dependencies are permitted.
3. Approve entitlement/budget policy and paid-consent UX wording.
4. Authorize live provider calls (separate from mocked tests) for final verification.
5. Authorize each subsequent phase (M2B-2 … M2B-5) separately; **M2C is not included**.

**Planning status: READ-ONLY PLAN COMPLETE — AWAITING OPERATOR APPROVAL. NO M2B IMPLEMENTATION PERFORMED.**
