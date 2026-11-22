# M2B-7B — Desktop and Synthetic Media Verification Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Type:** Read-only verification. No source fixes, no bundle rebuild, no dependency changes, no provider requests, no commits.

---

## 1. Preflight, servers and preservation

| Item | Result |
|---|---|
| Root / branch / HEAD | Expected values, unchanged |
| `git status --short` baseline | 24 modified / 121 untracked, staged 0 — matches approved post-M2B7 state |
| Frozen tag / original / main | `cdb1238e…` / `cdb1238e…` / `2c451768…` — unchanged |
| Live provider gate | `liveExecutionEnabled: false` — confirmed at start and end |
| Dev server 5173 | Existing server reused (HTTP 200); no duplicate started |
| Vendor source server | The `localhost:5174` Vite dev server started in the previous pass was reused for Braincut source-mode tests and **stopped by this pass** (node PID 8280). No `public/video-studio/` build or copy was run |

**Synthetic fixtures (all locally generated, non-sensitive):**
`m2b7b-image.png` (800×600 gradient + rectangle, 35,555 B), `m2b7b-audio.wav` (4 s, 440 Hz tone with 0.5 s silence at each end, 352,844 B), `m2b7b-video.webm` (browser-generated WebM, 4,002 B, saved to temp), plus in-browser generated `m2b7b-video-valid.webm` (2.2 s, 640×360, ~12.66 fps) and `m2b7b-audio-continuous.wav` (2 s continuous tone). Outputs: `m2b7b-image-edited.jpeg` (13,504 B), `Sequence 1.webm` (10,398 B).

---

## 2. Desktop layout verification

Automation initially had an 843×602 CSS viewport. I enlarged the local OpenCode window (a local UI action, not a repo/config change) to obtain **1512×912 CSS px**, satisfying the ≥1440×900 requirement.

| Test | Status | Steps | Expected / observed | Outcome class |
|---|---|---|---|---|
| Splitters visible at desktop width | PASS | Resized window; queried `.studio-splitter` computed styles | Two separators with `display:grid`, 6 px wide; shell grid `264px 6px 916px 6px 320px` | Panel mounted; control visible |
| Drag left splitter right | PASS | Pointer-down on handle + pointer-move +120 px | `--pro-left` 264→387 px; grid column followed; localStorage `{"left":387,...}` | Control responds |
| Drag left splitter left | PASS | Pointer drag −180 px | `--pro-left` 387→210 px (clamped at 200 px min); grid `210px 6px 1004px 6px 320px` | Control responds |
| Drag right splitter both directions | PASS | Pointer drags −120 px and +160 px | `--pro-right` 320→443 px then →286 px (within 260–520 clamp); localStorage updated | Control responds |
| Collapse / restore both columns | PASS | Clicked Library, then Tools, then both again | `data-*-collapsed` false→true→false; `.pro-tools` display flex→none→flex; grid columns 0px while collapsed | Control responds |
| Persist after reload | PASS | Collapsed both, reloaded, restored | After reload flags still `true`, stored `{"left":210,"right":286,"collapsedLibrary":true,"collapsedTools":true}`; restore wrote `false/false` and widths stayed 210/286 | Workflow works |
| Canvas usable / no overlap | PASS | Observed stage, sliders, tool rail after drags and reload | Canvas remained 800×600 with editing controls present; no overlapping/disappeared panels | Workflow works |
| Wider desktop viewport | BLOCKED | Enlarged to 1762×987 and attempted React shell check | The React app session had expired to the sign-in screen, so `.pro-shell` was absent and the wider-layout check could not be completed. Vendor editor reported the wider viewport correctly | Auth/session (browser), not code |

---

## 3. Contextual inspector verification

