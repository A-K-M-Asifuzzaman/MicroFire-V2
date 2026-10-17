# M2 gameplay frontend: integration with Sol's Stage A

Branch `feat/m2-claude-gameplay`, rooted at the Astra-approved contract SHA `11ec4caa772b71e112b5fc176baacdd6853f8173`.
It contains no backend, no gameplay rules, no authorization, no signing and no canonical-JSON implementation.

**Status:** M2 is not yet playable end to end. Every UI behaviour has been tested against the approved fixtures; none has been tested against Sol's real preview API.

## The seam (the only files that change at integration)

| File | Today (this branch) | At integration |
|---|---|---|
| `apps/web/game/contract.ts` | Type-only re-export of `docs/m2/fixtures/contract-types.ts`. `contractRuntime = null` | Point the type export at `@microfire/shared`. Set `contractRuntime` (below) |
| `apps/web/game/contract/specs.ts` | Maps `./equipment-copy.ts` to `PartSpec[]` | Import `partDefinitions` (with `label`/`anchorLabel`) and `equipmentCopy` from `@microfire/shared` |
| `apps/web/game/contract/equipment-copy.ts` | Byte-identical mirror of the approved `docs/m2/fixtures/equipment-copy.ts`, drift-tested | Delete |

`contractRuntime` is assembled from Sol's exports:

```ts
import { ActionResponseSchema, AuthorizeResponseSchema, CapabilityResponseSchema, HttpFailureSchema, RevokeResponseSchema,
  StartResponseSchema, noteIssue, requestIdentity } from '@microfire/shared';
export const contractRuntime: ContractRuntime = {
  parse: { capability: (v) => CapabilityResponseSchema.parse(v), authorize: (v) => AuthorizeResponseSchema.parse(v),
    revoke: (v) => RevokeResponseSchema.parse(v), snapshot: (v) => StartResponseSchema.parse(v),
    action: (v) => ActionResponseSchema.parse(v), failure: (v) => HttpFailureSchema.parse(v) },
  identify: requestIdentity, noteIssue
};
```

These names match Sol's committed `codex/m2-stage-a-backend` exports at `9f61c21`. If the zod output types differ from the planning types, keep the planning types as the target and adjust only `contract.ts`.

## Remaining connection steps

1. Merge Sol's reviewed Stage A, then apply the seam changes above.
2. Sol supplies the preview API at `/api/game/preview/{capability,authorize,revoke,start,action,resume,session/:id}`.
   - `createHttpTransport` already calls exactly these paths.
   - It keeps the status, typed code and Retry-After, and maps 5xx (except 503), timeouts and malformed bodies to "unknown commit".
