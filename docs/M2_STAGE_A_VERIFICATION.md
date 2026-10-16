# M2 Stage A backend verification

Date: 2026-10-17 (Asia/Dhaka). Verdict: **STAGE A BACKEND READY FOR ASTRA REVIEW**. This is Sol's implementation report, not independent Astra acceptance.

Approved starting SHA: `11ec4caa772b71e112b5fc176baacdd6853f8173`. Branch: `codex/m2-stage-a-backend`. Worktree: `MicroFire-V2-m2-stage-a`. Accepted M1.5 remains an ancestor; deployment commit `322f2c25417ffd333094117a46c0bc9282d4972c` is excluded. Use the exact final A5 SHA in the delivery/external report as the recommended Claude integration baseline after Astra review. `git rev-parse HEAD` identifies this complete handoff commit.

## Reviewable milestones

| Milestone | Commit | Implemented scope |
|---|---|---|
| A1 | `bc473659df4ce7a7a675ab2815680528a5c309f9` | Frozen shared training types/schemas, equipment exports, canonical JSON/identity and first schema tests |
| A2 | `bd0086028dd19f6920b50d7fe17d7c415c1b3a80` | Pure deterministic coordinator, validation/projections, repair histories and complete reducer-driven episode |
| A3 | `9f61c219faa4eec7a871bc78c9769e5d0a3bfc83` | Opaque local grants, fixed origin/configuration, signed checkpoint/scientific validation and security tests |
| A4 | `4d761fbfa75f80b0b93deb6fe286d36c1ba1c13c` | Real endpoints, shared limiter, local launcher, atomic preflight/reconciliation and production HTTP tests |
| A5 | This handoff commit; exact SHA in final delivery | Pure local-save admission, final refinements/tests, M1 regression evidence and practical Claude handoff |

A1's focused schema/identity tests passed before coordinator implementation. Existing tests grew from103 to110 at A1 and117 at A2. Later review refinements preserve the frozen field names/semantics: precise diagnostic-success type inference, integer/phase/timestamp/receipt constraints, native Node JSON import compatibility, accessor-safe identity input and final save/recovery tests.

## Implemented components

- `packages/shared/src/{training,training-schemas,canonical,equipment,apparatus,local-save}.ts`: one shared browser/Node identity implementation, strict wire/admission shapes, frozen labels/copy and pure device-save decisions.
- `packages/game-core/src/training.ts`: one coordinator wrapping the existing reducer, pinned B20 source checks, atomic authored fault, diagnosis/repair, guarded qualification, canonical evidence, notes/completion and derived diagnostics/Passport/checks. Existing GameState v2/Passport v1 and core normal/demo migration remain intact.
- `apps/web/lib/game-preview-security.ts`: local configuration/headers, hashed server-memory opaque grants, revocation/expiry/restart, HMAC/canonical checkpoint verification with independent source/history validation.
- `apps/web/lib/game-preview.ts` and the existing API dispatcher: disabled local endpoints, strict streamed UTF-8/duplicate-key boundary, bounded cases/tombstones, per-case/realm serialization, expected-revision/idempotency/restart/resume and precommit full-response validation.
- `scripts/local-game-preview.ts`: validates config/data, binds production Next to127.0.0.1, propagates shutdown; no hosted/proxy profile or credentials in CLI arguments.
- `tests/unit/training-*.test.ts`, `tests/backend/training-http.test.ts`: deterministic adversarial, real Node HTTP and actual Chromium identity checks. Existing UI tests were not weakened.

Exact API/import/procedure examples are in [M2_STAGE_A_CLAUDE_HANDOFF.md](M2_STAGE_A_CLAUDE_HANDOFF.md).

## Commands and actual results

Run from the implementation root with Node24/current installed dependencies. No dependency or lockfile change was needed; `npm ci --offline --ignore-scripts --no-audit --no-fund` installed the existing lockfile successfully.

