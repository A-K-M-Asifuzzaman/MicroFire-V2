# M2 gameplay contract plan — final consumer candidate 3

Status: **READY FOR ASTRA FINAL M2 CONTRACT REVIEW**. The owner supplied Claude’s C1–C4 substance acceptance and final R1–R5 request; independent final approval is pending. Documentation only; no gameplay implementation, preview activation, state promotion, deployment or paid generation is authorized by this package. Independent contract approval is required before coordinated implementation.

## Baseline and recovered workspace

Exact approved M1.5 ancestor: **b6d15a47ec25f57350896f1dc63dc59192f57b00**. Exact previous correction commit / parent: **030e1e9283d0887a0d5464fd668e3fa5e675bbc3**. Planning branch: **codex/m2-contract-plan**. Dedicated worktree: **MicroFire-V2-m2-plan**, beside the other checkouts under `/Volumes/ssd(mac)2/NASA SPACE APP CHALLENGE 2026/untitled folder 3`.

| Checkout | Branch | HEAD inspected | Pending work |
|---|---|---|---|
| MicroFire-V2 | feat/phase-zero-contracts | 0bd3f056394ceeaa2891753055a7ab782d3be5c2 | Clean |
| MicroFire-V2-codex | feat/phase-one-science | 882e3c88a1737d65e83234b5dacd6163d6a98b00 | Six unstaged reason edits in packages/shared/src/features.ts; preserved |
| MicroFire-V2-backend-review | feat/phase-one-backend-review | 1c1af90e41390a6dcb3e3cb87fefa0f9472f6542 | Untracked docs/EXISTING_WORK_RECOVERY_AUDIT_2026-10-14.md; preserved |
| MicroFire-V2-astra-fixes | feat/astra-defect-fixes | f1afdcacde6dfc94317d8575d67f342e9bb2c03e | Inspected read-only |
| MicroFire-V2-claude | feat/p1-ui | 322f2c25417ffd333094117a46c0bc9282d4972c | Clean; untouched |
| MicroFire-V2-m2-plan | codex/m2-contract-plan | 030e1e9283d0887a0d5464fd668e3fa5e675bbc3 before this correction commit | This package only |

All share the sole origin `https://github.com/A-K-M-Asifuzzaman/MicroFire-V2.git`. No fetch or reference-repository change was needed. The graph is `e8731c0 … 7ca790a → b6d15a4 → 322f2c2`. The planning branch was explicitly created from **b6d15a4**, excluding the `.gitignore`/`.vercelignore` deployment commit. Do not merge, cherry-pick or silently base work on 322f2c2. Commit hashes in the final delivery identify the documentation commit; `git rev-parse HEAD` here identifies it locally.

## Read and evidence basis

Read AGENTS.md, CLAUDE.md, FINAL_MASTER_PROMPT.md; docs/OWNERSHIP.md, API_CONTRACTS.md, M15_REPORT.md, SOL_HANDOFF_M15_CORRECTIONS.md, ASTRA_FIXES_INTEGRATION_REPORT.md; the five-mission specifications, game/shared schemas, reducer, persistence, current registry, API adapter, science catalog/validator, asset-rights ledger, credit ledger and relevant tests. The repository science-integrity and game-QA skills informed this plan. Historical P0-stop instructions are superseded by this explicit M2 planning assignment; implementation remains outside scope.

Astra's final M1.5 acceptance and supporting local evidence are at `/Users/asifzaman/.codex/visualizations/2026/10/14/01a13b66-4da0-7bc2-a7ec-1e54cfa974fd/astra-m15-final-review/FINAL_M15_ACCEPTANCE_REVIEW.md`. That review approves M2 planning, not public release or human science signoff. Required documents were available; no substitute GitHub branch was used.

