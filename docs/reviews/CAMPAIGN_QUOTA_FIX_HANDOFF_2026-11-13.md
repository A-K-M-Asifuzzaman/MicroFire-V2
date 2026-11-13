# Campaign quota fix and re-review handoff — November 13, 2026

Exact fixed implementation: **`47e1ffac8b0b664349eb28e88c001153cfdecc0c`**, including initial atomic-reservation commit **`0aa987f19f89833c7b49cdb75fe3268ead5090af`**. Isolated review branch: `codex/fix-campaign-admission-20261113`, based on published review/report `4f4f5063a6b370868128a92aa9166a55da747081`. Original reviewed implementation faecf92 is preserved in ancestry. Review the complete delta from 4f4f506 to 47e1ffa, not the intermediate 0aa987f alone.

**Local quota remediation and fresh-context re-review: PASS for the reproduced model. External Astra approval and production readiness: NOT APPROVED. Hosted staging remains BLOCKED by the owner.** No routes mounted, hosted resources provisioned, public load tests, provider mutations, merge or deployment occurred. No public-source scientific admission or quarantine changes occurred.

## Implemented policy

The new [admitted-work policy](CAMPAIGN_ADMISSION_POLICY_2026-11-13.md) replaces the vulnerable sequential global-first updates. `PublicCampaignService.reserve()` uses the existing PostgreSQL transaction boundary. It reserves an address allowance before its corresponding global allowance, with one database minute timestamp for both. Conditional UPSERTs return no row at the ceiling; any refused bucket or SQL failure rolls back every bucket in the reservation. Counters store committed admitted attempts and do not grow past their limits.

`admit(trustedAddress)` atomically reserves address240 and global2000 per SQL minute. New-visitor enrollment similarly reserves address5 and global60 together; visitor120 is a bounded single-scope reservation. No production schema migration, index/function/role addition, package update, API route/schema, cookie, CSRF-header or environment-name change is needed for this fix. Existing shared contracts remain frozen.

Admission completes before visitor/head or bootstrap locks and before mission/rule evaluation. Already committed admission is never refunded for an invalid route, rejected authentication/body, downstream failure or identical retry. A COMMIT acknowledgement loss may conservatively charge capacity while returning503 without dispatch; retry charges a new attempt. The action's existing revision/identity semantics remain authoritative. No fallback or automatic quota retry is introduced.

The global limit protects **admitted campaign work**, not all raw ingress, admission-query cost or network connections. No separate global raw-ingress breaker is retained. One over-limit source therefore cannot monopolize that shared allowance through its rejected requests. Distributed abuse and raw floods still require provider connection/cost caps and effective upstream protection; no claim of upstream effectiveness or public load capacity is made while staging is blocked. Fixed-minute boundary bursts remain possible.

## Contention hardening found during independent review

The first candidate0aa987f corrected original F1 but introduced a stalled-transaction risk: a worker paused after the global UPDATE and before COMMIT could retain that shared row while statement_timeout applied to no active statement. The fresh reviewer independently reproduced a fresh source503 during a4.1s hold. This candidate was not mounted or deployed.

Final47e1ffa bounds quota lock waits to250ms and idle quota transactions to3s, with the existing3s statement/5s client query limits preserved. All bucket locks release before business work; reservation orders are address→global or single-visitor and cannot introduce a reverse business-lock cycle. Shared global locks cover only the last short reservation statement and immediate COMMIT. Sustained-provider throughput and region latency still require staging measurement.

PostgreSQL idle termination is an unsolicited error on a leased client. pg-pool's idle-client listener does not cover checked-out clients, so `transaction()` now attaches a temporary leased-client listener through BEGIN/function/COMMIT/ROLLBACK, removes it before release and discards a failed lease. The suspension tests add no test-side client-error listener that could mask a crash. They prove automatic rollback, no unhandled process failure and later fresh-source recovery. Brief contention during the approximately3s recovery interval returns sanitized503 instead of bypassing admission.

## Reproduced results

