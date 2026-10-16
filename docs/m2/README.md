# M2 gameplay contract plan — review candidate 1

Status: **M2 CONTRACT PLAN READY FOR ASTRA REVIEW**. Documentation only; no gameplay implementation, preview activation, state promotion, deployment or paid generation is authorized by this package. Independent contract approval is required before coordinated implementation.

## Baseline and recovered workspace

Exact approved parent: **b6d15a47ec25f57350896f1dc63dc59192f57b00**. Planning branch: **codex/m2-contract-plan**. Dedicated worktree: **MicroFire-V2-m2-plan**, beside the other checkouts under `/Volumes/ssd(mac)2/NASA SPACE APP CHALLENGE 2026/untitled folder 3`.

| Checkout | Branch | HEAD inspected | Pending work |
|---|---|---|---|
| MicroFire-V2 | feat/phase-zero-contracts | 0bd3f056394ceeaa2891753055a7ab782d3be5c2 | Clean |
| MicroFire-V2-codex | feat/phase-one-science | 882e3c88a1737d65e83234b5dacd6163d6a98b00 | Six unstaged reason edits in packages/shared/src/features.ts; preserved |
| MicroFire-V2-backend-review | feat/phase-one-backend-review | 1c1af90e41390a6dcb3e3cb87fefa0f9472f6542 | Untracked docs/EXISTING_WORK_RECOVERY_AUDIT_2026-10-14.md; preserved |
| MicroFire-V2-astra-fixes | feat/astra-defect-fixes | f1afdcacde6dfc94317d8575d67f342e9bb2c03e | Inspected read-only |
| MicroFire-V2-claude | feat/p1-ui | 322f2c25417ffd333094117a46c0bc9282d4972c | Clean; untouched |
| MicroFire-V2-m2-plan | codex/m2-contract-plan | b6d15a47ec25f57350896f1dc63dc59192f57b00 before this documentation commit | This package only |

All share the sole origin `https://github.com/A-K-M-Asifuzzaman/MicroFire-V2.git`. No fetch or reference-repository change was needed. The graph is `e8731c0 … 7ca790a → b6d15a4 → 322f2c2`. The planning branch was explicitly created from **b6d15a4**, excluding the `.gitignore`/`.vercelignore` deployment commit. Do not merge, cherry-pick or silently base work on 322f2c2. Commit hashes in the final delivery identify the documentation commit; `git rev-parse HEAD` here identifies it locally.

## Read and evidence basis

Read AGENTS.md, CLAUDE.md, FINAL_MASTER_PROMPT.md; docs/OWNERSHIP.md, API_CONTRACTS.md, M15_REPORT.md, SOL_HANDOFF_M15_CORRECTIONS.md, ASTRA_FIXES_INTEGRATION_REPORT.md; the five-mission specifications, game/shared schemas, reducer, persistence, current registry, API adapter, science catalog/validator, asset-rights ledger, credit ledger and relevant tests. The repository science-integrity and game-QA skills informed this plan. Historical P0-stop instructions are superseded by this explicit M2 planning assignment; implementation remains outside scope.

Astra's final M1.5 acceptance and supporting local evidence are at `/Users/asifzaman/.codex/visualizations/2026/10/14/01a13b66-4da0-7bc2-a7ec-1e54cfa974fd/astra-m15-final-review/FINAL_M15_ACCEPTANCE_REVIEW.md`. That review approves M2 planning, not public release or human science signoff. Required documents were available; no substitute GitHub branch was used.

