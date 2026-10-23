# Astra R3: review-route authorization bypasses

Branch `feat/m2-claude-gameplay`, 2026-10-23. The source is Astra's `m2-remediation-rereview/INDEPENDENT_REVIEW.md`, findings R1 and R2.

| Item | Value |
|---|---|
| Starting SHA | `c8c492f` (clean) |
| `next` | 16.4.1, with lockfile and manifests unchanged |
| Sol backend | `6d1887b`, untouched |
| Cinematic lifecycle code | unchanged |

No push, merge or deploy. No Meshy spend.

## Root causes, both in `apps/web/lib/review-policy.ts`

- **R1:** the hosted-marker list omitted `VERCEL_ENV`. A server with `VERCEL_ENV=production` (or `preview`) but no `VERCEL` therefore counted as local.
- **R2:** the loopback check parsed the Host header as a URL: `new URL('http://' + host).hostname`. That reads `evil.example@localhost` as user-info plus the host `localhost`.

## Corrected policy

The policy lives in one module, used by both `proxy.ts` and `requireReviewRoute()` (the `/design` layout, its 7 pages, and `/m2-fixtures`). A request is allowed only when all of these hold:

1. **Explicit local authorization:** the route's own flag is exactly `'1'`.
2. **No hosting marker is defined,** whatever its value, even empty. The list (18):
   - Vercel: `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_REGION`, `VERCEL_DEPLOYMENT_ID`, `NOW_REGION`.
   - Netlify and Cloudflare: `NETLIFY`, `CF_PAGES`.
   - AWS: `AWS_LAMBDA_FUNCTION_NAME`, `AWS_EXECUTION_ENV`, `LAMBDA_TASK_ROOT`.
   - Google Cloud: `K_SERVICE`, `GAE_SERVICE`.
   - Others: `RENDER`, `FLY_APP_NAME`, `RAILWAY_ENVIRONMENT`, `DYNO`, `WEBSITE_SITE_NAME`.
   
   This is a superset of the backend guard's list. Any `VERCEL_ENV` value (production, preview, development, custom or empty) denies on its own.
3. **Strict raw authority, no URL parsing.** The Host must match `^(localhost|127\.0\.0\.1|\[::1\])(:[1-9][0-9]{0,4})?$`, with the port at most 65535. An `X-Forwarded-Host`, when present, must equal the Host exactly; Next's own default makes them equal.

Hosted denial comes before the Host check, and the Host check can only narrow access, never grant it. `NODE_ENV=production` alone still permits the supported local `next start` workflow.

## Tests

### Unit: `tests/unit/review-routes.test.ts`, 31 tests

- Cases A–M for both flags.
- Named regressions:
  - "Astra R1": `VERCEL_ENV` = production, preview, development or custom, with `VERCEL` asserted absent;
  - "Astra R2": `evil.example@localhost`.
- 45 hostile authorities:
  - user-info, suffixes, delimiters, percent-encoding and backslash;
  - whitespace, case variants and a trailing dot;
  - `127.1`, `127.0.0.2`, decimal and hex IPv4;
  - IPv6 variants and zone IDs;
  - ports 0, 03240, 65536, 99999, empty, `-1`, `+80` and `::80`;
  - comma lists.
- Forwarded-host disagreement.
- Missing or ambiguous Host.

### HTTP: `tests/m2-ui/review-routes.spec.ts`, 27 tests

Real HTTP against the production build: **8,724 requests**, across 24 server environments and all 8 review pages (`/design`, `/design/a`, `/design/a/lab`, `/design/a/b20`, `/design/b`, `/design/b/lab`, `/design/b/b20`, `/m2-fixtures`).

**Environments:**
- A: flags off.
- B: flags on, local.
- C: `VERCEL=1`.
- D: `VERCEL_ENV=production` alone (R1).
- E: `VERCEL_ENV=preview` alone (R1).
- F: `VERCEL_ENV=development`.
- G: a custom `VERCEL_ENV`.
- G0: `VERCEL_ENV` defined but empty.
- H: 16 single-marker configurations.

