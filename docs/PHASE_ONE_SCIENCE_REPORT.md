# Phase One science/backend report — integration review gate

Branch `feat/phase-one-science`, based on the accepted Phase Zero commit `0bd3f056394ceeaa2891753055a7ab782d3be5c2`, worktree `../MicroFire-V2-codex`. Owner: Codex scope (science data, APIs, deterministic domain logic). **Not publicly ready.** No deployment, paid call, LLM call or Meshy job was made.

## 1. Implemented

| Area | Where | Notes |
|---|---|---|
| Discovery/search | `searchExperiments`, GET `/api/experiments?q&program&material&flowDirection` | Deterministic AND term match over validated records only |
| Source/provenance | GET `/api/sources/:id` (`sourceDetail`), experiment `provenance` | Which experiments, claims and condition fields cite each source |
| Filtering/ranking | `rankEvidence`, POST `/api/evidence/rank` | Transparent formula and tolerances; unknowns never match; one-record limitation attached |
| Experiment details | GET `/api/experiments/:id` | Quarantined IDs get an explicit 404 message |
| Validated comparisons | `compareExperiments`, POST `/api/evidence/compare` | Never `controlled` in P1. With one validated record, every request is a truthful 404 |
| Gap classification | `classifyGaps`, POST `/api/gaps` | covered / conditions-differ / not-recorded / not-in-catalog, plus "absence ≠ never studied" |
| Citation/claim verification | `verifyCitations`, POST `/api/citations/verify` | Exact locator lineage for claims and condition fields; scope says lineage, not truth |
| Export | `exportEvidence`, GET `/api/export?ids=` | Hash-pinned (catalog SHA-256), deterministic, disclaimer |
| Grounded Ask | `answerQuestion`, POST `/api/ask` | Template over catalog statements; five answer categories; citation re-verification; four abstention codes; no model |
| Gameplay | `packages/game-core` | All five missions' rules, apparatus faults/repairs, passport, invalidation, v1→v2 migration, recovery. All still gated off by the registry |
| Quarantine | `data/quarantine/*`, `assertNoQuarantinedRecords` | Catalog load fails if any of the 55 legacy rows appears |
| Evaluation | `npm run eval:science` → `docs/evals/report.md` | 28 Ask + 6 ranking gold cases, run in `npm run check` |

## 2. Provenance verification

- NASA TM-20210011385 re-downloaded: SHA-256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770` matches the catalog.
- Pinned legacy `experiments.json` @ `acb9aaa6…`: SHA-256 `bb756a0e…b993` matches. 56 rows.
- B20 fixture unchanged (`catalog.json` hash unchanged): calibrated 17.4/17.4 reconfirmed on page 112. Also recorded: B20 flow restrictor 2, sample 152m.
- BASS-II hardware passage located at PDF page 12 / printed 4, §1.2; used only to justify game part placements.
- `npm run validate:data` checks four pinned files and that the ledger covers every non-B20 legacy row.

## 3. Remaining quarantined records

55 of 56 legacy rows (`data/quarantine/legacy-ledger.json`): B1–B19, B21, B22 (21), F1–F3 (3) and 31 Sibal Table 7.1 rows. 53 are `quarantined`; B16 and B19 are `source-cells-checked-pending-review`. None is served by any API, Ask or game path. Their legacy page locators are marked `verified: false`.

## 4. B16/B19 findings

See `docs/LEGACY_CALIBRATION_AUDIT.md` § Phase One. In short: the oxygen column error is confirmed for both (calibrated 17.3/17.2, not 16.5/16.4 or 16.4/16.3). B19 used flow restrictor 0, while B16 and B20 used 2. Both outcome labels are interpretations of potentiometer settings. B16 carries an unflagged anomaly note. The records were not promoted; human review is required.

## 5. Tests and actual outcomes (Node 24.19.0, this worktree)

| Command | Exit | Result |
|---|---|---|
| `npm ci` | 0 | Clean install. allow-scripts warnings for esbuild/fsevents, as in P0 |
| `npm run check` | 0 | lint clean; root + Next typecheck; **64 unit tests / 4 files**; data validation; eval Ask 28/28, rank 6/6, faithful 12/12, forbidden-language 0; security scan; production build |
| `npm run test:e2e` (`PLAYWRIGHT_BROWSERS_PATH` = approved cache in `../MicroFire-V2/.cache/ms-playwright`) | 0 | **12 passed** (6 desktop, 6 mobile), including the new `science-api.spec.ts` |
| `npm audit --audit-level=high` | 0 | 0 vulnerabilities |

Defects found by these runs and fixed before commit:
1. The random-play property test was vacuous (it earned no entries). It was rewritten as a guided walk with non-vacuity assertions.
2. Ask answered "How did cotton burn in Saffire?" with PMMA evidence via the generic word "burn". Generic combustion words can no longer establish relevance.
3. Gap statements printed word stems ("reduc"). They now use the asker's words.
4. `next.config.ts` headers overrode the API CSP in production (caught only by the browser test).

New regression coverage: quarantined records on every path, catalog smuggling, misleading evidence (lunar/safety/probability/injection abstention, causal-trend gap, analogous vs direct), invalid comparisons, citation failures (wrong page/kind/source/unknown value, forged answer citation), persistence errors (corrupt, unsupported version, tampered qualification, unavailable storage, v1 migration, confirmed discard).

## 6. Contracts consumed by Claude

Listed in `docs/API_CONTRACTS.md` (endpoint table, semantics, and **Shared-contract changes in Phase One**). No Claude-owned page/component/CSS file was changed. Shared files touched: `packages/shared/src/{api,game,science}.ts`, `apps/web/next.config.ts` (API-only CSP block), root `package.json` (`eval:science`), `tests/e2e/foundation.spec.ts` (one assertion, from 501 to abstention) and the new `tests/e2e/science-api.spec.ts`. No reachable Claude session existed to pre-review these; they are additive or versioned with migration, and remain open for review.

Coordination: Codex dev server on port 3102. Browser suites use 3217 and must run one at a time. This run had port 3217 to itself (checked with `lsof`).

## 7. Security and deployment blockers

| Blocker | Severity |
|---|---|
| Per-process fixed-window limiter (300 GET/30 POST per minute); no distributed or per-client quota | High before public exposure |
| Page CSP still allows `'unsafe-inline'`; a nonce CSP needs UI-owner agreement | Medium |
| No comprehensive secret/history scan (gitleaks/trufflehog not installed); the pattern scan is basic | Medium |
| CI actions pinned by major tag, not SHA; remote CI not run | Medium |
| One validated record: ranking order, comparisons and recall-type metrics are not meaningful; eval labels are author-written | High for scientific claims |
| No independent human scientific review of B20/B16/B19 cells | High for data promotion |
| Game parts have no sourced dimensions; mounting order is an educational model | Medium for P2 "dimensionally checked" |
| All missions remain `coming_soon`; no UI drives the reducer; no browser verification of gameplay | Release gate |
| Client saves are editable; no server revalidation of achievements | Known limitation |

## 8. Commit

Recorded in the hand-off message (`git log -1` on `feat/phase-one-science`). Stop: Phase One integration review gate.
