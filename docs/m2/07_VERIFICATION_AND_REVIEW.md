# Verification record and independent review decisions

Date: 2026-10-16, Asia/Dhaka. Reviewed baseline b6d15a47ec25f57350896f1dc63dc59192f57b00. This branch adds planning documents/examples only. Nothing below claims the proposed preview/coordinator/HTTP/storage feature exists.

## Checks actually run for this assignment

Existing dependencies were copy-on-write copied from the previously isolated exact-baseline installation into this planning worktree; workspace symlinks resolve its own packages. No install/update or package-lock edit was made. A clean npm ci has not been rerun.

| Check / exact command | Actual result |
|---|---|
| git remote -v, branch/status/worktree inventory, graph | Sole authorized V2 origin; dedicated codex/m2-contract-plan from exact b6d15a4; 322f2c2 excluded; other checkouts unchanged |
| `npm test` in MicroFire-V2-m2-plan | **103 passed, 5 files**, 4.09s. Existing 2,000-action property/save round-trips and exhausted-classification recovery included |
| `npm run validate:data` | **1 source, 1 experiment, 55 excluded legacy rows**, local fixture integrity matches. This validator explicitly does not recheck remote links |
| `curl --fail --location --silent --show-error --output /private/tmp/microfire-m2-bass-source.pdf https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf` | Fresh primary PDF downloaded, 48,972,416 bytes; source only, no paid call |
| `shasum -a 256 /private/tmp/microfire-m2-bass-source.pdf` | **5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770**, matches fixture |
| `pdftotext` / `pdftoppm` on PDF12,13,112 + image inspection | Duct/functions/window directions and B20 calibrated17.4/17.4 columns/observation checked; printed4,5,104. No figures/PDF added to Git |
| `node --import tsx /private/tmp/microfire-m2-plan-evidence/size-probe.ts` | Existing-core path and size projection assertions pass; details below; no preview server created |
| `node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop /private/tmp/microfire-m2-plan-evidence/contract-check.ts` | Pass. Extracted proposed type block + all four full example literals typecheck against existing imported types; client availability override/normal preview start are expected type errors |
| JSON parse + example checkpoint MAC/core/lineage/budget checks | Four complete example documents parse; example MACs verify under the explicitly public test-only key; embedded core states and canonical source lineage validate. This does not test unimplemented runtime schemas |
| `git diff --check` and documentation/link/baseline/scope integrity probes | Final results recorded with delivery; only docs/m2 paths may be committed |

The M1.5 acceptance already reported check/build/audit and90 passing browser cases with22 skips on the same code baseline. They are **prior review evidence**, not rerun or newly claimed results for this documentation assignment. No new playable browser path was tested because no gameplay implementation is authorized. No new dependency audit, HawkScan, native zoom, screen-reader/physical-device testing or performance benchmark was run here.

Local uncommitted verification artifacts: `/private/tmp/microfire-m2-plan-evidence/` contains unit.log, data.log, source text/renders, size-probe.ts/size-results.json and extracted contract-check.ts/log. The PDF lives at the path above. Their absence in a later environment should be reported; the committed probe document and example fixtures remain available. No user/provider secret is recorded.

## Actual size and recovery observations

The probe reused existing transition/core/catalog, with a clearly test-only two-mission availability callback. It did **not** activate default availability or any API. It confirmed all ten normal/demo default start combinations are denied, and completed a real core station/ten-part/fault/repair/qualification/B20 flow with **22 accepted core action save/load round-trips**. Normal storage key was not touched; source caveats remained; quarantined B19 failed unchanged-state.

| Measurement | Bytes / result |
|---|---:|
| Baseline two-entry Passport | 1,904 |
| Projected Passport: four500-unit Unicode notes + one labeled training correction | 8,237 |
| Proposed full checkpoint: completed real core + all40 diagnosis cells with maximum-safe-integer counters + bounded metadata | **13,420 UTF-8** |
| Signed example token | **17,938** |
| Full resume JSON body | **18,006** |
| Maximum mathematical token from20,480 payload bytes | **27,351**, fits32KiB resume including wrapper |

The four note strings are500 UTF-16 units /1,500 serialized UTF-8 bytes each. This stresses multibyte storage and the finite diagnosis vocabulary. It's a conservative example projection, not an exhaustive schema proof; future implementation must test maximum legal metadata, bounded IDs/times, exact boundaries, escaped text and every finalization suffix. No canonical text/notes were truncated to fit.

