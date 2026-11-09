# Every Frame First — Video Studio QA Report

**Date:** 2026-11-08  
**Scope:** Local development and Base44 static build only. No production deployment was performed.

## Verified

- Development route `http://127.0.0.1:5173/video-studio/` returns HTTP 200.
- Production preview route `http://127.0.0.1:4173/video-studio/` returns HTTP 200.
- The editor creates a project and imports local video media.
- A synthetic 6-second H.264/AAC MP4 was recognized as 1280×720, 30 fps, 6 seconds.
- A synthetic 2-second H.264/AAC MP4 was placed on the timeline as linked video and audio clips.
- A WebM VP9 + Opus export completed. `ffprobe` confirmed 640×360, 24 fps VP9 video, 48 kHz Opus audio, and a 2.02-second duration for the 2-second source when placed at timeline zero.
- The export dialog shows the AAC compatibility warning and the WebM VP9 + Opus preset. Selecting that preset sets WebM, VP9, and Opus correctly.
- The outdated statement that Chrome/Edge can encode AAC without regard to operating system has been removed. Guidance now reflects Firefox and desktop Linux AAC-encoding limitations.
- Base44 CLI build completed successfully.
- The generated distribution contains zero `ffmpeg-core` files; the legacy GPL FFmpeg core is not shipped.

## Automated checks

- brainCUT Svelte check: 0 errors, 0 warnings.
- brainCUT tests: 244 passed across 21 files.
- Main app typecheck: passed.
- Main app tests: 110 passed across 19 files.
- Main app production build: passed.
- Base44 CLI build: passed.

## Known limitations / follow-up

- End-to-end import/edit/export was exercised in Chromium headless. A full interactive Firefox desktop smoke test remains outstanding. The upstream editor documents Firefox/Safari as supported with a reduced codec set and download-based export rather than direct-to-disk saving.
- AAC encoding is not available through WebCodecs in Firefox or desktop Linux browsers. For this environment, use WebM + VP9 + Opus when an audio-bearing export is needed. See MDN's [codec selection guide](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection).
- A 1080p software-rendered headless export did not complete in the automated run; the lower-resolution 640×360 export succeeded. Hardware-accelerated desktop testing is still needed before claiming 1080p/4K export performance.
- The vendor build reports existing dynamic-import/chunk-size warnings. They did not prevent a successful build.
- `npm ci` reported six low-severity dependency advisories in the vendored editor tree. No automatic dependency upgrades were applied; review separately before public release.
- HEVC/ProRes conversion remains disabled until a compatible, properly licensed converter is selected.

## Test artifacts

Synthetic QA media and export files were kept outside the repository under `/tmp/every-frame-first-qa/`; they are not part of the app distribution.

## Dependency audit

- Main application dependency audit: 0 reported vulnerabilities.
- Vendored brainCUT dependency audit: 6 low-severity advisories, 0 moderate/high/critical. The affected tree includes SvelteKit 2.x, `cookie`, and `deepmerge`; npm's suggested remediation is a major SvelteKit 3.x upgrade. No automatic upgrade was applied because it could change framework behavior and needs a separate compatibility/test pass. Relevant advisories: [GHSA-pfhg-q3qv-9q6r](https://github.com/advisories/GHSA-pfhg-q3qv-9q6r), [GHSA-27mw-82g8-phjj](https://github.com/advisories/GHSA-27mw-82g8-phjj), [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x), [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

## Project persistence retest

- The first reload check landed on the Welcome screen, which is expected: projects appear in **Recent** and are reopened by selecting that entry; they do not automatically open into the editor.
- After waiting for the 1.5-second autosave debounce, refreshing, and opening the most recent project, the media item and both linked timeline clips restored successfully with no browser errors.

## Timeline editing smoke test

- A 6-second clip was placed at sequence zero, the playhead was moved to 00:00:03:00, and `Ctrl+K` split the linked video/audio pair into four timeline clips.
- `Ctrl+Z` restored the original two linked clips. No browser errors were reported.

## Real Firefox desktop QA — Firefox 153.4.0 ESR on Kali Linux

### Runtime codec checks

