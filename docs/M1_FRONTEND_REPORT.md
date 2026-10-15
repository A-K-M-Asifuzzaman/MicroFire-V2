# M1 frontend report: Living Science Observatory

Owner: Claude (frontend). Branch `feat/p1-ui`, worktree `../MicroFire-V2-claude`, based on Astra-approved `f1afdcacde6dfc94317d8575d67f342e9bb2c03e` (`feat/astra-defect-fixes`). Not merged, pushed to main or deployed. No Meshy, AI provider or paid call. No dependency, lockfile, config, registry or backend change.

**Verdict: ready for independent review.** This is not public-release approval. Public release stays blocked.

## What M1 adds

| Area | Route | Backed by |
|---|---|---|
| App shell: design tokens, two surfaces, nav with active state, mobile menu, evidence sub-nav, loading/error/404 | all | `@microfire/shared` registry for status labels |
| Home + Gravity Lens: SVG first frame, WebGL shader loaded on demand, gravity toggle and slider, live explanation, link to B20 | `/` | Illustration only; the B20 link text uses catalog values |
| Experiment Atlas: search plus program/material/flow filters, empty/failure/retry states, coverage note | `/atlas` | `GET /api/experiments` (falls back to a server-rendered GET form without JS) |
| B20 dossier: observation, citation, lineage, conditions with known/unknown/derived status, 17.4 vol% correction, boundaries, corrections, provenance | `/experiments/bass2-b20` | Catalog + `verifyCitations` on the server |
| JSON export | dossier | `GET /api/export`, parsed with `ExportResponseSchema` before download |
| Ask PIX: typed answers grouped by category, citations, 200-abstention states by code, 400/429/network/contract-mismatch errors, long-question echo | `/ask` | `POST /api/ask` |
| Evidence Workstation (Evidence Loom): conditions → support → limits per result, relevance shown as retrieval only | `/dashboard` | `POST /api/evidence/rank` |
| Research Frontier: coverage matrix by gap status | `/gaps` | `POST /api/gaps` |
| Compare: honest one-record state and a live request that shows the service's refusal | `/compare` | `POST /api/evidence/compare` (404) |
| Evidence Passport preview: reads the local save, then validates the passport separately; shows invalid, valid and recovery states | `/passport` | `loadProgress`, `exportPassport`, `readRawSave`, `POST /api/passport/validate` |
| Sources & coverage, Methodology (stale copy replaced with Codex's reviewed wording), Roadmap, mission map, 5 mission briefs, Flame Lab, status pages | various | Registry, `sourceDetail`, `quarantineLedger` counts |

Mission pages stay "Coming Soon" with a disabled button. No mission is started and `transition()` is not called from the UI.

## Scientific boundaries kept

- **The Gravity Lens is an illustration.** Every state says "educational illustration, not a simulation, footage or measurement". Intermediate gravity is labelled interpolated. Its physics text is marked as not drawn from the record.
- **B20 values are shown as recorded.** It is the only admitted record. 17.4 vol% is calibrated, 16.5 is shown only as the legacy/uncalibrated correction, and pressure and gravity stay "Unknown" with their reasons. Raw flow "5, 3, pot 0.5" is kept.
- **Quarantined records are never results.** They are never shown as results and only appear as counts, refusals or abstentions.
- **Relevance is not proof.** Scores are labelled "retrieval relevance, not fire risk, safety or scientific confidence". Support comes only from `support.kind`/`claimId`.
- **Ask makes no AI claim.** It is described everywhere as deterministic with no AI model. An abstention is shown as a deliberate result, never as an answer. A response that fails schema parsing is not rendered.
- **Passport loading is not acceptance.** A loaded save is never treated as scientifically valid without the separate check. Canonical limitations and learner notes are shown apart.

## Verification (Node 24.19.0, production build)

| Command | Result |
|---|---|
| `npm run check` | PASS: lint, types, 103 unit tests, data validation, eval (Ask 30/30, rank 7/7), security, build |
| `npm run test:e2e` | PASS: 29 passed, 3 skipped by design (desktop- or mobile-only cases); includes the original 14 |

New spec `tests/e2e/observatory.spec.ts` covers:
- the research journey;
- desktop and mobile navigation;
- keyboard skip link and lens controls;
- reduced motion;
- no WebGL (forced via `getContext` returning null);
- Ask abstentions, the quarantined record, the 3,995-character repeated-reference abstention, 429 with Retry-After, contract mismatch and network failure;
- atlas empty, failure and retry;
- Workstation, Frontier and the compare refusal;
- Passport empty, structurally valid but scientifically invalid, valid and corrupt-save recovery;
- no sideways scrolling at 320 px.

**Request-budget note.** The API allows 30 POSTs per minute per process, and the existing specs already use 26. So three UI POSTs use real HTTP: Ask on desktop and mobile, and the invalid Passport validation. The other UI POSTs get their bodies from the same `@microfire/science` functions via `tests/e2e/science-oracle.ts`, and the UI still validates them with the shared schemas. The compare refusal and 429/abort cases are routed in-test. The HTTP behaviour of those endpoints is covered by `science-api.spec.ts`.

**Screenshots** are in `docs/qa/screenshots/m1/`, generated by the suite at 1440×900, iPhone 13 (390 px) and 320 px. The existing `home-*`/`dossier-*` captures were regenerated by `foundation.spec.ts`.

## Accessibility and performance (measured, not certified)

- **Measured.** Computed-contrast sweep of the visible text on 13 routes: no real failures. One parser false positive was checked by hand at about 14:1. Keyboard reach and focus rings are visible, and controls are at least 44 px. Radio and range inputs work with a screen reader by label and value text, and the lens explanation is a polite live region. The real-space fix for coverage counts came from a test failure. No sideways scrolling at 320, 390 or 1440 px. CLS is 0 on all measured routes.
- **Not measured.** axe and screen-reader passes were not run (axe is not installed; adding it changes the lockfile).
- **Throttled loads.** Emulated 4× CPU, 1.6 Mbps and 150 ms RTT, cold cache, Chromium: FCP/LCP was 0.60–0.72 s on `/`, `/atlas`, the dossier, `/ask`, `/dashboard` and `/missions`, with about 205 KB transferred. These are lab numbers, not field Web Vitals.
- **JS.** The framework is about 446 KB uncompressed (as in Phase Zero). M1 adds about 95 KB (zod, for client-side contract checks) and about 62 KB of app code. The catch-all route ships every island on every page; splitting into per-route files is a follow-up. The WebGL shader is split out and loads only on the home page, after first paint, and never under reduced motion with WebGL missing.
- INP and frame times were not profiled. Safari, Firefox and real devices were not tested.

## Codex / shared handoffs (proposals; nothing applied)

1. **Registry promotion after review.** `dashboard`, `ask` and `gaps` now have working UIs but stay `coming_soon` (pinned by `tests/unit/api.test.ts:80`). Their pages say "Interface built for review; not released". Proposed after review: move them to `preview` and update the reasons. The `home`, `atlas` and `experiment` reasons are now stale ("Gravity Lens… pending", "search UI pending", "export UI pending").
2. **E2E POST budget.** Request a test-only limiter override or per-client buckets so UI tests can use real HTTP throughout.
3. **Shared test edits for review.** One locator in `foundation.spec.ts` changed ('Inspect the scientific fixture' to 'Explore the Experiment Atlas'). New files: `observatory.spec.ts` and `science-oracle.ts`.
4. **Three.js / R3F not added.** The Gravity Lens needed no dependency. The dependency proposal waits for the M2 BASS-II bench, where 3D is actually needed.
5. **Nonce CSP.** The page still relies on `'unsafe-inline'`. M1 adds no inline scripts beyond what Next emits.

## Anatomy skill

Not used in M1. It will be evaluated for M2 BASS-II cutaway diagrams, alongside procedural geometry (the only sourced dimension is the 7.6 × 7.6 × 17 cm duct).
