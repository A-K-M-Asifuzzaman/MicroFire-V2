# External integration requirements — zero calls to paid services

Current Phase One backend uses a deterministic catalog template (`p1-grounded-template-v2`) with no provider adapters or network ingestion in runtime. A paid/model provider has not been selected, enabled or tested. The original Phase Zero discovery requirements below remain prerequisites for any future adapter, including provider failure/timeout testing, provenance, rights, shared rate protection and explicit spending approval.

Phase Zero implements **no external provider adapters**. Runtime uses the bundled source fixture. Public GitHub reference reads and one public NASA PDF download were the only data acquisition. No account login, billing/balance inspection, LLM call or Meshy generation was made.

| Integration | Authority / endpoint | Requirements before implementation |
|---|---|---|
| NASA NTRS | https://ntrs.nasa.gov/citations/20210011385 ; source PDF URL in catalog | Public citation and PDF verified. Preserve document ID, hash, exact page. Generic `/api/` URL returned 404: do not assume it is an API specification. Discover supported search API, limits and terms before ingestion automation. |
| NASA PSI | NASA Physical Sciences Informatics, official NASA portal | Portal request could not be verified in this session. Confirm actual holdings, login/access terms, dataset IDs, download format and rate policy. NASA_API_KEY does not establish PSI permission. No guessed adapter. |
| NASA Images | https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf | Official docs inspected: images-api.nasa.gov `/search`, `/asset/{nasa_id}`, `/metadata/{nasa_id}`, `/captions/{nasa_id}`. Validate JSON and asset rights/attribution; footage is evidence only when experiment identity is verified. No download/reuse authorized by metadata alone. |
| Crossref | https://www.crossref.org/documentation/retrieve-metadata/rest-api/ | Public scholarly metadata; implement DOI validation and polite identification/rate handling. Metadata is not a measurement source. No paid Metadata Plus integration planned. |
| NASA ADS | https://ui.adsabs.harvard.edu/help/api/ | Server-only NASA_ADS_TOKEN and explicit account scope; official page available but detailed endpoint/rate documentation not captured. Verify before implementing. Metadata only. |
| Semantic Scholar | https://www.semanticscholar.org/product/api | Official page retrieval failed in this session. Verify Graph API docs, key entitlement, fields, quotas and terms before use. Optional server-only SEMANTIC_SCHOLAR_API_KEY. |
| LLM synthesis | Selected provider's official documentation, to be reviewed in P1 | Server-only key, owner-authorized usage/cost budget, pinned supported model, bounded tokens/time/retries, schema-valid claims/citations, injection-resistant retrieval, deterministic no-key fallback and evaluated abstention. No model or paid call selected in P0. |
| Meshy | https://docs.meshy.ai/en/api/balance ; https://docs.meshy.ai/en/api/pricing | Official pages inspected. Read-only balance endpoint is not proof of subscription/API billing source. Owner handles secure key outside web app. Account balance, entitlement and per-job approved cost remain unverified. No generation endpoint exposed. Manual owner GLB export remains a future option. |
| Hosting / optional sync DB | Future owner-approved provider | No deploy, authentication, database, analytics or server sync configured. Review region, retention, costs, secrets and rollback before adoption. |

Every future adapter must define: allowlisted hosts and redirect/IP checks; validated request/response DTOs; supported auth scope; no secret logging; timeout and response-size limits; bounded retries with 429/Retry-After handling; provenance timestamps and ETag/hash; immutable cache and stale/offline behavior; attribution/rights; deterministic failure tests. Retrieved content is untrusted data, never executable instructions. Do not send visitor/child identity or private data to providers.

No FIRMS/weather integration: those do not supply the required microgravity combustion measurements. Asset generation stays physically separate from research runtime. A distributed limiter and real cost ceilings must exist before any paid runtime API is enabled.

## 2026-11-12 candidate acquisition update

The isolated completion branch adds explicit, hash-pinned, bounded NASA-only source acquisition via scripts/fetch-candidate-sources.ts and offline verification via scripts/verify-candidates.ts. Four primary PDFs were downloaded and visually inspected; no runtime provider or automated admission is enabled. The NTRS citation JSON for ACME supplied the actual poster link. PSI-98 was located but exposed no readable dataset files to the browsing tool; access/API/holdings were not inferred. See codex-completion/09_DATA_VERIFICATION.md. Paid/model/Meshy calls remain absent from this backend assignment.
