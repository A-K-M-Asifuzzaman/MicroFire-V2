# Campaign authority and public-user handoff — November 13, 2026

Quota remediation follow-up: [fixed source47e1ffa, atomic admission policy, regression evidence and re-review](../reviews/CAMPAIGN_QUOTA_FIX_HANDOFF_2026-11-13.md). No API/schema/env/migration change. Internal local re-review is conditional; external Astra and authorized hosted staging remain gates.

Exact-faecf92 security re-review: [conditional authority verdicts, P2 quota finding and blocked production readiness](../reviews/INDEPENDENT_CAMPAIGN_SECURITY_REVIEW_FAECF92_2026-11-13.md). Vercel team access is now verified; actual hosted tests remain blocked by owner instruction. This is not external Astra approval.

Publication follow-up: [review branch, staging package and full combined regression report](../reviews/CAMPAIGN_REVIEW_PUBLICATION_2026-11-13.md). Source review pin `48d2c8baa1505c11499d405d934529269cdde722`; no runtime or API contract changes from this handoff.

Status: implemented and tested in `codex/campaign-security-remediation-20261113`, isolated from Claude's consumer and the submission deployment. **Both factories remain unmounted. This document is not independent security approval.** No database was provisioned, route enabled, merge made or deployment performed.

## Exact source commits

Base: `d324ff06d2f9959041d0f01999ba1d48fe184276`.

| Commit | Responsibility |
|---|---|
| `f4f86cec7dc9f2a8e7383ef22f10f8ee062a1dff` | Separate loopback CampaignAuthority, proof, ownership, HTTP boundary and checkpoint remediation |
| `ed9a3285e3b712ccced1682949662118598cb79c` | Durable anonymous public sessions, strict projected DTOs, PostgreSQL schema, maintenance CLI and unmounted Vercel adapter |
| `c8bf97ae5519d7b89709614128a1fbd4e82f045f` | Real HTTP/Chromium/PostgreSQL attack reproductions and browser artifact canaries |
| `85550dded710402ec0ad750888af46366e625bcf` | Least-privilege database acceptance and portable fixture discovery |

Review the complete ordered delta against this base. Do not merge the parent branch wholesale into Claude's submission. Any later consumer application/cherry-pick requires tests and Astra approval of the resulting tree; the SHA changes after a cherry-pick. Existing PR #16/R4 and B20 ranking review gates remain separate.

## Loopback operator protocol

Server-only factory: `createLoopbackCampaignHandler(env)` in `apps/web/lib/campaign-http.ts`, using `CampaignAuthority` in `campaign-security.ts` and the existing campaign service/reducer. Instantiate once per local process only after review. The application does not import it from an API route.

Base `CAMPAIGN_HTTP_BASE = /api/game/campaign/v1`. All requests require `X-MicroFire-Campaign: 1`, exact pinned origin/Host, same-origin Fetch Metadata when present; POST requires matching Origin and application/json. Protected requests additionally require the cookie **and** `X-MicroFire-Campaign-CSRF: <origin-held proof>`, including GET. No URL credentials or query parameters. No CORS access.

| Method/path | Request schema | Response schema |
|---|---|---|
| GET `/capability` | No body; optional current cookie/proof | `CampaignHttpCapabilityResponseSchema` |
| POST `/authorize` | `AuthorizeRequestSchema` — `{ approvalToken }` | **`CampaignAuthorizeResponseSchema`**, includes `runtimeId`, `expiresAt`, `csrfToken`; sets separate HttpOnly campaign cookie |
| POST `/revoke` | `RevokeRequestSchema` — `{}` | `RevokeResponseSchema` |
| POST `/start` | `CampaignHttpStartRequestSchema` — `{ runtimeId, sessionId }` | `CampaignHttpSnapshotResponseSchema` |
| GET `/session/:uuid` | No body; grant-owned UUID | `CampaignHttpSnapshotResponseSchema` |
| POST `/action` | `CampaignCommandSchema` | `CampaignHttpActionResponseSchema` |
| POST `/resume` | `CampaignHttpResumeRequestSchema` — `{ runtimeId, checkpoint }` | `CampaignHttpSnapshotResponseSchema` |
| GET `/export/:uuid` | No body; grant-owned UUID | `CampaignHttpExportResponseSchema` |

All Zod contracts are exported by `@microfire/shared`; infer TypeScript with `z.infer<typeof Schema>`. Success envelopes are `{ apiVersion: '1', data }`; failures use `HttpFailureSchema`. Do not parse this authorization response with frozen M2 `AuthorizeResponseSchema`. Never broaden/reuse the M2 cookie, transport, authority or session store.

