# Milestone 1 — Generated File Classification

**Date:** 2026-11-19 · **Build version produced during validation:** `1795132803283` (previous churn: `1795131435182`, `1795130290524`)

## Repository convention
`scripts/build-video-studio.mjs` runs the vendor SvelteKit build and uses `cpSync(vendor/braincut/build → public/video-studio)` **without pruning**. Therefore `public/video-studio/` accumulates hashed chunks from earlier builds; only files present in a fresh `vendor/braincut/build/` are required by the current release. `dist/` is git-ignored.

## Classification method
Each path in `git status --short -uall` under `public/video-studio/` was compared with the file list of the fresh `vendor/braincut/build/` output (62 files). Additionally, all 15 assets referenced by the current `public/video-studio/index.html` were checked: 0 missing on disk, 0 untracked — all are already committed at HEAD.

## Category A — current build artifacts (generated churn) — EXCLUDED
| Path | State | Reason |
|---|---|---|
| `public/video-studio/_app/version.json` | modified | Timestamp-only version bump from verification builds |
| `public/video-studio/index.html` | modified | Rewritten hashed references / version query for the same runtime code |
| `public/video-studio/service-worker.js` | modified | Regenerated precache manifest for the same runtime code |

No Milestone 1 source is imported by the running editor (new `lib/suite/*` code is test/library-only), so this churn carries no functional change. Committing it would obscure the milestone diff. All 15 referenced assets exist and are tracked at HEAD, so leaving these files as-is cannot break the working tree.

## Category B — pre-existing stale artifacts — EXCLUDED, PRESERVED
39 paths were classified as stale (absent from the fresh build output). None were deleted, moved, or modified by this closeout:
- tracked-modified: `public/video-studio/_app/immutable/chunks/BnW3rN9M.js`
- untracked: `public/video-studio/_app/immutable/assets/EditorPage.Dz4jAhiS.css`; chunks `3UTVDDGD`, `BKIHyU1m`, `BlAF7SYy`, `BnoS4XmZ`, `CBqC7ssR`, `D0j5Hyoz`, `DPgbLOx4`, `DZIQwE_f`, `Driikq9K`; entry files `app.05GIQuTP`, `app.2NHFfRU2`, `app.BNSNN1Rw`, `app.CbSZcrQM`, `app.DDMpQs_p`, `app.DbeO1UkC`, `app.DdvKz5Xr`, `app.HxxYYamk`, `app.u3QZtMIO`; node files `0.CqZQvpFB`, `2.{8LRA74zS,B2zYtdmA,CxtS5yvR,CznSK0A5,DjiR9R32,DttZ6odM,Du10eDWc,iB46DfAY,mAk7Brr_}`, `3.{8LRA74zS,B2zYtdmA,CxtS5yvR,CznSK0A5,DjiR9R32,DttZ6odM,Du10eDWc,iB46DfAY,mAk7Brr_}`.
Reason: unreferenced hashed output from prior builds; prior operator rules explicitly require retaining them, and no cleanup was authorized.

## Category C — unrelated existing work — EXCLUDED, PRESERVED
`VIDEO_STUDIO_TRIAL_FREEZE_COMPLETION_REPORT.md` (untracked since the freeze) and the three closeout reports created for this review (`VIDEO_STUDIO_MILESTONE_1_CLOSEOUT_AUDIT.md`, `VIDEO_STUDIO_MILESTONE_1_GENERATED_FILE_CLASSIFICATION.md`, `VIDEO_STUDIO_MILESTONE_2_READINESS_RECOMMENDATION.md`). They are review artifacts, intentionally left uncommitted like the freeze report.

## Category D — committed in `1ecce92…`
10 new `vendor/braincut/src/lib/suite/` source/test files, 3 M1 reports, and the updated implementation roadmap. **No generated bundle file was committed.**

## Safety notes
- No stale file or generated artifact was deleted, pruned, or overwritten by this closeout.
- The working tree still carries 39 stale paths + 3 current generated bundle modifications; this is expected and documented, not a regression.
- A future release cleanup requires explicit operator approval; naive pruning of hashed chunks is unsafe because dynamic imports are referenced from node bundles.
