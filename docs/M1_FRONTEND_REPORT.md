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

## M1 corrections after Astra's review (F1–F6)

Astra's verdict on `e59004c` was **changes required**. All six defect families are fixed on `feat/p1-ui`. No backend, contract, registry, dependency or config change was needed: as Astra noted, canonical caveats can be rendered from the trusted catalog without changing the API.

| ID | Before | After |
|---|---|---|
| F1 Passport trust (P1) | Saved `limitations` text was rendered under "Source limitations (canonical)", even after a passing lineage check | Canonical caveats, claims and citations come only from catalog data passed by the server. Saved conclusion, classification, notes and any limitation text that is not in the source record appear in a separate "Learner-authored · not verified, not NASA evidence" section. Caveats a save omits are still shown, with a note. Four states: Not yet validated, Validated (source lineage only; extra saved statements are counted), Scientific validation failed (400 only), Could not validate (transport, 429, 413 or contract failure, with Retry). Raw-save download is always available. |
| F2 Ask retry (P1) | Retry resent the question only, with `targetConditions: {}` | The submitted request is an immutable snapshot (question plus conditions). Retry resends exactly that object, so edits to the draft form never leak into it. Each response shows "You asked … · Target conditions …". Suggestions submit through the form, so they carry the visible conditions. |
| F3 stale responses (P1) | A delayed older answer replaced a newer abstention | `useLatestRequest()` aborts the previous request and ignores any response or error whose request is no longer the newest. Applied to Ask, Atlas, export, Workstation, Frontier, Compare and Passport validation. The active request is aborted on unmount. |
| F4 WebGL loss (P2) | After context loss the flame vanished and `data-renderer` stayed `webgl` | A `webglcontextlost` handler stops the loop and shows the SVG flame ("WebGL interrupted · static illustration shown"), and the controls keep working. On `webglcontextrestored`, resources are rebuilt with the current gravity and motion state. Listeners are removed on stop, so no loop is duplicated. |
| F5 reduced motion (P2) | Only the initial preference was read | Listens for `prefers-reduced-motion` changes: turning it on stops the flicker, turning it off resumes it. The animation also pauses while offscreen or in a hidden tab. Listeners are cleaned up on unmount. |
| F6 Frontier overflow (P2) | The populated matrix made the document 405 px wide at 390 and 320 px | The matrix sits in a positioned, labelled, keyboard-focusable scroll region with a sticky condition column, and long notes wrap. The dossier table uses the same region. No `overflow-x: hidden` was added to the page. |
| Extra | The relevance meter read only "1" | The meter's accessible name reads "Retrieval relevance N of 1, a word-and-condition match score, not evidence strength". |

**Real-HTTP regressions.** `tests/e2e/observatory-http.spec.ts` runs three serial groups. Each starts its own disposable production server (`tests/e2e/disposable-server.ts`, ports 3231–3233; it refuses busy ports), so every group gets a fresh, unmodified 30-POST window:

1. **Port 3231, 18 POSTs.** Ask supported, unsupported, repeated-B16, repeated-B999, repeated-B20 and cotton. The F2 abort-then-retry with exact payload equality, plus suggestions carrying the conditions. The F3 delayed real answer against a newer real abstention, plus a stale error. Workstation (gap, then direct), Frontier and compare refusal. F1 with both of Astra's fixtures, transport failure followed by a real retry, and corrupt-save recovery.
2. **Port 3232.** The real production limit: 30 accepted, then Ask shows the 429 "Request budget reached" state with no answer, and Passport shows "Could not validate" rather than "failed".
3. **Port 3233.** Populated Frontier, Workstation and Ask at 390 and 320 px, with no document overflow and keyboard scrolling of the matrix.

These run once, in the desktop project; mobile widths are set explicitly. F4 and F5 are covered in `observatory.spec.ts`, which loses and then restores the context, and toggles reduced motion off, on and off again.

