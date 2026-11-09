# brainCUT upstream source

- Upstream: https://github.com/swimmingbrain/braincut
- Pinned commit: `2499a0f902e6cf833df1c1f8340de4244c7d7bc2`
- Upstream license: MIT; see `LICENSE`.
- Included as the video-editing engine foundation for Every Frame First Video Studio.

Local product modifications in this pinned copy:

- SvelteKit static SPA fallback is mounted at `/video-studio/`.
- The landing route opens the editor directly.
- The visible product brand is Every Frame First.
- The first-run welcome flow asks the user to create a project; the toolbar exposes the explicit **Import video** action after project creation.
- The FFmpeg converter mirror is empty by default. No GPL FFmpeg core is bundled or fetched automatically. Users must explicitly configure a separately licensed converter if needed.
- Firefox/Safari retain their documented reduced-codec workflow; Chromium provides the broadest WebCodecs/File System Access support.

Do not remove the upstream MIT license or the third-party notices. Review dependency licenses before redistributing modified dependencies or model assets.
