# Mini Studio — Complete AI Feature Matrix

**Date:** 2026-11-21 · **Evidence labels:** VERIFIED / PARTIALLY VERIFIED / UNVERIFIED / BLOCKED / NOT IMPLEMENTED

## Provider/model inventory

| Provider / model | Identifier | Capability | Pricing evidence | Credential | Connection |
|---|---|---|---|---|---|
| OpenRouter / Qwen3.8 27B (Near AI) | qwen/qwen3.8-27b | Text + image input, text output; editor chat and approved still-frame analysis route through central gateway | Near AI ZDR endpoint registry: $0.04/M input, $1.35/M output (2026-11-21) | Local process environment and separate credential file detected; values not exposed. Render status unverified. | CONFIGURED LOCALLY; live execution disabled |
| OpenRouter / Mistral Nemo | mistralai/mistral-nemo | Text-only legacy controlled-pilot model | Historical io.net test price retained for one-shot authorization | Existing pilot configuration retained | CONTROLLED TEST ONLY; not MIA default |
| Local/offline guidance | OfflineProvider / local-guidance | Honest local text guidance; no generation | None | None | VERIFIED (works offline) |
| Supabase AI adapter | supabaseAiProvider → server gateway | Token-backed chat adapter; image endpoints 501 | Not applicable | Supabase session token | PARTIALLY VERIFIED (adapter only) |
| Gemini video intelligence | planned identity only | No adapter, no model | None | None | NOT IMPLEMENTED |
| Advanced analysis | planned identity only | No provider/model selected | None | None | NOT IMPLEMENTED |

## Feature matrix

| AI feature | Backend | Frontend | Provider | Tests | Status |
|---|---|---|---|---|---|
| Central AI gateway (policy, consent, budget, ledger) | server/ai/central-gateway.mjs, execute.mjs, consent.mjs, budget.mjs, ledger.mjs | n/a | provider-neutral | m2b1/m2b2/m2b5/m2b4 tests | VERIFIED (mocked, offline) |
| Qwen endpoint pin + strict ZDR request construction | Model registry pins Near AI; adapter constructs ZDR/data-collection/no-fallback fields and provider order | n/a | OpenRouter / Near AI | registry + m2b5 tests | CONFIGURED IN SOURCE; no live request |
| Endpoint-level ZDR eligibility | OpenRouter public ZDR endpoint registry | n/a | Near AI / near-ai/fp8 | registry GET (no inference) | VERIFIED as registry classification; provider behavior UNVERIFIED |
| Account-level ZDR Only | Owner-confirmed setting | n/a | OpenRouter | none | OWNER-CONFIRMED |
| Single-use local authorization | single-use-auth.mjs | n/a | local only | authorization tests | VERIFIED (offline; legacy Mistral grant) |
| Cost controls | budget.mjs: $0.001 estimated request ceiling and $0.05 cumulative in-process ceiling | n/a | OpenRouter | budget tests | REQUEST CEILING ENFORCED; cumulative cap is not durable across process restarts |
| MIA chat / editing suggestions | mia-proxy.mjs → central gateway → Qwen model registry | MIAChatPanel.svelte + AI Review | Qwen / OpenRouter / Near AI | mia-proxy.test.mjs + gateway tests | ROUTED LOCALLY; live execution disabled pending Qwen pilot |
| Approved still-frame analysis | local frame sampling; central gateway image route | VisualFrameReview.svelte | Qwen / OpenRouter / Near AI | mia-proxy.test.mjs | ROUTED LOCALLY; explicit selection/approval retained; live execution disabled |
| Editing proposals apply to project | agent/proposals.ts, tools, preview | AI Review panel | local operations | agent tests (vendor 350) | VERIFIED (local operations) |
| Automatic transcription / captions | No transcription route | Caption import UI (SRT/VTT) | none configured | caption tests | NOT IMPLEMENTED (AI transcription) |
| AI image generation | aiService.generateScene(); gateway /api/ai/scene returns 501 | StyleAssistantPanel shows OFFLINE | none | aiService tests assert no fabrication | NOT IMPLEMENTED |
| Cloud image editing (segment/retouch/cull) | Gateway endpoints 501 | No connected UI | none | aiService tests | NOT IMPLEMENTED |
| Local background removal / retouching | MediaPipe + portraitRetouch.ts (local, real) | BackgroundPanel, RetouchPanel | on-device models | existing tests | VERIFIED (local, not cloud AI) |
| Usage ledger / audit | In-memory metadata only | Diagnostics readout | n/a | m2b2 tests | VERIFIED (non-durable) |
| Durable consent / ledger | None | None | n/a | none | NOT IMPLEMENTED |
| Retries / fallbacks | Explicitly absent; Near AI provider order is pinned | n/a | n/a | authorization tests | VERIFIED (disabled) |

## Key conclusion

The MIA proxy no longer calls RZ Agent. MIA chat and approved still-frame analysis are routed through the central gateway with Qwen3.8 27B selected and Near AI pinned as the ZDR-listed endpoint. No provider inference or media upload was performed during this change. Qwen live execution remains disabled until a separate bounded Qwen pilot is approved. The $0.001 per-request estimate ceiling is enforced; the $0.05 cumulative ceiling is currently process-local and must become durable before it can be treated as a persistent account-level cap.

Image generation, cloud retouching, and AI transcription remain unimplemented; the application continues to fail closed rather than fabricating results.