**Results on the correction build:**
- `npm run check` passes: 103 unit tests, data validation, eval (Ask 30/30, rank 7/7), security scan and build.
- `npm run test:e2e`: 40 passed, 10 skipped. The skips are the 8 disposable-server tests in the mobile project and 2 project-specific M1 cases.
- Astra's own spec, unmodified except for its screenshot path, passes 8/8, including all six defect reproductions.
- `npm audit` reports 0 vulnerabilities.
- HawkScan: not tested (no `HAWK_API_KEY`).

**Still open:**
- **Registry copy reconciliation.** This needs shared Sol/Claude review. Astra proposed exact reasons; nothing was applied.
- **Retry timing.** Retry is not disabled until `Retry-After` elapses.
- **Validation size.** A large valid save could exceed the 32 KiB validation body; the UI shows "Could not validate" (413) without losing the save. The size-budget strategy is Sol's (M2).
- **Not run:** axe, a screen-reader pass, Safari, Firefox, real devices, INP, GPU profiling.
- **Bundle.** The catch-all route still bundles every island.
- **Focus after mobile navigation.** Focus lands on `body` after mobile-menu navigation; a focus handoff is not yet implemented.

## Final M1 Passport recovery fix (Astra final verification)

**Root cause.** `passport-preview.tsx` looked up untrusted saved IDs in plain-object dictionaries (`trusted.experiments[id]`). The shared `IdSchema` allows `constructor` and `prototype`, which a plain object resolves through `Object.prototype`. So an inherited function was treated as a catalog record, and reading its `.limitations` threw. The route error boundary then replaced the page ("Evidence could not be loaded") and removed raw-save recovery. The save itself was never changed, and the backend correctly returned 400.

**Fix (frontend only).**
- Trusted catalog data is indexed as `Map`s built from own properties (`Object.entries`). All Passport membership checks, canonical caveats, claims and the untrusted-text count use `.get` / `.has`.
- Unknown references are listed as "Unverified references not in the admitted catalog", and no source content is shown for them.
- A per-entry error boundary keeps the validation notice and the raw-save download usable even if an entry ever fails to render.
- The rejected state has a "Check again" control.
- `Object.hasOwn` guards were added to the Workstation claim lookup and to `kindLabels`.
- No API, schema, registry or backend change.

**Regression group** (`observatory-http.spec.ts`, disposable server on port 3234, real HTTP), 9 cases:
- **`constructor`, `prototype`, `bass2-b999`:** real 400 shows "Scientific validation failed"; the unknown ID is visible; no canonical caveats are borrowed; no crash or console error. For `constructor`, "Check again" is clicked twice, still with no crash.
- **`__proto__`, `toString`, `hasOwnProperty`:** these fail the shared `IdSchema`, so they are treated as malformed stored data, with the recovery state shown.
- **Mixed `bass2-b20` + `constructor`:** rejected; exactly the four B20 caveats come from the catalog; `constructor` stays unverified.
- **Valid B20:** still validates, with catalog caveats.
- **Other routes:** `/experiments/<name>` and `/<name>` for all five names render "Record or route not found" with no record content, and Atlas search returns its empty state.

In every Passport case, the downloaded raw save equals the stored string byte-for-byte, and storage is unchanged.

**Astra's specs on this build:**
- The original eight (unchanged apart from output path): 8/8.
- Astra's added probes: 7/8, including Astra's own `constructor` and `bass2-b19` regressions. The one failure is the initial-offscreen lens drawing, which Astra classified as an M1.5 performance item; it is intentionally untouched here.
- Astra's crash-confirmation script now fails at its first assertion, because the "Evidence could not be loaded" page no longer appears.

**Open, not M1 blockers:**
- Unknown routes return HTTP 200 (a soft 404) while rendering the not-found page. This is pre-existing streaming behaviour; no record is rendered.
- Initial-offscreen lens animation (M1.5).
- Registry reconciliation.
- Retry-After countdown.
- Mobile navigation focus.
- Per-route code splitting.
- The large-save validation size strategy (Sol).
- Not run: axe, screen readers, Safari, Firefox, real devices. HawkScan was not tested.
