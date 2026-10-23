# Final consumer corrections — candidate3, PROPOSED

Previous commit **030e1e9283d0887a0d5464fd668e3fa5e675bbc3**. Claude accepted C1–C4 in substance and requested R1–R5. This document freezes those targeted amendments for Astra review. No M2 runtime API, coordinator, browser adapter or production PartDefinition export is implemented here. All changes remain under docs/m2. Existing accepted M1.5 ancestry and pending registry edits are preserved.

## R1 — One equipment language

[The frozen table](fixtures/EQUIPMENT_COPY.md) gives all10 part labels,10 anchor labels and exactly15 reachable symptom/interpretation/repair records. Its sole authoring source is [equipment-copy.ts](fixtures/equipment-copy.ts). Machine partId/anchorId values stay unchanged. The candidate exported `ProposedPartDefinition` extends the existing definition with `label` and `anchorLabel`; `equipmentDefinitions` demonstrates that shape as a planning fixture. Sol will add those reviewed fields to the **real** exported definitions only in the authorized backend stage. Claude consumes the same export for2D/3D/HUD/a11y and does not maintain another dictionary.

DiagnosticFinding carries partId,partLabel,anchorId,anchorLabel plus the existing categories. Copy is selected by stable part/fault IDs, not by string-replacing raw core errors. The future server presentation adapter preserves core failure codes but supplies the frozen readable refusal templates, using named labels for contextual prerequisites/dependents/anchors. Internal IDs may appear as machine metadata/debug context, never substitute for player labels. The existing production reducer text is unchanged in this documentation assignment.

Exact examples:

- `{partId:"fan",anchorId:"duct-inlet",partLabel:"Fan",anchorLabel:"Duct inlet"}`.
- Wrong mount: **“The fan fits at the duct inlet. Choose that mount before installing it.”**
- Reversed symptom: **“The fan’s training direction marker points out of the duct.”**
- Repair: **“Remove the fan and reinstall it at the duct inlet, facing into the duct.”**

These describe a schematic training state, not a historical fault or a measured flow. Source purpose remains separately cited; detector calibration, real dimensions and unrecorded measurements are not invented. Unreachable wrong-anchor/orphan diagnostic copy is still readable for safe recovery, but such rigs cannot become accepted saved states.

## R2 — Structural Passport provenance, no prefixes as authority

Keep **Passport v1 unchanged**. Its two research entries contain canonical B20 observations/citations/limitations and separate learnerNotes. **Station Arrival corrections=[] and Assembly corrections=[]**, with no training events in either array. No evidence stamp applies to an entire combined case.

New **derived `snapshot.passportPresentation`** has three typed sections:

| Section | Authoritative origin / content |
|---|---|
| sourceEvidence | origin=research; references existing Passport entry IDs; correctionPolicy=none. Render canonical source observation/citations/limitations from state.passport exactly once |
| trainingHistory | origin=authored-training; evidenceLevel=not-applicable; historicalNASAEvent=false; zero or one generated TrainingCorrection. It cannot hold direct/analogous evidence |
| learnerConclusions | origin=learner-authored; scientificValidation=not-assessed; entryId/noteIndex/text references the accepted learnerNotes. No source-backed label inherited |

The training section is **not a second Passport or persisted array**. The signed Training fault/diagnosis/repair receipts are the authoritative stored history. After the approved **GAME OBSERVE_DOCUMENTED_RESULT B20** coordinator action creates the canonical Assembly evidence through the existing reducer, the server derives the single training record. No record appears before that evidence review step. GET/resume/export rederive it; no user-supplied correction strings or saved projection is trusted. Source/learner text is never edited to manufacture a repair annotation.

Exact TrainingCorrection fields are in contract-types.ts: fixed ID/origin/evidenceLevel/historical flag/templateId/faultId/partId; introduced/diagnosed/removed/reinstalled/qualified **setup** revisions; repair action time; previous/revised/reason. Template **fan-repair-v1**:

- previous: `The training fan was reversed at setup revision {introduced}.`
- revised: `The training fan was removed at setup revision {removed} and reinstalled correctly at setup revision {reinstalled}; the training apparatus passed its configuration check at setup revision {qualified}.`
- reason: `Authored training exercise; this is not a historical NASA incident or a correction to the B20 observation.`

All values are generated from authoritative receipts/current qualification and exact B20 entry setup revision. Require introduction≤diagnosis<removal<reinstall≤current qualification=current setup; pending=null; currently fault-free; correct source/canonical content and timestamps. Replacing a receipt, changing the template/category, adding a research correction, inserting a training-as-direct stamp or supplying arbitrary text fails scenario validation. A valid MAC or existing validatePassport alone cannot waive these checks. Original lineage/caveat checks remain mandatory.

The fixture factory obtains both research entries from real existing core actions. It computes the proposed training **projection** from those entries/receipts; it does not mutate a research corrections array. Maximum-note fixtures use an explicit ADD_LEARNER_NOTE expected-output oracle (immutable update), not direct edits to entry fields. This oracle is documentation evidence, not an implemented coordinator. New complete examples: FAULT_INJECTED_RESPONSE (source entry only), PASSPORT_REVIEW_RESPONSE (two research entries + distinct training record), COMPLETE_RESPONSE (same evidence/history, completion check done). Case snapshots/raw backups retain all authoritative information. A raw Passport v1 export alone is explicitly source/learner content; a future combined case export must render the three typed sections and retain the training origin fields, never merge training into research corrections.

RulesVersion advances to **m2-training-r3** because the admissible Passport/projection semantics changed. Earlier unshipped r1/r2 tokens remain raw/read-only; no silent text deletion/re-sign/migration. This is not GameState v3 or dataset promotion.

## R3 — Named, derived learning checks

Progress adds an ordered `checks` array of exactly5 unique `{id,label,done}` values; labels come from the same frozen learningDefinitions export. **completedChecks = checks.filter(done).length**, totalChecks=5. Never persist checks, count, step or validation flags as proof. All predicates assume the complete validated TrainingCase and pinned catalog; arbitrary loaded JSON cannot award checks.

| Stable ID / label | Derivation | Reversal / error, retry and reload |
|---|---|---|
| source-collected — Collect the B20 source observation | B20 inspected and a current canonical Station Arrival entry exists | Preserved by rig edits; wrong source/refused collection gives no credit; rederive after reload; no fictitious distractor |
| apparatus-qualified — Qualify the current apparatus | Required diagnosed/completed repair, no pending repair, qualifiedRevision=current setup and diagnose returns zero faults | Any setup edit clears it; requalify after repair. Refusal/retry leaves it unchanged |
| fault-diagnosed-and-repaired — Diagnose and repair the training fault | Valid authored introduction/diagnosis and first completed fan repair receipt, no pending repair | Historical check persists through later damage; it does not assert current health. Duplicate commands do not add credit; reload retains receipts |
| b20-lineage-matched — Review the source-backed B20 result | Current canonical Assembly entry matches qualified setup/pinned B20/hash/claim and exact lineage/limits; generated training view can be verified | No credit from source collection alone. Invalidated proof would remove it; this episode locks rig edits after observation, so normal later note actions preserve it |
| episode-completed — Complete the training episode | Assembly is in real completed prefix with current valid evidence/training gates | Only explicit completion awards it; source/repair animation cannot. Normal postcompletion reads/resume preserve it |

An invalid save results in unverified/read-only UI, not five earned checks. Named check state/order/count is verified in every full example, after save/load and qualification invalidation. A repaired-but-unqualified case has historical repair credit and pending qualification; that distinction is intentional.

## R4 — Precise save and note failures

Two additional **local** codes (not HTTP errors):

