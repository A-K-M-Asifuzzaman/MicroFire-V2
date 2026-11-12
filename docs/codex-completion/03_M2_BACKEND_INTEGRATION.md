# M2 integration-ready backend

Status: backend complete for local review; UI connection and independent acceptance pending. Public contractRuntime remains null. Current main frontend was recovered unchanged; Claude's dirty working checkout was not used as a test input.

Existing shared exports: CapabilityResponseSchema, AuthorizeResponseSchema, RevokeResponseSchema, StartResponseSchema (also ResumeResponseSchema), ActionResponseSchema, HttpFailureSchema, SnapshotSchema; requestIdentity; noteIssue; partDefinitions/equipmentDefinitions/equipmentCopy; admitLocalSave/admitLocalDiscard, PREVIEW_SAVE_KEY/PREVIEW_SAVE_LOCK. All are exported from @microfire/shared. Exact endpoint bodies and failure codes remain in M2_STAGE_A_CLAUDE_HANDOFF.md and M2_BACKEND_FINALIZATION.md.

Wire: apiVersion 1; response success is {apiVersion,data}, never an unwrapped snapshot. Domain refusals are HTTP 200 with data.ok=false and identical confirmed checkpoint. Invalid syntax/note is 400; unauthorized 403; missing case 404; runtime/identity/revision conflicts 409; size 413; media 415; shared budget 429 plus Retry-After; capacity 503; unexpected failure 500 with safe text. Only authenticated 409 may disclose current context.

Unknown commit: retain exact intent, GET session/:id, compare revision and lastCommand in the signed checkpoint; never blindly retry a write. Resume cannot overwrite a different live head. Restart changes runtime UUID and invalidates grants. Reauthorize, inspect saved/downloaded checkpoint and explicitly POST resume. Preserve raw bytes on signature/key/version/dataset rejection.

Canonical identity is the shared SHA-256 requestIdentity(endpoint,request), excluding commandId from the canonical intent. M2 canonical JSON supports safe integers, not arbitrary research decimals; no frontend reimplementation. Qualification/observation/rewards are server-derived. Research Passport corrections are empty; authored repairs are a separate not-applicable training projection; learner notes remain unassessed.

Read-only saves stay enabled by default. Downloaded checkpoints can resume through server validation. Writable storage requires separately accepted cross-process Chromium/Firefox/WebKit tests and native lock/epoch/generation admission. No browser flag is enabled by these tests.

Exact Claude seam after review: apps/web/game/contract.ts changes its type re-exports to @microfire/shared and builds ContractRuntime from the schemas/identity/noteIssue; apps/web/game/contract/specs.ts consumes shared equipment exports; remove the mirrored contract/equipment-copy.ts only with its drift test updated. Keep existing transport/controller and pacing. Tests must include real keyboard/touch/no-WebGL/3D sessions, unknown commit recovery and read-only save fallback. /passport?profile=m2-preview remains a Claude UI task.
