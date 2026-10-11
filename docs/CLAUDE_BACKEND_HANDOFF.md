# Typed backend handoff — independent Phase One review

Use the final local review SHA supplied in the handoff, not the primary checkout's older Phase Zero HEAD. Branch: `feat/phase-one-backend-review`; worktree `../MicroFire-V2-backend-review`. No push, main merge or deployment is authorized by this review. Read API_CONTRACTS.md and FEATURE_REGISTRY_REVIEW.md. Review changes against `882e3c8`, and all earlier shared schemas against `0bd3f056394ceeaa2891753055a7ab782d3be5c2`.

## Compatibility

No shared schema, save format, action DTO or HTTP envelope changed in this review. Existing API v1, GameState v2, Passport v1 and dataset `p0-bass-b20-v1` remain. Ask retrievalVersion is now `p1-grounded-template-v2`; ranking weights/tolerances and `p1-conditions-lexical-v1` remain. Source transcriptions, hashes and quarantine ledger are unchanged. Shared-registry explanation changes remain **pending** per the owner: five are accurate as proposed; Ask should say citation-lineage checks, not imply scientific truth verification. Page copy belongs to Claude.

## UI-facing behavioral changes and examples

1. Long unknown test references abstain; never display a B20 answer as an answer about another test.

```json
{"apiVersion":"1","data":{"abstained":true,"code":"no-relevant-evidence","reason":"B999 is not in the validated catalog. Not found here is not the same as never studied.","citations":[],"datasetVersion":"p0-bass-b20-v1","retrievalVersion":"p1-grounded-template-v2"}}
```

2. A named B20 explanation with `{ "material": "cotton" }` includes an `unknown-or-gap` statement saying no requested target conditions match. `direct-observation` describes B20's recorded run, not evidence that cotton was measured. Display the gap and record limitations alongside observations. Oversized explanations abstain with `unsupported-intent` and a reason asking the visitor to narrow the question; no partial scientific sentence is silently truncated.

3. Ranking/gap target previews above 200 characters are labelled truncated **for display only**; full input is still matched. A limiter failure returns ApiErrorSchema JSON 500, with no private connection detail and no research operation executed. HTTP 429 still carries Retry-After; 500 is not automatically retryable.

4. Once the Flame Detective result is recorded, a replacement prediction for that same experiment/revision returns the existing error code:

```ts
import { catalog } from '@microfire/science';
import { transition } from '@microfire/game-core';
import type { GameAction, GameState } from '@microfire/shared';

function dispatch(state: GameState, action: GameAction) {
  const result = transition(state, action, catalog, new Date().toISOString());
  // No renderer override of isMissionAvailable: production missions remain gated.
  if (!result.ok) {
    // Render result.message and preserve result.state, including prediction history.
    // INVALID_ACTION: "The result is already recorded for this setup. Keep the original prediction; a new setup requires a new prediction."
    return result;
  }
  return result;
}
```

Incoming state must first pass load/parse; invalid incoming state is a recovery boundary, not an action failure. Existing PREREQUISITE_MISSING repair recovery and anchor/orphan save rejection remain tested. Client saves and Passport lineage are not authenticated achievements or scientific certification. Prediction gating is not a blinded study: the dossier/Assembly can already expose the same documented outcome.

## Coordination

The six-reason review and exact before/after diff are in FEATURE_REGISTRY_REVIEW.md, including the recommended Ask wording and the separate methodology/home page corrections. Shared owner review under OWNERSHIP.md plus the owner's leave-pending instruction must be resolved before applying or committing `packages/shared/src/features.ts`. Do not change `state`, `implemented`, prerequisites, verification metadata, routes or IDs as part of this copy patch. Keep all missions gated. No approval has been inferred.

For the eventual consumers, import these existing contracts from `@microfire/shared`; API_CONTRACTS.md defines their error behavior and examples:

| Surface | Backend operation | Response contract / limitation |
|---|---|---|
| Workstation | GET `/api/experiments`, POST `/api/evidence/rank` | ExperimentsResponseSchema, RankResponseSchema; show coverage, reasons and retrieval-only score meaning |
| Atlas | GET `/api/experiments` with validated filters | ExperimentsResponseSchema; `total` is catalog matches, not all NASA records |
| Dossier/export | GET `/api/experiments/:id`, GET `/api/export?ids=bass2-b20` | ExperimentResponseSchema, ExportResponseSchema; display limitations and hash/disclaimer; comparisons require another approved record |
| Frontier | POST `/api/gaps` | GapsResponseSchema; field matches are not answers or worldwide absence |
| PIX | POST `/api/ask` | AskResponseSchema; branch on `abstained`, then statements/categories or code/reason; lineage is not truth verification |
| Methodology | Backend evaluation documents, no evaluation endpoint | Read docs/evals/report.md and its small author-labelled/one-record limitations; no independent performance claim |

The follow-up evaluator/report correction follows local backend commit `6a82887be81653255867fc748751e8b84b2479bd`; its local commit SHA is supplied in the handoff response. Do not assume it exists on origin/main. The evaluator's repeatability metric previously compared differently ordered objects using JSON strings; structural comparison now treats key order correctly and fails an evaluation case if repeatability breaks. Corrected repeatability is 30/30; a deliberate non-repeatability probe failed 30/30 and exited 1 as required. No runtime API contract changed.

The owner requested no registry application until Claude's review; preserve Claude's uncommitted features.ts patch in MicroFire-V2-codex. No frontend component, page, CSS, Next config, shared contract or browser-test file was edited by this review. No identifiable Claude Code chat was available to message; these typed examples are the reviewable handoff, not a claim that Claude has approved them.

Claude dev port 3101; Codex 3102; review-only production API probes use 3103. Browser suites share 3217 and must run sequentially after checking it is free. Keep the primary MicroFire-V2 checkout; it owns the worktree Git metadata. New work or integration must follow the latest owner instruction: commit review work locally, **do not push directly to main**. This supersedes OWNERSHIP.md's earlier dated direct-main workflow for this run.
