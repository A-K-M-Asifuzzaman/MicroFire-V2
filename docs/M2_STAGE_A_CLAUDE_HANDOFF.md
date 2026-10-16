# M2 Stage A backend — Claude integration handoff

Backend implementation only; independent Astra Stage A review is pending. Approved planning baseline: **11ec4caa772b71e112b5fc176baacdd6853f8173**, accepted M1.5 ancestor **b6d15a47ec25f57350896f1dc63dc59192f57b00**. Deployment commit **322f2c2 is excluded**. Use the exact final implementation SHA in Sol's accompanying Stage A report/delivery; verify it with `git rev-parse HEAD`. Do not use Claude's historical frontend branch head as the integration base.

The implementation branch is `codex/m2-stage-a-backend` in `MicroFire-V2-m2-stage-a`. The planning worktree remains intact. No dependency/lockfile, scientific admission, feature registry or frontend presentation change is included. All five public missions remain unavailable. This is the working backend for the local `bass-b20-training-v1` episode spanning Station Arrival and Assembly; later missions, a numerical combustion simulator and generative Ask are outside this delivery.

## Shared imports and authority

Import DTOs and runtime schemas from **`@microfire/shared`**:

- `TrainingAction`, `TrainingCase`, `Snapshot`, `StartRequest`, `ActionRequest`, `ResumeRequest`, `ActionResponse`, `HttpFailure`, `LocalSlot`, `LocalSaveResult`, `LocalAdmissionOptions`, `LocalAdmissionResult`.
- `StartRequestSchema`, `ActionRequestSchema`, `ResumeRequestSchema`, `StartResponseSchema`, `ActionResponseSchema`, `CapabilityResponseSchema`, `AuthorizeResponseSchema`, `RevokeResponseSchema`, `HttpFailureSchema`, `SnapshotSchema`, `CheckpointPayloadSchema`, `TrainingCaseSchema`, `LocalSlotSchema`, `LocalSaveResultSchema`.
- `canonicalJson`, `requestIdentity`, `noteIssue`, `partDefinitions` / `equipmentDefinitions`, `equipmentCopy`, `findingCopy`, `learningDefinitions`.
- `admitLocalSave`, `admitLocalDiscard`, `inspectLocalSlot`, `inspectPreviewCheckpoint`, `PREVIEW_SAVE_KEY`, `PREVIEW_SAVE_LOCK`.

The old game-core part/citation/type exports remain compatible. The real part definitions now include `label` and `anchorLabel`; all ten IDs/anchors and fifteen diagnostic symptom cases match the frozen table. Source apparatus functions and training placement constraints remain distinct.

Backend-only `@microfire/game-core` exports include `createTrainingCase`, `transitionTraining`, `validateTrainingCase`, `trainingDiagnostic`, `trainingPassport`, `trainingProgress`. They reuse the existing reducer. **The browser consumes confirmed snapshots; it must not run a second coordinator or award progress.** Server cryptography/configuration live in `apps/web/lib/game-preview-security.ts` and `game-preview.ts`, outside client/shared barrels.

## Local authorization procedure

1. Build with Node 24 and the current lockfile: `npm ci`, then `npm run build`.
2. Supply all server settings through a private local process environment. `.env.example` contains names and empty placeholders, with preview off by default. Set `MICROFIRE_LOCAL_GAME_PREVIEW=1`, `MICROFIRE_PREVIEW_ORIGIN=http://127.0.0.1:<dedicated-port>`, a stable lowercase UUID `MICROFIRE_PREVIEW_REALM_ID`, public lowercase key identifier `MICROFIRE_PREVIEW_KEY_ID`, and **two different independently generated 32-byte canonical base64url secrets** for `MICROFIRE_PREVIEW_ACCESS_TOKEN` and `MICROFIRE_PREVIEW_SIGNING_KEY`. Never use the public fixture key. Do not place secrets in shell arguments, browser storage, URLs, NEXT_PUBLIC variables, screenshots or traces.
3. Start the reviewed local launcher with those variables already present:

