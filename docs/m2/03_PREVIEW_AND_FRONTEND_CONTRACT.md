# Proposed local preview and frontend contract

**Not implemented. Freeze with Astra before coding.** This adds `/api/game/preview/*` endpoints and a training coordinator; it does not change public feature availability or old research DTOs.

## Authorization boundary

A demo mode value, query parameter, localStorage edit, disabled-button removal, guessed URL or `isMissionAvailable` request field cannot unlock a mission. The pure callback already exported by game-core is not a security boundary. In the preview, the server alone owns session state, constructs the two-ID allowlist callback and invokes the core reducer.

Proposed server-only configuration, all required and off by default:

- `MICROFIRE_LOCAL_GAME_PREVIEW=1`.
- `MICROFIRE_PREVIEW_ORIGIN=http://127.0.0.1:<dedicated-port>`; one exact loopback origin including port, not `*` or a remote host.
- `MICROFIRE_PREVIEW_ACCESS_TOKEN`: operator-provided high-entropy secret, at least 32 random bytes encoded safely, never NEXT_PUBLIC, URL/query, logs, screenshots or Git.
- `MICROFIRE_PREVIEW_SIGNING_KEY`: separate ≥32-byte server secret; stable across local restarts to verify saved checkpoints. Purpose-separated MACs for session cookies and checkpoints.

A reviewed future launcher first runs the existing data-integrity validation, then binds the existing Next server to **127.0.0.1**, checks configuration and refuses known hosted deployment environments (including VERCEL). Do not activate these settings now. Do not reuse the unrelated 322f2c2 deployment commit. Existing Node production builds can be tested on a local-only listener; NODE_ENV alone is neither authorization nor a ban on local production-build tests.

Every preview request verifies exact configured Host/origin, disabled/hosted conditions and authentication as appropriate. Mutation Origin must match; CORS is not opened. Validate forwarding metadata rather than using it to infer authorization; Next may populate X-Forwarded fields even locally. No trust in a client-asserted peer IP. Host-only checking is insufficient: loopback binding **and** the operator secret/capability are required. Review this deployment exclusion before enabling preview; if loopback-only operation cannot be established, keep it disabled. No remote tunnel, proxy deployment or public-preview authorization is included.

POST authorize takes the token in JSON over the loopback origin. Compare in constant time using Node crypto; never retain the submitted token in client storage. After success clear the input and issue a signed HttpOnly, SameSite=Strict, Path=/api/game/preview cookie with a **60-minute** lifetime, bound to the origin and local operator realm. The local HTTP loopback cookie cannot use the `__Host-` prefix/Secure requirements that assume HTTPS; any later HTTPS design needs separate review. GET routes also require the cookie except the disabled capability probe. Logout revokes the cookie; disable configuration revokes all preview operations regardless of cookies/checkpoint signatures. Local XSS is outside a MAC's protection: maintain CSP/text rendering and do not present it as anti-cheat or multi-user account security.

Authorization must be deliberately supplied by the operator through an unlogged local password input or an equivalently private Playwright environment secret. Tests exercise the actual authorize endpoint and obtain the actual cookie. No test-only auth bypass, `context.addCookies` fabrication or hard-coded funded/provider token. No Meshy key is involved.

## Endpoint protocol

All JSON has `apiVersion:"1"`, no-store/data-only headers and strict runtime schemas. Existing endpoints/ApiErrorSchema remain unchanged. New game endpoints receive their own typed error schema and version-1 preview contract. Unknown object fields fail; no raw client state is accepted on start/action.

