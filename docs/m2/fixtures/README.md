# Candidate3 contract fixtures — not implemented API responses

All fields are **proposed/unimplemented**. `contract-types.ts` is the complete type-only consumer candidate. `verify-contracts.ts` is a documentation fixture/proof runner: it imports the existing core for physical state/save behavior and uses clearly bounded abstract oracles for new metadata/storage/auth/retry policies. It does not implement transitionTraining, a preview route, a browser storage adapter, or a real cookie service. No application/package imports either file.

## Complete wire fixtures

- START_REQUEST/START_RESPONSE: fresh Station Arrival, explicit runtime/case identity and canonical intent hash.
- WRONG_ANCHOR_REQUEST/WRONG_ANCHOR_RESPONSE: real unchanged core refusal after duct installation; new full Snapshot includes diagnostic not-run.
- UNAUTHORIZED_RESPONSE: HTTP403, no leaked Snapshot, explicit reauthorization guidance.
- DIAGNOSTIC_REQUEST/DIAGNOSTIC_SUCCESS: HTTP200 successful RUN_DIAGNOSTIC with a current authored fan symptom, model interpretation, repair and NASA hardware-purpose citation.
- DIAGNOSTIC_ERROR: HTTP200 domain refusal for diagnosis without a current check; unchanged snapshot, not an HTTP transport error.
- STALE_DIAGNOSTIC_RESPONSE: accepted repair edit with stale previous check; no stale findings represented as current.
- WRONG_DIAGNOSIS_RESPONSE: accepted wrong answer (feedback.correct=false) advances session revision, not rig/qualification.
- PENDING_REPAIR_A/PENDING_REPAIR_B: same revision15 rig and different removal13/15 receipts; session revision19. Neither receipt is guessed after reload.
- CAPABILITY_RESPONSE/AUTHORIZE_RESPONSE/REVOKE_RESPONSE: complete proposed envelopes; **no grant or secret appears in JSON**. A real future authorize route sets the cookie privately.
- RESUME_REQUEST/RESUME_RESPONSE: runtime-bound intent, exact saved token, unchanged checkpoint after restoration.

Thirty-two complete typed JSON examples (HTTP bodies/requests plus explicitly local save results); MEASUREMENTS.json records current byte projections. START/diagnostic domain snapshots are projected from real existing core actions, not obtained from implemented M2 endpoints. Public fixture key `Buffer.alloc(32,7)` is intentionally nonsecret and forbidden in the future runtime. Example MACs are mathematically valid **only under that public key**; they confer no access. There is no fixture grant/cookie endpoint. Fixed clock2026-10-16T10:00Z makes access expiry historical outside that clock.

## Invalid examples and assertions

The runner deliberately deletes snapshot.diagnostic, removes findings, flips qualified, changes checked revision, labels a symptom historical, and replaces its hardware page with observation page112. Each must fail conformance; these are rejected response mutations, not new evidence. Strict literal checks also expect compile errors for missing current findings, a historical symptom category, `mode:"normal"`, and a caller `isMissionAvailable:true` field.

Invalid start body example (HTTP400 INVALID_REQUEST, state unchanged):

```json
{"runtimeId":"33333333-3333-4333-8333-333333333333","sessionId":"11111111-1111-4111-8111-111111111111","previewId":"bass-b20-training-v1","mode":"normal","commandId":"invalid"}
```

A syntactically valid action request whose existing commandId is retained but expectedRevision/body changes receives409 COMMAND_ID_REUSED after schema validation. A malformed ID instead fails400. Old runtime under valid auth gets409 RUNTIME_CHANGED; absent auth always403 before protected identity/cached responses. A bit-flipped MAC or a token signed under another key cannot restore progression. A structurally valid token with impossible receipts/canonical content still fails the future scenario/lineage validator.

## Reproduce

From the planning worktree with Node24/current dependencies:

```sh
node --import tsx docs/m2/fixtures/verify-contracts.ts
node --import tsx docs/m2/fixtures/verify-contracts.ts --emit-types /private/tmp/m2-contract-types.ts
node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop docs/m2/fixtures/contract-types.ts docs/m2/fixtures/equipment-copy.ts docs/m2/fixtures/verify-contracts.ts /private/tmp/m2-contract-types.ts
```

Use `--write` only to intentionally regenerate documentation JSON/measurements from reviewed fixed inputs; it does not edit application files. Ordinary verification compares every committed wire fixture against its generator. Twenty-six proof groups cover the requested adversarial contract cases; their printed scopes explicitly separate core execution, cryptographic bytes, model assumptions and protocol decisions. Browser locks/crashes, cookie transport, streaming guards and full M2 integration must be tested on the future implementation; a proof oracle is not their acceptance evidence.


## Final consumer fixtures

FAULT_INJECTED_RESPONSE → PASSPORT_REVIEW_RESPONSE → COMPLETE_RESPONSE forms the complete typed provenance sequence. Both research entries have corrections=[]; the one training record is separately generated from receipts into passportPresentation.trainingHistory (origin authored-training/evidence not-applicable). The proof factory uses real core COLLECT/OBSERVE actions; notes use a clearly labeled expected-action oracle. Negative tests deliberately tamper copied entries/receipts to require rejection, never to fabricate positive source content.

EQUIPMENT_COPY.md is generated from equipment-copy.ts:10 canonical part/anchor label pairs and15 frozen readable symptom/interpretation/repair records. WRONG_ANCHOR_RESPONSE retains the core code/unchanged state while its **proposed** presentation message uses readable labels; current production core strings are unchanged. Progress.checks and completedChecks must agree in every full example. CheckpointBudget and the three Passport sections are derived projections, not saved authority.

Additional examples: DIAGNOSIS_REQUEST; QUALIFICATION_FAILED_RESPONSE; REVISION_CONFLICT_RESPONSE; RUNTIME_CHANGED_RESPONSE; COMMAND_REUSED_RESPONSE; RATE_LIMITED_RESPONSE (future HTTP429 also requires Retry-After); CHECKPOINT_KEY_FAILURE_RESPONSE; RESUME_AFTER_RESTART_REQUEST/RESPONSE; LOCAL_LOCK_BUSY_RESULT and LOCAL_WRITE_FAILED_RESULT (local, not HTTP); NOTE_INVALID_RESPONSE (HTTP400 with typed noteIssue, exact draft retained by UI). Canonical vectors include key order, UTF-8, decomposed text, array/null and safe integer cases; future Node/browser consumers import one shared pure implementation. No new browser/HTTP runtime verification is claimed.