- `VideoEncoder.isConfigSupported`: H.264, VP9, VP8 and AV1 reported supported at 640×360 / 24 fps.
- `AudioEncoder.isConfigSupported`: Opus and Vorbis reported supported; AAC reported unsupported.
- `VideoDecoder.isConfigSupported`: H.264 reported supported at 1280×720.
- `AudioDecoder.isConfigSupported`: AAC, Opus and Vorbis reported supported at 48 kHz stereo.
- Native playback `canPlayType` reported support for H.264/AAC MP4 and VP9/Opus WebM. Actual H.264/AAC preview was also exercised in the editor: the program canvas changed and the playhead advanced during playback, with no page errors.

### Actual desktop interaction

- Used Firefox's real GTK file picker to import `qa-test-2s.mp4`; the project panel showed the imported 2-second 640×360 24 fps asset.
- Used real X11 mouse drag-and-drop from the Project panel to an empty timeline lane. Firefox emitted `dragstart`, `dragover`, `drop` and `dragend`; the editor created the linked video/audio clips (timeline count increased from 2 to 4).
- Saved, refreshed Firefox, reopened the project from **Recent**, and verified both imported media assets and all four timeline clips restored.
- The project editor remained usable after these operations.

### Firefox export artifact

- Firefox generated `~/Downloads/Firefox QA Export.webm` using WebM / VP9 / Opus at 1920×1080, 30 fps, stereo 48 kHz audio.
- `ffprobe`: 6.12 seconds, 2,217,095 bytes; video VP9 1920×1080 30 fps; audio Opus stereo 48 kHz.
- Full decode with FFmpeg to a null output passed, so the resulting file is readable end-to-end.
- The headless software-rendered 1080p run took several minutes. This is a conservative performance result, not a measurement of the user's normal headful GPU-accelerated workflow.

### Firefox graphics note

- The headful Firefox log recorded two transient WebGL context-loss warnings after window resizing. A subsequent runtime check found the Program canvas WebGL context restored (`isContextLost() === false`) and reported an Intel HD Graphics renderer string. The editor remained usable, but GPU/context stability should be watched on this graphics driver during longer sessions.

### Practical export guidance

- For this Firefox/Linux environment, use WebM + VP9 + Opus for an audio-bearing export.
- AAC **decoding** is supported here, but AAC **encoding** through WebCodecs is not. The absence of AAC encoding must not be confused with inability to import/play AAC source audio.

## Firefox-safe first-run export and nested asset routing

