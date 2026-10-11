# Typed backend handoff — independent Phase One review

Use the final local review SHA supplied in the handoff, not the primary checkout's older Phase Zero HEAD. Branch: `feat/phase-one-backend-review`; worktree `../MicroFire-V2-backend-review`. No push, main merge or deployment is authorized by this review. Read API_CONTRACTS.md and FEATURE_REGISTRY_REVIEW.md. Review changes against `882e3c8`, and all earlier shared schemas against `0bd3f056394ceeaa2891753055a7ab782d3be5c2`.

## Compatibility

No shared schema, save format, action DTO or HTTP envelope changed in this review. Existing API v1, GameState v2, Passport v1 and dataset `p0-bass-b20-v1` remain. Ask retrievalVersion is now `p1-grounded-template-v2`; ranking weights/tolerances and `p1-conditions-lexical-v1` remain. Source transcriptions, hashes and quarantine ledger are unchanged. Shared-registry explanation changes remain **pending** per the owner, even though their backend wording is accepted as a proposal. Page copy belongs to Claude.

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

The owner requested no registry application until Claude's review; preserve Claude's uncommitted features.ts patch in MicroFire-V2-codex. No frontend component, page, CSS, Next config, shared contract or browser-test file was edited by this review. No identifiable Claude Code chat was available to message; these typed examples are the reviewable handoff, not a claim that Claude has approved them.

Claude dev port 3101; Codex 3102; review-only production API probes use 3103. Browser suites share 3217 and must run sequentially after checking it is free. Keep the primary MicroFire-V2 checkout; it owns the worktree Git metadata. New work or integration must follow the latest owner instruction: commit review work locally, **do not push directly to main**. This supersedes OWNERSHIP.md's earlier dated direct-main workflow for this run.
