# Campaign security re-review — exact faecf92

Reviewed commit: **`faecf92b18528a18486d2106c050130e95e4bc0c`**, checked out clean in a separate detached worktree. Campaign comparison base: `d324ff06d2f9959041d0f01999ba1d48fe184276`. Reviewed preceding security commits: f4f86ce, ed9a328, c8bf97a and 85550dd. Later 48d2c8b/8dca07d changes were not substituted for the requested target.

Method: one fresh-context Security Review subagent independently read the implementation, acceptance reports and API handoff; the integrating agent reproduced tests and additional adversarial probes against the pinned source. The integrating agent also authored the implementation. This provides separate analysis and fresh execution evidence, **not an external Astra review or permission to release**. Existing reported PASS labels were not accepted without reproduction. No application fixes were made during review.

## Separate decisions

| Area | Verdict | Basis and conditions |
|---|---|---|
| Loopback campaign authority | **CONDITIONAL** | Dedicated keys/proof/cookie, origin defenses, grant ownership, revocation/expiry and live-head replay checks held in reproduced tests. Actual loopback bind is an operational prerequisite. Explicitly accept the demonstrated restart rollback/rebinding limit or add/review durable continuity before mounting. |
| Public visitor authority | **CONDITIONAL** | No concrete cross-owner access, CSRF bypass, fixation acceptance, public client-checkpoint rollback, operator-secret or answer-key exposure was found in reviewed/tested surfaces. Local SQL/browser controls reproduce. One confirmed P2 availability issue remains; resolve its admission policy and mitigation. Actual provider acceptance remains blocked. |
| Production deployment readiness | **FAIL — NOT APPROVED** | No approved isolated hosted deployment/database was available for required Vercel/managed-PostgreSQL acceptance. Owner explicitly directed finishing with hosted tests blocked. Runtime configuration, gateway trust, TLS/pool/serverless behavior, lifecycle/WAF and integrated consumer approval remain unverified. Both handlers remain unmounted. |

Conditional does not authorize endpoint mounting, merge or deployment. Public release remains blocked until independent Astra approval, hosted acceptance and owner release authorization.

## Finding F1 — P2 / Medium availability: one address can exhaust the shared quota

Location in reviewed source: **`apps/web/lib/public-campaign.ts:165–166`**, budget increment at `:62–67`.

The handler charges `edge-global` before checking `edge:<trustedAddress>`. Requests refused by the per-address quota still consume the global bucket, including cookie-free requests to a nonexistent route under the public prefix. A bot can supply matching Host/origin/custom headers; those are browser-origin protections, not bot credentials.

Fresh reproduction with the actual production handler and a disposable real PostgreSQL cluster:

1. Within one SQL minute, send 2,000 cookie-free GET requests to `/api/game/public-campaign/v1/does-not-exist` with the required campaign header, matching Host and one trusted test address.
2. First 240 requests return 404. The remaining 1,760 return 429 from the address limit.
3. A request using a fresh distinct trusted address returns 429. PostgreSQL records **2,001 global hits** in that minute.

The reviewer's independent control-flow probe and the real PostgreSQL result agree. The retained PostgreSQL probe calls the real handler with native Request/Response objects; it is not a Vercel network load test. Separate supplied suites exercise actual HTTP sockets/browser requests. Synthetic addresses are supplied by the disposable adapter, not an assertion that an attacker can spoof the production gateway.

Consequence: one source at roughly 33 requests/second can temporarily deny campaign admission to other visitors for that fixed-minute window without receiving a visitor credential. The same SQL row makes the effect shared across instances. There is no demonstrated session disclosure, privilege escalation, progress mutation or quota-counter persistence bypass. The current endpoint is unmounted, so this is a latent release issue rather than an exposed production incident.

Policy distinction: the documented cap of 2,000 **total attempts** is enforced correctly. If counting throttled hostile attempts globally is intentional, this is the circuit breaker's availability tradeoff, not a numerical quota bypass. The per-address quota consequently does not stop one address monopolizing that breaker. Check the address allowance before charging the shared admitted-work budget, or explicitly adopt the circuit-breaker policy with verified upstream controls that drop abusive traffic before it consumes the shared application budget. Reproduce normal/fresh-visitor availability after mitigation, including multiple instances. A statement that WAF protection is planned is insufficient for release.

## Disclosed loopback limits independently confirmed

At `apps/web/lib/campaign-service.ts:95–104`, a stale checkpoint cannot replace a live head: reproduced 409 after revision advanced from 0 to 1. Constructing a new process-equivalent authority/service with the same local signing configuration, authorizing a fresh operator and restoring the original signed receipt succeeds at **revision 0**. No durable local high-water journal exists. Restored ownership is rebound to the fresh grant; it is not permanent cross-restart grant continuity.

