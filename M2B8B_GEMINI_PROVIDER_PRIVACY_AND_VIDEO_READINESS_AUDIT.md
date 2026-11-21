# M2B-8B — Gemini Provider Privacy & Video Readiness Audit

**Date:** 2026-11-20
**Project:** Mini Studio / Photo Studio AI only (`photo-studio-ai`)
**Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92`
**Final status:** `GEMINI_VERTEX_REPLACEMENT_BLOCKED`

---

## 1. Executive decision

Gemini through Vertex AI **cannot safely replace the current OpenRouter route today**. The finding is not that Vertex AI is inherently non-compliant — it is the opposite: Vertex AI with an enterprise DPA is the only route Google itself points to for guaranteed zero data retention — but **none of the required evidence, implementation, credentials, or authorizations exist in this project**. Direct Gemini Developer API is affirmatively non-compliant with the owner's strict ZDR policy, and all Gemini routes reachable through OpenRouter fail the owner's Safety Retention rule.

No provider was activated or changed. The live gate remains `false`.

### Requested return items

1. **Final status:** `GEMINI_VERTEX_REPLACEMENT_BLOCKED` — do not replace OpenRouter; do not enable Gemini.
2. **Exact report location:** `photo-studio-ai/M2B8B_GEMINI_PROVIDER_PRIVACY_AND_VIDEO_READINESS_AUDIT.md`
3. **Gemini vs Vertex AI recommendation:** Direct Gemini Developer API — **NO**. Gemini via OpenRouter/Vertex — **NO**. Direct Vertex AI with independently verified enterprise ZDR/DPA — the **only** future-compliant candidate, but **not ready**; evaluate separately with explicit owner approval before any data is transmitted. Keep OpenRouter/Mistral Nemo unchanged (prepared, not live) until then.
4. **ZDR/privacy findings and blockers:** §4 below.
5. **WebM/video compatibility findings:** §5 below.
6. **Credential readiness without exposing secrets:** §6 below.
7. **Confirmation of no live requests or project changes:** §7 below.

---

## 2. Scope, boundaries, and method

Read-only inspection of source, tests, reports, and variable **names** only. No source, dependency, credential, environment value, or configuration was modified. No provider request, media upload, model download, server start, build, or test run was performed. No single-use grant was issued or consumed. No other project was touched.

Evidence was gathered from three read-only workstreams (AI control plane, video/WebM compatibility, prior-report synthesis) and direct verification of the live gate and credential variable names. Every claim below is tied to `file:line` evidence in this project.

---

## 3. Current provider route (baseline that must remain unchanged)

| Control | Finding |
|---|---|
| Registered providers | Only `openrouter` — `server/ai/provider-registry.mjs:27`; `server/ai/providers/` contains only `openrouter.mjs` |
| Model | `mistralai/mistral-nemo`, text-only (`inputModalities: ['text']`), `availability: 'adapter-ready'` — `server/ai/model-registry.mjs:33-60` |
| Persistent live gate | `liveExecutionEnabled: false` at `server/ai/model-registry.mjs:59`, `:79`, `:99`; no env/DB override exists in `server/ai` |
| Endpoint | `https://openrouter.ai/api/v1/chat/completions` — `server/ai/providers/openrouter.mjs:15,28`; grant pin at `server/ai/single-use-auth.mjs:15` |
| Strict ZDR payload | `zdr: true`, `data_collection: 'deny'`, `allow_fallbacks: false`, `require_parameters: true` — `server/ai/providers/openrouter.mjs:65-74`, `server/ai/central-gateway.mjs:12-17` |
| Fail closed | Policy mismatch rejected before provider lookup/network — `central-gateway.mjs:31-47`; adapter assertion before transmission — `openrouter.mjs:75-78` |
| No fallback / no retry | `router.mjs:67`, `execute.mjs:1-3`, `openrouter.mjs:29-30,46-47`, `single-use-auth.mjs:136` |
| Consent / grant | `consent.mjs:37-63`; in-memory single-use grant pinned to OpenRouter/Mistral/endpoint/exact prompt/32 tokens/$0.001/local process — `single-use-auth.mjs:11-26,72-160`; consumed before key use/fetch — `openrouter.mjs:29-48` |
| Budget | $0.05 cumulative Mistral/OpenRouter ceiling, no auto-increase — `server/ai/budget.mjs:1-6` |
| Ledger | In-memory, metadata only, rejects secret-like fields — `server/ai/ledger.mjs:5,12-15,19-40` |
| Planned Gemini entry | `planned/gemini-video-intelligence`: `provider: null`, all capabilities `false`, no modalities, no adapter, no price, `liveExecutionEnabled: false` — `model-registry.mjs:61-80`; router rejects `availability === 'planned'` — `router.mjs:47` |