| Code | Typed detail / safe behavior |
|---|---|
| LOCAL_LOCK_BUSY | Exclusive lock unavailable with ifAvailable=true. No write, old save intact, savedOnDevice=false. Keep latest verified checkpoint and offer retry/download; never steal lock |
| LOCAL_WRITE_FAILED | cause=quota/permission/serialization/read-back-mismatch/read-back-unavailable; writeOutcome=not-written or unknown; savedOnDevice=false. Prewrite serialization/setItem rejection is not-written; failed/mismatched read-back after a write is unknown. Do not roll back automatically, clear data, or claim Saved; retain previous and candidate tokens in memory and re-read/reconcile under a later lock |

Existing LOCAL_STORAGE_UNAVAILABLE covers failure to access/read storage before a write; LOCAL_READ_ONLY covers unsupported/unverified browser capability. For a permission exception, distinguish before-write storage access versus setItem failure using those stages. LocalSaveResult's discriminated write-failure variant makes causes/outcome available without exposing raw exception text. Unknown HTTP commit outcome and unknown storage write outcome are different; neither is a confirmed save. Full examples LOCAL_LOCK_BUSY_RESULT and LOCAL_WRITE_FAILED_RESULT.

**Invalid note content → HTTP400 INVALID_REQUEST**, never a partially accepted action. Optional typed `error.noteIssue`: blank, lone-surrogate, control-character, outer-whitespace, too-long, too-many-bytes, in that check order. Wrong nonstring/missing field is ordinary schema400. Reject C0/C1 controls except internal tab/newline; carriage return is a disallowed control. No normalization/trimming/truncation or loss of submitted text. Preserve the editor's exact original string locally, focus the input and give actionable guidance; server errors need not echo potentially personal text. The lone-surrogate check occurs before intent hashing, since canonical JSON deliberately rejects it. These errors consume POST budget but no session/setup revision, checkpoint, accepted note or learning check.

A **valid** fifth note is a different state limit: HTTP200 domain NOTE_LIMIT_REACHED. A valid note at the wrong phase is WRONG_PHASE; one that exceeds completion headroom is CHECKPOINT_LIMIT_REACHED. All preserve previous state. Internal tab/newline/Unicode spacing that meets the contract is retained exactly. Reauthorization/retry is not a fix for invalid content; edit it first, then form a new valid request identity. NOTE_INVALID_RESPONSE documents the400 envelope.

## R5 — Guided source reading

Choose the preferred minimal design: **no distractor or invented hypothesis choice in Station Arrival**. Read B20's conditions, follow its real citation, inspect the documented observation, collect it and complete the source-reading step. Only the one existing admitted observed claim is offered. No new claim, score, artificial incorrect hypothesis or UNKNOWN_CLAIM teaching event is introduced. Directly fabricated requests still fail validation/UNKNOWN_CLAIM with readable recovery guidance; “not admitted as an observation” is not a claim that every hypothesis is unrelated to B20. Hypothesis-versus-observation reasoning belongs to a later separately reviewed mission. Initial source familiarity is not a blinded prediction task.

## N1–N8 decisions

