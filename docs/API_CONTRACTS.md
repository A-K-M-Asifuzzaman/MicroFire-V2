# API and shared contract v1

Source of truth: `packages/shared/src/{science,api,features,game}.ts`, exported through `@microfire/shared`. Runtime parse inputs, not merely TypeScript casts. HTTP paths are stable; every JSON response includes `apiVersion: "1"`. Breaking changes require a new version, migration design, examples/tests and coordinated Claude/Codex review. Unknown object fields are rejected.

## Implemented endpoints (Phase One)

Experiment-list, rank and gaps responses carry `coverage` (validated experiments/sources, quarantined candidate count, and the statement that absence from the catalog is not global absence). Ask carries the same disclosure in answered `limitations`; export carries dataset/hash/disclaimer metadata. Detail and source responses retain their existing DTO shapes: use list coverage alongside them rather than expecting a nonexistent `coverage` field. Render record limitations on every research surface. All JSON is `no-store`; API responses carry `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`. Unexpected backend or limiter failures return a safe JSON 500 envelope; no operation proceeds when its limiter fails.

| Method/path | Input | Success schema | Errors |
|---|---|---|---|
| GET `/api/health` | none | HealthResponseSchema (`phase: "one"`) | 429, 500 |
| GET `/api/feature-status` | none | FeaturesResponseSchema | 429, 500 |
| GET `/api/sources` | none | SourcesResponseSchema | 429, 500 |
| GET `/api/sources/:id` | IdSchema | SourceDetailResponseSchema: source + which experiments/claims/condition fields cite it | 400, 404, 429 |
| GET `/api/experiments` | ExperimentQuerySchema: optional `q` (AND over terms, ≤200 chars), exact case-insensitive `program`, `material`, `flowDirection`; limit 1–100; offset | ExperimentsResponseSchema (+ coverage) | 400, 429 |
| GET `/api/experiments/:id` | IdSchema | ExperimentResponseSchema | 400, 404 (message says when the ID is a quarantined candidate), 429 |
| GET `/api/export?ids=a,b` | ExportQuerySchema: 1–20 comma-separated IDs | ExportResponseSchema: experiments, sources, page links, catalog SHA-256, disclaimer | 400, 404, 429 |
| POST `/api/evidence/rank` | RankRequestSchema | RankResponseSchema (+ coverage) | 400, 413, 415, 429 |
| POST `/api/evidence/compare` | CompareRequestSchema | CompareResponseSchema | 400, 404 for any unvalidated/quarantined ID, 413, 415, 429 |
| POST `/api/gaps` | GapsRequestSchema: ≥1 target condition | GapsResponseSchema | 400, 413, 415, 429 |
| POST `/api/citations/verify` | CitationVerifyRequestSchema: claim or condition subject + citations | CitationVerifyResponseSchema (`scope: citation-lineage-only-not-scientific-truth`) | 400, 413, 415, 429 |
| POST `/api/ask` | AskRequestSchema | AskResponseSchema | 400, 413, 415, 429 |
| POST `/api/passport/validate` | PassportSchema | PassportValidationResponseSchema | 400, 413, 415, 429 |

```json
{"apiVersion":"1","data":{"status":"ok","phase":"one","datasetVersion":"p0-bass-b20-v1"}}
```

Passport validation checks schema plus exact experiment → claim → source/locator lineage. It **does not** assess free-text conclusions, verify that a player completed a mission, issue achievements or certify safety.

### Semantics Claude must preserve

