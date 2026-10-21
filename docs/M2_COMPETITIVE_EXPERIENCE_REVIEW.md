# M2 competitive experience review: Exovisionaries2026 vs MicroFire-V2

- **Reviewed:** 2026-10-21, by Claude (frontend).
- **MicroFire:** branch `feat/m2-claude-gameplay`, starting from `cf062e9`.
- **Competitor:** `asifhasan973/exovisionaries2026`, `main` at **`ac6946266d`** ("ci: deploy main to Cloudflare Pages automatically", 2026-10-19). Re-checked on 2026-10-21; it is still the latest commit.
- **Live deployment:** https://exovisionaries2026.vercel.app (bundle `index-BKee4kfp.js`). The Cloudflare Pages host did not resolve. A Vercel bundle cannot be tied to a commit, so the live build may lag `ac6946266d`.

## Method, and what was not done

- **Code:** read-only shallow clone into an isolated scratch folder. No install, build, test run or script execution of competitor code.
- **Live site:** visited in headless Chromium (GPU, ANGLE Metal), desktop 1440 × 900 and iPhone 13 emulation. I clicked through the home page, judge demo, crew selection, launch chapter and Mission Archive, and recorded network responses.
- **Not copied:** no source, artwork, layout, characters, text, audio or models. Competitor screenshots stay outside this repository; this document only describes them.
- **Not verified:**
  - their 11 test files (not run);
  - offline/PWA behavior (not installed);
  - the Moon-landing, science and return chapters (not played through);
  - the 7-day Cache Storage policy;
  - landscape play on a real phone.

  README statements are treated as claims unless observed.

## What Exovisionaries actually is

"Zero To Beyond": a choice-driven Moon-mission story game (React 19, Vite, Three.js 0.186, zustand, framer-motion). The rocket and spacecraft content is authored. Its README says the flight is "an educational story sequence with a compressed, authored timeline, not a trajectory solver", and that hardware values are game estimates. It is not a combustion-science or evidence-provenance product.

## Independently verified features (live, 2026-10-21)

| Feature | Observed |
|---|---|
| Intro and loading | A black "NASA Space Apps Challenge 2026" title card fades before the home page |
| Home | Purple starfield, a rotating low-poly lander + rover diorama on a lunar disc (Three.js canvas), bold headline, large "Play now" CTA, Mission Archive card, Install App, Judge demo, a Build → Test → Launch strip and a "Saved" indicator |
| Judge demo | Drawer of assisted chapters (Battery challenge, Ice Explorer, Geology Explorer; Flight: Launch & journey, Moon landing, Deploy & drive) |
| Crew screen | Illustrated crew cards, commander portrait with a voiced line, 3D spacecraft diorama, drag/tap-to-seat, budget/mass counters, Hint, fixed-viewport layout |
| Launch | Near-full-viewport 3D pad (procedural rocket and tower) → countdown → ascent over a 3D Earth. HUD with authored altitude and speed. Pauses for a "Separate booster" player action. Guided/Challenge, 1×/1.5×/2×, Skip, Notes, Hint |
| Narration | Real MP3 voice lines fetched during launch (4 clips observed); 682 MP3s (20 MB) in the repository |
| Mission Archive | Drag/swipe timeline 1958–2030+ with photo milestones ("34 archive milestones loaded") |
| Portrait phone | Blocked: "Rotate to Landscape Mode … Game Paused" overlay with an Enter Landscape Fullscreen button |
| Weight | About 21 MB transferred in the first 15 s on the home page (131 images, 56 JS responses; content-length sum) |
| 3D assets | Source: all procedural Three.js (22 files); no glTF/GLB models and no post-processing |

## Category comparison

Verdicts only where verified.

| | Exovisionaries (verified) | MicroFire (verified) | Stronger, and why | What MicroFire needs |
|---|---|---|---|---|
| A. First impression | Title card, then a lively home with a 3D diorama and a strong CTA | Before this pass: a 3.4 s CSS light-line intro, in live mode only. Now a title card, then a render of MicroFire's own lab pushing in behind the episode title | Exovisionaries before; now **comparable**, with a different tone | A real-time 3D hero on the M2 entry (not just a still) |
| B. Cinematic atmosphere | Cohesive purple-space art direction; voiced characters | Dark lab with bloom, fog, shadows, panoramic window and an illustrative planet; four camera compositions | **Mixed**: theirs is more animated end to end; ours is more cinematic inside the 3D bench | Atmosphere outside the 3D view (panels, transitions) |
| C. Environment | Low-poly dioramas | Procedural lab with Meshy props, chamber gantry, astronaut and arm | **MicroFire**, in the lab scene itself | More visible architectural detail in gameplay views |
| D. 3D models | Procedural only, toy-like and consistent | Procedural apparatus (source-proportioned duct) plus optimised Meshy models | **MicroFire** for realism; Exovisionaries for stylistic consistency | Astronaut suit accents (still mostly white) |
| E. Characters | Illustrated commander and crew with recorded voices on key moments | PIX (3D/SVG) reacting to confirmed events; astronaut cues only on confirmed snapshots | **Exovisionaries**: recorded voices and characterful art | Optional narration (added: browser voice, opt-in); a recorded voice would need new audio rights |
| F. Scientific storytelling | Engaging, but values are authored and the flight is not a solver (by its own README) | NASA record B20 only, 17.4 vol% calibrated O₂, 55 records quarantined, citations, three-way Passport | **MicroFire** on provenance; Exovisionaries on narrative pacing | Make the evidence trail more visible during play |
| G. Gameplay depth | Choices, budgets, rehearsal, launch actions with retry (several chapters reachable via the judge demo) | Assembly, authored fault, diagnosis, repair, qualification and Passport. **Fixture-driven until Sol's backend is integrated** | **Not decidable yet**: MicroFire's loop is not end-to-end playable | Joint integration with Sol's Stage A |
| H. Responsive | Landscape required; portrait is blocked | Portrait and landscape playable; bottom-sheet placement; 320 px reflow tested | **MicroFire** on phones | — |
| I. Sound | Recorded narration plus effects | Before this pass: none. Now an opt-in synthesised lab ambience, cues on confirmed outcomes, and PIX read aloud | Exovisionaries (recorded and characterful) | Recorded narration, with rights |
| J. Loading | Title card plus preloader; about 21 MB in the first 15 s | 3D only on request; scenery after the first frame (GPU about 0.45 s first frame, about 0.7 s scenery, locally); software graphics get the apparatus-only bench; honest load steps | **MicroFire** on weight; not comparable on network (local vs CDN) | Measure over a real network |
| K. Functional integration | Deployed, playable chapters, saves locally ("Saved") | M1 research journey live; M2 frontend complete against fixtures; backend integration pending | **Exovisionaries** today | Sol integration, then save and resume |
| L. Evidence and provenance | Sources panel; values labelled as estimates | Admitted-record pipeline, citations, quarantine, illustration disclaimers in the 3D caption | **MicroFire** | Keep it visible in every new visual |

