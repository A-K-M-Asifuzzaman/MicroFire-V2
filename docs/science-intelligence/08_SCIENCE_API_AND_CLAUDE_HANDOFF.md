# Implemented science API v1 and Claude integration handoff

Owner-authorized isolated branch: `codex/science-intelligence-20261112`. Pre-existing disclosure baseline: `6c9d29dbf26336efa205d343669056172c88391d`.

| Commit | Scope |
|---|---|
| `894c488bf72da33d86172f3c309dace33eac1cf0` | Owner-reported early-development/reuse confirmation and release watcher |
| `bc170664f61d247ce97bb54b06a3efd128d195e3` | Strict science DTOs and private campaign HTTP contract candidate; contract tests |
| `fd0624bc8ac3124cbeb9521bcd48939f68841a0b` | Investigation Library, transfer analyzer, integrated ranking/summary, APIs, unit/HTTP tests |
| `a3265dfafde037c4de5bcf81499c99e2dbe683b4` | Reproducible intelligence regression set, evaluator and actual generated results |

No push, merge, deployment, feature-registry promotion, Claude-worktree edit, dependency/lockfile change, writable-save enablement or experimental admission occurred. Backend functionality is implemented and tested locally; the full new visual experience is a Claude integration task. These commits are candidates for review, not an approved release.

## Routes and exact runtime schemas

All successful bodies use `{apiVersion:"1",data:...}` and retain the existing no-store/data-only headers. Errors use `ApiErrorSchema`. New imports come from `@microfire/shared`; no hand-copied DTO or UI-owned truth logic.

| Method / path | Request | Success parser |
|---|---|---|
| GET `/api/investigations` | `InvestigationQuerySchema`: optional nonblank q ≤200 chars; no extra/duplicate keys | `InvestigationsResponseSchema` |
| GET `/api/investigations/:id` | canonical ID, no query keys | `InvestigationResponseSchema` |
| POST `/api/investigations/verify` | `InvestigationCitationRequestSchema`: investigationId and 1–20 exact citations | `InvestigationCitationResponseSchema` |
| POST `/api/evidence/transfer` | `TransferRequestSchema`: environment, 1–4 distinct admitted IDs, ≥1 target condition | `TransferResponseSchema` |
| POST `/api/intelligence` | `IntelligenceRequestSchema`: question, targetConditions, environment (default custom), limit 1–4 (default 4) | `IntelligenceResponseSchema` |

POSTs retain the existing global 30/minute process budget and 32 KiB streaming body limit; GETs retain the read budget. Invalid bodies/queries return 400, non-JSON 415, over-budget bodies 413, missing/unadmitted/quarantined transfer IDs 404, and the real shared window returns 429/Retry-After. These are bounded local-process limits; public scaling still needs its separate review. Existing `/ask`, rank/frontier/gap/export/citation/Passport semantics were not replaced.

## Investigation Library

`libraryVersion = investigation-library-v1`. Each `InvestigationSchema` has id/program/title/focus, fuelPhase/platformContext, a report source (URLs/hash/rights determination), exact report/context citations, dataset metadata or null, limitations, source-description scope and admittedExperimentIds. Entries: bass-ii, flex, acme, saffire-iv-v. Saffire is specifically IV/V; this does not imply audited coverage of all Saffire flights.

The BASS-II dataset link identifies PSI-25 Version 4, its DOI, displayed rights declaration and inspected metadata locator. Other dataset links remain null with a reason. The library has four **descriptions**, one admitted B20 run, and 55 quarantined legacy rows. Only admitted IDs may enter transfer/ranking/run summaries; source-only metadata cannot synthesize a run. `contextCitation` covers NTRS title/abstract descriptions; `citation` identifies the inspected report context; dataset citations are separately scoped. The verification endpoint checks exact declared locators only, not scientific entailment or legal clearance.

## Transfer analyzer

`analysisVersion = condition-transfer-v1`. The response compares all six fields: gravity, material, geometry, oxygenPct, pressureKpa, flowCmS. Units of targets follow those existing typed field names (vol%, kPa, cm/s); a null source unit/value does not invent a measurement. Planet/environment labels describe the user's proposal; no hidden lunar/Martian atmospheric defaults are inserted.

| Dimension status | Meaning to render |
|---|---|
| exact-recorded | Equal recorded field, with source citation; not proof of transferability |
| non-exact-retrieval-match | Numeric tolerance/text similarity from retrieval only; not uncertainty/equivalence |
| conditions-differ | Target and recorded descriptions differ |
| source-not-recorded | Requested source condition is unknown; no invented value/citation |
| context-only | Series/derived context is not an exact recorded run condition |
| target-unspecified | User did not specify this target dimension; no assumed match |

