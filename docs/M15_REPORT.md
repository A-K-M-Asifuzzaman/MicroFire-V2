# M1.5 cinematic experience: report

Owner: Claude (frontend). Branch `feat/p1-ui`. Start: Astra-accepted `e8731c02489af1fc83741bc17eeb51f1fe155e45`. Nothing is merged, pushed or deployed. No paid call was made, and no Meshy credits were spent (see the Meshy section). No backend, contract, registry or data change.

## Architecture and dependencies

- **Route-level splitting (fix B).** The single catch-all route is replaced by dedicated routes (`/`, `/atlas`, `/experiments/[id]`, `/dashboard`, `/ask`, `/gaps`, `/compare`, `/passport`, `/missions`, `/missions/[id]`). A `[...path]` route covers the remaining registry pages.
  - Each route imports only its own client islands. Server-only pages ship no research-tool JavaScript.
  - Most pages are now static or SSG.
  - `three` is loaded only by `/`, with a dynamic import after first paint.
  - A browser test downloads every script on 6 research routes and asserts that none contains `WebGLRenderer`.
- **Real 404s (fix F).** `generateStaticParams` with `dynamicParams = false` makes unknown IDs (`constructor`, quarantined `bass2-b16`, `bass2-b999`) and stray paths return HTTP 404 with the not-found page. Real pages return 200, and the API's 404s are unchanged.
- **Root `loading.tsx` removed.** On static pages it wrapped content in a hidden Suspense block that needs JavaScript to reveal, which broke the accepted no-JS evidence guarantee (caught by the existing test). Loading feedback now lives where requests happen: PIX searching state, scan bars and `aria-busy`.
- **Dependencies (Claude-owned lockfile proposal).** Each pin was published at least three weeks ago. `npm audit` reports 0 vulnerabilities.

  | Package | Scope | Purpose |
  |---|---|---|
  | `three@0.186.1` | runtime, `@microfire/web` | the 3D observatory |
  | `@types/three@0.186.0` | dev | type definitions |
  | `@axe-core/playwright@4.13.0` | dev | automated accessibility checks (fix E) |

  React Three Fiber was not needed: one imperative scene module is smaller.

## Visual system

- **One observatory frame.** Near-black space, navy, combustion orange and icy teal.
- **Research pages.** Each opens with a cinematic page hero (subtle star field, instrument grid, signature visual), then a paper reading "sheet" that rises over it with depth.
- **Evidence-kind colours are tokens**, so the same labels stay legible on both surfaces.
- **Detailing and motion.** Instrument corner framing and mono labels. Staged entrance motion (`.reveal`), page fade, focus and hover states. Every animation is disabled under reduced motion.
- **Kept from M1.** Serif editorial headings and all M1 accessibility basics: skip link, 44 px targets, focus rings.

## The home page: an interactive observatory (`components/observatory-*.tsx|ts`)

- **What it is.** An original procedural three.js scene, labelled on the page as an artistic interpretation, not a NASA reconstruction:
  - an observation-deck window ring with struts and a cyan floor grid;
  - a star field and an illustrative Earth limb with an atmosphere shader;
  - a combustion observation chamber (fresnel glass, metal caps, rods, pedestal and light bands);
  - flame light that shifts colour and intensity with the gravity control;
  - six research stations.
- **The stations lead to real tools:**

  | Station | Opens |
  |---|---|
  | Atlas | `/atlas` |
  | B20 Dossier | `/experiments/bass2-b20` |
  | Workstation | `/dashboard` |
  | PIX | `/ask` |
  | Frontier | `/gaps` |
  | Missions | `/missions` |

  Station screens are procedurally drawn and show no fake readings. The Atlas screen draws 1 lit cell plus 55 hatched cells; the Frontier screen draws an empty classification grid. PIX appears in 3D at its console.
- **Interaction.**
  - The camera sweeps in on entrance and orbits the chamber, so the chamber stays aligned with the HTML flame stage.
  - Pointer parallax, and drag to look around.
  - Focusing or hovering a station link turns the camera toward it, lights its pad and highlights its projected marker.
  - The station directory is the keyboard and screen-reader path; on mobile it becomes a swipeable strip.
- **The flame.** It is the accepted M1 Gravity Lens (WebGL1 shader plus SVG fallback, Earth/microgravity/slider, explanation, labels), now placed inside the 3D chamber.
- **Resilience.**
  - Render on demand.
  - Paused when offscreen, in a hidden tab, or under reduced motion (a static frame is still rendered).
  - Device-pixel ratio capped at 1.75 on desktop and 1.5 on mobile.
  - WebGL context loss falls back to the CSS star field and the station list, and resumes on restore.
  - No WebGL means the same fallback.
  - All geometry, materials and textures are disposed on unmount.
- **Fix A.** The flame and the observatory both start paused and invisible, then sync to the real visibility and preference state once ready. An initially offscreen hero does not render continuously (verified by counting real WebGL draw calls).
- **Mobile.** Its own composition, not a crop: headline, lede and actions, then a centred chamber with a higher camera, then the station strip.

