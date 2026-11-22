# Evoto-Aligned Roadmap — "Every Frame First Studio"

Goal: evolve this repo toward the Evoto.ai workflow (cull → retouch → batch → deliver) while
keeping its local-first privacy DNA, adding optional cloud AI (hybrid model).

## What Evoto does (reference)

- End-to-end pro photography workflow: cull, color grade, per-face AI portrait retouch,
  background adjust/replace, batch processing/sync across a set, gallery delivery.
- Desktop/iPad/mobile/browser; credit-based pricing; cloud processing; SOC2/GDPR posture.
- Signature features: per-face skin retouch (texture-preserving), blemish/stray-hair/
  glasses-glare removal, AI masks, high-volume batch sync, proofing/delivery.

## Current state of this repo (honest gap analysis)

| Evoto capability | Status here |
| --- | --- |
| Non-destructive develop (exposure/curves/HSL/masks/heal) | ✅ Strong (Professional Studio) |
| Face-aware skin smoothing + manual brush | ✅ Basic (MediaPipe, `portraitRetouch.ts`) |
| Batch editing | ⚠️ Partial (Style Recipes + ZIP export, ≤20 photos/80 MP) |
| 195-look filter catalogue | ✅ Present |
| Portrait makeup/accessories | ✅ Present (`faceMakeup.ts`, `faceAccessories.ts`) |
| Cloud AI | ⚠️ Gateway exists (`server/ai-gateway.mjs`) but text-chat only; scene returns 501; editor UI does not call it |
| Culling | ❌ Missing |
| Background remove/replace/blur | ❌ Missing ("Scene placement and background segmentation are not implemented" — README) |
| Gallery sharing / delivery | ❌ Missing |
| Blemish / glasses-glare / stray-hair removal | ❌ Missing |
| Per-face independent controls | ❌ Missing (all faces get one global strength) |
| Evoto-grade UI/branding | ❌ Current UI is a dense single-page editor, not a workflow app |
| Monolith | ⚠️ `Home.tsx` is ~205 KB — must be split as part of any redesign |

## Constraints / decisions to lock

1. **Hybrid AI**: local processing stays default; cloud AI is opt-in via the existing gateway.
   No image bytes leave the browser without an explicit user action + sign-in.
2. **No fake AI**: every "AI" badge must map to a real local model (MediaPipe/TF.js/ONNX) or a
   real server-side provider call. No simulated results shipped as AI.
3. **Keep IndexedDB local-first** for photos; cloud only for auth, optional AI, and (new) galleries.
4. **Legacy DB name** `secureforge-lab-db` stays until a migration ships.
5. Split `Home.tsx` into feature modules before/while adding features.

## Phase status (updated 2026-11-17)

- Phase 0 — PARTIAL: AI provider registry with capability flags + fail-closed gateway endpoints (`/segment`, `/retouch`, `/cull-score`) done; monolith split started (`domImage.ts`, `FilterThumbnail.tsx` extracted); `Home.tsx` still ~4.7k lines — further decomposition ongoing.
- Phase 1 — DONE (shell + branding): Minu Studio rebrand, workflow step bar (Import → Cull → Edit → Batch → Deliver), `/privacy` page. Marketing landing route not built (in-app first, per scope).
- Phase 2 — DONE (v2): sync-current-edits batch source, per-item progress/status, error isolation, cancel, badges, full-res ZIP. Worker pool not added (sequential rendering with cancellation chosen for reliability).
- Phase 3 — DONE: `/cull` workspace, local heuristic scoring, keyboard ratings, pick/reject, filters/sort, sessions in IndexedDB (v3), keepers → library / ZIP, CSV report. Cloud cull-score endpoint stubbed (501).
- Phase 4 — DONE (local grade): per-face smoothing, auto blemish detection + healing strokes, glasses-glare suppression. Cloud retouch endpoint stubbed (501). Frequency separation deferred.
- Phase 5 — DONE (local grade): MediaPipe selfie segmentation (model in `public/models/selfie_multiclass.tflite`), blur/dim/color/gradient replace. Cloud segment/generative replace stubbed (501).
- Phase 6 - DONE: Supabase galleries (`/gallery/:shareId` public route) - Edge Function `create-gallery-share` verifies Supabase access tokens via `auth.getUser`; RLS-gated `gallery_shares` table hides expired shares; public `gallery-shares` bucket; plus offline local gallery ZIP. Firebase was fully removed on 2026-11-18; Supabase Auth is the only auth.
- Phase 7 — DONE (docs + privacy page): `/privacy`, README/PRODUCTION_READINESS updates. Credits/metering intentionally out of scope. Monolith decomposition + any E2E suite remain open.

## Phase plan

### Phase 0 — Foundations (prerequisite, 1–2 days)
- Extract `Home.tsx` into `src/features/{editor,library,batch,retouch}/` modules; route-level code splitting.
- Add `src/lib/ai/` provider registry mirroring `aiService.ts` but with capability flags
  (`retouch`, `segment`, `cull`, `chat`) so local/cloud providers are swappable.
- Extend gateway contract: `POST /api/ai/segment`, `/api/ai/retouch`, `/api/ai/cull-score`
  (501 until server provider configured, same fail-closed pattern as `/scene`).