- **Ranking** (`p1-claim-support-v2`): score = 0.7 × (requested target conditions matched) + 0.3 × (question terms found), or terms only when no targets are given. Numeric tolerances are retrieval tolerances (oxygen ±0.5 vol%, pressure ±2 kPa, flow ±1 cm/s), not scientific equivalence. Categorical targets match when every target word appears in the recorded value. Claim support is separate from retrieval score: each item carries `support: {kind, claimId, citations}`, with kind observed/derived/interpretation/unsupported. The deterministic support check accepts only the complete canonical claim text, ignoring case, Unicode normalization, whitespace and terminal question marks/full stops. It does not infer entailment from tokens, synonyms, paraphrases or metadata. Unsupported or unrecognized requested outcomes are `gap`, even when every target matches. Direct requires an exact cited research observation and every supplied target exactly equal to a known, recorded condition (retrieval tolerance is insufficient). With no targets, direct describes the source observation only, not another setting. A supported observation with partial/tolerance-only matches is analogous; a supported derivation is at most analogous; an interpretation is mechanistic; zero requested condition matches is gap. Hypotheses, unknowns, tutorials and unresolved citations cannot support a ranked answer. Render support.kind and the source claim separately from relevance; conservative gap means support was not established by this matcher, not that a study never occurred. Unknown recorded values (B20 gravity, pressure) are `missingFields`, never matches. Items with score 0 are omitted. With one record, every item carries the limitation that cross-study ordering is not yet meaningful.
- **Compare** never returns `controlled` in Phase One: the schema does not capture flow restrictor, sample number or procedure, which the B16/B19 review shows can differ silently. Expect `insufficient-data` (any unknown field) or `confounded`. With one validated record, every valid request returns 404 with the catalog size. Show that, not an empty comparison table.
- **Gaps** statuses: `covered` (a record matches within tolerance; question not necessarily answered), `conditions-differ`, `not-recorded` (field unknown in the records), `not-in-catalog`.
- **Ask** (`p1-grounded-template-v2`) is deterministic and calls no model or provider. Answers are a list of `statements`, each with a `category` (`direct-observation`, `supported-derivation`, `scientific-interpretation`, `analogous-or-mechanistic`, `unknown-or-gap`), nullable `claimId`, and citations. Every non-gap statement is citation-verified against the catalog before release; claim-backed categories must match the catalog kind, and only research-origin claims can become scientific evidence categories. Render statements grouped by category; `answer` is a plain-text fallback. Abstentions carry `code`: `unsupported-intent` (safety/certification, lunar/Mars application, probability/forecast, operational advice, prompt injection, or an explanation exceeding the bounded response size), `no-relevant-evidence`, `quarantined-record`, `citation-verification-failed`. An abstention is a successful 200 response, not an error. Unknown B/F/GMT test references, including longer numbers, abstain even if other question words overlap B20. A named source can still be described when target conditions differ, but zero matches produce an explicit applicability gap: a direct-observation category describes the source run, not a match to the requested scenario.
- **Rate limits**: per-process fixed windows, 300 GET and 30 POST per minute (`RateLimiter` interface in `apps/web/lib/api.ts`). 429 carries `Retry-After`. This is not distributed or per-user.

Long categorical targets are matched in full. Their displayed excerpts in rank/gap explanations are capped at 200 characters and explicitly labelled truncated; this does not change matching. Ask deduplicates test references case-insensitively; abstention summaries list at most ten distinct IDs, mark long-ID excerpts, and state any omitted count. Full IDs are still used for catalog/quarantine lookup. This bounds early abstentions as well as composed explanations. Ask never truncates a scientific claim to fit: if the assembled explanation exceeds TextSchema, it abstains with narrowing/dossier guidance.

## Shared-contract changes in Phase One (explicit list for Claude review)

Owner-directed Astra fixes (2026-10-14) establish the pre-release integration baseline on feat/astra-defect-fixes. API envelope version stays 1; new required rank support and earlier coverage/Ask fields are NOT wire-compatible with older strict parsers. No released consumer is supported by the old shapes. Claude must adopt the current shared package and rerun consumer tests before integration; a deployed breaking change would need a new API version. No frontend signoff is claimed by backend tests.

| Change | Kind | Consumer impact |
|---|---|---|
| `RankedEvidenceSchema.support`; PassportEntry.learnerNotes default []; REMOVE_PROPOSAL; SAVE_LIMIT_REACHED; exported MAX_SAVE | Owner-authorized Astra correction | Adopt current schemas/reducer; keep source limitations separate, handle size refusal and proposal removal |
| `CoverageSchema`; `coverage` added to Experiments and Rank responses | Additive, required field | Parse with the updated schema; render coverage |
| `ExperimentQuerySchema` gains `q`, `material`, `flowDirection` | Additive | Previously rejected params now accepted |
| `HealthResponseSchema.phase` is `zero \| one` | Widened | None |
| New: `SourceDetailResponseSchema`, `GapsRequest/ResponseSchema`, `CitationVerifyRequest/ResponseSchema`, `ExportQuery/ResponseSchema`, `AnswerStatementSchema`, `AbstentionCodeSchema` | New | New endpoints only |
| `AskResponseSchema`: abstained variant adds `code`; answered variant adds `statements` | Changed (endpoint was 501) | Use statements for display |
| `GameStateSchema` is now **v2** (`schemaVersion: 2`): structured `installedParts` {partId, anchorId, orientation}, `predictions`, `classifications`, `decision`, `proposals`. `GameStateV1Schema` is kept for migration only | Versioned | `loadProgress` migrates v1 automatically (`migratedFrom: 1`) |
| `GameActionSchema` adds `COLLECT_EVIDENCE` and `RECORD_DECISION` | Additive | — |
| `transition(state, action, catalog, at, options?)` takes the catalog instead of an ID list; returns failure `message` + optional `faults`, success optional `feedback` | Changed signature | Pass `catalog` from `@microfire/science` |
| `SaveStorage` requires `removeItem`; new `readRawSave`, `discardSave(…, 'discard-save-after-export')`, `exportPassport`, `migrateV1`, `diagnose`, `partDefinitions`, `claimTrialStatements` | Additive / interface | `localStorage` satisfies the interface |
| `next.config.ts`: page CSP unchanged; `/api/*` gets its own strict CSP | Config | None for pages |
| Root `package.json`: `eval:science` script, included in `npm run check` | Config | — |