| Method/path | Request | Success | Failure / behavior |
|---|---|---|---|
| GET /api/game/preview/capability | none | Enabled local instance: `{enabled:true, authorization:"operator-token-required", previewId:"bass-b20-training-v1"}` | Disabled/hosted/invalid host: 404. Does not issue a grant or change registry |
| POST /api/game/preview/authorize | `{approvalToken:string}` | `{authorized:true, expiresAt}` plus HttpOnly cookie | 403 PREVIEW_UNAUTHORIZED; 404 if disabled; body/media/rate guards apply |
| POST /api/game/preview/revoke | `{}` | `{authorized:false}`; expires cookie | Same gating; reauth needed for mutations/resume |
| POST /api/game/preview/start | `{previewId:"bass-b20-training-v1", mode:"demo"}` | New Snapshot; fresh `createGameState` + authorized START_MISSION station-arrival | 403/404; 503 if session capacity reached; reject client initialState/completed flags |
| GET /api/game/preview/session/:sessionId | no query | Latest Snapshot for authorized local realm | 404 SESSION_NOT_FOUND after expiry/restart/unknown ID; use saved checkpoint resume |
| POST /api/game/preview/action | ActionRequest below | Snapshot + domain result | Domain refusal: HTTP 200 `ok:false`, unchanged snapshot; stale command:409; transport/auth failures below |
| POST /api/game/preview/resume | `{checkpoint:string, commandId:string}` | Verified/restored Snapshot, scientific lineage rechecked | 400 invalid/untrusted/unsupported checkpoint, 409 stale active head/dataset mismatch, 403 reauth, 413 oversized |

Reusing a signed checkpoint does not bypass authorization: both cookie and server configuration are still required. Expose only two permitted mission IDs in snapshot capabilities; do not return pretend availability for unfinished missions. Core mission prerequisites remain checked after the callback.

Both new and old API handlers use the **same existing limiter instance per request class**, not a fresh game allowance or a per-request limiter. Preserve **300 GET / 30 POST per process per minute** and streaming **32,768-byte** request limit, content type and malformed UTF-8 checks. Refactor extraction of these helpers only through reviewed Sol-owned adapter work; do not raise the numbers. Start/auth/action/resume/revoke all consume POST budget. 429 retains Retry-After and no mutation; browser backs off instead of speeding retries. A new game response may exceed request size because it contains a snapshot and opaque checkpoint; enforce a separate conservative 64 KiB response budget in this adapter, without changing existing routes.

## Proposed TypeScript surface

This is the exact review candidate for typed callers. `GameState`, `GameAction`, part/mission IDs and Fault/TransitionCode refer to existing exports. Runtime Zod schemas must enforce the additional refinements described below. Do not paste these as competing frontend domain schemas.

