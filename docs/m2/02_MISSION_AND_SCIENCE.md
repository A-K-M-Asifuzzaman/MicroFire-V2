# First playable episode: reconstruct, diagnose, repair, inspect

Proposed episode ID **bass-b20-training-v1**. It deliberately spans the existing `station-arrival` and `bass-assembly` missions so neither mission order nor old save IDs need changing. Do not unlock the other three missions or seed fake prerequisite completions.

## Player loop and meaningful consequences

| Step | Player action | Authoritative consequence / requirement |
|---|---|---|
| Station entry | Authorize local preview; follow source terminal instead of fictional alert | Server creates a fresh demo case and START_MISSION station-arrival; false alert is authored fiction, not NASA telemetry |
| Source orientation | Open B20 source/conditions, select its canonical observed statement, collect it | INSPECT_EVIDENCE → COLLECT_EVIDENCE → COMPLETE_MISSION station-arrival; first cited Passport entry. Guided source reading offers only the admitted observation; no distractor is used |
| Equipment assembly | Start bass-assembly; select ten parts, choose anchors and orientations | Existing dependency/anchor guards accept or refuse each placement; current setup visible; no arbitrary drag collision determines eligibility |
| Fault introduction | Finish an initially correct rig | Coordinator atomically removes/reinstalls the fan reversed once; labels the deliberate training fault. New revision, no qualification; never described as an actual B20 incident |
| Diagnosis | Inspect orientation/flow-path schematic, run diagnostic, submit part + fault category | Coordinator calls diagnose on real installed parts. Wrong diagnosis gives targeted feedback and recorded aggregate choice counts; no progression credit |
| Repair | After correct diagnosis, remove fan and reinstall facing into duct | Existing REMOVE_PART/INSTALL_PART; no auto-repair button. Reversed replacement remains faulty; qualification remains unavailable |
| Training qualification | Run the check after repair | Requires diagnosed episode fault, actual repair sequence and diagnose(...).qualified at current revision; then core QUALIFY_INSTRUMENT |
| Verified B20 observation | Open historical B20 evidence panel and source pointer | Coordinator checks pinned record/hash/regime and qualification; calls OBSERVE_DOCUMENTED_RESULT. Source text, not a simulated flame, produces scientific evidence |
| Evidence Passport | Review source/limitations, repair annotation and optional learner notes; finish | Current core research entries with empty corrections, a separate typed authored-training projection, canonical caveats and separate learner notes; COMPLETE_MISSION bass-assembly only after all episode gates |
| Save/reload/continue | Explicit Save; reload at any checkpoint and resume | Signed preview checkpoint restored and revalidated; same phase, part states, proof and notes. Reauth if needed; no normal/demo legacy overwrite |

The initial station source exercise necessarily exposes the source observation before the workshop: existing Station Arrival completion requires a real observed claim. This is source familiarization, not a blind prediction task. After qualification the player must deliberately inspect the B20 result again; do not imply the game produced or independently measured it. Flame Detective's later prediction mechanic remains a separate stage.

## Ten existing components, with exact anchors and dependencies

Hardware references: NASA NTRS **20210011385**, PDF **12–13**, printed **4–5**, §1.2. Dimensions, component functions and general viewing directions were freshly checked in the primary report. Anchor names/dependency order/orientation labels are the existing **educational model**, not extracted engineering interface specifications.

| partId | anchorId | requires | Source-supported function / geometry boundary |
|---|---|---|---|
| flow-duct | msg-work-volume-mount | — | 7.6 × 7.6 × 17 cm duct; rounded corners described, radius unspecified |
| fan | duct-inlet | flow-duct | Variable-speed forced airflow through duct; no invented motor performance or reverse-flow numerical model |
| flow-straightener | duct-honeycomb-slot | flow-duct | Honeycomb and inlet screen reduce swirl; cell size/pitch not provided |
| nitrogen-nozzle | test-section-n2-port | flow-duct | N₂ nozzle in test section; nozzle diameter/precise coordinates unspecified |
| sample-holder | top-mounting-rail | flow-duct | Mounting rail and opposed/concurrent sample configurations; slot dimensions and tolerances unspecified |
| igniter | front-window-igniter-lever | sample-holder | Lever-operated hot wire; selection is a logical training action, not live ignition/electrical instructions |
| still-camera | top-window | sample-holder | Still camera views through top window; report mentions 60-mm lens, not a game camera body size |
| video-camera | front-window-mirror | sample-holder | Front-window turning-mirror view; description continues on PDF 13; mirror/camera transforms schematic |
| radiometer | downstream-top-back-corner | flow-duct | Detector views upstream; signal uncalibrated. No synthetic temperature or heat-flux readout |
| exit-plate | duct-exit | flow-duct | Perforated copper plate then brass screen; hole sizes/thickness unspecified |