This is explicitly disclosed in both original acceptance/handoff documents and is not presented as a newly discovered hidden vulnerability. Accept the bounded operator recovery model explicitly or require durable continuity. Do not claim restart anti-rollback. Old/expired receipts still face signature/realm/origin/key/catalog/time checks; public resume never accepts such a client receipt.

Loopback cookies are shared across ports despite their Path. The independent origin-held proof prevents a cookie alone from authorizing protected calls, as actual browser attacks reproduce. Another same-host service can still overwrite a cookie and disrupt access; the proof is not a browser cookie-availability boundary. Process-local heads/grants also require the documented recovery workflow after proof loss, revocation or restart. No separate cookie-clobber authorization bypass was found.

## Fresh execution evidence

| Command/probe | Reproduced result |
|---|---|
| `npm ci --offline --ignore-scripts` | Locked fresh install succeeded; no package changes |
| `npm run check` | Exit 0: 266 units in 22 files; lint/types/data/science/basic security/build passed |
| `scripts/eval-science.ts` within check | Ask 30/30, rank 7/7, faithful 13/13, forbidden 0, repeatable 30/30 |
| `scripts/eval-intelligence.ts` | 11/11 intelligence, 5/5 citation cases; admission unchanged |
| Original `campaign-security-http.test.ts` | **4/4**, 0 skipped; real HTTP/Chromium/PostgreSQL, fresh random credentials |
| M2/science/review-route HTTP suites | **13/13**, 0 skipped; real 429 recovery, signing-key rotation, revoked/invalid credentials, hosted-marker refusal, source/API checks |
| Additional independent adversarial script | Six assertions groups reproduced against the actual faecf92 modules; details below |
| Independent quota probe | Real handler/SQL: 240×404, 1,760×429, fresh address 429, global hits 2,001 |
| Fresh canary build/browser scan | Exit 0; 64 built browser artifacts contain no ephemeral campaign canaries, server credential names or private grading hints; handlers remain unmounted |
| Fresh dependency audit | Runtime 0 advisories; full audit 10 moderate development advisories, 0 high/critical; no dependency fixes attempted |

The additional script independently demonstrates:

- Fault after the second bootstrap write rolls back both visitor/head rows, returns 503 with no success cookie and sanitizes the database error.
- An attacker-selected random, well-formed anonymous cookie is rejected with 403 and clearing; it is not adopted as a new visitor.
- **Two separately launched Chromium processes**, not only two pages, receive distinct sessions. A foreign-case action returns 404, wrong CSRF returns 403, JavaScript cannot read the HttpOnly cookie or overwrite it with a script-set cookie. Secure/SameSite Strict/__Host/Path attributes are checked. These are local self-signed HTTPS fixtures, not hosted provider browsers.
- Fault after a head UPDATE leaves revision/event history/last-command/last-response unchanged. Removing the fault permits the same command, and its exact retry returns the identical accepted result.
- The fixture's runtime PostgreSQL role is denied CREATE, ALTER and DROP. Production role ownership/inheritance and grants remain unverified.
- Live rollback fails while restart rollback to an older valid receipt succeeds, matching the disclosed scope.

The original four campaign cases additionally reproduce simultaneous competing revisions across independent pools, exact retry, session isolation, five-mission progression/Passport attribution, public storage outage/recovery, PostgreSQL restart, cleanup, expiry/revocation, request limits and cross-port browser attacks. Inspection of those test cases preceded interpreting their fresh outputs; a passing count alone is not treated as comprehensive proof.

