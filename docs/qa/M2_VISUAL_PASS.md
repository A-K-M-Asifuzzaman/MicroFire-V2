# M2 3D bench: cinematic visual pass

Branch `feat/m2-claude-gameplay`. This pass starts from `96b317d` (quality-pass checkpoint). The previous Meshy scene is `960fc1b`.

This is fixture-driven presentation evidence. The mission is not yet integrated with Sol's backend.

## What changed

**Composition.** There are four camera compositions, plus learner-selectable buttons below the view (Bay, Work view, Inspect, Wide).

- **A. Establishing.** A high three-quarter crane shot of the bay. It holds about 1.5 s once the scenery has loaded, then glides down.
- **B. Work view.** A low, close hero framing, about 3.7 m-equivalent units from the duct. The apparatus and its mounts fill roughly half the frame, with the observation window behind.
- **C. Inspect.** A closer view on the part the confirmed state flags (the authored fault or a finding).
- **D. Wide.** Offered only once the server has confirmed qualification.

Stage changes choose the composition. Within a stage, the learner's own choice stands. Narrow screens pull back per view rather than shrinking everything. A slow idle drift starts after 6 s without input; it never runs under reduced motion.

**Environment.** The plain Meshy wall is retired. The new procedural room has:
- a graphite hero workstation with a brushed trim and a cyan under-glow;
- a near-black instrument plate with a cyan work-zone outline;
- a panoramic observation window, which is a genuine opening in an extruded wall, with a bevelled frame and two mullions;
- dark navy paneling with pilasters, restrained light lines and status lights;
- two abstract wall displays labelled "TRAINING BAY · ILLUSTRATIVE", with no numbers;
- ceiling light panels, a glossy plated floor and exponential fog for depth.

The Meshy workstation is now a side console; the cabinet and cart are dressing.

**Earth view.** An illustrative painted planet (not imagery). Its limb and atmosphere arc across the lower window beneath a starfield. It is unlit and unfogged, and sits beyond the window plane. The 3D caption says the bay, astronaut, inspection arm and Earth view are illustrative.

**Lighting.**
- **Key:** a warm spot with real PCF soft shadows, cast by the apparatus onto a shadow catcher on the instrument plate.
- **Fill:** a cool overhead fill.
- **Backlight:** a teal back light.
- **Igniter accent:** an amber light at the igniter that breathes gently only while it is fitted (no combustion is simulated).
- **Earthlight:** blue light from the window that also rims the astronaut.
- **Bloom:** threshold 2 in linear HDR. Only deliberately over-range light sources glow; apparatus surfaces never do.

Existing lights are re-purposed rather than added, because each light costs every lit shader.

**Astronaut.**
- **Placement:** stands before the window, full-figure in the establishing shot and rim-lit against the planet.
- **Suit:** a cool satin finish instead of flat white.
- **Head motion:** gentle procedural head turns, plus a nod.
- **Cues:** derived only from confirmed before/after snapshots (`astronautCue`, unit-tested):
  - look on the authored fault;
  - nod on a recorded diagnosis;
  - wave on a recorded repair;
  - cheer when the qualified revision becomes current.

  A wrong diagnosis or a refusal gets nothing.

**Motion and feedback.**
- **Inspection arm:** procedural, jointed, two-bone IK. It points its lamp at the flagged part or the chosen mount, and scans slowly otherwise.
- **Install feedback:** a confirmed install flashes its mount ring once.
- **Callouts:** pinned in 3D for flagged parts (amber), the selected part (cyan), or the duct. They are `aria-hidden` and use the frozen equipment labels.
- **Ambient:** display traces scroll, status lights pulse, and the cloud layer drifts.
- **Reduced motion:** all of this stops; the astronaut holds a natural idle frame.

**HUD.** Captions and controls moved out of the 3D view into a bar below it:
- camera buttons (44 px targets);
- a collapsible "How to use the 3D bench";
- the provenance caption at a readable size.

On mobile the bar stacks.

## Screenshots (`docs/qa/screenshots/m2/`)

