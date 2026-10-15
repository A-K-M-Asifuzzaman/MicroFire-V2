# M1.5 cinematic experience: report

Owner: Claude (frontend). Branch `feat/p1-ui`. Start: Astra-accepted `e8731c02489af1fc83741bc17eeb51f1fe155e45`. Nothing is merged, pushed or deployed. Meshy spending: **90 credits** across three owner-approved jobs (see the Meshy section). No backend, contract, registry or science-data change; the only `data/` addition is the new `data/asset-rights.json` that the existing media-rights check requires.

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

## Wow overhaul (owner request "ULTRA VISUAL OVERHAUL", priority: home, PIX, observatory, B20, motion)

Screenshots: `docs/qa/screenshots/m1.5/wow/` (1440, 390 and 320 px).

**Home showpiece.**
- **Full-screen 3D hero.** The glass header floats over the scene. The hero is the Gravity Lens flame inside the observatory, with a shorter lede and only one honesty label: the lens caption "educational illustration, not NASA footage or data".
- **PIX as a live gravity coach.** First visit: "Try the gravity controls →", a bouncing "↑ Drag me" tip and a pulsing slider thumb. After the first change PIX narrates the result ("Gravity on! … teardrop", "Back in orbit … quiet blue ball", "In between… teaching blend, not a measurement"). The tip sits below the slider so it never covers the caption.
- **Earth vs orbit duel.** Animated illustrations: a flickering, swaying teardrop with rising sparks; a breathing blue sphere with inward diffusion arrows. Both are labelled as teaching illustrations.
- **Other sections.** A "Meet PIX" section (3D PIX inside orbit rings, three promises), a trust strip (1 admitted / 1 source / 55 quarantined), and station cards with icons and an animated conic border.
- **Tiny phones.** At 380 px and below, the last lede sentence hides so the chamber rises into the first screen.

**3D observatory** (`observatory-scene.ts`, home only, lazy):
- **Lighting and post.**
  - Cinematic bloom (UnrealBloomPass); custom shaders write linear colour because OutputPass converts to sRGB.
  - Energy waves pulse across the floor from the chamber, tinted by gravity.
  - A light shaft falls into the chamber, and a scan sweep moves over the glass.
- **Chamber machinery.**
  - Three gyroscope rings counter-rotate around the chamber.
  - Embers react to gravity: they drift and hang at 0 g and rise at 1 g.
  - Ambient dust drifts through the room.
- **Stations.**
  - Meshy consoles replace the procedural boxes (procedural fallback kept).
  - Honest hologram screens float above each console, with live scanlines and blinking LEDs.
  - Hovering a station raises a hologram ring.
  - The Meshy PIX floats at its station.
- **Space backdrop.**
  - A vivid Earth: saturated oceans with sun glint, a sunset band at the terminator, night-side city lights, and a sun-lit atmosphere. On desktop it rises as a broad limb over the deck horizon.
  - A procedural gold-foil satellite with solar wings and blinking beacons orbits on a faint trail. It's decorative and not a specific spacecraft.
  - Two parallax star layers.
- **Camera.**
  - A dramatic dolly-in entrance; scrolling pulls the camera up and back.
  - Labels never cover the headline or the header.
- **Shake fix.** Hovering a 3D station label highlights the station but no longer pans the camera. Panning had moved the label away from the pointer and looped, which caused the reported shaking. Keyboard and directory focus still pan.

**PIX v2 (Meshy model, `pix-scene.ts` + `pix-stage.tsx`).**
- **Where.** On the home page and Ask PIX: the hero card and the live panel.
- **Loading.** The SVG PIX renders first and is the fallback for no-JS, no-WebGL and context loss. Three.js and the model load only once PIX is on screen.
- **Motion.** State-driven motion: idle float and sway; searching scan ring and fast look-around; cited happy hop with a teal rim light; abstained head tilt with amber light; error shudder with red light. PIX also turns towards the mouse.
- **Finish fixes from the strict review (no extra credits).**
  - Textures kept at 2048 px.
  - Hairline visor seam texels repainted navy.
  - Generated normal and roughness maps replaced with a uniform glossy finish.
  - Colour-map mipmaps off, because they bled the white UV gutter into the visor as "scratches".
  - The camera was reframed so the antenna and body aren't cropped.

