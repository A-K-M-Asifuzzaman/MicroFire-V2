# Astra conditional-pass remediation: film lifecycle and hosted review routes

Branch `feat/m2-claude-gameplay`, 2026-10-23.

| Item | Value |
|---|---|
| Starting SHA | `382a8b6` (clean) |
| Security fix carried forward unchanged | `b124330` (`next@16.4.1`; manifests and lockfile untouched) |
| Sol backend | `6d1887b`, read-only, not merged |
| Source review | `INDEPENDENT_REVIEW.md` in `m2-security-integration-gate`, findings P2 (cinematic) and P2 (review routes) |

No push, merge or deploy. No Meshy spend.

## 1. Film renderer leak (Astra P2, cinematic)

### Root cause

The component had one shared `ended` ref, and `play()` reset it to `false`. Astra's sequence then leaked a renderer:

1. **Skip during a held load.** Run 1 had created its WebGL renderer and was waiting in `startFilm` for its models.
2. **Replay.** `play()` set `ended = false` for run 2.
3. **Old load released.** Run 1's `startFilm` resolved. Its stale check `if (ended.current)` read `false`, so run 1 assigned itself to `film.current`.
4. **Overwrite.** Run 2 then overwrote `film.current`. Run 1's API was never stopped. Its render loop kept a live WebGL context on a detached canvas, and its `onBeat`/`onEnd` callbacks could still drive run 2's UI.

A second race of the same kind: a Skip's 280 ms crossfade `finish` timer could close a replay started inside that window.

### Ownership model now (`components/ignition/ignition.tsx`)

- **Runs.** Every `play()` creates a new `Run { id (monotonic), abort: AbortController, api }`.
- **`live`.** Only `live.current` may change the UI, the dialog or the page phase. Every async completion checks `live.current === run`: the module import, `startFilm`, `onBeat`, `onEnd` and `onProgress`.
- **Stale completions** release their own film (`api.stop()`) and never adopt it.
- **Skip/close.** Takes ownership at once (`live = null`) and aborts the run's start.
  - The closing run moves to `fading`, the single crossfading run.
  - Its `finish` timer acts only if that run is still the one fading.
- **Replay.** Releases the previous playing and fading runs before the new run exists, so a replay is always a distinct lifecycle.
- **Unmount** (navigation, Strict Mode double mount):
  - aborts, stops and clears both runs;
  - resets the page phase in a deferred task, and only if no instance remounted. Strict Mode keeps the gate's decision; Back no longer leaves `data-ignition="play"`.
- **Sound.** A replay starts muted, so the button state matches the new film. The old run's `AudioContext` is closed by `stop()`.

