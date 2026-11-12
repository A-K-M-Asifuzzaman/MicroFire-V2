# Campaign HTTP v1 — implemented contracts, transport review candidate

Shared runtime validators: `packages/shared/src/campaign-http.ts`, exported from `@microfire/shared` at bc170664f61d247ce97bb54b06a3efd128d195e3. They parse actual private CampaignService snapshots, domain responses and exports. Existing service tests exercise all five missions, attribution, retries, concurrent revisions, restore and authorization. **The application does not mount these HTTP routes.** Ordinary production requests return 404; no public mission availability changed.

Base candidate: `/api/game/campaign/v1` (`CAMPAIGN_HTTP_BASE`). This version is separate from frozen `/api/game/preview`. Shared campaign actions/records/identity remain `evidence-campaign-v1`; M2 canonical JSON, body limits and snapshots are unchanged. Route mounting requires joint Claude/shared-contract agreement, implementation and Astra review. Do not point a scene at a nonexistent route and simulate its success locally.

## Proposed HTTP surface and exact validators

| Method / relative path | Request | Response |
|---|---|---|
| GET `/capability` | no query/body | `CampaignHttpCapabilityResponseSchema`: campaignVersion 1, runtimeId, authorization, required/valid grant, local-only scope |
| POST `/authorize` | existing `AuthorizeRequestSchema`; server must enforce canonical operator token | existing `AuthorizeResponseSchema`; grant only in a private cookie |
| POST `/revoke` | existing `RevokeRequestSchema` | existing `RevokeResponseSchema`; expire that campaign cookie |
| POST `/start` | `CampaignHttpStartRequestSchema`: runtimeId, client-generated sessionId UUID | `CampaignHttpSnapshotResponseSchema` |
| GET `/session/:sessionId` | canonical UUID, no query/body | `CampaignHttpSnapshotResponseSchema` |
| POST `/action` | existing strict `CampaignCommandSchema` | `CampaignHttpActionResponseSchema` |
| POST `/resume` | `CampaignHttpResumeRequestSchema`: runtimeId, signed checkpoint | `CampaignHttpSnapshotResponseSchema` |
| GET `/export/:sessionId` | canonical UUID, no query/body | `CampaignHttpExportResponseSchema` |

Every response retains the API-v1 envelope. Snapshot payloads are exactly `CampaignSnapshotSchema`, including state, training, source review, selected experiment, explanation/appraisals/habitat feedback, revision and signed checkpoint. Action responses discriminate `{ok:true,snapshot,feedback?}` from `{ok:false,code,message,snapshot}`. Refusal codes are bounded uppercase identifiers; unknown refusal codes must remain refusals, not success. Error/transport failures use existing `HttpFailureSchema` with HTTP status and Retry-After, never a source-data fallback.

Start has no arbitrary mode/catalog/state payload. The runtime must match before calling the existing service. A repeated session UUID returns its current existing head, never a reset. The client retains the same UUID until an uncertain start is reconciled; new deliberate cases get new UUIDs. Resume repeats the exact signed token. Neither request uses M2 requestIdentity, nor should a fabricated commandId be added to their strict shapes.

For `/action`, compute `campaignIdentity` on exactly runtimeId/sessionId/expectedRevision/action. Use `campaignJson` through that existing implementation; do not reimplement hashing or use integer-only M2 canonicalization. The server validates identity, runtime, grant, revision, state and action. An accepted command advances one revision, including educational wrong-answer feedback where the engine defines that behavior; a domain refusal retains the prior head. An exact accepted retry returns the same signed checkpoint/feedback. GET the head after timeout, dropped response, malformed output or ambiguous 5xx; never assume an action committed or blindly resubmit a new identity.

## Mission-to-action contract

| Mission | Required sequence / authority |
|---|---|
| 1 Station Arrival | Inspect B20 with TRAINING/GAME INSPECT_EVIDENCE; REVIEW_SOURCE with the canonical claim/locators and research-vs-fiction classification; collect the source entry and complete. A wrong review receives coaching without earning the source gate. |
| 3 Flame Detective | After campaign M2 qualification/completion, CORE START_MISSION flame-detective; SELECT_EXPERIMENT with admitted ID and supported source conditions; CORE PREDICT_OUTCOME locks that choice; deliberately OBSERVE_DOCUMENTED_RESULT; EXPLAIN_OBSERVATION with exact citation, source-observation relation, all required limitations and unassessed learner prose; complete only through server acceptance. |
| 4 Claim Trial | CORE START_MISSION claim-trial; APPRAISE_CLAIM for each authored statement with kind/evidenceLevel/citations/support/confounders; preserve actual learner choices and corrected feedback. No causal or lunar conclusion is awarded from B20. Complete only after the engine's rubric succeeds. |
| 5 Habitat | CORE START_MISSION lunar-habitat; ASSESS_HABITAT with explicitly fictional scenario values, insufficient-evidence verdict, exact related-source citation, all five gaps and proposed next measurements; RECORD_DECISION and PROPOSE_NEXT_TEST; complete through the server. Learner text is not semantically validated science. |