```sh
node --conditions=react-server --import tsx scripts/local-game-preview.ts
```

The launcher validates configuration and scientific file integrity, then binds production Next to **127.0.0.1** at the configured port. Hosted environments/proxies/tunnels are unsupported; known hosted markers fail closed. Configuration/key/token/realm changes require a process restart. Changing configuration in a running handler disables it until restart.

4. The future small preview shell calls capability, accepts the operator token in a private password field, POSTs it once to authorize, and clears the field. No secret is returned in JSON. An opaque random grant is set as host-only `microfire_m2_grant`, HttpOnly, SameSite=Strict, Path=/api/game/preview, Max-Age=3600. Secure is intentionally absent for this exact HTTP loopback profile. This is a shared local operator realm, not user accounts.
5. Revoke deletes the server-side grant and clears that cookie. Expiry is absolute, copied revoked cookies fail, and restart clears every grant. Reauthorization preserves live cases; key rotation with a new keyId keeps old tokens read-only/raw recoverable.

Next synthesizes `Request.url` with localhost in this production setup. The implementation enforces the **actual wire Host**, exact configured POST Origin and all frozen forwarding/fetch-metadata restrictions. It does not use Next's synthesized URL authority as an additional browser-origin check. This was verified over actual HTTP; the security conditions were not relaxed to accept localhost as the configured origin.

## Actual endpoints

All paths are relative to **`/api/game/preview`**. No query parameters are accepted. Responses use `apiVersion:'1'`; requests do not contain apiVersion. Use same-origin fetch/cookies and retain the actual HTTP status and Retry-After header.

| Method / path | Request | Response |
|---|---|---|
| GET `/capability` | None | `CapabilityResponse`: current runtimeId and caller's required/valid grant state, own expiry only |
| POST `/authorize` | `{approvalToken:string}` | `AuthorizeResponse` and private Set-Cookie; no mission allocated |
| POST `/revoke` | Exact `{}` | `RevokeResponse`, idempotent deletion/clear |
| POST `/start` | `{runtimeId,sessionId,previewId:'bass-b20-training-v1',mode:'demo',commandId}` | `StartResponse`, revision 0, Station Arrival active |
| GET `/session/:sessionId` | Lowercase UUID | `StartResponse`, latest confirmed snapshot |
| POST `/action` | `{runtimeId,sessionId,expectedRevision,commandId,action}` | `ActionResponse`: accepted update or unchanged domain refusal |
| POST `/resume` | `{runtimeId,checkpoint,commandId}` | `ResumeResponse`, exact compatible token/state; no revision increment or re-sign |

There is **no separate observation or checkpoint endpoint**: observation is a typed action, and each snapshot carries its signed checkpoint. Capability is not authorization; query parameters and demo mode do not unlock missions. Unauthorized protected requests return403. Disabled or invalid-host preview returns404.

## Canonical command identity

One shared serializer is used by Node and browser. It preserves text without normalization, sorts object keys, preserves array order, rejects lone surrogates/nonplain/unsupported values and unsafe/fractional numbers. Preview transport separately rejects duplicate JSON members and malformed UTF-8.

```ts
import { requestIdentity, ActionResponseSchema, type TrainingAction } from '@microfire/shared';
const action: TrainingAction = {type:'RUN_DIAGNOSTIC'};
const request = {
  runtimeId: snapshot.runtimeId,
  sessionId: snapshot.sessionId,
  expectedRevision: snapshot.revision,
  action
};
const body = {...request, commandId: await requestIdentity('action', request)};
```

Use endpoint `start`, `action` or `resume` as appropriate. The hash binds the entire request excluding commandId, including runtime and expected revision. Retain the exact request while its outcome is unknown. Do not regenerate its revision/runtime/identity automatically. The frozen observation vector computes `a0a190413768284c7b63632204e414d69aa0dbf42a4a93ac26a3263b3555117e` **only for the exact fixture UUIDs and expectedRevision21**. A real runtime has its own identity. Real Chromium reproduced all four canonical vectors and this exact fixture digest.

