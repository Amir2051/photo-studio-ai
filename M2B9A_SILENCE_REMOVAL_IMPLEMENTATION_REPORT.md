# M2B-9A — Silence Removal End-to-End Implementation Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`
**Final status:** `M2B9A_COMPLETE`

---

## 1. Implementation summary

Delivered the first video-first workflow: **local, non-destructive quiet-region removal**, fully wired through the real video editor UI, timeline, undo/redo, and export. No new provider, model, credential, dependency, or grant was added or used.

- Existing `detectQuietRegions()` detector reused as-is (`vendor/braincut/src/lib/media/audio-analysis.ts`).
- New pure mapper converts source-time quiet regions into frame-snapped **sequence-time** edit ranges, with padding, clamping, merging, and fail-closed validation.
- New store drives selectable region markers and a non-interactive timeline ruler overlay.
- `LocalAudioAnalysis.svelte` became the complete workflow panel (Analyze → configure → select → Preview → Apply/Cancel → Undo/Redo → Export).
- Applied edits are real project timeline edits via `preview()`/`commitPreview()` and `ops.extractRange`, producing exactly **one** History step. Source media is never modified.
- Export was executed and the output file validated.

---

## 2. Files changed

### New files
| File | Purpose |
|---|---|
| `vendor/braincut/src/lib/media/silence-edit.ts` | Pure `regionToMarker`, `buildSilenceEditPlan`, `estimateRemoved` with source→sequence mapping, padding, frame snapping, overlapping/adjacent merging, fail-closed validation |
| `vendor/braincut/src/lib/media/silence-edit.test.ts` | 47 deterministic tests for all mapping/plan edge cases |
| `vendor/braincut/src/lib/stores/silence.ts` | `quietRegionMarkers`, `quietRegionPreviewing` stores and pure update helpers |
| `vendor/braincut/src/lib/ui/timeline/QuietRegionOverlay.svelte` | Non-interactive amber ruler overlay showing detected quiet regions |

### Modified files
| File | Change |
|---|---|
| `vendor/braincut/src/lib/ui/LocalAudioAnalysis.svelte` | Full workflow UI: Analyze button, threshold/min-duration/padding controls, progress/errors, region checkboxes, Select all/Clear, estimated removal, Preview/Apply/Cancel, Undo/Redo, Export video, stale-result clearing; fixed audio-clip filter for video media with audio tracks |
| `vendor/braincut/src/lib/ui/timeline/Ruler.svelte` | +2 additive lines: import and mount `QuietRegionOverlay` after the canvas; no other logic changed |

`public/video-studio/` was **not** rebuilt or modified; the running generated bundle is stale relative to source, as before.

---

## 3. UI changes

Implemented inside the existing **Analysis** tab panel (also embedded in AudioMixer), preserving the dark theme and existing stats/status display:
1. **Analyze / Analyzing…** button (explicit; initial analysis on mount only, no auto re-run after edits).
2. **Threshold dB** (default −60, range −100..0), **Min quiet s** (default 0.25), **Padding s** (default 0) inputs.
3. Progress text, per-item honest statuses (`ok`, `no-regions`, `unavailable`, `invalid`, `empty`, `cancelled`), and error messages.
4. Timestamped region rows with **checkboxes**, **Select all / Clear**, and click-to-seek preserved.
5. **Estimated removal** readout from the merged plan.
6. **Preview removal** → "Previewing — Apply or Cancel" → **Apply / Cancel**.
7. **Undo / Redo** buttons in the panel (existing top-bar undo/redo remain).
8. **Export video** button invoking the same export command action as the top bar; shows render status and does not fake progress.
9. Timeline ruler shows amber **quiet region** bars with a visible count (e.g. "2 quiet"), without intercepting scrubbing.

Screenshots were not successfully captured: the in-app screenshot tool repeatedly reported "needs a visible tab" during this session. Evidence below is from DOM state, console/network inspection, and exported file validation.

---

## 4. Backend and timeline changes

- `regionToMarker`: maps source time → sequence time via existing `sequenceTimeOfSource`/`clipSourceRange`, handles reverse clips and speed ≠ 1, applies padding in source seconds, clamps to clip/media bounds, frame-snaps, rejects invalid/zero-length regions, stable IDs `clipId:startBucket:endBucket`.
- `buildSilenceEditPlan`: selects checked regions, sorts, merges overlapping/adjacent ranges (≤1 frame apart), drops sub-frame ranges with warnings, clamps start ≥ 0, computes `totalRemoved`, `valid` is fail-closed on warnings.
- UI applies plan rightmost-first with `ops.extractRange(seq, start, end)` across all unlocked tracks, so linked A/V stays synchronized and gaps close.
- `preview()` → `commitPreview('Remove quiet regions')` yields one undoable patch; `cancelPreview()` restores exactly.
- After Apply, markers **and** stale results are cleared, preventing repeated accidental application of the same regions.

---

## 5. Tests executed and results

| Gate | Command | Result |
|---|---|---|
| New mapper tests | `npx vitest run src/lib/media/silence-edit.test.ts` | **47 passed** |
| Vendor suite | `npx vitest run` (vendor) | **41 files passed + 1 skipped / 487 passed + 1 skipped** |
| App suite | `npx vitest run tests` | **27 files / 204 passed** |
| Svelte type check | `npm run check` (vendor) | **0 errors**, 1 pre-existing unused-CSS warning |
| Root typecheck | `npm run typecheck` | exit 0 |
| TS project build | `npx tsc -b` | exit 0 |

