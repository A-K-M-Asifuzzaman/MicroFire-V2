# MicroFire-V2: full review guide

This guide is the starting point for an independent review of the whole repository. It tells you what the project is, how it is built, the rules it must never break, how to verify it, what is deliberately unfinished, and where scrutiny is most useful.

| | |
|---|---|
| Repository | https://github.com/A-K-M-Asifuzzaman/MicroFire-V2 (public) |
| Branch to review | `main` (merge commit `784808a`; its tree is identical to `fe83403` on `feat/m2-claude-gameplay`) |
| Live preview | https://microfire-v2-preview.vercel.app (a Vercel preview of the same code; not a production release) |
| Status | Pre-release. Public release is blocked. Independent educational project, not endorsed by NASA. |

## 1. What MicroFire is

MicroFire, "The Living Science Observatory", is an educational website about how fire behaves in microgravity. It has two halves:

- **Research tools.** These are built on NASA evidence that has been checked at the source. Today exactly one experiment is admitted: test **B20** from the NASA BASS-II summary report. Every value links to its NASA page; anything the report does not record is marked unknown. Research questions are answered by **PIX**, a guide character driven by fixed templates. There is no AI model behind it. PIX answers only from cited catalog statements and says so when the evidence cannot support an answer.
- **A five-mission educational game.** No mission is playable yet. Mission 02 (the BASS-II training bay) has a 3D bay you can tour, plus a gameplay frontend. That frontend is wired to a server-authoritative backend contract, but it is not yet connected to a live backend.

The visual identity is **Design B, "Field Journal"**, which the whole team chose on 2026-11-07:
- an ultramarine illustrated sky;
- "sticker" components with a 3 px ink outline and a hard offset shadow;
- Bricolage Grotesque and Atkinson Hyperlegible Next type;
- PIX as an illustrated character.

## 2. Repository map

npm workspaces monorepo, Node 24 (`.nvmrc`), TypeScript strict.

| Path | What it is |
|---|---|
| `apps/web` | Next.js **16.4.1** App Router site (webpack build). React 19.3. |
| `apps/web/app` | Routes. Public: `/`, `/atlas`, `/experiments/[id]`, `/dashboard` (Workstation), `/ask`, `/gaps` (Frontier), `/compare`, `/passport`, `/missions`, `/missions/[id]`, `/missions/[id]/tour`, plus static pages through `[...path]` (`/sources`, `/methodology`, `/lab`, `/roadmap`, …). Review-only: `/design/*` and `/m2-fixtures` (see §5). API: `/api/[...path]`. |
| `apps/web/lib/api.ts` | Server-only API: `health`, `feature-status`, `sources`, `experiments`, `export` (GET); `ask`, `evidence/rank`, `evidence/compare`, `passport/validate` (POST). Strict Zod validation, rate limit, content-type and size checks. |
| `apps/web/lib/review-policy.ts`, `review-routes.ts`, `apps/web/proxy.ts` | Fail-closed gate for the review routes. |
| `apps/web/components` | Site UI: shell, `home-hero.tsx` and `home-sections.tsx` (Design B homepage), `gravity-lens.tsx` with `flame-gl.ts` (illustrative flame, raw WebGL with an SVG fallback), `pix-avatar.tsx` (PIX character), evidence UI, Atlas, Workstation, Frontier, Passport, `ignition/` (opening film). |
| `apps/web/game` | M2 gameplay frontend: `contract.ts` (the backend seam), `transport.ts`, `controller.ts`, `view-model.ts`, `ui/` (bay, 3D bench in three.js, schematic, diagnostics, repair, Passport, PIX narrator). |
| `packages/shared` | Zod schemas and TypeScript contracts: science, API, features registry, game, Evidence Passport. |
| `packages/science` | Read-only catalog, deterministic Ask PIX (`ask.ts`), evidence ranking and compare, quarantine rules. |
| `packages/game-core` | Deterministic game state and reducer, mission guards, save adapter. |
| `data` | `fixtures/catalog.json` (the admitted B20 record), `b20-source-cells.json` (transcribed source cells), `quarantine/` (55 legacy candidates, excluded), `integrity.json` (hashes), `asset-rights.json`, `evals/`. |
| `tests/unit` | Vitest: contracts, science, API, game, Astra review cases, review-route policy. |
| `tests/e2e` | Playwright site-wide suite (port 3217), including real-HTTP API tests. |
| `tests/m2-ui` | Playwright suite for the Design B homepage, opening film, gameplay UI, review routes and site journey (port 3240). |
| `docs` | Plans, contracts, milestone reports and review/remediation reports (index in §9). |

## 3. Rules the project must never break

Review every change against these:

1. **One admitted record.** B20 is the only experiment shown as evidence.
2. **Oxygen correction.** B20's calibrated oxygen is **17.4 vol%**, from NASA Table A.1 on PDF page 112. The legacy upstream value of 16.5% is wrong and must not reappear.
3. **Quarantine.** All **55** legacy candidate records stay quarantined. They are never searchable and never shown as evidence.
4. **No invented answers.** Ask PIX is deterministic: fixed templates over cited catalog statements, no LLM. An abstention is a correct result, never shown as an answer.
5. **Labelled illustrations.** Every illustration is labelled as one: the Gravity Lens flame, the comparison drawings, the 3D bay, the opening film (marked "fictional, not a real NASA incident"). Nothing claims to be NASA footage, data or a CAD reconstruction.
6. **Honest feature states.** Missions stay unavailable, and the feature registry states (`available`, `preview`, `coming_soon`, `locked`, `blocked`) must match reality.
7. **Server-authoritative gameplay.** The browser never decides an outcome. Evidence Passport entries need valid citation lineage, and saved learner prose stays untrusted.
8. **No secrets in the client.** There are no `NEXT_PUBLIC_*` secrets, and the page CSP (`script-src 'self' 'unsafe-inline'`, `font-src 'self'`, `connect-src 'self'`) stays intact.

`npm run validate:data` and `npm run eval:science` enforce rules 1–4 automatically.

## 4. Architecture notes worth reviewing

- **Rendering:**
  - Research pages are server-rendered and work without JavaScript or WebGL.
  - No regular page downloads three.js; a test asserts this.
  - three.js loads only in the training bay and in the opening film.
- **Gravity Lens:**
  - An SVG flame is shown first.
  - A raw-WebGL shader takes over after the first paint.
  - It pauses when offscreen, when the tab is hidden and under reduced motion.
  - It falls back to the SVG when WebGL is missing or the context is lost.
- **Opening film (`components/ignition/`):**
  - An 8-second fictional intro, on the first homepage visit only.
  - A synchronous gate script (`public/ignition-gate.js`) decides before first paint, and Skip works before hydration.
  - Each playback is a "Run" with a monotonic id and an AbortController, so stale async completions only release their own WebGL resources.
  - It never plays under reduced motion, on software graphics or for deep links.
  - See `docs/M2_OPERATION_IGNITION.md` and `docs/M2_ASTRA_REMEDIATION.md`.
- **M2 gameplay seam:**
  - `apps/web/game/contract.ts` currently exports `contractRuntime = null`. The live game is deliberately disconnected until the backend is approved and integrated.
  - The transport parses with `res.json()`, then the shared schema.
  - Unknown outcomes (timeouts, 5xx, non-JSON responses) are reconciled before any retry.
  - See `docs/M2_FRONTEND_INTEGRATION.md`.
- **Design system:**
  - `apps/web/app/globals.css` holds all Design B tokens and components.
  - `apps/web/game/ui/game.css` ends with a Design B layer for the bay.
  - Role colours: ultramarine for navigation and space, sun and coral for heat, mint for confirmed facts, ink for text and outlines. Colour is never the only signal.

## 5. Security model

- **Dependencies:**
  - **Next.js 16.4.1** fixes GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw and GHSA-p3m5-59mp-jv5r (`docs/M2_SECURITY_HOTFIX_NEXT_16_4_1.md`).
  - **zod 4.6.7** fixes GHSA-mrhx-c7xc-m3w5.
  - `npm audit --audit-level=high` passes.
- **Review routes (`/design/*`, `/m2-fixtures`)** are served only when all of these hold:
  - the route's flag is exactly `1`;
  - none of 18 hosting-platform environment variables is defined (any `VERCEL_ENV` alone denies);
  - the Host header exactly matches `localhost`, `127.0.0.1` or `[::1]` with an optional valid port, as plain text and not URL-parsed;
  - any `X-Forwarded-Host` equals the Host.
  
  Enforcement happens twice: in `proxy.ts`, before rendering, and again in every review layout and page.
  - **Tests:** 31 unit tests, plus a real-HTTP matrix of 8,724 requests (`tests/m2-ui/review-routes.spec.ts`).
  - **Reports:** `docs/M2_ASTRA_REMEDIATION.md` and `docs/M2_ASTRA_REMEDIATION_R3.md`.
- **API:**
  - Strict schema validation on every request and response.
  - JSON-only POSTs with a body cap.
  - A shared 30-POST-per-minute budget with `Retry-After`.
  - Quarantined IDs are rejected.
  - Security headers on every route; API responses carry `default-src 'none'`.
- **Secret scanning:** `npm run security` scans for secrets, environment leaks, XSS sinks (`dangerouslySetInnerHTML` is banned) and media rights.

## 6. How to run and verify

```sh
npm ci
npm audit --audit-level=high
npm run check            # lint, typecheck, unit tests, data validation, science eval, security, production build
npx vitest run --config vitest.m2-ui.config.ts
PLAYWRIGHT_BROWSERS_PATH=./.cache/ms-playwright npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=./.cache/ms-playwright npm run test:e2e
PLAYWRIGHT_BROWSERS_PATH=./.cache/ms-playwright npx playwright test -c playwright.m2-ui.config.ts
npm run dev              # http://127.0.0.1:3000
```

Results at `fe83403` (Chromium):