## Research pages

- **Atlas.**
  - A corpus strip: 56 cells, 1 admitted and 55 quarantined.
  - B20 shown as a full exhibit card (schematic, observed claim, recorded readouts with pressure "Unknown", source).
  - A disclosure explaining the excluded legacy candidates, with B16/B19 named as "checked, awaiting review".
- **B20 dossier.**
  - Specimen hero: an animated schematic of an opposed-flow film, with real readouts (17.4 vol% calibrated O₂, 5 cm/s initial airflow, pressure not recorded).
  - An interactive apparatus exhibit: a side-view duct drawn at the sourced 7.6 × 17 cm proportion.
    - Ten numbered parts use `game-core`'s hardware notes (Section 1.2, PDF p. 12).
    - Four run conditions come from the record (oxygen and airflow recorded; pressure and gravity unknown).
    - Each item carries a sourced/recorded/unknown badge and its citation.
    - Selecting a condition highlights its row in the conditions table.
    - The caption says only the duct proportion is sourced; part placement is illustrative.
  - "On this page" navigation. Every M1 dossier element is preserved.
- **Workstation.**
  - A hero chain: Question, Conditions, Evidence, Support, Limitations, Source.
  - A live chain rail on results that lights a stage only where the chain holds; "Support not established" and "None for this outcome" show as warnings.
  - The results column is wider: the legend moved under the form.
- **Frontier.** A map key (classifications, not data), a proportional coverage bar with counts, then the accepted matrix and notes.
- **Ask PIX.**
  - A PIX identity card in the hero (portrait plus three operating rules).
  - A console avatar whose interface states follow the deterministic API: idle, searching, cited, abstained, error. These are states, not abilities; "no AI model" stays on screen.
- **Sources, Methodology, Roadmap, Compare, Passport.** Moved onto the hero-and-sheet system. Methodology gains an "Illustrations" section stating that artwork is not footage, simulation or a dimensioned reconstruction.

## Deferred items from Astra's gate

| Item | Resolution | Evidence |
|---|---|---|
| A: initial-offscreen animation | Fixed | `observatory-m15.spec.ts` (draw counts offscreen, visible, hidden, visible); Astra's own probe now passes |
| B: route-level code | Fixed | Route split; "research pages never download the 3D engine" test |
| C: mobile navigation focus | Fixed | After client navigation, focus moves to the new page's `h1` (waiting for the new heading, not the old one); test from the mobile menu and from an observatory station |
| D: Retry-After | Fixed | Retry is disabled with a live countdown until the delay passes, then resends the identical request snapshot |
| E: accessibility | axe added | 0 violations (WCAG 2.0/2.1/2.2 A/AA tags) on 13 routes in desktop and mobile projects, including populated Ask and Workstation states. Screen readers and real devices not tested |
| F: soft 404 | Fixed | Real 404 status on missing records and routes; test included |
| G: Passport recovery | Preserved | All Passport and unknown-ID tests pass; Astra's gate spec passes 4/4 |

## Verification on this build

- **`npm run check`.** Passes: lint, types, 103 unit tests, data validation (1 source, 1 experiment, 55 quarantined), evaluation (Ask 30/30, rank 7/7), security (including media rights), build.
- **`npm run test:e2e`.** 70 passed, 20 skipped by design: 17 disposable-server cases mirrored in the mobile project, 2 single-width M1 cases, and 1 mobile-only menu test on desktop. `observatory-m15.spec.ts` has 12 tests.
- **Astra's independent specs, unchanged except for output paths.**

  | Spec | Result |
  |---|---|
  | original | 8/8 |
  | supplementary | 8/8, including the previously failing offscreen probe |
  | final gate | 4/4 |

- **`npm audit`.** 0 vulnerabilities. HawkScan was not tested (no key).

## Performance (lab measurements, not field data)

Setup: 390×844, 4× CPU, 150 ms RTT, 1.6 Mbps, cold cache, headless Chromium. "At load" is the JavaScript transferred by the load event. "+ settle" adds 4 s, which includes Next link prefetching and the deferred 3D engine.

| Route | M1: FCP / JS after settle | M1.5: FCP | M1.5: JS at load | M1.5: JS + settle |
|---|---|---|---|---|
| `/` | 708 ms / 192 KB | 808–872 ms | **148 KB** | 335 KB (three.js loaded after paint) |
| `/atlas` | 616 / 189 | 716 | 180 | 186 |
| `/experiments/bass2-b20` | 620 / 189 | 744 | 180 | 186 |
| `/ask` | 604 / 189 | 680 | 181 | 196 |
| `/dashboard` | 596 / 189 | 684 | 181 | 196 |
| `/methodology` | 596 / 189 | 692 | **143** | 196 (prefetch) |
| `/missions` | 676 / 189 | 684 | **143** | 148 |

