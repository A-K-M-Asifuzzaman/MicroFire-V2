# Claude consumer review — candidate 2 (not implementation authorization)

**All M2 fields below are proposed/unimplemented.** Review the corrected wire shapes in [03](03_PREVIEW_AND_FRONTEND_CONTRACT.md), [storage protocol](04_PERSISTENCE_AND_RECOVERY.md), [planning types](fixtures/contract-types.ts) and complete JSON examples. Existing M1.5 UI/research behavior remains the runtime baseline. No contact with another chat or claim of Claude signoff has occurred.

## What Claude can review now

Review types/examples, sketch accessible controls and conflict/error copy, identify missing rendering data and file ownership. Pure design review/annotations are safe. Do not add fake success data to the application, start a gameplay controller/2D/3D build, expose hypothetical endpoints or edit shared contracts before explicit contract approval. After Astra approval, implement only the staged owned work in05; consume actual exported runtime schemas when Sol supplies them.

## Exact controller sequence after approval

1. GET capability identifies the **current runtimeId**, not a grant. Query parameters choose the shell only. Enter the operator token in a private password input; POST authorize creates HttpOnly opaque grant; clear the input. Keep access expiry visible; never read cookie value or save credentials.
2. Deliberate new case creates one session UUID and one StartRequest. Compute commandId from SHA-256 of the canonical `{endpoint,request-without-commandId}` intent (03). Retain this exact request until resolved. Show new-case replacement/backup consent independently of server start; creating a server case must not overwrite a local case.
3. Parse real Snapshot. Use **state.setup.revision** for apparatus configuration, **snapshot.revision** for subsequent expectedRevision, and **LocalSlot epoch/generation** for saving. They are distinct. runtimeId prevents old process requests being replayed after restart.
4. One request in flight per controller. A drag/pointer movement is visual only until committed via GAME INSTALL/REMOVE. Keyboard/touch select part→named anchor→orientation→Install invokes the same action. Do not compute qualification from collision/animation or use research `useLatestRequest` cancellation.
5. Fault notice/direction marker is authored training. RUN_DIAGNOSTIC success has snapshot.diagnostic: render symptom first, then model interpretation, then source purpose/citation and guided repair. `not-run` prompts a check; `stale` hides current-use findings and prompts rerun. Never show a stale check as current. No data field requires a frontend combustion rule.
6. SUBMIT_DIAGNOSIS chooses the visible part/category. Wrong answer is HTTP200 **ok:true feedback.correct=false** and a new session revision; show coaching, retain playable state. A domain refusal is HTTP200 **ok:false** with identical authoritative checkpoint; show exact code/message. It is not a transport failure.
7. Correct diagnosis enables fan removal. **training.pendingRepair** shows “Fan removed at revision R; reinstall at duct inlet.” Other part edits can occur without losing that R. Reversed reinstall clears pending but does not earn repair; another removal/reinstall can correct it. After correct install, repair is the first completed historical receipt. Setup changes stale checks/qualification but do not erase history.
8. QUALIFY only after required repair and healthy current rig. Then a **deliberate** B20 observation action opens the historical result. Never auto reveal/earn it from animation or a successful check. Render one source entry and one Assembly entry; source DIRECT stamp applies only to historical observation, with Training repair and Learner interpretation separate. Four bounded notes cannot edit canonical limitations.
9. Save invokes one **exclusive Web Lock** transaction in the browser adapter. Carry expected epoch/generation from last read. Conflict cannot become an automatic write using a refreshed generation. Show local/server revisions and offer re-read current, raw downloads and deliberate replacement/discard consent. Notifications prompt a read only.
10. Reload reads raw without mutation, displays unverified/read-only state, reauthorizes and GETs the case. A live newer head wins through explicit reconciliation; absent head requires signed resume. Lost signing key/invalid MAC/unknown format preserves raw and disables trusted continuation. Browser without locks/storage uses read-only/download mode, never an unlocked writer.

## Errors and recovery

| Result | UI behavior |
|---|---|
|200 domain false | Exact refusal, retain current pose/input/checkpoint, announce repair guidance |
|403 | Pause writes, retain state; deliberately reauthorize then GET/resume |
|409 stale/local conflict | Show competing revisions/cases; no silently updated expectedRevision/commandId; GET/current selection |
|409 COMMAND_ID_REUSED | Canonicalization/body identity error; do not auto regenerate to hide it |
|429 | Retry-After countdown; retain identical intent and reconcile before retry if another tab advanced |
| Timeout/500/non-JSON | Commit unknown; pending display, GET; same-runtime dedup may recover, no guessed success |
| New runtime | Old requests cannot replay. Reauth, resume last saved/downloaded checkpoint; saved lastCommand identifies included commit |
| Key/version/dataset/science failure | Raw download + trusted source caveats + read-only recovery; no fabricated validation or automatic reset |
| Local quota/read-back/lock unavailable | “Confirmed in this session; not saved on this device”, checkpoint download and explicit retry |

Every successful write uses real schema-checked server state. Stored local head fields cannot confer scientific approval. Handle framework/non-JSON failures as well as typed errors. No secret/authorization inputs in Playwright traces/screenshots/logs.

## Accessibility and presentation

Complete the whole2D loop without dragging/WebGL: labeled part/anchor/orientation controls, clear descriptions, named Install/Remove/Check/Diagnose/Save controls, focus retained/restored after refusal and source panel opening, live announcements for errors/check/save results, noncolor-only fault indicators, ≥44px primary touch targets,320/390px reflow, native200% zoom and reduced motion. Source reading/notes never depend on animation. 3D uses the same controller, supports keyboard alternative and switches to2D after mesh/context failure without resetting state. Provide source links back to B20/Workstation/Frontier. No automatic ignition, fabricated measurements or certification wording.

## Files and gates

Claude owns future apps/web/game transport/controller/Web Locks adapter and game UI components. Sol owns shared runtime DTOs/admission rules, game-core progression and server-only API/signing. Sol is the single editor of data/asset-rights.json/schema during its reviewed migration; Claude supplies provenance inputs. Claude retains the next package-lock/manifests edit window; no package change is currently needed. Allocate specific E2E files per batch, never concurrent edits to one shared file. Current docs-only correction changes neither production schemas nor registry.

Review feedback should identify the exact DTO/example/state/error requiring amendment. A consuming implementation may rely on these shapes **only after** consumer review plus Astra final contract approval at an exact new SHA. There is no approved M2 gameplay baseline yet; 322f2c2 remains excluded.
