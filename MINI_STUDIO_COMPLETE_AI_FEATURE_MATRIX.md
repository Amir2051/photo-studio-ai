# Mini Studio — Complete AI Feature Matrix

**Date:** 2026-11-20 · **Evidence labels:** VERIFIED / PARTIALLY VERIFIED / UNVERIFIED / BLOCKED / NOT IMPLEMENTED

## Provider/model inventory (verified evidence only)
| Provider / model | Identifier | Capability (verified) | Pricing evidence | Credential | Connection |
|---|---|---|---|---|---|
| OpenRouter / Mistral Nemo | `mistralai/mistral-nemo` | Text chat only; exact prompt test; 6 strict-ZDR endpoint slugs from public registry | io.net row: $0.01656/M input, $0.0216/M output (OpenRouter model page, 2026-11-19) | Supplied path absent; env key empty | BLOCKED (no credential) |
| Local/offline guidance | `OfflineProvider` / `local-guidance` | Honest local text guidance; no generation | None | None | VERIFIED (works offline) |
| Supabase AI adapter | `supabaseAiProvider` → server gateway | Token-backed chat adapter; image endpoints 501 | Not applicable | Supabase session token | PARTIALLY VERIFIED (adapter only) |
| MIA proxy upstream | `RZ_AGENT_URL` (default `https://rz-ai.safenestt.com`) | Chat + vision status/analysis proxy; separate service | Not verified | `STUDIO_MIA_SERVICE_API_KEY` | BLOCKED BY CREDENTIALS |
| Gemini video intelligence | planned identity only | No adapter, no model | None | None | NOT IMPLEMENTED |
| Advanced analysis | planned identity only | No provider/model selected | None | None | NOT IMPLEMENTED |

## Feature matrix
| AI feature | Backend | Frontend | Provider | Tests | Status |
|---|---|---|---|---|---|
| Central AI gateway (policy, consent, budget, ledger) | `server/ai/central-gateway.mjs`, `execute.mjs`, `consent.mjs`, `budget.mjs`, `ledger.mjs` | n/a | provider-neutral | m2b1/m2b2/m2b5/m2b4 tests | VERIFIED (mocked, offline) |
| Strict ZDR request construction | `openrouter.mjs` builds `{zdr:true,data_collection:'deny',allow_fallbacks:false,require_parameters:true}` | n/a | OpenRouter documented | m2b5 test 1 | VERIFIED (constructed payload) |
| Endpoint-level ZDR eligibility | Public registry evidence only | n/a | 6 exact slugs, safety_retention:false | registry GET (no inference) | VERIFIED (public registry); provider behavior UNVERIFIED |
| Account-level ZDR Only | Owner-confirmed setting | n/a | OpenRouter | none | PARTIALLY VERIFIED (owner statement) |
| Single-use local authorization | `single-use-auth.mjs` (approval, monotonic expiry, isolated grants, atomic consumption) | n/a | local only | 20 + 16 tests | VERIFIED (offline) |
| Cost estimation / ceiling | `pricing.mjs` verified prices, token estimates, $0.001 ceiling | n/a | OpenRouter catalog | 16 remediation tests | VERIFIED (estimate only; actual billing UNVERIFIED) |
| Text chat / editing suggestions via MIA | Routing + proposal engine complete; live model blocked | `MiaControlCenter` non-live + existing AI Review | OpenRouter Mistral | m2b3 UI tests | PARTIALLY VERIFIED (non-live) |
| Editing proposals apply to project | `agent/proposals.ts`, tools, preview | AI Review panel | local model | agent tests (vendor 350) | VERIFIED (local operations) |
| Automatic transcription / captions | Gateway image/text only; no transcription route | Caption import UI (SRT/VTT) | none configured | caption tests | NOT IMPLEMENTED (AI transcription) |
| Scene/shot detection | No backend | No UI | none | none | NOT IMPLEMENTED |
| AI title/description generation | Possible via text chat if live enabled | No dedicated UI | none live | none | BLOCKED BY CREDENTIALS |
| AI image generation | `aiService.generateScene()` requires server provider; gateway `/api/ai/scene` returns 501 | `StyleAssistantPanel` shows OFFLINE | none | aiService tests assert no fabrication | BLOCKED BY PROVIDER CAPABILITY / NOT IMPLEMENTED |
| Cloud image editing (segment/retouch/cull) | `aiService` methods fail closed; gateway endpoints 501 | No connected UI | none | aiService tests | NOT IMPLEMENTED |
| Local background removal / retouching | MediaPipe + `portraitRetouch.ts` (local, real) | `BackgroundPanel`, `RetouchPanel` | on-device models | existing tests | VERIFIED (local, not cloud AI) |
| Object removal / generative fill / upscaling | No backend or provider | No UI | none | none | NOT IMPLEMENTED |
| MIA proxy (chat/vision) | `server/mia-proxy.mjs` with JWT + service key | MIA UI consumes local routes | RZ agent service | mia-proxy tests | PARTIALLY VERIFIED (credentials needed for live) |
| Usage ledger / audit | In-memory metadata only | Diagnostics readout | n/a | m2b2 tests | VERIFIED (non-durable) |
| Durable consent / ledger | None | None | n/a | none | NOT IMPLEMENTED |
| Retries / fallbacks | Explicitly absent | n/a | n/a | authorization tests | VERIFIED (disabled) |

## Key conclusion
The AI **foundation, security controls, routing, and local proposal workflow are real and tested**. Provider-backed text execution is fully prepared but blocked by missing credentials and no authorized live test. Image generation/editing AI is **not implemented** — the existing code intentionally fails closed rather than fabricating results. Adding fake buttons for these capabilities would violate the product requirement.