| Section | Chips exercised | Status | Observed | Outcome class |
|---|---|---|---|---|
| Editor/Photo | Adjustments, Masking, Layers, History | PASS | Each click scrolled `.pro-tools` to the matching real panel (`color-workspace`, `masking-workspace`, `layers-workspace`, `history-workspace`), all `display:block` and visible; e.g. scrollTop 0→63→250→0→16 | Control responds; intended panel activated |
| Retouch | Portrait, Background | PASS | Workspace switched to `retouch`, 4 panels visible, scroll position changed | Control responds |
| Effects | Looks | PASS | Workspace `effects`, scrolled to filter library | Control responds |
| Batch | Batch | PASS | Workspace `assets`, scrolled to batch panel | Control responds |
| Deliver | Export, Gallery | PASS | Workspace `export`, export/gallery panels visible | Control responds |
| MIA | `mia` chip defined in source | NOT TESTABLE | MIA section replaces the shell with MIA Control Center, so the chip is not rendered there; the AI Dock button opens that existing screen instead | Layout/route design, not a defect |

No chip was found that only changed appearance without activating a panel in the sections that could be exercised.

---

## 4. Synthetic media workflows

### 4.1 Photo (React app, 5173)
| Test | Status | Steps | Observed | Outcome class |
|---|---|---|---|---|
| Import PNG | PASS | Uploaded `m2b7b-image.png` to the hidden single-file input | File shown in canvas column, "800 × 600 pixels · original preserved", preview canvas rendered | Workflow works |
| Adjustments | PASS | Focused Brightness slider, pressed ArrowRight ×12 | Preview pixel (400,300) changed `[220,170,90]` → `[234,184,104]` | Workflow works (preview affected) |
| Filters | PASS | Effects → Cinematic → Monochrome | Cinematic changed pixel to `[219,171,95]`; Monochrome to gray `[182,182,182]` | Workflow works |
| Masking | PASS | Selected Brush mask, painted stroke on canvas | Mask counter 0→1; painted pixel `[182,182,182]` → `[222,222,222]` from local exposure | Workflow works |
| Layers | PASS | Clicked "Add text layer" | Layer count 2→3; text layer present in export | Control responds; layer created |
| Crop | PASS | Crop Left slider + "Apply crop" | Status "Crop applied: 45% × 100% of the source"; canvas 800×600 → 360×600 | Workflow works |
| Undo / redo | PASS | Clicked Undo/Redo; then 15 Undos | One Undo changed pixel 234→233; full history undo restored `[220,170,90]`; Redo restored edited value | Workflow works (each keyboard step is a history entry) |
| Export | PASS | Clicked "Export photo"; captured download | `m2b7b-image-edited.jpeg`, 13,504 B; JPEG header `FF D8 FF E0`; dimensions **360×600**, matching the crop | Output generated and validated |

### 4.2 Video (Braincut source mode, 5174)
| Test | Status | Steps | Observed | Outcome class |
|---|---|---|---|---|
| Import video | PASS | Created blank project; dropped generated WebM onto media panel | Media item `m2b7b-video-valid.webm`, "0:02.2 · 640×360 12.658 fps" | Workflow works |
| Add to timeline | PASS | Double-click media → Source tab → Insert | Timeline duration 00:00:00:00 → 00:00:02:05; clip on V1 | Workflow works |
| Seek | PASS | Clicked "Step forward one frame" in Program monitor | Program timecode 00:00:00:00 → 00:00:00:01 | Control responds |
| Playback | PASS | Clicked Program Play, waited 1.2 s, paused | Timecode advanced 00:00:00:01 → 00:00:00:21 | Workflow works |
| Trim / split | PASS | Clicked "Split at playhead" | History gained "split clips"; timeline shows 2 clips | Workflow works |
| Effects / transitions | PARTIALLY VERIFIED | Selected clip in DOM, double-clicked Gaussian Blur in Effects tree | Control responded with honest toast "Select a video clip to apply Gaussian Blur"; automation could not set Svelte's timeline selection, so applying an effect was not verified | Control responds only; **not** a verified workflow |
| Export | PASS | Export dialog → "WebM VP9 + Opus" → Export → captured download | `Sequence 1.webm`, 10,398 B, EBML header `1A 45 DF A3` (valid WebM) | Output generated and validated |