Each hosted configuration sets exactly one marker; the harness strips every other marker and asserts it is absent.

| Request | A | B | C, D, E, F, G, G0 and every H |
|---|---|---|---|
| 7 exact loopback forms (`127.0.0.1[:port]`, `localhost[:port]`, `[::1]:port`, RSC data request, `X-Forwarded-Host` equal to Host) | 404 | **200** | 404: a forged loopback Host is still denied (L) |
| 30 hostile or malformed Hosts, including Astra R2 as a document and as an RSC request | 404 | 404 | 404 |
| 5 forwarded-host disagreements | 404 | 404 | 404 |
| HTTP/1.0 with no Host (M) | 404 | 404 | 404 |
| 12 path variants (encoded, `.rsc`, `_rsc`, `//`, trailing slash, upper-case) | 404 / 308 / 500, never 200 | not run | 404 / 308 / 500, never 200 |

**Applied to every row:**
- **CSP:** present on every response.
- **No leaks:** denial bodies contain no design or fixture text, no review titles and no flag names.

**Genuine client navigation:** three tests load the authorized `/design` index, restart the same port as hosted (`VERCEL=1`, `VERCEL_ENV=production`, `VERCEL_ENV=preview`), then click a link. The router's real RSC fetch, sent with its router-state tree, receives a non-200, and the lab page never renders.

**Path variants:** the 308 is Next's trailing-slash redirect, which ends at the canonical route and is denied there. The 500 is Next 16.4.1's existing response to percent-encoded unreserved characters (for example `/%61tlas`, a public route, with or without `proxy.ts`). It exposes no content, is unrelated to this policy, and is out of scope here.

### Old against new

**Unit:** the 7 named Astra cases fail on the `c8c492f` policy and pass on the new one.

**HTTP**, with the `c8c492f` policy file restored and the app rebuilt:

| Run | Old policy | New policy |
|---|---|---|
| D · `127.0.0.1` · `/design` | **200** | 404 |
| E · `127.0.0.1` · `/design` | **200** | 404 |
| B · Astra R2 `evil.example@localhost` · `/design` | **200** | 404 |
| Client navigation under `VERCEL_ENV=production` | **200** RSC payload | non-200; page not rendered |

The fixed file was then restored (sha `d07e576…`) and rebuilt; all 27 HTTP tests pass.

## Regression (this tree)

| Check | Result |
|---|---|
| `npm ci` / `npm audit` | OK / **0 vulnerabilities**, next 16.4.1 |
| typecheck / unit | Pass / 134 |
| M2 Vitest | 30 |
| data / science / security | 55 quarantined, B20 only / Ask 30/30 / pass |
| Client bundle | No flag names or secrets |
| Clean build | Next.js 16.4.1, Proxy compiled |
| M2 browser | **121 passed, 47 skipped** |
| Cinematic lifecycle, `--repeat-each=3` | **18/18** |
| M1 regression | **90 passed, 22 skipped** |
| Lint | Only the 12 known errors in Sol's `docs/m2/fixtures/verify-contracts.ts`, unchanged on this branch |

## Residual concerns

- **Unrecognized hosts.** On a hosting platform not in the marker list, an operator who deliberately sets a review flag would be stopped only by the Host check, and headers are client-controlled. The flags are local-only by design and default off.
- **Encoded paths.** Percent-encoded unreserved characters answer 500 in Next itself, with no content exposed.
- **Browser coverage.** All browser evidence is Chromium.
- **Public preview: PUBLIC RELEASE BLOCKED.** `microfire-v2-preview.vercel.app` still serves Next 16.4.0, and it was deployed with `MICROFIRE_DESIGN_REVIEW=1`. These local fixes do not protect it. Containment (Vercel Authentication or withdrawal) and a separately reviewed patched deployment are owner actions; none was taken here.