Ten named parts are a teaching subset, not an assertion that this list exhausts the flight system. The report also describes controls, plumbing, sensors and restrictors. M2 adds no unsourced connection/pressure/electrical graph. Wrong “connections” in this slice mean selecting a wrong **existing named anchor** or dependency ordering; adding wire/hose mechanics requires a later sourced contract.

Use one dimensionally scaled procedural duct; other parts and placements clearly say **Schematic training model; mounting order is educational**. The existing large artistic Observatory chamber and Meshy consoles/PIX are narrative props, never an authentic BASS-II reconstruction. No source photograph/figure redistribution is implied by facts-only rights. Link to the report instead.

## Fault engine specification

Required introduced fault: **training-fan-reversed-v1**. No randomness or paid service. Trigger once, when all ten parts first pass diagnose, bass-assembly is active and no episode fault has been introduced. Within the candidate transaction: accept final installation → core REMOVE_PART fan → core INSTALL_PART fan/reversed. Only publish/sign if every inner step and every budget/invariant check succeeds; otherwise keep the pre-request state and all revisions unchanged.

| Category | How it occurs | Observable feedback | Diagnosis/repair and consequence |
|---|---|---|---|
| REVERSED fan (required) | Authored controller injects once after initial correct assembly | Explicit training-fault notice; orientation marker and schematic directional arrow; qualification says mismatch, no fake measured velocity | Run diagnostic at this revision, identify fan/REVERSED, remove/reinstall correct; required episode repair evidence |
| REVERSED camera/holder/radiometer (player-created) | Player chooses reversed orientation for one of the five supported orientationFault parts | Source-purpose explanation, schematic incorrect view/regime indicator | Existing exact repair text; must correct before zero-fault qualification; never claims these failed historically |
| MISSING | Part not installed / player removes a leaf | Empty named mount; missing part in diagnostic | Install at existing anchor after its prerequisites |
| WRONG_ANCHOR / MISSING_PREREQUISITE | Proposed action refused; or corrupted saved rig | Specific core refusal; no accepted invalid geometry | Correct selection/order. Such states cannot be signed or loaded as reachable, qualified apparatus |

RUN_DIAGNOSTIC records the current setup revision and returns the explicit typed `snapshot.diagnostic` projection specified in03: authored observable symptom, model inference, repair and sourced purpose per finding. This first slice is guided and may reveal the exact repair; an investigator-mode control remains deferred. A diagnostic is not a physical sensor and must say **Training check**.

SUBMIT_DIAGNOSIS must identify the injected fan/REVERSED fault observed in a diagnostic at its current faulty revision. Wrong answers are recoverable accepted training actions with `feedback.correct:false`; increment bounded-by-safe-integer aggregate counts per choice, keep first/last wrong choice for coaching, do not mutate the rig or qualify it. A stale diagnostic requires rerunning the check. Correct diagnosis unlocks manual repair. No attempt cap, countdown lockout, success probability or forced reset.

Before correct diagnosis, removing/reorienting the injected fan is refused with DIAGNOSIS_REQUIRED; irrelevant repairs do not satisfy the episode. After diagnosis, an accepted fan removal persists pendingRepair (cause/target/exact removal revision/time); correct reinstall consumes it into one completed repair receipt. Reinstalling reversed clears the pending receipt without producing a completed receipt; a subsequent removal creates a fresh pending receipt; the learner can remove/retry indefinitely. Other damaged parts still block qualification. Diagnose is always recomputed; never trust a client `repaired:true` value.

Every accepted setup edit clears qualification through existing changeSetup behavior. A later edit before observation returns to assembly/repair checks; a historical repair receipt is not current apparatus qualification. It need not cause the controller to inject a second fault. Once the B20 observation is recorded, the episode enters Passport review and locks further rig edits: finish/save that case, then explicitly start a separate case to rebuild. This bounds growth without silently deleting invalidated observations or learner progress. Full campaign rework/revisit semantics remain unchanged outside this preview coordinator.

## Scoring, summaries and learning

Use five named derived learning checks (exact IDs/labels/predicates/count invariant in10): source collected, rig qualified, required fault diagnosed/repaired, B20 lineage matched, episode completed. Display progress such as “3 of 5 learning checks”; never a fire-risk/confidence/safety score. Wrong attempts change feedback and aggregate training counts, not a permanent grade or lost scientific evidence. No speed bonus. Identical state/action/catalog/time produces identical output.

The checkpoint records current part choices, the injected fault, first/last wrong diagnosis and per-choice counts, accepted repair before/after revisions, source inspection and notes. It is explicitly an **action summary**, not an exhaustive click/drag event log. Counts are not silently truncated. Refuse only overflowing wrong-count increments before mutation; a correct diagnosis remains possible without incrementing a full wrong-choice cell. No hidden deletion of scientific text or learner notes is allowed.

