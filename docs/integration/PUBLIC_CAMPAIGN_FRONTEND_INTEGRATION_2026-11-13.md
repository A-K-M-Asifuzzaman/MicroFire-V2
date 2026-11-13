# Public campaign frontend integration candidate (2026-11-13)

**Branch:** `claude/public-campaign-integration-20261113`. Prepared for Astra's exact-tree review.

**Status: integration candidate, not approved.**
- No campaign API route is mounted.
- No deployment, database, environment or Vercel configuration was created or changed.
- Nothing was merged into a release branch.

Public gameplay stays off until all of the following hold:
1. Astra approves this exact combined tree.
2. Real Vercel/PostgreSQL staging acceptance succeeds.
3. The owner authorizes release.

## Composition

| Part | Source |
|---|---|
| Base | `claude/release-global` @ `17621b4`: live Design B site, local submission release, R4 reverted |
| Mission scenes 01, 03, 04, 05 | `claude/mission-scenes` @ `59cd120`, merged (`13eb1df`) |
| Codex campaign code and tests | Cherry-picked, with `-x` provenance |
| Codex PR #18 quota remediation | `0aa987f` → `f80ab81`, `47e1ffa` → `0ef3ccc` (code and tests only) |
| Claude client, UI and tests | `0843e79`, `45ff6bb` and this document's commit |

Codex commits were cherry-picked, not merged wholesale:

| Here | Codex |
|---|---|
| `4eca478` | `fe4f067` |
| `9e9055c` | `f4f86ce` |
| `877805c` | `ed9a328` |
| `ff11a6b` | `c8bf97a` |
| `c95d57f` | `85550dd` |
| `bce8c56` | `48d2c8b` |

Codex's documentation-only commits are not included.

**Conflict resolution.** The only conflict was in `.env.example`. I dropped `MICROFIRE_REVIEW_ACCESS_TOKEN`, because it belongs to unreviewed R4 and R4 stays reverted here.

**Code identity with Codex.** Compared with Codex `8dca07d`, these files are byte-identical:
- `apps/web/lib/campaign-*.ts` and `apps/web/lib/public-campaign*.ts`;
- `packages/shared`;
- `data/migrations`;
- `tests/backend/campaign-security-*`.

The remaining differences from `8dca07d` are of three kinds:
- the R4 revert;
- B20 and library science data that is not part of this candidate;
- my additions.

**Excluded on purpose:**
- PR #16 / R4 (`41e5b72`);
- B20 paraphrase ranking `af2281e`;
- Codex's science dataset expansion (`b3bdbfb`).

## What the frontend does

**Protocol.** It uses only the public visitor protocol (`/api/game/public-campaign/v1`).
- It never calls the loopback operator protocol.
- It never sends or asks for an operator token.
- It never imports `@microfire/game-core` into a client bundle.

**`apps/web/game/campaign/public-transport.ts`.**
- Parses every body with Codex's shared Zod schemas: `PublicCampaignBootstrapResponseSchema`, `…ViewResponseSchema`, `…ActionResponseSchema`, `…RevokeResponseSchema` and `…ExportResponseSchema`.
- Sends `X-MicroFire-Campaign: 1` on every request. Sends `X-MicroFire-CSRF` on `/action`, `/resume` and `/revoke`.
- Uses `credentials: 'same-origin'` and `cache: 'no-store'`. Origin and Fetch Metadata come from the browser and are never forged.

**`apps/web/game/campaign/public-controller.ts`.** A framework-free state machine.
- The CSRF proof is kept in memory only. Nothing is written to localStorage, sessionStorage or IndexedDB.
- One write is in flight at a time. A second intent is refused locally while one is pending.
- Each command is built with the shared `campaignIdentity` against the revision it was chosen on.