```ts
import type { GameAction, GameState, PartId } from '@microfire/shared';
import type { Fault, TransitionCode } from '@microfire/game-core';

type PreviewId = 'bass-b20-training-v1';
type FaultCode = Fault['code'];
type Step = 'source-orientation' | 'assembly' | 'diagnostic-required'
  | 'diagnosis-required' | 'repair-required' | 'qualification-required'
  | 'b20-inspection-required' | 'passport-review' | 'complete';
type CorePreviewAction = Extract<GameAction, { type:
  'START_MISSION' | 'INSPECT_EVIDENCE' | 'COLLECT_EVIDENCE' |
  'INSTALL_PART' | 'REMOVE_PART' | 'QUALIFY_INSTRUMENT' |
  'OBSERVE_DOCUMENTED_RESULT' | 'COMPLETE_MISSION' }>;
type TrainingAction =
  | { type:'GAME'; action:CorePreviewAction }
  | { type:'RUN_DIAGNOSTIC' }
  | { type:'SUBMIT_DIAGNOSIS'; partId:PartId; faultCode:FaultCode }
  | { type:'ADD_LEARNER_NOTE'; text:string };

type DiagnosisChoice = { partId:PartId; faultCode:FaultCode; at:string };
type Training = {
  scenarioVersion:PreviewId;
  fault:{ id:'training-fan-reversed-v1'; origin:'authored-training';
    introducedAt:string; introducedRevision:number } | null;
  diagnosticRevision:number | null;
  diagnosis:{ at:string; faultyRevision:number } | null;
  repair:{ removedAtRevision:number; reinstalledAtRevision:number; at:string } | null;
  // Sparse list: unique (partId,faultCode), max 40 cells. Exact counts, no click log.
  diagnosisCounts:{ partId:PartId; faultCode:FaultCode; count:number }[];
  firstWrongDiagnosis:DiagnosisChoice | null;
  lastWrongDiagnosis:DiagnosisChoice | null;
};
type TrainingCase = { state:GameState; training:Training };
type CheckpointPayload = TrainingCase & {
  checkpointVersion:1; previewId:PreviewId; sessionId:string; revision:number;
  catalogSha256:string; rulesVersion:'m2-training-r1'; origin:string;
};
type EvidenceReview = {
  status:'empty'|'lineage-verified'|'not-validated'|'rejected';
  scope:'structure-and-citation-lineage-only'; certification:false;
  catalogSha256:string;
  entries:{ entryId:string; status:'lineage-verified'|'not-validated'|'rejected'; issues:string[] }[];
};
type Progress = {
  step:Step; completedChecks:number; totalChecks:5;
  allowedMissions:('station-arrival'|'bass-assembly')[];
  allowedActionTypes:TrainingAction['type'][];
  allowedCoreActionTypes:CorePreviewAction['type'][];
  diagnosisReady:boolean; repairReady:boolean; qualificationReady:boolean;
  nextInstruction:string;
};
type Snapshot = TrainingCase & {
  previewId:PreviewId; sessionId:string; revision:number;
  checkpoint:string; // base64url(payload UTF-8) + '.' + base64url(HMAC-SHA256)
  progress:Progress; evidenceReview:EvidenceReview;
  access:{ scope:'local-gameplay-preview'; expiresAt:string;
    publicAvailabilityChanged:false; scientificApproval:false };
};
type ActionRequest = {
  sessionId:string; expectedRevision:number; commandId:string; action:TrainingAction;
};
type TrainingCode = 'DIAGNOSIS_REQUIRED'|'DIAGNOSTIC_STALE'|'FAULT_NOT_INTRODUCED'
  | 'REPAIR_REQUIRED'|'WRONG_PHASE'|'SCENARIO_MISMATCH'|'NOTE_LIMIT_REACHED'
  | 'CHECKPOINT_LIMIT_REACHED'|'EVIDENCE_REJECTED';
type DomainResult =
  | { ok:true; feedback?:{ correct:boolean; hint:string }; snapshot:Snapshot }
  | { ok:false; code:TransitionCode|TrainingCode; message:string;
      faults?:Fault[]; snapshot:Snapshot };
type HttpCode = 'INVALID_REQUEST'|'NOT_FOUND'|'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'|'RATE_LIMITED'|'INTERNAL_ERROR'
  | 'PREVIEW_UNAUTHORIZED'|'SESSION_NOT_FOUND'|'STALE_SESSION'
  | 'COMMAND_ID_REUSED'|'CHECKPOINT_UNTRUSTED'|'CHECKPOINT_VERSION_UNSUPPORTED'
  | 'DATASET_MISMATCH'|'PREVIEW_CAPACITY';
type Wire<T> = { apiVersion:'1'; data:T };
type HttpFailure = { apiVersion:'1'; error:{ code:HttpCode; message:string; retryable:boolean } };
type StartRequest = { previewId:PreviewId; mode:'demo' };
type StartResponse = Wire<Snapshot>;
type ActionResponse = Wire<DomainResult>;
type ResumeRequest = { checkpoint:string; commandId:string };
type ResumeResponse = Wire<Snapshot>;
```

Progress intentionally exposes only the two literal mission IDs. IDs here must match existing IdSchema semantics; commandId/sessionId are bounded UUID-format strings (36 lowercase characters), not arbitrary TextSchema. All revisions/counts are nonnegative safe integers. Sparse diagnosis cells have unique part/fault pairs, positive counts, and a maximum of40 entries. Timestamps use existing ISO validation. MAC verification is server-only, constant-time, over the exact decoded payload bytes with a fixed purpose prefix `microfire-m2-checkpoint-v1\0`. Reject malformed base64url and oversize strings before decoding; do not attempt unsigned parsing as a fallback for progression.

`EvidenceReview` and `Progress` are derived response projections, **not stored proof**. Always recompute on resume and after mutations. The checkpoint stores one `state`, one training metadata object and provenance/version fields. Do not persist a second phase or completion boolean that can contradict them. Signed data is visible/base64-encoded, not encrypted: include no secrets or personal details.