`components/ignition/film.ts`:
- **Abort.** `startFilm` takes `signal`. An aborted start disposes its renderer and forces context loss immediately, instead of when the download settles.
- **Callbacks.** Progress callbacks stop after an abort.
- **Shared resources.** The film loads its models through its own loader (not the homepage's model cache), and the flame volume is per instance. Stopping the film never frees anything the observatory draws.
- **Known limit.** An aborted HTTP download still completes into the cache, because GLTFLoader has no per-request abort. This is marked `ponytail:` in the code.

### Adversarial tests (`tests/m2-ui/ignition.spec.ts`)

**Instrumentation.** An init script wraps:
- `getContext`: records every WebGL context, whether it was created inside the film, and whether it has been lost;
- `requestAnimationFrame`: counts active loops per frame, compared against a homepage that never played the film;
- `AudioContext` and `unhandledrejection`.

| Test | Asserts |
|---|---|
| Race, Astra reproduction ×3 per run | Hold `astronaut.gltf`, Skip, Replay, release, reach Earth, Skip, wait 8.5 s. Asserts: run 1's renderer is released on Skip; replay is run 2 with exactly 1 film context and 0 detached; clean beat log; after the wait, 0 film contexts, 0 open audio, 0 rejections, loops ≤ baseline; homepage link works. |
| Stale load, then full replay | The replay plays all 8 beats in order and ends itself; focus goes to main; 0 contexts. |
| Replay inside the Skip crossfade | The old 280 ms timer cannot close run 2; the faded run released its renderer. |
| Rapid Skip/Replay ×8 | During loading, first frame and mid-story: at most 1 live film context at any time; finally 0 contexts, 0 audio, 0 rejections, loops ≤ baseline; Replay still plays. |
| Navigation away while loading | Unmount releases the renderer; page phase `off`; no surprise replay on Forward. |
| Sound across Skip/Replay | Old audio closed; replay muted (`aria-pressed=false`, no new `AudioContext`). |

**Evidence:**
- **Red before:** run against the old film code (HEAD 382a8b6), the race test fails at "run 1 released on Skip": expected 0 live film contexts, received 1.
- **Green after:**
  - repeat run `--repeat-each=3` of all six lifecycle tests: 18/18;
  - Astra's unmodified `independent-probes.mjs`, three runs: all exit 0, with `afterOldFilmEnds` holding no film context and no page errors.

## 2. Hosted review routes (Astra P2, routes)

### Policy (`lib/review-policy.ts`, dependency-free)

`/design` and `/m2-fixtures` are served only when all three hold:
1. **Flag.** The route's flag is exactly `'1'`.
2. **Not hosted.** No hosted-platform marker is set: `VERCEL`, `NETLIFY`, `CF_PAGES`, `AWS_LAMBDA_FUNCTION_NAME`, `K_SERVICE`, `RENDER` or `FLY_APP_NAME`. These are the same markers as Sol's backend preview guard.
3. **Loopback.** Host, and `X-Forwarded-Host` when present, is `127.0.0.1`, `localhost` or `[::1]`.

The Host check only narrows access (it guards against DNS rebinding of a local server). It never grants access on its own. Everything else is denied by default.

### Enforcement, twice

- **`apps/web/proxy.ts`** (Next 16 proxy, Node runtime) answers a plain `404 Not found` before anything renders: no page code, metadata or fixture read.
  - A rewrite was rejected because it answers RSC requests with a 307.
  - The CSP and security headers from `next.config.ts` are still applied.
- **`lib/review-routes.ts` `requireReviewRoute()`** is called first in the `/design` layout, in every `/design` page (7), and in `/m2-fixtures`. Page-level calls matter because a client-router request can render a page without its layout.

**Local exception:** the private local test servers still serve the routes. That means the M2 suite's `next start` on `127.0.0.1:3240` with `MICROFIRE_M2_FIXTURE_GALLERY=1`, and `MICROFIRE_DESIGN_REVIEW=1` for local design review.

### HTTP matrix (`tests/m2-ui/review-routes.spec.ts`)

Each configuration runs as its own production `next start` server. Requests are raw `node:http`, so Host can be forged.

Routes tested: `/design`, `/design/a`, `/design/b/lab`, `/m2-fixtures`.

| Configuration | Loopback Host (`127.0.0.1`, `localhost`) | RSC data request | Host `evil.example` | Host `microfire-v2-preview.vercel.app` | `X-Forwarded-Host: evil.example` |
|---|---|---|---|---|---|
| Local, flags absent | 404 | 404 | 404 | 404 | 404 |
| Local, flags enabled | **200** | **200** | 404 | 404 | 404 |
| `VERCEL=1` preview, flags absent | 404 | 404 | 404 | 404 | 404 |
| `VERCEL=1` preview, flags enabled | 404 | 404 | 404 | 404 | 404 |
| `VERCEL_ENV=production`, flags enabled | 404 | 404 | 404 | 404 | 404 |
| `NETLIFY=true`, flags enabled | 404 | 404 | 404 | 404 | 404 |

**Other checks:**
- **CSP:** present on every answer.
- **Denial bodies** contain none of: "M2 fixture gallery", "Choose a direction", "Orbital observatory", `START_RESPONSE`, `MICROFIRE_`.
- **Alternate spellings in closed configurations:**
  - `.rsc` and query forms: 404;
  - `/design/?_rsc=1`: a 308 trailing-slash redirect, followed by 404;
  - `/%64esign` and `/design%2Fa`: 500, with no review content.

**The 500 predates this change.** It is Next 16.4.1's own "Attempted to handle request too many times" on percent-encoded unreserved characters. Verified: `/%61tlas` (a public route) returns 500 even with `proxy.ts` removed.

**Astra's probe:** run with `VERCEL=1` and both flags set, it now records `/design` 404 and `/m2-fixtures` 404, both with CSP.

**Earlier deployment note:** the earlier preview deployment ran with `-e MICROFIRE_DESIGN_REVIEW=1`. Built from this commit, that flag no longer opens `/design` on Vercel.

## Validation (this tree)

| Check | Result |
|---|---|
| `npm ci` / `npm audit` | OK / **0 vulnerabilities** (next 16.4.1) |
| `npm run typecheck` | Pass |
| `npm run lint` | 12 errors, all in `docs/m2/fixtures/verify-contracts.ts`. This is Sol's file, inherited from 11ec4ca and fixed on Sol's reviewed branch; I did not replace it here. Every other file passes with 0 warnings. |
| `npm test` | 111/111 (adds 8 policy tests) |
| `vitest.m2-ui.config.ts` | 30/30 |
| `validate:data` / `eval:science` | 55 quarantined, B20 only / Ask 30/30, forbidden 0 |
| `npm run security` | Pass; client bundle has no preview-secret, flag-name, Meshy or private-key strings |
| `npm run build` (clean) | Next.js 16.4.1 webpack, Proxy compiled, no warnings |
| M2 browser (`playwright.m2-ui.config.ts`) | **100 passed, 26 skipped**. Previously 88/14; adds 12 desktop tests and their 12 phone-project skips. |
| M1 regression (`playwright test --workers=1`) | **90 passed, 22 skipped** (unchanged) |

The M2 browser suite covers:
- WebGL and no-WebGL;
- lost WebGL context;
- reduced motion;
- axe accessibility scans;
- the phone dock;
- the opening film.

**Unchanged:** B20 sole admitted record, 17.4 vol%, 55 quarantined records, server-authoritative gameplay, Passport rules, fictional and illustrative disclosures. No backend, science, data or contract file changed.

## Residual concerns

1. **The public preview still serves 16.4.0** (Astra P1). Containment or redeploy is the owner's action and outside this task. A redeploy from this commit would also close `/design` there.
2. **Percent-encoded paths** like `/%61tlas` answer 500 in Next 16.4.1 itself. No content is exposed. This is an upstream robustness issue, not part of this fix.
3. **Browser engines:** all browser evidence is Chromium (desktop and iPhone-viewport emulation). Not checked: WebKit, Firefox or real devices.