Overall conclusion is insufficient-evidence when any field is unspecified/missing/context-only; otherwise recorded-conditions-match only if all six are exact, or conditions-differ. Even the match conclusion is descriptive, never a fire-safety verdict. Confounders/limitations accompany the dimensions. Response validation rejects duplicated dimensions, fabricated completeness and false exact values. No confidence value, fire probability, certified target or new physical model is returned.

## Ranking and summaries

`intelligenceVersion = scientific-intelligence-v1`. `ranking` retains the existing ranking data/scoreMeaning; `summary` retains the strict answered/abstained union; `transfer` is a parsed analysis or null with transferNote. Producer is explicitly deterministic-source-templates-no-model.

The new endpoint refuses to let matching target conditions alone manufacture an answer to an unrelated question. Unavailable/quarantined/citation-rejected question evidence clears its ranked substitution and transfer, while the older ranking API remains unchanged. Operational/planetary-safety questions abstain. A separate condition comparison may explain recorded/missing fields without approving the unsupported conclusion. Relevance, question support and applicability must remain three visibly different things.

## Exact Claude integration

1. Review/cherry-pick the contract and science commits into an isolated consumer branch; preserve active submission/video branches. Existing public source remains untouched until owner release approval.
2. Reuse `apps/web/components/client-api.tsx` (`callApi`, `Failure`, `useLatestRequest`). Keep the submitted question/conditions/**environment** snapshot with its response; retries must reuse it, and stale older responses cannot replace it.
3. For investigation list/detail, call the new GETs with the exact parsers. Display source-description scope, source links/rights/limitations and admitted IDs; never label four descriptions as four admitted experiments. Use safe external links and render data as text.
4. The existing Workstation sends rank limit 5. **Do not switch it blindly:** `/api/intelligence` accepts at most 4. Use limit 4, `IntelligenceResponseSchema`, and read `result.data.ranking.items`, `result.data.summary` and `result.data.transfer`; it is not a `RankResponse` cast. Preserve the old endpoint until the new consumer passes its own tests.
5. A standalone analyzer uses `/api/evidence/transfer` with selected admitted IDs and visible user inputs. Render all six dimensions and null/unknown/context states. Keep 17.4 calibrated oxygen and existing raw airflow limitations. Source-only selections show an explanatory unavailable state rather than posting a fake experiment.
6. Citation checking for library descriptions uses the new metadata verifier; current experiment claims/conditions keep `/api/citations/verify`. Neither result is a scientific-approval badge. Never show unassessed learner prose as NASA evidence.
7. Feature availability changes only after release-target desktop/mobile/keyboard/reduced-motion browser acceptance. This backend delivery does not claim the new UI exists.

Example call through the existing helper:

```tsx
const r = begin();
const result = await callApi('/api/intelligence', IntelligenceResponseSchema,
  { question, targetConditions, environment: 'moon', limit: 4 }, r.signal);
if (!r.isCurrent()) return;
if (!result.ok) return; // Show the existing Failure component and retain the submitted request for retry.
// Render result.data.summary's discriminant and transfer limits; never assume an answered result.
```

Concrete parsed requests/responses: [examples/README.md](examples/README.md). The proposed Moon pressure/gravity are user-scenario inputs, not NASA measurements.

## Executed checks and remaining acceptance

`npm run check` passed 217 units plus lint, root/web types, unchanged data validation/science evaluation/security checks and production build. `node --import tsx scripts/eval-intelligence.ts` passed 8/8 authored regressions and preserved admission; its generated report is `docs/evals/intelligence-report.json`. This is a one-record author-labelled regression set, not an independent scientific benchmark or predictive accuracy score.

`node --import tsx --test tests/backend/intelligence-http.test.ts` passed against a disposable production server: source-only descriptions, exact citations, 17.4, unknown gravity/pressure, unavailable source/quarantined IDs, supported/unsupported summaries, data-only headers and the real 30-POST limit. Campaign and M2 preview routes remained 404 in the ordinary build; the server was stopped. Existing M2 browser suites were not rebuilt/rerun unnecessarily.

Independent scientific entailment/admission, source-specific redistribution rights, current official-resource qualification, Claude visual integration, latest Astra acceptance and owner release approval remain separate. Root project licensing and asset entitlement gaps in the accepted inventory are not silently cleared by the local reuse confirmation.
