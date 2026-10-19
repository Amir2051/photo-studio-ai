# HERMES MASTER BUILD PROMPT — COMPLETE AI PHOTO EDITING STUDIO

## Your mission

Act as a senior full-stack engineer, AI engineer, UI/UX designer, mobile-web specialist, QA engineer, and security engineer.

Build a **complete, production-quality, AI-powered photo-editing application** that works on iPhones, Android phones, tablets, laptops, and desktop PCs.

Do not create only a mockup, landing page, or frontend demonstration. Build the actual working application, including the editing engine, image processing, user accounts, saved preferences, AI integrations, persistent storage, batch editing, and installation support.

Work autonomously through implementation, testing, debugging, and verification. Inspect your environment and available tools before deciding how to build. Use existing infrastructure where appropriate, but do not modify unrelated projects.

**The final result must be usable on real devices, responsive at every screen size, secure, and capable of editing actual uploaded photographs.**

---

## 1. Start with a complete environment audit

Before making changes:

1. Identify the active repository, working directory, framework, package manager, existing application structure, available backend services, environment variables, and deployment setup.
2. Inspect existing code before replacing anything.
3. Determine which authentication, database, storage, image-processing, and AI services are already configured.
4. Check whether OpenRouter credentials are available without printing, exposing, or committing secrets.
5. Identify available test commands, build commands, browser-testing tools, and deployment capabilities.
6. Write a short implementation plan with milestones and dependencies.
7. Keep unrelated repositories, databases, applications, and production environments untouched.
8. Never delete existing user data, expose secrets, or deploy to production without explicit authorization.

If no suitable application exists, initialize the project using the architecture below. If a project already exists, adapt it safely rather than unnecessarily rebuilding it.

## 2. Build a cross-platform Progressive Web App

Build an installable PWA that works on:

- iPhone and iPad through Safari and supported installation features.
- Android phones and tablets through supported mobile browsers.
- Windows PCs.
- macOS computers.
- Linux desktops.
- Modern browsers including Safari, Chrome, Firefox, and Edge, subject to their respective feature support.

Preferred stack, unless the audited repository gives a strong reason to use an equivalent:

- React and TypeScript.
- Vite.
- A responsive component system with accessible controls.
- Canvas, WebGL, WebGPU where supported, and worker-based processing where appropriate.
- Supabase for authentication, PostgreSQL data, and private image storage if a suitable project is available and explicitly authorized.
- A secure server-side API for AI-provider requests.
- OpenRouter for configurable AI models.

Do not assume an existing Supabase project belongs to this application. Never reuse or modify another product's database without authorization. If a dedicated backend is not available, implement a clean integration boundary and document the minimum configuration needed.

### Responsive and mobile requirements

The interface must adapt to narrow mobile screens, tablets, and large desktop displays.

- No horizontal overflow or clipped essential controls.
- Touch targets should generally be at least 44 × 44 CSS pixels.
- Support touch, mouse, keyboard, and trackpad interactions where appropriate.
- Support safe-area insets on iPhones with notches and home indicators.
- Avoid relying on hover to expose essential actions.
- Use appropriate responsive layouts, menus, dialogs, sliders, and image previews.
- On mobile, use a compact editor with collapsible tools and an accessible bottom toolbar where appropriate.
- On desktop, use a professional editing workspace with a large canvas, side panels, and keyboard shortcuts.
- Respect reduced-motion preferences and accessible contrast.
- Handle device rotation, viewport changes, and browser zoom.
- Detect device capabilities and choose a suitable image-processing path.
- Handle low memory, interrupted tabs, large images, and limited mobile GPU support gracefully.

### PWA requirements

Implement:

- A valid web app manifest.
- Appropriate application icons and theme colors.
- HTTPS-ready deployment configuration.
- A service worker using a suitable PWA strategy.
- Install instructions for supported browsers.
- An offline-capable application shell and access to appropriate previously cached resources.
- Clear offline and reconnection states.
- Safe update behavior for new application versions.

Do not cache private photographs in public or shared caches. Explain that AI generation and cloud-saved projects require a connection. Do not claim identical installation or background-processing capabilities across all platforms.

## 3. Build the complete photo editor

Users must be able to upload, edit, preview, compare, save, and export actual photographs.

### Image import

Support common formats including JPEG, PNG, and WebP. Support HEIC/HEIF when technically feasible through a verified browser-compatible decoder or a secure conversion service.

Include:

- File picker.
- Mobile photo-library selection.
- Drag and drop on supported desktops.
- Multiple-image selection.
- Upload progress.
- File validation and understandable errors.
- Image dimension and file-size checks.
- Correct image orientation.
- High-resolution image handling.
- A clear original-image preservation workflow.

Do not silently reduce final export quality. Use preview resolutions where necessary for performance, but export from the highest-quality available source.

### Editing controls

Implement functional controls for:

- Exposure and brightness.
- Contrast and gamma.
- Highlights and shadows.
- Whites and blacks.
- Temperature and tint.
- Saturation and vibrance.
- Hue and color balance.
- Curves or an equivalent advanced color tool.
- Sharpness and clarity.
- Grain and film fade.
- Vignette.
- Bloom and glow.
- Dehaze.
- Blur and depth-of-field effects where feasible.
- Filter intensity.
- Crop, rotate, straighten, and flip.
- Aspect ratios for original, square, portrait, landscape, and social-media formats.
- Before-and-after comparison.
- Undo, redo, reset, and restoration of the original.

