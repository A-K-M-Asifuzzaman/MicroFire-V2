# Phase Zero interface freeze and Claude handoff

Contract baseline: API v1, GameState/Passport schemaVersion 1, dataset p0-bass-b20-v1. This is a proposal ready for owner review; no merge or independent agent signoff has occurred. Find the exact handoff commit with `git log -1` and retain that SHA when creating later worktrees.

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