No Google Cloud / Vertex / Gemini SDK, adapter, credential variable, or service-account mechanism exists in `server/ai`, `package.json`, or `.env.example`. The only Gemini reference in first-party server code is the planned registry entry above.

---

## 4. ZDR / privacy findings and unresolved blockers

### 4.1 Direct Gemini Developer API — blocked
- Google documents that Paid Services do not use prompts/responses for product improvement but **do log them for limited abuse monitoring**, and that developer logs are on by default for billing-enabled projects with retention configurable up to **55 days**: official docs `https://ai.google.dev/gemini-api/docs/zdr`, `https://ai.google.dev/gemini-api/docs/logs-policy`, cited in `M2B5_GEMINI_CREDENTIAL_AND_ZDR_READINESS_REPORT.md:26-28,34-36`.
- Prior conclusion: the direct route is **NOT ZDR-compliant**; no-training is not ZDR — `M2B5...:39,71`, `M2B5B_OPENROUTER_ZDR_AND_GEMINI_PROVIDER_READINESS_REPORT.md:49`.
- **Blocker:** no independently verified retention exception. Do not use for user prompts, frames, or project content.

### 4.2 Gemini through OpenRouter (Vertex endpoints) — blocked by owner policy
- Public ZDR registry: **46 Gemini-model rows, all Google Vertex endpoints** (`google-vertex/global`, `/priority`, `/flex`, `/us`, `/us-central1`) with `safety_retention: true` — `M2B5B...:52,60,78`.
- Owner-confirmed settings: **Allow Safety Retention OFF**, Google AI Studio disabled, Vertex/Safety-Retention endpoints not acceptable — `M2B5B...:12-13`; summarized in `M2B6_LOCAL_AI_FEATURE_READINESS_AND_IMPLEMENTATION_PLAN.md:89`.
- No exception enabled; no silent reroute — `M2B5B...:52`.
- **Blocker:** every available Gemini route violates the owner's retention rule. Gemini remains disabled.

### 4.3 Direct Vertex AI with enterprise DPA — only compliant candidate, not ready
- Google directs guaranteed-ZDR / enterprise-DPA workloads to Vertex AI — `https://ai.google.dev/gemini-api/docs/zdr` cited at `M2B5...:26,36`, `M2B5B...:47`.
- **Blockers:** no independently verified enterprise DPA/ZDR configuration (`M2B5...:73`), no adapter or provider registration (§3), no credential mechanism, no verified pricing/budget integration, no capability/model identity, and no explicit owner approval. Prior reports require an independent retention configuration plus explicit owner approval **before any user data is transmitted** — `M2B5...:76`, `M2B5B...:84`.

### 4.4 Current OpenRouter route — application controls verified, provider enforcement still open
- Application-level strict ZDR construction and fail-closed behavior are verified in code (§3); account-level "ZDR Only" is owner-confirmed in `M2B5B...:12-13` but not independently re-verified (`M2B8A_LIVE_AI_ASSISTED_VIDEO_PILOT_REPORT.md:38-39`).
- Endpoint-level `data_collection: 'deny'` enforcement **cannot be verified before sending** and is explicitly UNVERIFIED — `M2B5B...:43,80`; `M2B8A...:45`.
- The M2B8A pilot was blocked on five conditions including endpoint-level ZDR, capability mismatch, fixed-prompt grant, and missing operator approval — `M2B8A...:45-49,97-103`.
- Live gate remains `false` — `M2B8A...:17`; this audit did not change it.

