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