| Server answer | Frontend behaviour |
|---|---|
| 200 `ok: true` | Show the returned view and feedback |
| 200 `ok: false` | Show the domain refusal and the unchanged view. Nothing is inferred |
| Network loss, timeout, malformed body, 500 | Resend the **identical bytes** up to 2 times. The server returns the stored result if it committed |
| 409 | Read `GET /session`, show "Your case had already moved on…" and drop the intent. It is never replayed or recomputed |
| 403 | Phase `expired`. The server has already cleared the cookie. Shows a disclosure that there is no account recovery, then offers an explicit **Start a new case**. A case is never minted silently |
| 404 `SESSION_NOT_FOUND` | Phase `missing`, handled the same way as expiry |
| 404 `NOT_FOUND` | Phase `disabled`: "Missions are not open yet." No operator prompt |
| 429 | Phase `rate-limited`, with a countdown taken from Retry-After. Retry sends the identical command |
| 503 | Phase `unavailable`: "may or may not have been saved". Retry sends the identical command |
| Release epoch change (`runtimeId` differs) | Notice shown, and the intent must be chosen again |

**Reload.** A reload creates a new controller, and `POST /session` recovers the same durable case and a fresh CSRF proof.

**Start over.** An inline confirmation explains that the case ends permanently. The client then calls `POST /revoke` and starts a new case.

**Passport.** "Download Passport (JSON)" saves the server's `GET /export` response.

**`apps/web/app/missions/play/page.tsx`.**
- Returns 404 unless `MICROFIRE_PUBLIC_CAMPAIGN_ENABLED=1` and `MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL=public-campaign-v1` at request time. This is the same opt-in as the API.
- It is `noindex` and isn't linked from any page. Public `/missions` still shows Coming Soon.
- It passes the scenes citable source data only: the B20 claim and citation, plus recorded conditions.

**Scenes.**
- Missions 01, 03, 04 and 05 render through the existing scenes, unchanged, via `view-adapter.ts`.
- Claim Trial statements come from the server DTO (`trialStatements`: id, text, origin). No expected answers are passed.
- Mission 02 is a reduced bench (`bass-training.tsx`). It is driven by `trainingStep`, `installedPartIds` and the server's Training check (`diagnostic`).
  - The learner chooses mounts, orientation, diagnosis and repair.
  - The server introduces the authored fault and judges every step.

**Unrelated fix.** `scripts/campaign-fixtures.ts` now uses the isolated `CampaignAuthority`, as required by Codex's `f4f86ce`. Regenerated fixtures differ from the committed ones only in random UUIDs.

**Branch deploy guard.** This branch is added to `git.deploymentEnabled: false` in both `vercel.json` files, and the staging guard test is updated to match.

## Contract gaps (requests to Codex)

The public view is narrower than the scene contract. It doesn't carry these server-decided outcomes:
- `inspectedExperimentIds`;
- explanation feedback;
- per-statement appraisal feedback;
- habitat assessment feedback;
- the recorded decision;
- the proposal count;
- the prediction text.

**Current workaround.** The frontend shows these from the server's own action responses in the current tab only (`Accepted` in the controller), and labels them as such.
- After a reload, only mission completion, Passport entries, source review, selection, the prediction lock and the training step are re-read.
- A learner may then see an earlier objective as open again. For example, the research terminal can be opened again, and the server accepts it.

**Requested projection fields.** These are all non-rubric outcomes the server already holds, for example:
- `inspectedExperimentIds`;
- `explanation: {correct, reasons, citations} | null`;
- `appraisals: Record<statementId, {correct, reasons}>`;
- `habitat: {correct, reasons} | null`;
- `decision: verdict | null`;
- `proposalCount`;
- optionally `prediction: text | null`.

For a full-fidelity Mission 02 bench (3D rig, mounts and orientation), the DTO would also need the installed parts' `anchorId` and `orientation`.

## P2 global quota starvation: remediation integrated (pending external review)

**The defect.** Codex's re-review confirmed **F1** at `apps/web/lib/public-campaign.ts:165–166`:
- `edge-global` was charged before the per-address bucket;
- so one address could exhaust the shared 2,000/min admitted-work allowance for every visitor.

**What this branch now carries.** Only the two code commits from Codex PR #18 (`codex/fix-campaign-admission-20261113`, draft), cherry-picked with `-x`:

| Here | Codex | Change |
|---|---|---|
| `f80ab81` | `0aa987f` | `reserve()`: reserves the address bucket, then the global bucket, in one PostgreSQL transaction. Uses a conditional `INSERT … ON CONFLICT … WHERE hits<limit`, so a refused request persists nothing. Enrollment reserves `new-address` and `new-global` together. Adds `campaign-admission-http.test.ts`; updates `campaign-security-http.test.ts` and the staging guard |
| `0ef3ccc` | `47e1ffa` | Bounds idle admission holders (idle-in-transaction timeout) and discards failed leased clients. Extends the admission test |

- `public-campaign.ts` and both admission and security tests are byte-identical to Codex `47e1ffa`.
- The only conflicts were the deploy-guard lists in `vercel.json`, `apps/web/vercel.json` and `tests/unit/campaign-staging.test.ts`. They now list all four isolated branches.
- PR #18's documentation commits (`4f4f506`, `83183c7`) are not included. Neither is any other Codex history; R4 stays reverted.

**Review status.** This is Codex's internal fresh-context re-review (`83183c7`, `docs/reviews/CAMPAIGN_QUOTA_FIX_HANDOFF_2026-11-13.md`): **PASS for the reproduced model; not external Astra approval; production NOT APPROVED.**

**My independent check** (`tests/backend/public-campaign-client.test.ts`, second test). It runs in-process, not through Codex's `wire` harness:
- One address sends 2,000 requests, 16 at a time, with a mix of nonexistent, `/session`, `/export` and `/action` routes, all inside one SQL minute.
- Result: **1,760 got 429** and 240 were admitted.
- The **global allowance is charged exactly 240**.
- Two fresh visitors on other addresses then boot through Claude's controller concurrently and finish **all five missions (41 actions each) with 5 Passport entries each, across a PostgreSQL restart**. Their sessions and exports stay separate.
- The attacker address is still throttled afterwards.

**Residual limits Codex states, still open.**
- Fixed-window burstiness remains.
- Raw HTTP floods still cost SQL and connections; this is not a WAF or DDoS control.
- Distributed sources, many serverless instances, IP provenance and provider connection caps need real hosted acceptance.
- Old and new workers must never run mixed.

## Astra review checklist (frontend ↔ campaign boundary)

**Server-only imports**
- Every campaign server module starts with `import 'server-only'`: `apps/web/lib/campaign-body.ts`, `campaign-http.ts`, `campaign-security.ts`, `campaign-service.ts`, `public-campaign.ts` and `public-campaign-vercel.ts`.
- The client modules are `apps/web/game/campaign/*`, plus `apps/web/game/missions/*` as rendered by them. A grep audit confirms they don't import:
  - `apps/web/lib/*`;
  - `@microfire/game-core`;
  - `pg`;
  - any `node:` built-in.
- Clients import only `@microfire/shared` (Zod schemas and `campaignIdentity`, which uses WebCrypto).
- The play page (server component) imports `@microfire/science` only to pass the B20 claim, citations and recorded conditions as props.

**CSRF**
- The proof arrives only in the bootstrap response, and the controller keeps it in a closure variable. The tests check:
  - it is not in Web Storage;
  - it is not in the DOM;
  - it is not in a URL.
- It is sent as `X-MicroFire-CSRF` on POST `/action`, `/resume` and `/revoke`.
- Every request also carries `X-MicroFire-Campaign: 1`, forcing a CORS preflight that the server never grants.
- The browser supplies Origin and Fetch Metadata. The client never sets them.
- After a reload, the proof is re-issued by `POST /session` against the cookie. It is HMAC-derived from the owner on the server, not stored.

**Session ownership**
- The visitor cookie is `__Host-microfire_campaign_session`. The browser test asserts it is HttpOnly, Secure and SameSite=Strict, and unreadable from `document.cookie`.
- Session ids are created by the server. The client only echoes `runtimeId`, `sessionId` and `expectedRevision` from the server's view into commands.
- Ownership is enforced server-side: a foreign session returns 403 or 404. Codex's tests cover this; the client adds no ownership logic.
- Each tab of the same visitor shares one case. Conflicts resolve through 409 and reconcile.