Pure coordinator proposal: `transitionTraining(current:TrainingCase, action:TrainingAction, catalog:Catalog, at:string): TrainingTransitionResult`. It takes no cookie, storage, network, Three.js or signing key. It invokes `transition` with a server-authorized invocation context (the HTTP layer has already authorized the request). The coordinator constructs a fixed station-arrival/bass-assembly availability callback; no user-configurable function enters its payload. New actions and metadata are versioned independently, outside strict GameState v2. The first slice stays guided; an investigator-mode control is deferred, though its eventual rules must be identical. Core transition result types remain source-compatible. The future runtime schema for core failure codes should be sourced once (review extraction/re-export from shared if necessary), not independently reinvented in Claude's UI.

## Reachability refinements

The wrapper validator requires core mode=demo, dataset/hash/preview/rules/origin matches, and a completed prefix of at most station-arrival/bass-assembly. An active mission must be null or one of those two IDs. Predictions, classifications, proposals and decision remain empty/null in this episode; no later mission state is imported. Core setup consistency and current entry/revision invariants still apply. Training fault/diagnosis/repair revisions cannot exceed the core setup revision; repair removal must follow introduction and reinstall must follow removal. No diagnosis/repair receipt exists before a fault. Current B20 Assembly evidence requires qualification and the required diagnosed/repaired fault; completion requires that evidence and the existing station prerequisite. Enforce these checks on action input, output and resume; a MAC does not replace schema/invariant validation.

## Phase/action table

The coordinator validates **every** request, including actions listed as allowed by an earlier snapshot. A stale HUD does not authorize an action. All core actions remain wrapped as GAME; arbitrary GameAction union members are rejected in this episode.

| Derived step | Commands allowed / guard | Result |
|---|---|---|
| source-orientation | GAME INSPECT_EVIDENCE B20, COLLECT_EVIDENCE canonical claim, COMPLETE_MISSION station-arrival; after completion START_MISSION bass-assembly | Existing source proof; assembly active; never auto-seed completed IDs |
| assembly | INSTALL_PART, REMOVE_PART, RUN_DIAGNOSTIC | Existing physical constraints; correct ten-part build atomically injects fan fault once |
| diagnostic-required | RUN_DIAGNOSTIC; non-injected-part setup edits allowed | Current faulty revision captured; no fan repair until diagnosis |
| diagnosis-required | SUBMIT_DIAGNOSIS after current diagnostic; RUN_DIAGNOSTIC; non-injected-part edits | Wrong diagnosis accepted with feedback false/count update; correct fan fault enters repair-required |
| repair-required | REMOVE_PART fan then INSTALL_PART fan correct; other repairs; RUN_DIAGNOSTIC | Existing reducer handles rig; repair receipt only for actual identified fan correction |
| qualification-required | QUALIFY_INSTRUMENT; setup edits and RUN_DIAGNOSTIC | Requires required fault+diagnosis+repair and zero current faults; edits always revoke qualification |
| b20-inspection-required | OBSERVE_DOCUMENTED_RESULT B20, RUN_DIAGNOSTIC, setup edits | On source binding + qualifiedRevision, one current assembly Passport entry; edits return to checks |
| passport-review | ADD_LEARNER_NOTE; COMPLETE_MISSION bass-assembly; diagnostic read | Source proof already exists; canonical caveats unchanged; no more rig edits in this episode |
| complete | Session GET, Save/download/reload; no further progression command except idempotent repeat of completed command | Readable final case; explicit new start creates a distinct case after backup prompt |

If all parts are present but player-generated orientation faults remain before scripted introduction, assembly/diagnostic feedback allows their repair without claiming the required introduced fault is done. Qualification returns FAULT_NOT_INTRODUCED until the correct-build trigger has run. Diagnosis tied to an earlier setup cannot authorize a different fault; recompute/require current diagnostic. Progress derivation checks existing current Passport entries, core mission status, qualification and training receipts in that order, and must be a tested pure projection.

## Transaction and retry semantics

Server session map holds at most **8 active sessions**, each ≤20 KiB decoded payload; expire idle sessions after **60 minutes**. It is a single-process local preview store, not a distributed database or deployment architecture. Bind sessions to the authorized local operator realm. No arbitrary user/account identifier or PII is collected.

