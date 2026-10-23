# Operation Ignition: the homepage opening film

Branch `feat/m2-claude-gameplay`, from `44b03c9`.

- Frontend only: no change to science, backend, gameplay contracts or Sol's worktree.
- No Meshy spend: balance 2,713, verified live 2026-10-22.
- To remove it:
  - delete `apps/web/components/ignition/` and `apps/web/public/ignition-gate.js`;
  - drop the `<Ignition />` line in `app/page.tsx`;
  - drop the four marked lines in `components/observatory-hero.tsx`.

## The story

The film is fictional and states so on screen and in its accessible description. It runs 7.6 s, plus a 0.6 s hand-off.

| Time (s) | Scene | What happens |
|---|---|---|
| 0.0–1.8 | Earth departure | Wide orbital shot with Earth, its atmosphere rim and the Moon in the direction of travel. An original tri-wing crew vehicle coasts toward the Moon. The camera tracks it from a three-quarter view and closes on a lit crew window. |
| 1.8–3.0 | Cabin | A single dissolve through the window glow. The astronaut floats in the cabin (microgravity), breathing (rigged idle clip) and watching a side station. Earth is in the window, with cyan light strips. PIX is docked and dim. |
| 3.0–4.2 | Fire anomaly | "FIRE ANOMALY DETECTED" appears on screen and on the displays. The light strips shift from cyan to amber in a pulse that travels down the cabin. The warning lights breathe below 1 Hz (no strobe). The astronaut turns toward the equipment bay, using the rigged look-around clip. The camera pushes in. A small, round, dim, blue flame grows at an access hatch inside the oxygen-containing cabin. Smoke spreads evenly in all directions, with no buoyant plume. |
| 4.2–5.8 | PIX activates | PIX wakes: its eyes glow and it rises, turns toward the anomaly and scans it with a cinematic beam. Captions: "Fire anomaly detected." / "Let's understand what happens in microgravity." |
| 5.8–7.6 | MicroFire awakening | PIX opens a hologram: a rotating illustrative chamber with a microgravity flame, a 1 g versus microgravity flame comparison, and the MicroFire wordmark. The camera flies into it. The title reveals "MICROFIRE / The Living Science Observatory / Explore the science of fire beyond Earth." The wordmark then flies to the header brand while the overlay fades to the live homepage. |

**Scientific integrity:**
- The fire happens only inside the cabin, where there is oxygen.
- The flame is the site's existing low-gravity teaching illustration, not a measurement.
- Nothing claims a real NASA incident, mission, trajectory, telemetry or protocol.
- The PIX scan is labelled cinematic, and the displays read "(FICTIONAL)".
- B20, 17.4 vol%, the 55 quarantined records, Ask PIX and mission locking are untouched.
- The film never starts a game session.

## Assets

| Asset | Source | Notes |
|---|---|---|
| Astronaut | **Reused** `models/astronaut-suit` (rigged; M4 retexture) | `Idle` and `Short_Breathe_and_Look_Around` clips, crossfaded. Body yaw drives the turn. No invented limb motion. |
| PIX | **Reused** `models/pix` (static mesh) | Hierarchical motion only: hover, pitch, yaw, scan, plus additive eye glows and a fill light. |
| Flame | **Reused** `components/proto/flame-volume.ts` | Raymarched illustration at near-zero gravity. |
| Spacecraft | **New, procedural** | Lathe crew module with a heat-shield rim and a docking nose; two lit windows; gold-foil adapter; radiator-striped service module; engine bell; RCS quads; tri-wing solar arrays; antenna; navigation lights. Canvas textures only. |
| Earth, Moon, stars | **New, procedural** | Shader continents, ocean glint, terminator, cloud deck, additive atmosphere; cratered Moon; point stars. |
| Cockpit | **New, procedural** | Curved panelled shell, extruded two-pane bulkhead, console, three canvas displays, light strips, illustrative equipment bay. |
| Hologram | **New, procedural** | Scanline/grid panel shader, wireframe chamber, comparison card, wordmark. |
| Sound | **New, synthesized in the browser** | Hush, two-note warning, PIX chime, hologram swell. Off by default; no files, no third-party audio. |

The only downloads are the two existing models, about 2.6 MB, fetched only when the film plays.

## Behaviour

- **Gate** (`public/ignition-gate.js`, synchronous, right after the dialog, before the page below it paints):
  - plays on the first homepage visit only;
  - never under reduced motion, without a hardware GPU (software rasterisers are detected there), when storage is unavailable, for a `#fragment` or scrolled restore, or with `?intro=0`;
  - `?intro=1` forces it.
