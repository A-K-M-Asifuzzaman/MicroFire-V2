# Scientific implementation follow-up — November 12, 2026

The requested backend already exists after the accepted research baseline `6c9d29dbf26336efa205d343669056172c88391d`. It was preserved and inspected, not rebuilt or reset. Owner-reported authorization stays in `07_OWNER_AUTHORIZATION_RECORD.md`; the prior-work inventory and historical commit dates remain unchanged.

## Implemented runtime

- `bc170664f61d247ce97bb54b06a3efd128d195e3`: TypeScript/Zod scientific and private campaign wire contracts.
- `fd0624bc8ac3124cbeb9521bcd48939f68841a0b`: investigation list/detail/citation APIs, six-dimension transfer analyzer, source-grounded ranking/summaries and bounded abstention.
- `a3265dfafde037c4de5bcf81499c99e2dbe683b4`: original reproducible scientific regression evaluator.
- `ea3e907937588362ba91cb4371d48752d8e3c180`: expanded evaluation asserting every dimension and correct citation refusal, plus five additional analyzer unit cases.

## Concrete coverage and actual results

Latest `npm test`: 222/222 in 18 files. `npm run lint` and `npm run typecheck`: exit 0. `node --import tsx scripts/eval-intelligence.ts`: 11/11 applicability/abstention cases and 5/5 citation cases. Fingerprints and clean source commit: `evidence/evaluation-followup.json`; normalized command output: `evidence/followup-*.log`. The generated report is `docs/evals/intelligence-report.json`, version `intelligence-regression-v2`.

The evaluator now checks all six output dimension statuses, including previously unasserted pressure, material, geometry and flow. New cases require cotton, sphere and 20 cm/s proposals to differ from recorded B20 conditions, retain confounders, and still give an insufficient-evidence overall conclusion. Citation cases verify the exact observation locator and reject altered pages, unknown sources, missing citations, and attributing a pressure value to a source row with unknown pressure.

Synthetic unit fixtures test recorded microgravity versus lunar/Martian regimes. These fixtures are not NASA measurements and never enter the catalog. Actual B20 run acceleration and pressure remain unknown; the engine does not infer numeric gravity or atmospheric defaults from an environment label. Raw mixed airflow and potentiometer limitations remain visible even when the first recorded velocity matches. The one-record corpus cannot establish causal effects, general ranking quality or target safety.

The original production build and real HTTP acceptance passed before these evaluator/test-only changes. They were not rerun because runtime code, schemas and dependencies did not change. All results are authored regressions, not independent scientific validation.

## Exact Claude consumer instructions

Use `08_SCIENCE_API_AND_CLAUDE_HANDOFF.md` and `examples/` without changing contracts:

1. GET `/api/investigations` with `InvestigationsResponseSchema`; GET `/api/investigations/:id` with `InvestigationResponseSchema`.
2. POST `/api/evidence/transfer` with `TransferRequestSchema`, parse `TransferResponseSchema`; provide environment, admitted experiment IDs and visible target conditions.
3. POST `/api/intelligence` with `IntelligenceRequestSchema`, parse `IntelligenceResponseSchema`; use limit 4 (the old rank consumer uses 5). Render `data.ranking`, the discriminated `data.summary`, and `data.transfer` or its null explanation.
4. POST `/api/investigations/verify` with `InvestigationCitationRequestSchema`, parse `InvestigationCitationResponseSchema`; display metadata-lineage scope. Existing experiment citation validation stays separate.
5. Reuse `callApi`, `Failure` and `useLatestRequest`, retaining submitted inputs/environment across retry and ignoring stale responses. Render unknowns and limitations; never cast a refusal into an answer.

No new frontend UI, mission HTTP mounting, submission deployment or video change was made. Campaign contracts and their cookie-scope/security dependencies remain in `09_CAMPAIGN_HTTP_V1_CONTRACT.md`.

## Resource watch and preserved safeguards

The owner explicitly stopped repetitive unchanged-page checks. Automation `microfire-resource-release` was deleted through the app; no official pages were rechecked in this follow-up. Inspect the official release and current-year guide during the next authorized work session after publication. PSI-25 Version 4 remains candidate linked metadata, not preconfirmed qualifying data. New scientific admission and licensing reviews remain required.

B20 stays at calibrated oxygen 17.4%; the original catalog, 55-record quarantine, M2/game code, Claude worktrees, assets, videos and dependency files are unchanged. No merge or deployment occurred.
