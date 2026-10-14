# Claude M1 backend handoff — Astra corrections, 2026-10-14

Backend verdict: READY for frontend M1 development on feat/astra-defect-fixes, subject to adopting the current contracts below. This does not approve frontend integration, gameplay availability or public release. Base: 1c1af90; exact implementation commit and final branch HEAD are recorded in ASTRA_FIXES_INTEGRATION_REPORT.md and the final handoff. Do not branch from the older origin/main and miss the local corrections. No push, merge or deployment was performed.

## Contracts to adopt together

- API envelope version stays 1 for this pre-release baseline. Rank responses now require support {kind, claimId, citations}; rankingVersion is p1-claim-support-v2. Old strict parsers are incompatible with the additional required fields, including the earlier coverage/Ask changes. Adopt the current @microfire/shared, not copied DTOs.
- A retrieval score or a matched field is not proof of a measured outcome. Only complete canonical source-claim text establishes support in this conservative deterministic matcher; free-form paraphrases are not semantically verified. Unknown/unrecognized outcomes remain gap even with high relevance. Direct requires an observed research claim, resolvable source citations and exact recorded target conditions, not tolerance-only matches. Derived, interpretation and unsupported support kinds stay distinct. Direct with no target describes the source run only.
- Ask remains deterministic fixed-template output, without an AI provider. Repeated test IDs are normalized/deduplicated; bounded abstention summaries preserve full catalog/quarantine lookup. Render 200 abstentions as such. Continue handling 400/413/415/429, Retry-After, transport/non-JSON failures and safe 500 errors.
- Passport schemaVersion stays 1; GameState stays v2. Entry.limitations retains canonical source warnings; entry.learnerNotes holds learner text separately and defaults to [] for older entries. Do not merge these arrays or label learner text verified. Passport validation rejects missing canonical caveats but still does not verify arbitrary prose, applicability or achievements.
- v1 saves migrate to v2 with setup-proof invalidation; older v2 saves load with default notes. Existing defective/edited passports are not retroactively scientifically approved by loading them. Present canonical dossier warnings independently and flag failed Passport validation rather than silently claiming acceptance.
- MAX_SAVE is exported by @microfire/game-core: 500,000 serialized UTF-16 characters. Every successful transition produces a schema-valid, structurally saveable state within that limit. A candidate exceeding it returns SAVE_LIMIT_REACHED and the identical prior state. Show the error without replacing state or claiming that the action was saved.
- PROPOSE_NEXT_TEST keeps its existing input shape; its limitations field is learner-authored. REMOVE_PROPOSAL with an index 0–19 lets the learner explicitly remove a proposal in the lunar mission to recover budget; an absent index returns INVALID_ACTION. No proposal/note is silently dropped for size. After freeing space, retry the refused action or completion.
- Classifications retain the newest 200 attempts. At capacity, an older superseded attempt is removed while each statement's latest answer is preserved; corrections remain possible before/after reload. The bounded Passport correction history is not a complete event log or a score penalty.

Use transition(state, action, catalog, at) in every graphical/keyboard/2D adapter. On failure preserve result.state and render result.message. Parse/load before dispatch; corrupt, unsupported, oversized or mismatched saves are recovery states. Offer readRawSave/download before explicit discardSave confirmation. Storage failures are still possible even when state is within budget; show them honestly and retain the in-memory state.

## Data and status boundaries

One source-checked B20 observation remains admitted: calibrated oxygen 17.4 vol%; raw flow sequence, unknown pressure/acceleration/uncertainty and limitations unchanged. All 55 other legacy rows remain quarantined, including B16/B19 source-cells-checked-pending-review. No valid two-record comparison exists; display the compare 404 honestly. No new scientific value, source, model, media or provider was added.

The six approved feature reasons are applied with precise Ask wording, with every readiness field unchanged. Production missions remain UNAVAILABLE. Backend HTTP browser checks are not completed workstation/PIX/frontier/export workflows or playable mission evidence. Claude still owns the stale home/methodology page copy and research interaction implementation.

## Shared-file and dependency ownership

The owner authorized these Astra contract corrections and reason changes. Claude must review actual consumer adoption before merging its frontend. No Claude approval or cross-chat acknowledgement is claimed.

Sol changed no dependency/package/lockfile/config. Claude owns the next Three.js/R3F package and lockfile proposal in its separate branch; Sol must not concurrently edit those files. Review versions and changes, run clean install/audit/check/browser validation before merging the dependency proposal. No paid Meshy jobs or dependency installation was authorized by this handoff.

Create a separate frontend worktree from feat/astra-defect-fixes after verifying its exact SHA. Keep primary MicroFire-V2 and the existing dirty worktrees. Dev ports: Claude 3101, Sol 3102; browser tests use 3217 sequentially. See OWNERSHIP.md and API_CONTRACTS.md. No direct-main push or deployment.

## Evidence

The integration report contains all five fixes, the six reproduction outcomes, tests and limitations. Existing suite expanded from 80 to 103 tests; browser suite from 12 to 14. Source validation retains one source/experiment and 55 quarantined rows. These establish the backend development baseline, not independent human scientific approval, final accessibility/performance acceptance or release readiness.
