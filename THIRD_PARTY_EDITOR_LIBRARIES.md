# Third-party manual editing engines

This branch adds four browser-side editing libraries for evaluation in Every Frame First Studio.

| Package            | Purpose                                             | License       | Notes                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fabric             | Canvas objects, text, drawing and layers            | MIT           | Include the upstream copyright and license notice.                                                                                                                                                                      |
| pixi.js            | GPU-accelerated image preview and color adjustments | MIT           | No remote API or account required.                                                                                                                                                                                      |
| cropperjs          | Interactive crop, rotate and zoom                   | MIT           | Uses the 1.x API for compatibility with the WebGL editor package.                                                                                                                                                       |
| webgl-media-editor | WebGL filter editor and intensity controls          | AGPL-3.0-only | **Release gate:** do not publish or deploy a build containing this package until its AGPL source-disclosure/network-service obligations have been reviewed and explicitly accepted, or the package is replaced/removed. |

All processing is performed in the user's browser. These libraries do not require API keys or paid API calls. Browser GPU availability and performance vary by device.

## Important evaluation boundary

The WebGL Media Editor is intentionally isolated behind its own tab in the Manual Engine Lab. It is present because it was requested for evaluation, but its AGPL-3.0-only license is materially different from the MIT licenses of the other three packages. Installing it is not the same as clearing it for commercial distribution. Review the complete license and deployment model before production release.
