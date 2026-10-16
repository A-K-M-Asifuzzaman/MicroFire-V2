# Candidate2 correction verification and review decisions

**READY FOR CLAUDE CONSUMER REVIEW.** This is Sol's corrected documentation candidate, not Claude signoff or Astra approval. Exact previous commit: **02e0588ce0eca1ebdb71bac0d758caea2abd1fc2**; accepted M1.5 ancestor **b6d15a47ec25f57350896f1dc63dc59192f57b00**. New correction SHA is reported in the delivery and resolved by `git rev-parse HEAD` after commit. Branch codex/m2-contract-plan; no322f2c2 integration.

## Corrections tied to Astra findings

| Finding | Concrete corrected contract | Evidence / remaining runtime gate |
|---|---|---|
| C1 missing diagnostic output | Snapshot.diagnostic current/stale/not-run union; symptoms/model inference/source purpose/repair; full pure TrainingTransitionResult; endpoint auth/capability types | Full diagnostic success/refusal/wrong/stale fixtures; negative missing/malformed/source-inconsistent mutations; strict literal checks. Runtime schemas/coordinator absent |
| C2 ambiguous repair history | Bounded pendingRepair with cause, target, actual removal revision/time; consumed into first completed receipt; reverse reinstall clears pending without credit | Both Astra histories distinguish13/15 at same rig15; real core and metadata round-trips;30 permitted edit permutations preserve receipt and same-state future behavior |
| C3 stale cross-tab overwrite | One LocalSlot, exclusive Web Lock, epoch/generation compare, safe tombstones, explicit raw-bound case/discard consent; read-only fallback | Both simultaneous serialized orders, stale N overwrite, stale resume, cross-case/epoch/tombstone conflicts and old/new crash model; actual browser/worker/lock/storage exception tests still required |
| C4 incomplete auth/retry lifecycle | Opaque revocable server grants; fixed expiry/restart/rotation; canonical intent SHA IDs; start tombstones; precise action dedup-before-stale and resume head equality; issuedAt/no checkpoint expiry | Grant truth table, MAC/key/tamper and identity/retry/head models. Actual cookies/headers/revocation races/HTTP behavior remain implementation gates |

The four original wire examples were updated; thirteen additional complete wire examples cover start input, diagnostic/repair and capability/auth/revoke/resume. All17 valid examples are typechecked, and invalid response/input cases are explicit in fixtures/README, negative mutations and expected TypeScript errors. No valid M2 runtime schema or endpoint is falsely claimed to exist.

## Actual fresh checks for this correction assignment

Executed in MicroFire-V2-m2-plan with existing installed dependencies and Node24 from `/Users/asifzaman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` on PATH. No install or package/lockfile change. Temporary logs/type harness: `/private/tmp/m2-contract-corrections/`.

| Command/check | Actual result |
|---|---|
| pwd, git top-level/remote/branch/status/log/worktrees | Exact clean starting branch/02e0588; sole writable V2 origin; other worktree identities recorded before edits |
| `npm test` | **103 passed,5 files**,3.48s; existing random-action/save/classification/science/API regression coverage |
| `npm run validate:data` | **1 source,1 admitted experiment,55 quarantined rows**, local fixture hash matches; remote links explicitly not rechecked |
| `node --import tsx docs/m2/fixtures/verify-contracts.ts --write` | Generated updated documentation fixtures/measurements;20 proof groups pass |
| `node --import tsx docs/m2/fixtures/verify-contracts.ts --emit-types /private/tmp/m2-contract-corrections/typecheck-fixtures.ts` | Read-only example drift check and20 proof groups pass; emits temporary literal harness only |
| `node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop docs/m2/fixtures/contract-types.ts docs/m2/fixtures/verify-contracts.ts /private/tmp/m2-contract-corrections/typecheck-fixtures.ts` | Pass after correcting proof-helper narrowing; full proposed types, pure result signature, proof script and17 complete JSON literals; expected errors for missing diagnostic/historical category/normal mode/client availability |
| Documentation/JSON/relative-link/manifest/Git whitespace/scope checks | Recorded at final delivery; only docs/m2 files may enter the correction commit |

The first strict proof-script typecheck found a nullable test-head access and an overly broad helper GameAction return type; both were narrowed without a cast or runtime package change, then the full check passed. This is correction evidence, not a claim that an earlier failed check passed unchanged. Current source/reducer remains byte-identical to the accepted baseline.

## New measured byte projections

