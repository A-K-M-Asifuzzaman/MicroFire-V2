# M3 visual milestone: cinematic homepage and unified experience

- **Date:** 2026-10-21. **Owner:** Claude (frontend).
- **Branch:** `feat/m2-claude-gameplay`, from `b00eb55`.
- **Meshy:** 0 credits spent; the balance stays 2,783.
- **Status:** visual review checkpoint. Nothing is pushed, merged or deployed.

## What changed on the actual homepage (`/`)

The accepted M1/M1.5 hero is kept intact:
- the Gravity Lens (still labelled an illustration);
- the six station links;
- the 3D status captions and context-loss fallbacks.

The 3D observatory around it is rebuilt as a directed scene.

1. **Opening flight.** Once per browser session, the camera starts high above the deck, with Earth's limb and the window ring behind the floating illustrated flame. It sweeps and descends onto the chamber, and the six stations power on in sequence.
   - Letterbox bars carry the caption "Approaching the MicroFire Observatory · artistic illustration".
   - The page is readable and usable throughout.
   - A Skip button, or any click, key, wheel or touch, fast-forwards it to about 1 s.
   - It never plays under reduced motion.
2. **PIX as a character.** PIX is now a free-flying, rim-lit 3D companion with a hover glow.
   - It launches from its charging dock, lands beside the chamber and greets the visitor with a wave.
   - It flies to whichever station is focused or hovered.
   - It turns to the Training Bay door when the entrance is focused.
   - Its gestures carry the tone of each line: wave to greet, nod to coach or cite, hop to guide, head-shake for evidence gaps, spin for the bay.
   - On wide screens its lines appear in a speech bubble pinned above its 3D self and clamped to the hero. Elsewhere the same live region is a card.
   - Every line is fixed copy. Counts come from the catalog, for example "1 admitted, 55 still in quarantine".
3. **Training Bay entrance in 3D.** A bulkhead door stands off the deck, with a "TRAINING BAY · BASS-II · ILLUSTRATIVE TOUR" sign, sliding doors, an inner light, and a chevron path that leads to it from the chamber.
   - On desktop, the real Meshy chamber gantry from the bay stands behind the doors. It loads after the intro, on desktop only.
   - Hovering or focusing **Enter the training bay** turns the camera toward the door and opens it partway.
   - Activating it flies through the door into a light wash, then navigates to the tour.
   - With reduced motion, modifier keys or no 3D, it is a plain link.