| Command | Actual result |
|---|---|
| `npm test` | **141 passed /10 files**:103 baseline plus38 new tests across schema/identity8, coordinator8, security6, API11 and pure save5 |
| `npm run typecheck` | Passed root TypeScript and web Next typegen/TypeScript |
| `npm run lint` | Passed, zero warnings |
| `npm run validate:data` | Passed:1 source,1 B20 experiment,55 legacy rows excluded; local fixture hash matches. Remote links not rechecked |
| `npm run eval:science` | Ask30/30, rank7/7, faithful13/13, forbidden0, repeatable30/30; authored evaluation, not independent scientific approval |
| `npm run security` | Passed secret/environment/provider/XSS/media-rights pattern checks; not a complete security audit |
| `npm audit --json` | Exit0; zero reported vulnerabilities. Uses the owner's previously authorized npm advisory metadata request |
| `npm run build` | Passed production build; no frontend or public availability changes |
| `node --import tsx docs/m2/fixtures/verify-contracts.ts --emit-types /private/tmp/m2-stage-a-typed-examples.ts` |26 planning groups and committed-fixture drift checks pass |
| `node --import tsx docs/m2/fixtures/verify-receipts.ts` |6 independent planning regression groups pass |
| Strict fixture TypeScript command below |33 typed examples and both planning verifiers pass; runtime schema test also parses33 examples and14 signed snapshot payloads |
| `node --import tsx --test --test-concurrency=1 tests/backend/training-http.test.ts` |9 production HTTP/browser-identity groups pass |
| `npm run test:e2e -- --workers=1` |90 existing M1 browser tests passed;22 existing project-specific skips; no failures |
| Git ancestry, preserved worktrees, data/package/registry diffs, whitespace |Passed; exact final postcommit record accompanies the delivery |

Strict fixture command:

```sh
node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop docs/m2/fixtures/contract-types.ts docs/m2/fixtures/equipment-copy.ts docs/m2/fixtures/verify-contracts.ts docs/m2/fixtures/verify-receipts.ts /private/tmp/m2-stage-a-typed-examples.ts
```

HTTP/browser commands use the approved local Chromium cache through PLAYWRIGHT_BROWSERS_PATH. Tests bind isolated ports3247–3255; existing M1 suite uses3217 and its established disposable ports. Sandbox loopback binding initially failed with EPERM; authorized local-server escalation allowed actual execution. No result is inferred from that failed attempt.

## What the evidence establishes

**Identity and receipts:** one canonical implementation supplies exact intent bytes. Node/Web Crypto/four frozen vectors and the fixed observation digest agree. Production revision22 identifies its actual accepted OBSERVE request and differs from a previous diagnostic. Explicit accepted request identity supplies every committed token. Refusals/resume preserve prior token/receipt. Duplicate action recovery precedes stale rejection; wrong-body IDs and concurrent outdated requests fail without double commit.

**Gameplay and recovery:** actual Station inspection/collection/completion → ten-part build → atomic reversed fan → current diagnostic → correct diagnosis → real removal/reinstallation → qualification → B20 observation → Passport → completion works. All fifteen reachable diagnostic cases have frozen copy. Two repair histories and30 legal edit permutations retain actual removal revisions after interruption;1,000 wrong diagnoses remain correctable. Missing/stale/repeated diagnosis, wrong order/mount, fan removal before diagnosis, reversed reinstall, later damage, qualification guard order, premature observation/completion and post-observation rig edits are covered.

**Admission and science:** a valid MAC alone does not admit impossible state. Tests reject isolated future diagnosis, orphan/future repair, noncanonical timestamps, impossible inactive initial phase, incorrect receipt revisions, altered scientific conclusions and substituted nonempty limitations. M2 admission also rejects legacy schema defaults/normalization that would change signed state; legacy migration itself is unchanged. Full canonical research content is compared to the admitted fixture; nested core restore and source lineage remain required. The two research corrections arrays remain empty; separate authored-training history cannot inherit DIRECT; notes are unassessed.