Reproduce from committed [MEASUREMENTS.json](fixtures/MEASUREMENTS.json) with the proof script. All sizes are actual UTF-8 bytes of canonical/JSON transport objects, not string.length guesses. This is a serialization projection, not completed end-to-end validation.

| Shape | Bytes |
|---|---:|
| Representative complete checkpoint,39 large wrong-choice cells + one correct choice,4 maximum legal500-unit notes,2 canonical entries/correction, max32-char keyId,5-digit loopback port and safe-integer revision | **13,769** |
| Its signed base64url token | **18,403** |
| Its full resume request (runtime UUID +64-hex commandId) | **18,550** |
| Larger of the two pending repair-history checkpoints | **3,228** |
| Last accepted command receipt | **136** |
| Complete wrapper overhead beyond TrainingCase | **583** |
| Full completed ActionResponse, including duplicated token/state/projections | **32,785** |
| Full ten-finding current diagnostic response | **12,967** |
| Mathematical maximum token from20,480 decoded bytes | **27,351** |
| Full resume request using that maximum token | **27,498** |
| LocalSlot envelope with max token +UUID epoch/head +max generation/revision | **27,552** (≤28,000 local cap) |

Compared with candidate1 13,420/18,006, provenance/auth-scope/lastCommand and identity fields now fit with headroom. The earlier15,612/20,928 surrogate-note stress projection is historical: candidate2 explicitly **rejects lone surrogates**, so2,048-byte escaped-surrogate notes are invalid, preserved raw/input on refusal, not accepted legal progress. The maximum legal500-unit well-formed BMP note is1,502 serialized bytes. Four such notes are included above. Keep2,048 as a defensive byte ceiling. No source text or notes were truncated.

Large histogram counters are **shape/budget stressors**, not a claim this many attempts ran; their sum fits the projected session revision and the correct-choice cell remains1. The projection does not prove every reachable state can complete. Optional update preflight must reserve a complete essential suffix (bytes and safe revisions), and runtime property tests must verify it. Diagnostic output is derived/not in checkpoint; only checked revision persists. Local epoch/generation never expands the HTTP resume body because only the signed token is uploaded.

## Scientific and compatibility invariants

No science data, shared runtime schemas, feature states or source IDs were edited. B20 remains the only admitted experiment, oxygen17.4 calibrated;55 legacy rows remain excluded, B16/B19 human-review/admission unresolved. Ten apparatus functions and7.6×7.6×17cm duct remain sourced to NASA report PDF12–13; detailed geometry/order/anchors are schematic. Candidate2 labels all diagnostic symptoms/faults as authored training; sourced hardware purpose is separate from model inference and canonical historical B20 outcome. A signature, save shape, qualification animation or citation lineage never certifies a combustion claim. Canonical caveats/learner notes stay distinct; deterministic Ask/ranking/abstention unchanged.

Candidate1 source-download/hash/visual evidence remains in Git history and the original07/08; no new download or human source approval is claimed. Astra's independent primary-source check and review were available and read. Remote browser/spec references were read only for the lock/storage contract. No NASA figure/PDF/media added, no reference repository written.

## Approval questions / handoff

No missing local evidence blocks **consumer review**. The following deliberate choices require Claude consumer agreement and Astra final approval: typed current/stale finding presentation; pending receipt semantics; Web Locks + epoch/generation with read-only/download fallback; opaque local grants; canonical intent IDs instead of random idempotency UUIDs; nonexpiring compatible checkpoints with current-key-only verification and read-only recovery after rotation;256 start tombstones per runtime; exact source/training Passport rendering. These choices are specified, not left for Claude to guess. Any amendment updates types/examples/proofs/docs together before freeze.

Use [09_CLAUDE_CONSUMER_HANDOFF.md](09_CLAUDE_CONSUMER_HANDOFF.md) as the exact review packet. No message has been sent to Claude or another chat. After consumer agreement, Astra reviews the **new correction SHA**. Only a subsequent explicit approval permits stage A backend implementation, then complete2D,3D/joint hardening and independent vertical-slice acceptance. Existing nine registry proposals stay pending coordinated integration; no Available promotion. Sol alone edits the ledger/schema migration window; Claude owns frontend models/UI and the next dependency/lockfile window; shared file edits remain serialized.

Not rerun for this docs-only correction: build, browser/E2E, lint, npm advisory audit, live Meshy balance, native screen-reader/device/power-loss checks. The proof runner tests bounded models/current core/serialization, not new runtime API behavior. No preview activation, gameplay coordinator, push/merge/deploy, reference mutation or paid generation is part of this delivery.
