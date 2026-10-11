# Phase Zero interface freeze and Claude handoff

Contract baseline: API v1, GameState/Passport schemaVersion 1, dataset p0-bass-b20-v1. Read PHASE_ZERO_ACCEPTANCE.md for the latest local review and acceptance gate. Owner acceptance and Phase One authorization are still required; no merge or independent human scientific signoff has occurred. The original scaffold commit is a7fb5981d9f5ea911b9d45522889b2a7e7fd487e. Later worktrees must use the reviewed acceptance commit, which includes the invariant fixes, rather than the earlier scaffold.

| Owner after P0 | Paths/responsibility |
|---|---|
| Claude Code | `apps/web/app` page/layout/CSS/loading/error files, `apps/web/components`, future `apps/web/game`, `apps/web/public`, visual references/art bible and UI screenshots |
| Codex | `packages/science`, `packages/game-core`, `data`, `scripts`, `tests/unit`, `apps/web/lib`, `apps/web/app/api`, API integrations and scientific evaluation |
| Shared, explicit review | `packages/shared`, root/workspace package files and lockfile, TS/Next/ESLint/Playwright config, `.github`, `tests/e2e`, feature readiness changes, this document |

The API exception takes precedence over Claude's broad `app` ownership. A domain contract must never be duplicated in a UI component. Neither agent silently changes source IDs, oxygen semantics, evidence classifications or reducer behavior. Request a reviewed shared-contract change and update both consumers/tests together. One agent owns the lockfile at a time.

## Claude entry checklist after contract review/merge

1. Verify remote and clean feature worktree; read the supplied CLAUDE/master/design/quality specifications and latest ten design references. Work from the agreed Phase Zero SHA.
2. Run npm ci, npm run check and browser checks. Inspect the tiny foundation UI as an integration surface, not approved final art direction.
3. Import contracts from `@microfire/shared`. Use implemented GET APIs or server data reads. Treat POST rank/compare/ask 501 as Coming Soon; don't fabricate fallback answers.
4. Build P1 research surfaces first with the backend owner. Preserve the B20 calibrated oxygen correction and unknown pressure. Source cells and mockup numbers have different authority.
5. For P2, call game-core events through an adapter; renderer never computes evidence truth. All missions remain Coming Soon until pure rules, recovery, persistence and actual browser interactions pass together.
6. Keep normal/demo saves separate; surface load errors and preserve raw data. No P0 UI currently saves player progress or exports a passport.
7. Add desktop/mobile/keyboard/reduced-motion/2D tests to the shared browser suite. Record screenshots and update feature verification only when a whole feature works.
8. No asset generation until a placeholder loop works and the owner separately approves a specific paid job. No production release.

## Files expected to change in later phases

Claude will replace `components/foundation.tsx` and the catch-all preview route with dedicated pages; retain a truthful route for every advertised status. Codex will implement P1 endpoint bodies behind the existing DTOs, then P2 reducer guards/invalidation. Shared review is required before changing status from Preview/Coming Soon. Source and runtime dependency updates must rerun scientific tests and security checks.

No request has been sent to another chat/agent. Phase Zero was executed solo as required.

## Safe local Phase One worktrees (instructions only)

Run these only after the owner accepts PHASE_ZERO_ACCEPTANCE.md and authorizes Phase One. The repository currently has no local main or remote-tracking branch; do not follow the starter pack's main/pull/merge examples for this local acceptance state. Both agents can branch from the same accepted local commit without pushing or merging main.

From the MicroFire-V2 root, first inspect `git status --short`, `git worktree list` and `git branch --all`. Stop if the destination paths or branch names already contain work; reuse them only after verifying their base and ownership. Do not remove or overwrite an existing checkout.

```sh
MICROFIRE_ACCEPTED_BASE=$(git rev-parse feat/phase-zero-contracts)
git show --no-patch --format=fuller "$MICROFIRE_ACCEPTED_BASE"
# Confirm this is the exact SHA from the accepted review before proceeding.
git worktree add -b feat/p1-ui ../MicroFire-V2-claude "$MICROFIRE_ACCEPTED_BASE"
git worktree add -b feat/p1-science ../MicroFire-V2-codex "$MICROFIRE_ACCEPTED_BASE"
```

In each checkout, verify sole origin matches MicroFire-V2 and the initial HEAD equals MICROFIRE_ACCEPTED_BASE, then run Node 24 `npm ci` and `npm run check`. Use separate terminal dev ports, e.g. `npm run dev --workspace @microfire/web -- --port 3101` for Claude and `--port 3102` for Codex. Run browser suites sequentially because both currently use 3217; set PLAYWRIGHT_BROWSERS_PATH to the existing approved browser-cache absolute path or separately obtain approval to download one. Browser binaries and node_modules are not tracked or shared automatically between worktrees.

Claude owns P1 page design/presentation; Codex owns the source audit, scientific query/ranking/comparison services and API handlers. Schedule shared-schema/config/lockfile/test changes with a single owner at a time. Both begin with the corrected one-record fixture; neither imports quarantined legacy rows or advertises unsupported comparisons. Five missions remain Coming Soon, and the full game reducer/state extension is P2 work.

Agents commit locally in their respective branches. Review each diff against MICROFIRE_ACCEPTED_BASE, coordinate shared-file conflicts, rerun checks, and seek owner approval before cherry-picking/merging, pushing or deploying. This review has not created either worktree or launched Phase One.
