# Candidate3 receipt-correction verification

**READY FOR ASTRA FINAL M2 CONTRACT RECHECK.** Previous commit: **35fe3fdd6dafc57b2df43a74e7c66ae6455cdc0e**; accepted M1.5 ancestor **b6d15a47ec25f57350896f1dc63dc59192f57b00**. New correction SHA is supplied in the delivery and by `git rev-parse HEAD`. Branch codex/m2-contract-plan;322f2c2 remains excluded. The owner supplied Claude’s C1–C4 substance acceptance and R1–R5 requirements; this candidate does not claim Astra final approval or runtime implementation.

## R1–R5 changes and evidence

| Correction | Frozen proposal | Planning verification |
|---|---|---|
| R1 | One table,10 part labels/10 anchor labels/15 symptom records; proposed PartDefinition label/anchorLabel; readable diagnostic/refusal copy | equipment-copy.ts + generated EQUIPMENT_COPY.md; machine IDs unchanged; all15 strings checked, no raw identifiers in presentation copy; DIAGNOSTIC_SUCCESS/WRONG_ANCHOR updated |
| R2 | Research Passport v1 entries require corrections=[]; typed sourceEvidence/trainingHistory/learnerConclusions projection; training never direct | Real core COLLECT/OBSERVE actions generate research entries. No positive fixture mutation of corrections; receipts derive one typed fan-repair-v1 record only after B20 observation. False direct stamp/receipt/source corrections fail; fault/review/complete examples added |
| R3 | Five ordered named derived checks; count equals done checks | Before/after fault/repair/qualification/observation/completion, after core save/load, and after qualification revocation; a mismatched count fails |
| R4 | LOCAL_LOCK_BUSY; LOCAL_WRITE_FAILED cause/writeOutcome; invalid note400 INVALID_REQUEST/noteIssue | Busy/quota/unknown read-back cases; blank/outer whitespace/surrogate/control/length failures preserve state and draft semantics; accepted internal tab/newline retained; valid fifth note is separate domain limit |
| R5 | Guided B20 source reading, no distractor or invented admitted hypothesis | Inspection still required; only canonical admitted observation collected; unknown claim recovery wording does not label all hypotheses unrelated |

Detailed decisions/conditions: [10_FINAL_CONSUMER_CORRECTIONS.md](10_FINAL_CONSUMER_CORRECTIONS.md). Exact frontend handoff: [09](09_CLAUDE_CONSUMER_HANDOFF.md). All M2 types/fields remain PROPOSED until the backend exists. C1–C4 pending-repair/locking/authentication/retry architecture remains; candidate3 changes labels/provenance/checks/consumer errors and bumps rulesVersion to m2-training-r3, preserving GameState v2/Passport v1 and raw recovery.

## Historical candidate3 commands and results (before this receipt correction)

Executed in the exact planning worktree using existing dependencies and Node24 at `/Users/asifzaman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` on PATH. No dependency installation/lockfile edit. Logs/type harness: `/private/tmp/m2-final-consumer/`.

| Command / check | Actual result |
|---|---|
| pwd, Git root/remote/branch/status/log/worktree inventory | Correct clean030e1e9 starting branch and sole V2 origin; other worktrees recorded for preservation check |
| `npm test` | **103 passed,5 files**,3.66s; existing game/science/contracts/API/Astra regressions |
| `npm run validate:data` | **1 source,1 admitted experiment,55 quarantined legacy rows**; local fixture hash matches. Remote links not rechecked |
| `node --import tsx docs/m2/fixtures/verify-contracts.ts --write` | Updated planning examples/copy/vectors/measurement fixtures;26 proof groups passed |
| `node --import tsx docs/m2/fixtures/verify-contracts.ts --emit-types /private/tmp/m2-final-consumer/typed-examples.ts` | Read-only drift/invariant checks;26 groups pass, including both repair histories and30 edit permutations; emits temporary literal harness |
| `node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop docs/m2/fixtures/contract-types.ts docs/m2/fixtures/equipment-copy.ts docs/m2/fixtures/verify-contracts.ts /private/tmp/m2-final-consumer/typed-examples.ts` | Full proposed types, label table/proof code and **32 complete typed examples** pass; expected errors cover missing diagnostic, historical symptom category, normal mode, client availability and training-as-direct |
| JSON/link/manifest/fence, frozen registry reasons, Git scope/whitespace and other-worktree checks | Pass:50 manifest files,34 valid JSON files, local links/fences; docs/m2-only changes; all5 other worktree HEAD/status pairs and pending registry SHA-256 unchanged; nine proposals unchanged; accepted ancestor present and322f2c2 excluded |

An initial strict check caught the newly requested LOCAL_LOCK_BUSY missing from the error-code union; it was added and the check rerun. Passing results refer to the final corrected files. The proof helpers are reference oracles, not production game/API/storage/auth code. Type compatibility and invariant/model assertions do not prove the unimplemented runtime works.

## Byte accounting