## All semantic action shapes

| TrainingAction | Payload / guard |
|---|---|
| `GAME` + `START_MISSION` | `{missionId:'bass-assembly'}` after actual Station completion. Initial Station start is performed by `/start` |
| `GAME` + `INSPECT_EVIDENCE` | `{experimentId:'bass2-b20'}` during Station source reading |
| `GAME` + `COLLECT_EVIDENCE` | `{experimentId:'bass2-b20',claimId:'bass2-b20-burned-entire-sample'}` after inspection |
| `GAME` + `INSTALL_PART` | `{partId,anchorId,orientation:'correct'|'reversed'}` using exported definitions |
| `GAME` + `REMOVE_PART` | `{partId}`; dependencies and mandatory diagnosis enforced |
| `GAME` + `QUALIFY_INSTRUMENT` | No other fields; mandatory diagnosis/completed repair first, then current physical fault check |
| `GAME` + `OBSERVE_DOCUMENTED_RESULT` | `{experimentId:'bass2-b20'}` after required repaired qualification |
| `GAME` + `COMPLETE_MISSION` | `{missionId:'station-arrival'|'bass-assembly'}` with actual criteria |
| `RUN_DIAGNOSTIC` | No other fields; current Assembly Training check |
| `SUBMIT_DIAGNOSIS` | `{partId,faultCode:'MISSING'|'WRONG_ANCHOR'|'MISSING_PREREQUISITE'|'REVERSED'}` |
| `ADD_LEARNER_NOTE` | `{text}` during Passport review only; at most four notes |

The GAME envelope is `{type:'GAME',action:{type:<core action>,...payload}}`. Select/drag/hover/inspect already fetched part descriptions locally; only semantic commands mutate the backend. Wrong diagnosis is **200 / ok:true / feedback.correct:false**, increments the session revision once and retains recoverable play. A domain refusal is **200 / ok:false**, preserves state/training/revision/token and must be presented distinctly from HTTP errors.

## Diagnostics, repair and progress

The first healthy ten-part rig atomically introduces `training-fan-reversed-v1` once by a real remove/reversed reinstall. This is authored training, never a historical NASA malfunction. Before correct diagnosis, removing that fan is refused. A current check is required for diagnosis; a later stale display does not erase earned diagnosis.

`snapshot.diagnostic` is not-run, stale, or current. Current findings include stable part/fault IDs, readable labels, authored symptom, educational interpretation, guided repair and separately cited source apparatus purpose. Example fan finding:

```text
symptom.category: authored-training-observation
symptom.text: The fan’s training direction marker points out of the duct.
interpretation.category: educational-model-inference
repair.text: Remove the fan and reinstall it at the duct inlet, facing into the duct.
purpose.category: source-supported-apparatus-description
```

Relevant compound source/location descriptions cite PDF12–13, within the approved two-citation maximum. Stale findings are not returned as current. Render the supplied copy; do not replace it with inferred flow/sensor readings.

Correct diagnosis enables actual fan removal. `training.pendingRepair` retains its precise removal revision/time across intervening edits and reload. Correct reinstall creates the first historical repair receipt; reversed reinstall clears pending without earning repair, and removal/retry remains possible. Later damage preserves repair history but clears current qualification. Missing repair gives REPAIR_REQUIRED before physical qualification; legitimate later physical faults give QUALIFICATION_FAILED.

Use `snapshot.progress.checks`, in frozen order:

1. source-collected — Collect the B20 source observation.
2. apparatus-qualified — Qualify the current apparatus.
3. fault-diagnosed-and-repaired — Diagnose and repair the training fault.
4. b20-lineage-matched — Review the source-backed B20 result.
5. episode-completed — Complete the training episode.