**B20 exhibit.** The specimen is now a living exhibit:
- Layered flickering flame front.
- A char band that grows with the creeping front.
- Smoke drifting downstream.
- Multi-speed airflow streaks and glowing duct walls.
- A scanline sweep, and a sheen on the verified-oxygen card.

All values and labels are unchanged.

**Motion and cohesion everywhere.**
- The cream "paper" sheet is now a dark instrument deck with a cyan-to-flame top seam, so the site has one look.
- **Buttons and panels.** Primary buttons get a shine sweep and glow; panels and exhibits get hover lift.
- **Research heroes.** A slow aurora drifts behind each research-page hero.
- **Scroll reveals.** These use CSS scroll-driven animation. Unsupported browsers simply show the content.
- **Reduced motion.** It stops all of this motion.

**Themed cursor (`cursor-fx.tsx`).**
- **What it is.** A flame reticle (a real CSS cursor), a lagging ring that turns orange and swells over controls, and a 16-element ember trail (pooled spans with Web Animations, no canvas).
- **When it runs.** Only for fine pointers with motion allowed.
- **It never gets in the way.**
  - Text and form fields keep the text cursor.
  - The overlay is `pointer-events: none`.
  - It is `aria-hidden`.
  - A new e2e test proves selection, typing, keyboard navigation and clicks still work.
  - A second test confirms it is absent under reduced motion.

**Strict visual review: issues found and fixed.**
1. Station-hover shake.
2. Over-bright floor, caused by an sRGB double conversion.
3. Earth and satellite out of frame on desktop.
4. Station labels over the headline and nav.
5. Lens labels unreadable over the floor (now on glass).
6. PIX visor scratches and cropping.
7. Bare black hero before WebGL (now a CSS Earth-limb, deck and chamber-glow backdrop).
8. Coach tip covering the honesty caption.
9. 320 px first screen without 3D.
10. Duplicate "educational illustration" text breaking a strict test (the duel now says "teaching illustrations").

## Asset rights

- **Served models.** `apps/web/public/models/pix/*` and `apps/web/public/models/console/*`, with 10 files logged one by one in `data/asset-rights.json`. Each entry records source task IDs, licence (Meshy paid-plan output owned by the account holder; original designs, no logos or insignia), processing and reviewer. The security media-rights check passes across 338 files.
- **CSP unchanged.** The models are plain glTF with quantised geometry and external WebP textures, all same-origin. A meshopt GLB would have needed `'wasm-unsafe-eval'` and `blob:`, so it was rejected.
- **PIX concept art.** Drawn in-house (`components/pix-avatar.tsx`, rendered to `tools/meshy/concepts/pix-v2-concept.png`).

## Meshy

- **Setup.**
  - The key lives in the git-ignored, mode-600 repo-root `.env`, where the owner asked for it. The MCP launcher falls back to it after the Keychain.
  - The key is never printed, committed or sent to the browser.
  - `GET /v1/balance` verified **3,100**, so subscription credits are spendable through the API. There were 0 existing tasks of any type.
- **Spent: 90 of the approved 100 (balance 3,010).**

  | Job | Credits | Result |
  |---|---|---|
  | `pix-v1` | 30 | Rejected: off-brief, menacing humanoid |
  | `console-v1` | 30 | Used |
  | `pix-v2` | 30 | Image-to-3D from our concept art; the approved redo. Used |

  Each job ran once, with no retries and no purchases. Details are in `docs/meshy-credit-ledger.md` and `tools/meshy/ledger.jsonl`.
