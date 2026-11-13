# Campaign review publication and combined regression report

Review branch: [codex/review-campaign-security-20261113](https://github.com/A-K-M-Asifuzzaman/MicroFire-V2/tree/codex/review-campaign-security-20261113). Initial published source commit: **`48d2c8baa1505c11499d405d934529269cdde722`**. Original completed implementation/report milestone **`faecf92b18528a18486d2106c050130e95e4bc0c`** is an ancestor. Subsequent report-only commits do not change these tested runtime sources.

**No public campaign enablement, route mount, merge, production release, provider configuration change or database provisioning occurred.** Independent Astra approval and actual Vercel staging acceptance are pending. Local review tests are not independent approval.

## Review scope and preservation

[Source comparison from d324ff0](https://github.com/A-K-M-Asifuzzaman/MicroFire-V2/compare/d324ff06d2f9959041d0f01999ba1d48fe184276...48d2c8baa1505c11499d405d934529269cdde722) includes the original security remediation plus one test/staging-preparation commit. The new commit changes tests, local deployment guard files and non-applied staging configuration only; no runtime authority/service/mission/science implementation changed after faecf92. Review the source and its transitive base dependencies before integrating; PR #16/R4 and B20 approval gates are not cleared.

Commit map:

- `f4f86cec7dc9f2a8e7383ef22f10f8ee062a1dff`: dedicated loopback authority/proof, owner-bound service, request boundary.
- `ed9a3285e3b712ccced1682949662118598cb79c`: public anonymous visitor/PostgreSQL authority, public DTOs, migration, unmounted Vercel adapter.
- `c8bf97ae5519d7b89709614128a1fbd4e82f045f`: actual HTTP/browser/database attack reproductions and browser canaries.
- `85550dded710402ec0ad750888af46366e625bcf`: least-privilege DB role and portable fixtures.
- `faecf92b18528a18486d2106c050130e95e4bc0c`: original separate acceptance reports and complete API handoff.
- `48d2c8baa1505c11499d405d934529269cdde722`: real SQL fault-injection rollback/persistent-budget regression, protected staging preparation and review-branch Git deployment guards.

The working tree was clean before inspection and the first push. The pre-publication scan covered all **46 commits** ahead of freshly verified GitHub main `b82db9c0be16c3485b67c774d9da734334192aec`, **341 unique changed blobs**, not only the final source diff. No embedded credential patterns, literal credential-bearing database URLs, private-key material, unexpected binary files or sensitive generated paths were found. Human inspection covered authority/session/body boundaries, SQL, contracts, fixtures, lockfile provenance, changes to configuration and retained evidence. This is not a credential validity probe or a mathematical proof of absence. The final report-only delta also receives a scan before its push.

All added registry dependencies have registry.npmjs.org URLs and integrity hashes; pg/@vercel/functions/@types/pg are exactly pinned. Generated build/test directories, actual environment files, temporary TLS keys, browser profiles, cookies/CSRF proofs, database contents, provider consent links and raw traces are excluded. Retained text logs are sanitized evidence; the M2 browser case log omits repetitive shader diagnostics and pins the raw output hash; package-lock.json is the intentional generated dependency manifest. No history rewrite or date concealment occurred.

Compared with d324ff0, M2 authority/cookie/security routes and frozen contracts, all game reducers, UI/assets, science implementation and NASA fixtures/quarantine are unchanged. The sole data change is the new, unapplied PostgreSQL migration. B20 remains 17.4%, 55 legacy quarantines and seven separate review candidates remain unpromoted. Protected hashes are in `evidence/campaign-integration/preservation.json`. Browser suites regenerated 71 screenshots in this Codex checkout; copies were retained under /tmp and only those test outputs were restored to their original Git bytes. No screenshots/assets/video were committed or changed in Claude's worktree.

## Actual regressions

| Suite | Actual result | Tested scope |
|---|---|---|
| Initial complete `npm run check` | Exit 0, 266 units plus lint/types/data/science/security/build | Original faecf92 source |
| Final branch units | 267/267, 23 files | Source 48d2c8b including staging guard test |
| Frontend controller/view units | 33/33, 2 files | Existing Claude frontend on review branch |
| Campaign real HTTP/Chromium/PostgreSQL | 5/5, 0 skipped | Source 48d2c8b; exact origins/grants/CSRF, five missions/Passport, retries/revisions, isolation, permission denial, revoke/expiry, outage/restart and rollback |
| Existing M2/science/private-route real HTTP | 13/13, 0 skipped | Actual local production servers; includes real 429 recovery and signing-key rotation |
| Research desktop/mobile Playwright | 88 passed, 22 existing skips, 0 failed | Review branch production build, all research specs |
| M2 UI desktop/mobile Playwright | 123 passed, 47 existing skips, 0 failed | Review branch fixture gallery, lifecycle/hosted-route denial/accessibility/recovery |
| Intelligence/citation evaluator | 11/11 and 5/5 | Branch and combined candidate; authored checks, independent scientific acceptance false |
| Candidate metadata validation | 7/7 quarantined items structurally valid | Source PDF bytes not downloaded/rehashed; no admission |
| Combined source/science full `npm run check` | Exit 0, **315/315 units**, lint/types/data/science/security/build | Detached source 48d2c8b + bounded B20 candidate af2281e |
| Combined science gold evaluator | Ask 30/30; rank 22/22; faithful 13/13; forbidden 0; repeatable 30/30 | Same detached combination; source-specific checks, not statistical or independent scientific scores |
| Combined actual HTTP/browser/PG | 7/7, 0 skipped | Five campaign cases plus B20 paraphrase and intelligence/library HTTP |
| Combined actual Claude controller HTTP | 1/1, 0 skipped | Lost response, reconciliation, complete server-confirmed M2 journey |
| Combined live M2 browser journey | 4/4, 0 skipped | Keyboard, touch, no-WebGL, 3D; complete/export/resume with five checks; disposable integration seam only |
| Existing native browser-storage primitive probe | **1 passed, 2 failed**, exit 1, 0 skipped; bounded rerun agrees | Chromium passes; Firefox launch refused by host; WebKit cross-page lost updates. See failure section |
| Dependency advisory refresh | Runtime 0; full audit 10 moderate, 0 high/critical | Same baseline development-tool advisories; no unrelated major upgrade |

The expanded SQL test deliberately raises a database exception after the second bootstrap write: no visitor/head persists, no success cookie is returned and the database error is sanitized. A failing head-update trigger leaves revision, record events, last command and last response unchanged; removing the trigger permits the same action. Twelve concurrent calls through two service pools yield exactly four accepted budget entries and eight 429s; count 12 persists, and after PostgreSQL restart a new pool still rejects and records count 13. This establishes local SQL atomicity and persistence, **not actual serverless gateway/concurrency acceptance**.

The four-mode live UI harness builds a disposable integration checkout from the combined source and installs its documented test-only runtime seam. It does not activate public gameplay or prove an integrated release. Existing public runtime remains disconnected. Original canary scan of the unchanged runtime modules covered 64 browser artifacts; its source pin/logs remain in `evidence/campaign-security/`.

The first parallel Playwright attempt shared the default artifact directory and failed during trace cleanup. Both full suites were rerun with separate output directories and passed; no assertions were removed. The first detached build could not resolve Google Fonts inside the restricted sandbox; network-enabled build and the subsequent entire combined check passed. These are test-environment retries, not silently ignored failures.

### Unresolved native-storage probe failures

`tests/backend/browser-save-consistency.test.ts` is byte-identical to d324ff0. Chromium records 100 serialized increments. Firefox cannot launch its signed headless process/profile under the host's sandbox; a bounded canonical-path rerun without disabling browser protection still fails. WebKit observed 60/100, then 97/100 increments despite the native Web Locks/localStorage primitive. Do not call the **entire repository suite green** or writable browser saves safe. Both runs' logs are retained. No product save behavior was weakened: existing writable local saves remain disabled. Public campaign progress uses authoritative PostgreSQL transactions and does not depend on this primitive. Independently resolve cross-browser storage/process-isolation acceptance before enabling any writable browser-save feature.

## Exact reproduction commands

Use Node 24 and the locked install. Bind all local servers to loopback. PostgreSQL test binaries must be available via `pg_config --bindir` or `MICROFIRE_TEST_PG_BIN`; the fixture creates/removes its own private disposable cluster and uses a CRUD-only application role. Playwright browser executables must match package-lock.json. Network access is needed for existing next/font downloads on a cold build. Use a clean disposable checkout for live M2 tests.

```sh
npm ci
npm run check
node node_modules/vitest/vitest.mjs run --config vitest.m2-ui.config.ts
node --import tsx scripts/eval-intelligence.ts
node --import tsx scripts/verify-candidates.ts
node --conditions=react-server --import tsx --test tests/backend/campaign-security-http.test.ts
node --conditions=react-server --import tsx --test tests/backend/intelligence-http.test.ts tests/backend/training-http.test.ts tests/backend/review-http.test.ts
node node_modules/@playwright/test/cli.js test --output /tmp/microfire-research-browser-results
node node_modules/@playwright/test/cli.js test --config playwright.m2-ui.config.ts --output /tmp/microfire-m2-browser-results
node --conditions=react-server --import tsx --test tests/backend/browser-save-consistency.test.ts
npm audit --omit=dev
npm audit
```

The native storage command has the failures documented above; full npm audit exits nonzero for the 10 moderate development advisories. Do not hide either exit status. Different suites need separate artifact directories/ports; do not let one Playwright run clear another's trace files.

Combined source test only: local detached commit `ad876e9054f49f9a917bfaeae94db5310c33ba2d`, tree `9a30fa37c576c4146ca2d37542d870592db3a1e7`. It adds original `af2281e507a816284d397b3dcfafa69b99f1025f` to 48d2c8b. It was **not merged, pushed as application source or deployed**. The exact non-applied patch is published as review evidence in `evidence/campaign-integration/combined-science.patch`, with a SHA-256 in preservation.json. Apply it with `git apply --index --unidiff-zero` only in a separate disposable checkout at 48d2c8b (the zero-context format avoids whitespace-only context markers in the evidence file), commit the test-only combination, install locked dependencies and run:

```sh
npm run check
node --import tsx scripts/eval-intelligence.ts
node --conditions=react-server --import tsx --test tests/backend/campaign-security-http.test.ts tests/backend/direct-evidence-http.test.ts tests/backend/intelligence-http.test.ts
MICROFIRE_CLAUDE_WORKTREE="$PWD" node --conditions=react-server --import tsx --test tests/backend/claude-http.test.ts
MICROFIRE_LIVE_ARTIFACT_DIR=/tmp/microfire-campaign-combined-live-m2 node --conditions=react-server --import tsx --test tests/backend/m2-live-browser.test.ts
```

A new reproduction commit has a different SHA; verify tree/patch content instead of forging author/commit dates. This does not approve the B20 candidate for release. No data admission or quarantine state changes are part of the patch.

## Claude and Astra handoff

The exact loopback/public routes, exported TypeScript/Zod schemas, body/response examples, retry/reconciliation rules and environment names are in [the versioned API handoff](../integration/CAMPAIGN_AUTH_PUBLIC_HANDOFF_2026-11-13.md). The runtime/contract files are unchanged from the original implementation milestone. Local header is `X-MicroFire-Campaign-CSRF`; public header is `X-MicroFire-CSRF`; both require `X-MicroFire-Campaign: 1`. Do not reuse M2 transport/cookie/authority. Public clients consume PublicCampaignView, not local CampaignSnapshot.

Migration: `data/migrations/campaign-public-v1.sql`. Staging-only restricted-role template: `ops/campaign-staging/runtime-grants.sql`. Names-only environment manifest: `ops/campaign-staging/environment-names.json`. No actual credentials, operator tokens or database connection strings are provided in the handoff. The explicit operator maintenance commands remain:

```sh
node --conditions=react-server --import tsx scripts/campaign-public-maintenance.ts migrate
node --conditions=react-server --import tsx scripts/campaign-public-maintenance.ts cleanup
```

These were not run on a hosted database. Use separately approved private migration/cleanup credentials, not runtime/admin reuse. Migration is one-time/non-idempotent; startup does not apply DDL. Runtime requires verified TLS managed PostgreSQL, stable realm/release epoch, row locks/CAS and persistent SQL budgets; no memory or /tmp production fallback. Schedule approved cleanup and review connection/cost caps, backups, retention and deletion.

[Loopback acceptance](CAMPAIGN_LOOPBACK_ACCEPTANCE_2026-11-13.md) remains bounded: after process restart there is no durable local anti-rollback journal, and an operator can restore an older still-valid receipt. Astra must explicitly accept that scope or require a journal before local mounting. Public resume imports no client checkpoint and reads the durable head only. These reports are separate and are written by the implementation author.

No live Claude peer was available in the repository peer registry; available Codex chat summaries did not identify a direct Astra review destination. Public branch/commit/contract/evidence links are prepared for both reviewers; no claim of delivered messages, joint contract agreement or independent approval is made. No other person's worktree was modified.

## Staging preparation and genuine remaining gates

`ops/campaign-staging/vercel-project.request.json` is an unapplied API configuration for a **new isolated project**, Vercel Authentication on all URLs, publicSource false, no Git repository link and Fluid Compute. Both review branch names have branch-specific automatic Git deployment denial in the repository-root and apps/web-root `vercel.json`; no production branch behavior changes. Runtime enable flags remain zero in the names-only staging manifest. Read-back and unauthenticated access tests are mandatory before private staging tests. Never weaken protection or share query-string bypass credentials.

The Vercel connector returned 403 for the owner's team; its explicitly scoped CLI fallback provided no authorized project data. A user consent link was offered privately, not committed. No provider configuration has been applied. Actual staging needs authorized team access, independently approved handler/route delta, isolated managed TLS PostgreSQL/roles, approved secrets/lifecycle/WAF, and an owner-authorized private deployment. The exact provider acceptance cases are in [the staging package](../../ops/campaign-staging/README.md). Hosted forwarding/IP sanitization, trusted Host/origin, pooled TLS, serverless concurrency/cold/suspended workers, durable rate limits, permissions, cookies, expiry/revocation, cleanup and managed restart must be tested there. Local SQL/browser tests cannot substitute for these checks.

Read-only public-site checks at `2026-11-13T04:38:21Z` returned 200 for home/health/B20/missions/Passport and 404 for M2 preview, both campaign namespaces and /design. This verifies HTTP availability at that time, not a deployment source SHA or video integrity. Submission/video files/aliases/deployment were not edited, removed or replaced. No general development freeze is imposed. **Do not enable public campaign endpoints until independent Astra approval and actual staging acceptance; public release also requires the owner.**
