# Upstream Source Catalog — Every Frame First Studio

Status: research baseline; no upstream source files have been copied into this repository yet.
Target: reuse mature, legally compatible source code to build one stable photo, video, and audio editor.

## Rules for importing upstream code

1. Prefer maintained libraries with permissive licenses (MIT, BSD-2/3-Clause, Apache-2.0).
2. Record the exact upstream repository, release/tag or commit SHA, license expression, copyright notice, and files imported.
3. Preserve LICENSE, NOTICE, attribution, and required source-disclosure materials.
4. Do not copy application code from GPL/AGPL projects into the proprietary/product codebase without a deliberate copyleft decision and legal review. These projects can still be studied, run as separate tools, or integrated as separate processes where license obligations are understood.
5. Never copy proprietary code, private APIs, assets, trademarks, or undocumented services from CapCut, Adobe, or other closed products.
6. Do not vendor a whole repository just because it is open source. Import only the smallest useful modules and their required dependencies.
7. Pin versions and run security, license, build, and regression checks before accepting an update.

## Existing project foundation (already in this repository)

| Component | Current use | License / handling |
|---|---|---|
| React + TypeScript + Vite | Application UI/build | Verify exact package metadata and lockfile before release |
| Fabric.js | Canvas objects, text, drawing, layers | MIT; retain upstream notices |
| PixiJS | GPU-accelerated preview/rendering experiments | MIT; retain upstream notices |
| Cropper.js | Crop/rotate/zoom interactions | MIT; retain upstream notices |
| webgl-media-editor | Isolated manual-engine evaluation | AGPL-3.0-only; release blocker until obligations accepted or removed |
| MediaPipe Tasks Vision | Local face landmarks | Review Google package/model terms and model assets separately |
| IndexedDB | Local media/project persistence | Browser platform API |

See `THIRD_PARTY_EDITOR_LIBRARIES.md` for the existing dependency-specific evaluation notes.

## Candidate upstream source repositories

These are candidates to evaluate, not approvals to copy wholesale. Confirm the exact release license and transitive dependencies at the time of import.

| Area | Upstream | Intended reuse | Initial license posture |
|---|---|---|---|
| Video/audio processing | [FFmpeg](https://github.com/FFmpeg/FFmpeg) | Desktop import, decode, transcode, thumbnails, render/export through a controlled adapter | LGPL/GPL depends on build configuration and linked components; select and document a compliant build |
| Audio waveform UI | [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) | Waveform display, regions, selection and navigation | BSD-3-Clause; retain notices |
| Browser audio engine | [Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API) | Playback, recording, gain, fades, routing and effects | Browser API; no third-party source import |
| Browser media codecs | [WebCodecs](https://developer.mozilla.org/docs/Web/API/WebCodecs_API) | Hardware-assisted decode/encode when supported | Browser API; requires capability detection and container mux/demux separately |
| Browser containers | [Mediabunny](https://github.com/Vanilagy/mediabunny) | MP4/WebM and audio container demux/mux | MPL-2.0; modified covered files require source-disclosure compliance |
| Photo processing | [OpenCV](https://github.com/opencv/opencv) | Optional image operations, masks, geometry and computer vision | Apache-2.0 for current 4.x line; verify exact version and bundled components |
| Canvas/layers | [Fabric.js](https://github.com/fabricjs/fabric.js) | Selection, objects, transforms, text and layer interactions | MIT |
| GPU rendering | [PixiJS](https://github.com/pixijs/pixijs) | Accelerated previews and effect pipeline | MIT |
| Desktop shell | [Tauri](https://github.com/tauri-apps/tauri) | Native macOS/Windows shell and safe filesystem commands | MIT/Apache-2.0; retain notices |
| Full video-editor reference | [Shotcut](https://github.com/mltframework/shotcut) and [MLT](https://github.com/mltframework/mlt) | Study timeline, filters, media graph and export architecture; consider separate-process integration | GPL family; do not copy into app without copyleft review |
| Full video-editor reference | [Kdenlive](https://invent.kde.org/multimedia/kdenlive) | Study editing workflow and timeline concepts | GPL family; do not copy into app without copyleft review |
| Photo-editor reference | [GIMP](https://gitlab.gnome.org/GNOME/gimp) | Study non-destructive editing, selection and image pipeline patterns | GPL family; reference/separate application only absent a copyleft decision |
| Painting/raster reference | [Krita](https://invent.kde.org/graphics/krita) | Study brush engines, layers and raster workflows | GPL family; reference/separate application only absent a copyleft decision |
| Video-editor reference | [OpenShot](https://github.com/OpenShot/openshot-qt) | Study timeline/project/export architecture | GPL family; review exact components and dependencies before any reuse |

## Recommended integration strategy

- Keep the existing photo editor working; do not replace its current photo engine during the first integration pass.
- Build a shared, versioned project model and media asset registry before adding more engines.
- Use Fabric.js/PixiJS for browser-side photo canvas and preview where they outperform the existing implementation.
- Use Web Audio + wavesurfer.js for browser audio editing.
- Use WebCodecs + Mediabunny for supported browser video paths; explicitly report unsupported codecs rather than pretending to export.
- Use a Tauri desktop shell with an allowlisted FFmpeg adapter for reliable native media processing. Never expose arbitrary shell execution to the web UI.
- Keep Shotcut/MLT, Kdenlive, GIMP, and Krita as architectural references or separate programs unless the project deliberately adopts their copyleft terms.

## Source extraction ledger

For every future import, add a row with:
- upstream repository and canonical URL;
- exact tag/version and commit SHA;
- license expression and LICENSE file hash;
- imported paths and local destination;
- modifications made;
- required notices/source-offer/relinking obligations;
- security scan and tests performed;
- reviewer and date.

No upstream source is considered "extracted and usable" until this ledger is complete and the source is pinned in the repository.
