# M2 backend finalization and Claude integration handoff

Date: 2026-10-23, Asia/Dhaka. **CONDITIONAL — SPECIFIC FIXES REMAIN.** Backend functional corrections are verified and reviewable; the newly reported Next.js dependency advisory requires the separate dependency owner's patch/revalidation before integration approval. Full frontend integration, playable-browser acceptance, writable browser persistence and release approval remain separate gates. The final delivery supplies the exact ending SHA for this document's commit.

Backend branch/worktree: `codex/m2-stage-a-backend`, `MicroFire-V2-m2-stage-a`. Starting SHA: **196b61a29a234b01806fe1808a4afd774897cdeb**, descended from approved contracts **11ec4caa772b71e112b5fc176baacdd6853f8173** and accepted M1.5 **b6d15a47ec25f57350896f1dc63dc59192f57b00**. Deployment commit322f2c2 remains excluded.

Claude's actual inspected frontend is **a0bb27e68c491d0730dbb981ca6d3325bb8bd346** on `feat/m2-claude-gameplay` in `MicroFire-V2-m2-claude`;44b03c9 is an earlier ancestor. Its source is read-only in this task. Its live `contractRuntime` is still null; presentation fixtures and the illustrative tour do not produce earned gameplay state.

## Backend audit: existing functionality

| Feature | Existing service / endpoint | Contract / coverage | Limit or remaining integration |
|---|---|---|---|
| Mission initialization | createTrainingCase, POST start | TrainingCaseSchema, StartRequest/Response; coordinator/API/HTTP full episode | Guided demo, Station first; no user-supplied initial state |
| Session creation | PreviewService, POST start; GET session/:id | Snapshot, LastCommand; retries/tombstones/capacity tests | Eight live cases,256 issued-case identities per runtime |
| Availability/locks | Local operator grant; coordinator allowlist | Capability/auth schemas; disabled/unauthorized and public mission-denial tests | All five public missions stay unavailable; only two local episode missions |
| Assembly placement | Existing core transition wrapped by transitionTraining; POST action | GAME INSTALL_PART/REMOVE_PART; coordinator/HTTP tests | Ten exported parts/anchors; schematic mounting order, not an engineering procedure |
| Incorrect placement | Core dependency/anchor/duplicate guards | Unchanged domain refusal with snapshot; actual wrong-mount and duplicate tests | A missing prerequisite is checked before a wrong mount; fit the duct before testing fan mount choice |
| Fault introduction | Atomic final installation + fan remove/reversed install | Training.fault; deterministic/reload/repair tests | Fixed authored training-fan-reversed-v1; no client fault control |
| Inspection | Shared equipment descriptions; RUN_DIAGNOSTIC and GET projection | DiagnosticResult,15 frozen cases | Not-run/stale omit current findings; no physical sensor readings |
| Diagnosis | SUBMIT_DIAGNOSIS after current check | Training.diagnosis/counts; stale/correct/incorrect/reload tests | Correct historical identification persists after later edits |
| Incorrect diagnosis | Accepted feedback.correct=false with bounded histogram | ActionResponse;1000-attempt unit test and real8-mistake429 recovery | Guided coaching after an explicit current check; no permanent attempt lock |
| Repair | Real remove/reinstall with persisted pending/completed receipt | PendingRepair/RepairReceipt; both removal histories and interruption tests | First completed receipt retained; later damage still revokes qualification |
| Qualification | Mandatory repair guard, then existing core fault check | REPAIR_REQUIRED before QUALIFICATION_FAILED; unit/HTTP tests | Training configuration check, not NASA certification |
| Completion | Explicit B20 observation, Passport review, COMPLETE Assembly | Progress five checks; real HTTP full completion | No later three missions, scores or client success flags |
| Passport | Real COLLECT/OBSERVE entries plus derived training presentation | Passport v1, PassportPresentation, exact source-content/lineage tests | Research corrections empty; learner prose unassessed; no geometry-to-evidence promotion |
| Save/resume | Signed checkpoint in every snapshot, POST resume; pure local admission | CheckpointPayload/LocalSlot; restart/key/tamper/conflict tests | Server state is memory only; raw signed checkpoint/download is durable recovery representation |
| Errors | PreviewService strict transport/domain handling | HttpFailure, ActionResponse; body/identity/status/rate tests |500/timeout/non-JSON means unknown commit; reconcile before retry |
| State validation | Shared TrainingCase/Checkpoint schemas + nested core restore + science validation | Schema/security/negative restore tests | Fixed below: chronological observation and pre-Assembly diagnostic admission |
| Session security | Exact loopback Host/Origin/forwarding, opaque grants, HMAC | Security/API/production HTTP denial tests | Shared local operator realm, not private accounts or a hosted deployment profile |