The probe independently confirms **existing core Assembly can complete without any required fault encounter**. That is why the new coordinator must enforce the mandatory introduction/diagnosis/repair receipts, rather than treating old unit success as complete M2 gameplay. Default gating remains correctly closed.

## Risks and blockers by stage

| Finding | Classification | Required treatment |
|---|---|---|
| Preview authorization/coordinator/checkpoint APIs are not implemented | Expected implementation work; blocks playing, not plan review | Freeze candidate contract then Sol implements/tests; Claude must not call hypothetical endpoints now |
| Mandatory repair history absent from core v2 | Required missing mechanic | Pure training coordinator and reachability validation, no replacement assembly reducer |
| Single-process session map/local cookie/MAC assumptions | Independent security decision before activation | Verify loopback binding, disable-hosted behavior, exact Origin, stable secret management, no secret traces, atomic replay/CAS; no public deployment reuse |
| Storage/network/process crash window | Known local durability limit | Honest confirmed-vs-saved UI; checkpoints/download and current-head recovery; cannot promise durability before receipt/save |
| Existing large legacy saves can exceed32KiB validator | Existing recovery boundary | Preserve raw, mark unvalidated, no enlarged limit or silent unsigned migration into trusted preview |
| Generic rig accepts future incompatible records | Scientific contract gate | Pin B20/hash/regime in preview; add explicit negative synthetic-record test; future multi-record design separately reviewed |
| Claim Trial derived/direct label vs ranking semantics | Later-mission issue | Keep mission unavailable; resolve before that UI, not by broadening direct evidence now |
| Arbitrary prose not proven by locator | Persistent scientific limitation | Deterministic canonical source composition; learner text separate; no generative model integration |
| B16/B19 +53 other excluded rows / no human scientific approval | Data promotion blocker | All55 remain excluded; no M2 result promotes them or confers operational fire-safety authority |
| Registry/ownership/rights schema not yet reconciled | Shared integration work | Row-level proposal in06; preserve pending file; rights/ownership before publication; can run alongside contract review |
| Asset-rights fields are recorded approval claims | Rights release gate | Validate schema/files and substantive owner/legal basis; no automatic public-asset approval |
| Physical-device/native zoom/screen-reader/browser parity not newly checked | Later UX/release evidence | Test actual implementation; no blanket accessibility/performance acceptance |

## Required Astra decisions before implementation

1. Accept the existing two mission IDs as one coherent first training episode, including initial source familiarization and later B20 reinspection; reject fake prerequisite seeding.
2. Approve or amend the disabled-by-default **local-only** authorization/cookie, server-owned progression, MAC checkpoint and bounded session strategy. Review threat boundary explicitly; do not mistake the pure availability callback for authorization.
3. Freeze TrainingAction/Training metadata/Progress/EvidenceReview/error schemas and the atomic injection/diagnosis/repair guards; approve leaving GameState v2/Passport v1 unchanged.
4. Approve the training/source Passport split and one labeled correction, canonical caveat preservation, note limits and lineage-only validation wording.
5. Approve20KiB checkpoint/32KiB POST strategy, finalization headroom, namespace isolation, legacy read-only recovery and CAS/idempotency semantics; require the exact boundary/multibyte tests.
6. Approve real HTTP/2D-first/browser acceptance before 3D, with no rate-limit/auth/mocked-validation bypass.
7. Review nine registry reasons and three proposed research Preview transitions separately; never Available. Confirm ownership additions and package-lock editing window with Claude.
8. Confirm that no generation/deployment/scientific record promotion is included. Only after contract approval may coordinated implementation begin.

## Verdict and safe next action

**M2 CONTRACT PLAN READY FOR ASTRA REVIEW.** No missing source document or workspace obstacle prevents this review candidate. Pending decisions are explicitly assigned review gates, not hidden implementation assumptions. This is not mission activation or a claim of M2 E2E completion.

After approval, use this documentation commit (parent b6d15a47ec25f57350896f1dc63dc59192f57b00) as the shared planning baseline. Sol implements stage1/2 in a new implementation branch; Claude starts the frozen 2D consumer stage after its schemas/API tests exist. Astra independently reviews the resulting vertical slice at its actual commit. Keep the unreviewed322f2c2 delta out unless separately approved. Stop after this package.