All probes use ephemeral local credentials and fixture-owned database/TLS resources, which are closed/removed. Local PostgreSQL connects over a private Unix socket; test browser HTTPS certificate checks are bypassed for disposable self-signed fixtures only. This does not prove managed-provider PostgreSQL TLS, certificate validation, production account isolation, gateway IP provenance or serverless lifecycle. The same client is used for transaction statements, consistent with [node-postgres transaction requirements](https://node-postgres.com/features/transactions).

### Reproduction from a separate checkout

Pin faecf92 and install Node 24/locked dependencies. PostgreSQL binaries must be discoverable through pg_config or MICROFIRE_TEST_PG_BIN, and matching Chromium must be installed in PLAYWRIGHT_BROWSERS_PATH. Cold builds require network access for the existing next/font dependency. No real server credentials are required.

```sh
npm ci --offline --ignore-scripts
npm run check
node --import tsx scripts/eval-intelligence.ts
node --conditions=react-server --import tsx --test tests/backend/campaign-security-http.test.ts
node --conditions=react-server --import tsx --test tests/backend/intelligence-http.test.ts tests/backend/review-http.test.ts tests/backend/training-http.test.ts
node --conditions=react-server --import tsx scripts/verify-campaign-browser-bundle.ts
npm audit --omit=dev
npm audit
```

The two review scripts are retained as text evidence. Copy each into a temporary .mts file, then execute from the **pinned faecf92 checkout**, so their dynamic source imports and locked runtime dependencies resolve to that target. Quota reproduction must stay within one SQL-minute window; its returned window rows make this constraint observable. Never point these scripts at a real database, live endpoint or production client address.

```sh
node --conditions=react-server --import tsx /tmp/microfire-independent-adversarial.mts
node --conditions=react-server --import tsx /tmp/microfire-independent-quota.mts
```

The full npm audit intentionally exits nonzero for the reported development advisories. No passing production audit claim is inferred from the offline install's cached summary. The exact immutable source pin and evidence hashes are in `evidence/campaign-independent/manifest.json`.

## Production, storage and secret review

Public enrollment has no operator-token path. Session values are random 32-byte base64url credentials, hashed for storage; public UUIDs do not grant access. No promotion/fixation through a preselected invalid cookie was reproduced. Public mutations bind owner/CSRF/runtime/revision/content identity and use locked transactions. The projected public DTO excludes raw records/training/checkpoints/private expected-answer fields; the campaign reducer remains server-side. No concrete public answer-key/operator-secret leak was found in source and exercised responses. This does not approve a future consumer that imports additional server logic.

`publicCampaignPool` requires a PostgreSQL URL through a private server environment, builds SSL options explicitly with certificate verification, and refuses insecure SSL mode. The migration is not executed at startup and revokes PUBLIC table privileges. Separate runtime/migration roles, their real grants/ownership/inheritance, database selection, network policy, credential rotation, cleanup and backup retention are deployment requirements, not verified account state. No actual database URL or token values are included in this report/evidence.

Installed @vercel/functions 3.11.2 obtains ipAddress from `x-real-ip`. Its integrity depends on the hosting gateway overwriting client-supplied values; this is normal SDK behavior, **not a demonstrated spoofing vulnerability**. [Vercel documents its request header handling](https://vercel.com/docs/headers/request-headers), but the exact route/custom-domain/proxy behavior must be exercised on the actual protected deployment. Check spoofed/multiple forwarded values, Host/URL origin, absent platform context and protection/error routes. Environment flags alone are not evidence of reviewer approval.

Vercel team authorization now works. Read-only inspection found no dedicated campaign staging pair in the queried resources; no approved isolated PostgreSQL database was identified. The owner then explicitly instructed: **“Finish the review with hosted tests marked blocked.”** No provider project/configuration, connection, database, environment value or deployment was created/modified. Do not infer the current live deployment's source or protection settings from an unrelated project with a similar name.

Required hosted tests remain **BLOCKED / NOT RUN**: two independent browsers against the actual protected provider; concurrent actions across independent serverless instances; repeated/invalid credentials and persistent quotas; TLS/pool suspension/connection caps; actual runtime privileges; revocation/expiry and cleanup; cold start, restart/redeployment and managed database outage/recovery; browser artifacts and credential/log redaction on the integrated deployment. No existing production website is an approved campaign staging environment.

## Regression and release conditions

A fresh git comparison against d324ff0 shows byte-identical M2 authority/session/security route code, frozen contracts, existing Next route tree, UI/assets, all game reducers, science implementation, NASA fixtures and quarantine. The only data-file delta is the new unapplied SQL migration. Fresh HTTP/source validation confirms one admitted B20 at calibrated **17.4%**, 55 legacy quarantines and unadmitted candidates; no automatic admission occurred. API/private-route denial and unchanged POST budgets were reproduced over HTTP. Frozen M2 behavior was exercised separately. This review does not approve unrelated PR #16/R4 or later B20 ranking candidates.

Before local mounting: retain exact-origin/proof contract and physical loopback bind; accept the restart recovery/continuity limit explicitly or independently review a durable fix; preserve M2 isolation and integration approval.

Before public enablement: settle F1 with demonstrated fresh-visitor availability; independently review the exact consumer/route delta and prevent server-only imports/credential exposure; establish approved isolated protected staging/TLS PostgreSQL/least privilege/lifecycle/WAF; complete every blocked provider test; obtain external Astra and owner release approval. Re-review runtime/security changes against a new exact SHA. No merge or production deployment is authorized by these conditional results.