Actual current projection sizes are committed in [MEASUREMENTS.json](fixtures/MEASUREMENTS.json) and reproduced by the runner. Bodies use compact canonical JSON/UTF-8 bytes, including identity/signature/base64 overhead. Four maximum legal500-unit BMP notes are admitted through the ADD_LEARNER_NOTE expected-action oracle; research entries remain reducer-generated with empty corrections.

| Shape | UTF-8 bytes |
|---|---:|
| Representative full complete checkpoint:2 source entries,4 max legal notes,39 large wrong-choice cells+1 correct, max keyId/loopback port/revision | **13,415** |
| Signed token | **17,931** |
| Complete resume request | **18,078** |
| Larger pending-repair checkpoint | **3,228** |
| Last-command receipt / wrapper beyond TrainingCase | **136 /583** |
| Ordinary COMPLETE_RESPONSE (no learner notes) | **12,366** |
| Full complete ActionResponse stress projection including notes, named checks, three-section Passport and token/state | **39,965** |
| Full ten-finding diagnostic response, with isolated pre-fault metadata | **15,280** |
| Mathematical maximum token from20,480-byte payload | **27,351** |
| Resume request with maximum token | **27,498** |
| LocalSlot with maximum token/epoch/generation | **27,552**, below28,000 cap |

Previous candidate2 figures13,769/18,403/18,550 and32,785 are historical and were reproduced by the consumer. Removing fictional repairs from research correction arrays reduces checkpoint size; bounded derived presentation/checks increase response size. No source text/limitations/notes were truncated. The old2,048-byte escaped-surrogate note stressor is invalid under the well-formed Unicode policy; maximum legal500-unit note bytes remain1,502. Large histogram counters stress shape size, not a claim that those histories were executed.

**Actual current32KiB guard is request-only**, in apps/web/lib/api.ts MAX_BODY/readJson; the current Response.json success helper imposes no general matching response cap. Proposed M2 responses have their own65,536-byte precommit cap, not implemented. Therefore39,965 bytes is allowed by the proposed response contract and is not a32KiB request failure. State/token/local-slot/extracted checkpoint remain independently bounded. Tests cover separate request/payload arithmetic and65,535/65,536/65,537 response boundaries; actual streaming/runtime/browser memory tests remain required. Optional updates must preflight the entire essential completion suffix; serialization projections are not a proof every reachable state can finish.

## Consumer recommendations N1–N8

N1 adopt caller grant state/expiry without secret. N2 adopt optional authenticated409 runtime/currentRevision context, no unauthenticated leak. N3 add qualification/conflict/restart/reuse/rate/key/diagnosis/resume examples. N4 derive exact byte budget with no client admission authority. N5 require one shared pure canonicalJson implementation plus fixed Node/browser vectors before runtime integration. N6 defer optional per-part lock-hint DTOs; existing metadata/action eligibility suffice. N7 keep all POSTs/refusals/retries within the unchanged30/min budget; use local inspection,2.1s controller pacing and truthful429 recovery, test8 mistakes. N8 require lazy gameplay/3D loading while public descriptions remain light. Rationale and exact fields are in10.

## Browser evidence and remaining gates

The owner’s consumer report says Chromium cross-process stress found zero lost updates; it was **not rerun here**, and no extra evidence path was provided. Firefox/WebKit remain untested. Writable persistence requires independently accepted cross-process lost-update/visibility tests for each supported engine/build family, with versions/OS/process method/iterations/commit, plus crash/reopen, stale response, exceptions and recovery. Until accepted for an engine, use LOCAL_READ_ONLY and exact raw checkpoint download/read-only restore even when Web Locks exists. Notifications are never atomic synchronization. These are acceptance requirements, not passing browser results.

Astra must approve the exact new candidate SHA before implementation. No remaining substantive consumer choice is left undefined: frozen copy, separate training provenance, named predicates, note status/code policy, local errors, source activity, compatibility gates and N1–N8 decisions are specified. Any reviewer amendment must update types/examples/proofs/docs together. Next stage after approval remains Sol backend foundation, then Claude full accessible2D,3D/joint hardening, Astra real vertical-slice review. No activation/release follows from this delivery.

## Preserved scope and science

B20 alone,17.4 vol% calibrated oxygen;55 other records quarantined; B16/B19 unresolved; source apparatus functions versus schematic geometry; no simulation-to-direct promotion; source limitations separate from unassessed notes; deterministic ranking/Ask/abstention unchanged. Original lineage validation/raw-save recovery remain, with new scenario provenance checks separate. Human scientific approval remains distinct. Nine registry proposals and the six pending edits are preserved; no Available change. Production reducers/shared exports/data/API/frontend/assets/config/lockfile are untouched; reference repositories read-only.

Not run: new M2 runtime API/E2E, browser locking in any engine, build/lint/audit, native accessibility/device/network-memory profiling, live balance or paid generation. No push, merge, deployment, mission unlock, preview activation, Meshy job or scientific promotion occurred.

## Final receipt correction — current verification

Astra's exact independent review is `/Users/asifzaman/.codex/visualizations/2026/10/14/01a13b66-4da0-7bc2-a7ec-1e54cfa974fd/astra-m2-final-contract-review/FINAL_M2_CONTRACT_REVIEW.md`. Its unchanged evidence script reproduced10 pass/1 fail before the correction. The independently literal-driven new verifier also failed on the old observation digest before regeneration, so its expected identity is not taken from a fixture receipt.

