# M2B — Temporary Single-Use Authorization Implementation Report

**Date:** 2026-11-20 · **Branch:** `feature/pro-editor-professional-suite` · **HEAD:** `1ecce92a04683b3dc6785b37eb36b1aeae022ede`

**IMPLEMENTATION OF TEMPORARY AUTHORIZATION DOES NOT AUTHORIZE A PROVIDER REQUEST.**

## 1. Initial repository state
- Root `C:\Users\yayam\OneDrive\Documents\Default Project\photo-studio-ai`; branch/HEAD as above; remote/upstream matches.
- Initial: staged 0, modified tracked 14, untracked 87; `git diff --stat` showed 14 files / 208 insertions / 79 deletions; staged diff empty.
- Frozen tag `video-studio-trial-ready-2026-11-19` → `cdb1238e5b1f82cd94bcc39fad09f47a5dbefa73`; original branch `feature/pro-editor-rebuild` → `cdb1238e…`; `main` → `2c451768…`. All preserved.

## 2. Existing live-gate behavior
- `server/ai/model-registry.mjs`: `mistralai/mistral-nemo` has `adapterAvailable: true`, `liveExecutionEnabled: false`; two planned models are non-executable.
- `executeMiaTask()` rejects with `live_execution_disabled` before any provider call when the gate is false; M2B-5 made the adapter the only provider boundary.

## 3. Existing provider call path
`local caller / central-gateway.mjs → execute.mjs → provider-registry.mjs → providers/openrouter.mjs::chat() → fetch()`. The only place an outbound provider request can originate is the adapter's `fetch`; the HTTP gateway and the M2B-1 facade both delegate. The adapter is therefore the correct final enforcement boundary.

## 4. Authorization design (implemented)
- New module `server/ai/single-use-auth.mjs`:
  - `issueTestGrant()` creates an **opaque in-memory handle** (its only own key is a `Symbol`; `JSON.stringify(handle) === '{}'`) and stores state in a `WeakMap`. No env/file/storage/log/CLI representation exists.
  - Exact authorized target constants: provider `openrouter`, model `mistralai/mistral-nemo`, endpoint `https://openrouter.ai/api/v1/chat/completions`, max 32 output tokens, max estimated $0.001, exact harmless test prompt, exact strict ZDR policy, purpose `M2B_OPENROUTER_CONTROLLED_TEST`.
  - Default expiry 5 minutes (clamped), checked at **consumption** time.
  - `consumeTestGrant()` performs all checks synchronously (no `await` between validation and marking consumed) — atomic in JS's single-threaded model; marks consumed and clears the active grant.
  - `isGrantCandidate()` is a non-consuming check used only by `execute.mjs` to pass the registry gate; no consumption happens there.
  - `revokeTestGrant()` drops the in-memory grant.
- Adapter enforces at final boundary: `chat()` now requires the grant handle and consumes it **before** key validation or network access; descriptor includes actual model, endpoint, token limit, message fingerprint, ZDR policy fingerprint, source, purpose, PID, cost ceiling, tools/attachments/retry/fallback flags.
- `execute.mjs` / `central-gateway.mjs` thread the grant, source, purpose and cost ceiling through without consuming or weakening the policy. Persistent registry gate is unchanged (`false`).

## 5. Security properties / status
| Property | Status |
|---|---|
| Persistent gate remains false; no `ENABLE_LIVE_AI` switch or env override | VERIFIED |
| Single-use, atomic consumption at final adapter boundary | VERIFIED (offline) |
| Expiry ≤ 5 min, checked at consumption | VERIFIED (offline) |
| Wrong provider/model/endpoint/prompt/token limit/purpose denied | VERIFIED (offline) |
| Replay, second request, and concurrent double consumption denied (at most one succeeds) | VERIFIED (offline) |
| Failed first attempt stays consumed; no retry/fallback | VERIFIED (offline) |
| Browser-origin and background-origin requests denied | VERIFIED (offline) |
| Process restart loses the grant (fresh module instance has no state) | VERIFIED (offline) |
| Handle cannot be serialized/transferred to another process | VERIFIED by design (Symbol-keyed handle); **IMPLEMENTED_NOT_RUNTIME_VERIFIED** cross-process |
| Human identity of the initiator is verified | UNRESOLVED — any local code importing the module can issue a grant; operator trust is a process control, not code-enforced |
| $0.001 local estimated-cost ceiling enforced before transmission | VERIFIED (offline); actual provider billing guarantee UNRESOLVED |
| ZDR policy cannot be weakened; no fallback/retry | VERIFIED (offline + source scan) |

## 6. Files changed
Created: `server/ai/single-use-auth.mjs`, `tests/helpers/one-shot-grant.ts`, `tests/m2b2-temporary-auth.test.ts`, this report.
Modified: `server/ai/providers/openrouter.mjs`, `server/ai/execute.mjs`, `server/ai/central-gateway.mjs`, `tests/m2b1-foundation.test.ts`, `tests/m2b5-gateway.test.ts` (tests updated to supply the exact authorized request shape; no assertions weakened).

## 7–8. Tests added and actually executed
- Added 20 offline tests in `tests/m2b2-temporary-auth.test.ts` covering all 20 required cases.
- Executed: `npx vitest run tests/m2b2-temporary-auth.test.ts` → 20 passed; `npx vitest run tests` → **24 files / 172 tests passed**; `npm run typecheck` → exit 0.
No live test was executed.

## 9. Network-call prevention evidence
All authorization tests inject mocked transports (`mockTransport()`), and denial tests assert the mock was never called; the one success test asserts exactly one mock call with the strict provider object. No test uses a real network client. No provider request was transmitted.

## 10–11. Credential path / access
- Initially observed: supplied path `C:\Users\yayam\Documents\openrouter.env.txt` appeared present (True).
- Final repeated checks: `False` / `False`; directory listing count 0. Status: **UNRESOLVED** (transient or removed).
- Credential contents accessed: **NO**. No credential loaded, copied, printed, or added to Git.

## 12–13. No provider request / gate remains disabled
**No provider request was transmitted.** Provider request count: **0**. Persistent live gate remains `false` in `server/ai/model-registry.mjs` (verified after implementation).

## 14. Remaining risks / limitations
- Human authorization cannot be enforced in code; the mechanism relies on operator-controlled access to local code.
- The $0.001 cap is a local estimate guard, not a provider billing guarantee; actual cost can only be known from a provider response.
- Endpoint-level `data_collection:"deny"` filtering and live ZDR behavior remain unproven without an authorized live request.
- The credential file path is currently inconsistent; must be resolved before any future test.
- This implementation does not authorize a test; a separate owner instruction is required.

## 15. Final Git state
Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92…`; staged 0; modified tracked 14; untracked 91 (initial 87 + new module, helper, new test, this report); frozen tag/original branch/`main` unchanged. No production, database, environment, credential, or deployment changes; no commit/push.

**Status labels: implementation VERIFIED for offline properties; cross-process transfer and human-initiator identity IMPLEMENTED_NOT_RUNTIME_VERIFIED; credential path UNRESOLVED; no live test BLOCKED by explicit scope.**

**Stopping — no provider request initiated or scheduled.**