Prior planning-source evidence (not downloaded again during these corrections): [BASS-II Summary Report](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf), SHA-256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`, matching the fixture. PDF pages **12–13** (printed **4–5**) and **112** (printed **104**) were extracted and visually inspected. Facts are paraphrased in this package; the PDF/images are not redistributed in Git. Source/rights limitations remain unchanged.

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
| [fixtures/README.md](fixtures/README.md), planning types/label table/proof runner and32 typed JSON examples | Complete corrected wire examples, negative mutations and bounded contract proof oracles; no runtime exports |
| [09_CLAUDE_CONSUMER_HANDOFF.md](09_CLAUDE_CONSUMER_HANDOFF.md) | Focused diagnostic/repair/auth/retry/save/conflict/accessibility consumer review and explicit coding gates |

These are proposals to freeze, not newly implemented API endpoints. Existing docs/API_CONTRACTS.md remains authoritative for current runtime behavior. New contracts below must be implemented jointly and tested before callers use them.

## Architectural decisions proposed for freeze

1. One training episode, `bass-b20-training-v1`, uses existing **station-arrival → bass-assembly** IDs. It is the first M2 vertical slice, not a replacement five-mission campaign. Existing prerequisites and progress prefix remain. Later three missions stay unavailable.
2. Reuse GameState **v2**, Passport **v1**, `transition`, `diagnose`, source catalog and validation. Add a small pure training coordinator for required diagnosis/repair history; it owns no separate scientific truth or second Passport.
3. A separate **local-only revocable opaque server-memory grant** authorizes the episode. Default/public availability remains unchanged. The server owns runtime session state and only the server passes the existing testability callback to the core reducer. No client flag or demo save confers access.
4. Add a **version-1 preview checkpoint envelope** containing the single existing GameState plus bounded training metadata, including exact pending repair provenance. A server MAC protects its provenance; it never certifies science. No GameState v3 or destructive legacy migration is proposed.
5. Preserve the **32,768-byte POST limit**, shared rate limits and **500,000 UTF-16-unit core save ceiling**. This small episode has a stricter **20,480-byte checkpoint payload budget**, tested against realistic worst-note projections. No bulk save upload or security-limit relaxation.
6. Require fault diagnosis and repair through a pure coordinator around current transitions. Plain core bass-assembly presently completes without a required fault; that remains an inventory finding, not a falsely claimed implemented mechanic.
7. Finish the 2D real HTTP loop before 3D manipulation. Both views dispatch the same typed commands to the same coordinator. Existing PIX/console assets remain visual props.

## Four Astra corrections and review routing

Full review read: `/Users/asifzaman/.codex/visualizations/2026/10/14/01a13b66-4da0-7bc2-a7ec-1e54cfa974fd/astra-m2-contract-review/INDEPENDENT_M2_CONTRACT_REVIEW.md`. No review evidence was inaccessible. C1: explicit derived DiagnosticResult and pure result type. C2: pending repair cause/removal revision. C3: exclusive Web Lock plus epoch/generation save admission, safe read-only fallback. C4: revocable grants, key/runtime lifecycle, canonical request-intent hashes, start tombstones and exact action/resume retry rules. Details/examples/tests are in02–07/09 and fixtures.

Candidate2 changes no runtime contracts or availability; the nine registry proposals and pending six edits remain preserved. This final consumer candidate addresses R1–R5; Astra next approves/rejects the exact corrected SHA. This delivery claims no final reviewer signoff nor permission to start gameplay. The stable key/profile/source scope remain local only; no public release or paid job.

## Final consumer corrections

R1 freezes10 human equipment/anchor labels and15 reachable symptom strings. R2 keeps research Passport corrections empty and derives a structurally separate authored-training section. R3 names all5 derived learning checks and verifies the count. R4 adds local lock/write errors and freezes invalid notes as400 INVALID_REQUEST with noteIssue. R5 chooses guided source reading with no invented distractor. All N1–N8 decisions, per-engine cross-process storage gates and request/response size distinctions are frozen in [10_FINAL_CONSUMER_CORRECTIONS.md](10_FINAL_CONSUMER_CORRECTIONS.md). The exact handoff is09;07 records fresh evidence/limits. No runtime implementation is included.

## Scope and next milestone

Next milestone after Astra approves this package: **Sol's tested coordinator + disabled-by-default preview API/checkpoint implementation, followed by Claude's accessible 2D station-entry/assembly/fault/repair/B20/Passport/save/reload loop**. Then integrate the cinematic 3D bench. Neither agent begins coordinated gameplay implementation before the contract freeze. No feature becomes publicly Available as part of this plan.

## Exact deliverable paths

Only documentation, contract proofs and example data; no application exports:

- `docs/m2/01_ENGINE_INVENTORY.md`
- `docs/m2/02_MISSION_AND_SCIENCE.md`
- `docs/m2/03_PREVIEW_AND_FRONTEND_CONTRACT.md`
- `docs/m2/04_PERSISTENCE_AND_RECOVERY.md`
- `docs/m2/05_TESTS_AND_IMPLEMENTATION.md`
- `docs/m2/06_REGISTRY_AND_OWNERSHIP.md`
- `docs/m2/07_VERIFICATION_AND_REVIEW.md`
- `docs/m2/08_BASELINE_PROBE.md`
- `docs/m2/09_CLAUDE_CONSUMER_HANDOFF.md`
- `docs/m2/10_FINAL_CONSUMER_CORRECTIONS.md`
- `docs/m2/README.md`
- `docs/m2/fixtures/AUTHORIZE_RESPONSE.example.json`
- `docs/m2/fixtures/CANONICAL_JSON_VECTORS.json`
- `docs/m2/fixtures/CAPABILITY_RESPONSE.example.json`
- `docs/m2/fixtures/CHECKPOINT_KEY_FAILURE_RESPONSE.example.json`
- `docs/m2/fixtures/COMMAND_REUSED_RESPONSE.example.json`
- `docs/m2/fixtures/COMPLETE_RESPONSE.example.json`
- `docs/m2/fixtures/DIAGNOSIS_REQUEST.example.json`
- `docs/m2/fixtures/DIAGNOSTIC_ERROR.example.json`
- `docs/m2/fixtures/DIAGNOSTIC_REQUEST.example.json`
- `docs/m2/fixtures/DIAGNOSTIC_SUCCESS.example.json`
- `docs/m2/fixtures/EQUIPMENT_COPY.md`
- `docs/m2/fixtures/FAULT_INJECTED_RESPONSE.example.json`
- `docs/m2/fixtures/LOCAL_LOCK_BUSY_RESULT.example.json`
- `docs/m2/fixtures/LOCAL_WRITE_FAILED_RESULT.example.json`
- `docs/m2/fixtures/MEASUREMENTS.json`
- `docs/m2/fixtures/NOTE_INVALID_RESPONSE.example.json`
- `docs/m2/fixtures/PASSPORT_REVIEW_RESPONSE.example.json`
- `docs/m2/fixtures/PENDING_REPAIR_A.example.json`
- `docs/m2/fixtures/PENDING_REPAIR_B.example.json`
- `docs/m2/fixtures/QUALIFICATION_FAILED_RESPONSE.example.json`
- `docs/m2/fixtures/RATE_LIMITED_RESPONSE.example.json`
- `docs/m2/fixtures/README.md`
- `docs/m2/fixtures/RESUME_AFTER_RESTART_REQUEST.example.json`
- `docs/m2/fixtures/RESUME_AFTER_RESTART_RESPONSE.example.json`
- `docs/m2/fixtures/RESUME_REQUEST.example.json`
- `docs/m2/fixtures/RESUME_RESPONSE.example.json`
- `docs/m2/fixtures/REVISION_CONFLICT_RESPONSE.example.json`
- `docs/m2/fixtures/REVOKE_RESPONSE.example.json`
- `docs/m2/fixtures/RUNTIME_CHANGED_RESPONSE.example.json`
- `docs/m2/fixtures/STALE_DIAGNOSTIC_RESPONSE.example.json`
- `docs/m2/fixtures/START_REQUEST.example.json`
- `docs/m2/fixtures/START_RESPONSE.example.json`
- `docs/m2/fixtures/UNAUTHORIZED_RESPONSE.example.json`
- `docs/m2/fixtures/WRONG_ANCHOR_REQUEST.example.json`
- `docs/m2/fixtures/WRONG_ANCHOR_RESPONSE.example.json`
- `docs/m2/fixtures/WRONG_DIAGNOSIS_RESPONSE.example.json`
- `docs/m2/fixtures/contract-types.ts`
- `docs/m2/fixtures/equipment-copy.ts`
- `docs/m2/fixtures/verify-contracts.ts`
