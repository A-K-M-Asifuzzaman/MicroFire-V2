# Existing engine inventory

All observations refer to b6d15a47ec25f57350896f1dc63dc59192f57b00. “Implemented” here means backend code exists. It does not imply frontend integration, end-to-end gameplay or release approval.

## Reuse map

| Existing location/export | Implemented behavior | Tests / limits |
|---|---|---|
| packages/shared/src/game.ts: GameStateSchema, GameActionSchema, missionDefinitions | v2 state, strict typed actions, contiguous mission completion prefix, current Passport proof requirement, setup revision invariants | contracts.test.ts, game.test.ts; no persisted training episode/fault history |
| packages/game-core/src/index.ts: createGameState | Empty v2 normal/demo case; guided mode | Game tests; mode does not authorize a start |
| transition, registryAvailability | Strict action parsing, mission availability and prerequisites, recoverable action failures with old state | “production gating” tests; START_MISSION is UNAVAILABLE for all five in normal **and demo** by default |
| partDefinitions, BASS_HARDWARE_CITATION | Ten stable part/anchor IDs, source descriptions, educational dependencies, five orientation faults | Game/contracts tests; coordinates and connection sockets are not a NASA construction procedure |
| diagnose, setupIsConsistent | Missing, wrong anchor, orphaned dependency, reversed supported components; rig qualification | Wrong-anchor and orphaned states are unreachable by accepted actions and rejected on restore/save |
| transition INSTALL_PART/REMOVE_PART | Dependency/order/anchor/duplicate/removal guards; reversed orientation can be accepted as a repairable fault | Accepted changes increment setup revision and invalidate dependent proof; no arbitrary wire or hose graph exists |
| QUALIFY_INSTRUMENT | Requires zero diagnosed faults at current revision | Educational qualification only; does not simulate ignition, fluid dynamics or instrument accuracy |
| INSPECT_EVIDENCE/COLLECT_EVIDENCE | Catalog-only inspection; Station Arrival collects observed research claims with sources after inspection | Unknown/quarantined references fail; no UI proof of actual human reading |
| OBSERVE_DOCUMENTED_RESULT | Qualified setup required; creates cited research Passport entry keyed by mission/record/revision | No numerical combustion simulation; currently accepts any catalog observation if rig qualifies, so preview must bind strictly to B20 |
| PREDICT_OUTCOME | Flame Detective: prediction for current setup required before result; original prediction cannot be rewritten afterwards | Tests preserve sequencing; not a blinded experiment because public dossier/earlier missions disclose outcome |
| CLASSIFY_CLAIM/claimTrialStatements | Claim Trial: four teaching statements, latest classifications determine correctness, 200-entry history compacted by superseded attempt | Correction remains possible after cap and reload; Passport corrections limited to 100, not exhaustive event log |
| RECORD_DECISION/PROPOSE_NEXT_TEST/REMOVE_PROPOSAL | Lunar stage accepts only insufficient evidence; notes separate from canonical caveats; removable proposals recover budget | Fictional scenario, gap applicability; no safe/unsafe verdict awarded |
| COMPLETE_MISSION | Five distinct criteria; later prerequisite revocation yields instructions rather than invariant crash | Assembly currently needs qualification + observation, **not mandatory diagnosis/repair** |
| exportPassport | Existing Passport v1 export object; no second format | Scientific validator checks exact lineage/caveat preservation, not arbitrary prose or achievements |
| saveProgress/loadProgress/migrateV1 | v2 save, v1 migration, normal/demo isolation, apparatus consistency and size checks | Several load failures remain recoverable; schema-valid load is not scientific validation |
| readRawSave/discardSave | Exact raw retrieval, discard only with explicit confirmation token | No automatic overwrite of corrupt, unsupported or mismatched save |
| packages/science/src/catalog.ts: catalog, catalogSha256, validatePassport, citationUrl | One admitted B20; canonical citations/limitations; exact locator lineage | Does not semantically validate learner conclusions or prove play history |
| science/evidence.ts + ask.ts | Ranking support separate from relevance; deterministic Ask and abstention; citation resolution | Preserve all corrected scientific semantics and existing evaluation cases |
| apps/web/lib/api.ts | Research endpoints only; JSON streaming 32 KiB guard; 300 GET / 30 POST per process/minute; safe envelopes | **No mission start/action/session/preview/save HTTP endpoint currently exists** |
| apps/web/components/client-api.tsx: callApi/useLatestRequest | Research transport parses only existing ApiErrorSchema; failure result has no code; latest-request-wins abort helper | Do not use unchanged for game error codes or mutating action sequencing; game commands serialize and recover ambiguous responses |
| apps/web/components/passport-preview.tsx | Restore/read/lineage-validation/raw-download UI, own-key-safe catalog Map lookups, per-entry error boundary | Normal save read-only; no earned-entry game producer or preview-checkpoint reader |
| apparatus.tsx, gravity-lens.tsx, Observatory/PIX components | Source-linked exhibit selection and illustrative graphics | Apparatus selection is not installation; Lens gravity slider is not game-state/physics authority |
| missions pages | Honest mission descriptions/map, Passport links | No start/play/HUD/repair/save browser loop |