- Added `defaultPresetForBrowser`: on first use, it keeps **Match sequence** when the browser can encode the sequence's H.264/AAC settings; if codec resolution would substitute an incompatible MP4 audio combination, it selects **WebM VP9 + Opus** when that pair is available. A saved user preset still takes precedence.
- Added three preset-selection tests: keep Match with H.264/AAC support, choose WebM VP9 + Opus when AAC encoding is unavailable, and retain Match if a compatible WebM pair is not available.
- Fresh Firefox 153.4.0 ESR profile on the development route selected WebM / VP9 / Opus automatically; no compatibility warning was shown.
- Fresh Firefox 153.4.0 ESR profile on the production preview route also loaded the editor and selected WebM / VP9 / Opus automatically.
- Found that the already-running Vite dev server had a stale public-file list after the nested editor build was copied. Restarted only the local Vite dev server; no application source routing rewrite was needed. The nested entry module now returns `text/javascript` (not the main app's HTML) on both ports 5173 and 4173.

## Latest validation after Firefox fixes

- brainCUT Svelte check: 0 errors, 0 warnings.
- brainCUT tests: 247 passed across 21 files.
- brainCUT static build: passed (existing dynamic-import and large-chunk warnings remain non-blocking).
- Main app TypeScript check: passed.
- Main app tests: 110 passed across 19 files.
- Main app production build: passed (existing large-chunk warning remains non-blocking).
- Base44 CLI build: passed.
- `git diff --check`: passed.
- Dev and production-preview nested routes: HTTP 200; manifest JSON, favicon SVG and editor entry JS served with their correct content types.
- Base44 output contains the updated Firefox-safe default and zero `ffmpeg-core` files.
- No production deployment was performed.


## Firefox extended media and graphics stability check (2026-11-09)

- Used the existing Firefox 153.4.0 ESR GUI session on the Kali desktop and a local-only playback harness. The source was a 10-second, portrait 720×1280 H.264/AAC MOV with 30 fps video and 48 kHz stereo audio. The source was served only from localhost; the original file was not edited or uploaded.
- Completed five consecutive playback passes (50 seconds of media). Firefox reached the end of each pass, emitted normal `playing` / `ended` events, kept the Web Audio context running at zero output gain, and reported no media decode error.
- The test took 58.6 seconds wall-clock, with rebuffer/seek events at the starts of subsequent passes. Final media time was 10 seconds; playback ended normally.
- Firefox's `getVideoPlaybackQuality()` reported 1,500 total frames and 1,325 dropped frames (88.3%); `requestVideoFrameCallback` ran 163 times. Developer Tools were open during this run, so this is a diagnostic warning rather than a clean performance benchmark. Repeat with DevTools closed before treating the frame-drop percentage as definitive.
- Firefox `about:support` showed GPU: Mesa Intel(R) Graphics (LNL), Mesa/iris driver 26.1.6. WebRender compositor was disabled by default; DMABUF surface export was blocklisted as a broken driver path; the graphics diagnostics contained repeated `DeviceReset` errors after WebRender updates. Hardware compositing and several video-decode capability flags were listed as available, but the compositor path is not fully enabled; the clean 25-second native playback run below nevertheless completed without dropped frames.
- No driver, Firefox preference, hardware-acceleration, or application-source changes were made. Do not force-enable blocklisted compositor/DMABUF features without a separate controlled test and recovery plan.
- Conclusion: this initial DevTools-open loop measurement is inconclusive and is superseded by the clean DevTools-closed playback run below. Keep the GPU diagnostics as an environment caveat, not as a proven playback failure.


## Firefox editor integration and clean 1080p playback (2026-11-09)

- Opened the actual nested brainCUT editor in the existing Firefox 153.4.0 ESR GUI session, created a temporary local QA project named `Firefox QA Long Clip`, and used the native GTK file chooser to import real local footage. The source files were read in place; originals were not modified or uploaded.
- Imported a 10.0-second, 720×1280, 30 fps H.264/AAC camera-style MOV. Its audio stream is 9.984 seconds at 48 kHz stereo (16 ms shorter than video). The editor generated the audio waveform, created linked video/audio timeline clips, and rendered the footage in the Program monitor during playback. No fatal media error or editor crash was observed. Exact acoustic lip-sync was not independently measured.
- Imported a second 25.0-second, 1920×1080 H.264 MP4 asset. It appeared in the Project media bin and rendered in the Program monitor. The current timeline/export range for this project was 10.5 seconds, so this export does not represent the full 25-second source.
- Exported from the actual editor using the Firefox-selected **WebM VP9 + Opus** preset at 1920×1080, 25 fps. The resulting `Every Frame First Firefox QA Export.webm` is 10.5 seconds / 1,488,617 bytes, with VP9 video and Opus 48 kHz stereo audio. Full FFmpeg decode passed with no errors.
- Repeated the full 25.0-second, 1920×1080 H.264 source playback in Firefox with Developer Tools closed. It completed in 26.043 seconds wall-clock, reached media time 25.0 seconds, reported 750 total frames and **0 dropped frames**, and emitted normal `playing` and `ended` events with no media error. This clean run shows the earlier 88.3% dropped-frame figure from the DevTools-open loop test was not a reliable performance measure.
- During export, Firefox's 15-process group reached approximately 2.8 GiB aggregate proportional set size (PSS); the host had 15 GiB RAM and about 7.3 GiB available at the sample. This includes all Firefox tabs/processes in the existing profile, not just the editor, and is not an isolated editor memory measurement.
- Graphics caveat remains: Firefox's system diagnostics still show WebRender compositor disabled and a blocklisted DMABUF path with device-reset warnings. Native 1080p playback is smooth in the clean run, but prolonged PixiJS/WebGL canvas stability under repeated resize and editing operations still needs a dedicated editor-canvas stress pass.
- No app source, production data, driver, or Firefox preference changes were made. This stage added only this QA report section and generated a temporary local QA project/export.


## Full-length timeline, AV export and media-loaded canvas stress (2026-11-09)

- Ran a separate automated Chromium browser session against the actual nested `/video-studio/` editor route. This is explicitly a Chromium/Playwright pass; it does not replace the earlier real Firefox desktop checks or claim that Firefox's graphics-driver caveat is resolved.
- Created an isolated QA project, imported the existing local 25.0-second 1920×1080 H.264 video, and imported a temporary 25.0-second 48 kHz stereo MP3 test track. The MP3 was derived from the existing 30.24-second local voiceover using FFmpeg; the original voiceover and video files were not modified or uploaded.
- Placed the video at 00:00:00:00 on V1 and the audio at 00:00:00:00 on A1. The editor showed a 25.00-second sequence with two timeline clips. The full sequence played to 00:00:25:00 in the editor with no JavaScript errors.
- Exported the entire sequence from the editor using **WebM / VP9 / Opus**, 1920×1080, 30 fps, high quality. The generated artifact is `~/Downloads/Every Frame First Full 25s AV QA.webm` (3,545,076 bytes; approximately 3.4 MiB).
- `ffprobe -count_frames`: VP9 video 1920×1080 at 30 fps, 750 decoded frames; Opus audio 48 kHz stereo. Video packet timestamps span exactly 0.000–25.000 seconds. Audio packet timestamps span approximately -0.007–25.013 seconds; the measured track-boundary difference is about 20 ms. The WebM container duration is 25.020 seconds, consistent with Opus packet/pre-roll timing rather than a shortened video export.
- Full FFmpeg audio+video decode passed. Separate video-only decode passed. Separate audio-only decode passed. No JavaScript errors were reported during import, timeline placement, or export.
- Repeated 30 viewport-size changes and five preview zoom changes (25%, 50%, 100%, 200%, Fit) with both media tracks loaded. The active Program WebGL2 canvas (480×270 backing store) and the second active WebGL2 renderer context (320×180) remained live; neither emitted a context-loss event. One `webglcontextlost` event was observed only on a zero-sized (0×0) WebGL feature-detection canvas, not on either active editor renderer. No page errors occurred.
- Chromium's reported JavaScript heap after media import and timeline setup was approximately 139 MB. This is the page JS heap measurement, not total browser-process RSS.
- The export and resize automation used an isolated temporary browser profile; its project data was not persisted into the user's normal browser profile. The original media files were read in place. No application source, production database, deployment, driver, or Firefox preference changes were made.

### Remaining browser-specific check

- The full 25-second AV export and media-loaded 30-cycle canvas stress above were verified in Chromium. Firefox's prior real-desktop 25-second native playback (750 frames, zero dropped) and 10.5-second editor export remain verified; a matching full 25-second AV export plus media-loaded canvas resize pass in the actual Firefox desktop session is still outstanding. Keep the Firefox WebRender/DMABUF driver diagnostics as an environment caveat until that pass is completed.

## Microphone recording milestone — active Video Studio integration (2026-11-09)

- Traced the visible Video Studio entry point: `Home.tsx` opens `VideoStudioFrame`, which hosts the Svelte/brainCUT editor from `public/video-studio/`. The earlier React `MediaCreatorStudio.tsx` is not the active route, so microphone capture was integrated into the actual editor's Audio Mixer instead of leaving a disconnected legacy control.
- Added a local microphone recorder to the Audio Mixer workspace. It enumerates available inputs, supports explicit microphone selection, requests permission only after the user presses Record, captures Opus/WebM or Ogg via `MediaRecorder`, shows elapsed recording time and recording state, and stops/releases microphone tracks after capture.
- Added a destination selector for A1/A2/A3. On Stop, the captured file is imported into the current project, decoded/probed by the existing media pipeline, and placed at the current playhead on the selected unlocked audio track. If that track is occupied at the playhead, the placement logic uses another unlocked audio track; if none is free, it adds an audio track. The recording becomes a normal project media item and timeline clip, with normal undo/history and save behavior.
- Added pure unit tests for browser recording-format selection and timestamped local file creation.
- Actual-editor smoke test in Chromium with a synthetic microphone device: created an isolated project, opened Audio Mixer, selected the fake default input, recorded for approximately 2 seconds, stopped, and verified a 2.5-second Opus/WebM file was imported and placed on A1 at the playhead. The project media bin showed the recording, the A1 timeline lane showed the audio clip/waveform, and the inspector/mixer selected the clip. No JavaScript page errors occurred.
- Validation: brainCUT `npm run check` passed with 0 errors / 0 warnings; brainCUT `npm test` passed 249 tests across 22 files; brainCUT production build passed. The nested build was copied into `public/video-studio/` for the local development app. Root application typecheck/build also passed earlier in this development stage, before the active editor's microphone integration; rerun root build after final packaging.
- The browser smoke test used a fake microphone source, not the physical microphone. Actual physical-device permission, capture quality, monitoring latency and long-duration recording still need a real-device check.
- No source media originals were modified. The test project used an isolated browser profile. No production deployment, cloud upload, database mutation, or system/driver/browser preference change was performed.
- Follow-up multitrack collision test: recorded two separate takes at the same playhead position while A1 remained selected. The first recording landed on A1; the second was automatically routed to A2 rather than overwriting the first. Both recordings appeared in the media bin and separate A1/A2 timeline lanes. No JavaScript page errors occurred.
- Final root-app validation after the nested editor update: TypeScript check passed; 110 tests passed across 19 files; production build passed; `git diff --check` passed. The existing large-chunk warning remains non-blocking.
- Persistence round-trip: in an isolated Chromium profile, recorded a microphone take, waited for autosave, reloaded the editor, reopened the project from Recents, and verified the recording's media item and A1 timeline clip were restored. No missing-media warning or JavaScript error appeared. This confirms the existing IndexedDB source registry retains the captured File alongside the project metadata.

## Live webcam capture milestone — active editor integration (2026-11-09)

- Added a Live Camera & Recording panel to the existing Audio Mixer workspace, alongside the microphone-only recorder. The capture panel enumerates laptop and USB/external webcams and microphone inputs, supports choosing a camera and mic, optional audio capture, live preview, connection status, elapsed recording time, and explicit disconnect.
- Capture uses browser `getUserMedia` and `MediaRecorder` after an explicit user action. The captured WebM/MP4 media is imported through the same media pipeline as other footage, placed at the current timeline playhead, and linked audio/video clips are added to available unlocked video/audio tracks. Existing tracks are preserved; additional tracks are created when needed. The resulting source uses the existing IndexedDB/OPFS persistence path and is editable/exportable like imported media.
- Browser smoke test with a synthetic webcam + microphone: camera connected at 1920×1080, live preview reached readyState 4, 3.2-second recording completed, captured video/audio imported, and the synchronized clips appeared in the project timeline. No JavaScript errors occurred.
- Persistence round-trip test: recorded a webcam clip, allowed project autosave, reloaded the editor, reopened the project, and confirmed the camera-recording file and two timeline clips were restored. No JavaScript errors occurred.
- This milestone is in-app live camera preview and recording. It does not yet broadcast/stream out to YouTube, Twitch, RTMP, or other external destinations; that is a separate streaming-output feature.
- Validation: Svelte check passed with 0 errors / 0 warnings; 249 tests passed across 22 files; production build passed; updated nested editor package copied to `public/video-studio/`; `git diff --check` passed. Existing Vite chunk-size/dynamic-import warnings remain non-blocking.
- QA used Chromium's synthetic camera/microphone devices. Physical laptop and USB camera selection, hardware-specific capture stability, and long-duration recording still require testing on the actual devices. No production deployment, cloud upload, database mutation, driver change, or original media modification was performed.

## Multicamera production studio milestone (2026-11-09)

- Added `MultiCameraStudio.svelte` to the active Audio Mixer workspace, in the actual brainCUT editor route. It supports up to four simultaneously connected camera inputs, source selection for the program output, optional screen-share input, and a live 1920×1080 canvas program compositor.
- Added single-camera, side-by-side, picture-in-picture, and 2×2 multiview layouts; lower-third title and subtitle overlays; source cards with resolution/program status; per-source audio mute controls; and mixed audio capture through Web Audio gain nodes.
- Added program recording: the composited canvas is captured at 30 fps, selected source audio is mixed into the recording, and the completed WebM is imported as normal video/audio media and placed on unlocked video/audio timeline tracks at the current playhead. Switching the program source/layout and graphics updates the recorded canvas output while recording.
- Chromium synthetic-device integration tests passed: camera + screen share produced two live sources; side-by-side/PIP/quad layouts changed successfully; screen-share audio mute/unmute controls worked; a program recording was captured, imported, and placed on V1/A1; no page JavaScript errors occurred. The generated program recording appeared in the media bin and timeline.
- Svelte check: 0 errors, 0 warnings. BrainCUT unit suite: 249 tests across 22 files passed. BrainCUT production build passed. Root app typecheck passed, root suite passed 110 tests across 19 files, root production build passed. Nested production package was recopied to `public/video-studio/`; local dev and preview routes returned HTTP 200; `git diff --check` passed.
- Current milestone is local multicamera production and recording. External broadcast publishing (RTMP/YouTube/Twitch), network guest contribution, stream key management, adaptive bitrate/network health, and hardware-specific multicamera stress testing are not implemented yet. Browser QA used one synthetic camera plus a synthetic screen-share source, not two physical webcams. Test physical USB/laptop cameras and sustained multi-source thermal/CPU behavior before relying on it for a live event.
- No production deployment, broadcast connection, cloud upload, database mutation, system driver/preference change, or original media modification was performed.

## WHIP/WebRTC live broadcast output milestone (2026-11-09)

- Added a live broadcast panel to the multicamera production studio. Users can enter a secure HTTPS WHIP ingest endpoint and optional bearer token, then publish the live composited program canvas and mixed source audio over a browser WebRTC peer connection.
- Implemented SDP offer/answer negotiation, ICE candidate gathering before WHIP POST, optional bearer authorization, WHIP session URL handling, and DELETE teardown when the user ends the broadcast. The token is held only in component memory; it is not written to project metadata, browser storage, or files. The endpoint/token controls are locked while connected.
- Split audio mixing into independent capture graphs for local program recording and broadcast. This prevents starting/stopping one output from tearing down the other's audio graph; per-source mute changes are propagated to both active mixes.
- Added user-facing handling for HTTPS-only endpoint validation, HTTP authorization/server failures, invalid SDP responses, and common network/CORS failures. WHIP services must permit browser cross-origin POST/DELETE requests and the required headers.
- Browser integration check with a mocked WHIP endpoint verified that an HTTP 401 response is surfaced in the studio status and creates no page JavaScript errors. No real streaming provider credentials or destination were configured, and no public broadcast was started. End-to-end publishing and simultaneous live broadcast + local recording against a real WHIP service remain to be verified.
- Validation after broadcast implementation: brainCUT Svelte check passed with 0 errors / 0 warnings; 249 tests across 22 files passed; brainCUT production build passed; root typecheck passed; 110 root tests across 19 files passed; root production build passed; `git diff --check` passed. Updated brainCUT build was copied into `public/video-studio/`.
- This is WHIP/WebRTC output, not a direct RTMP client. To reach RTMP-only destinations, a WHIP-to-RTMP relay or compatible streaming provider is required. No production deployment or external stream was initiated.
- Added outbound stream telemetry to the WHIP panel: estimated video bitrate (kb/s), encoded frame rate, and selected ICE candidate-pair round-trip time, sampled from `RTCPeerConnection.getStats()` every two seconds. ICE gathering now fails explicitly on timeout instead of posting an incomplete candidate set.
- Final WHIP diagnostics validation: Svelte check 0 errors / 0 warnings; all 249 nested tests pass; nested production build passes; root typecheck and 110 tests pass; root production build passes; mocked HTTP 401 endpoint failure displays a readable status with no page errors; local `/video-studio/` route returns HTTP 200. Build copied to `public/video-studio/`.

## Remote podcast guest contribution milestone (2026-11-09)

- Added a standalone guest join page at `/video-studio/guest.html`, designed for a participant joining from a separate computer/browser. Guests paste the host invitation, choose a camera and microphone, grant browser permissions, preview their camera, and generate a one-time answer code.
- Added a host-side remote guest workflow in the multicamera switcher: create a WebRTC offer, share the guest page address and invitation privately, paste the guest's answer, and receive the remote audio/video stream as a selectable program source. Remote guest audio participates in the program mix and can be muted independently. Disconnect stops the peer connection and remote tracks.
- Uses direct WebRTC with public STUN and manual SDP exchange; there is no hosted signaling service or TURN relay in this milestone. This avoids creating an unauthenticated signaling backend, but requires the host and guest to exchange invitation/answer codes out of band. Some NAT/firewall combinations will require TURN; remote guest access requires the page to be served over HTTPS outside localhost.
- Browser integration test passed using two separate browser pages with synthetic camera/microphone devices: host offer generated, guest answer generated, remote guest video/audio received by host, source appeared in the production switcher, and a program recording containing the remote guest source was imported into the editing timeline. Zero page JavaScript errors.
- Final nested validation: Svelte check 0 errors / 0 warnings; 249 tests across 22 files passed; nested production build passed. Built assets copied to `public/video-studio/`.
- No real remote network participant, physical webcam, TURN relay, or production deployment was tested. Guest connection reliability across separate networks remains to be validated before live events.
## Remote guest final verification (2026-11-09)
- Root application validation after packaging: TypeScript typecheck passed; 110 tests across 19 files passed; production build passed; `git diff --check` passed. Dev server and preview server routes returned HTTP 200 for the studio and guest page.
- Guest page is shipped as a static, standalone page inside the nested editor build (`/video-studio/guest.html`); the root application's unrelated login route is not used for guest joining.

## Hosted guest-room / producer dashboard milestone (2026-11-09)

- Added a dedicated WebSocket signaling service (`server/guest-signal.mjs`) with private room creation, host bearer token, guest invitation token, 2-hour room expiry, maximum four guests, message size limits, per-IP concurrent connection limits, room-creation rate limiting, host-only participant controls, and server-side room cleanup. The service relays SDP signaling only; it does not receive or store media.
- Added root Vite development proxies for room creation (`/api/guest-rooms`) and signaling (`/guest-signal/ws`), plus `npm run guest-signal` to run the local service. The service binds to loopback by default. The root `.env.example` documents the service settings.
- Added producer room dashboard: create/close room, copy a private invitation URL, show room code, up to four guest roster entries, live connection state, received-byte and RTT telemetry, mute/unmute guest audio, disable/enable guest camera, and remove a participant. The invitation secret is placed in the URL fragment (not sent in the HTTP request or referrer).
- Guest page now joins the room automatically through WebSocket signaling, negotiates its peer connection without manual SDP copy/paste, offers local mic/camera toggles, receives producer mic/camera/kick commands, and releases media on exit.
- TURN support: service can generate time-limited coturn REST credentials using `GUEST_TURN_URLS`, `GUEST_TURN_SHARED_SECRET`, and `GUEST_TURN_CREDENTIAL_TTL`. Credentials and ICE server configuration are delivered to host and guest during room join. Without TURN settings, STUN-only connectivity remains; no TURN relay was provisioned or externally tested.
- Browser integration test passed with two separate guest browser pages and synthetic camera/microphone devices: room creation, private invite link, automatic WebSocket signaling, two simultaneous guest connections, host roster and quality stats, producer mute/camera controls, room shutdown, and zero page JavaScript errors. Both remote video sources appeared in the switcher after a duplicate-track race was fixed.
- Server tests added: room authorization, two-guest SDP relay, four-guest cap, and time-limited TURN credentials. Two tests passed.
- `vendor/braincut` Svelte check: 0 errors / 0 warnings. Build passed. Root full-suite and production build validation remain in progress after packaging.
- This is a local signaling service, not a publicly hosted service. Internet participants need the app and signaling service deployed behind HTTPS/WSS with an explicit allowed-origin list; configure TURN for restrictive networks. No deployment, public stream, or external infrastructure was started.
- Final browser end-to-end verification after rebuilding the packaged editor: two guest sources and two roster entries; guest self-service mic/camera toggles; producer-side mic mute and camera disable; 2.5-second program mix recording with both remote guests; imported recording appeared on the timeline; closing the room disconnected participants. Zero page JavaScript errors.
- Final validation: root TypeScript check passed; root suite passed (112 tests across 20 files); root production build passed; nested editor Svelte check passed (0 errors / 0 warnings) and production build passed; guest static-page script passed `node --check`; `git diff --check` passed.
- Local services are running on the Kali development machine: root Vite app on 5173 and guest signaling on 18788. They are local development services only, not public endpoints.

## Isolated guest audio and adaptive network recovery milestone (2026-11-09)

- Added independent audio capture for every connected remote guest during a program recording. Each guest receives a separate audio-only MediaRecorder stream through its own Web Audio capture graph, while the existing mixed program recording continues unchanged. On stop, the mixed program is imported as the normal video/audio timeline item and each guest stem is independently imported as an audio clip on its own available audio track at the same playhead position. Existing timeline content is preserved; track placement uses the existing unlocked-track/collision logic.
- Added guest-side adaptive video sender settings sampled every three seconds from WebRTC remote-inbound statistics. The guest adjusts target bitrate, frame rate and resolution scale between high (1.8 Mbps / 30 fps / native), medium (700 kbps / 24 fps / 2× downscale), and constrained (350 kbps / 15 fps / 3× downscale) profiles based on measured round-trip time and packet loss.
- Added automatic guest signaling reconnection with exponential backoff, preserving the local camera/microphone stream while the guest re-authenticates to the active room. A failed or persistently disconnected media peer triggers a signaling reconnect; the host sees a fresh participant join and negotiates a new peer connection. Manual leave and room-closed actions still stop local media and suppress retries.
- Validation: guest-page inline JavaScript passed `node --check`; brainCUT Svelte check passed with 0 errors / 0 warnings; all 249 nested tests across 22 files passed; nested production build passed; root TypeScript check passed; all 112 root tests across 20 files passed; root production build passed; `git diff --check` passed. Updated nested production output and guest page were copied into `public/video-studio/`; local studio and guest routes both returned HTTP 200; local signaling `/health` returned healthy.
- Limitations: adaptive profile switching and signaling retry are implemented but still need real network impairment testing. Isolated guest stem capture has passed static/type/build validation but still needs a browser end-to-end recording test to verify codec support, decode/import and synchronized track placement with multiple guests. Current browser tests from the prior milestone used synthetic devices on one local machine; they do not validate different internet connections or physical webcams/microphones.
- Deployment and TURN remain unprovisioned. The signaling service is still local-only and defaults to loopback; no public DNS, TLS certificate, cloud service, TURN server, firewall, paid resource or production endpoint was changed. A real public deployment needs the chosen hosting provider/domain and an approved monthly cost ceiling; a real cross-network test additionally needs a second internet connection and physical guest device(s).

- Added production cross-origin signaling support for a separately hosted HTTPS/WSS service: exact-origin allowlisting, browser preflight handling, CORS response headers, strict WebSocket Origin checks, and use of the platform-provided `PORT`. Verified allowed preflight (204), blocked foreign origin (403), and allowed room creation (201) in an isolated local server test.

## Hosted guest rooms and production-browser validation (2026-11-09)

- Deployed the authenticated signaling service to `https://every-frame-guest-signal.onrender.com` and the updated studio to `https://every-frame-first-studio.onrender.com`. The editor bundle now embeds the separate signaling origin; the guest invite page reads the same HTTPS/WSS service URL. Both public editor and guest routes return HTTP 200; signaling `/health` returns healthy.
- Hosted API validation from the deployed app origin: CORS preflight returned 204, room creation returned 201, authenticated host and guest WebSocket sessions each received their ready event, and a foreign Origin was rejected with 403. The hosted service binds to the platform-provided port and enforces the exact app Origin for API and WebSocket requests.
- Production browser test used synthetic camera/microphone devices: a host created a room, a guest joined over WSS, the producer roster reported the guest live, the guest video appeared as a program source, and a 3.5-second program recording imported the mixed program plus one separately recorded guest audio stem into the timeline. The browser reported zero JavaScript errors.
- Adaptive sender quality code was exercised in the guest browser; `RTCRtpSender.setParameters` was called repeatedly while connected. Reconnection was exercised by dropping/replacing the guest signaling socket, sending the authenticated leave event, re-authenticating, and confirming the host received `guest-left` then `guest-joined` and retained exactly one live roster row. The server has a regression test for explicit leave followed by clean rejoin.
- Final local validation after the latest code changes: root TypeScript check passed; root tests passed (113 tests across 20 files); root production build passed; nested brainCUT Svelte check passed (0 errors / 0 warnings); server guest-signaling tests passed (3 tests); guest inline JS syntax check passed.
- Hosting limitation: the signaling service is currently on Render's free web-service tier to avoid adding a paid resource. It can spin down when idle, so it is a staging/test endpoint rather than a dependable always-on production signaling service. Creating a paid Starter service was blocked by Render because billing information is required; no payment method was added and no paid resource was created.
- TURN remains unconfigured. The service currently supplies STUN only. Render web-service ingress is not a suitable public UDP TURN relay, and no dedicated TURN provider credentials or VPS control-plane credentials were available. A production TURN relay still needs a provider/VPS that exposes UDP/TCP TURN ports and a shared secret; do not substitute a public shared relay for production media.
- Not yet physically validated: separate internet connections, actual webcams/microphones, and a second physical device. The browser tests above ran synthetic devices on one machine; they do not establish NAT traversal across independent networks. No public broadcast was started.