**Authorization and checkpoints:** off by default; exact local Host/Origin/forwarding checks; secret operator comparison; opaque HttpOnly/Strict host-only cookie; repeated authorization reuses absolute expiry; eight-grant cap; copied revoked/expired/restarted grants denied. Revocation during an in-flight read prevents later mutation. Key rotation refuses the old token with CHECKPOINT_KEY_UNAVAILABLE. Restart with stable key requires new authorization/runtime and restores exact saved bytes. Tampering, incompatible live heads, invalid UTF-8, duplicate JSON and altered identities fail safely.

**Bounds and retry:** actual request reader accepts32,767/32,768 bytes and rejects32,769, including chunk-independent UTF-8 accounting and invalid encoding tests. Real resume bodies padded to the boundary succeed. Full response preflight accepts65,535/65,536 and rejects65,537. Four500-unit Unicode notes, preserved caveats and completion work over HTTP; fifth-note refusal preserves the token. Integer reserve rejects optional work while essential repair/qualification/observation/completion can finish. Thirty-POST allowance remains shared with research; the real eight-wrong-diagnosis path received429, honored Retry-After, reconciled and completed. Eight active cases/256 issued-case tombstones and safe idle eviction/resume are tested.

**Local saves:** pure admission tests stale revision/generation/epoch, same-revision different tokens, idempotency, raw-bound replacement/discard, tombstones, corrupt raw and read-only fallback. Success returns a proposed slot, not Saved. Browser locks/storage/read-back are Claude's implementation and remain untested here.

## Scientific and public-state preservation

B20 remains the only admitted record, calibrated oxygen17.4 vol%. All55 other legacy rows remain excluded. B16/B19 remain unresolved/pending human review with calibrated/unscaled column, restrictor, procedure and anomaly caveats. No data/admission file changed. Deterministic ranking/Ask/abstention retain their existing scientific behavior. No game repair changes a historical observation, generates a measurement, certifies hardware or promotes learner prose.

Feature registry and the six pending reason edits remain untouched. No public mission, Available status, deployment or paid Meshy operation is authorized. Existing frontend routes/components/styles/models and root/workspace dependency/lockfile/config files remain unchanged. Generated browser screenshots are preserved outside the repository and restored to baseline in this backend branch.

## Implementation notes and remaining gates

- Real Next synthesizes localhost in Request.url while the wire Host remains127.0.0.1. The approved wire Host, POST Origin and forwarding restrictions remain enforced. This is framework adaptation, not a new local/public authorization bypass.
- Compound apparatus-purpose descriptions include both approved hardware pages where needed. No new source claim or catalog record was created.
- The pre-existing planning proof file failed whole-repository lint. Narrow comments permit its intentional invalid-state `any` mutations/control-character oracle; an unused binding and const declaration were corrected. No assertion, fixture or approved wire shape changed.
- A parallel verification run hit the existing desktop axe test’s unchanged30-second timeout (89 passed/1 timeout/22 skips). Its trace is retained. The final existing browser suite ran with one worker, unchanged assertions/timeouts and no concurrent backend-browser smoke test.
- Oversized encoded tokens are rejected as HTTP413 before the bounded resume schema; a red test first reproduced the incorrect400 status and now passes.
- Browser-engine-specific writable saves are **not approved**. Chromium identity/M1 UI tests do not prove Web Locks consistency. Firefox/WebKit cross-process visibility/lost-update/crash tests remain required, with read-only/download fallback until independent acceptance.
- Full accessible2D/cinematic3D gameplay, browser save/reload/interruption, native screen-reader/physical-device performance and playable-mission acceptance remain Claude/joint/Astra stages. Human scientific approval remains separate.
- This local single-process shared operator realm is not an account service, public hosted deployment, remote sync, encrypted backup or exactly-once recovery of unsaved progress across process loss.

Next milestone: independent Astra Stage A review of the exact final implementation SHA, followed by Claude's complete accessible2D mission consuming this backend. No frontend authority or shared-file ownership is transferred silently.
