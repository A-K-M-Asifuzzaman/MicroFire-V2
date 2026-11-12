# Loopback campaign remediation acceptance — November 13, 2026

**Automated implementation acceptance: PASS for the documented loopback scope. Independent security approval: PENDING. No route mounted or deployment approved.** Author: Codex, the implementation author, not an independent reviewer.

Exact authority/service/HTTP commit: `f4f86cec7dc9f2a8e7383ef22f10f8ee062a1dff`. Final regression source: `85550dded710402ec0ad750888af46366e625bcf`. Public sessions are a separate design/report; the loopback grant is not suitable for public gameplay. The triggering consumer report is preserved verbatim beside this report; its hash is in `evidence/campaign-security/verification.json`.

## Remediation of the reviewed failures

| Finding | Actual correction | Evidence |
|---|---|---|
| Cross-port same-site requests reached authorized GET code | Exact URL origin/Host, no forwarded authority, custom campaign header on every request, same-origin Fetch Metadata when present, no no-cors requests. Protected requests additionally require an origin-held random proof, not just a cookie | Real Chromium second-port GET/POST/cors-preflight attacks receive server 403 even with SameSite cookies present; a forged-origin HTTP request with cookie alone is refused |
| Any grant could address another grant's UUID | Each head stores the campaign grant digest; start/read/action/export/live resume verify ownership; foreign and absent cases both return 404 | Real HTTP exercises all five foreign-grant paths |
| M2 cookie/credentials could be broadened or reused | Separate CampaignAuthority/map/cookie/audience and dedicated access/signing keys. Key material is rejected if equal to supplied M2/review/public credentials; checkpoint MAC key uses HKDF info `microfire/campaign-v1/checkpoint`, salt realm ID | Unit configuration probes, two-way M2/campaign cookie isolation over HTTP, source preservation assertions |
| Revocation/expiry/races | Hashed random 32-byte grant and independent random 32-byte proof; one-hour absolute grant expiry; revoke deletes grant; runtime restart invalidates all grants; queued actions reauthorize before commit | Unit and real HTTP expiry/revocation/restart plus competing revisions and identical retries |
| Checkpoint tamper/rollback | Separate MAC key/purpose, realm/origin/key/catalog/session/owner binding; issued-time bounds and 24-hour receipt age; live-head equality check; foreign live head cannot be rebound | Real HTTP altered MAC/stale receipt refusal and explicit authenticated restart restore |
| Request/response boundaries | Proposed 1 KiB auth/start/revoke, 64 KiB action, 176,128-byte resume caps are enforced before JSON/schema parsing; duplicate keys, malformed UTF-8, nonfinite numbers and unknown keys refused; response budget checked | Existing body matrix, strict contract tests and actual HTTP 413/400 cases |

Cookies are `microfire_campaign_grant; Path=/api/game/campaign/v1; HttpOnly; SameSite=Strict; Max-Age=3600`; HTTPS uses `__Secure-microfire_campaign_grant` and Secure. Cookie Path and SameSite alone are not trusted: same-host cookies are shared across ports. The additional proof is returned only after successful operator authorization, is stored hashed on the server, and must be held only in the legitimate origin's memory. A cookie stolen by another local web server is insufficient. Capability does not issue a proof. No M2 authority/session object is used. M2 environment values are compared only to reject credential reuse; they are never used to authorize or sign a campaign.

## Actual acceptance and reproducibility

`node --conditions=react-server --import tsx --test tests/backend/campaign-security-http.test.ts` passes both loopback cases (and both separately reported public cases), with 0 skipped. It uses real HTTP requests and a real Chromium instance; the other-port requests carry actual browser Fetch Metadata/cookies. The test bridge is a disposable Node HTTP server bound to 127.0.0.1, not a mounted Next route or product UI.

The full existing private campaign journey still passes using the new authority, with five source-linked Passport entries, identity/revision serialization, invalid actions and signed replay. No mission reducer/rubric changed. Overall candidate units: 266/266 in 22 files; lint/types, source validation, science Ask 30/30/rank 7/7, basic security scan and production build pass. A separate actual Next production-server smoke test confirms both campaign namespaces remain 404. Logs and hashes are in `evidence/campaign-security/`.

## Explicit limits and review decisions

- Live-head anti-rollback is in-memory for this local operator tool. After a process restart, a fresh operator grant plus a still-valid signed checkpoint can restore an older receipt because no durable local high-water journal exists. **Do not call loopback restart recovery durable anti-rollback.** This follows the review's stated local limit; approve this scope explicitly or require a persistent local journal before mounting.
- Recovery never rebinds an existing live head to a different grant, even if its checkpoint matches. After restart, the restored record is rebound and receives a new ownership-bound receipt. Preserve raw backups; old pre-remediation PreviewAuthority campaign receipts are incompatible. Frozen M2 checkpoints are unaffected.
- The process must actually bind loopback, not 0.0.0.0; headers narrow requests but do not prove TCP locality. No deployment marker may be present. This factory is unmounted and is not a public-server launcher.
- Origin-held proof is lost on reload; the operator must reauthorize. Expired/revoked cases remain owned by the old grant until controlled restart/checkpoint recovery. No silent transfer or reset is permitted.
- Same-origin XSS or compromise of the operator's host/secrets is outside this boundary. No claim of comprehensive security certification is made.
- Astra must review the exact code, the new proof/header contract, and the actual consumer tree before any integration. This acceptance does not approve PR #16, its unreviewed R4 commit or the separate B20 ranking candidate.