NASA report freshly downloaded and inspected for this plan: [BASS-II Summary Report](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf), SHA-256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`, matching the fixture. PDF pages **12–13** (printed **4–5**) and **112** (printed **104**) were extracted and visually inspected. Facts are paraphrased in this package; the PDF/images are not redistributed in Git. Source/rights limitations remain unchanged.

## Package map and deliverables

| File | Deliverables |
|---|---|
| [01_ENGINE_INVENTORY.md](01_ENGINE_INVENTORY.md) | Existing behavior, exact reusable exports/actions/tests, missing integration, changes actually needed |
| [02_MISSION_AND_SCIENCE.md](02_MISSION_AND_SCIENCE.md) | Complete first-slice sequence, ten components, source boundaries, deterministic fault/diagnosis/repair/qualification and Passport meaning |
| [03_PREVIEW_AND_FRONTEND_CONTRACT.md](03_PREVIEW_AND_FRONTEND_CONTRACT.md) | Local authorization, typed requests/responses, phases/actions, transition/error semantics, examples and compatibility decisions |
| [04_PERSISTENCE_AND_RECOVERY.md](04_PERSISTENCE_AND_RECOVERY.md) | One nested GameState v2/Passport v1, signed preview checkpoint, size budgets, restore/migration, network/interruption recovery |
| [05_TESTS_AND_IMPLEMENTATION.md](05_TESTS_AND_IMPLEMENTATION.md) | Twenty acceptance areas, actual baseline probes, concrete browser fixtures, Sol/Claude/Astra responsibilities and implementation stages |
| [06_REGISTRY_AND_OWNERSHIP.md](06_REGISTRY_AND_OWNERSHIP.md) | Exact nine-row reconciliation, six pending edits, asset/tooling/schema/package-lock ownership and shared-file coordination |
| [07_VERIFICATION_AND_REVIEW.md](07_VERIFICATION_AND_REVIEW.md) | Actual checks, source/size evidence, unresolved risks and independent approval checklist |
| [08_BASELINE_PROBE.md](08_BASELINE_PROBE.md) | Reproducible existing-core/serialization probe, documentation only |
| [fixtures/README.md](fixtures/README.md) and four example JSON files | Complete proposed start/domain-refusal/unauthorized wire examples, explicitly non-runtime fixtures |

These are proposals to freeze, not newly implemented API endpoints. Existing docs/API_CONTRACTS.md remains authoritative for current runtime behavior. New contracts below must be implemented jointly and tested before callers use them.

## Architectural decisions proposed for freeze

1. One training episode, `bass-b20-training-v1`, uses existing **station-arrival → bass-assembly** IDs. It is the first M2 vertical slice, not a replacement five-mission campaign. Existing prerequisites and progress prefix remain. Later three missions stay unavailable.
2. Reuse GameState **v2**, Passport **v1**, `transition`, `diagnose`, source catalog and validation. Add a small pure training coordinator for required diagnosis/repair history; it owns no separate scientific truth or second Passport.
3. A separate **local-only server capability** authorizes the episode. Default/public availability remains unchanged. The server owns runtime session state and only the server passes the existing testability callback to the core reducer. No client flag or demo save confers access.
4. Add a **version-1 preview checkpoint envelope** containing the single existing GameState plus bounded training metadata. A server MAC protects its provenance; it never certifies science. No GameState v3 or destructive legacy migration is proposed.
5. Preserve the **32,768-byte POST limit**, shared rate limits and **500,000 UTF-16-unit core save ceiling**. This small episode has a stricter **20,480-byte checkpoint payload budget**, tested against realistic worst-note projections. No bulk save upload or security-limit relaxation.
6. Require fault diagnosis and repair through a pure coordinator around current transitions. Plain core bass-assembly presently completes without a required fault; that remains an inventory finding, not a falsely claimed implemented mechanic.
7. Finish the 2D real HTTP loop before 3D manipulation. Both views dispatch the same typed commands to the same coordinator. Existing PIX/console assets remain visual props.

## Scope and next milestone

Next milestone after Astra approves this package: **Sol's tested coordinator + disabled-by-default preview API/checkpoint implementation, followed by Claude's accessible 2D station-entry/assembly/fault/repair/B20/Passport/save/reload loop**. Then integrate the cinematic 3D bench. Neither agent begins coordinated gameplay implementation before the contract freeze. No feature becomes publicly Available as part of this plan.

## Exact deliverable paths

All paths are relative to the dedicated planning worktree:

- `docs/m2/01_ENGINE_INVENTORY.md`
- `docs/m2/02_MISSION_AND_SCIENCE.md`
- `docs/m2/03_PREVIEW_AND_FRONTEND_CONTRACT.md`
- `docs/m2/04_PERSISTENCE_AND_RECOVERY.md`
- `docs/m2/05_TESTS_AND_IMPLEMENTATION.md`
- `docs/m2/06_REGISTRY_AND_OWNERSHIP.md`
- `docs/m2/07_VERIFICATION_AND_REVIEW.md`
- `docs/m2/08_BASELINE_PROBE.md`
- `docs/m2/README.md`
- `docs/m2/fixtures/README.md`
- `docs/m2/fixtures/START_RESPONSE.example.json`
- `docs/m2/fixtures/UNAUTHORIZED_RESPONSE.example.json`
- `docs/m2/fixtures/WRONG_ANCHOR_REQUEST.example.json`
- `docs/m2/fixtures/WRONG_ANCHOR_RESPONSE.example.json`