## Scientific qualification and evidence rules

| Item | Permitted representation | Forbidden inference |
|---|---|---|
| Training build/fault/repair | Authored training event, origin label “Training simulation”; logical fit/direction check | A historical NASA failure or verified real-world instrument performance |
| B20 observation | Existing canonical observed research claim, exact claim ID/locator, direct **for that source observation** | Gameplay repair caused B20's historical combustion result |
| 17.4 vol% O₂ | Recorded calibrated initial/final value, PDF 112 | Adjacent uncalibrated 16.5; universal calibration offset |
| Flow | Initial 5 cm/s and preserved raw sequence `5, 3, pot 0.5` | Constant 5 cm/s for the whole run, or pot 0.5 = 0.5 cm/s |
| 100 µm / 0.1 mm | Recorded thickness and clearly labeled unit conversion | A newly measured game thickness or sensor calibration |
| Pressure / run acceleration | Unknown, no numeric estimate; ISS microgravity context can be described | Fill with zero, series pressure or a lunar/Earth value |
| Learner causal explanation | Unverified note/interpretation, separate from source text | Source-supported causation, semantic approval because citation exists |
| Unsupported temperature/lunar/AI claim | Gap/abstention with limits | Direct evidence from matching setup, animation or completion |

Pin dataset `p0-bass-b20-v1`, catalog SHA-256 `1f9d4883791da73e256af09eb3994805b53c3a394eff3db0f0d066fc558779dc`, experiment `bass2-b20`, claim `bass2-b20-burned-entire-sample`, flowDirection `opposed`, oxygen 17.4. Only the real catalog object is passed to transitions. The local launcher runs the existing validate:data integrity gate against shipped fixture bytes before binding, and the API imports that trusted catalog directly: a client-supplied Catalog or hash string is never accepted. A hash label on an arbitrary Catalog object is not integrity verification. The coordinator also enforces the single admitted B20 record/claim and opposed-flow/oxygen guard, so its injected-Catalog unit tests cannot substitute an incompatible record. A mismatched record, changed hash, derived-only claim, unknown ID or synthetic concurrent-flow record fails before observation; raw progress stays recoverable.

All **55 other legacy rows remain excluded**. B16 and B19 each have calibrated initial/final **17.3/17.2**, versus legacy B16 16.5/16.4 and B19 16.4/16.3. Restrictor differs (B19 0; B16/B20 2); pot/velocity, procedure and anomaly caveats remain. Their source-cell review status is not runtime admission. No promotion or new NASA field is part of M2.

## Passport composition — R2 final candidate

Reuse the two **research** entries generated by real Station Arrival COLLECT_EVIDENCE and Assembly OBSERVE_DOCUMENTED_RESULT reducer actions. Both have canonical conclusion/citations/limitations and **corrections=[]**. Learner notes remain their own learnerNotes field and are never source conclusions. No training string is inserted into a research correction array, even with a prefix.

`Snapshot.passportPresentation` exposes structurally distinct sourceEvidence (research entry references), trainingHistory (authored-training, evidenceLevel:not-applicable, historicalNASAEvent:false) and learnerConclusions (learner-authored, scientificValidation:not-assessed). It is recomputed from the single core Passport and authoritative signed training receipts, not persisted as a second Passport. After the guarded B20 observation action, the Assembly view derives exactly one fan-repair-v1 annotation; before it, trainingHistory.corrections is empty. The annotation's exact setup-revision fields/template and equality checks are frozen in [10](10_FINAL_CONSUMER_CORRECTIONS.md#r2--structural-passport-provenance-no-prefixes-as-authority). A raw source-only Passport export does not falsely claim to contain training history; the full case checkpoint retains the receipts for faithful reconstruction.

