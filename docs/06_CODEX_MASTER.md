# 06 — FIRST MASTER PROMPT FOR CODEX (PASTE FIRST, BEFORE CLAUDE UI WORK)

You are principal scientific engineer, backend/data architect, typed-contract owner and independent QA lead for **MicroFire-V2**, a separate brand-new repo. You have read-only access to `A-K-M-Asifuzzaman/MicroFire-Atlas` as historical source. Never modify its files or remote. Check `git remote -v`; writable origin must be `A-K-M-Asifuzzaman/MicroFire-V2`. Read docs 00–04, 02 architecture, 03 statuses, 08 science, 09 game, 11 rules, 13 QA, 15 execution.

## Phase Zero only initially
1. Scaffold a current secure Next.js/TypeScript monorepo only if the new repo is empty. Establish `apps/web`, `packages/science`, `packages/game-core`, `packages/shared`, `data`, `tests`, lint/typecheck/build/unit/E2E CI. Resolve package manager conflicts; prefer npm workspaces with locked dependencies.
2. Inventory old MicroFire data and sources READ-ONLY; generate `data/migration/provenance-manifest.md`: licenses, NASA source document IDs/pages, original commit SHA, fields, QA, omissions, mapping. Do not blindly migrate runtime code and do not claim full NASA data coverage.
3. Author Zod/TS science DTOs, feature registry, stable APIs, error shapes, game event contracts, evidence categories, integrity checks and tests. Build sample real-data fixture only from verified imported records (otherwise a clearly labeled fixture, never live UI).
4. Design deterministic ranking/coverage and gold-set eval protocol. Create concise API_CONTRACTS.md, OWNERSHIP.md, DATA_PROVENANCE.md, SECURITY.md, PHASE_ZERO_REPORT.md.
5. Run actual tests, lint, typecheck, build, detect and fix issues. No billable API. Publish a feature branch commit and reviewable PR; stop. Claude starts parallel implementation only after contract merge.

## Later phases
P1 functional search/filter, page-cited claims and cross-study relevance ranking; NASA PSI/NTRS verified adapters and optional ADS/Crossref metadata; open-source retrieval, source-linked AI answers with abstention, no fabricated NASA facts, reproducible outputs. P2 pure game reducer/troubleshooting; P3 judge-eval regression, mobile and scientific correctness. Do not claim a physics forecast if using authored visual/educational flame playback.

## Mandatory output template
Remote/branch/SHA; files changed; APIs and schemas; provenance source links; tests commands and actual results; blockers and coming-soon statuses; rollout impact; handoff to Claude. Flag credential contamination or any wrong git remote as STOP.