Proposed but **not** implemented (needs UI-owner agreement): a nonce-based page CSP via Next proxy/middleware, which would remove `'unsafe-inline'` but changes how pages render.

## Claude consumption rules (acceptance review)

- Parse successful responses with the endpoint's exported response schema, and application error bodies with ApiErrorSchema. Branch on HTTP status first. An Ask abstention is a 200 with `abstained: true`; 404 on compare/export means a record is not validated. Requests may receive framework/proxy errors outside the JSON contract, so handle a failed JSON parse gracefully.
- GET list `total` counts matching records in the current bundled dataset before pagination. It is not the number of NASA experiments worldwide. Current coverage is exactly one fixture (`p0-bass-b20-v1`); record limitations and Preview labels must remain visible even if a list/API call succeeds. An empty filtered page does not establish absence of evidence globally.
- Stable IDs are lowercase/hyphenated. Use `bass2-b20`, not legacy `bass2-B20`. PDF `page` is one-based physical PDF position; `printedPage` is the report's printed label, not an alternate URL page number.
- Numeric query targets use vol% oxygen, absolute kPa pressure and cm/s airflow; no fraction or atm conversion is implied. P0 B20 oxygen is calibrated initial oxygen; flowCmS is the first logged airflow, not constant airflow. A later source with different oxygen basis must disclose it explicitly. Target matching semantics (categorical word containment, numeric retrieval tolerances, evidence levels) are defined under "Semantics Claude must preserve" above; there is still no material/geometry ontology, so synonyms beyond the documented list do not match.
- Times are UTC ISO strings accepted by the schemas; use `new Date().toISOString()`. Persisted save version and datasetVersion are separate compatibility checks. A TypeScript cast alone is not validation.
- `MAX_SAVE` from @microfire/game-core is 500,000 serialized UTF-16 characters. Every accepted transition passes schema, apparatus and serialized-size checks; an oversized candidate returns SAVE_LIMIT_REACHED with the identical previous state. saveProgress/loadProgress apply the same bound, including after v1 migration/default normalization. Oversized raw restores remain untouched. Shape-valid externally edited states can still exceed this bound and are rejected. The separate 32 KiB HTTP request limit still applies to Passport validation.

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

`packages/game-core` is pure: no browser, Three.js or network imports. `transition(state, action, catalog, at, options?)` validates the state and action, returns `{ ok: true, state, feedback? }` or `{ ok: false, state (unchanged), code, message, faults? }`, and never throws for a bad action.

**Production gate.** `START_MISSION` checks the shared feature registry (`registryAvailability`). All five missions are `coming_soon`, so in production every start returns `UNAVAILABLE`. Tests and a future reviewed UI pass `options.isMissionAvailable`. Flip a mission's feature state only after its whole UI loop passes browser verification. Prerequisites are enforced regardless (`PREREQUISITE_MISSING`).

**Missions and deterministic completion criteria**

| Mission | Actions | Completion requires |
|---|---|---|
| station-arrival | INSPECT_EVIDENCE, COLLECT_EVIDENCE (observed research claims only, after inspection) | A current station-arrival passport entry |
| bass-assembly | INSTALL_PART / REMOVE_PART / QUALIFY_INSTRUMENT / OBSERVE_DOCUMENTED_RESULT | Qualified instrument at the current setup revision and an observation entry from it |
| flame-detective | PREDICT_OUTCOME, then OBSERVE_DOCUMENTED_RESULT (setup actions allowed) | Prediction and observation at the current, qualified revision |
| claim-trial | CLASSIFY_CLAIM over `claimTrialStatements` (2 research, 2 labelled tutorial statements) | Latest classification of every statement correct; wrong attempts become passport corrections |
| lunar-habitat | RECORD_DECISION (`safe`/`unsafe` rejected), PROPOSE_NEXT_TEST | `insufficient-evidence` verdict and ≥1 proposal. Entry is `fictional-scenario`, evidence level `gap` |

