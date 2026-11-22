# M2a — Integration Plan (written before code changes)

**Branch:** `feature/pro-editor-professional-suite` @ `1ecce92a…` · **Date:** 2026-11-19

## Smallest safe integration points

### Target A — video project open/save (non-authoritative compatibility checkpoint)
- `vendor/braincut/src/lib/suite/adapters/braincut.ts`: add `checkLegacyCompatibility(text)` — wraps a native `.braincut` v1 file with `legacyBraincutToSuiteDocument`, unwraps with `suiteDocumentToProject`, and compares its canonical `serializeProject` output with the native canonical form. Returns `{ ok, documentId, documentName, mediaCount, reason }`; catches adapter failures instead of throwing.
- `vendor/braincut/src/lib/editor/project-actions.ts`:
  - `openFromFile()`: read text once, keep existing `parseProject(text)` as the sole authoritative parse, then run the checkpoint and surface a **warning toast only** if it reports a mismatch. The project that is opened is always the original parsed object — no replacement, no rewrite, no migration.
  - `write()`: keep `serializeProject(p)` as the bytes written; run the same checkpoint before writing and warn on mismatch without altering the saved text.
- Strategy: the Suite adapter is a read-only verifier. It never becomes a second source of truth; existing save/open/picker/download behavior and error handling stay untouched.

### Target B — one media-panel operation (duplicate reference reporting)
- `vendor/braincut/src/lib/suite/media.ts`: add `identityKeyOf(item)` and `duplicateMediaGroups<T>(items)` that accept the shape already present on `MediaItem` (`name`, optional `fileName`, `fileSize`, `lastModified`). Refactor the existing `duplicateGroups(refs)` to delegate to it, preserving its API.
- `vendor/braincut/src/lib/ui/ProjectPanel.svelte`: derive duplicate groups from the existing `$project.media` list and show a compact, read-only warning bar (reusing the existing `.missing-bar` styling) alongside the current missing-files bar. No new registry, no file moves, no changes to import/relink/remove behavior.

### Undo/redo boundary
No change. The editor uses immer patch history (`project/history.ts`, 200 entries); the suite uses whole-snapshot `createHistory<T>()`. Bridging them would change edit granularity and risk the trial workflow. `createHistory` remains available for future non-project surfaces; the boundary is documented in the integration decisions report.

## Compatibility strategy
- No `.braincut` format change, no version bump, no storage key change, no new dependency.
- Native parser/serializer remain authoritative; the Suite document is derived and discarded.
- Every new behavior is additive and failure-tolerant: checkpoint warnings never block opening or saving a legacy project.
- Focused tests: legacy open/save checkpoint (including unknown extra fields and malformed input), duplicate identity with legacy-shaped media, and full regression suites.

## Files expected to change
`vendor/braincut/src/lib/suite/adapters/braincut.ts`, `vendor/braincut/src/lib/suite/adapters/braincut.test.ts`, `vendor/braincut/src/lib/suite/media.ts`, `vendor/braincut/src/lib/suite/media.test.ts`, `vendor/braincut/src/lib/editor/project-actions.ts`, `vendor/braincut/src/lib/ui/ProjectPanel.svelte`, plus the four M2a reports. No generated bundle files will be staged.
