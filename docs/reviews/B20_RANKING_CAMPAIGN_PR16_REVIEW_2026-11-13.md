# Release review: B20 paraphrase ranking, campaign API authentication, PR #16 (2026-11-13)

**Reviewer:** Claude (frontend owner). I am independent of Codex's science code and of the campaign design. I am **not** independent of `claude/b20-consumer-review` or PR #16, because I wrote both. Findings on those are marked as self-review and need a second reviewer (Astra).

Nothing was merged or deployed. The locked Nov 13 release (`17621b4`, `microfire-v2-cbfazx7ir`, video v2) is unchanged.

| Item | Decision |
|---|---|
| B20 paraphrase ranking `af2281e` | **CONDITIONAL PASS:** scientifically and technically sound. Integrate after Astra signs the exact commit |
| Campaign API authentication | **FAIL for mounting as proposed.** Do not mount until the design below is implemented and reviewed |
| PR #16 (BASS-II M2 Stage A) | **NOT RELEASABLE.** Contains unreviewed R4 security commit `41e5b72`; self-authored; needs Astra |

## 1. B20 paraphrase ranking: `af2281e507a816284d397b3dcfafa69b99f1025f` (handoff `c5e7f0e`)

### Primary-source verification (done independently)

- **Source file:** `20210011385.pdf` from the local raw archive. SHA-256 `5ffa911f…ec5f770`, which equals the `documentSha256` declared in `data/fixtures/b20-source-cells.json`.
- **PDF page 112** (printed 104), "TABLE A.1.—Concluded", B20 row, rendered and read visually:
  - as-run 50; sample "2-cm, 100-µm-thick PMMA"; air display "5, 3, pot 0.5";
  - **Calibrated initial / final O₂ vol% 17.4 / 17.4** (highlighted columns). Uncalibrated initial/final 16.5 / 16.5;
  - observation: "HCl 0.9 > 1.1; **flame burned entire sample**".
- **The six phrasings** all restate "the flame burned the entire sample" for B20, as questions or assertions. None adds amount, duration, cause, residue, consumption or environment.
  - Minor wording note: phrasing 6 ("The B20 log says…") calls the source a "log". The table column is "Test observations and anomalies". This matches the existing canonical claim wording ("observation log") and is acceptable.
  - Contrast: B6 on the same page says "complete burnout". The aliases correctly do **not** accept "completely consumed".

### Implementation review

- Closed allowlist of six normalized strings, with no similarity or model. It applies only when **all** of these hold:
  - B20 identity; one claim with the exact canonical text; a single exact citation to the hashed source and locator;
  - non-quarantined provenance; a unique program/test pair;
  - explicit PMMA and oxygen strictly `=== 17.4`, the calibrated cell from the fixture;
  - every other supplied target exactly equal to a *recorded* value (`exactConditions`).
- **Unchanged** vs `e45f35a`: the catalog, `integrity.json`, the B20 source-cell fixture, the quarantine data, `packages/shared` schemas and every API route. Request validation is untouched.
- **Quarantine code** only widens: the new review batch is included and ID matching is now case-insensitive. Still 55 legacy records and 1 admitted experiment. The library has 6 descriptions, with admitted runs only `bass-ii → bass2-b20`.

### My adversarial probes (`rankEvidence`, exact commit)

- **direct/observed:**
  - alias + PMMA + 17.4; lowercase `pmma`; plus exact geometry; plus `flowCmS: 5`;
  - fullwidth `？`, accepted by NFKC normalization, as intended.
- **unsupported/gap:**
  - no conditions; material only; O₂ 17.5 (inside the retrieval tolerance); O₂ 16.5 (uncalibrated);
  - plus lunar gravity, microgravity or pressure (both unknown for B20); plus flow 3; cotton;
  - two negations; "completely consumed"; causal airflow; invented "40 seconds"; Moon and Mars extrapolations; PMMA safety claim; B19 swap; zero-width character; trailing `!`.
- `/api/intelligence` summary statements are the canonical NASA sentence with its citation. No "yes" or user wording is promoted into the summary.

