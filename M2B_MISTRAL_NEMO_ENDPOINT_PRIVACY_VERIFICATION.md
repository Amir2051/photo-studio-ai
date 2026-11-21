# Mistral Nemo — Endpoint Privacy Verification (read-only)

**Retrieval date:** 2026-11-19 · **Model:** `mistralai/mistral-nemo` · **Provider gateway:** OpenRouter
**Scope:** public official documentation and public provider listings only. No API/inference call, no credential access, no code/config/Git change.

## 1. Official source URLs
| Source | URL |
|---|---|
| OpenRouter model page / canonical doc | `https://openrouter.ai/mistralai/mistral-nemo` · `https://openrouter.ai/mistralai/mistral-nemo/llms.txt` |
| OpenRouter — Zero Data Retention (includes **Zero Retention Endpoints** table) | `https://openrouter.ai/docs/guides/features/zdr` |
| OpenRouter — Provider logging / retention & training table | `https://openrouter.ai/docs/guides/privacy/provider-logging` |
| OpenRouter — Provider routing (`zdr`, `data_collection`, `allow_fallbacks`, endpoint slug rules) | `https://openrouter.ai/docs/guides/routing/provider-selection` |
| OpenRouter — Data collection / privacy controls | `https://openrouter.ai/docs/guides/privacy/data-collection` |
| OpenRouter — ZDR endpoint listing API reference (documentation only; **not called**) | `https://openrouter.ai/docs/api/api-reference/endpoints/preview-the-impact-of-zdr-on-the-available-endpoints` |

## 2. Method and evidentiary rules applied
- The official **Zero Retention Endpoints** table lists per-model/per-provider endpoints eligible under ZDR, with `Safety Retention` flags. A `No` flag means the endpoint is a pure ZDR endpoint, not merely Safety Retention.
- The official **Provider Logging** table provides provider-level retention and training classifications; this was used only as corroborating evidence for the `data_collection: "deny"` requirement, never as a substitute for endpoint-level ZDR evidence.
- OpenRouter explicitly warns that a provider's general policy can differ from a specific endpoint and that the model page's Data Policy tag is not definitive. Therefore no endpoint is approved on brand-level policy alone.
- Exact endpoint slugs/variants are published through the model detail page's copy control and the authenticated `/api/v1/endpoints/...` listings. Those were **not accessed** (no API calls authorized), so exact slug identifiers are recorded as UNKNOWN.

## 3. Endpoint / provider inventory and verdicts

Public evidence: the model page price list names providers; the ZDR table lists six `Mistral: Mistral Nemo` rows. Pricing is secondary and shown only for identification.

| # | Provider (display name, public docs) | Exact endpoint slug / variant | ZDR classification (official ZDR table) | Data-collection classification (official provider table) | Safety Retention | Implicit caching | Price in/out per 1M (secondary) | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Io Net (`io.net`) | UNKNOWN | ZDR-eligible | Zero retention / does not train | No | Yes | $0.01656 / $0.0216 | **Policy-eligible; exact endpoint UNKNOWN → not approved for an explicit slug allowlist** |
| 2 | DekaLLM | UNKNOWN | ZDR-eligible | Zero retention / does not train | No | No | $0.018 / $0.03 | **Policy-eligible; exact endpoint UNKNOWN → not approved for an explicit slug allowlist** |
| 3 | DeepInfra (row A) | UNKNOWN | ZDR-eligible | Zero retention / does not train | No | No | $0.0232 / $0.024 | **Policy-eligible; exact endpoint UNKNOWN → not approved for an explicit slug allowlist** |
| 4 | DeepInfra (row B) | UNKNOWN | ZDR-eligible | Zero retention / does not train | No | No | $0.029 / $0.03 | **Policy-eligible; exact endpoint UNKNOWN → not approved for an explicit slug allowlist** |
| 5 | Parasail | UNKNOWN | ZDR-eligible | Zero retention / does not train | No | No | $0.03 / $0.03 | **Policy-eligible; exact endpoint UNKNOWN → not approved for an explicit slug allowlist** |
| 6 | Mistral | UNKNOWN | ZDR-eligible | Zero retention / does not train | No | Yes | $0.15 / $0.15 (EU same) | **Policy-eligible; exact endpoint UNKNOWN → not approved for an explicit slug allowlist** |
| 7 | Additional endpoints hinted by “plus 1 more” on io.net and Mistral price rows | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | not published in retrieved excerpt | **UNKNOWN — ineligible** |

