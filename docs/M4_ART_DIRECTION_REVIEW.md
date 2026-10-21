# M4 art direction: two working alternatives for owner selection

- **Date:** 2026-10-21. **Owner:** Claude (frontend).
- **Commits:** starts at `fc958fe`, on branch `feat/m2-claude-gameplay`.
- **Status:** awaiting owner selection. Nothing has been propagated site-wide.

## Review URLs (local, `MICROFIRE_DESIGN_REVIEW=1`; a 404 without the flag)

| | Home | Laboratory | B20 research |
|---|---|---|---|
| **A · Cinematic orbital observatory** | `/design/a` | `/design/a/lab` | `/design/a/b20` |
| **B · Living science adventure** | `/design/b` | `/design/b/lab` | `/design/b/b20` |

- The index is at `/design`. A small review bar (bottom-left) flips between A and B on the same screen.
- The current site at `/` is unchanged.

## Diagnosis of the current site (evidence: `docs/qa/screenshots/m4/baseline-fc958fe/`)

The current design repeats the common signs of generated UI:
- a tracked all-caps mono label above every block ("THE LIVING SCIENCE OBSERVATORY", "GRAVITY LENS · EDUCATIONAL ILLUSTRATION…");
- strings joined with middle dots;
- "→" appended to every action;
- near-black with a single orange accent, and one colour-accented word in the headline;
- neon-outlined rounded cards of identical weight.

Layout problems compound it:
- the flame is a flat overlay;
- PIX is small;
- the station cards all look alike, so nothing leads the eye.

## Design A · Titanium Instrument

- **Concept:** a night exhibit hall where light is information. Orange appears only where there is heat; teal only marks a live or chosen state. The interface is engraved, machined plates, never glowing outlines.
- **Type:** Big Shoulders (display), IBM Plex Sans and Plex Sans Condensed (interface), IBM Plex Mono only for measured values.
- **Home:**
  - a new Meshy hero chamber with a real raymarched 3D flame inside, illustrative, which the rotary gravity dial reshapes;
  - a Meshy arch colonnade, with the Training Bay gateway backlighting the chamber;
  - focusing a station lights its arch;
  - PIX, the Meshy model, hovers and turns to what matters;
  - one opening camera move.
- **Laboratory:** the bay fills the screen with a new overview composition and the re-textured astronaut, surrounded by an instrument deck (apparatus rack, data plate, camera switch, guided tour).
- **B20:** an instrument readout:
  - an opposed-flow channel you can step through the raw Air log with ("pot 0.5" is marked as not a speed);
  - basis shown by shape (recorded, derived, not recorded);
  - calibrated against uncalibrated oxygen;
  - the record's own limits.

## Design B · Field Journal

- **Concept:** bright and illustrated. Components are stickers: a 3px ink outline and a solid offset shadow.
- **Type:** Bricolage Grotesque (display) and Atkinson Hyperlegible Next (body, designed for low-vision readers).
- **Home:**
  - an original flat illustration (Earth, sparkle stars, a station module);
  - the same 3D flame glowing in the module's window;
  - a large expressive PIX drawn in SVG, with moods that match its words (wave, look, cite, shrug, point);
  - a Space or Earth gravity card;
  - a five-step journey trail.
- **Laboratory:** the bay in a porthole frame, PIX narrating in a comic panel, ten-pip guided tour progress, and the parts as numbered stickers with a field note.
- **B20:** a field card with a "Real NASA test" stamp, PIX holding the page reference, an illustrated duct, fact stickers, and dashed "?" stickers for what NASA did not record.

## Evidence (`docs/qa/screenshots/m4/`)

- **`prototypes/`:** the six screens at desktop 1440×900, mobile 390, narrow 320 and landscape 844×390.
- **`compare/`:** current site, then A, then B, side by side, per screen and viewport.
- **`recordings/`:** `design-a-walkthrough.webm` and `design-b-walkthrough.webm`, real interaction at 1280×800. These are local files, git-ignored for size.

## Performance (GPU Chromium, local production build)

| Page | First 3D ready | Downloaded (first 9 s) | WebGL contexts | Long tasks |
|---|---|---|---|---|
| Current home | 0.35–0.41 s | 3.0 MB desktop / 2.0 MB mobile | 2 | 74–163 ms |
| A home | 0.20–0.31 s | 4.1 MB | 1 | 57–60 ms |
| B home | under 0.1 s | 0.7 MB | 1 | 0 ms |

- All three pages run at 16.7 ms median frames (vsync-capped).
- A's extra weight is its three Meshy models; B is mostly SVG.

## Science and integrity

- All values come from the admitted catalog at render time:
  - B20 is the only admitted record, at 17.4 vol% calibrated oxygen;
  - the 55 records stay quarantined;
  - the unknowns (pressure, run acceleration) stay unknown;
  - "pot 0.5" is never drawn as a speed.
- Flames, halls, arches, the station illustration and the bay are labelled illustrative.
- The training bay shows the reference configuration from the frozen equipment specification. It records nothing.
- No backend, science or Sol-owned file changed.

## Recommendation

Combine them: A's 3D hero and laboratory, built on B's component language and type for the research tools.
- **From A:** A is the stronger spectacle and makes the apparatus and chamber feel premium.
- **From B:** B is the stronger interface. Its research components are easier to scan, warmer, accessible to children and still exact.
- **Concretely:** A's palette and type for the 3D scenes, and B's sticker components (re-coloured to A's palette, with Atkinson body text) for evidence pages, PIX dialogue and controls.
- **Owner's choice:** pick A, B or this combination before anything is propagated.

## Weaknesses

- A's landscape-phone layout lets the dial overlap the chamber top.
- B's mobile hero places the scene before the headline.
- Both labs still show the existing schematic apparatus. Its quality is the subject of the separate apparatus overhaul.