**Minor note, pre-existing:** supplying `flowCmS: 5` gives `direct` because the catalog records 5 cm/s as the first air entry. The response carries "First Air display entry only; later 3 and pot 0.5 retained" in `reasons` and the air-display caveat in `limitations`. This rule predates `af2281e` (same `exactConditions` logic in `e45f35a`), so it isn't a regression. When the new Workstation example is added, the UI must keep showing these limitations.

### Reproduced tests

| Run | Result |
|---|---|
| Exact commit, clean detached worktree `af2281e`, fresh `npm ci` | `npm run check` exit 0: **271/271** unit tests (19 files), lint, types, data and source integrity, security scan, build. Science: Ask 30/30, **rank 22/22**, faithful 13/13, forbidden 0, repeatable 30/30. HTTP (`direct-evidence-http`, `intelligence-http`): **2/2**, 0 skipped. `npm audit --audit-level=high`: exit 0 |
| Consumer branch `claude/b20-consumer-review` (global UI + `af2281e`) | check 271/271; M2-UI 123 passed / 47 skipped (= release baseline). e2e with the strengthened library test (`0fc4377`): **118 passed / 22 skipped** (= release baseline) |

### Library test change (self-review)

- **First fix (`91f114f`):** replaced the hard-coded `toHaveCount(4)` with the API's item count. That was a **weakening**: it no longer pinned which descriptions exist or that new ones are description-only.
- **Replaced by `108dc91`:**
  - pins the admission invariant (`bass-ii → [bass2-b20]` only; every other API item must have zero admitted runs);
  - requires the baseline IDs (bass-ii, flex, acme, saffire-iv-v);
  - checks each item's card for its exact admitted or "Description only" status, plus the header count.

  It passes against both the 4-item (release) and 6-item (consumer) APIs. Second-reviewer check requested.

### Conditions for integration

1. Astra security and regression sign-off on the exact hash `af2281e` and this test change.
2. Integrate the reviewed hash via `claude/global-research`, not a re-authored copy. Rerun check, e2e and M2-UI.
3. The new Workstation example (PMMA, 17.4) must ship with the negative-case e2e tests listed in `docs/integration/GLOBAL_B20_RANKING_INTEGRATION_PLAN.md`.
4. Deploy only with owner approval, as a new deployment. `cbfazx7ir` stays as the rollback point.

## 2. Campaign API authentication

**Current state:** `PreviewAuthority` in `apps/web/lib/game-preview-security.ts`:
- loopback-only origin;
- the operator token grants a random 32-byte value, stored hashed with 1 h expiry, bound to runtime, realm and origin, capped at 8;
- cookie `microfire_m2_grant; Path=/api/game/preview; HttpOnly; SameSite=Strict`;
- POST requires an exact Origin; requests marked `sec-fetch-site: cross-site` are rejected.

The proposed `/api/game/campaign/v1` never receives this cookie.

**Do not broaden the M2 cookie Path.** A cookie Path is not a security boundary: same-origin script can reach any path. Widening it would also let an M2 grant authorize campaign mutations. That is a privilege expansion of a frozen, reviewed credential, and would retroactively change M2's reviewed scope.

### Findings in the current model that matter for campaign

- **F1. Same-site is not same-origin on loopback.** Pages on `127.0.0.1:<other port>` are *same-site*. `SameSite=Strict` cookies are sent with their requests, and `localPreviewRequest` only rejects `sec-fetch-site: cross-site`. POSTs are still protected by the exact Origin check. GET reads (`/session/:id`, `/export/:id`) accept `Origin: null`. A `no-cors` GET from another local dev server carries the cookie. The response is opaque, so data is not readable, but the request reaches authorized code.
- **F2. Sessions are not bound to the grant.** `sessionId` is client-generated. Any valid grant can address any session UUID it knows. Low risk with one local operator, but required before any multi-user or hosted step.

### Recommended design: a separate `CampaignAuthority`