---

## 6. End-to-end workflow evidence (synthetic media)

**Fixture:** generated locally in-browser via `canvas.captureStream` + `MediaRecorder` with an AudioContext oscillator (440 Hz, 0.3 amplitude) gated silent at the start and end and with smooth ramps. Imported as `m2b9a-silence.webm` (≈70 KB, 640×360, VP8 + Opus, 2 ch, 48 kHz, ~3.9 s). No real or client media used.

Observed via the real UI in source-mode Chromium:
- Analysis with threshold −30 dB / min duration 0.05 s found **2 quiet regions**: `00:00:00:00–00:00:00:02` (0.07 s, −30.0 dB) and `00:00:03:23–00:00:03:27` (0.13 s, −31.2 dB).
- Panel showed "Estimated removal: 00:00:00:06 (0.20s)" and timeline ruler showed "2 quiet".
- **Preview**: sequence duration changed from `00:00:03:27` to `00:00:03:21`; panel showed "Previewing — Apply or Cancel".
- **Cancel**: restored duration to `00:00:03:27` exactly.
- **Apply**: committed duration `00:00:03:21`; History showed a single new step `Remove quiet regions` (history: `0 Open project | 1 import media | 2 insert clip | 3 Remove quiet regions`).
- **Undo**: returned to `00:00:03:27`; **Redo**: returned to `00:00:03:21` — undo/redo correctness verified.
- After Apply, stale region summary was cleared and the panel returned to "Press Analyze to scan…"; repeated application of the same regions is prevented.
- No console errors were observed; all analysis was local (no provider requests).

**Integration bug found and fixed during verification:** the original analysis filter accepted only `item.kind === 'audio'`, which excluded WebM files whose linked audio clip points at a video media item. The filter now accepts any ready media with `hasAudio`. Without this fix the workflow would appear empty for typical camera footage.

---

## 7. Export verification

- Exported the edited sequence to WebM VP9 + Opus through the real Export dialog / `Export video` button.
- Downloaded output: `Sequence 1.webm`, **72,842 bytes**, saved to `C:\Users\yayam\AppData\Local\Temp\opencode-browser-LvJyTm\0\Sequence_1.webm`.
- Validated with `mediabunny` (Node): EBML header `1A 45 DF A3`; metadata duration **3.72 s**, computed duration **3.713 s**; **1 audio track and 1 video track** present. Original imported duration was ~3.9 s; the ~0.2 s reduction matches the estimated removal.

---

## 8. Time-saving measurements

Measured in the automated browser run (same fixture, cached peaks):
- Analysis computation: **59 ms** (first measured run: 64 ms).
- Preview computation: **46 ms**.
- UI-observed full Analyze→Preview→Apply cycle: **~3.3 s**, dominated by the automation's DOM polling wait for the success state, not by computation.
- Editing actions required in the automated workflow: **3** (Analyze, Preview removal, Apply).
- Result: 2 detected regions, 0.20 s removed, timeline 3.9 s → 3.7 s, export passed on first attempt.

**Manual baseline: NOT MEASURED.** A human operator baseline (scrub to each pause, split, ripple-delete, verify A/V sync) cannot be measured by browser automation and no operator timing was performed. No percentage savings are claimed. Measurement protocol for a later human run: fixed clip set; record wall-clock seconds per minute of source, number of input actions, History steps, corrections/undos, and first-attempt export pass rate for both manual and automated workflows; compare medians for the same target cut.

---

## 9. Remaining gaps

- Generated `public/video-studio/` bundle is stale; new UI appears only in source/dev mode until a separately approved rebuild.
- Only one synthetic fixture pattern (start/end silence) was exercised in the browser; unit tests cover middle/consecutive/overlap/padding/reverse/speed cases, but no additional E2E fixtures were run.
- Mute mode was not added (not required; removal is timeline-based, not muting).
- "Analyze on import" and audio normalization remain future workflows.
- Screenshot evidence unavailable due to the browser screenshot tool's visibility requirement.

---

## 10. Preservation and Git verification

| Item | Before | After |
|---|---|---|
| Branch | `feature/pro-editor-professional-suite` | unchanged |
| HEAD | `1ecce92a04683b3dc6785b37eb36b1aeae022ede` | unchanged |
| Staged | 0 | 0 |
| Modified (git status) | 24 | 25 (baseline + `Ruler.svelte`) |
| Untracked | 128 | 133 (4 new implementation files + this report) |
| Frozen tag | `cdb1238e…` | unchanged |
| Original / main | `cdb1238e…` / `2c451768…` | unchanged |
| Live gate | `false` | `false` |

The local source-mode Vite dev server started on port 5174 for verification was **stopped** (PID 17760). No generated bundle rebuild, dependency install, credential/provider change, grant, media upload, deployment, commit, push, reset, or branch/tag change occurred. OpenRouter, RZ Agent, and M2B-3 authorization protections were untouched. All pre-existing modified and untracked files remain intact.

**STOP — this implementation slice is complete. Await owner review before the next feature.**
