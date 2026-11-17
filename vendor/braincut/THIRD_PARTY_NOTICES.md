# Direct dependency license notices

This list covers the direct runtime dependencies declared by the pinned brainCUT `package.json`. Individual license texts available from npm are copied into `third-party-licenses/`.

| Dependency | Version | Declared license | Role |
|---|---:|---|---|
| mediabunny | 1.65.2 | MPL-2.0 | Media demuxing, probing and muxing |
| pixi.js | 8.22.0 | MIT | WebGL compositing and rendering |
| pixi-filters | 6.1.5 | MIT | GPU effects |
| gl-transitions | 1.76.1 | MIT | Transition shaders |
| @ffmpeg/ffmpeg | 0.12.15 | MIT | Optional FFmpeg JavaScript wrapper only |
| @ffmpeg/util | 0.12.2 | MIT | Optional FFmpeg utility wrapper only |
| idb-keyval | 6.3.0 | Apache-2.0 | IndexedDB persistence |
| immer | 11.2.9 | MIT | Immutable project state and history |
| gifenc | 1.0.3 | MIT | GIF export |
| tinykeys | 4.0.1 | MIT | Keyboard shortcuts |
| bezier-easing | 3.2.0 | MIT | Keyframe easing |

The optional `@ffmpeg/core` WebAssembly binary is **not** included in this build and is disabled by default. Do not configure a GPL core mirror in a distributed product without a separate licensing decision. The project also contains transitive dependencies and optional model assets; perform a complete production dependency/model notice audit before public redistribution.

Upstream project license: `LICENSE` (MIT, Copyright (c) 2026 Braian PLAKU).
