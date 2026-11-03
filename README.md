# Every Frame First Studio

A private-by-default, browser-based photo editor. The active application is intentionally local-first: uploaded photographs are decoded, previewed, adjusted, saved in the browser IndexedDB, and exported without sending image data to a cloud service.

## Working in this branch

- JPEG, PNG, and WebP import (40 MB file-size and 24-megapixel safety limits).
- Non-destructive brightness, contrast, saturation, and warmth adjustments.
- Seven functional local looks: Natural, Portrait, Golden Hour, Cinematic, Monochrome, Soft Vintage, and Vivid.
- Undo, redo, reset, and original-versus-edit comparison.
- Full-source-resolution JPEG, PNG, and WebP export.
- Local IndexedDB photo library; saved items reopen with their original source and adjustment recipe.
- ZIP export helper for selected saved photos.
- Responsive desktop and mobile layout.
- PWA manifest and service worker. The worker caches the application shell and same-origin static assets only; it does not cache private photo blobs or API responses.
- Regression tests for immutable pixel processing.
- GitHub Pages workflow with dependency installation, tests, type-check/build, and deployment only from main.
- Unrelated SecureForge demo pages and their mock authentication store are moved into archive/legacy-secureforge and are not bundled into the active photo studio.

## Run locally

Requires Node.js 22.12+ (Node 24 is used in CI).

    npm ci
    npm test
    npm run build
    npm run dev

The editor runs locally at the Vite URL printed by the dev server. Production output is generated in dist/.

## Privacy and security boundaries

- Photo editing and local photo storage run in the browser.
- No authentication provider or cloud photo storage is currently configured. The product does not claim to provide user accounts or cross-device sync.
- The editor's local prompt helper maps a few natural-language words to deterministic slider adjustments. It is not a connected AI model.
- The browser AI adapter calls a same-origin server-side gateway at /api/ai/chat and /api/ai/scene. It never sends an OpenRouter key from the browser and requires a short-lived bearer session token from the future sign-in integration.
- The local Node gateway now validates JWTs against a configured HTTPS JWKS endpoint, enforces message/body limits, restricts browser origins, applies per-user rate limits, pins requests to a server-side model allowlist, and times out provider requests. It does not log request bodies or return upstream diagnostics.
- The gateway is deliberately fail-closed: without authentication and provider configuration it will not proxy AI requests. No Firebase or Supabase project has been selected or connected yet.
- Scene placement, background segmentation, face detection/retouching, batch editing, and the 250+ preset catalogue are not implemented in this active application yet. Do not describe these as available features.
- Existing IndexedDB uses the legacy database name secureforge-lab-db so existing local browser data is not abandoned during the rebrand. A future migration should copy records transactionally before changing that name.

## Deployment

The GitHub Actions workflow builds and tests pull requests and pushes to main. A Pages artifact is produced by the build. Deployment is manual: enable GitHub Pages in repository settings, add the repository variable ENABLE_GITHUB_PAGES=true, then run the workflow_dispatch event on main. This avoids failing pull-request checks when Pages has not yet been enabled or is unavailable on the repository plan. Merge the repair pull request after reviewing the diff and successful CI; deployment is intentionally not triggered from this working branch.

## AI gateway contract

The local gateway is `server/ai-gateway.mjs`. For local development, use two terminals:

    npm run gateway
    npm run dev

Vite proxies `/api/ai/*` to `127.0.0.1:18787`. Copy `.env.example` to `.env` and configure these server-only values before authenticated chat can work:

- `AUTH_JWKS_URL`: HTTPS JWKS endpoint for the selected identity provider.
- `AUTH_ISSUER` and `AUTH_AUDIENCE`: exact issuer and audience expected in signed access tokens.
- `OPENROUTER_API_KEY`: server-side provider key; never use a `VITE_` prefix.
- `AI_DEFAULT_MODEL`: one model identifier included in `AI_ALLOWED_MODELS`.
- `AI_ALLOWED_MODELS`: comma-separated server-approved model identifiers.
- `APP_URL`: application URL used for provider attribution.

The browser adapter accepts an access-token callback. The actual sign-in provider and token callback are not wired yet, so cloud AI remains unavailable until we choose Firebase or Supabase and integrate its session. The gateway health endpoint (`GET /health`) can be checked without credentials; chat requires a valid signed bearer token. Scene generation returns 501 and does not accept or upload images until a real image-generation provider is implemented.

Rate limits are process-local for this development milestone. Before a multi-instance production launch, move rate limiting to a shared store and add provider budget controls. Never log image payloads, prompts, bearer tokens, or provider credentials.