Selecting a part or inspecting an already fetched description is local UI state. Installation progress comes from confirmed `state.setup.installedParts`, never a click or animation. Setup revision, session revision and local save generation are separate counters. No backend engine rebuild was needed.

## Corrections implemented

1. **Observation chronology.** An Assembly Passport entry may not have createdAt earlier than the completed repair receipt's at. Previously a correctly MACed impossible history could resume with all learning checks. The shared validator now rejects it before signing/restoration. Legitimate same-millisecond timestamps remain legal; invalid old bytes remain recoverable raw, never silently edited/re-signed.
2. **Diagnostic phase.** A non-null diagnosticRevision requires Assembly to have started (or completed). Previously revision0 Station could restore a current diagnostic despite RUN_DIAGNOSTIC being unavailable there. Initial Assembly diagnostics at setup0 remain legal. This guard also covers the interval after Station completion and before Assembly starts.
3. **Exact optional output types.** With exactOptionalPropertyTypes, inferred Zod action/error outputs previously allowed present undefined values that did not implement the frozen DTOs. ActionResponseSchema and HttpFailureSchema now omit undefined feedback/faults/noteIssue/context/currentRevision in their parsed output with explicitly checked DTO return types. Actual JSON never carries undefined, so the field names, envelopes, null semantics, statuses and versions are unchanged. Null feedback/noteIssue still fails. Checkpoint parsing/canonical bytes are not normalized by these response transforms.

New failing unit tests first reproduced both restore defects. The executable check of Claude's actual ContractRuntime first reproduced the optional-property incompatibility, then passed after the correction. No frontend or visual file was edited.

## JSON response parsing — resolved

Claude's actual transport uses res.json() followed by the injected shared response schema. **That is compatible with the server's canonical JSON responses.** Keep the existing parsing for this integration; no new parser interface or wire version is required. Malformed JSON, wrong envelopes or schema failures must remain unknown/malformed outcomes, not an accepted snapshot. The live consumer test exercises those failures explicitly.

parsePreviewJson is required at untrusted preview request/checkpoint/local-slot boundaries to reject duplicate JSON members. It is not a MAC verifier. Do not hash a reserialized response, trust parsed local JSON as server state, or treat ordinary res.json() as duplicate-member detection. The server's canonical writer never emits duplicate members. A future stricter response-text parser is optional defense and must preserve the transport's unknown-outcome behavior.

The exact envelopes are:

```ts
// Success: start / session / resume
{apiVersion:'1', data: snapshot}
// Accepted action (including an incorrect diagnosis)
{apiVersion:'1', data:{ok:true, snapshot, feedback?}}
// Domain refusal, HTTP200, unchanged checkpoint/revisions
{apiVersion:'1', data:{ok:false, code, message, faults?, snapshot}}
// HTTP failure
{apiVersion:'1', error:{code, message, retryable, noteIssue?, context?}}
```

These are shape notation, not literal runnable JSON. The example in Claude's M2_FRONTEND_INTEGRATION.md that places ok/snapshot beside apiVersion is a documentation typo: **data is required**. Its actual transport unwraps data correctly. Do not add a second unwrapping step in contractRuntime.parse or remove the server envelope.

Training fields such as fault, diagnosis, pendingRepair and repair use explicit null when empty. Optional feedback/faults/error details are absent when not supplied, never null. Session/runtime UUIDs are identifiers, commandId is an exact SHA-256 intent digest, and snapshot.revision supplies expectedRevision. [All33 complete typed request/response examples](m2/fixtures/README.md) remain valid; [the existing runtime handoff](M2_STAGE_A_CLAUDE_HANDOFF.md) lists every semantic action payload. Those fixtures describe contracts; real service tests establish the working implementation.