The backend derives each predicate, count, phase, eligibility and nextInstruction. The count is not a grade or fire-safety score. Setup edits can reverse current qualification while historical repair remains earned. Observation locks rig edits; completion permits reads/save/resume, not fresh progression commands.

## Passport and scientific meaning

Render the two canonical research entries from `state.passport` once, using `passportPresentation.sourceEvidence.passportEntryIds`. Both source entries retain **corrections=[]**, exact citations/conclusions/limitations and separate learnerNotes. `passportPresentation.trainingHistory` is derived from signed receipts, authored-training / not-applicable / historicalNASAEvent=false. `learnerConclusions` is learner-authored / scientificValidation=not-assessed. Never put the training annotation into research corrections or apply DIRECT to the combined case.

B20 alone is admitted; calibrated oxygen remains **17.4 vol%**. Pressure/uncertainty remain unknown where not established. All55 legacy candidates, including unresolved B16/B19, stay excluded. Training qualification does not certify an instrument or change historical evidence. Ask remains deterministic and preserves abstention.

## Checkpoints, retries and size limits

Three different counters: setup revision for physical edits, session revision for every accepted command, and local epoch/generation for device saves. Never substitute one for another.

The signed envelope contains one GameState v2 and bounded Training, pinned dataset/catalog/rules/realm/origin/key, session/revision and one last accepted command receipt. The backend verifies encoding, MAC, canonical bytes, core restore, exact source content/lineage, chronology and scenario constraints. Old core normal/demo save keys and v1 migration are unchanged; unsigned legacy saves are not trusted preview checkpoints.

GET, refusal and resume preserve checkpoint bytes. A retry of the latest accepted action returns its existing head/feedback after authorization and before stale rejection. Duplicate start returns the latest live head; an evicted issued case cannot be recreated by a delayed start. Identical resume is idempotent; a different live head is a conflict, even if the token is ahead. Restart requires new authorization/runtime, then deliberate resume of the last saved/downloaded token. Unsaved progress can be lost if both server process and response are lost. A signature is not human scientific approval or full anti-rollback protection. Checkpoint backups contain notes and are not encrypted; avoid personal data.

Request bytes ≤32,768; checkpoint payload ≤20,480; token ≤27,351; full response ≤65,536; LocalSlot ≤28,000. Full response serialization/signing/schema checks precede commit. Optional updates preserve a 32-action completion reserve and project completion fields plus4KiB payload headroom. Limits never truncate notes/caveats. Maximum legal notes and final completion passed real HTTP tests.

| Result | Controller behavior |
|---|---|
|200 domain refusal | Show supplied code/message; keep confirmed state, exact draft and checkpoint |
|400 INVALID_REQUEST with noteIssue | Keep editor text; fix content, then hash a new valid request. Order: blank, lone surrogate, controls, outer whitespace, length, byte size |
|403 | Pause writes; deliberate authorization, then GET/reconcile or resume |
|409 | Keep competing identities/revisions. GET/capability; no guessed replay at a newer revision. COMMAND_ID_REUSED is a body/identity defect |
|429 | All preview/research POSTs share30/minute. Honor Retry-After, retain intent/draft/state; reconcile if another tab may advance |
|503 | Capacity is bounded; retry only after capacity is available. Do not manufacture IDs to evade tombstones |
| Timeout/non-JSON/500 | Commit unknown. Keep exact request and GET the known case; do not assume failure/reset |
| New runtime/key/version/dataset failure | Preserve raw checkpoint/download; reauthorize/explicitly resume only when compatible; no automatic promotion/re-sign |

Only429/503 HTTP errors report retryable=true. Authenticated409 may include advisory runtime/currentRevision context. Do not expose protected context to unauthorized callers. Pace controller POST starts at least2.1seconds apart, avoid redundant checks, preflight notes with `noteIssue`, and retain save/download during cooldown. The real eight-mistake HTTP path completed after actual429/Retry-After; no security limit was raised.

## Pure local-save admission API