## Priority improvements implemented in this pass (non-paid)

1. **Cinematic arrival** (`station.tsx`, `game.css`):
   - a title card, then a still rendered from MicroFire's own 3D bench pushing in behind the episode title, about 4.7 s;
   - labelled "Illustrative training bay, rendered from the 3D bench";
   - runs in the browser's top layer (a modal `<dialog>`), so it covers the sticky header; Esc or Skip ends it;
   - absent under reduced motion;
   - the gallery replays it with `?intro=1`.
2. **Sound and narration** (`soundscape.ts`, `sound.tsx`):
   - opt-in "Lab sound": a synthesised ambience plus cues for confirm, refusal, authored fault, qualification and record reveal, driven only by confirmed events;
   - opt-in "Read PIX aloud" using the browser's speech voice;
   - no audio files, off by default, starts only from a click.
3. **Large viewport:** a "Full screen" camera control (native Fullscreen API; Esc leaves) gives the 3D bench the whole display.
4. **Honest loading:** step list (engine → materials and lights → first frame) plus the scenery model counter. No percentages.
5. **Earlier in this series:** hero compositions, panoramic window, cinematic lighting, inspection arm, captions moved off the view (`6bb2dd0`), and the Meshy chamber gantry (`cf062e9`).

## Evidence

- **Arrival:** `docs/qa/screenshots/m2/arrival-sequence-desktop.jpg`, `arrival-sequence-mobile.jpg`.
- **Feature captures:** `feature-fullscreen-desktop.jpg`, `feature-pix-sound-desktop.jpg`, `feature-load-steps-desktop.jpg`.
- **Lab views:** `lab-*.jpg`; chamber before/after in `chamber-pilot/`; pre-rebuild scene in `before-960fc1b/`.
- **Stage screenshots** (`*-desktop.jpg`, `*-mobile.jpg`) now show the sound controls under PIX.

## Functional tests (this pass)

- **M2 browser suite: 39 passed, 3 device skips.**
  - New tests: the arrival plays, is labelled, can be skipped, and is absent under reduced motion; sound and narration are off by default and toggle; full screen enters and exits.
  - Existing tests: accessibility (axe), 320 px reflow, no-WebGL fallback and reduced motion.
- **Unit tests:** M2 30/30 and repository 103/103.
- **Science and data:** science eval 30/30, data validation and security pass.
- **M1 research journey:** 90 passed, 0 failed, 22 skipped.
- **Lint:** typecheck and lint pass for `apps/web` and `tests/m2-ui`. The only repository-wide lint errors remain the 12 pre-existing ones in Sol's `docs/m2/fixtures/verify-contracts.ts`.

## Remaining competitive weaknesses

- **Not end-to-end playable:** M2 runs against fixtures until Sol's backend integration is approved. This is the largest gap, and it is not visual.
- **Voice:** no recorded, characterful voice. The browser speech voice is functional but plain.
- **Hero:** the M2 entry has no real-time 3D hero; the arrival uses a still.
- **Installability:** no PWA/offline install.
- **Archive:** no history-of-missions timeline equivalent. MicroFire's research catalogue is evidence-first, which is deliberate.
- **Astronaut:** the suit is still mostly white.

## Meshy: is more spending needed?

- **Live balance:** 2,783 credits (verified 2026-10-21).
- **Prices** (docs.meshy.ai/en/api/pricing): retexture 10 (2K), rigging 5, animation 3 per action, text-to-3D 30 with a 2K refine.

The visual gap to Exovisionaries is not about model count; they use no imported models at all. One paid change would be clearly visible: the astronaut's plain white suit.

**Proposed batch (awaiting owner approval; nothing spent):**

| Step | Credits |
|---|---|
| Retexture `astronaut-v1` with navy panels and orange/amber accents (same geometry) | 10 |
| Re-rig the retextured model | 5 |
| Re-apply the same four library actions (Idle, Wave, Look Around, Fist Pump) | 12 |
| **Total** | **27** |

Before the rig step, confirm that the rigging API accepts the retexture task as input. If it does not, stop after the retexture (10 credits) and report.

Not recommended now: wall modules or research consoles. The procedural paneling covers the walls, and a console competes with the apparatus in the gameplay views.
