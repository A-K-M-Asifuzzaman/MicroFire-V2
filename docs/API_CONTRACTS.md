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

All application errors follow ApiErrorSchema. POST accepts application/json, limits streamed body size to 32 KiB, and applies a process-wide 30 request/minute budget. HTTP 429 includes `Retry-After` in whole seconds and `retryable: true`; wait that delay rather than repeatedly resubmitting. It is an abuse foundation, not distributed per-user protection. No visitor identity or proxy IP is collected. Unknown API paths, including names such as `constructor`, return JSON 404; unsupported HTTP methods use framework 405 responses (not the JSON envelope).

## Claude consumption rules (acceptance review)

- Parse successful responses with the endpoint's exported response schema, and application error bodies with ApiErrorSchema. Branch on HTTP status first. 501 means the feature is unimplemented; it is not an abstaining AI answer. Requests may receive framework/proxy errors outside the JSON contract, so handle a failed JSON parse gracefully.
- GET list `total` counts matching records in the current bundled dataset before pagination. It is not the number of NASA experiments worldwide. Current coverage is exactly one fixture (`p0-bass-b20-v1`); record limitations and Preview labels must remain visible even if a list/API call succeeds. An empty filtered page does not establish absence of evidence globally.
- Stable IDs are lowercase/hyphenated. Use `bass2-b20`, not legacy `bass2-B20`. PDF `page` is one-based physical PDF position; `printedPage` is the report's printed label, not an alternate URL page number.
- Numeric query targets use vol% oxygen, absolute kPa pressure and cm/s airflow; no fraction or atm conversion is implied. P0 B20 oxygen is calibrated initial oxygen; flowCmS is the first logged airflow, not constant airflow. A later source with different oxygen basis must disclose it explicitly. Target categorical strings have no ontology/tolerance/ranking formula yet; P1 must agree those semantics before implementing science matching.
- Times are UTC ISO strings accepted by the schemas; use `new Date().toISOString()`. Persisted save version and datasetVersion are separate compatibility checks. A TypeScript cast alone is not validation.
- Schema array limits are ceilings, not promises about payload size. A valid-shape Passport can still exceed the 32 KiB HTTP limit or 500,000-character save limit. Preserve the user's data and surface the error; do not silently drop entries.

```ts
import { ApiErrorSchema, ExperimentsResponseSchema } from '@microfire/shared';

const response = await fetch('/api/experiments?limit=20');
const payload: unknown = await response.json(); // Catch transport/non-JSON errors in the UI.
if (response.ok) {
  const { data } = ExperimentsResponseSchema.parse(payload); // Inferred result type.
  // Render data.items with their limitations and current feature status.
} else {
  const { error } = ApiErrorSchema.parse(payload);
  // Show error.message; a retry requires error.retryable and any Retry-After delay.
}
```

## Science contracts

`CatalogSchema` validates unique source/experiment/claim IDs and resolves every field/claim citation to a declared source. `SourceSchema` includes canonical/document URLs, document ID, access and verification dates, primary-PDF SHA-256 and explicit reuse scope. URL validation permits credential-free HTTPS; it is not permission to fetch arbitrary URLs.

Conditions require a known value, unit where numeric, recorded/series/derived basis, locator and explanatory note, OR `status: unknown`, `value: null`, reason. Never fill unknowns with zero. `flowCmS` in the current fixture is the initial recorded flow, not a constant run condition; `rawFlow` preserves the sequence and potentiometer notation. Measurement uncertainty remains unextracted and is disclosed in limitations.

Claims distinguish observed, derived, interpretation, hypothesis, unknown and research/tutorial/fiction origin. Evidence levels direct/analogous/mechanistic/gap concern applicability to a question, not confidence probabilities. Observed claims cannot originate in fictional scenarios. Every evidence-bearing claim requires citations and limitations. Relevance score is explicitly retrieval relevance, not fire risk.

## Game and rendering contracts

`GameActionSchema` defines ten typed action variants across five distinct missions. `missionDefinitions` defines the order, prerequisites, mechanic and expected artifact. `PartIdSchema` freezes ten semantic part IDs, **not scientifically verified dimensions/anchors**. P2 must source apparatus geometry before qualifying an assembly.

`transition(state, action, knownExperimentIds, at)` currently implements idempotent evidence inspection only. Starting unbuilt missions returns UNAVAILABLE; other recognized actions return NOT_IMPLEMENTED. Failure returns the original state. No view may award completion or mint proof by bypassing the reducer. This is a contract foundation, not the P2 game reducer.

`GameStateSchema` v1 includes dataset version, mode, guidance, active/completed missions, inspected evidence, setup revision and passport. Completion must be a contiguous mission prefix with current passport entries; stale setup qualifications/current entries are invalid. `PassportEntrySchema` records mission, experiments, claims, citations, observation type, evidence level, learner conclusion, correction history, limitations, setup revision and scenario origin. V1's fictional lunar mission cannot award direct lunar evidence. Future genuine lunar evidence requires reviewed scenario/contract evolution rather than relaxing the label silently.

`observationType` is the epistemic kind of the supporting catalog claim(s), not the player's opinion about them. All claimIds in one entry must share that kind; validation now rejects a mismatch. Use separate entries for distinct kinds. `conclusion` and correction prose remain unverified learner notes; `scenario` identifies the mission context, while research origin belongs to the cited catalog claim. An entry may cite a research observation within the fictional lunar scenario, but cannot label it direct lunar evidence. Evidence applicability, entailment of free text, and actual mission completion are still outside this structural/lineage validator.

`createGameState`, `loadProgress`, `saveProgress` take explicit dependencies; no browser/Three.js import. Pass localStorage through the SaveStorage interface. Normal/demo use separate keys. One atomic setItem writes a whole snapshot. Corrupt, unsupported-version or dataset-mismatched saves remain untouched; caller must offer export/review/reset instead of silently overwriting. V1 is the first format; no fictitious legacy migration is claimed. A future version must ship a pure tested migration. Multi-tab conflict resolution and server sync are deferred. Client data is editable and not an anti-cheat authority.

`saveProgress` returns storage-unavailable for either read or write failure, invalid-state for invalid/oversized input, and existing-save-needs-review for corrupt/unsupported/mismatched existing data. A storage access failure must not prompt deletion or a fake successful save. `transition` expects a validated state and throws on invalid state/timestamp; action failures use TransitionResult. Handle load/parse errors before dispatch. Existing v1 state supports inspection only; P2 assembly placements, predictions and full decision history will require an explicitly versioned, reviewed state extension/migration before implementation.

Claude should consume typed actions/results identically in 3D and keyboard/2D views. Research must render without WebGL/AI. Do not add Three.js until P2 needs it; missing GLB must never block the future 2D interaction path.