**No browser writes are implemented by Sol. No browser engine's writable persistence is accepted by these unit tests.** Claude owns the exclusive Web Lock and storage I/O. Until Astra accepts real cross-process consistency tests for that engine/build family, keep `engineConsistencyAccepted:false` and offer read-only inspection plus checkpoint download.

Under the exclusive `PREVIEW_SAVE_LOCK`, re-read the exact raw slot, then call:

```ts
const admission = admitLocalSave({
  raw, expectedEpoch, expectedGeneration, newEpoch,
  engineConsistencyAccepted, storageAvailable,
  candidate: confirmedSnapshot,
  serverVerifiedCheckpoint: confirmedSnapshot.checkpoint,
  catalogSha256: confirmedSnapshot.evidenceReview.catalogSha256
});
```

`confirmedSnapshot` and serverVerifiedCheckpoint must come from the freshly confirmed authorized HTTP response in this controller, **never from loaded JSON**. The pure function compares exact token/state/revision/catalog/lineage projections but cannot authenticate a browser assertion or verify a server MAC. `inspectLocalSlot` / `inspectPreviewCheckpoint` are explicitly structural, not scientific or cryptographic approval.

A refusal is `{ok:false,code}`; map it to a local result with savedOnDevice=false. Success is `{ok:true,slot,serialized,unchanged}` and **does not claim Saved**. For changed output, perform one setItem of serialized, then exact read-back while holding the lock; report LocalSaveResult success only after that. Idempotent same-token saves retain generation. Stale revision, equal-revision/different-token, stale epoch/generation and different-case writes refuse. `replaceConsent` requires `confirmation:'replace-after-backup'` plus exact previous raw/epoch/generation, captured after a backup opportunity and revalidated under the lock.

Discard uses `admitLocalDiscard` with the same options, exact `expectedRaw`, and `confirmation:'discard-preview-save-after-export'`. A valid slot becomes a same-epoch generation+1 **tombstone**, never removeItem. Explicit corrupt-raw discard uses a new random epoch and generation1. Generate that new UUID inside the lock; do not reset a valid epoch/generation. No automatic consent refresh or stale autosave replay.

Busy lock → LOCAL_LOCK_BUSY. Prewrite storage access failure → LOCAL_STORAGE_UNAVAILABLE. Denied/unverified write capability → LOCAL_READ_ONLY. Serialize/setItem failure → LOCAL_WRITE_FAILED with not-written; failed/mismatched read-back → unknown. Retain both tokens and offer download/re-read, without an unlocked rollback. Notifications are hints only. Do not hold locks during HTTP, dialogs or downloads.

## Reproducible verification and ownership

```sh
npm run typecheck
npm run lint
npm test
npm run validate:data
npm run eval:science
npm run security
npm run build
node --import tsx docs/m2/fixtures/verify-contracts.ts
node --import tsx docs/m2/fixtures/verify-receipts.ts
node --import tsx --test --test-concurrency=1 tests/backend/training-http.test.ts
npm run test:e2e
```

HTTP tests use isolated production loopback servers, actual grants and random test-only secrets in memory, not product credentials. `PLAYWRIGHT_BROWSERS_PATH` must identify the approved installed browser cache. Existing M1 desktop/mobile checks passed90, with22 existing project skips. Node/browser identity was checked in Chromium. Firefox/WebKit persistence, cross-process locking, the M2 UI, native accessibility and physical-device performance remain later gates. The tests include an isolated future-diagnosis mutation and validly signed scientific/metadata corruption; passing a MAC alone cannot admit them.

Sol owns the shared/domain/API/security/backend test files. Claude owns apps/web/game presentation/controller/Web Locks/storage and separately allocated gameplay browser tests. Claude keeps the next dependency/lockfile window; use existing Three.js first. No concurrent edits to shared files, no signing imports in client barrels, no public Available/mission promotion, deployment, scientific record promotion or paid Meshy generation follows from this handoff.