| Verification | Actual result |
|---|---|
| Original attack via real local HTTPS | 2,000 same-address requests:240×404,1,760×429. Global count stays240; spoofed x-forwarded-for/x-real-ip cannot replace the fixture adapter address; fresh enrollment200/global241 |
| Global capacity across two pools | Seed1998;24 simultaneous requests admit exactly2, reject22, cap2000; only2 address reservations persist |
| Same-address concurrent race |300 requests through2 pools admit240, reject60; no extra global charge; fresh address succeeds |
| Database failure/lock/outage | Injected global write failure and250ms lock timeout roll back the address/global pair; missing storage503; recovery succeeds; over-limit address never waits on an artificially locked global row |
| Lost COMMIT acknowledgement | Actual DB commits admission; injected lost client acknowledgement returns503/no cookie/no visitor; quota remains charged; retry succeeds with another charge |
| Suspended worker | Real PostgreSQL ends the leased idle connection, rolls back both reservations; resumed worker fails closed; failed pool has0 clients; fresh source200/global1 |
| Full campaign security/native HTTP/browser/PG | **9/9**,0 skips, including five-mission Passport, session isolation, CSRF, revocation/expiry, exact retry and PG restart |
| Final branch `npm run check` | Exit0; **267 units/23 files**, lint/types/data/science/security/build pass |
| Existing frontend units | **33/33** |
| Science/citation regressions | Ask30/30, rank7/7, faithful13/13, forbidden0; intelligence11/11, citation5/5 |
| Candidate metadata validator |7 quarantined review items structurally valid; no promotion; PDF bytes not redownloaded/rehashed |
| Combined bounded-B20 candidate | **315 units**, Ask30/30, rank22/22, faithful13/13, intelligence11/11 and citations5/5; lint/types/source/security/build pass |
| Combined real quota/science HTTP | **10/10**,0 skips |
| Actual Claude controller HTTP | **1/1**,0 skips; lost response/reconciliation/progression |
| Existing M2/science/private security HTTP | **13/13**,0 skips |
| Research desktop/mobile browsers | **88 passed,22 existing skips**,0 failed |
| M2 desktop/mobile browsers | **123 passed,47 existing skips**,0 failed |
| Live M2 integration journeys | **4/4**,0 skips; keyboard/touch/no-WebGL/3D complete, export and resume in a disposable integration checkout |
| Canary build | **64 browser artifacts** clean of campaign canaries/server credential names/private hints; factories remain unmounted |
| Native browser storage primitive probe | **1 passed,2 failed**,0 skips: Firefox host launch/profile failure; WebKit58/100 increments. Existing source unchanged; writable browser saves remain disabled |
| Advisory audit | Runtime0;10 moderate development advisories,0 high/critical. Dependencies unchanged |

Science counts are source-specific authored regression results, not statistical accuracy, safety certification or independent scientific acceptance.

Do not call the entire repository suite green: the unrelated native-browser storage probe still fails, as the preceding review already disclosed. No assertions/timeouts were weakened or failures skipped. An initial broad unit run hit the unchanged full-campaign journey's5s timeout while source-copy I/O was active; after I/O completed the full final branch check passed unchanged. The combined run uses two unit workers to limit machine contention; all315 assertions and existing test timeouts remain intact.

### Independent re-review actually performed

A separate fresh-context Security Review agent reviewed0aa987f, discovered the idle-holder issue, then reviewed clean final47e1ffa and executed its own actual-source PostgreSQL probe. It reported **no remaining concrete findings in the reviewed quota changes** and conditional local acceptance for the exact final SHA. Its reproduction is retained as `evidence/campaign-quota-fix/independent-probe.json` and portable `.mts.txt` source.

Independent outputs: original attack240/1760 with fresh200/global241; a separate global race starting1997 admits exactly3/rejects27, cap2000 with3 address rows; lost COMMIT ack503/no cookie/charge retained; enrollment abusive source accepted5 and fresh source global6; two-pool visitor120 accepted/30 rejected; idle backend ended after about3s, automatic rollback/fresh200, frozen request503, failed lease pool0. No test client-error listener concealed a crash. The integrating agent also executed the supplied probe and retained fresh JSON output.

This is internal fresh-context re-review, **not external Astra approval**. The implementation author ran the wider regressions. This package explicitly requests external Astra review of final47e1ffa, the consumer integration delta and the remaining hosted release gates. No claim of a delivered external message or approval is made.

## Reproduction and exact integration

Use Node24, locked dependencies and matching Playwright Chromium. PostgreSQL binaries must be discoverable via pg_config or MICROFIRE_TEST_PG_BIN. All test clusters/HTTPS servers are disposable and local; production PostgreSQL TLS is not exercised. The quota fixture waits for enough time in a real SQL minute rather than changing the production clock. Cold builds need the existing font network dependency.