All were captured on GPU (Apple M3 Pro, ANGLE Metal, Chromium) except where noted.

| State | After | Before (`before-960fc1b/`) |
|---|---|---|
| Establishing (A) | `lab-establishing-desktop.jpg` | `lab-bay-wide-desktop.jpg` |
| Assembly work (B) | `lab-assembly-work-desktop.jpg` | `lab-bay-work-desktop.jpg` |
| Fault inspection (C) | `lab-fault-inspect-desktop.jpg` | `bench-3d-fault-desktop.jpg` |
| Diagnosis | `lab-diagnosis-desktop.jpg` | — |
| Repair, reduced motion | `lab-repair-reduced-motion.jpg` | `lab-bay-wide-reduced-motion.jpg` |
| Mobile | `lab-fault-inspect-mobile.jpg` | `lab-bay-mobile.jpg` |
| Test-runner render | `bench-3d-fault-desktop.jpg` (from the M2 suite) | — |

Qualification (D) has no approved fixture, because the qualified bench state is not among the 33 typed examples. It is wired, but not shown until Sol's backend supplies the state.

## Performance

Measured with in-page WebGL call timers, fault stage, local production server, two runs each.

| Path | First frame (`data-frame`) | Scenery complete | Shader compile (programs) |
|---|---|---|---|
| GPU desktop (Metal) | 0.54–0.55 s | 0.83–0.84 s | 0.19 s (48) |
| GPU mobile emulation | 0.49 s | 0.68 s (lite tier) | 0.13 s (32) |
| Software desktop (SwiftShader) | 5.8–7.2 s | scenery off | 1.6 s (26) |
| Software mobile emulation | 6.1 s | scenery off | 1.1 s (26) |

- **Before this pass,** software rendering with scenery spent 16–17 s compiling shaders, at about 0.5 s per program on the main thread. Software renderers now get the apparatus-only bench and the caption says so, which keeps the 2D UI responsive.
- **Payload:**
  - Models served: bench 0.68 MB, cabinet 0.27 MB, cart 0.44 MB, astronaut 1.2 MB, plus PIX 0.86 MB (loaded by the PIX stage anyway).
  - Desktop loads 2.6 MB of lab models. Mobile (lite) loads the astronaut only, at 1.2 MB, plus procedural geometry.
- **Not measured:** frame rate and physical devices. No FPS figure is claimed.

## Remaining weaknesses

- The procedural planet is painted and stylised. Up close, its continents read as soft blobs.
- The astronaut's suit has no navy or orange accents. That needs texture work or a regeneration.
- The work view looks past the duct glass, so glass tint still lifts the parts behind it slightly.
- The Meshy side props are mostly out of frame in the gameplay views.
- The qualification (D) composition is unverified without a qualified fixture.

## Chamber housing pilot (one Meshy generation, 30 credits)

These are identical scripted views, captured on GPU before and after. They are in `docs/qa/screenshots/m2/chamber-pilot/`: `before-*`, `after-*` (shipped), and `v1-after-*`, the first attempt with the chamber on mobile too, which was rejected.

| View | Effect |
|---|---|
| Bay | Better. A dark open gantry frames the apparatus as an exhibit; nothing is hidden |
| Work | Neutral for the chamber: only a pillar edge at the frame border. Better overall: the flow straightener got a satin finish in the lab, and its 36 cells no longer blow out white |
| Inspect / Fault | Neutral: the frame stays outside the shot. The fault pulse is narrowed so its peak never blooms |
| Mobile Work | Worse with the chamber: its truss and a thin flat sheet under it crossed the top third. Excluded from the lite tier, so this view is unchanged from before |

Same-build A/B on the GPU desktop path, with the chamber request allowed vs blocked:
- First frame is unchanged (0.45–0.47 s).
- Scenery completes 20–90 ms later (0.68–0.74 vs 0.64–0.66 s).
- Shader programs are unchanged (40).
- Frame time is 16.7 ms median and 16.8 ms p95 both ways (vsync-capped, so headroom is not measured).
- The extra download is 838 KB on desktop and 0 on mobile and software, where the chamber is not loaded.
