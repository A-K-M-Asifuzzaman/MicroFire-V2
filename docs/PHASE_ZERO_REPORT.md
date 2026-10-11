# Phase Zero handoff — 2026-10-11 (Asia/Dhaka)

**Scope: Phase Zero only.** Independent foundation is implemented and locally verified. Public release remains blocked; research ranking, AI synthesis and playable missions are not complete. No merge, push, PR, deployment, paid call or reference-repository write occurred.

## Repository

The supplied cwd was a specification-pack directory, not a Git repository. The authorized GitHub target was empty. Created local checkout `MicroFire-V2/` with sole origin `https://github.com/A-K-M-Asifuzzaman/MicroFire-V2.git` and branch **feat/phase-zero-contracts** from the unborn initial branch. No pre-existing feature branch or application existed. The handoff SHA is the commit containing this report (`git log -1 --format=%H`); final chat reports it explicitly.

## Implemented architecture

- npm workspaces: Next.js 16.4.0 / React 19.3.0 App Router in apps/web; TypeScript 5.9.3 strict, exact optional properties and indexed-access checks; Node 24 LTS.
- Shared Zod 4.6.5 contracts: sources, field-level provenance, known/unknown conditions, claims, evidence classes, v1 API DTOs, feature states, five mission interfaces, ten stable part IDs, game saves and Evidence Passport.
- Pure science package: validated local catalog, citation URLs and passport lineage validation. One NASA BASS-II fixture; no service keys or outbound runtime requests.
- Pure game-core: initial state, idempotent evidence inspection, blocked mission transitions and versioned atomic local-save adapter; corrupt/unsupported saves are preserved and normal/demo storage is isolated.
- HTTP: health, source catalog, paginated/filterable experiment fixture, single-record read, feature registry and structural/lineage passport validation. Rank/compare/Ask request contracts validate then return 501. Bounded JSON request parsing, safe errors, request budget and response headers.
- Preview UI: source journey, dossier, source/rights details, methodology, mission descriptions and honest status routes. No premium art/3D or completed mission claimed.
- CI: mandatory lint, types, unit tests, integrity/security checks, production build, dependency audit and Chromium desktop/mobile tests; Dependabot configuration. CI has not run remotely because nothing was pushed.

## Science audit and migration

Pinned Atlas HEAD acb9aaa69486154da657c61469d3a1886e4c12b1, inspected 56 candidate BASS-II rows and 19 source entries. Imported/revalidated **one** candidate only. Read-only candidate inventory is not verification of all rows.

Critical finding: upstream B20 calls 16.5% calibrated oxygen. Original NASA Table A.1 PDF page 112 (printed 104) shows calibrated initial/final oxygen **17.4%**; 16.5 is in adjacent uncalibrated columns. V2 corrects this explicitly, retains raw airflow notation, leaves unknown per-test pressure null, and records source/normalized hashes. Bulk migration is blocked pending column and rights review. See DATA_PROVENANCE.md and data/migration/provenance-manifest.md.

## Working and missing

Working in a Preview scope: local cited fixture browse/read, source provenance display, status registry/API, health/read APIs, structure/lineage passport validation, tested library save/load/error handling. Browser UI does not yet connect gameplay persistence or earn/export passport entries.

Missing by phase boundary: corpus-scale ingestion/search/ranking/controlled comparison/gap analysis, grounded Ask PIX, premium Gravity Lens/Evidence Loom, all five playable missions, full assembly/fault/repair rules, earned passport UI/export, media/GLBs, server sync/authentication, localization, judge tour and user studies. All missions are Coming Soon; Meshy pipeline is Blocked. No unbuilt mission is disguised as Locked. All states, including genuine Locked prerequisite behavior, are covered by unit tests.

## Actual checks and fixes

| Command | Result |
|---|---|
| npm run lint | PASS, no warnings |
| npm run typecheck | PASS, root and Next route types |
| npm test | PASS, 19 tests across 3 files |
| npm run validate:data | PASS, 1 source / 1 experiment, local schema/lineage/hashes |
| npm run security | PASS, basic secret/environment/provider-access pattern checks |
| npm run build | PASS, production Next webpack build |
| npm run test:e2e | PASS, 8 tests: desktop 1440×900 and mobile 390×844 Chromium |
| npm audit --audit-level=high | PASS, 0 vulnerabilities reported |
| git diff --cached --check | PASS, no whitespace errors |

Fixes from actual failures: union narrowing and exact-optional configuration errors; source-text assertion whitespace/article mismatch; tsx CLI sandbox IPC issue resolved by node --import tsx; vulnerable Next lint dependency chain replaced with supported ESLint 10/TypeScript/hooks rules; occupied default server port avoided with dedicated 3217; headless-shell screenshots stalled, fixed by full Chromium channel verified with a screenshot diagnostic. No failed test was skipped to make the suite green.

Screenshots: docs/qa/screenshots/home-desktop.png, home-mobile.png, dossier-desktop.png, dossier-mobile.png. Real screenshots of this build, not design comps. Inspected for readable hierarchy and mobile wrapping; final product visual direction remains Claude's later work. Browser tests reject external requests for the source journey and test JavaScript-disabled source content; this does not establish a PWA or 2D game fallback.

## Changed files and Claude contract

The repository was empty, so all committed files are additions. Main groups: supplied specs/skills/references; workspace/config/lockfile; apps/web; packages/shared/science/game-core; data; scripts; unit/e2e tests; CI and handoff/QA docs. See **CHANGED_FILES.md** for the exact inventory.

Claude's entry points: **OWNERSHIP.md** (file boundaries and contract freeze), **API_CONTRACTS.md** (schemas/actions/errors/save semantics), **API_INTEGRATIONS.md** (provider requirements and unverified access). Codex retains API route handlers even though Claude owns page routes. Shared schemas/config/lockfile/feature promotion require coordinated review. No other agent was launched or messaged.

## Remaining risks / stop gate

1. N=1 evidence fixture and an upstream calibration discrepancy; a second scientific reviewer and full per-record audit are needed before expanding claims.
2. P0 passport validation is structural/source lineage only. Client state and free-text conclusions are not scientific verification or protected achievements. Multi-tab save conflict resolution and migration to a future schema remain pending.
3. Per-process rate limiting and inline-compatible CSP are documented foundations; distributed quotas, strict nonce/hash CSP, full secret scanning and immutable CI-action pins are release work.
4. Chromium desktop/mobile emulation only; Safari/Firefox/real mobile devices, screen readers, full WCAG, Core Web Vitals, 3D performance and human user studies were not tested.
5. Provider entitlements, PSI/ADS/Semantic Scholar details, scientific media rights, paid API budgets and Meshy balance remain unverified. This task spent zero Meshy credits and made no paid LLM calls.
6. Remote CI, owner contract approval/merge, preview hosting and public release have not occurred. Claude may begin implementation after the reviewed contract handoff; do not infer approval from this report.

**Stop here.** Phase One science/UI implementation is not authorized by this Phase Zero completion.