```sh
npm ci
npm run check
node node_modules/vitest/vitest.mjs run --config vitest.m2-ui.config.ts --maxWorkers 2
node --import tsx scripts/eval-intelligence.ts
node --conditions=react-server --import tsx --test tests/backend/campaign-admission-http.test.ts tests/backend/campaign-security-http.test.ts
node --conditions=react-server --import tsx --test tests/backend/intelligence-http.test.ts tests/backend/review-http.test.ts tests/backend/training-http.test.ts
node --conditions=react-server --import tsx scripts/verify-campaign-browser-bundle.ts
node node_modules/@playwright/test/cli.js test --output /tmp/microfire-quota-research-results
node node_modules/@playwright/test/cli.js test --config playwright.m2-ui.config.ts --output /tmp/microfire-quota-m2-results
node --conditions=react-server --import tsx --test tests/backend/browser-save-consistency.test.ts
npm audit --omit=dev
npm audit
```

Do not rebuild .next while a browser/HTTP suite serves it. Keep browser artifact directories and ports separate. Native storage and full dependency audit have the documented nonzero exits. Local-test certificate bypasses apply only to disposable fixtures, never managed PostgreSQL. Logs contain no live credentials, cookies, CSRF values, provider bypass links or database connections.

Combined regression only: detached commit `2634a6cc50724e22789e4163ea3153f227f3041a`, tree `758069302c91b8ba2fef2275ee01aed9ec75b861`, combines final47e1ffa with original bounded B20 candidateaf2281e. It is not pushed as application source, merged, promoted or deployed. Reproduce in an isolated checkout using the already-published unapplied `evidence/campaign-integration/combined-science.patch` with `git apply --index --unidiff-zero`, or cherry-pick the original af2281e; commit the disposable combination before the live-M2 harness. Run all normal checks with two unit workers, plus direct-evidence-http, campaign-admission-http and campaign-security-http, actual controller HTTP, and the four-mode m2-live-browser harness. Patch/tree equivalence, not forged commit dates, establishes source equivalence. B20/science release approval remains separate.

Claude integration: no frontend or API schema change is required. Review both source commits together, apply to an isolated consumer after approval, and retain existing PublicCampaignView and request-identity contracts. Same-origin CSRF/cookie/gateway requirements and API paths remain exactly as [the versioned handoff](../integration/CAMPAIGN_AUTH_PUBLIC_HANDOFF_2026-11-13.md). Do not copy local CampaignSnapshot into the public consumer or import grading/core server modules into browser code.

All instances must use the same reviewed implementation, stable realm/abuse key and canonical trusted gateway address. **Do not mix old/new workers:** an old global-first worker can still starve the shared row. Existing legacy above-cap counters conservatively deny until rollover. No new environment flags, connection secrets, migration grants or runtime DDL are added.

## Preserved surfaces and release gates

Compared with4f4f506, all M2 authority/cookie/security routes, frozen shared contracts, Next route mounts, game rules, science implementation, NASA evidence/quarantine, UI/assets/video source, dependency lockfile and environment names are byte-identical. B20 remains calibrated17.4%,55 legacy quarantines and7 separate unadmitted review candidates remain preserved. Browser runs regenerated71 screenshots only in the Codex checkout; original bytes were restored and captures kept outside Git. Claude's active worktrees were not edited.

The loopback factory remains unmounted. Its disclosed process-restart rollback/rebinding limit is unchanged; no durable anti-rollback claim is made. Local mounting still requires explicit scope acceptance or an independently reviewed durable continuity fix.

**Hosted staging remains BLOCKED until owner authorization.** No provider project, database, deployment, migration or environment was created/changed and no public load test occurred. Before enabling public gameplay: external Astra approval of final source/consumer, actual protected Vercel/TLS PostgreSQL acceptance, trusted header/IP normalization, consistent configuration, regional lock/latency and pool lifecycle tests, least privilege/cleanup/retention/connection and cost limits, effective upstream abuse controls, and explicit owner release authorization remain required. Global admitted-work enforcement is not proof of ingress/DDoS resistance or production capacity.

Technical authorities: [PostgreSQL conditional INSERT/RETURNING](https://www.postgresql.org/docs/current/sql-insert.html), [row locks and lock ordering](https://www.postgresql.org/docs/current/explicit-locking.html), [lock/idle transaction timeouts](https://www.postgresql.org/docs/current/runtime-config-client.html). These support the chosen SQL mechanisms; actual-provider behavior remains unverified.