**Apparatus.** `partDefinitions` gives each of the ten parts its anchor, prerequisites and orientation fault/repair text, justified by the BASS-II hardware description (NTRS 20210011385, PDF page 12 / printed 4, §1.2; `BASS_HARDWARE_CITATION`). Mounting order is an **educational dependency model**, not a NASA procedure. Only source-cited hardware dimensions are described; the educational assembly model is not a dimensionally certified NASA procedure. `diagnose(installedParts)` lists `MISSING`, `WRONG_ANCHOR`, `MISSING_PREREQUISITE` and `REVERSED` faults with exact repairs; qualification requires none. `setupIsConsistent` rejects misplaced or orphaned parts (which the reducer cannot produce) and any qualification the rig fails, both in `saveProgress` (`invalid-state`) and in `loadProgress` (`corrupt`). Orientation faults exist for the fan, sample holder (concurrent vs the documented opposed flow), still/video cameras and radiometer. Removing a part with installed dependents returns `HAS_DEPENDENTS`.

**Invalidation.** Every install/remove bumps `setup.revision`, clears qualification, marks setup-dependent passport entries `invalidated` and truncates completed missions to the prefix that still has current proof. Source-only entries (station-arrival, claim-trial) survive. A later mission that stays active after its prerequisite is revoked cannot complete: `COMPLETE_MISSION` returns `PREREQUISITE_MISSING` with recovery instructions (start the prerequisite again, re-qualify, re-observe, return). As a safety net, any action that would break a state invariant returns `INVARIANT_VIOLATION` with the unchanged state; `transition` does not throw for action-level problems. Entry IDs include the setup revision, so retries are idempotent and re-observation after a change creates a new entry instead of overwriting history.

After Flame Detective records a result for an experiment/setup revision, PREDICT_OUTCOME for that same result returns `INVALID_ACTION` with unchanged state. The original prediction and Passport conclusion remain consistent. A new setup revision can receive a new prediction. This is sequencing and history integrity, not a blinded experiment: the research dossier and earlier Assembly observation can already reveal B20's outcome. `transition` still requires a schema-valid incoming state; parse/load failure is a recovery boundary before dispatch.

**Source limitations and notes.** Passport entries retain all canonical experiment limitations in `limitations`; learner notes are a separate `learnerNotes` array (up to 400, exact duplicates removed for the final report). Older v1/v2 entries default this field to []; the state version remains 2 and Passport version remains 1. No canonical caveat is truncated to admit notes. Passport validation rejects missing canonical limitations; it still does not prove arbitrary conclusions. Old manually edited or previously defective passports missing caveats require review against the source; loading does not fabricate their scientific approval.

**Correction history.** classifications retains up to 200 attempts; at capacity, the oldest superseded attempt is removed, preserving each statement's latest answer. Correct answers can always replace wrong answers without an attempt-count penalty. The Passport correction list remains bounded at 100 and is not an exhaustive event log.

**Proposal recovery.** PROPOSE_NEXT_TEST preserves its existing input shape; its limitations are learner notes. REMOVE_PROPOSAL({index: 0–19}) removes a selected proposal in the lunar mission, with invalid indices rejected as INVALID_ACTION. It lets a learner free save space after a refused proposal or completion; nothing is removed automatically. The final entry retains all distinct notes from remaining proposals.

**Persistence.** Save key `microfire-v2:save:v1:{mode}` (key version, not state version) stores v2 state. `loadProgress` returns `loaded` (with `migratedFrom: 1` for Phase Zero saves; untrusted v1 parts are dropped and setup-dependent proof invalidated), `empty`, `corrupt` (including a save claiming qualification with a faulty rig), `unsupported-version`, `dataset-mismatch` or `storage-unavailable`. `saveProgress` refuses to overwrite anything not cleanly loadable. Recovery UI: offer `readRawSave` as a download, then `discardSave(storage, mode, 'discard-save-after-export')`. Normal and demo saves never share a key. Client saves are editable and are not anti-cheat or achievement authority.

Claude should consume typed actions/results identically in 3D and keyboard/2D views; the renderer never computes evidence truth. Research must render without WebGL/AI.