Sliders and buttons must actually change the image. Do not implement decorative controls.

Use a non-destructive editing model: store the original separately and represent ordinary edits as a recipe or adjustment stack that can be modified and reapplied.

## 4. Build a large, high-quality filter library

Create an expandable library of named presets using composable image-processing recipes rather than requiring a separate AI generation for each filter.

Target at least 250 distinct, meaningfully differentiated presets in the initial release if the engine can support them without padding the library with near-identical options. Prefer fewer high-quality presets over hundreds of duplicates.

Include categories such as:

- Natural portraits.
- Clean skin tones.
- Warm lifestyle.
- Film photography.
- Vintage and retro.
- Cinematic.
- Moody and dramatic.
- Fashion and editorial.
- Luxury.
- Street photography.
- Travel.
- Landscape.
- Golden hour.
- Night photography.
- Black and white.
- Soft pastel.
- Cool tones.
- Product photography.
- Social-media styles.
- Custom user presets.

Every preset must have a real processing recipe and a useful preview.

Allow users to:

- Search filters.
- Browse categories.
- Favorite presets.
- Preview before applying.
- Adjust filter intensity.
- Save their own custom presets.
- Rename, duplicate, and delete their own presets.
- Apply a selected preset to multiple photographs.
- Reapply a saved preset later.
- Compare the original against the edited result.

Avoid destructive image transformations during ordinary filter application.

## 5. Preserve faces and personal identity

Facial preservation is a core product requirement.

Implement a default-on identity-preservation strategy for ordinary editing.

- Standard color filters must not regenerate the person's face.
- Do not replace facial features with a synthetic face.
- Preserve facial proportions, eye shape, nose, mouth, skin tone, hairline, and recognizable identity as closely as possible.
- Avoid excessive smoothing, artificial skin texture, and unnatural eye enhancement.
- Provide a natural-skin option and an adjustable retouching intensity.
- Use face-aware masks or segmentation when supported.
- Keep color grading natural across the face, neck, and body.
- Provide a zoomed comparison tool for checking face details.
- Provide a clear restore-original option.

Use deterministic image processing whenever possible for ordinary color edits.

When a generative AI operation could alter identity, warn the user, preserve an untouched original, and offer the strongest feasible identity-preservation method. Never guarantee perfect identity preservation when using a generative model.

For scene replacement, prioritize separating the person from the background and generating or editing the background independently. Avoid regenerating the person unless the user explicitly requests a transformation that requires it.

## 6. Build the AI Editing Assistant

Create an AI assistant that understands natural-language photo-editing requests.

Examples:

- "Make this photo look like a professional fashion shoot."
- "Give this picture a warm film-camera look."
- "Make the colors cinematic but keep my face natural."
- "Use a luxury editorial style."
- "Make this image brighter without washing out the skin."
- "Apply the same style to all the pictures I select."

The assistant should translate requests into a validated structured editing recipe, then use the local editing engine for deterministic adjustments wherever possible.

Implement:

- Prompt input.
- Context-aware suggestions.
- Editable proposed settings.
- Preview before committing.
- Apply, cancel, undo, and restore.
- Clear errors when the requested edit is unsupported.
- Safe validation of model-generated settings.
- Limits on the range of numeric adjustments.

Do not let the model execute arbitrary code or return unrestricted commands to the client.

Use AI for interpretation and generation, not for work that a local filter can perform accurately and cheaply.

## 7. Build the AI Scene Placement Studio

This is a major feature, not an optional mockup.

Allow users to upload a photograph and tell the AI to place the subject into a requested city, street, neighborhood, landmark-inspired environment, or type of setting.

Example prompts:

- "Put me on a stylish street in Manhattan with brownstone buildings and natural afternoon light."
- "Place me outside a Parisian café on a cloudy morning."
- "Make this look like a luxury rooftop in Dubai at sunset."
- "Place me on a modern Tokyo street at night with realistic neon lighting."
- "Place me on a tropical beach with natural sunlight."
- "Use an upscale city street with luxury storefronts and realistic perspective."

### Scene workflow

1. Analyze the uploaded image's subject, pose, lighting, camera angle, and foreground/background.
2. Allow the user to describe the destination and scene.
3. Offer scene controls such as time of day, weather, atmosphere, background blur, realism, and lighting.
4. Use a configurable image-generation or image-editing model available through OpenRouter, after verifying its current API capabilities.
5. Preserve the source image and use segmentation, masks, or background replacement to protect the original person wherever possible.
6. Match perspective, scale, shadows, ambient light, color temperature, and depth of field.
7. Display generated alternatives when supported.
8. Let users choose, regenerate, refine, undo, or restore.
9. Save successful scene recipes and settings.
10. Export the final result at the highest quality the selected pipeline supports.

Allow follow-up instructions such as:

- "Move the background farther away."
- "Make the lighting warmer."
- "Reduce the background blur."
- "Make it look less artificial."
- "Keep my face and clothes unchanged."
- "Make the street less crowded."

### Real places versus inspired scenes

Offer two distinct modes:

**Place-inspired:** Creates a scene inspired by a city or location, without promising geographic accuracy.

**Specific-place reference:** When the user asks for an actual landmark or street, use suitable verified reference imagery or available location data where permitted. If exact accuracy cannot be established, clearly label the result as an approximation.

Do not falsely represent a generated image
