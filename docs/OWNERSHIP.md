# Interface ownership and Claude handoff

**Current contract baseline (Phase One, at the integration-review gate):** API v1 with the Phase One endpoints, GameState **schemaVersion 2** (v1 saves migrate on load), Passport schemaVersion 1, dataset `p0-bass-b20-v1` with one validated experiment and 55 quarantined legacy rows. `docs/API_CONTRACTS.md` is authoritative for endpoints, semantics and game rules; `docs/PHASE_ONE_SCIENCE_REPORT.md` records the Phase One evidence. No independent human scientific signoff has occurred, and public release is blocked.

Historical Phase Zero context: Phase Zero acceptance is recorded in PHASE_ZERO_ACCEPTANCE.md. The original scaffold commit is a7fb5981d9f5ea911b9d45522889b2a7e7fd487e. Later worktrees must use the reviewed acceptance commit, which includes the invariant fixes, rather than the earlier scaffold.

| Owner after P0 | Paths/responsibility |
|---|---|
| Claude Code | `apps/web/app` page/layout/CSS/loading/error files, `apps/web/components`, future `apps/web/game`, `apps/web/public`, visual references/art bible and UI screenshots |
| Codex | `packages/science`, `packages/game-core`, `data`, `scripts`, `tests/unit`, `apps/web/lib`, `apps/web/app/api`, API integrations and scientific evaluation |
| Shared, explicit review | `packages/shared`, root/workspace package files and lockfile, TS/Next/ESLint/Playwright config, `.github`, `tests/e2e`, feature readiness changes, this document |

The API exception takes precedence over Claude's broad `app` ownership. A domain contract must never be duplicated in a UI component. Neither agent silently changes source IDs, oxygen semantics, evidence classifications or reducer behavior. Request a reviewed shared-contract change and update both consumers/tests together. One agent owns the lockfile at a time.

## Claude entry checklist after contract review/merge

1. Verify remote and clean feature worktree; read the supplied CLAUDE/master/design/quality specifications and latest ten design references. Base M1 on feat/astra-defect-fixes (exact verified SHA in the Astra fix report); origin/main alone omits local backend corrections.
2. Run npm ci, npm run check and browser checks. Inspect the tiny foundation UI as an integration surface, not approved final art direction.
3. Import contracts from `@microfire/shared`. Search, source detail, rank, gaps, citation verification, export and Ask are implemented (see API_CONTRACTS.md). Render `coverage` and limitations on every research surface. Show Ask abstentions (200, `abstained: true`) and compare 404s ("needs another validated record") truthfully; don't fabricate fallback answers or comparison tables.
4. Build P1 research surfaces first with the backend owner. Preserve the B20 calibrated oxygen correction and unknown pressure. Source cells and mockup numbers have different authority.
5. For gameplay, call `transition(state, action, catalog, at)` through an adapter; the renderer never computes evidence truth. Handle every failure `code` and show its `message` (for example `PREREQUISITE_MISSING` after a setup change revokes Assembly proof, which tells the player to re-run Assembly). Production starts stay `UNAVAILABLE` until a mission's registry state is changed in a reviewed PR after its whole UI loop passes browser tests.
6. Keep normal/demo saves separate; surface every `loadProgress` status. Offer `readRawSave` as a download before `discardSave(…, 'discard-save-after-export')`. No UI yet saves progress or exports a passport.
7. Add desktop/mobile/keyboard/reduced-motion/2D tests to the shared browser suite. Record screenshots and update feature verification only when a whole feature works.
8. No asset generation until a placeholder loop works and the owner separately approves a specific paid job. No production release.

## Files expected to change in later phases

Claude will replace `components/foundation.tsx` and the catch-all preview route with dedicated pages; retain a truthful route for every advertised status. Codex has implemented the P1 endpoints and the deterministic reducer, invalidation and persistence; further game-rule changes go through shared review with tests. Shared review is required before changing status from Preview/Coming Soon. Source and runtime dependency updates must rerun scientific tests and security checks.

No request has been sent to another chat/agent. Phase Zero was executed solo as required.

## Worktrees and integration (current)

- `MicroFire-V2/` is the primary checkout and holds the repository's `.git`; never delete it.
- Historical science worktree: ../MicroFire-V2-codex / feat/phase-one-science; preserve its six pending reason edits. Integration worktree: ../MicroFire-V2-astra-fixes / feat/astra-defect-fixes, based on 1c1af90.
- Claude should add its own worktree from the verified integration branch below. Inspect `git worktree list` and `git branch --all` first, and never reuse or overwrite another agent's checkout:

```sh
git fetch origin
git worktree add -b feat/p1-ui ../MicroFire-V2-claude feat/astra-defect-fixes
```

In each checkout, verify the sole origin, then run Node 24 `npm ci` and `npm run check`. Dev ports: Claude 3101, Codex 3102. Browser suites share port 3217, so run them one at a time and check it is free (`lsof -nP -iTCP:3217 -sTCP:LISTEN`). Set PLAYWRIGHT_BROWSERS_PATH to the approved cache `MicroFire-V2/.cache/ms-playwright`.

Current owner direction (2026-10-14) supersedes the historical direct-main workflow: commit fixes on feat/astra-defect-fixes; do not push directly to main or deploy. Review/integrate through a feature branch after checks. The owner explicitly authorized these five contract corrections and the six reviewed registry reasons. Feature availability is unchanged. Claude still reviews actual consumer adoption; this is not a claim of Claude's signoff.

Dependency handoff: Sol makes no package/lockfile changes in this correction. Claude owns the next frontend dependency proposal (Three.js/R3F) and package/lockfile edits in its own branch; Sol must not edit those files concurrently. Pin a single jointly reviewed dependency update and rerun install, audit, build, unit and browser checks before merge. No dependency upgrade, paid asset job, or availability promotion is implied by this assignment. This document records the handoff; no other chat was messaged.
