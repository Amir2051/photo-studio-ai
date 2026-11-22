# MIA integration (Qwen / OpenRouter)

## Current architecture

The Studio video editor's MIA chat and visual-analysis routes now terminate at the Studio-owned Node proxy (server/mia-proxy.mjs) and call the shared central AI gateway (server/ai/central-gateway.mjs). The RZ Agent upstream URL and its separate service-key forwarding path have been removed from the active implementation. The proxy no longer calls the old RZ Agent endpoint.

MIA's selected model is **Qwen3.8 27B** through OpenRouter, pinned to the **Near AI** endpoint. The OpenRouter request policy is ZDR required, data collection denied, provider fallbacks disabled, and provider order pinned to Near AI. The browser never receives the OpenRouter credential.

## Model, provider, and cost

- Model: qwen/qwen3.8-27b
- Provider pin: Near AI (OpenRouter endpoint tag near-ai/fp8)
- OpenRouter ZDR endpoint registry rate checked 2026-11-21 (Near AI tag near-ai/fp8): $0.04 / 1M input tokens and $1.35 / 1M output tokens.
- Per-request estimated-cost ceiling: $0.001.
- Cumulative in-process ceiling: $0.05. This counter is currently in memory and resets if the proxy process restarts; it is not a durable monthly or lifetime cap.
- No retries, no fallback provider, no automatic provider switching.
- Qwen live execution remains disabled in the model registry pending a separate bounded Qwen pilot approval. This source change does not perform an inference request.

The owner-confirmed OpenRouter account setting is ZDR Only. The server also sends request-level zdr: true and data_collection: deny; endpoint eligibility is checked against OpenRouter's public ZDR endpoint registry. These controls do not independently prove provider-side retention behavior beyond OpenRouter's published endpoint classification.

## Server configuration

Required on the MIA proxy service:
- OPENROUTER_API_KEY — server-side secret only; never use a VITE_ prefix.
- STUDIO_ALLOWED_ORIGINS=https://every-frame-first-studio.onrender.com,https://studio.safenestt.com
- MIA_RATE_LIMIT_PER_MINUTE=20

MIA authentication is pinned in source to the dedicated Mini Studio Supabase project (texgwxmizyxsdzcfsjpo), using its JWKS and issuer. The proxy does not accept a configurable cross-project auth issuer.

The legacy STUDIO_MIA_SERVICE_API_KEY, if still present in Render, is not read or forwarded by the proxy and has not been deleted or rotated. RZ_AGENT_URL is no longer read by any active application code.

Run with node server/mia-proxy.mjs (Render supplies PORT). Health check: /health. Browser routes: /api/mia/chat, /api/mia/vision/status, and /api/mia/vision/analyze. The proxy verifies Supabase bearer tokens against the pinned Mini Studio JWKS, applies exact-origin CORS and per-user rate limits, and invokes the central gateway.

Production MIA chat and selected-frame analysis use https://every-frame-first-mia.onrender.com/api/mia, matching the actual Render service. Local development defaults to http://localhost:10000/api/mia and may be overridden with VITE_MIA_API_BASE_URL.

## Project context and edit safety

Each MIA chat request includes bounded metadata for the open project, active sequence, imported media properties, clip IDs/timing, track structure, transitions, and markers. It does not upload original video/audio bytes, thumbnails, or local file paths. MIA must not claim it has visually or audibly inspected footage.

MIA may return a bounded edit_proposal JSON block. The Studio validates operations against its allowlist and places them in AI Review. A proposal does not mutate the project. Each operation must be previewed and individually applied by the user; applying creates an undoable history entry. Source media is never overwritten.

## Visual frame analysis

The frame sampler decodes media locally and creates a contact sheet. Only 1–8 selected still frames can be submitted, and the user must explicitly approve the send action. The proxy accepts JPEG/PNG/WebP data URLs, caps each frame at 1.4 MB and the aggregate at 8 MB, and sends selected still images—not full video or audio—to the central gateway. Current Qwen live execution is disabled, so the status route reports unavailable and no frame request reaches OpenRouter.

## Remaining gates

- A separate bounded Qwen live test must be approved before live inference is enabled.
- The $0.05 cumulative budget is process-local, not durable across restarts. A durable cap/ledger is required before treating it as a persistent spending limit.
- Deployment environment must contain the existing OPENROUTER_API_KEY. Supabase authentication is pinned to the Mini Studio project in source. This local change does not update Render.
- This branch is not deployed by this change.