Root cause: payload() guessed RUN_DIAGNOSTIC from a final-state fallback, even when OBSERVE_DOCUMENTED_RESULT produced the evidence. It now requires an explicit accepted commandId; all snapshot callers pass their known last commit. OBSERVATION_REQUEST defines the real revision21 intent; PASSPORT_REVIEW_RESPONSE revision22 records **a0a190413768284c7b63632204e414d69aa0dbf42a4a93ac26a3263b3555117e**. Its token is deterministically regenerated and the state/scientific projection is unchanged. Completion remains revision23 with its own completion identity. Refusals/resume preserve accepted receipts.

The early qualification example is renamed QUALIFICATION_REPAIR_REQUIRED_RESPONSE and now returns200 domain REPAIR_REQUIRED before physical qualification, preserving revision14/current token/progress. The outdated core QUALIFICATION_FAILED illustration is removed. That code remains valid after required diagnosis/repair when another apparatus fault exists. Mandatory repair semantics are not weakened.

Explicit identity propagation also exposed a shared-reference fixture bug: later fault/diagnosis mutations leaked into source/duct training metadata. Clone the rig before injection. WRONG_ANCHOR_RESPONSE now has a real pre-fault revision1 setup, no future diagnosis, not-run diagnostic and the accepted duct-install receipt at session5. This is necessary state/receipt consistency, not a runtime change. The corrected diagnostic projection is15,280 bytes; all other bounds remain unchanged. No unrelated example or source text is changed.

Current evidence directory: `/private/tmp/m2-receipt-correction/`. Exact commands/results follow. All33 wire/local-result examples remain proposed. The existing26 planning groups and new6 independent conformance groups have separate scopes; neither proves an unimplemented coordinator or browser adapter.


| Current command / check | Actual result |
|---|---|
| `node --import tsx /Users/asifzaman/.codex/visualizations/2026/10/14/01a13b66-4da0-7bc2-a7ec-1e54cfa974fd/astra-m2-final-contract-review/evidence/independent-checks.ts` | Before:10 pass/1 fail, exit1. After:11 pass/0 fail, exit0. Script unchanged; fixed observation digest no longer equals diagnostic digest; all byte projections retained |
| `node --import tsx docs/m2/fixtures/verify-receipts.ts` | Red against old fixture:wrong commandId, exit1. Final:6 groups pass, exit0; literal request/digest/HMAC/state, correctly signed wrong receipt rejection, subsequent completion, qualification guard/refusal invariants, pending repair/legitimate physical failure and resume identity |
| `node --import tsx docs/m2/fixtures/verify-contracts.ts --emit-types /private/tmp/m2-receipt-correction/typed-examples.ts` | All26 existing groups and committed-fixture drift checks pass, exit0; two distinct removal histories and30 legal permutations retained |
| `node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop docs/m2/fixtures/contract-types.ts docs/m2/fixtures/equipment-copy.ts docs/m2/fixtures/verify-contracts.ts docs/m2/fixtures/verify-receipts.ts /private/tmp/m2-receipt-correction/typed-examples.ts` | Pass, exit0; all33 wire/local-result literals plus both verifier files and proposed types |
| `npm test` | 103 passed,5 files,3.80s, exit0 |
| `npm run validate:data` | 1 source,1 admitted B20 experiment,55 quarantined rows; local fixture hash matches, exit0; no remote source recheck |
| JSON/manifest/local links/fences, Git scope/whitespace, ancestry, other worktrees and protected contracts | Pass:52 manifest files/35 JSON/33 examples; docs/m2-only; five other HEAD/status pairs/pending registry hash unchanged; R1 copy/R2–R5 types/canonical vectors/nine registry proposals unchanged;322f2c2 excluded |

Future shared canonicalJson, idempotency/authentication, raw recovery, three browser-engine consistency gates, scientific approval and implementation ordering remain as accepted in substance. The new fixed-input test oracle does not replace the future shared serializer. No runtime endpoints/coordinator/browser persistence exist yet. Approval of this exact new correction commit remains Astra's task; this delivery is **READY FOR ASTRA FINAL M2 CONTRACT RECHECK**.


Exact correction paths (all under docs/m2):

- 03_PREVIEW_AND_FRONTEND_CONTRACT.md
- 07_VERIFICATION_AND_REVIEW.md
- 09_CLAUDE_CONSUMER_HANDOFF.md
- README.md
- fixtures/MEASUREMENTS.json
- fixtures/OBSERVATION_REQUEST.example.json (new)
- fixtures/PASSPORT_REVIEW_RESPONSE.example.json
- fixtures/QUALIFICATION_FAILED_RESPONSE.example.json → fixtures/QUALIFICATION_REPAIR_REQUIRED_RESPONSE.example.json (renamed/corrected)
- fixtures/README.md
- fixtures/WRONG_ANCHOR_RESPONSE.example.json
- fixtures/verify-contracts.ts
- fixtures/verify-receipts.ts (new)