## Fault terminology — resolved

| Stable fault code | Approved UI label | Meaning and reachability |
|---|---|---|
| MISSING | Missing | Required component absent from its named mount |
| WRONG_ANCHOR | Wrong mount | Placement at an incorrect mount is refused; cannot become an accepted saved rig |
| MISSING_PREREQUISITE | Missing supporting part | Required supporting component absent; corrupt orphaned rigs are rejected on restore |
| REVERSED | Reversed orientation | Authored schematic orientation mismatch on the five orientation-sensitive parts |

Injected episode fault ID: **training-fan-reversed-v1**. Required correct payload after a current check: `{type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'}`. Labels are presentation copy; never send labels such as "Wrong mount" as the faultCode. All40 part/category choices are accepted vocabulary for the guided diagnosis form; only the displayed required fault is correct. Ten missing-component and five reversed cases have frozen symptom/interpretation/repair copy.

Claude's current faultCategoryLabels map matches this table. It does not itself select an answer. The backend refuses diagnosis before a current check. Guided mode intentionally supplies the approved readable finding/repair after RUN_DIAGNOSTIC; no hidden investigator-mode mechanic is introduced. Findings are authored/model statements with separately cited apparatus purposes, never historical NASA failures.

## Routes, configuration and startup

Base `/api/game/preview`:

| Method / path | Input / result |
|---|---|
| GET capability | Current runtime and caller grant required/valid; no grant secret |
| POST authorize | `{approvalToken}` → real HttpOnly grant cookie, expiry/runtime |
| POST revoke | `{}` → revoke presented grant and clear cookie |
| POST start | `{runtimeId,sessionId,previewId:'bass-b20-training-v1',mode:'demo',commandId}` → revision0 Snapshot |
| GET session/:sessionId | Latest confirmed Snapshot, requires valid grant |
| POST action | `{runtimeId,sessionId,expectedRevision,commandId,action}` → accepted/refused result |
| POST resume | `{runtimeId,checkpoint,commandId}` → exact compatible token/state, no new revision |

There is no standalone observation/checkpoint endpoint. Observation is a GAME action; every snapshot contains its checkpoint. No query or browser flag authorizes a mission.

Server environment variable names: MICROFIRE_LOCAL_GAME_PREVIEW, MICROFIRE_PREVIEW_ORIGIN, MICROFIRE_PREVIEW_ACCESS_TOKEN, MICROFIRE_PREVIEW_SIGNING_KEY, MICROFIRE_PREVIEW_REALM_ID, MICROFIRE_PREVIEW_KEY_ID. No real values belong in this document, client code, URLs, screenshots or traces. Supply private process configuration as described in the Stage A handoff, build with Node24/current lockfile, then run:

```sh
node --conditions=react-server --import tsx scripts/local-game-preview.ts
```

Use the configured exact HTTP127.0.0.1 origin. The launcher validates data/config and binds loopback. POST Origin and wire Host must match; forwarded/cross-site mismatches fail closed. HttpOnly/SameSite=Strict/host-only/Path=/api/game/preview cookie has absolute60-minute expiry; Secure is absent only for this frozen HTTP-loopback profile. Restart clears grants/runtime; reauthorize and explicitly resume with stable compatible key/realm/origin. Key loss/rotation preserves raw recovery but cannot authorize trusted continuation of an old-key token.

## Persistence, errors and trust boundary

Every signed token binds realm/origin/key/version/dataset and one GameState v2, bounded Training metadata and last accepted command receipt. A MAC does not replace scientific/reachability validation, human approval or current authorization. Wrong state, claims, source references, canonical limitations, phase or chronology fail restore. No unsigned legacy save migrates into trusted preview; existing normal/demo v1→v2 migration remains unchanged.

Duplicate latest commands reconcile before stale-revision rejection. A refused action preserves the prior receipt/token. Conflicting resumes cannot replace a live head. A lost HTTP acknowledgement is reconciled by GET and the accepted receipt; process loss plus unsaved response loss recovers only the last downloaded/saved token. Individual cases have separate revision/part/proof state. All valid grants intentionally share one local operator realm/case namespace; this is not per-user access isolation.