### 4.5 Video / frame privacy boundary
- No silent video upload path exists. Media bytes leave the device only through explicitly approved actions: selected JPEG frames via "Approve & send selected frames" (`vendor/braincut/src/lib/ui/VisualFrameReview.svelte:174-205,261-262`), approval-gated agent export/frame tools (`.../agent/tools.ts:558-583,1321-1420,1431-1435`), and optional WHIP broadcast (`.../ui/MultiCameraStudio.svelte:292`).
- The visual-frame path posts selected frames to an **external RZ Agent** (`server/mia-proxy.mjs:174-189`; default upstream `https://rz-ai.safenestt.com`, `server/mia-proxy.mjs:210`) and is **outside** `server/ai/central-gateway.mjs`, the live gate, consent, single-use grant, budget, and ledger. Upstream ZDR is documented in `MIA-INTEGRATION.md:35,44` but is **not enforceable or verifiable from this repository**. Any provider replacement must account for this path; this audit did not exercise it.

### 4.6 Consolidated unresolved blockers
1. No independently verified Vertex enterprise DPA / ZDR configuration.
2. No Vertex adapter, SDK, provider registration, capability flags, or credential mechanism.
3. No Vertex pricing/budget/consent/ledger integration; the single-use grant is OpenRouter-specific.
4. Endpoint-level ZDR enforcement for the current OpenRouter route remains unverified pre-send.
5. MIA vision frames leave the browser to an external upstream not governed by the central gateway; upstream ZDR unverifiable here.
6. Direct Gemini Developer API retention fails strict ZDR.
7. OpenRouter Gemini routes require Safety Retention, which the owner disabled.
8. No video-understanding model is registered; the current model is text-only and the planned Gemini entry is non-executable.
9. No live transmission authorization, operator approval phrase, or grant exists.

---

## 5. WebM / video compatibility findings

### 5.1 Inputs
- WebM is a first-class input: `webm` is in `VIDEO_EXTENSIONS` — `vendor/braincut/src/lib/media/import.ts:10-26` (`:14`); `isMediaFile()` accepts any `video/*` MIME and extension allowlist — `:54-69`; picker/fallback paths at `:348-400`.
- Container/codec probing uses mediabunny `ALL_FORMATS` — `vendor/braincut/src/lib/media/probe.ts:118-132,170-217`; WebM demuxing and `video/webm` are supported by mediabunny (`src/input-format.ts:309-327`). VP8/VP9/AV1 names recognized — `probe.ts:18-33`.
- Undecodable sources are flagged `unsupported` with a conversion suggestion, not rejected — `probe.ts:220-246`.

### 5.2 Outputs and processing
- WebM export presets `webm-vp9` and `webm-av1` — `vendor/braincut/src/lib/export/presets.ts:109-132`; `WebMOutputFormat` and `video/webm` MIME — `:265-288`; UI container/codec options — `vendor/braincut/src/lib/ui/dialogs/ExportDialog.svelte:56-76`.
- Camera/multicam recordings produce WebM blobs — `MultiCameraStudio.svelte:692-728`, `LiveCameraCapture.svelte:159-180`, `MulticamEditor.svelte:599-655`, `MicrophoneRecorder.svelte:83-100`.
- Decode/encode is WebCodecs-based via mediabunny — `media-reader.ts:13-25,72-98,296-345`, `export/render.ts:183-219`; capability detection at `storage/capabilities.ts:13-14,35-36,63-64`.
- ffmpeg.wasm conversion is **disabled by default** (empty mirror), capped at ~2 GB, and emits **MP4/H.264/AAC only** — `media/transcode.ts:15-18,63-114,133,77-84`; `stores/preferences.ts:20-22,54`. It is not a WebM path.

### 5.3 AI-assisted video workflow
- Real frame pipeline: frame extraction/contact sheet (`media/contact-sheet.ts`, `media/thumbnails.ts:51-76,116-125,156-174`) → user selection → explicit approval (`VisualFrameReview.svelte:174-205`) → external vision analysis. Bounded to ≤8 JPEG frames/request (`:176`).
- MIA chat carries metadata only, no media bytes — `MIAChatPanel.svelte:58-100,145-156`.
- Current registered model cannot perform video/scene/audio analysis — all video capabilities false in `model-registry.mjs:17-30,61-80`; `router.mjs:8-16,41-52`; M2B8A records the capability mismatch — `M2B8A...:24,49`.

