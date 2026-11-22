# Video Studio / Pro Editor — Trial Readiness Report

**Date:** 2026-11-19 · **Mission:** demonstration-ready trial build (M2.1 → trial)

## Repository

- **Root:** `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`
- **Branch:** `feature/pro-editor-rebuild`
- **Baseline HEAD:** `a79d0357218533d205d52b1b2da9a6fa6f697599` (`feat(video-studio): finalize M2.0 export workflow`) — present and verified before any change
- **Final HEAD:** `a79d0357218533d205d52b1b2da9a6fa6f697599` — **no commit was made**
- **Initial working tree:** 48 paths — M2.1 uncommitted implementation (bounded `PeaksCache`, `performance.ts`, tests, M2.1 reports, README) + 39 intentionally retained stale bundle chunks + build residue
- **Final working tree:** 57 paths — all of the above preserved, plus:
  - modified `vendor/braincut/src/lib/editor/project-actions.ts` (this milestone's fix)
  - rebuilt `public/video-studio/` bundle (version `1795127675617`) and `dist/` (git-ignored)
  - new `TRIAL_DEMO_GUIDE.md`, `VIDEO_STUDIO_TRIAL_READINESS_REPORT.md`, `trial-evidence/` screenshots

## Implementation

### Files changed by this milestone
- `vendor/braincut/src/lib/editor/project-actions.ts` — fixed project reopen fallback (see below).
- `public/video-studio/**` — rebuilt bundle to include the fix; no stale chunks deleted.
- New docs/screenshots as listed above.

### Bugs fixed
- **Project reopen blocked when the File System Access API is unavailable/unusable.** `openProjectFile()` checked `'showOpenFilePicker' in window` (presence, not callability) and had no fallback when the picker threw. Added a `typeof === 'function'` `openPicker()` helper (mirroring the existing `savePicker()`) and a fallback to the existing hidden `<input type="file" accept=".braincut">` on non-AbortError. AbortError still cancels silently. Verified in-browser: with the picker disabled, **Open project file** produced the input fallback and successfully reopened the saved project ("Opened Untitled project", 2 clips restored).

### Features completed
- Full import → edit → preview → save → reopen → export → playback demonstration path, verified in a real browser (details below).
- Trial startup path documented and verified on a clean port (`npm run preview -- --port 4176 --strictPort`).

### Features left unchanged
- M2.1 bounded `PeaksCache` (64 entries / 64 MB), `performance.ts` profiling module, timeline virtualization, export workflow, proxy defaults, project format, Save/Export behavior — all preserved as-is.
- No commit, push, merge, deploy, environment/database change, or dependency added.

### Existing M2.1 work preserved
All pre-existing uncommitted M2.1 files and the 39 stale bundle chunks remain in the working tree, unmodified by this milestone (except the intentional rebuild/sync of the published bundle).

## Verification

### Test commands and results (re-run against current code)
| Command (cwd) | Result |
|---|---|
| `npx vitest run` (`vendor/braincut`) | **31 files / 323 tests passed** |
| `npx vitest run tests` (repo root) | **19 files / 99 tests passed** |
| `npm run check` (`vendor/braincut`) | **0 errors, 1 pre-existing warning** (`MIAChatPanel.svelte` `.signout`) |
| `npm run build` (repo root) | **passed** (only a chunk-size advisory) |
| `npm run preview -- --port 4176 --strictPort` | HTTP 200 at `/video-studio/`, version `1795127675617`, editor loads with no console errors |

The 5 historical root-aggregate `$app/env` alias-import failures remain a known harness artifact (agent×3, editor timeline-interactions, stores preferences); they do not affect the vendor suite, the app suite, or the trial build. They were not suppressed.

### Browser test result (in-app Chromium 152)
- Startup / editor screen: PASS — no console errors; all captured requests 200.
- Media import: PASS via `<input type="file">` fallback — `m14-clip.mp4` appeared in the Media panel (0:08.0, 352×640, 30 fps).
- Add to timeline: PASS via real drag handlers with `application/x-braincut` DataTransfer — 2 clips (V1 video + A1 audio), sequence 8.09 s.
- Preview playback: PASS — playhead advanced 00:00:00:00 → 00:00:01:06; program monitor displayed the actual source frame (confirmed non-black source pixels 27–255).
- Waveforms: partial — 4 canvases present including waveform canvases; bounded `PeaksCache` verified by 9 unit tests; visual waveform quality not inspected at high zoom.
- Save: PASS — `.braincut` download (12,981 B), toast "Saved Untitled project"; JSON v1, 1 media, 1 video + 1 audio clip.
- Reload: PASS — saved file reopened via the patched fallback; "Opened Untitled project", 2 clips and media reference restored.
- Export: PASS — dialog defaults H.264 MP4 / 1920×1080 / 30 fps / AAC 192 kbps; status "Rendering"; toast "Exported Sequence 1.mp4 (1.5 MB)".
- Exported file playback: PASS — Chrome `<video>` decoded 1920×1080, 8.32 s, readyState 4, non-black frame pixels; in-app media preview opened the file.

### Export result
- Path: `C:\Users\yayam\AppData\Local\Temp\opencode-browser-P5DbB8\0\Sequence_1.mp4`
- 1,533,559 bytes, `ftyp` magic, tracks `vide` + `soun`, duration 8.320 s @57600 timescale
- SHA-256 `AA848446DD11F6F6870026FE3DCE988268C8848269CBCBCC0EF529157C132782`
- Save picker was deliberately unavailable in automation → download fallback engaged and produced the valid file.

### Long-form measurements
- **NOT VERIFIED.** No 10-minute/30-minute/multi-hour media exists locally; only an 8-second MP4 fixture was available. The M2.1 protocol is documented in `M2.1_LONG_FORM_TEST_PROTOCOL.md`.
- Small-fixture spot check only: 40 synthetic seeks on the 8 s project, compressed JS heap 3,776,613 B → 3,842,285 B (+1.7%); largest deltas were JIT/bytecode warm-up and 2 ArrayBuffer objects. This is **not** a long-form measurement and proves no leak only at this scale.

### Screenshots (exact paths)
- `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai\trial-evidence\editor-with-media.jpg`
- `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai\trial-evidence\active-preview.jpg`
- `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai\trial-evidence\timeline-clips.jpg`

## Trial readiness matrix

| Capability | Status |
|---|---|
| Application starts (preview server, expected URL) | PASS |
| Editor opens / welcome + recents | PASS |
| Media import (video; input fallback path) | PASS |
| Media import via native picker / drag of real files | MANUAL VERIFICATION REQUIRED |
| Library display with metadata | PASS |
| Preview load / play / seek | PASS |
| Timeline add via drag / select / zoom / playhead | PASS |
| Timeline move / trim / split / delete (browser) | NOT VERIFIED (code audited) |
| Waveform generation & bounded cache (unit) | PASS |
| Waveform visual quality at high zoom / long files | NOT VERIFIED |
| Save (.braincut download fallback) | PASS |
| Project reopen (fallback path, patched) | PASS |
| Autosave / recent project restore | PASS |
| Export configuration & progress | PASS |
| Export output file valid (MP4, video + audio) | PASS |
| Exported playback in Chrome / in-app player | PASS |
| Direct-write save-picker path | MANUAL VERIFICATION REQUIRED |
| VLC playback | MANUAL VERIFICATION REQUIRED (VLC not installed) |
| Export cancellation | NOT VERIFIED |
| Large-file import / audio-only / image import | NOT VERIFIED |
| Multi-hour / 4K long-form responsiveness | NOT VERIFIED |
| Bounded caches / memory cleanup at long-form scale | NOT VERIFIED |
| Desktop presentation (1280×800; Media dock covers lower lanes) | PASS with workaround |
| Console errors during demo path | PASS (none observed) |

## Known limitations
- The trial covers a short 8-second 1080p source; long-form performance claims remain unproven.
- Native picker paths and cancellation require a real user gesture and were not automatable here; the download fallbacks were verified instead.
- VLC is unavailable; Chrome and the in-app player verified playback.
- The export size estimate is heuristic and can be ~5× above actual output.
- The bottom Media dock can obscure lower audio lanes at 1280×800; resize/hide it to show A1–A3.
- Only the video+import fallback path was exercised; unsupported-format and large-file error states were code-audited, not browser-tested.

## Final verdict

**`TRIAL READY — CORE EDITOR, SAVE, EXPORT AND PLAYBACK VERIFIED`**

The complete demonstration path — open app → import media → add to timeline → preview playback → save → reopen → export → play the exported MP4 — was executed in a real browser with no critical runtime errors, and the exported file was validated independently. All automated gates pass. Remaining items are explicitly documented as MANUAL VERIFICATION REQUIRED or NOT VERIFIED and do not block the core demonstration.

*No deployment, publishing, commit, push, merge, or production change was performed.*