Preserve HTTP400/403/404/409/413/415/429/503 and typed code/Retry-After. Only429/503 report retryable=true. Incorrect diagnosis is200/ok:true/feedback.correct:false; invalid notes are400/noteIssue; a valid fifth note is200/NOTE_LIMIT_REACHED. Domain refusal is200/ok:false.500/timeout/non-JSON may conceal a commit: retain exact request and GET before retry. Keep the shared30POST/min budget and2.1-second UI pacing. A request-body cap is32,768 UTF-8 bytes; checkpoint payload20,480/token27,351; response65,536; local slot28,000. No notes or scientific caveats are truncated.

admitLocalSave/admitLocalDiscard remain pure proposals under Claude's future exclusive Web Lock and read-back protocol. They reject stale/equal-revision conflicts, old epochs/generations, unconsented replacement and delayed writes after tombstones. Structural token inspection cannot verify the MAC; a fresh authorized server Snapshot is required. **All engines remain read-only until Astra accepts their consistency evidence.** The current frontend SaveAdapter receives only a checkpoint head: a future writable adapter must also retain/pass the complete freshly confirmed Snapshot required by admitLocalSave, rather than reconstructing authority from a file. That future browser work is not implemented here.

## Executable consumer verification

The backend-owned compiler check reads Claude's actual clean worktree and typechecks its ContractRuntime/transport/controller against the real shared parsers. It performs no merge or frontend edit:

```sh
node --import tsx scripts/verify-m2-consumer.ts ../MicroFire-V2-m2-claude
```

