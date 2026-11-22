# Video Studio — Trial Demo Guide

**Date:** 2026-11-19 · **Repository:** `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai` · **Branch:** `feature/pro-editor-rebuild` · **Build:** `1795127675617`

## 1. Exact startup command

```powershell
cd "C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai"
npm run build
npm run preview -- --port 4176 --strictPort
```

The current build is already produced; if nothing changed since this guide, skip `npm run build` and run only the preview command. Port 4175 is already serving an older preview session; use 4176 (or any free port by changing `--port`). Do **not** rely on `npm run dev` here: port 5173 is occupied by an unrelated "Privacy Guard" server on this machine.

## 2. Local URL

`http://127.0.0.1:4176/video-studio/`

## 3. Browser recommendation

Use **Google Chrome or Microsoft Edge** (Chromium). The workflow below was verified in the in-app Chromium 152 browser; H.264/AAC WebCodecs export needs Chromium. Firefox/Safari have fewer codecs and no direct-write export.

## 4. Open the editor

Open the URL. The welcome screen shows **Import footage**, **Create blank project**, **Open project file**, and the recent projects list. Click **Import footage** (or a recent project) to enter the editor.

## 5. Import a video

- Click **Add media** in the top bar and choose a video/audio/image file in the native picker. Nothing is uploaded; files stay on the device.
- A drag-and-drop of files anywhere in the editor also imports them.
- Test asset used for the verified demo: `%LOCALAPPDATA%\Temp\opencode\m14-acceptance\m14-clip.mp4` (279 KB, 8 s, 352×640 @30 fps, with audio). Any short MP4 works.
- After import, the file appears in the **Media** panel with duration and resolution.

## 6. Add it to the timeline

Drag the media tile from the **Media** panel onto the **V1** lane of the **Sequence 1** timeline. A video clip with sound creates a paired clip on the audio lane (A1). The clip duration and total sequence duration update in the status bar.

## 7. Preview

Use the transport controls above the timeline (Play/Pause, step, jump to start/end) or **Space**. The **Program** monitor at the top shows the current frame; seek by clicking the ruler or the scrub bar. The source monitor on the left shows selected media.

## 8. Save

Click **Save** in the top bar (Ctrl+S). With the File System Access API available, Chrome shows a save picker; choose a location for the `.braincut` file. If the picker is unavailable or fails, the editor automatically downloads the project file and shows an info toast. Keep this file if you want to reopen the project later (autosave + recent projects also work).

## 9. Export

Click **Export** (top right). The default **Match sequence** preset is H.264 MP4, sequence resolution and frame rate, AAC audio, entire sequence. Click **Export** in the dialog. Progress appears in the status bar and the dialog offers **Cancel** while rendering. On completion, a toast reports the exported file name and size.

## 10. Where the exported file is saved

- Regular Chrome: to your configured **Downloads** folder (or the location chosen in the save picker, when available).
- If the save picker is unavailable, the editor shows "Save dialog unavailable — falling back to browser download" and the MP4 lands in Downloads.
- In the in-app browser used for verification, the download was captured at:
  `C:\Users\yayam\AppData\Local\Temp\opencode-browser-P5DbB8\0\Sequence_1.mp4`
  (1,533,559 bytes, MP4, 1920×1080, 8.32 s, H.264 + AAC).

## 11. Known limitations

- Multi-hour / 4K long-form performance has **not** been measured — no suitable long media was available. See `M2.1_LONG_FORM_TEST_PROTOCOL.md`.
- The direct-write save-picker path requires a manual browser gesture and was **not** driven by automation; the download fallback is verified.
- VLC is not installed; playback was verified in Chrome and the in-app player.
- The export size estimate is a content-blind heuristic ("about 7.9 MB" for an actual 1.5 MB file).
- At a 1280×800 desktop viewport, the bottom Media dock can cover the lower timeline lanes; drag the dock divider down, or temporarily hide the bottom panel in DevTools, to show A1/A2/A3.
- Trim/split/delete were code-audited but not exercised by browser automation in this session.

## 12. Recovery steps

- **Import fails / "No media files found (NotAllowedError)"**: use **Add media** in real Chrome (native picker) instead of a synthetic drag; for previously granted files, use **Grant access** or relink the file.
- **Media missing after reload**: use the project panel's relink / "Grant all" workflow and point to the original file; the saved `.braincut` stores references, not media bytes.
- **Stale UI after a rebuild**: hard-reload (Ctrl+Shift+R) or clear site data/service workers for `127.0.0.1:4176`; hashed chunks are immutable.
- **Export fails**: check disk space, close other heavy tabs, reload the page, and retry; the fallback download is always attempted if a save picker is unavailable.
- **Editor does not start**: confirm no other process holds the chosen port (`--port 4176 --strictPort` will fail loudly), then rerun `npm run build && npm run preview ...`.
