# MIA integration (local Phase 2 work)

The video studio MIA panel connects to the existing RZ Agent account API. The browser sends credentials only to the RZ Agent HTTPS origin and uses the RZ Agent `rz_session` HTTP-only cookie for subsequent requests. It does not store RZ passwords, API tokens, or service keys.

## Configuration

- Studio build setting: `VITE_RZ_AGENT_URL=https://rz-ai.safenestt.com` (this is the default).
- RZ Agent server setting: `STUDIO_ALLOWED_ORIGINS=https://studio.safenestt.com`. Keep `APP_ORIGIN` set to the RZ Agent origin. Use exact origins only; never `*`.
- RZ Agent CORS allows credentialed `GET`, `POST`, and `OPTIONS` requests from the configured exact origins. Login/logout origin validation uses the same allowlist.

These are configuration instructions only. No production environment variables or deployments were changed.

## Project context and privacy

Each MIA chat request includes bounded metadata for the open project, active sequence, imported media properties, clip IDs/timing, track structure, transitions, and markers. It does **not** upload original video/audio bytes, thumbnails, local file paths, or extracted frames. MIA must not claim it has visually or audibly inspected footage. Requests requiring scene recognition, pause detection, speaker identification, or transcription are disclosed as unavailable until a separate user-approved media-analysis path is implemented.

## Edit safety

MIA may return a bounded `edit_proposal` JSON block. The studio validates every operation against the existing allowlist and places it in AI Review. A proposal does not mutate the project. Each operation must be previewed and individually applied by the user; applying creates an undoable history entry. Rejecting or cancelling leaves the project unchanged. Source media is never overwritten.

## Current limitations

- The RZ Agent API and browser CORS configuration must be deployed/configured before live sign-in works from production studio.
- This branch is not deployed.
- The project context is metadata-only; no video vision/audio analysis or automatic footage upload is implemented.
- Chat history/session ID is held in component memory; signing out clears it.


## Local visual frame sampling

The MIA panel includes a Visual Intelligence frame sampler for the active sequence. It reads original media locally through the editor's existing media source and Mediabunny thumbnail pipeline, samples up to 30 frames at a user-selected interval, and presents a contact sheet with per-frame selection. Frame pixels are held as browser-local data URLs for review only; they are not added to the RZ Agent chat payload, uploaded, persisted to the project, or sent to any provider. The UI currently offers a timestamp-list copy action, not a frame-send action. Vision analysis remains intentionally disconnected until a provider/model is selected and an explicit per-send approval flow is implemented.

## Cloud visual analysis (explicit approval required)

The Studio visual sampler can submit a user-selected set of up to 8 still frames to the authenticated RZ Agent endpoint `POST /v1/studio/vision/analyze`. The browser sends frames only after the user reviews the contact sheet, sees the configured OpenRouter model/destination, and presses **Approve & send selected frames**. The request is authenticated with the existing HttpOnly RZ session cookie; no provider key is exposed to the browser. The server accepts only JPEG/PNG/WebP data URLs, caps each frame at 1.4 MB and the total at 8 MB, uses `OPENROUTER_VISION_MODEL`, forces OpenRouter `zdr: true` and `data_collection: deny`, and disables provider fallbacks. A rejected request fails closed rather than sending frames to another model/provider. The endpoint does not write images or analysis to conversation history or project storage.

Before cloud analysis is enabled on a deployment, configure `OPENROUTER_VISION_MODEL` to a vision-capable OpenRouter model whose endpoint is eligible under the account's ZDR and data-collection policies. If it is unset, the Studio displays that visual analysis is unavailable and does not offer a send action. No production environment variable or deployment was changed as part of this implementation.


## Studio-owned authentication and RZ Agent service bridge

The editor no longer uses RZ Agent's interactive /v1/auth/login, /v1/auth/me, or /v1/auth/logout endpoints. MIA inherits the user's existing Minu Studio Supabase Auth session from the same-origin parent shell. The parent shell responds only to messages from its own embedded /video-studio/ iframe and provides a short-lived Supabase access token; the video editor never receives an RZ Agent password, cookie, API key, or service credential.

The browser sends that Supabase access token to the separate minu-studio-mia Node service. The proxy verifies the token against Supabase auth JWKS (AUTH_JWKS_URL / AUTH_ISSUER / AUTH_AUDIENCE), applies per-user rate limits, and forwards only the supported chat and visual-analysis routes to RZ Agent. The proxy authenticates upstream with X-Api-Key: STUDIO_MIA_SERVICE_API_KEY. That key exists only in Render server environment variables. The RZ Agent's existing OpenRouter credentials, chat model, vision model, ZDR setting, and no-fallback policy remain authoritative.

### Proxy service environment

- AUTH_JWKS_URL=https://texgwxmizyxsdzcfsjpo.supabase.co/auth/v1/.well-known/jwks.json
- AUTH_ISSUER=https://texgwxmizyxsdzcfsjpo.supabase.co/auth/v1
- AUTH_AUDIENCE=authenticated
- STUDIO_MIA_SERVICE_API_KEY=<same dedicated service key configured on the RZ Agent service>
- RZ_AGENT_URL=https://rz-ai.safenestt.com
- STUDIO_ALLOWED_ORIGINS=https://every-frame-first-studio.onrender.com,https://studio.safenestt.com
- MIA_RATE_LIMIT_PER_MINUTE=20

Run with node server/mia-proxy.mjs (Render supplies PORT). Health check: /health. Browser routes: /api/mia/chat, /api/mia/vision/status, and /api/mia/vision/analyze. The proxy accepts only Supabase bearer tokens, never cookies or browser-supplied upstream credentials. CORS is an additional browser boundary, not the authentication mechanism.

The Studio static build uses VITE_MIA_API_BASE_URL=https://every-frame-first-mia.onrender.com/api/mia (the code has this as its default). The proxy does not store prompts, frame payloads, or project data. The existing explicit still-frame selection/approval flow remains unchanged; the proxy validates 1–8 JPEG/PNG/WebP frames and enforces the 1.4 MB per-frame / 8 MB aggregate limits before forwarding.
