# 08 — CODEX: SCIENCE INGESTION, EVIDENCE ENGINE AND VERIFIED API ADAPTERS

## Primary source chain
NASA Physical Sciences Informatics portal PSI (verify actual access; `api.nasa.gov` key is NOT PSI access), NASA NTRS technical reports (cite unique ID, version/page), trusted official experiment/media archives, scholarly metadata providers Crossref, NASA ADS and Semantic Scholar (metadata != NASA experimental measurements), NASA Images Library (asset license & attribution). Before writing any adapter, check official current endpoint, auth, response format, terms, rate limits and sample response. Scraping only if lawful and necessary with rate limits and source attribution. Cache and gracefully degrade to verified bundled source snapshot.

## Data model and ingest gates
Original NASA source -> `Source` with URL/citation/page/permissions/retrieval timestamp/section -> human-reviewed observation -> normalized `ExperimentRecord` + missingness table + raw citation -> claim graph. Record study platform BASS-II/Saffire/LUCI/FLEX as appropriate; avoid combining geometry, mass, airflow regimes and variable semantics uncritically. Report dataset *actual counts* computed from imported catalog. Never invent 1,284 experiments, charts or temperatures from design comps.

## Evidence engine
- Hybrid lexical/BM25 + embeddings optionally if benchmark supports improved retrieval; deterministic domain scoring for gravity, oxygen, pressure, flow, material, geometry, outcome and source completeness. Display weight/version and same-conditions mismatch.
- Give distinct `direct`, `analogous`, `mechanistic`, `gap` evidence labels. Missing = unknown. Evidence relevance score is NOT probability of fire risk or chance source is scientifically true.
- RAG prompt injection defense: retrieved source text is untrusted content. Answer only with cited sources, cite exact claim source/page, maintain scientific qualifiers, run claim verifier and abstain when outside known conditions; do not echo instruction payloads from PDFs.
- Explain gaps explicitly: `not found in our catalog` != `never studied globally`. Reproducible ranking for same user question and dataset version.
- Factual evidence and *hypothetical* Earth/lunar application never conflated; only claim mission safety if formally backed (normally don't).

## Evaluation
Build gold test cases across BASS-II, Saffire and LUCI where verified: source lookup and exact numeric condition retrieval, cross-study mismatch classification, answer faithfulness, citation support, abstention on unsupported lunar-atmosphere risk, adversarial prompt injection, malformed APIs, key missing, timeout/rate limit, stale/offline snapshot. Report recall@k/MRR if labels exist, support precision manually reviewed sample with N and CI where feasible, latency distribution on stated hardware. Save `docs/evals/report.md` generated from actual runs.

## Security and privacy
Read secrets only on server: `OPENAI_API_KEY`, `NASA_API_KEY`, `NASA_ADS_TOKEN`, `NASA_FIRMS_MAP_KEY` if service ever needed, `MESHY_API_KEY` only in local asset producer; do not commit `.env.local` or keys in docs; rotate previously exposed credentials. Avoid sending NASA login or visitor data to LLM unless explicit consent. Rate-limit, request validation, non-sensitive logs and safe fallback. AIR GAP: Meshy is independent of research APIs.