ADD_LEARNER_NOTE is proposed only during Passport review. At most4 notes, each≤500 UTF-16 units/2,048 serialized bytes. Invalid content returns **HTTP400 INVALID_REQUEST with noteIssue** before command hashing/mutation; preserve the editor input, never trim/normalize/truncate it. Valid fifth note is a separate HTTP200 NOTE_LIMIT_REACHED refusal. Canonical limitations stay immutable, and lineage validation does not assess learner prose. [R4](10_FINAL_CONSUMER_CORRECTIONS.md#r4--precise-save-and-note-failures) defines exact controls, Unicode, errors and recovery.

Named learning checks, label/copy tables, guided source reading and consumer decisions are authoritative proposals in [10](10_FINAL_CONSUMER_CORRECTIONS.md). Station Arrival has no authored distractor in this slice, no invented NASA claim and no hypothesis-judgment score. It teaches tracing the one admitted observation to conditions/source/limitations. Broader classification mechanics remain deferred.

## C2 — Repair transition contract

Candidate2 chooses explicit bounded **pending provenance**, preserving intervening part edits. No second placement reducer or GameState/Passport version change. Every row delegates actual install/remove/qualification to existing core; metadata and signing are in one candidate transaction. Session revision advances once per accepted command; core setup revision advances only for install/remove. Domain refusal leaves every field/checkpoint unchanged. Pure coordinator always receives the complete TrainingCase; it must not read an unstored last-click variable.

| Stage / precondition | Authoritative state / action payload | Deterministic result / revisions / persistence | Refusal and recovery / scientific meaning |
|---|---|---|---|
| First healthy ten-part assembly; no prior fault | final GAME INSTALL_PART (or repair of an initial player fault) | atomic core edit then remove/reinstall fan reversed; fault id/time/introduction revision persisted; session+1, setup+3 for final installation | Any inner/budget failure rolls back all; introduced training incident, never NASA telemetry |
| Fault present, assembly active | RUN_DIAGNOSTIC | diagnosticRevision=current setup; session+1, setup unchanged; findings derived, not persisted | Wrong phase refused; visible symptom/purpose, training check only |
| Fan reversed; current check shows it; no diagnosis yet | SUBMIT_DIAGNOSIS partId/faultCode | wrong answer updates bounded summary/feedback only; correct fan/REVERSED persists diagnosis(time,faultyRevision); session+1 | Missing/stale→DIAGNOSTIC_STALE; correct diagnosis remains possible after arbitrary recoverable wrong attempts |
| Correct diagnosis, fan installed reversed, no completed repair | GAME REMOVE_PART fan | core removal; **pendingRepair={faultId,partId,removedAtRevision:new setup revision,removedAt:at}**; session+1, setup+1 | Earlier removal denied DIAGNOSIS_REQUIRED; duplicate remove core NOT_INSTALLED unchanged; save/reload retains exact cause and removal |
| Pending repair, fan absent | other permitted core part edit / RUN_DIAGNOSTIC | preserves pending removal/time and correct historical diagnosis; setup edit stales diagnostic, clears qualification; session+1 | Dependency/anchor/core refusals unchanged; rerun checks as desired; no forced reset |
| Pending repair, fan absent | GAME INSTALL_PART fan/reversed at duct-inlet | core install accepted, pending=null, repair=null, session+1/setup+1; still faulty | No receipt; remove again after diagnosis retained, creates fresh pending; no permanent lockout |
| Pending repair, fan absent | GAME INSTALL_PART fan/correct at duct-inlet | core install; repair={...pending,reinstalledAtRevision:new setup revision,at}; pending=null; session+1/setup+1 | Wrong anchor/order unchanged; actual manual repair, not a NASA observed event |
| First repair already completed | later core edits before observation | preserve first historical repair unchanged; never create second receipt or overwrite original removedAtRevision; qualification cleared by core | New reversed fan/missing part must still be repaired for current qualification; no repeat achievement/score |
| Completed receipt, no pending, all ten parts correct | GAME QUALIFY_INSTRUMENT | core qualifiedRevision=current setup; session+1, setup unchanged | Missing receipt→REPAIR_REQUIRED; remaining faults→QUALIFICATION_FAILED; training configuration check only |
| Current qualification and required history | explicit GAME OBSERVE_DOCUMENTED_RESULT B20 | canonical B20 Assembly entry plus one separately typed training-history record; session+1; lock later rig edits | Wrong source/hash/regime→SCENARIO_MISMATCH/EVIDENCE_REJECTED; no fictional outcome promoted |

Historical diagnosis identifies the introduced fault at its then-current faultyRevision, which can be greater than introduction if other parts were edited first. Subsequent rig edits stale only the diagnostic display, not that earned identification. Qualification recomputes all current faults even if the earlier diagnostic is stale. The completed repair is history, not an assertion the fan remains healthy forever.

**Astra's exact histories remain legal and become distinguishable.** Starting introduced/diagnosed at setup12: A removes fan13, exit plate14, reinstalls exit15 → pending.removedAtRevision=13. B removes exit13, reinstalls exit14, removes fan15 → pending.removedAtRevision=15. Both have the same core rig at15, but different authoritative Training metadata. After save/load and fan reinstall at16, completed receipts truthfully retain13 and15 respectively. RemovedAt timestamps remain the actual accepted action time. No later action guesses “current−1”.

**Markov sufficiency invariant:** for identical validated TrainingCase, action, catalog and time, next core state, metadata, eligibility and feedback/refusal are identical; no hidden repair history is consulted. Different histories that need different future receipts must differ in persisted pending/completed metadata. Proof fixtures replay both histories using the real core and a minimal receipt oracle, save/load every intermediate core state, compare metadata round-trips and explore reorderings. This is specification evidence, not an implemented transitionTraining test.