## Current action contracts, unchanged

Use imported `GameAction` / `GameActionSchema`, not parallel frontend definitions.

| Action | Required payload beyond type | Existing stage |
|---|---|---|
| START_MISSION | missionId | Any; availability/prerequisite checked |
| INSPECT_EVIDENCE | experimentId | Any; catalog only |
| COLLECT_EVIDENCE | experimentId, claimId | station-arrival |
| INSTALL_PART | partId, anchorId, orientation: correct/reversed | bass-assembly or flame-detective |
| REMOVE_PART | partId | Same |
| QUALIFY_INSTRUMENT | none | Same |
| PREDICT_OUTCOME | experimentId, prediction | flame-detective |
| OBSERVE_DOCUMENTED_RESULT | experimentId | bass-assembly or flame-detective |
| CLASSIFY_CLAIM | claimId (trial statement ID), kind, evidenceLevel | claim-trial |
| RECORD_DECISION | verdict: insufficient-evidence/safe/unsafe | lunar-habitat; safe/unsafe rejected |
| PROPOSE_NEXT_TEST | question, limitations | lunar-habitat |
| REMOVE_PROPOSAL | index: 0..19 | lunar-habitat |
| COMPLETE_MISSION | missionId | Active mission only |

`transition(state,input,catalog,at,options?)` requires a **schema-valid incoming state** and can throw on invalid incoming state. Bad actions return failures; do not advertise this as a total parser for arbitrary restored JSON. Parse/load at the boundary first, catch unexpected server errors, and validate scientific references separately.

## What M2 must add, without replacing correct systems

- Server-authorized local preview and explicit two-mission allowlist. Existing `options.isMissionAvailable` is a pure testing seam, not authentication. Never expose callback control in an HTTP payload.
- Pure coordinator, `transitionTraining`, enforcing the authored episode sequence, one deterministic introduced fan fault, diagnostic/repair prerequisites and B20-only binding. Calls the existing reducer for installations, removal, qualification, source collection and mission completion.
- Structured bounded training summary (fault/diagnosis/repair and choice counts), recoverable note editing boundary and preview checkpoint provenance. This metadata is currently absent.
- API adapter with session serialization, expected-revision checking, idempotency and safe checkpoint resume. Do not trust client-supplied completed missions, activeMission or validation booleans.
- Claude's real apparatus manipulation/HUD, training-vs-source presentation, earned Passport and persistence controls. 2D and 3D share backend state and command vocabulary.

No proven current reducer transition needs to be rewritten for the two-step B20 slice. The coordinator must add missing guards; existing core behavior remains the reusable authority for mechanics. If implementation discovers a core defect, isolate and review a tested correction before integration.

## Deferred scientific/architecture issues

The existing Astra test “future corpus gate” intentionally demonstrates that a synthetic concurrent-flow record can be observed with the B20 apparatus. Do not mistake that passing demonstration for a resolved scientific binding feature. The M2 coordinator pins dataset hash, B20 ID and claim/flow regime; rejects all substitutes before core observation. General multi-record apparatus compatibility remains a later contract gate.

Another documented test demonstrates that a test-only arbitrary Ask composer can attach a valid locator to false prose. The deployed deterministic composer is bounded/authored; no generative composer or new conclusion writer is authorized here. Citation lineage is not semantic entailment.

Claim Trial's thickness tutorial currently expects derived/direct whereas ranking caps supported derivation at analogous. This is a teaching-label/applicability distinction that needs explicit review before that later mission's UI; M2 does not unlock or amend Claim Trial. Likewise historical specs mention B16/B19 presets, but current quarantine rules override that aspiration.