- CI: keep `npm test` + typecheck gates green; add tests for every new pure module.

### Phase 1 — Evoto-like UI/branding shell (2–4 days)
- New app shell: dark workspace, left tool rail, right adjustment panels, top bar with
  Import / Cull / Edit / Batch / Deliver steps (Evoto-style workflow nav).
- Marketing-free in-app experience; optional public landing page route at `/welcome`.
- Design tokens in `index.css` (already Tailwind 4); keep PWA manifest.
- Split AuthBoundary/onboarding to explain local-first + optional cloud AI (privacy copy like Evoto's).

### Phase 2 — Batch processing v2 (2–3 days)
- "Sync edits" model: copy an adjustment recipe from one photo to N selected photos (Evoto's core).
- Raise limits via Web Worker pool + chunked rendering; keep 80 MP guard as configurable per-session cap.
- Per-target progress UI, cancel, and error isolation (one bad file doesn't kill the batch).
- Style Recipes get thumbnails + rename + folders.

### Phase 3 — Culling workflow (3–5 days)
- New `/cull` route: grid import of a folder/selection (multiple files), loupe view,
  keyboard ratings (1–5 / pick / reject), color labels, sort/filter, "select keepers → send to editor".
- Optional AI-assist (hybrid): local sharpness/exposure/face-detection scoring via existing
  MediaPipe + canvas heuristics (eyes-closed detection via blendshapes); cloud scoring endpoint stub.
- Ratings stored in a new IndexedDB store (`cull-sessions`); export keeper list as XMP-ish JSON/CSV.

### Phase 4 — AI portrait retouch upgrades (4–6 days)
- Per-face controls: select a face from MediaPipe landmarks → independent smoothing/dodge/sharpen sliders.
- Blemish removal: local spot-heal already exists — add auto-detect of high-chroma/high-contrast
  spots inside face-oval-minus-features mask (local heuristic) + one-click "remove blemishes".
- Stray-hair / glasses-glare: cloud endpoint (`/api/ai/retouch`) with fail-closed 501 + local
  fallback (glare = specular highlight suppression inside glasses region from landmarks/edges;
  stray hair = edge-aware inpainting stub, honestly labeled).
- Frequency-separation-style smoothing (two-layer) for texture-preserving skin.
- Keep all retouch params in the same recipe/history/Style Recipe pipeline.

### Phase 5 — Background tools (3–5 days)
- Local: MediaPipe selfie/multiclass segmentation (tasks-vision image segmenter) to build a
  person/background mask; ops: blur background, replace with color/gradient/local image,
  background exposure/saturation via mask; feather + edge refine brush.
- Cloud: `/api/ai/segment` + `/api/ai/background` generative replace via configured provider (hybrid opt-in).
- Mask reused by portrait retouch (background-aware retouch order: bg → retouch).

### Phase 6 — Gallery sharing / delivery (3–5 days)
- New `/deliver` route: pick exported JPEGs, generate a client gallery manifest,
  upload optional (Firebase Storage or existing gateway), share link with token + expiry.
- Local-only mode: export a self-contained static gallery ZIP (HTML + images) — no server needed.
- Client proofing: favorite/comment via Firestore (reuse Firebase auth); watermark-on-export option.

### Phase 7 — Packaging & trust (1–2 days)
- Credit-less "usage" dashboard (images exported, batch runs) kept local.
- Privacy/security page in-app; update README, PRODUCTION_READINESS; keep gateway fail-closed.
- E2E smoke (Playwright optional) for import → edit → export path.

## Suggested order & milestones

M1 (Phases 0+1): workflow shell + modular codebase — visible "Evoto feel".
M2 (Phases 2+3): shoot → cull → batch edit loop working offline.
M3 (Phases 4+5): flagship AI retouch + background, hybrid cloud opt-in.
M4 (Phases 6+7): gallery delivery + hardening.

## Honest scope notes

- Full parity with Evoto's cloud generative engine (glasses-glare removal quality, trained
  per-face models) is not achievable purely locally; the hybrid path is where those
  land. Local versions will be "good heuristic" grade and labeled as such.
- Culling AI on-device is heuristic (sharpness/exposure/eyes), not aesthetic judgment.
- Gallery delivery needs a backend decision: Firebase (already in repo) is the cheapest path.
- Estimated total: ~15–25 dev-days for all phases; each phase is shippable independently.

## Locked decisions (2026-11-17)

1. Gallery delivery backend: **Supabase** (free tier; Supabase Auth is the only auth since 2026-11-18 — Firebase removed entirely).
2. Rebrand: **"Minu Studio"** (working name — final tagline/domain TBD by owner).
3. Cloud AI provider (opt-in): **OpenRouter image models** via the existing gateway.
4. Credits/pricing: **out of scope** — free app, no metering or paywall.

## Open questions before coding

1. Final tagline/domain for Minu Studio (placeholder: "Minu Studio — every frame, first time right").
2. Firebase project: **reuse `photo-editor-rz`** (decided 2026-11-17). Plan: enable
   Firebase Storage + Firestore in that project for Minu Studio galleries, keep a
   `galleries`/`gallery-shares` collection structure isolated from existing data,
   and use per-user security rules keyed to auth uid.
3. Rebrand depth: full rename of package/DB/README/CNAME, or UI-level branding first?
