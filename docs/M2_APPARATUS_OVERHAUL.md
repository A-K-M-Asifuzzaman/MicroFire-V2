# BASS-II apparatus quality and interaction overhaul

Branch `feat/m2-claude-gameplay`, from `d8f66eb`. Frontend only. No backend, reducer, dataset or rule change; no Meshy spend.

## What changed

- **Geometry** — `apps/web/game/ui/apparatus.ts` (new) builds all ten parts procedurally with thickness, bevels, joins and
  material boundaries. `bench-scene.ts` now imports it in place of its old inline primitives.
- **Duct alignment bug** — the duct group sits on its glovebox mount, but its geometry was drawn about the origin, so the
  duct rendered 6.2 cm below the parts mounted on it. Fixed with `DUCT_LIFT`.
- **Lighting**
  - Bloom strength 0.6 → 0.32 (threshold 2.0 → 2.2) and the rim light 26 → 14, so the glass no longer veils the parts.
  - A cool front fill light (full tier only) keeps bevels and edges readable.
  - The steady amber fault light dropped from 2.2 to 0.6.
- **Materials**
  - Clear-coat physical glass at 8–10 % opacity, with edge lines carrying the shape.
  - Anodised dark housings, satin aluminium honeycomb and screens.
  - Copper plate and brass screen (both materials sourced).
  - PMMA film, lens glass.
  - View cones halved to 6 % opacity.
- **Fault cue** — a low amber glow over the part's own material (it was a flat yellow fill), plus the amber callout and
  the alarm light.
- **Inspect framing** — each part has its own Inspect framing (`INSPECT`). The honeycomb is now framed from downstream,
  through the front glass, so the fan no longer blocks it.

## Component audit

| Part | Source-supported | Illustrative (schematic) | Material | Interaction |
|---|---|---|---|---|
| Flow duct | 7.6 × 7.6 × 17 cm, rounded corners | corner radius, wall thickness, cradles | clear-coat glass, edge lines | select, inspect, fitted on the glovebox mount |
| Fan | variable-speed fan blowing through the duct | shroud, 7 pitched blades, struts, hub, motor | anodised shroud, aluminium hub | blades spin only when fitted; reversed orientation turns the flow arrow |
| Honeycomb straightener | honeycomb plus inlet screen | hex cell size, frame depth | satin aluminium, dark frame | per-part inspect from downstream |
| Nitrogen nozzle | N2 nozzle in the test section | nozzle diameter, nut, body profile | aluminium | select, inspect |
| Sample holder | top mounting rail; B20 film is PMMA, 2 cm wide, 0.1 mm thick | rail section, hangers, clamps | aluminium, PMMA film | select, inspect |
| Igniter | hot-wire coil moved into position by a lever through the front window | knob, arm, coil turns | aluminium, copper-coloured wire | select, inspect |
| Still camera | at the top window, 60-mm lens | body size and shape | dark body, lens glass | view cone (not a field-of-view measurement) |
| Video camera | front window with a turning mirror | body, mirror mount | dark body, mirror | view cone |
| Radiometer | thermopile radiometer, downstream top back corner, viewing upstream; uncalibrated | housing, clamp | aluminium, window | view cone |
| Exit plate and screen | perforated copper plate, then brass screen | hole count and size, frame | copper, brass | select, inspect |

No geometry is presented as a NASA engineering reconstruction. The figure caption and source notes say so on the page.

## Interaction and HUD

- **Assembly strip** (`AssemblyStatus`, under the bench, never over it) shows three things:
  - the server-confirmed count, "N of 10 fitted", with a progress bar;
  - the server's current task (`progress.nextInstruction`);
  - the selected part's state.
- **Suggested next part** — the first loose part whose public mounting-order prerequisites (`spec.requires`) are fitted.
  It is labelled as a suggestion; the server still judges every install.
- **Designated mount** — the part spec's own `anchorId` is listed first and carries a "Designated mount" badge. It is also
  marked on the 2D schematic (dashed teal, plus the accessible name) and in 3D (a larger teal ring). Every other mount
  stays choosable, so a wrong mount can still be tried and is refused by the server.
- **Placement preview** — the ghost part now sits at the chosen mount. It used to hover above the bench, out of frame.
  It pulses while the request is pending. Nothing changes until the server answers.
- **Mobile** — the bottom sheet is capped at 58 vh (was 72 vh), with the designated mount first. Tap a part, then tap a
  mount (sheet or 3D ring), then Install.

### Interaction tests (Playwright, fixture gallery)

The new test `apparatus cues: progress, designated mount, a wrong mount and a repeated install stay intents the server
judges` covers the following:

- A wrong mount (Honeycomb slot for the fan) produces exactly that intent.
- The fitted count stays 1 of 10.
- A second Install is a second intent, never a local success.

Existing tests cover the rest:

- keyboard placement;
- touch bottom sheet;
- frozen refusal text;
- fault, diagnosis, wrong-answer coaching, repair histories and qualification refusal.

Server outcomes only exist through the approved contract fixtures until Sol's preview API is integrated.

## Evidence

Before and after captures use the same script (`tests/visual/apparatus.mjs`), in `docs/qa/screenshots/apparatus/`:

- `before-d8f66eb/` and `after/`;
- shots 01–09: full apparatus, fan, honeycomb, sample-holder/igniter, assembly action, placement preview, incorrect
  placement, fault inspection, mobile.

## Performance

Tour route, Apple Metal GPU, measured after the overhaul:

| Viewport | Bench first frame | Transferred | WebGL contexts | Long tasks | Frame time |
|---|---|---|---|---|---|
| Desktop 1440 | 0.43 s | 4.9 MB | 2 | 276 ms | median 16.7 ms, p95 16.8 ms |
| Mobile 390 | 0.8 s | 1.7 MB | 1 | 638 ms | median 16.7 ms, p95 16.8 ms |

No new textures or models were added; all apparatus geometry is generated in code. There is no before measurement for
this route.

## Meshy (proposal only, nothing generated)

- **Live balance:** 2,713 credits, read with the free balance call on 2026-10-22. The brief's 2,813 is out of date.
- **Not suitable for Meshy:** every scientific component. Their shapes must stay procedural and labelled schematic, so a
  generated mesh would only add invented detail.
- **Only candidate:** an illustrative MSG-style glovebox work-volume shell behind the bench. It would be a backdrop only:
  it would define no mount and play no part in placement.
  - Text-to-3D preview, 20 credits.
  - Refine, 10 credits.
  - Cap: 35 credits.
- **Recommendation:** do not spend yet. The procedural apparatus now carries the scene. The shell needs separate owner
  approval.

## Remaining weaknesses and dependencies

- Server outcomes come only from fixtures until Sol's preview API and contract runtime are integrated.
- On a phone the bottom sheet and the 3D bench cannot be seen together. Tapping a 3D mount ring works, but the sheet
  covers the lower page.
- The fan blades are flat extrusions, and the camera and radiometer bodies are simple rounded boxes. Both are deliberate:
  their real shapes are not sourced.
- The repo-wide lint still fails on Sol's `docs/m2/fixtures/verify-contracts.ts`, as before. Every Claude-owned file
  lints clean.
