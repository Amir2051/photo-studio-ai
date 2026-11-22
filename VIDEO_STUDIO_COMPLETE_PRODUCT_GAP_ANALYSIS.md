# Video Studio — Complete Product Gap Analysis (Phase 0)

**Date:** 2026-11-19 · **Companion:** `VIDEO_STUDIO_COMPLETE_ARCHITECTURE_AUDIT.md`

## Baseline
Branch `feature/pro-editor-rebuild`, HEAD `a79d035…`. Freeze tag missing locally/remotely (blocker). All findings below are from read-only inspection plus the previously verified trial report.

## Gap summary by product area

| Area | Current state | Target | Gap class |
|---|---|---|---|
| Video timeline | 6 tracks, trim/split/ripple/delete, snapping, keyframes, markers, undo | Slip/slide/roll, track groups, nested sequences, configurable shortcuts, workspaces | Partial |
| Editing tools | Select/Razor/Hand/Text + split/ripple/marker | Configurable shortcuts, custom layouts, beginner/pro modes, dock resizing | Partial |
| Media library | Flat Media panel, bins, relink, metadata, proxies, bounded caches | Search/tags/favorites, duplicate detection, background generation, portable archives | Partial |
| Performance | Bounded caches, virtualization, unit tests; 8 s fixture only | 10 min/30 min/multi-hour, 1080p/4K measured | Unverified |
| Color | Basic color/adjustment panels and PixiJS filters | Exposure→wheels/curves/HSL/LUTs + scopes affecting export | Missing |
| Audio/Podcast | Web Audio multitrack, waveform, mic recording, WAV export | EQ/comp/limiter/denoise/ducking/loudness/transcription | Missing |
| Motion/VFX | 67 effects, 7 transitions, titles, masks via filters | Animated titles, keyframe control, chroma key, tracking, stabilization | Partial |
| Photo Studio | Layers, masks, retouch, adjustments, MediaPipe background, batch | RAW verification, brush/healing, lens corrections, batch presets | Partial |
| AI | Proposal engine + loopback MCP bridge; cloud gateway fail-closed | Local ONNX/MediaPipe, transcription, smart captions, scene/highlight analysis | Missing/partial |
| Social | Export presets (16:9, vertical, WebM, GIF…) | Subject-aware reframing, multi-version export queue, templates | Missing |
| PWA | Manifest + two service workers, installable shell | Touch timeline, gesture navigation, quota UI, offline recovery, update flow | Partial |
| Project system | `.braincut` v1, autosave/recents, relink | Shared cross-studio projects, migration tests, backup/recovery, archive packages | Missing |
| Cloud/collab | Optional Supabase auth/gallery, fail-closed AI gateway | Accounts/backup/sync/comments — explicitly future, optional | Future |

## Functional status register (initial)

- **Implemented and verified:** import (input fallback), preview playback, timeline add/select/zoom, waveform generation + bounded cache (unit), save (download), reopen (patched fallback), H.264 MP4 export + playback, browser startup.
- **Implemented but not fully verified:** native picker direct-write, export cancellation, large-file import, audio-only/image import, trim/split/delete in browser, proxy switching.
- **Partially implemented:** ffmpeg conversion (mirror + 2 GB cap), cloud AI gateway (no editor connection), PWA touch support, project portability, media management.
- **Planned:** M1–M10 roadmap items.
- **Blocked:** all implementation work until the freeze decision is made (section 2 stop condition).

## Critical gaps for the stated product ambition

1. **No shared project layer** — a "suite" cannot exist while photo, video, and audio persist separately. This is the highest-value architectural gap and should precede feature work.
2. **No verified long-form performance** — the product's core promise (multi-hour 4K) is unproven; feature work built on it risks false confidence.
3. **Color/audio/AI are mostly absent in the video studio** — these are the largest visible capability gaps versus the named competitors.
4. **Mobile is presentation-only today** — no touch-first editing model; must be scoped honestly.
5. **Release protection is unresolved** — no frozen commit/tag means there is no safe rollback point for a large program.

## Non-goals for early milestones (protect the trial)
No changes to `.braincut` v1 format, no forced backend, no paid API calls, no FFmpeg bundling change, no rewrite of the working editor, no mobile feature claims without device testing.

## Recommended sequencing driver
Resolve freeze → establish suite contracts (project/media/undo/services) → M1 editing depth → M2 media/performance → then user-visible creative features. Detailed sequencing and acceptance tests are in `VIDEO_STUDIO_COMPLETE_IMPLEMENTATION_ROADMAP.md`.