1. **Separate credential.**
   - New cookie: `microfire_campaign_grant=<32 random bytes, base64url>; Path=/api/game/campaign/v1; HttpOnly; SameSite=Strict; Max-Age=3600`, plus `Secure` (and the `__Secure-` prefix) on any HTTPS context.
   - Separate in-memory grant map, storing the SHA-256 digest only, with a grant `audience: 'campaign-v1'` checked on every request. An M2 grant value is never accepted here, and vice versa.
2. **Separate operator secret and keys.**
   - Operator secret: `MICROFIRE_CAMPAIGN_ACCESS_TOKEN`, rejected at startup if equal to the M2 token or any signing key.
   - Checkpoint MAC key: derived with HKDF from its own key using `info = "microfire/campaign-v1/checkpoint"`. Keeps the existing realm, origin, key-id and catalog binding.
3. **Request gate, run before authentication details.** Unchanged:
   - disabled or hosted returns 404;
   - exact Host;
   - no `Forwarded`;
   - `X-Forwarded-*` either absent or loopback.

   Stricter than M2:
   - **every** request needs `Sec-Fetch-Site: same-origin` when the header is present, and is rejected when `Sec-Fetch-Mode: no-cors` (fixes F1);
   - POST also needs the exact `Origin`, `Content-Type: application/json` and a custom header `X-MicroFire-Campaign: 1`.

   No `Access-Control-*` headers, ever.
4. **CSRF:** SameSite=Strict, the exact Origin, the JSON content type plus the custom header (forces a preflight that is never granted), and the same-origin fetch metadata. No token is needed for loopback; add a double-submit token if a hosted mode is ever designed.
5. **Session isolation (fixes F2).** `/start` records `ownerGrant = digest(grant)` on the head. Every read, action and export requires the presenting grant to own the session. Unknown and foreign sessions return the same 404, so existence isn't revealed. `/resume` with a valid signed checkpoint re-binds the session to the presenting grant, and only if no newer live head exists.
6. **Replay protection:**
   - **Grants:** random, hashed, 1 h expiry, revocable, invalid after restart (runtime-bound).
   - **Actions:** `campaignIdentity` over runtime, session, expectedRevision and action. An exact retry returns the stored result; a changed body at the same revision returns a 409.
   - **Checkpoints:** MAC-bound to realm, origin, key, catalog and session, with the issue-time window. Refuse a checkpoint whose revision is older than the live head, which prevents in-process rollback. Durable anti-rollback is out of scope and must be stated.
7. **Token handling:** the operator token is only in the `/authorize` POST body. It is never put in a URL, logs, localStorage or the client bundle, and the UI clears the field after submission. `/revoke` deletes the grant and sets `Max-Age=0`.
8. **Responses:** `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, the API-v1 envelope, and the byte budgets from Codex's `fe4f067` body reader, enforced before parsing. The M2 32 KiB envelope stays unchanged.
9. **Acceptance before mounting**, as real HTTP and browser tests on loopback:
   - cookie isolation both ways (M2 ↔ campaign);
   - a second local origin (different port) GETs and POSTs with no-cors and cors, all refused;
   - a foreign-grant session is refused;
   - grant expiry, revoke and restart;
   - a stale checkpoint can't overwrite a newer head;
   - the token appears in no logs or bundle;
   - hosted and disabled return 404.

   Then Astra's exact-commit review and the owner's decision. Missions stay in fixture mode, and the public gameplay routes stay 404, until then.

## 3. PR #16: `claude/m2-integration-20261112` @ `f03b156` (self-authored)

- **State:** draft, mergeable, CI "quality" passed on 2026-11-12, **no reviews**, 36 commits ahead of `main`.
- **Contains R4 `41e5b72`** ("require dedicated credentials at both review route gates"). R4 is security-sensitive and still unreviewed. The released `claude/release-global` deliberately carries its revert, so the live site doesn't run unreviewed R4.
- **Decision:** not releasable until Astra reviews the exact head, R4 included. Because I wrote it, I can't give an independent PASS. The gameplay it adds stays behind the review gate, and no public mission becomes playable from this PR.