| Suite | Result |
|---|---|
| `npm audit --audit-level=high` | Pass. 0 high or critical; one moderate, dev-only advisory, see §7. |
| `npm run check` | Pass: 134 unit tests; data: 1 source, 1 experiment, 55 quarantined; science: Ask 30/30, forbidden 0. |
| M2 Vitest | 30 / 30 |
| `npm run test:e2e` | 88 passed, 22 skipped by design. Skips are tests that apply to only one of the desktop and mobile projects. |
| M2 UI Playwright | 123 passed, 47 skipped by design |
| GitHub Actions on `main` | Green |

## 7. Known gaps and deliberate limits

Please don't count these as defects. They are known, but challenge them if you disagree.

1. **The backend is not in this repository yet.** The M2 server (Sol's `codex/m2-stage-a-backend`, at `6d1887b`) lives in a separate local worktree and has not been pushed or merged. Live gameplay, writable saves and the M2 Passport flow therefore cannot be reviewed end to end here; the frontend half can.
2. **Missions are not playable**, by design and by registry state.
3. **Saves are read-only.** Writable browser saves need cross-browser locking acceptance first.
4. **Browser coverage is Chromium only**, desktop plus iPhone-size emulation. WebKit, Firefox and real devices are untested.
5. **Percent-encoded paths return 500.** Paths like `/%61tlas` get a 500 from Next.js 16.4.1 itself. No content is exposed, and it is unrelated to the app.
6. **One moderate dev-only advisory.** minimatch, inside the ESLint toolchain; the fix requires an ESLint major downgrade.
7. **Old Vercel preview deployments** from before the patches may still be reachable by their direct URLs. The live alias above points to the patched build.
8. **Open Dependabot PRs** (#12–#14 and older majors such as TypeScript 7) are not yet evaluated.
9. **The 3D training bay** is an illustrative schematic: duct proportions are sourced, other geometry is schematic. Its 3D assets are partly Meshy-generated, and their rights are recorded in `data/asset-rights.json`.

## 8. Where review is most useful

- **Scientific honesty:** does any page, label, alt text or PIX template imply more than the B20 record supports? Start with `packages/science/src/ask.ts`, `apps/web/components/evidence-ui.tsx`, `apps/web/app/experiments/[id]/page.tsx` and `apps/web/components/home-hero.tsx`.
- **Security:**
  - the review-route policy (`lib/review-policy.ts`, `proxy.ts`);
  - API validation (`lib/api.ts`);
  - Passport input handling (`components/passport-preview.tsx`, the `passport/validate` endpoint);
  - CSP (`apps/web/next.config.ts`).
- **The gameplay contract seam:** `apps/web/game/contract.ts`, `transport.ts` and `controller.ts`. Check unknown-outcome reconciliation, retry identity and stale-revision handling.
- **Lifecycle and performance:** the opening film's ownership model (`components/ignition/ignition.tsx`, `film.ts`) and WebGL cleanup in the lens and the bay.
- **Accessibility:**
  - keyboard paths;
  - focus after navigation;
  - reduced motion;
  - the phone layouts;
  - contrast in Design B, especially the role colours used as text (the sun and mint tokens have dedicated ink variants).
- **Test quality:** do the tests assert behaviour, or just DOM shape? The suites are in `tests/unit`, `tests/e2e` and `tests/m2-ui`.

## 9. Document index

- **Ground rules and plan:** `FINAL_MASTER_PROMPT.md`, `docs/00_REPO_RULES.md`, `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/09_GAME_FIVE_MISSIONS.md`, `docs/OWNERSHIP.md`.
- **Science and data:** `docs/DATA_PROVENANCE.md`, `docs/LEGACY_CALIBRATION_AUDIT.md`, `docs/PHASE_ONE_SCIENCE_REPORT.md`, `docs/API_CONTRACTS.md`.
- **Milestones, in order:**
  1. `docs/PHASE_ZERO_REPORT.md`
  2. `docs/M1_FRONTEND_REPORT.md`
  3. `docs/M15_REPORT.md`
  4. `docs/M2_FRONTEND_INTEGRATION.md`
  5. `docs/M2_UNIFIED_SITE.md`
  6. `docs/M3_CINEMATIC_HOMEPAGE.md` (superseded by Design B)
  7. `docs/M4_ART_DIRECTION_REVIEW.md`
  8. `docs/M2_APPARATUS_OVERHAUL.md`
  9. `docs/M2_HYBRID_DESIGN.md` (superseded by Design B)
  10. `docs/M2_OPERATION_IGNITION.md`
- **Security reviews and fixes:** `docs/M2_SECURITY_HOTFIX_NEXT_16_4_1.md`, `docs/M2_ASTRA_REMEDIATION.md`, `docs/M2_ASTRA_REMEDIATION_R3.md`, `SECURITY.md`.
- **Backend handoff (contract side):** `docs/CLAUDE_BACKEND_HANDOFF.md`, `docs/m2/` (frozen contract fixtures and verifiers).
- **Visual QA evidence:** `docs/qa/screenshots/`.
