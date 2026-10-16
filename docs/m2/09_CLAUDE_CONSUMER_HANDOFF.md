# Final consumer handoff — candidate3 (not implementation authorization)

**All M2 fields below are proposed/unimplemented.** Review the corrected wire shapes in [03](03_PREVIEW_AND_FRONTEND_CONTRACT.md), [storage protocol](04_PERSISTENCE_AND_RECOVERY.md), [planning types](fixtures/contract-types.ts) and complete JSON examples. Existing M1.5 UI/research behavior remains the runtime baseline. The owner supplied Claude’s C1–C4 substance acceptance and targeted R1–R5 request; this candidate incorporates those changes for Astra final review. No message was sent to another chat and no final reviewer signoff is claimed.

## What Claude can review now

Review types/examples, sketch accessible controls and conflict/error copy, identify missing rendering data and file ownership. Pure design review/annotations are safe. Do not add fake success data to the application, start a gameplay controller/2D/3D build, expose hypothetical endpoints or edit shared contracts before explicit contract approval. After Astra approval, implement only the staged owned work in05; consume actual exported runtime schemas when Sol supplies them.

## Exact controller sequence after approval

1. GET capability identifies the **current runtimeId** and required/valid grant state (own expiry only), never a grant secret. Query parameters choose the shell only. Enter the operator token in a private password input; POST authorize creates HttpOnly opaque grant; clear the input. Keep access expiry visible; never read cookie value or save credentials.
2. Deliberate new case creates one session UUID and one StartRequest. Compute commandId from SHA-256 of the canonical `{endpoint,request-without-commandId}` intent (03). Retain this exact request until resolved. Show new-case replacement/backup consent independently of server start; creating a server case must not overwrite a local case.
3. Parse real Snapshot. Use **state.setup.revision** for apparatus configuration, **snapshot.revision** for subsequent expectedRevision, and **LocalSlot epoch/generation** for saving. They are distinct. runtimeId prevents old process requests being replayed after restart.
4. One request in flight per controller. A drag/pointer movement is visual only until committed via GAME INSTALL/REMOVE. Keyboard/touch select part→named anchor→orientation→Install invokes the same action. Do not compute qualification from collision/animation or use research `useLatestRequest` cancellation.
5. Use the frozen labels and15 exact symptom/interpretation/repair strings in fixtures/EQUIPMENT_COPY.md, sourced from equipment-copy.ts. Machine IDs remain in payloads; never display them as labels. Fault notice/direction marker is authored training. RUN_DIAGNOSTIC success has snapshot.diagnostic: render symptom first, then model interpretation, then source purpose/citation and guided repair. `not-run` prompts a check; `stale` hides current-use findings and prompts rerun. Never show a stale check as current. No data field requires a frontend combustion rule.
6. SUBMIT_DIAGNOSIS chooses the visible part/category. Wrong answer is HTTP200 **ok:true feedback.correct=false** and a new session revision; show coaching, retain playable state. A domain refusal is HTTP200 **ok:false** with identical authoritative checkpoint; show exact code/message. It is not a transport failure.
7. Correct diagnosis enables fan removal. **training.pendingRepair** shows “Fan removed at setup revision R; reinstall at the duct inlet.” Other part edits can occur without losing that R. Reversed reinstall clears pending but does not earn repair; another removal/reinstall can correct it. After correct install, repair is the first completed historical receipt. Setup changes stale checks/qualification but do not erase history.
8. QUALIFY only after required repair and healthy current rig. Then a **deliberate** B20 observation action opens the historical result. Never auto reveal/earn it from animation or a successful check. Render the two research entries from state.passport, each with corrections=[]. Use passportPresentation.sourceEvidence references, trainingHistory (authored-training/not-applicable/never a NASA incident) and learnerConclusions (unassessed) as distinct sections. Only the source observation receives a DIRECT stamp. The one training record is backend-derived from receipts/template; do not insert it into a research correction array or fabricate it in UI code. Four bounded learner notes cannot edit canonical limitations.
9. Save invokes one **exclusive Web Lock** transaction in the browser adapter. Carry expected epoch/generation from last read. Conflict cannot become an automatic write using a refreshed generation. Show local/server revisions and offer re-read current, raw downloads and deliberate replacement/discard consent. Notifications prompt a read only.
10. Reload reads raw without mutation, displays unverified/read-only state, reauthorizes and GETs the case. A live newer head wins through explicit reconciliation; absent head requires signed resume. Lost signing key/invalid MAC/unknown format preserves raw and disables trusted continuation. Browser without locks/storage **or without its accepted cross-process consistency gate** uses read-only/download mode, never an unlocked writer.

## Errors and recovery

| Result | UI behavior |
|---|---|
|200 domain false | Exact refusal, retain current pose/input/checkpoint, announce repair guidance |
|400 invalid note | Keep the exact editor text; show noteIssue guidance, focus input, edit before forming a new request; no state revision advanced |
|403 | Pause writes, retain state; deliberately reauthorize then GET/resume |
|409 stale/local conflict | Show competing revisions/cases; no silently updated expectedRevision/commandId; GET/current selection |
|409 COMMAND_ID_REUSED | Canonicalization/body identity error; do not auto regenerate to hide it |
|429 | Retry-After countdown; retain identical intent and reconcile before retry if another tab advanced |
| Timeout/500/non-JSON | Commit unknown; pending display, GET; same-runtime dedup may recover, no guessed success |
| New runtime | Old requests cannot replay. Reauth, resume last saved/downloaded checkpoint; saved lastCommand identifies included commit |
| Key/version/dataset/science failure | Raw download + trusted source caveats + read-only recovery; no fabricated validation or automatic reset |
| LOCAL_LOCK_BUSY | No write occurred; retain candidate, offer retry/download; never steal lock |
| LOCAL_WRITE_FAILED | Show quota/permission/serialization/read-back cause; unknown write outcome never reports Saved, never auto roll back |
| Local capability/storage unavailable | “Confirmed in this session; not saved on this device”, checkpoint download/read-only restore and explicit retry |