| Recommendation | Decision / exact scope |
|---|---|
| N1 grant expiry in capability | Adopt now: capability.grant is required or valid+expiresAt for the caller's own presented cookie. No grant secret. Missing/expired grant returns required; protected endpoints still authorize independently |
| N2 conflict context | Adopt now: optional409 error.context has current runtimeId and currentRevision where an authenticated realm case exists. No protected revision on403 or public guessed IDs. Reconcile context, never treat it as a Snapshot |
| N3 recovery examples | Adopt now: failed qualification, revision conflict, runtime change, command reuse,429, key failure, diagnosis request and resume after restart. RATE_LIMITED_RESPONSE requires real HTTP Retry-After header; the example body alone is not the backoff duration |
| N4 byte budget | Adopt now: derived Snapshot.checkpointBudget reports exact canonical payload bytes/20,480 limit/remaining/warning16,384; optionalUpdatesRequireFinalizationCheck=true. Do not infer note admission from free bytes alone. Not persisted proof |
| N5 shared canonical function | Adopt as an implementation prerequisite: one pure shared canonicalJson implementation imported by Node and browser, never copy the Node proof runner into the client. Signing/identity use exactly its bytes, hashing via platform crypto. Fixed UTF-8/order/decomposed-text/safe-integer vectors in CANONICAL_JSON_VECTORS.json; no normalization |
| N6 per-part action-lock hints | Defer optional DTOs. Existing allowed action types, authoritative refusal codes and frozen part/dependency metadata suffice. UI may explain them but cannot decide scientific qualification |
| N7 refusal/rate budget | All preview POSTs including domain refusals, invalid input and retries **count** against the existing shared30/min. Keep security limit unchanged. Pointer movement, selecting/inspecting schematic parts and reading an already current check are local/GET, not writes. After approval the controller paces preview POST starts at least2.1s apart, does not resend unchanged checks, preflights note syntax, and respects429/Retry-After without losing progress/adding penalties. Other tabs/research POSTs share the budget, so no uninterrupted-play guarantee; test a real8-mistake path with graceful pacing/backoff and eventual completion. Save/download remain usable while waiting |
| N8 lazy shell | Adopt now as frontend acceptance: public mission descriptions do not load gameplay/3D bundles. A small local auth shell can load on explicit preview selection; defer gameplay modules until authorization and3D until requested. No-WebGL2D remains fully completable; module load never grants access |

## Browser storage consistency gate

Web Locks presence alone is insufficient. Before writable saves are enabled **for each supported engine/build family**, run **cross-process lost-update/visibility tests in Chromium, Firefox and WebKit**, plus simultaneous writes, crash/reopen, stale resume, replacement/discard and storage exceptions. A lock holder must observe the prior writer's committed storage state. Record exact engine/browser/OS/version, commit, process-isolation method, iterations and lost/stale writes; acceptance requires zero lost updates and correct conflict results. Until the engine's consistency gate is independently accepted, return LOCAL_READ_ONLY and offer exact raw checkpoint download/read-only restore. Do not infer Firefox/WebKit support from Chromium or use notifications as atomic synchronization.

The consumer reports zero lost updates in a Chromium stress test. This correction **did not reproduce that browser experiment** and no local evidence path was supplied; Firefox/WebKit remain untested. Planning proofs model serial lock admission and old/new crash outcomes only. They cannot approve writable browser support. All three engines are required acceptance targets; any engine that fails or cannot be tested retains the safe fallback.

## Request versus response boundary

Actual current apps/web/lib/api.ts bounds **request bodies** at32,768 bytes (`MAX_BODY`/readJson). Its Response.json success helper has no matching general32KiB response cap. The M2 proposal separately imposes **65,536 response bytes**, not yet implemented. Therefore the previous32,785-byte complete response was not a request violation. Candidate3 measurements are regenerated in07/MEASUREMENTS.json; named checks/training/learner sections increase response bytes while the checkpoint remains bounded.

Full source/learner text is stored once in core Passport; source presentation uses entry references, training projection is bounded one record, and repeated reads do not append canonical evidence. Responses may duplicate the opaque checkpoint plus parsed state for rendering; budget all of it before committing the action. Test65,535/65,536/65,537 full-response bytes and max-note completion, token extraction/local28,000 cap, request32KiB and response64KiB independently. These bounded local payloads are technically practical, but browser heap/network performance is an implementation measurement, not established by serialization arithmetic. If a response/essential completion cannot fit, reject the candidate before mutation and preserve the last recoverable checkpoint; never remove limitations/notes to fit.

## Final approval routing

No remaining science or recovery behavior is assigned for Claude to invent. The substantive alternatives above are chosen. This package is **READY FOR ASTRA FINAL M2 CONTRACT REVIEW**, not independently approved. Astra reviews the exact new documentation commit before any coordinator/API/browser gameplay implementation. Current production reducers, shared exports, public availability and Claude's checkout are untouched; no deployment, generation or spending is authorized.