- **Layout shift.** CLS is 0 on all routes.
- **First paint.** FCP is roughly 60–160 ms later than M1 (heavier CSS and hero composition), still far inside the 2.5 s target.
- **3D frame rate.** The active scene measured 60 fps (p95 frame 16.7 ms) at 1440 px, and 60 fps (p95 16.8 ms) at 390 px with 4× CPU. This is headless ANGLE, not a real-GPU or device benchmark.
- **Not measured.** INP and real mobile GPU cost.

## Screenshots

- **Before (M1, `e8731c0`) and after.** `docs/qa/screenshots/m1.5/before/` and `docs/qa/screenshots/m1.5/after/`, from the same script. Each is captured at 1440, 390 and 320 px for: home viewport and full page, Atlas, dossier, Ask answer and abstention, populated Workstation and Frontier, mobile navigation, loading, error, and not-found.
- **Test-captured views.** `after/test-*.png`.

## Asset rights

- **Procedural only.** Every visual is generated in code or is an original SVG (the icon, PIX, exhibits). No third-party or generated media file is served from `apps/web/public`.
- **Policy.** The security check's media-rights rule applies to `apps/web/public`. It passes with no entries because no media was added there.
- **Not reused.** Legacy GLBs in MicroFire-Atlas (Poly Haven camera, CC0; NASA camera and glove) were not used: they are not needed for this scene, and that repository is read-only reference material.

## Meshy (spending status: none)

- **MCP installed (owner request).** The official `@meshy-ai/meshy-mcp-server@0.6.4` (meshy-dev, MIT) is registered at Claude Code **user** scope through `~/.claude/mcp/meshy-mcp.sh`. That launcher reads the key from the macOS Keychain (service `meshy-api-key`) at start-up, so no config file, repo or chat holds it. 0.6.4 is pinned for its double-billing protection (create requests are never resent). Status: it waits for the owner to add the Keychain entry and then restart or reconnect the session. `tools/meshy/meshy.mjs` reads the same Keychain entry.

- **Credits spent: 0. Jobs: 0.**
- **Why.** `MESHY_API_KEY` is not configured in this environment, so the authenticated balance is unverified. Meshy's pricing page states that API usage draws on a prepaid API balance, so the 3,100 credits shown on the website may not be spendable through the API. Only `GET /openapi/v1/balance` with the owner's key can settle that.
- **Preparation done, with no spending.**
  - A local-only tool, `tools/meshy/meshy.mjs`, keeps the key out of the website and is never imported by it. It reads the key from the environment only and never prints it. It offers `balance`, `tasks` (free reuse inspection) and `run <job> --approved-cap N`. `run` refuses without an approved cap, when the estimate exceeds the cap, or when the balance is too low. It makes no retries or purchases, and logs balance before and after to `ledger.jsonl`.
  - Downloads go to the git-ignored `tools/meshy/incoming/`.
- **Pilot jobs (`tools/meshy/jobs.json`).**

  | Job | Pipeline | Estimate | Use |
  |---|---|---|---|
  | `pix-v1` | text-to-3D preview (meshy-7.1) + PBR refine, 2K textures, about 20k triangles | 30 credits | Original PIX character |
  | `console-v1` | same pipeline, about 12k triangles, blank screens | 30 credits | Research-station console prop, instanced |

  The pilot total is 60, against a requested cap of 100. Any regeneration needs new approval.
- **After the pilot.** QA (geometry, silhouette, textures, scale and pivot), meshopt/KTX2 optimisation, a rights entry, then integration in the observatory (PIX and consoles) and on Ask PIX, keeping the procedural geometry as the fallback.

## Remaining visual weaknesses

- **Home.** The floating halo ring was removed, the Earth limb toned down, and markers are clamped on screen. The 'DIFFUSION → FLAME' HUD label has low contrast over the pedestal.
- **Stations.** The procedural consoles are deliberately simple; this is the clearest place where approved Meshy props would add quality.
- **Long pages.** The dossier is long on phones (by design, every caveat stays visible); section navigation exists only on desktop.
- **Missions and Flame Lab.** Unchanged in composition apart from the new frame (they are not playable).

## Handoffs for Sol

1. **Registry wording.** Reconcile the descriptions (Astra's proposed copy still applies; the home reason is now stale too). No state promotion.
2. **Asset-rights file.** `data/asset-rights.json` (Sol-owned `data/`) needs a schema and owner for future Meshy GLBs before any is served.
3. **Ownership note.** `tools/meshy/` is a new frontend asset-tooling directory, flagged for a line in `OWNERSHIP.md` (shared review).
4. **Earlier items still open.** The large-save validation strategy, an e2e limiter option, and a nonce CSP.

**Verdict: M1.5 (non-paid scope) READY FOR ASTRA REVIEW.** Meshy generation is blocked on the owner: rotate the exposed key, configure it privately, run `balance`, then approve the pilot cap.