M2 inside this campaign uses TRAINING-wrapped actions and the same real manual assembly/diagnosis/repair rules. **Standalone frozen M2 checkpoints are not campaign records.** Do not import their completion bits, silently promote a local save or cast a CampaignSnapshot into the old M2 Snapshot. The campaign snapshot lacks the old progress/access/presentation wrapper; reusing its view components requires an explicit reviewed adapter or separately agreed server view. Preserve Claude's working standalone M2 submission loop while that consumer is developed separately.

Exact action shapes are `CampaignActionSchema`; complete scenario/action vectors are in `tests/unit/campaign-helpers.ts`, with real service progression in `tests/unit/campaign-service.test.ts`. A canonical illustrative command vector is [examples/campaign-command.json](examples/campaign-command.json). Its UUIDs identify no real server/grant. Snapshots and exports are parsed against the implemented validators in tests; no fabricated live HTTP success example is supplied for an unmounted service.

## Security and mounting requirements — explicit blockers

1. **Cookie scope is not ready for this namespace.** The present PreviewAuthority uses cookie name `microfire_m2_grant` and Path `/api/game/preview`. A browser will not send it to `/api/game/campaign/v1`. The private service's manually authorized Request unit tests do not prove browser-cookie integration. Specify/review a separate campaign credential/grant/cookie authority and path, or an explicitly accepted adapter, preserving M2 defaults. Do not silently broaden the M2 cookie or reuse review-route credentials.
2. Default off and local-only until review; disabled/hosted contexts return 404 before authentication details. Preserve hosting-marker, raw Host/origin, opaque-grant and secret-boundary protections. Cookie HttpOnly/SameSite/expiry/revocation, one-time token entry/clearing, no CORS exposure, no-store/data-only headers and loopback binding need real HTTP/browser proof.
3. Proposed byte budgets for review: start/auth/revoke 1 KiB, action 64 KiB, resume 176,128 bytes of UTF-8 JSON. The resume token is ASCII and ≤175,000 characters; decoded authenticated payload remains ≤131,072 bytes/256 events. These budgets are not configured by this contract file and must never enlarge M2's frozen envelope. Stream-bound before parse; reject duplicate keys, malformed UTF-8, unsupported media/unknown keys/nonfinite values and oversized data without changing a head.
4. Reuse the 30-POST/minute local-process budget and explicit read limits/capacity rules; honor Retry-After. Auth checks must occur before mutation and after waits. Start/resume runtime validation is an HTTP-adapter requirement; the current private method signatures do not supply it themselves.
5. Existing service capacity is eight heads, optional-action reserve at 192 events/96 KiB, hard 256 events/128 KiB. Preserve source-reviewed replay, realm/origin/key/catalog MAC binding, timestamp limits, session locks, exact retry and stale-live-head refusal. No durable public multi-user store, cross-user account isolation, exactly-once restore after all unsaved-response/process loss, or durable anti-rollback guarantee is claimed.
6. Export and recovery preserve source/training/fictional/learner provenance, raw backup and safe refusal. Reject forged, wrong-key, wrong-realm, wrong-catalog, future and stale checkpoints. Browser saves stay read-only. Ordinary frontend state, scene animation and fixture data never grant progress.

## Test specification for a later mounted adapter

- Disabled and hosted/forged-locality paths; wrong/missing/expired/revoked grant; real browser cookie namespace/path; conflicting cookies; cross-origin POST; no credential in JSON/client bundle/logs.
- All four mission journeys and campaign M2 dependency; valid and invalid actions; prediction lock; wrong source/locator; genuine source entries versus training corrections and unassessed notes; no unsupported habitat safety verdict.
- Concurrent revision conflicts; same exact retry; altered identity; old runtime; lost acknowledgement followed by GET reconciliation; POST quota/capacity and Retry-After without losing a case.
- Byte boundaries including multibyte text, duplicate JSON, decode/canonicalization errors; checkpoint tampering, wrong realm/key/catalog, restart/fresh authorization and same-head restore; refusal cannot overwrite a live newer head.
- Strict validators through Claude's real transport/controller, then keyboard/touch/no-WebGL/3D scene journeys. A contract test or reducer pass cannot substitute for cookie/HTTP/browser acceptance.

These are ready-to-execute tests/specifications, not a claim that a campaign HTTP handler or new mission UI was installed. Obtain Astra's exact-commit security acceptance and the owner's release decision before any exposure.