Serialize each session's action handling. Compare expectedRevision to current revision before reducing. Same commandId + SHA-256 digest of the exact serialized request body bytes as the latest processed command returns the cached exact result without reapplying; same ID with another body returns 409 COMMAND_ID_REUSED. Older unknown command IDs with stale revision get 409 STALE_SESSION. A client sends only one in-flight command, retries the same commandId/body after ambiguous network failure, and GETs the session before sending a new command. This needs only a bounded latest-command receipt; it is not unlimited idempotency history.

All inner core calls, metadata updates, evidence validation, budget checks, checkpoint signing and response serialization finish **before** committing the candidate to the session map. No partial install/injection or Passport append is committed on failure. A fully rejected command leaves state/training/revision/checkpoint unchanged. Transport failures never change it. Wrong diagnosis is an explicit **accepted** training update with feedback false; revision advances once. Placement domain refusals are unchanged-state results; their coaching feedback is transient, not persisted through a purported rejection. Persistent rejected-placement analytics would need a separately reviewed accepted action; none is proposed here.

GET returns latest signed checkpoint; local Save writes that token, not speculative client state. A new authorized action rechecks cookie expiry even when session exists. Runtime disable/reauth leaves saved data readable for recovery but stops mutation. No automatic resubmission queue or retroactive claim of saved progress.

## Failure contract

| Status | code | Client action |
|---:|---|---|
| 400 | INVALID_REQUEST | Keep current snapshot/input; show schema error; do not cast unknown response |
| 400 | CHECKPOINT_UNTRUSTED / CHECKPOINT_VERSION_UNSUPPORTED | Preserve/download exact raw value; do not trust progress; existing save remains |
| 403 | PREVIEW_UNAUTHORIZED | Preserve checkpoint; reauthorize deliberately, then GET/resume |
| 404 | NOT_FOUND / SESSION_NOT_FOUND | Disabled preview or lost local runtime session; inspect capability or resume saved signed checkpoint after authorization |
| 409 | STALE_SESSION / COMMAND_ID_REUSED | GET current; resolve competing tab/state; never blindly replay with a new ID |
| 409 | DATASET_MISMATCH | Read-only recovery; no automatic catalog rewrite or re-signing |
| 413 | PAYLOAD_TOO_LARGE | Preserve raw payload, explain 32 KiB boundary; no “invalid scientific evidence” label |
| 415 | UNSUPPORTED_MEDIA_TYPE | Correct client request encoding; unchanged state |
| 429 | RATE_LIMITED | Respect Retry-After; retain command ID for an uncommitted request |
| 503 | PREVIEW_CAPACITY | Keep checkpoint; close/expire another local case or retry later |
| 500 | INTERNAL_ERROR | Safe generic text, no stacks/secrets; GET last state before deciding retry |
| 200 domain false | Core code or TrainingCode | Show exact guidance/faults; snapshot is unchanged; recovery stays available |

## Concrete request/response examples

Valid start request (after real authorize/cookie):

```json
{"previewId":"bass-b20-training-v1","mode":"demo"}
```

Valid placement uses the existing anchor, not a 3D coordinate:

```json
{"sessionId":"11111111-1111-4111-8111-111111111111","expectedRevision":4,"commandId":"22222222-2222-4222-8222-222222222222","action":{"type":"GAME","action":{"type":"INSTALL_PART","partId":"fan","anchorId":"duct-inlet","orientation":"correct"}}}
```

Wrong-anchor variant with `anchorId:"duct-exit"` yields HTTP 200 data `{ok:false,code:"WRONG_ANCHOR",message:<core guidance>,snapshot:<unchanged authoritative Snapshot>}`. This is a response-shape description. The complete proposed response and matching request are in fixtures/WRONG_ANCHOR_RESPONSE.example.json and fixtures/WRONG_ANCHOR_REQUEST.example.json; the full proposed start response is fixtures/START_RESPONSE.example.json. They use real existing-core state and a clearly public test-only MAC key, not an implemented API or an authorization bypass.