### 5.4 Browser caveats
- Chrome/Edge favored: "This browser can't encode video… Firefox and Safari are still catching up" — `export/presets.ts:366`; AAC unavailable in Firefox/desktop Linux and WebM VP9+Opus recommended as compatible fallback — `:418,428-467`.
- Firefox-on-Windows H.264 `avcC` workaround — `export/avcc.ts:1-8,29-57`.
- WebCodecs/OPFS availability is runtime-detected; agent export upload requires Chromium — `agent/tools.ts:1348`.
- Vision path requires configured `OPENROUTER_VISION_MODEL` + ZDR upstream; motion/audio/pause/speaker/transcription remain unavailable — `VisualFrameReview.svelte:255-257`, `MIAChatPanel.svelte:150`.

**Compatibility conclusion:** WebM is technically ready for local editing and export. It is **not** a blocker to a provider swap. The blocker is provider capability/privacy, not container format.

---

## 6. Credential readiness (no values exposed)

- Variable **names** present in `photo-studio-ai/.env`: `OPENROUTER_API_KEY`, `STUDIO_MIA_SERVICE_API_KEY`, plus non-provider gateway/auth/turn variables. **No** `GOOGLE_*`, `VERTEX*`, `GEMINI*`, `GCP_*`, or `GOOGLE_APPLICATION_CREDENTIALS` name exists.
- `.env.example` declares `OPENROUTER_API_KEY` (`:17`) and `STUDIO_MIA_SERVICE_API_KEY` (`:37`); no Google/Vertex/Gemini credential name.
- Runtime provider credential read is `OPENROUTER_API_KEY` only — `server/ai-gateway.mjs:281`; `server/ai/**` has no `process.env` reads. No service-account/ADC mechanism exists.
- Prior safe findings: credential file present and readable, OpenRouter-style shape (`sk-or-…`), **not** Gemini Developer API shape (`AIza…`), provider route unresolved, **no secret value exposed** — `M2B5...:13-20`, `M2B5B...:18-26`; credential presence does not establish billing, model availability, retention, or ZDR — `M2B5B...:26`.
- This audit read only variable names. No value, prefix, suffix, partial key, log, or report content was exposed; no credential was changed, copied, committed, or transmitted.

**Readiness conclusion:** OpenRouter credentials are the only provider credentials available. Vertex AI credential readiness is **absent**, not merely unverified.

---

## 7. No live requests and no project changes

Verified during this audit:

- **Live provider gate:** `liveExecutionEnabled: false` before and after the audit — `server/ai/model-registry.mjs:59,79,99` (direct re-check performed). Not changed.
- **Provider requests:** **zero**. No OpenRouter, Gemini, Vertex, or MIA request was issued; no status/registry endpoint was called; no media was uploaded.
- **Grants:** **zero** issued, consumed, revoked, or synthesized; no approval phrase was entered; no single-use grant exists.
- **Media:** no file opened, decoded, encoded, or uploaded by this audit.
- **Processes:** no dev server, build, test, or network client started.
- **Configuration/secrets:** no environment value, credential, dependency, lockfile, source file, or configuration was modified.
- **Changes:** the only file created is this report. Pre-existing user work (modified/untracked files recorded at baseline under HEAD `1ecce92`) was left untouched; no staging, commit, reset, clean, branch, or tag operation occurred.
- **Other projects:** none touched. PodCut work in the sibling directory was not part of this audit and was not continued.

Final verification of the above was performed after writing this report.

---

## 8. Final status and required owner approval

**`GEMINI_VERTEX_REPLACEMENT_BLOCKED`**

Do not enable Gemini, do not swap providers, and do not transmit prompts or frames to any new provider. Preserve the current OpenRouter/Mistral Nemo strict-ZDR route **as prepared but non-live**; preserve consent, single-use grants, budget, ledger, no-fallback, and live-gate controls exactly as they are.

If Gemini-class capability is required later, the minimum independent prerequisites are: (1) documented enterprise DPA/ZDR configuration for Vertex AI with independent retention evidence; (2) explicit owner authorization naming provider, model, capability, data classes, and cost ceiling; (3) a new adapter/provider registration with verified pricing, capability/modality declarations, and budget/consent/ledger integration; (4) a fresh grant design that does not inherit the OpenRouter-specific pinned descriptor; and (5) no live request until (1)–(4) are reviewed and approved.

**STOP — await owner approval. No implementation or testing is authorized by this audit.**