**Eligibility conclusion:** six public endpoint rows are *policy-eligible* (ZDR + no-collect, no Safety Retention). None is *independently verified to the exact endpoint slug*, so none qualifies for a hard-coded provider allowlist at this stage. Per the mandatory safeguards, ambiguous endpoint identity is preserved as UNKNOWN and ineligible for explicit targeting.

## 4. Privacy-control implications
- **Mandatory request flags:** `provider.zdr: true` and `provider.data_collection: "deny"` on every MIA request, with `allow_fallbacks: false`. If no endpoint satisfies both, OpenRouter errors — this is the required fail-closed outcome; no automatic relaxation or non-compliant fallback.
- **Safety Retention:** all six Nemo rows show `Safety Retention = No`, so they are true ZDR endpoints, not endpoints that merely never train. This distinction matters because Safety Retention endpoints may retain prompts for abuse prevention and are not strict ZDR.
- **Implicit caching:** io.net and Mistral rows show implicit caching; OpenRouter states in-memory prompt caching is not considered retention and is allowed under ZDR routing. It does not change ZDR status.
- **Scope limits of ZDR (official docs):** ZDR enforcement applies to provider routing for inference only — not to plugins/tools (e.g., web search), not to application-side logs, and not to OpenRouter request metadata (tokens, latency) which is stored. The CSAM-screening exception applies even to ZDR traffic. Do not claim ZDR protects these other paths.
- **No-training alone is insufficient:** the provider table's “does not train” was used only to corroborate `data_collection: deny`; ZDR eligibility was taken only from the endpoint-level ZDR table.

## 5. Capability and pricing limitations
- The model-level doc lists accepted text parameters (`messages`, `max_tokens`, `stream`, `temperature`, `response_format`, `tools`, `tool_choice`, `seed`, etc.). **Per-endpoint `supported_parameters` values are UNKNOWN** without the authenticated endpoint listing; use `require_parameters: true` in any future pilot and verify before submission.
- The model is text-only: no video/audio understanding; it must not serve MIA Video Intelligence or transcription tasks.
- Prices are provider-specific and routing-dependent; the retrieved page was partial (“plus 1 more”), so the price table is not a complete catalog. A weighted average was not published in the retrieved docs. Pricing does not affect privacy eligibility.

## 6. Recommended allowlist (evidence-based)
**No explicit slug allowlist is recommended.** The public evidence supports policy-based selection only: set `zdr: true`, `data_collection: "deny"`, `allow_fallbacks: false`, and optionally `require_parameters: true`. This lets OpenRouter select only among policy-compliant endpoints and fail closed if none is available. If the owner requires a fixed allowlist, exact endpoint slugs must first be obtained from the authenticated model-detail copy control or the documented endpoint listing in a separately authorized M2B-4B preflight; until then, any slug-based allowlist would be fabricated.

## 7. Remaining blockers
1. Exact endpoint slugs/variants for all six policy-eligible rows — UNKNOWN.
2. Per-endpoint `supported_parameters`, `status`, and privacy metadata via the official endpoint listing — UNVERIFIED (would require an authenticated, authorized documentation/API preflight).
3. The two unidentified “plus 1 more” endpoints — UNKNOWN/ineligible.
4. Confirmation that OpenRouter account/guardrail settings permit ZDR-only routing without Safety Retention for the “All other models” group — owner/account setting, UNKNOWN.
5. The two known gateway bypass paths identified in the M2B-4A report remain unresolved; privacy flags are meaningless if requests can bypass the orchestration path.
6. No live request has been made, so no claim is made that any endpoint will actually serve the pilot successfully.

## 8. Execution confirmation
**Provider API/inference calls: 0. Authentication/credential inspection: 0. Source/environment/gateway/database changes: 0. Tests/builds/deployment: 0. Confirmed spend: $0.00 USD; authorized pilot allowance remains $0.05 USD (unchanged).** Only public official documentation pages were read. Branch `feature/pro-editor-professional-suite`, HEAD `1ecce92…`, frozen tag `cdb1238e…`, original branch and `main` remain unchanged.

**Stopping here — no implementation, credential preparation, or pilot request.**
