# Every Frame First Studio

A private-by-default, browser-based photo editor. The active application is intentionally local-first: uploaded photographs are decoded, previewed, adjusted, saved in the browser IndexedDB, and exported without sending image data to a cloud service.

## Working in this branch

- JPEG, PNG, and WebP import (40 MB file-size and 24-megapixel safety limits).
- Non-destructive brightness, contrast, saturation, and warmth adjustments.
- A searchable 195-look filter catalogue across 19 categories, with intensity control for the supported tone/color recipe fields, plus seven quick looks.
- Portrait retouch now includes local MediaPipe face landmarks for automatic face-aware skin smoothing and a manual brush for precise areas; eye, eyebrow, and lip regions are excluded from automatic smoothing.
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
- Firebase email/password authentication is integrated in the active app. Configure the `VITE_FIREBASE_*` values before production use; Firebase Authentication's Email/Password provider must also be enabled in the Firebase console.
- The editor's photo library remains local in browser IndexedDB. Sign-in does not upload photos or provide cross-device sync.
- The editor's local prompt helper maps a few natural-language words to deterministic slider adjustments. It is not a connected AI model.
- The browser AI adapter calls a same-origin server-side gateway at /api/ai/chat and /api/ai/scene. src/lib/firebaseAiProvider.ts supplies the current Firebase user's ID token on demand; no OpenRouter key is included in browser code. The active editor UI still uses its local prompt helper and does not yet expose a connected cloud AI chat workflow.
- The local Node gateway validates JWTs against a configured HTTPS JWKS endpoint, enforces message/body limits, restricts browser origins, applies per-user rate limits with bounded in-memory buckets (10,000 maximum by default) and stale-bucket pruning, pins requests to a server-side model allowlist, and times out provider requests. It does not log request bodies or return upstream diagnostics.
- The gateway is deliberately fail-closed: without valid Firebase token-verification settings and provider configuration it will not proxy AI requests. The gateway verification values for `photo-editor-rz` are included in `.env.example`.
- Scene placement and background segmentation are not implemented. Batch editing and reusable Style Recipes are available locally. The 195-look catalogue is searchable and applies supported exposure, brightness, contrast, temperature, and saturation settings.
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

Firebase email/password sign-in is now wired into the application shell. The browser AI adapter accepts an access-token callback, but the active editor does not yet connect a cloud AI chat interface to it. The gateway health endpoint (`GET /health`) can be checked without credentials; chat requires a valid signed Firebase bearer token. Scene generation returns 501 and does not accept or upload images until a real image-generation provider is implemented.

Rate limits are process-local for this development milestone. The bucket map is bounded and expired buckets are pruned, but limits are not shared across gateway processes. Before a multi-instance production launch, move rate limiting to a shared store and add provider budget controls. Never log image payloads, prompts, bearer tokens, or provider credentials.

- Reference-to-batch workflow: save the current edit as a reusable Style Recipe in IndexedDB, add up to 20 target photos (80 MP total), preview the recipe on the group, and export full-resolution JPEG/PNG/WebP results in one ZIP. Recipes remain local to the browser. Automatic face smoothing is detected independently per target; hand-painted brush strokes are intentionally not copied between people/photos.

## Professional and Portrait workspaces

The editor provides separate Professional Studio and Portrait Studio workspaces. Professional Studio includes manual exposure, brightness, contrast, highlights, shadows, whites, blacks, temperature, tint, vibrance, saturation, hue, film grain, vignette, clarity, texture, sharpening, noise reduction, brush-based local exposure/color, and linear/radial masks. These operations run locally and are included in full-resolution exports, local photo saves, Style Recipes, and batch recipe rendering. Portrait Studio provides local face detection, face-aware skin smoothing, a manual retouch brush, and a basic clone-style healing/blemish brush. Healing strokes are photo-specific and are not copied to other images in Style Recipes.

The Professional Studio also includes master RGB and independent red, green, and blue tone curves, each with four adjustable tonal anchors and selective HSL controls for red, orange, yellow, green, aqua, blue, purple, and magenta. Each HSL range has independent hue, saturation, and luminance controls. Curve and HSL values are stored in the same local edit history and Style Recipes as the other manual adjustments. Detail controls use a local neighborhood filter; local masks support brush, linear-gradient, and radial falloff geometry with exposure, temperature, and saturation. Healing samples nearby original pixels and is intentionally a simple local clone-style tool rather than content-aware AI healing.
