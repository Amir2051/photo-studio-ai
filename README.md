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
- The browser AI adapter calls a same-origin or configured server-side gateway at /api/ai/chat and /api/ai/scene. It does not send an OpenRouter key from the browser. The server endpoints, authentication, rate limits, model routing, and image-generation provider still need to be implemented and configured before enabling cloud AI.
- Scene placement, background segmentation, face detection/retouching, batch editing, and the 250+ preset catalogue are not implemented in this active application yet. Do not describe these as available features.
- Existing IndexedDB uses the legacy database name secureforge-lab-db so existing local browser data is not abandoned during the rebrand. A future migration should copy records transactionally before changing that name.

## Deployment

The GitHub Actions workflow builds and tests pull requests and pushes to main. A Pages artifact is produced by the build. Deployment is manual: enable GitHub Pages in repository settings, add the repository variable ENABLE_GITHUB_PAGES=true, then run the workflow_dispatch event on main. This avoids failing pull-request checks when Pages has not yet been enabled or is unavailable on the repository plan. Merge the repair pull request after reviewing the diff and successful CI; deployment is intentionally not triggered from this working branch.

## AI gateway contract

Configure VITE_AI_API_BASE_URL only with a public gateway URL (never an API key). The server must:

- Authenticate and authorize the user before accepting requests.
- Store provider credentials only in server-side secrets.
- Validate message sizes, image MIME types, image dimensions, model IDs, and allowed options.
- Apply rate limits, request timeouts, cost controls, and abuse protection.
- Return chat text as a content field or an OpenAI-compatible choices[0].message.content field.
- Return scene output as a scenes array with validated ScenePrompt objects.
- Avoid logging uploaded image payloads or sensitive prompts.

Until those endpoints exist, cloud AI and scene generation should remain unavailable and clearly labelled as such.