Complete HTTP error examples:

```json
{"apiVersion":"1","error":{"code":"PREVIEW_UNAUTHORIZED","message":"Local preview authorization is required.","retryable":false}}
```

```json
{"apiVersion":"1","error":{"code":"STALE_SESSION","message":"This case changed. Reload its current state before continuing.","retryable":false}}
```

Forbidden extra fields `{...,"isMissionAvailable":true}`, normal mode start, other episode IDs and later mission START actions fail; none can relax the core gate. A client-supplied `snapshot`, `qualifiedRevision`, `validation:true` or completed mission list on action/start is rejected, not merged.

A future fixture factory must use a deterministic test clock/IDs and private test-only signing key, call the real coordinator/API, then parse the **entire** Snapshot/ActionResponse with shared schemas. Required fixtures: fresh source step; complete rig before fault injection (internal only); injected fan; wrong diagnosis; diagnosed/unrepaired; repaired/unqualified; qualified; B20 Passport review; complete; stale/corrupt/unknown-reference checkpoints. No fake MAC constant or unguarded fixture endpoint is part of the product.

## Claude controller and route handoff

Use one controller in `apps/web/game`, fed only by schema-checked Snapshots. Proposed entry surfaces are `/missions/station-arrival?preview=bass-b20-training-v1` and `/missions/bass-assembly?preview=bass-b20-training-v1`; query strings select the UI shell only. They do not authorize the API, pass a callback or change public registry state. A guarded local authorization form obtains the actual cookie before start. Default mission routes retain their current Coming Soon content.

`/passport?profile=m2-preview` explicitly selects the isolated preview checkpoint reader; the default `/passport` continues reading the existing normal profile. A user-visible “Local training preview” label is mandatory. The profile query is not a grant: resumed progression still needs authorization/MAC validation. Reuse/refactor the accepted canonical-source/learner separation and per-entry recovery presenter in passport-preview.tsx rather than introducing a second Passport implementation. Do not write the preview into the normal key just to make the old reader show it.

Existing `components/client-api.tsx` cannot be used unchanged for game transport: `callApi` parses the old ApiErrorSchema and discards machine error codes, while `useLatestRequest` aborts superseded requests. Claude should implement the small typed game transport/controller in `apps/web/game/client.ts`, parsing the new endpoint-specific success/error schemas and retaining HTTP status, error.code, message and Retry-After. Keep research callers unchanged. Mutating commands use **one in-flight request**, exact-body/command-ID retry and GET reconciliation, not latest-request-wins cancellation. Native same-origin fetch sends the HttpOnly cookie; never read it into JS. The existing Passport validator call can still use the old helper/schema.

2D/3D adapters emit the same TrainingAction when a placement is committed. Pointer movement, hover, lighting, camera transforms and interpolation stay local visual state; never POST on animation frames. A drag maps to an existing named anchor/orientation; core result determines committed pose. Keyboard supplies the same select→anchor→orientation→install commands, focus feedback and repair actions. Renderer switching reads the same Snapshot without restarting, qualifying or modifying evidence. A rejected placement restores the last confirmed pose; an ambiguous response shows pending/recovery rather than a guessed success.

## Compatibility / proposed files

- Add reviewed schemas/types under `packages/shared/src/training.ts`, re-export in shared index; no existing strict v2 or Passport field changes. New game HTTP schema is endpoint-specific; existing research consumers continue parsing their existing responses.
- Add pure coordinator/progress projection under `packages/game-core/src/training.ts`, with narrow existing-core reuse, not a second reducer for part placement.
- Add server-only adapter under `apps/web/lib/game-preview.ts` and reviewed dispatch in existing API route/helper. Shared limiter/body-parser extraction stays behavior-preserving. No second API service or new dependency required; Node crypto supplies MACs/random IDs.
- Add preview persistence adapter beside game-core persistence using SaveStorage; expose no signing key to the browser. It validates/delegates core state loading, never substitutes validation flags from storage.
- Claude's future `apps/web/game` adapter uses these shared schemas and one controller for 2D/3D. Proposed filenames are an ownership map, not files created by this planning commit.