Example authorization and response shape (variables are runtime values, not embedded secrets):

```ts
const response = await fetch(`${CAMPAIGN_HTTP_BASE}/authorize`, {
  method: 'POST', credentials: 'same-origin', cache: 'no-store',
  headers: { 'Content-Type': 'application/json', 'X-MicroFire-Campaign': '1' },
  body: JSON.stringify({ approvalToken: operatorInput }),
});
if (!response.ok) throw HttpFailureSchema.parse(await response.json());
const { data: authorization } = CampaignAuthorizeResponseSchema.parse(await response.json());
// { authorized: true, runtimeId, expiresAt, csrfToken }
// Clear operatorInput. Retain csrfToken only in this origin's memory.
```

The browser supplies Origin/Fetch Metadata; do not forge those headers. A start uses a fresh `crypto.randomUUID()` and the returned runtimeId; its response is `{ apiVersion: '1', data: { campaignVersion: 1, runtimeId, sessionId, revision: 0, checkpoint, state, training, sourceReviewed, selectedExperimentId, explanation, appraisals, habitat, scope } }`, validated in full by the snapshot schema. This operator snapshot is deliberately not the public visitor DTO.

Cookie scope: `/api/game/campaign/v1`, HttpOnly/SameSite Strict/one hour, Secure with HTTPS. Cookies are shared across ports: the separate origin-held proof is essential. Local server must actually bind 127.0.0.1; hosted environment markers disable configuration. Grant and head capacities are eight; process request budget is 120 reads/30 writes per minute. Dedicated access/signing credentials are random 32-byte canonical base64url, distinct from all M2/review/public credentials. Checkpoint key is purpose-derived with HKDF; realm UUID/key ID/origin must remain controlled.

**Recovery limit:** no durable local high-water journal exists. Live stale receipts are rejected, but after process restart a fresh operator may restore an older, still-valid signed receipt within 24 hours. Astra must explicitly accept this bounded operator recovery scope or require a durable local journal before mounting. Grants/proofs expire or are lost on restart/reload; reauthorization alone does not transfer existing live heads to a different grant. Old PreviewAuthority campaign receipts are incompatible; M2 receipts remain unchanged.

## Public anonymous visitor protocol

Server-only factory: `createVercelPublicCampaignHandler(env)` in `apps/web/lib/public-campaign-vercel.ts`, using the durable service in `public-campaign.ts`. Instantiate once at module scope only in an independently approved future Node.js route. **There is no route to copy or activate in this change.** The loopback operator handler must never serve public gameplay.

Base `PUBLIC_CAMPAIGN_BASE = /api/game/public-campaign/v1`. Every request requires `X-MicroFire-Campaign: 1`; exact-origin/Host and Fetch Metadata defenses apply. Mutations after bootstrap also require **`X-MicroFire-CSRF`**, which differs from the local header. POST uses application/json and exact Origin. Credentials use the same-origin browser cookie; never send an operator secret.

| Method/path | Request schema | Response schema |
|---|---|---|
| POST `/session` | `PublicCampaignEmptyRequestSchema` — `{}` | `PublicCampaignBootstrapResponseSchema` — `{ csrfToken, expiresAt, view }`; new visitor gets HttpOnly cookie |
| GET `/session` | No body | `PublicCampaignViewResponseSchema` |
| POST `/action` | `PublicCampaignActionRequestSchema` = `CampaignCommandSchema` | `PublicCampaignActionResponseSchema` |
| POST `/resume` | `PublicCampaignEmptyRequestSchema` — `{}` | `PublicCampaignViewResponseSchema`; reads durable head only |
| POST `/revoke` | `PublicCampaignEmptyRequestSchema` — `{}` | `PublicCampaignRevokeResponseSchema` — `{ revoked: true }`; clears cookie |
| GET `/export` | No body | `PublicCampaignExportResponseSchema` — `{ sessionId, revision, passport, scope }` |

There is no public authorize/operator/start/checkpoint-import endpoint. Session/case identifiers are created by the server, not selected by visitors. POST session with a valid cookie recovers the same case and its CSRF token; an expired/revoked cookie gets a refusal and clear-cookie first. Do not silently turn a rejected action or storage error into a new case. Explicitly distinguish 403 session expiry, 404 missing case, 409 reconciliation, 429 Retry-After and 503 storage unavailability. `HttpFailureSchema` retains the legacy code spelling `PREVIEW_UNAUTHORIZED`; public UI must not interpret it as a request for an operator token.

Typed request/response example after approval:

```ts
const response = await fetch(`${PUBLIC_CAMPAIGN_BASE}/session`, {
  method: 'POST', credentials: 'same-origin', cache: 'no-store',
  headers: { 'Content-Type': 'application/json', 'X-MicroFire-Campaign': '1' },
  body: JSON.stringify(PublicCampaignEmptyRequestSchema.parse({})),
});
if (!response.ok) throw HttpFailureSchema.parse(await response.json());
const { data: visitor } = PublicCampaignBootstrapResponseSchema.parse(await response.json());
// { csrfToken, expiresAt, view: { protocol: 'public-campaign-v1', runtimeId,
//   sessionId, revision, activeMission, completedMissions, trainingStep,
//   installedPartIds, diagnostic, sourceReviewed, selectedExperimentId,
//   predictionLocked, passport, trialStatements, scope } }

const intent = {
  runtimeId: visitor.view.runtimeId, sessionId: visitor.view.sessionId,
  expectedRevision: visitor.view.revision, action: approvedUiAction,
};
const command = PublicCampaignActionRequestSchema.parse({
  ...intent, commandId: await campaignIdentity(intent),
});
const actionResponse = await fetch(`${PUBLIC_CAMPAIGN_BASE}/action`, {
  method: 'POST', credentials: 'same-origin', cache: 'no-store',
  headers: { 'Content-Type': 'application/json', 'X-MicroFire-Campaign': '1',
    'X-MicroFire-CSRF': visitor.csrfToken },
  body: JSON.stringify(command),
});
if (!actionResponse.ok) throw HttpFailureSchema.parse(await actionResponse.json());
const result = PublicCampaignActionResponseSchema.parse(await actionResponse.json()).data;
// Accepted: { ok: true, view, feedback? }; domain refusal: { ok: false, view, code, message }.
```

`approvedUiAction` is a learner choice validated by `CampaignActionSchema`, not an answer rubric. Available discriminants: TRAINING, CORE, REVIEW_SOURCE, SELECT_EXPERIMENT, EXPLAIN_OBSERVATION, APPRAISE_CLAIM, ASSESS_HABITAT. Mission gates/progression/grading/Passport updates remain server-authoritative. Do not import `@microfire/game-core`, private expected answers or raw training state into a client bundle. Render the returned projected view; do not cast it to CampaignSnapshot or infer successful progression locally. Display authorized educational feedback as such; source observations, authored tutorials, fictional incidents and learner explanations retain their existing attribution labels.

Keep CSRF in memory; on reload bootstrap recovers the same durable case and CSRF. Serialize edits per visitor. On a network ambiguity, retry the identical command bytes/identity/revision; the last accepted command returns its persisted response. If another action has advanced the head, reconcile with GET session and require a fresh learner intent. Never recompute an old answer against a new revision automatically. On 409 read the current head, and on runtime change reconcile the release epoch; do not replay a queue blindly. Public resume takes `{}` and cannot import browser state or rewind progress. Cookie loss/24-hour expiry has no account recovery; disclose this before offering a restart.

The projected public DTO excludes checkpoints, record events, raw training state, injected faults and private grading hints. Diagnostic data appears only after the server-side diagnostic tool action. Public trial statements contain id/text/origin only. Browser canary checks and real browser DTO tests exercise these boundaries.

## Configuration, storage and lifecycle — required before hosted acceptance

`.env.example` contains empty values; both enable flags default to 0. Environment flags express technical opt-in only, not actual review authorization. Keep all credentials out of NEXT_PUBLIC variables, URLs, browser storage, analytics, HTTP/application logs and error payloads. Runtime DB connection configuration is a private environment value, never a visitor URL or CLI argument. Configure hosting/proxy log redaction for cookies, CSRF headers, authorization bodies and database configuration before enabling.

Public settings required after approval:

- `MICROFIRE_PUBLIC_CAMPAIGN_ENABLED=1`, `MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL=public-campaign-v1`, `VERCEL=1` supplied by the platform.
- `MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN`: one pinned canonical HTTPS origin, no trailing slash/path/query. Origin aliases and preview hosts are not automatically trusted.
- `MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID` and `MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID`: stable UUIDs shared by every worker. Runtime is a release epoch, not a new random UUID per invocation. Rules/catalog/origin/epoch are binding inputs; changing them requires an explicit recovery/migration policy.
- Independent random 32-byte canonical base64url `MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY` and `MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY`. No M2/review/campaign key reuse. Rotation is a reviewed lifecycle change.
- `MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_URL`: independently approved managed PostgreSQL TLS pooler, verified provider certificate chain. `publicCampaignPool` enforces certificate verification and constructs SSL options separately from URL options; no insecure SSL workaround. Node.js runtime, not Edge. One lazily shared pool, max=2, 5s connection/query and 3s statement timeouts; official `attachDatabasePool` is implemented for Vercel lifecycle.
- Use a separate migration owner. The runtime role needs CONNECT/schema USAGE and only SELECT/INSERT/UPDATE/DELETE on the three campaign tables; no CREATE/ALTER/DROP or unrelated/M2 tables. Migration explicitly revokes PUBLIC table permissions. No existing database/table is overwritten by automatic application startup.