- **Tool.** `tools/meshy/meshy.mjs` gained image-to-3D jobs (data-URI input) with the same cap, balance and no-retry guards.
- **Remaining plan.** M1.5 headroom 710, M2 1,300, later missions 700, revisions 300. Every further batch needs explicit approval.

## Final measurements (this build)

- **Regression.**
  - `npm run check`: exit 0. That covers lint, types, 103 unit tests, Ask evaluation 30/30, rank 7/7, faithful 13/13, forbidden 0, the security and media-rights checks across 338 files, and the build.
  - Playwright: **73 passed, 21 skipped by design, 0 failed** (94 tests, both projects).
  - That includes axe on 13 routes (0 violations), no-WebGL and context loss, offscreen-pause fix A, focus fix C, Retry-After fix D, the soft-404 fix F, the cursor tests, and the lazy-load test.
  - `npm audit`: 0 vulnerabilities.
- **Layout.** No horizontal overflow at 320 px on home, B20, Ask, Atlas, Workstation, Frontier or Missions.
- **Performance.**
  - Setup: lab, 390×844, 4× CPU, 150 ms RTT, 1.6 Mbps. Previous commit `a5c4c8f` and this build were measured side by side, two runs each, averaged.

    | Route | FCP before | FCP after | JS at load (KB) | CLS |
    |---|---|---|---|---|
    | `/` | 884 | 1004 | 147.8 → 150.6 | 0 |
    | `/atlas` | 824 | 920 | 180.5 → 181.1 | 0 |
    | B20 | 868 | 940 | 180.1 → 180.7 | 0 |
    | `/ask` | 754 | 874 | 181.2 → 182.8 | 0 |
    | `/dashboard` | 748 | 866 | 181.3 → 181.9 | 0 |
    | `/gaps` | 746 | 902 | 180.2 → 180.8 | 0 |
    | `/methodology` | 792 | 836 | 142.6 → 143.4 | 0 |
    | `/missions` | 764 | 848 | 142.6 → 143.4 | 0 |

  - **Cost.** About +100 ms first paint (45–155 ms) from roughly 10 KB more render-blocking CSS and data per route. JavaScript at load is unchanged.
  - **Deferred downloads.** Home downloads its 3D engine and models after paint (about 475 KB transferred after 4 s). Ask lazy-loads the PIX model and three.js only once PIX is on screen (about 480 KB after 4 s).
  - **Frame rate.** 60 fps (p95 16.7 ms) for the full observatory on desktop and on mobile at 4× CPU, headless ANGLE. Not measured on real phones.

## Remaining visual weaknesses

- **First paint.** About +100 ms first paint on every route from the larger global CSS. Fix: split the home-only styles into a route stylesheet. This was deferred to avoid cascade-order risk right before review.
- **Software rendering.** On machines without GPU acceleration, the 3D hero takes several seconds to appear; the CSS backdrop and the SVG lens carry the first impression until then.
- **PIX model.** It is a single mesh, so motion is whole-body (no separate head or eye animation). The SVG PIX keeps the expressive eyes and mouth.
- **Research-page heroes** (Atlas, Workstation, Frontier, Missions) gained depth and motion but no new 3D. Missions stays locked and only moderately exciting.
- **Lens HUD.** In the microgravity view the lens HUD arcs still compete with the 3D chamber, and the "DIFFUSION → FLAME" label has low contrast over the pedestal.
- **Satellite.** Simple procedural geometry; a Meshy prop would add detail (future batch, needs approval).

## Handoffs for Sol

1. **Registry wording.** Reconcile the descriptions; no state promotion.
2. **Asset-rights file.** `data/asset-rights.json` now exists (Sol-owned `data/`); please review its schema and adopt it.
3. **Ownership.** Add an `OWNERSHIP.md` line for `tools/meshy/` and `apps/web/public/models/`.
4. **Still open.** Large-save validation, an e2e limiter option, and a nonce CSP. The CSP was deliberately left unchanged.

**Verdict: READY FOR ASTRA M1.5 REVIEW.** Stopping here; M2 has not been started.
