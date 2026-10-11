# API and shared contract v1

Source of truth: `packages/shared/src/{science,api,features,game}.ts`, exported through `@microfire/shared`. Runtime parse inputs, not merely TypeScript casts. HTTP paths are stable; every JSON response includes `apiVersion: "1"`. Breaking changes require a new version, migration design, examples/tests and coordinated Claude/Codex review. Unknown object fields are rejected.

## Implemented endpoints

| Method/path | Input | Success schema | Errors |
|---|---|---|---|
| GET `/api/health` | none | HealthResponseSchema | 500 |
| GET `/api/feature-status` | none | FeaturesResponseSchema | 500 |
| GET `/api/sources` | none | SourcesResponseSchema | 500 |
| GET `/api/experiments` | ExperimentQuerySchema: optional exact program; limit 1–100, default 20; offset 0–100000 | ExperimentsResponseSchema | 400, 500 |
| GET `/api/experiments/:id` | lowercase canonical IdSchema | ExperimentResponseSchema | 400, 404, 500 |
| POST `/api/passport/validate` | PassportSchema | PassportValidationResponseSchema | 400, 413, 415, 429, 500 |

Catalog list responses include items, total, limit, offset, datasetVersion. Unknown and duplicate query parameters on the list endpoint are rejected. All responses use no-store initially. Dataset IDs and file hashes provide reproducibility; conditional caching can be added in P1 without changing semantics.

```json
{"apiVersion":"1","data":{"status":"ok","phase":"zero","datasetVersion":"p0-bass-b20-v1"}}
```

Passport validation checks schema plus exact experiment → claim → source/locator lineage. It **does not** assess free-text conclusions, verify that a player completed a mission, issue achievements or certify safety. Empty passports validate structurally. Its response is deliberately explicit:

```json
{"apiVersion":"1","data":{"valid":true,"scope":"structure-and-citation-lineage-only","certification":false}}
```

## Reserved and validated, not implemented

| Method/path | Request | Future success schema | Current response |
|---|---|---|---|
| POST `/api/evidence/rank` | RankRequestSchema | RankResponseSchema | 501 |
| POST `/api/evidence/compare` | CompareRequestSchema: 2–4 distinct experiment IDs | CompareResponseSchema | 501 |
| POST `/api/ask` | AskRequestSchema | AskResponseSchema | 501 |

Valid example Ask request:

```json
{"question":"What does this record establish about airflow?","targetConditions":{"material":"PMMA"}}
```

Actual P0 response:

```json
{"apiVersion":"1","error":{"code":"NOT_IMPLEMENTED","message":"This Phase One service is not implemented. No provider was called.","retryable":false}}
```

All errors follow ApiErrorSchema. POST accepts application/json, limits streamed body size to 32 KiB, and applies a process-wide 30 request/minute budget. It is an abuse foundation, not distributed per-user protection. No visitor identity or proxy IP is collected. Unknown API paths return JSON 404; unsupported HTTP methods use framework 405 responses (not the JSON envelope).

## Science contracts

`CatalogSchema` validates unique source/experiment/claim IDs and resolves every field/claim citation to a declared source. `SourceSchema` includes canonical/document URLs, document ID, access and verification dates, primary-PDF SHA-256 and explicit reuse scope. URL validation permits credential-free HTTPS; it is not permission to fetch arbitrary URLs.

Conditions require a known value, unit where numeric, recorded/series/derived basis, locator and explanatory note, OR `status: unknown`, `value: null`, reason. Never fill unknowns with zero. `flowCmS` in the current fixture is the initial recorded flow, not a constant run condition; `rawFlow` preserves the sequence and potentiometer notation. Measurement uncertainty remains unextracted and is disclosed in limitations.

Claims distinguish observed, derived, interpretation, hypothesis, unknown and research/tutorial/fiction origin. Evidence levels direct/analogous/mechanistic/gap concern applicability to a question, not confidence probabilities. Observed claims cannot originate in fictional scenarios. Every evidence-bearing claim requires citations and limitations. Relevance score is explicitly retrieval relevance, not fire risk.

## Game and rendering contracts

`GameActionSchema` defines ten typed action variants across five distinct missions. `missionDefinitions` defines the order, prerequisites, mechanic and expected artifact. `PartIdSchema` freezes ten semantic part IDs, **not scientifically verified dimensions/anchors**. P2 must source apparatus geometry before qualifying an assembly.

`transition(state, action, knownExperimentIds, at)` currently implements idempotent evidence inspection only. Starting unbuilt missions returns UNAVAILABLE; other recognized actions return NOT_IMPLEMENTED. Failure returns the original state. No view may award completion or mint proof by bypassing the reducer. This is a contract foundation, not the P2 game reducer.

`GameStateSchema` v1 includes dataset version, mode, guidance, active/completed missions, inspected evidence, setup revision and passport. Completion must be a contiguous mission prefix with current passport entries; stale setup qualifications/current entries are invalid. `PassportEntrySchema` records mission, experiments, claims, citations, observation type, evidence level, learner conclusion, correction history, limitations, setup revision and scenario origin. V1's fictional lunar mission cannot award direct lunar evidence. Future genuine lunar evidence requires reviewed scenario/contract evolution rather than relaxing the label silently.

`createGameState`, `loadProgress`, `saveProgress` take explicit dependencies; no browser/Three.js import. Pass localStorage through the SaveStorage interface. Normal/demo use separate keys. One atomic setItem writes a whole snapshot. Corrupt, unsupported-version or dataset-mismatched saves remain untouched; caller must offer export/review/reset instead of silently overwriting. V1 is the first format; no fictitious legacy migration is claimed. A future version must ship a pure tested migration. Multi-tab conflict resolution and server sync are deferred. Client data is editable and not an anti-cheat authority.

Claude should consume typed actions/results identically in 3D and keyboard/2D views. Research must render without WebGL/AI. Do not add Three.js until P2 needs it; missing GLB must never block the future 2D interaction path.