- **Seen flag:** `localStorage['microfire.ignition.v1'] = 'seen'` is set when the film starts. It is never replayed on refresh or navigation, and deep links never mount it.
- **Skip:**
  - works from about 25–60 ms after navigation, before hydration or WebGL;
  - Escape and the Skip button both work;
  - "Enter observatory" appears from the hologram onward;
  - "Replay intro" sits in the hero's corner controls (hidden under reduced motion).
- **Ending:** a crossfade plus the wordmark flight to the header. There is no reload or spinner, and focus moves to `#main`. The film's renderer is disposed with `forceContextLoss()`.
- **Hand-off:**
  - the observatory's 3D waits while the film plays and starts at the hologram shot;
  - its own older opening flight is suppressed for that session;
  - during a replay it pauses.
- **Lifecycle:** each play is its own run (monotonic id, abort signal). Skip, Replay and unmount take ownership away at once, and stale async completions only release their own renderer. See `docs/M2_ASTRA_REMEDIATION.md`.
- **Loading:** a progress bar with a percentage (model files finished / expected) shows from first paint until the first frame.
- **Failure:** if no model file finishes for 15 s, a model fails, or WebGL is missing or fails, the overlay closes straight to the site. A failed load is not marked seen, so the next visit tries again (with the files already cached). (Until 2026-10-22 this was a hard 5 s limit. On a 1.6 Mbps phone connection that dropped every visitor to the site without the film, and marked it seen for good.)

## Performance

Measured with `tests/visual/ignition-perf.mjs`, single runs, Apple Metal:

| Run | Skip usable | First film frame | Overlay closed | Frame time (median / p95 / max) | WebGL after | Transferred |
|---|---|---|---|---|---|---|
| GPU desktop 1440 | 26–57 ms | 0.34–0.40 s | 8.55 s | 16.7 / 16.8 / 183–200 ms | 2 (= homepage baseline) | 3.4 MB total, 2.56 MB models |
| GPU phone 390 | 42–57 ms | 0.26–0.28 s | 8.48 s | 16.7 / 16.8 / 150 ms | 2 | 3.1 MB |
| Software graphics | no film (gate declines) | n/a | n/a | n/a | 2 | the homepage only |

**Frame hitch:** the one long frame (150–200 ms) is the shader compile at the exterior-to-cabin cut.

**Reduced motion:** the film never loads.

**Recordings:** local only, git-ignored: `docs/qa/screenshots/ignition/recordings/opening-film-{desktop,mobile}.webm`.

## Evidence

Everything is in `docs/qa/screenshots/ignition/`:
- `frames/{desktop,mobile,narrow}-t*.jpg`: frozen film frames at 11 story times (1440, 390, 320);
- `live-*.jpg`: real-time stills through the hand-off to the homepage;
- `reduced-motion-desktop.jpg`;
- `software-graphics-desktop.jpg`.

## Tests

`tests/m2-ui/ignition.spec.ts`: 20 pass, 8 skipped by design (desktop-only or phone-only cases). The cases:
- first-visit playthrough with every beat in order;
- no reload (same document, one load event), focus to main, and the real site working afterwards;
- Skip before the first frame;
- Skip during Earth, the emergency and PIX (by click, Escape and Enter);
- no replay on navigation or refresh, and Replay on request;
- deep links and fragments;
- reduced motion;
- no WebGL;
- asset failure;
- keyboard, accessible name and description, live captions, axe clean;
- sound off by default, with no AudioContext created;
- no retained WebGL context;
- phone layout.

The other suites now start with the film marked as seen (`tests/ignition-seen.json`) so they test the homepage itself.

## Meshy proposal (not run; needs separate owner approval)

| # | Asset | Why | Cost (published) | Cap |
|---|---|---|---|---|
| 1 | Hero spacecraft exterior, text-to-3D + PBR refine | The procedural ship reads well at mid range, but its close window shot is flat (panel texture on a smooth cone). A sculpted hull would carry the push-in. The silhouette, wings and windows must match the current design. | 20 + 10 = 30 | 35 |

Not proposed:
- **Cockpit:** the procedural one works, and a generated interior would fight the camera paths.
- **New astronaut or PIX:** the existing ones are approved and rigged or animated.

The balance is 2,713, verified live. Recommendation: approve #1 only if the window push-in matters for judging. Otherwise ship procedural.

## Remaining artistic limitations

- **Earth:** procedural continents read as abstract; there are no real coastlines.
- **Window shot:** the close crew-window shot is flat, as noted in the Meshy proposal.
- **Astronaut motion:** the astronaut's turn is a body yaw over the look-around clip. There is no bespoke reaction animation, and the hands don't interact with anything.
- **Final shot:** the hologram's grid and the in-scene wordmark overlap the HTML title for about 0.5 s.
- **No sun in frame:** there is no visible sun disc or lens effect in the exterior.
- **Hitch:** one shader-compile hitch at the cabin cut on first play.