From repository root, a separately authorized operator with the proper private environment runs:

```sh
node --conditions=react-server --import tsx scripts/campaign-public-maintenance.ts migrate
node --conditions=react-server --import tsx scripts/campaign-public-maintenance.ts cleanup
```

`migrate` is a one-time transactional schema installation, not idempotent DDL. `cleanup` is transactional, deletes expired/revoked visitors with cascading heads and expired budget windows, and prints counts only after commit. Schedule cleanup at least hourly through approved infrastructure; no public maintenance route exists. Schema: `data/migrations/campaign-public-v1.sql`. Backups, retention/deletion, encryption, region, provider connection/cost limits and restoration procedures require owner/provider review. No managed service or scheduled task has been provisioned by this branch.

SQL stores namespaced session digests, event records/projections, last accepted retry response and HMAC-hashed address budgets. Absolute visitor expiry is 24 hours. Durable transactions/row locks and revision checks survive process/database restart. No memory/tmp fallback; database failure is 503. Administrative restoration of an older database backup is outside protocol anti-rollback guarantees.

The adapter uses official `ipAddress(request)` and refuses absent/ambiguous platform address; it does not use client forwarding headers as its own trusted address source. Verify the actual Vercel gateway's header overwrite behavior and exact Host/URL values in staging, including custom domains. Persistent quotas: 2,000 global requests/min, 240/address/min, 120/visitor/min, 5 new visitors/address/min, 60 new/min globally, 10,000 active visitors. Review shared-NAT effects and network/WAF controls; configured quotas are not load-test or bot-resistance claims. Tests use separate server-provided socket addresses, not a claim of deployed platform validation.

## Evidence and acceptance gates

Separate reports: `docs/reviews/CAMPAIGN_LOOPBACK_ACCEPTANCE_2026-11-13.md` and `docs/reviews/CAMPAIGN_PUBLIC_ACCEPTANCE_2026-11-13.md`. Hashed source/review evidence and retained command outputs: `docs/reviews/evidence/campaign-security/verification.json` and adjacent logs.

Actual results: 266/266 units across 22 files; lint/typecheck/source/science/security/build checks pass; real HTTP/browser/PostgreSQL 4/4, 0 skipped; production Next smoke 1/1 confirms both namespaces remain 404; 64 browser artifacts scanned. Public tests cover two independent service pools, full five-mission journey/Passport, PostgreSQL process restart, least-privilege role, unavailable storage, cleanup, CSRF/origin/foreign sessions, revision/retry/revoke races. Loopback tests reproduce actual cross-port browser requests carrying cookies, all foreign-grant paths, expiry/revocation/stale checkpoints and restart recovery. Tests use disposable local PostgreSQL/TLS only, not a provisioned hosted database.

Runtime dependency audit: 0 vulnerabilities. Full audit: 10 moderate development-tool advisories, 0 high/critical; affected baseline package versions unchanged from d324ff0. No unrelated dependency-major migration was attempted. M2 code/cookie/routes and scientific fixtures are unchanged; B20 remains 17.4%, all 55 legacy quarantines and the seven separate review candidates remain unpromoted. No frozen mission rules or private answer rubrics changed.

Before public enablement: independent Astra approval of exact implementation/consumer tree and DTO/CSRF protocol; Claude contract acceptance; approved managed storage/permissions/lifecycle/WAF; real Vercel staging tests for trusted forwarding, TLS/pool suspension, concurrency/recovery, cookie/CSRF behavior, cleanup and no client secrets; owner release authorization. Local mounting separately requires explicit acceptance of the restart rollback limit or a durable local journal. Neither loopback nor public acceptance substitutes for the other.

Coordination attempt: the repository peer registry reported no connected Claude peer (`RENGA_PANE_ID` unavailable). This versioned file is the concrete handoff; it has not been represented as delivered, jointly agreed or approved. No message was sent to another person and no Claude worktree/assets/video were modified.