4. **Sound.** Opt-in "Lab sound" (ambient bed) and "PIX voice" (browser speech reads PIX's lines). Both are off by default.
5. **Station-to-station transitions** (every route). After a client navigation, a light sweep crosses the page and a chip names the destination, for example "Arriving · Mission map".
   - It never blocks reading or input, and keyboard focus still lands on the new heading.
   - It doesn't run on first load or under reduced motion.

## Training Bay tour (`/missions/bass-assembly/tour`)

- **Guided tour.** PIX walks through all ten parts in mounting order while the camera inspects each one. Its narration is the frozen equipment copy, including NASA's hardware description. Any choice of the visitor's own ends it.
- **Layout.** A tighter header puts more of the 3D bay in the first viewport.
- The tour stays explicitly illustrative. It shows no fault, grants no qualification and records nothing.

## Evidence (`docs/qa/screenshots/m3/`)

- **`before-b00eb55/` and `after/`:** identical script (`tests/visual/capture.mjs`) and viewports: desktop 1440×900, mobile 390×844, narrow 320×640, landscape 844×390. Shots: 01 load · 02 after motion · 03 PIX interaction · 04 bay entrance · 05 bay work view · 06 research → lab navigation · 07 reduced motion · 08 no WebGL.
- **`sequence/`:** the opening at 0.4 / 1.6 / 3.0 / 4.4 / 5.8 / 8.2 s, the bay peek, PIX at the Frontier and B20 stations, and the enter shot. Desktop, mobile and landscape (`tests/visual/frames.mjs`).
- **`walkthrough-desktop.webm`:** a recording of the desktop capture run.

## Measured cost (`tests/visual/perf.mjs`, GPU Chromium, local production server, two runs each)

| | Desktop before | Desktop after | Mobile before | Mobile after |
|---|---|---|---|---|
| 3D active | 645 / 371 ms | 527 / 343 ms | 367 / 374 ms | 342 / 334 ms |
| Transferred in first 9 s | 2.06 MB | 3.02 MB | 2.03 MB | 2.03 MB |
| Live WebGL contexts | 2 | 2 | 2 | 2 |
| Long tasks in first 9 s | 213 / 126 ms | 171 / 73 ms | 123 / 78 ms | 75 / 71 ms |
| Frame interval, median / p95 | 16.7 / 16.8 ms | 16.7 / 16.8 ms | 16.7 / 16.7 ms | 16.7 / 16.7 ms |

- The extra 0.96 MB on desktop is the Meshy chamber gantry behind the bay door, fetched after the intro. Mobile skips it.
- There is still one major 3D scene at a time. The two contexts are the lens flame and the observatory, as before.
- Frame intervals are vsync-capped, so they don't measure headroom. Physical phones were not measured.

## Tests

- **New:** `tests/m2-ui/cinematic-home.spec.ts`, 7 tests on desktop and mobile:
  - the intro plays once per session, is labelled and can be skipped;
  - PIX's lines and moods per station;
  - the bay entrance (PIX goes to the door; Enter arrives at the tour);
  - reduced motion;
  - arrival transitions;
  - sound off by default;
  - the guided tour.
- **Suites:**
  - **M2 browser suite:** 64 passed, 4 device skips.
  - **M1 research suite:** 90 passed, 22 skipped, 0 failed.

    It caught one real overclaim in a new PIX line ("every flame"), which was rewritten as "the flame records in this catalog".
  - Unit tests 103/103 and M2 30/30; science 30/30; data and security checks pass.
- **Lint and typecheck:** clean for `apps/web` and `tests`. The only repo-wide lint errors are the 12 pre-existing ones in Sol's `docs/m2/fixtures/verify-contracts.ts`.

## Scientific integrity

No science, registry, Passport, Ask PIX or backend file changed.
- B20 is the only admitted record (17.4 vol% calibrated O₂), and the 55 legacy records stay quarantined.
- Mission pages still say "Coming Soon", and the real mission is still gated on Sol's backend.
- The flame, observatory, bay door and tour are all labelled illustrative.

## Astronaut re-texture (27 credits, still pending)

I evaluated it under the new art direction.
- The astronaut doesn't appear on the homepage at all.
- It is prominent in the tour's establishing shot and in the arrival still, where the satin-tinted white suit reads clean but generic.
- A navy-and-orange re-texture would add identity to those two moments only.

**Recommendation:** keep it pending. It is a modest, local improvement and not where the competitive impact is.

## Remaining shortcomings

- **The flame is the M1.5 HTML/WebGL lens overlaid on the 3D chamber.** It can't be seen from other angles, so the camera always settles on one framing.
- **Mobile isn't fully cinematic.** On phones the hero shows the 3D chamber and PIX, but the bay door is mostly off-frame, and the bay entrance is a button and card rather than a door shot.
- **Landscape phones** show only the headline in the first viewport; the 3D sits below it.
- **The tour's inside view is still the same scene,** apart from the guided tour and header. The bay's astronaut, arm and lighting weren't reworked in this milestone.
- **The voice is the browser's speech voice,** not a recorded performance.
- **Gameplay is pending:** the real mission still needs Sol's backend before it can be played end to end.

## Codex-dependent work (unchanged)

- Connect the contract runtime and preview API.
- Decide how the public mission entry opens.
- The rights confirmations flagged for Sol. The bay gantry model was already in the ledger and is now also shown on the homepage.
- `parsePreviewJson`, the fault-category labels, and the `verify-contracts.ts` lint errors.

## Preview

The unified site runs at **http://127.0.0.1:3250/** (production build of this branch, fixture gallery off). The intro plays once per browser session; open a new private window to see it again.