Every successful write uses real schema-checked server state. Stored local head fields cannot confer scientific approval. Handle framework/non-JSON failures as well as typed errors. No secret/authorization inputs in Playwright traces/screenshots/logs.

## Accessibility and presentation

Complete the whole2D loop without dragging/WebGL: canonical human-readable part/anchor/orientation controls from the single equipmentDefinitions export, clear descriptions, named Install/Remove/Check/Diagnose/Save controls, focus retained/restored after refusal and source panel opening, live announcements for errors/check/save results, noncolor-only fault indicators, ≥44px primary touch targets,320/390px reflow, native200% zoom and reduced motion. Source reading/notes never depend on animation. 3D uses the same controller, supports keyboard alternative and switches to2D after mesh/context failure without resetting state. Provide source links back to B20/Workstation/Frontier. No automatic ignition, fabricated measurements or certification wording.

## Files and gates

Claude owns future apps/web/game transport/controller/Web Locks adapter and game UI components. Sol owns shared runtime DTOs/admission rules, game-core progression and server-only API/signing. Sol is the single editor of data/asset-rights.json/schema during its reviewed migration; Claude supplies provenance inputs. Claude retains the next package-lock/manifests edit window; no package change is currently needed. Allocate specific E2E files per batch, never concurrent edits to one shared file. Current docs-only correction changes neither production schemas nor registry.

Review feedback should identify the exact DTO/example/state/error requiring amendment. A consuming implementation may rely on these shapes **only after** Astra final contract approval at an exact new SHA. There is no approved M2 gameplay baseline yet; 322f2c2 remains excluded.


## Final named HUD/source-reading/budget contract

Read [10_FINAL_CONSUMER_CORRECTIONS.md](10_FINAL_CONSUMER_CORRECTIONS.md) before consumer implementation. `progress.checks` provides the5 ordered IDs/labels/done states; `completedChecks` is their count, not a grading score. Qualification can revert after a setup edit while historical repair stays done. Reuse the frozen labels; do not derive check meaning from a count. Station Arrival is guided reading of B20’s conditions/source/one canonical observation, **no distractor** or invented hypothesis choice.

Invalid notes return400 INVALID_REQUEST with noteIssue (blank/outer whitespace/lone surrogate/control/size); preserve the input exactly and do not retry unchanged. A valid fifth note is200 NOTE_LIMIT_REACHED. Internal allowed tabs/newlines remain unchanged. All POSTs/refusals/retries count against30/min; pace preview POST starts≥2.1s, inspect/select locally, reuse current diagnostics without a POST and respect429. Error400 content fixes are not reauthorization flows. Unknown HTTP commit → GET/reconcile; unknown device write → re-read under lock. Do not report either as confirmed Saved.

`checkpointBudget` is the server’s exact current byte projection, not a permission to append arbitrary notes. Request32KiB and proposed response64KiB are distinct; full completion responses include token+render state but stay bounded. Use one future shared pure canonicalJson function plus fixed vectors on browser/Node before hashing; never import the Node proof runner into UI. Authenticated409 context is advisory current revision/runtime, not a replacement Snapshot.

Consumer-reported Chromium zero lost updates does not establish Firefox/WebKit consistency. Writable saves require accepted cross-process visibility/lost-update tests **per engine/build family**, including Chromium/Firefox/WebKit target coverage; untested/failing engines remain LOCAL_READ_ONLY with raw download. Native API presence alone is insufficient. All gameplay/3D modules remain lazily loaded; public mission description routes do not fetch them. No-WebGL2D and keyboard/touch continue to share the one state/controller.

New typed examples: FAULT_INJECTED_RESPONSE, PASSPORT_REVIEW_RESPONSE, COMPLETE_RESPONSE; qualification/refusal/conflict/restart/reuse/rate/key recovery; diagnosis request; resume-after-restart and local failures. All are PROPOSED fixture outputs, not implemented route responses. Sol owns runtime label/diagnostic/presentation/check/note/canonical/schema definitions and server rules after approval; Claude owns rendering/accessibility/lazy controls/lock adapter, with explicit shared-file windows. No remaining label/scoring/provenance/recovery choice is left for frontend invention.

## Receipt correction for final recheck

OBSERVATION_REQUEST at expectedRevision21 produces PASSPORT_REVIEW_RESPONSE revision22; its checkpoint receipt identifies that observation, never a previous diagnostic. COMPLETE_RESPONSE revision23 identifies explicit completion. Refusal/resume keep the last accepted receipt unchanged. The early qualification fixture is now QUALIFICATION_REPAIR_REQUIRED_RESPONSE: mandatory diagnosis/repair history is checked before physical qualification, so the UI must coach repair rather than imply it performed a qualification check. All fields and preview behavior remain proposed, pending Astra's approval of the corrected exact SHA.