**Retries**
- Only after an ambiguous outcome: network loss, timeout, malformed body or 500.
- Up to 2 automatic resends of the **identical bytes**, giving the same `campaignIdentity` and revision. The server's stored last response makes them idempotent; the contract test proves the revision moves once.
- 429 and 503 retries are manual and also identical.
- 409 is never retried. The client reads the head and asks for a new intent.
- Note: the same intent at the same revision from two tabs has the same identity, so the second tab receives the stored result. That is correct, not a conflict.

**Passport integrity**
- Passport entries are rendered only from the server view or `GET /export`.
- The client never constructs, edits, imports or uploads a Passport or checkpoint. Public `/resume` takes `{}`.
- The downloaded JSON is a learner copy of the server export. It isn't signed and isn't a credential. Its scope label `educational-progress-not-scientific-certification` is kept.

**Browser bundle leakage**
- Codex's `scripts/verify-campaign-browser-bundle.ts` was run on this combined tree (result below). It scans built browser artifacts for:
  - server credential canaries;
  - credential names;
  - Claim Trial grading hints.
- The Chromium test also asserts that no `expected` rubric object for any statement appears in the page HTML.

## Test evidence (combined tree with the PR #18 quota fix)

**Environment:** macOS, the Codex Node toolchain, fresh `npm ci`, and a local disposable PostgreSQL 16 cluster. Only Chromium is installed.

| Suite | Result |
|---|---|
| `npm run check` (lint, types, units, data, science, security scan, build) | Exit 0. **264/264** units in 22 files. Science: Ask 30/30, rank 7/7 (pre-v4 ranking; B20 `af2281e` is not in this tree), faithful 13/13, forbidden 0, repeatable 30/30 |
| Campaign backend (real HTTP, Chromium, PostgreSQL) | **11/11 pass**: Codex's 4 new admission tests, 5 campaign security tests, plus my client contract test, independent quota check and Chromium five-mission acceptance |
| Existing M2 and research backend (`training-http`, `intelligence-http`, `claude-http`) | **12/12 pass**. `claude-http` needs `MICROFIRE_CLAUDE_WORKTREE`; it skipped in the first full run without it and passed on the re-run with it |
| `m2-live-browser.test.ts` (4 tests) | **4 fail on a precondition, not on behaviour.** Codex's harness requires an *unwired* M2 seam (`contractRuntime = null`) so it can patch in its own. The release and this tree carry the wired seam; `apps/web/game/contract.ts` is identical to release `17621b4`, so the release fails the same way. The test is meant for a pre-integration Claude checkout. Equivalent coverage: `claude-http` and the M2-UI suite |
| `browser-save-consistency.test.ts` | Chromium: failed once under full-suite load (`'99' !== '100'`), **passed on an isolated re-run**. Firefox and WebKit: **fail because those browsers aren't installed here**. The file is unchanged from the release |
| e2e (port 3217) | **118 passed, 22 skipped, 0 failed**. The skips are the same 22 as the release baseline: 17 observatory-http, 2 observatory-m15, 2 observatory, 1 m15-corrections |
| M2-UI (port 3240) | Full run: **143 passed, 48 skipped, 1 failed, 10 did not run**. The failure was `ignition.spec.ts:118` (asset-failure progress bar), and the serial ignition file stopped there. An isolated re-run of `ignition.spec.ts` gave **26 passed, 14 skipped, 0 failed**. In the previous full run on this tree before the quota fix: **153 passed, 49 skipped, 0 failed**. The ignition film has no changes on this branch |
| Codex `verify-campaign-browser-bundle.ts` | 73 built browser artifacts scanned: no campaign credential canaries, credential names or grading hints |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| `npm audit --audit-level=high` (including dev tools) | Exit 0. Moderate development-tool advisories remain, unchanged from Codex's baseline |

**Earlier runs, recorded for completeness:**
- The mission-scenes gate test was rewritten because R4 is reverted on this line.
- Two WebGL timeouts passed when re-run.

**Concurrency, retry, restart and isolation.** These are covered by:
- Codex's admission tests: two pools racing at the global edge admit exactly 2; 300 same-address races admit exactly 240; SQL faults, lock timeouts and outages fail closed without partial reservation; a suspended worker can't hold the global lock;
- Codex's security tests: visitor isolation, CSRF, multi-instance retry and restore, expiry, revoke;
- my client tests: identical-byte retry with a single revision change; 409 reconciliation; 503 with identical retry; two concurrent visitors through a PostgreSQL restart.