3. **Browser saves.** `readOnlySaveAdapter` is the approved default. A writable `SaveAdapter` (Web Locks + localStorage around Sol's pure save-admission helper) is built only after:
   - the helper ships;
   - each engine passes the cross-process consistency gate (Chromium, Firefox and WebKit).
4. **End-to-end tests.** Add `tests/m2-ui/*-live.spec.ts` against a disposable server with the preview enabled:
   - use a per-run test token and signing key generated in memory, never logged;
   - run one complete mission each for keyboard, touch, no-WebGL and 3D;
   - respect the 30 POST/min budget with one disposable server per full run (a perfect run is 23 POSTs).
5. **Passport route.** The `/passport?profile=m2-preview` view is not built yet; the Passport currently renders inside the mission shell.

## Checked against Sol's Stage A at `196b61a` (read-only; Astra's Stage A review pending)

No contract conflicts were found. Each point below was checked against `docs/M2_STAGE_A_CLAUDE_HANDOFF.md` and the shared source at `196b61a`.

| Need | Sol provides | Frontend status |
|---|---|---|
| Availability and start | GET `/capability` (runtimeId, grant required/valid); POST `/authorize` `{approvalToken}` sets an HttpOnly grant cookie; POST `/start` `{runtimeId,sessionId,previewId:'bass-b20-training-v1',mode:'demo',commandId}` returns revision 0 | `createHttpTransport` calls exactly these paths. AuthPanel clears the password field after one POST. Public missions stay locked; capability is not authorization |
| Preview session | Grant expires after 3600 s or on revoke; a restart clears all grants and changes the runtimeId; GET `/session/:id` returns the latest head | The controller's `authorized()` detects runtime change; 403 pauses writes; reconcile is by GET |
| Action dispatch | POST `/action` `{runtimeId,sessionId,expectedRevision,commandId,action}`; `requestIdentity` is async (`Promise<string>`) and hashes everything except commandId | `ContractRuntime.identify` has the same async signature. One write in flight; POST starts paced at least 2.1 s apart; the exact request is retained while the outcome is unknown |
| Fault and repair | Fault `training-fan-reversed-v1` introduced once; `snapshot.diagnostic` is not-run/stale/current; `training.pendingRepair` and `training.repair` receipts | DiagnosticBoard renders the supplied copy only; stale findings are hidden; repair receipts are shown. Astronaut cues read these fields from before/after snapshots |
| Qualification | `QUALIFY_INSTRUMENT`; REPAIR_REQUIRED and QUALIFICATION_FAILED refusals; qualified when `state.setup.qualifiedRevision === revision` | QualificationPanel says "Training configuration check passed — not a NASA certification". The wide camera and cheer fire only on that confirmed condition |
| Passport | `state.passport` entries (corrections `[]`), `passportPresentation.{sourceEvidence,trainingHistory,learnerConclusions}`; `ADD_LEARNER_NOTE` at most 4, preflighted by `noteIssue` | Three-section Passport by `data-origin`; the note draft is kept on a 400 with the typed issue |
| Save and restore | Every snapshot carries a signed checkpoint; POST `/resume` `{runtimeId,checkpoint,commandId}` (`ResumeResponseSchema` is `StartResponseSchema`); pure `admitLocalSave` / `admitLocalDiscard`, `PREVIEW_SAVE_KEY` / `PREVIEW_SAVE_LOCK` | Checkpoint download plus resume from file (≤28,000 bytes). **Writable local save not built**: it waits for Astra's per-engine consistency acceptance, so `engineConsistencyAccepted:false` remains the default |
| Errors | 200 refusal vs HTTP errors; 400 noteIssue; 403; 409 (incl. COMMAND_ID_REUSED); 429/503 with Retry-After; timeout, non-JSON or 500 = commit unknown | LinkBanner covers each one; covered by the fixture gallery and controller unit tests |

**Dependencies for the joint milestone, in order:**
1. Astra approves Stage A.
2. Merge Sol's reviewed SHA, then apply the three-file seam above.
3. Run a local launcher with private secrets: `scripts/local-game-preview.ts`, with `MICROFIRE_LOCAL_GAME_PREVIEW=1` and the origin, realm, key-id, access-token and signing-key variables. Never paste these into chat or commit them.
4. Add live browser tests (one full mission each for keyboard, touch, no-WebGL and 3D), within the 30 POST/min budget.
5. Writable save only after Astra accepts each engine's consistency results.

**Example request** (shape from Sol's handoff; identities are computed at runtime, never copied from fixtures):

```ts
const request = { runtimeId: snapshot.runtimeId, sessionId: snapshot.sessionId, expectedRevision: snapshot.revision, action: { type: 'RUN_DIAGNOSTIC' } };
const body = { ...request, commandId: await requestIdentity('action', request) };
// → 200 {apiVersion:'1', ok:true, snapshot, feedback?} | 200 {ok:false, code, message, faults?, snapshot} | HttpFailure
```

**Open items for Sol:**
- Response parsing: Sol exports `parsePreviewJson`, which rejects duplicate JSON members. The browser transport currently uses `res.json()` before zod parsing. Should responses also go through `parsePreviewJson`? The frontend will follow Sol's answer.
- The fault-category display labels (Missing, Wrong mount, Missing supporting part, Reversed orientation) are presentation copy and still need Sol's confirmation.

## What runs where

- **Public mission pages** (`/missions/station-arrival`, `/missions/bass-assembly`):
  - unchanged unless `?preview=bass-b20-training-v1` is present;
  - with it, the gameplay chunk loads, and the 3D bench loads only when the learner asks for it;
  - without `contractRuntime`, the shell says the backend is not integrated and sends nothing.
- **Fixture gallery** (`/m2-fixtures`):
  - returns 404 unless `MICROFIRE_M2_FIXTURE_GALLERY=1` at runtime; `noindex`; never linked;
  - reads the approved JSON from disk and drives the real controller;
  - requests are logged, never sent;
  - it is presentation evidence, not M2 completion.

## Tests

- `npx vitest run --config vitest.m2-ui.config.ts`: controller, recovery semantics and view model, against the approved fixtures.
- `npx playwright test -c playwright.m2-ui.config.ts`: run after `npm run build`; port 3240, gallery enabled.
- Screenshots go to `docs/qa/screenshots/m2/`.