For the real-service check, set MICROFIRE_CLAUDE_WORKTREE to that absolute worktree path and MICROFIRE_HTTP_TEST_PORT_OFFSET to an unused nonnegative offset (100 was used to avoid Claude's active3250 server). Set PLAYWRIGHT_BROWSERS_PATH to the installed Chromium cache, then:

```sh
node --import tsx --test --test-concurrency=1 tests/backend/claude-http.test.ts tests/backend/training-http.test.ts
```

The consumer test loads Claude's actual transport/controller/view-model, injects the real shared runtime, and sends genuine HTTP to a disposable server. Its fetch adapter supplies only browser-like Origin/cookie handling; server authorization, rules, signatures, schema validation and errors are real. It completes the episode with wrong mount, premature qualification, wrong/correct diagnosis, mandatory repair, B20/Passport, completion, resume, revoke/reauthorize and deliberately lost acknowledgement. JSON-failure probes are transport-only synthetic Responses, clearly separate from real-gameplay evidence. Secrets remain random process-only values. The consumer group skips explicitly if the worktree variable is absent; a skip is not compatibility proof.

Actual verification in Sol's worktree:

| Check | Result |
|---|---|
| npm run check | Passed lint, types,144 unit tests/10 files, data, science, basic security scanner and production build |
| Final npm run lint / typecheck / security | Passed after test/document changes; zero lint warnings |
| verify-m2-consumer.ts against a0bb27e | Actual consumer runtime/transport/controller strict types pass |
| Both backend test files, worktree supplied, offset100 |12 passed,0 failed,0 skipped; includes11 backend groups and actual consumer group;70.26seconds |
| verify-contracts.ts / verify-receipts.ts |26 contract groups and6 receipt groups pass;33 typed examples and both verifiers pass strict TypeScript |
| npm run test:e2e -- --workers=1 |90 passed,22 existing project-specific skips,0 failed;2.6minutes; M1 regression only |
| npm audit --json |Exit1, one critical Next.js package finding; see dependency gate below |

The prior lint failure in docs/m2/fixtures/verify-contracts.ts is already fixed in the starting Stage A commit. It passes this batch's full lint and proof/type checks; no further suppression, changed assertion or regenerated contract fixture was added here. Two unit failures and the consumer compiler failure are retained as red evidence. An initial service run found a test setup prerequisite-order mistake and an occupied Claude port; the corrected test and isolated port range passed the complete rerun. No test asserts a fixture gallery is a real playable mission.

## Controlled integration sequence and remaining work

1. Resolve the dependency gate below in Claude's next package/lockfile window, revalidate the patched descendant, and have Astra review the exact resulting SHA. The functional ending SHA in this delivery is a review candidate, not an unconditional integration approval.
2. After owner-authorized integration, use a dedicated `MicroFire-V2-m2-integration` worktree rooted at that Astra-approved backend SHA; incorporate a separately reviewed/pinned Claude frontend SHA there. Preserve both source worktrees. A conflict-free Git merge is not a passing application test.
3. Claude changes `apps/web/game/contract.ts`: import/re-export runtime types from @microfire/shared and assemble ContractRuntime with the six shared schema parsers, requestIdentity and noteIssue. The now-correct exact optional types require no casts or relaxed compiler settings.
4. Claude changes `apps/web/game/contract/specs.ts` to use shared partDefinitions/equipmentCopy; delete the duplicated `contract/equipment-copy.ts` and update its drift test. `contract/parts.ts` remains server-only and returns plain PartSpec props. No backend signer may enter client barrels.
5. Run the private launcher and repeat the exact live endpoint sequence. Add live browser tests in separately owned `tests/m2-ui/*-live.spec.ts`: keyboard, touch/mobile, no-WebGL/2D and3D, context failure, retries/auth expiry, note/Passport provenance and downloaded-checkpoint reload. Verify public descriptions stay unavailable and fixture switches never grant authority. The separate `/passport?profile=m2-preview` route is still frontend work.
6. Keep readOnlySaveAdapter/download. Writable Web Locks/storage requires independent cross-process visibility/lost-update/crash/conflict/exception acceptance for each Chromium/Firefox/WebKit engine/build family. No enablement follows from pure admission or this Node consumer test.
7. Re-run root/M1 checks and integrated gameplay/visual/accessibility/performance checks in that controlled worktree. Claude retains the next reviewed dependency/lockfile edit window; do not replay an older lockfile over its security correction. Human scientific and public release decisions remain separate.

## Current dependency-security gate

Fresh `npm audit --json` on2026-10-23 exits1 and reports **one critical package finding**, Next.js16.4.0, aggregating three advisories. The October17 zero-vulnerability result is historical and must not be reused as a current result. npm identifies16.4.2 as a non-major fix; the [maintainer release exists](https://github.com/vercel/next.js/releases/tag/v16.4.2). No dependency was changed in this backend-only batch.

| Maintainer advisory | Applicability evidence in this backend |
|---|---|
| [GHSA-2464-fhr4-w9xw, image optimization RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) | Maintainer describes a glibc-Linux/upstream image-library issue and sharp≥0.35.5 workaround. Installed tree already resolves sharp0.35.5; no next/image use or unsafe SVG optimization configuration was found. This is not a demonstrated RCE in the local macOS preview |
| [GHSA-p3m5-59mp-jv5r, Server Action DoS](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r) | Maintainer requires at least one Server Action; source search found none. Route handlers are not evidence of Server Action use |
| [GHSA-673q-mjm6-r5xr, use-cache RCE](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) | No use-cache function or Cache Components enablement was found. Maintainer still recommends upgrading without those functions |

These precondition checks limit the demonstrated exposure; they do not erase the package advisory or approve later frontend/hosted use. **Required correction:** Claude, the explicit next package/lockfile owner in OWNERSHIP.md, should pin Next16.4.2 (or a newer jointly reviewed fixed version), regenerate the one lockfile, then rerun install/audit/check, the12 HTTP groups, consumer type check and M1/live gameplay regressions. No exploit test, patched-version install or patched-version validation is claimed here. Sol did not take over that shared-file window or edit Claude's worktree. This is the specific remaining integration security condition, not a request to redesign the backend.

B20 remains the sole admitted experiment, calibrated oxygen17.4vol%. All55 other legacy rows remain excluded, B16/B19 unresolved. Unknown pressure/acceleration/uncertainty remain unknown. Source apparatus dimensions/functions and schematic mounting constraints remain distinct. Illustrative meshes, animations and authored repair cannot become research evidence. Deterministic Ask/ranking/abstention are unchanged. No public unlock, source promotion, asset generation, push, merge or deployment is included.