**What the Chromium acceptance covers (`tests/backend/public-campaign-browser.test.ts`).** One HTTPS origin, with pages from `next start` (production build) and the API from Codex's unmounted handler in the harness.
- Visitor cookie flags. CSRF proof absent from Web Storage, IndexedDB, the DOM and the URL.
- Reload mid-mission returns the same case.
- A stale second tab is reconciled through 409.
- A storage outage shows the alert, then an identical retry.
- All five missions through the real scenes.
- The Passport shows 5 entries and the JSON export matches the session.
- Reload after completion. Expiry, then a disclosed restart.
- Keyboard-only intent.
- iPhone 13 touch, plus reload resuming Mission 02.
- axe (WCAG 2 A/AA) and horizontal-overflow checks on desktop and mobile.
- Only `/api/game/public-campaign/v1/{session,action,resume,revoke,export}` were called.
- The Next server itself returns 404 for both campaign namespaces even with the UI flag on.

**Disabled-state negatives (`tests/e2e/foundation.spec.ts`, default server):** `/missions/play`, all 6 public visitor routes and all 8 loopback operator routes return **404**.

**Unchanged against release `17621b4`:**
- `packages/science`, `packages/game-core` and all NASA data. Only Codex's unapplied `data/migrations/campaign-public-v1.sql` and the mission-scenes Meshy rights entries are new.
- B20 is still 17.4 vol% calibrated, and the 55 quarantined records are untouched.
- `packages/shared` only gains Codex's `public-campaign.ts` schemas and the authorize response schema.

## Not done, and blockers

- **Mounting is blocked.** No Next.js route mounts `createVercelPublicCampaignHandler`. Mounting needs Astra's approval of the exact combined tree, then provisioned managed PostgreSQL, a least-privilege role and migration, keys, and a pinned origin and runtime epoch. Codex's handoff lists these.
- **No staging run yet.** Real Vercel staging hasn't been run. It must cover:
  - trusted `ipAddress`, host and URL behaviour behind the gateway and custom domains;
  - TLS pool suspension;
  - concurrency and cookie behaviour on the real domain;
  - log redaction;
  - cleanup scheduling.

  None of this was provisioned.
- **The loopback operator protocol isn't wired to any UI**, intentionally.
- **No HawkScan DAST run.** `HAWK_API_KEY` isn't configured in this environment.

## Fastest verified release path (no gate skipped)

| Step | Owner | Exit condition |
|---|---|---|
| 1. Fix P2 F1 | Codex | **Done**: PR #18 `47e1ffa` (internal re-review PASS) |
| 2. Cherry-pick the F1 fix onto this branch; rerun all suites | Claude | **Done**: see Test evidence; exact SHA in the final commit of this document |
| 3. Exact combined-tree review: F1, CSRF, cross-visitor access, answer-key exposure, privilege escalation | Astra | Explicit verdict on that SHA |
| 4. Isolated, access-controlled Vercel staging project (not `microfire-v2`); TLS PostgreSQL; separate migration owner and runtime role; secrets; one approved Node route mounting `createVercelPublicCampaignHandler` | Codex (provision), owner (accounts) | Staging URL with protection on |
| 5. Staging acceptance: multiple visitors and serverless instances, gateway `ipAddress`/Host, cookies, CSRF, durable revisions, recovery, rate limits, log redaction, cleanup; plus this branch's Chromium journey pointed at staging | Astra, with Claude and Codex | Signed-off acceptance |
| 6. Owner release decision. A new production deployment; the alias moves only after a smoke test. `cbfazx7ir` stays as the rollback | Owner | Public URL |
| 7. Record mission and Passport footage from that URL; cut video v3 (`docs/video/VIDEO_PLAN_V3_COMPLETE_EXPERIENCE.md`) | Claude | Verified video paired with the deployment |

Steps 1 and 4 can run in parallel. Video v3 is on hold at the owner's request; step 7 starts only when the owner says so.
