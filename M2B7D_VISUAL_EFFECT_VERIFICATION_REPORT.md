# M2B-7D — Visual Effect and Transition Verification Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Type:** Read-only visual verification of existing local effects using synthetic media. No source changes, no rebuild, no provider requests.

---

## 1. Environment, session and limitations

| Item | Value / result |
|---|---|
| Browser | In-app Chromium (OpenCode browser tools) |
| Viewport | **1000 × 700 CSS px** (`outerWidth=1280`, `outerHeight=752`) on the editor tab; 1762×987 was not available in this session |
| Editor session | The M2B-7C vendor tab (`localhost:5174`) was blank because its dev server is stopped, so it was not reused. The **existing generated editor** at `http://127.0.0.1:5173/video-studio/` was reopened through the already-running 5173 server (no new server, no auth involved) |
| React app | Sign-in screen (session expired); not touched |
| Screenshot tool | `browser.screenshot` repeatedly failed with "needs a visible tab" despite `tabs.focus`. **Workaround used:** read the existing WebGL program canvas with `gl.readPixels`, flip rows into a 2D canvas, and download PNG frame captures via the browser's file mechanism — no source or app change |
| Live gate | `false` at start and end |

---

## 2. Objective results

| Objective | Status | Summary |
|---|---|---|
| Inspect M2B-7C report and screenshot | **PASS** | Report read; screenshot `…\opencode-browser-hLhSZe\0\screenshot.png` inspected — it showed effect/history UI but a black program monitor at the clip end, so it did not prove visual impact |
| Reopen existing editor without auth bypass | **PASS** | Opened the generated editor via the running 5173 server; no credentials, no session manipulation |
| Gaussian Blur visual verification | **PASS** | Pixel-level and image-level proof below |
| Cross Dissolve visual verification | **PASS** | Pixel-level and image-level proof below |
| Capture screenshots / evidence clips | **PASS (frames exported as PNG)** | Six PNG frame captures saved to temp paths (listed in §4). Full-window screenshots remain **BLOCKED** |
| Record browser/viewport/screenshot limitations | **PASS** | Documented in §1 |
| Confirm no external provider requests/uploads | **PASS** | Network evidence in §5 |

---

## 3. Exact reproduction steps and evidence

### 3.1 Synthetic setup (same approach as M2B-7B, no personal media)
1. In `http://127.0.0.1:5173/video-studio/`, clicked **Create blank project → Create**.
2. Generated a 2.1 s 640×360 WebM locally with `canvas.captureStream` + `MediaRecorder` (moving gold rectangle and green bar on dark background), named `m2b7d-video.webm`, and dropped it on the media panel. Imported metadata: `0:02.1 · 640×360 12.821 fps`.
3. Double-clicked the media item → **Insert** to place it on V1 (sequence duration `00:00:02:02`).
4. Stepped the playhead 30 frames to `00:00:01:00` and clicked **Split**, producing two video clips (`2 clips`).
5. Focused the Timeline and pressed **Ctrl+A** → 2 clips selected.
6. Effects tab → **Blur & Sharpen → Gaussian Blur** (double-click) applied the effect.
7. Effects tab → **Video Transitions → Dissolve → Cross Dissolve *** (double-click) applied the transition. Timeline V1 shows a `Cross Dissolve` marker between the two clips.

### 3.2 Gaussian Blur — visual proof
- Seeked to `00:00:00:15` (inside the first clip), switched to **Adjust** (EffectControls).
- Focused the **Blurriness** slider and captured WebGL frames at `0px` and `200px`, forcing a redraw with one step forward/back before each capture.
- **Pixel metric:** comparing the two full 480×270 RGBA framebuffers: **73.3% of pixels changed**, mean absolute RGB difference **13.83** (sum over channels; ≈4.6 per channel). Frame checksums differed (353874 vs 353866).
- **Visual inspection of exported PNGs:**
  - `m2b7d-blur0.png` — sharp gold rectangle and green bar with crisp edges.
  - `m2b7d-blur200.png` — the same shapes visibly diffused/smoothed, edges blurred into the dark background.
- This is a genuine rendered-image change, not merely a control value or history entry.

### 3.3 Cross Dissolve — visual proof
- With Blurriness reset to `0px` (so the transition is unobscured), stepped across the transition and captured frames:
  | Timecode | Gold pixels | Green pixels | Lit pixels | Observation |
  |---|---|---|---|---|
  | `00:00:00:25` (before) | 594 | 73 | 2765 | first clip: gold left, green right |
  | `00:00:01:00` (start) | 594 | 73 | 2765 | transition start, first clip still dominant |
  | `00:00:01:15` (mid) | 594 | 240 | 2802 | green contribution grows, gold dims — blended intermediate state |
  | `00:00:02:00` (after) | 605 | 469 | 2686 | second clip dominant, shapes repositioned |