### 4.3 Audio (Braincut source mode, 5174)
| Test | Status | Steps | Observed | Outcome class |
|---|---|---|---|---|
| Import WAV | PASS | Dropped generated `m2b7b-audio.wav` into media panel | Media item "0:04.0 · PCM" | Workflow works |
| Add to timeline | PASS | Double-click → Insert | Audio clip placed on A1; timeline duration grew to 00:00:06:05 | Workflow works |
| Quiet-region detection | PASS | Opened Analysis tab after adding the tone+silence clip | "2 quiet regions", Peak −8.7 dB, RMS −10.0 dB, ranges `00:00:00:00–00:00:00:15` and `00:00:03:15–00:00:04:00`, each 0.50 s at −60.0 dB | Workflow works |
| No-regions distinction | PASS | Added `m2b7b-audio-continuous.wav` (no silence) | Analysis showed "No quiet regions … No runs at or below −60 dB lasting 0.25s or longer" with its own peak/RMS, instead of reporting silence | Workflow works |
| Unavailable distinction | PARTIALLY VERIFIED | Blank project earlier in M2B-7 and this pass | Analysis panel showed "No ready audio clips with local media on this sequence" — distinct from no-regions; decode-failure status not separately triggered | Panel/control responds; one status observed |
| Physical mic/camera | NOT TESTABLE | Deliberately not accessed | No device access attempted, per instructions | Scope restriction |

React `/audio` podcast editor could not be exercised in this pass because the app session expired to sign-in again; this is an auth/session limitation, not a code finding.

---

## 5. Console, network and privacy
- Vendor dev server logged one pre-existing Svelte warning (`MIAChatPanel.svelte:241` unused CSS selector `.signout`); no browser console errors were observed during the successful interaction runs.
- **Network inspection in this pass: BLOCKED** — `browser.network.list` repeatedly failed with `Expected JSON value`. No provider/media upload was knowingly triggered; all interactions were local (`127.0.0.1`/`localhost`) except pre-existing Google Fonts loading observed in M2B-7. Live gate remained `false` at the end.
- No ZDR, consent, grant, budget, routing, retention, environment, database, or production-data settings were changed. No AI dock/provider actions were taken in this pass.

## 6. Screenshots
Earlier in this milestone (M2B-7) screenshots were captured and remain available:
- Braincut tabs / Visual Intelligence: `C:\Users\yayam\AppData\Local\Temp\opencode-browser-C829W7\0\screenshot.png`
- Photo workspace with desktop nav and AI dock: `C:\Users\yayam\AppData\Local\Temp\opencode-browser-vGXwP1\0\screenshot.png`
- MIA Control Center (non-live): `C:\Users\yayam\AppData\Local\Temp\opencode-browser-dgCq3U\0\screenshot.png`

New screenshots in this pass were **BLOCKED** because the review-pane window was resized beyond the visible display and the screenshot tool requires a visible focused window. Exported output files were visually inspected by the tool and validated on disk as described above.

## 7. Remaining blockers / limitations
1. React app session expiry prevented React-side wider-viewport layout check and `/audio` podcast-editor verification.
2. Timeline clip selection for applying an effect could not be driven through automation; effect application remains unVerified (the control's own validation toast was observed).
3. Network log capture failed in this pass; privacy conclusion relies on observed local-only interactions plus the prior pass's network evidence.
4. Real microphone/camera, real GPU decode edge cases and unsupported-codec behavior were not tested (no devices, no external media).
5. Generated bundle remains stale by design; no rebuild was performed.

## 8. Next recommended action
Re-run only the blocked items with a stable authenticated session: wider-viewport React layout, `/audio` multitrack page, and effect/transition application on a selected clip. Seek explicit owner approval before rebuilding `public/video-studio/` or making any source fixes.

---

## 9. Final state
Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92…`, staged 0, modified 24 (`git status`) / 23 (`git diff`), untracked 121 — unchanged from pre-verification. Frozen tag and protected branches unchanged. No source, config, provider, generated bundle, or production data modified. No commits, pushes, resets, cleans, or deployments. The 5174 server I started previously was stopped.

**STOP — awaiting explicit approval before fixes or generated-bundle rebuild.**