- **Visual inspection of exported PNGs:** `m2b7d-xd-before.png` and `m2b7d-xd-start.png` are identical first-clip frames; `m2b7d-xd-mid.png` shows a visibly blended intermediate frame (green stronger, gold softer); `m2b7d-xd-after.png` shows the second clip's frame. This progression, together with the timeline `Cross Dissolve` marker and history entry, verifies the transition's rendered effect.
- Caveat: the synthetic source is intentionally simple (two moving rectangles), so the blend is subtle; the metric and side-by-side frames are the evidence, not a cinematic-looking clip.

### 3.4 Status separation
- **Panel mounted / control responds:** Gaussian Blur and Cross Dissolve controls responded earlier (M2B-7C history entries), but that alone was not treated as success.
- **Workflow actually works:** confirmed here by framebuffer comparison and exported frame images.
- **Output generated and validated:** PNG evidence files are valid images (read back and visually inspected); no video export was re-run in this pass.

---

## 4. Evidence file paths (all outside the repository, in temp)

Gaussian Blur comparison:
- `C:\Users\yayam\AppData\Local\Temp\opencode-browser-ZgoAWl\0\m2b7d-blur0.png` (5,108 B) — sharp
- `C:\Users\yayam\AppData\Local\Temp\opencode-browser-OeZyGi\0\m2b7d-blur200.png` (32,414 B) — blurred

Cross Dissolve progression:
- `C:\Users\yayam\AppData\Local\Temp\opencode-browser-W8CIje\0\m2b7d-xd-before.png` (8,217 B)
- `C:\Users\yayam\AppData\Local\Temp\opencode-browser-GstCiD\0\m2b7d-xd-start.png` (8,217 B)
- `C:\Users\yayam\AppData\Local\Temp\opencode-browser-NO07XX\0\m2b7d-xd-mid.png` (8,360 B)
- `C:\Users\yayam\AppData\Local\Temp\opencode-browser-r5nl5r\0\m2b7d-xd-after.png` (8,591 B)

Prior M2B-7C screenshot (reviewed, insufficient for visual proof): `C:\Users\yayam\AppData\Local\Temp\opencode-browser-hLhSZe\0\screenshot.png`.

---

## 5. Network and provider observations

Filtered network inspection on the editor tab:
- `openrouter` → 0 requests; `onrender` → 0; `/api/` → 0; `mia` → 0; XHR → 0.
- `fetch` → 6 requests, all `GET http://127.0.0.1:5173/video-studio/_app/version.json` (local SvelteKit version polling, status 200).
- `https://` → 4 requests: `fonts.googleapis.com` stylesheet (status 200) and three `fonts.gstatic.com` `.woff2` fonts (status 200), timestamps ≈1795217445–1795217446. Pre-existing font loading only.
- No POST uploads, no media or prompt transmission, no OpenRouter/MIA/cloud-AI calls. Live gate remained `false`.
- No headers, cookies, tokens or authorization values were read or reported.

---

## 6. Browser, viewport and screenshot limitations
- Viewport was 1000×700 CSS px; 1762×987 not available in this session (environment limitation, not app defect).
- `browser.screenshot` failed with "needs a visible tab"; evidence was captured instead via WebGL `readPixels` frame exports (read-only).
- The M2B-7C source-mode session was unavailable (dev server stopped); the generated editor served by 5173 was used instead. Generated bundle is stale relative to source, so these results describe the built editor, not unbuilt source changes.
- WebGL `readPixels` required a forced redraw (one step forward/back) after slider changes; otherwise stale frames were returned.

---

## 7. Git preservation check (before → after)

| Item | Before | After |
|---|---|---|
| Branch | `feature/pro-editor-professional-suite` | unchanged |
| HEAD | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | unchanged |
| Staged | 0 | 0 |
| Modified (git status) | 24 | 24 |
| Untracked | 123 | 124 (this report added) |
| Frozen tag | `cdb1238e…` | unchanged |
| Original / main | `cdb1238e…` / `2c451768…` | unchanged |
| Live gate | `false` | `false` |

No application source, configuration, environment, dependency, database, provider setting, generated bundle or production data was changed. No server was started, no build/rebuild, deploy, commit, push, reset or branch/tag change occurred. Existing user work was preserved exactly.

---

## 8. Remaining unresolved items
- Full-window screenshots at 1762×987 remain unavailable due to browser viewport/visibility constraints; WebGL frame captures are the substitute evidence.
- The unbuilt source-mode editor (Record/Capture/Production/Analysis/Scopes tabs) was not used in this pass because its dev server is stopped and starting one was not approved.
- React `/audio` and wider React layout remain blocked by the expired authenticated session (unchanged from M2B-7C).

**Final classification:** Gaussian Blur visual impact — **PASS**; Cross Dissolve visual impact — **PASS**; evidence capture via exported frames — **PASS**; full-window screenshots — **BLOCKED**; network/provider — **PASS (no provider requests or uploads)**.

**STOP — no fixes, rebuilds or next phase. Await owner review and explicit approval.**
