# M2 training bay: hybrid design (Design A scene + Design B interface)

Branch `feat/m2-claude-gameplay`, from `63f7dcf`.

This is a frontend-only change:
- no backend, reducer, rule or dataset change;
- no Meshy spend.

The owner provisionally selected Design A for the 3D scene and Design B for the interface. One system now drives three surfaces: the mission shell (`/missions/bass-assembly?preview=…`), the fixture gallery and the illustrative tour.

## What came from each design

### Design A (3D scene)

- **Graphite instrument palette** (graphite, plate, titanium edges, heat orange, signal teal). It is used for the stage and for every panel, so the UI sits inside the same world as the scene.
- **Viewport-first composition.** The bench is now full width and 68 vh tall (420–780 px), ahead of every panel. It used to share a column with the sidebar.
- **Re-textured suit astronaut** (navy panels, orange accents) in the bay. The arrival and no-WebGL still was re-rendered from the live bay with it (`tests/visual/arrival-still.mjs`).
- **Camera language.** Choosing a mount glides the camera toward that mount; it cuts instantly under reduced motion. Finishing the placement returns to the work view.
- **Existing scene work, kept:** the opening crane, idle drift, inspection-arm aim and per-part Inspect framings.

### Design B (interface)

- **Typography:**
  - Bricolage Grotesque (wdth 85, weight 800) for headings, part names and controls.
  - Atkinson Hyperlegible Next for reading.
  - Both are self-hosted through next/font, so the CSP is unchanged.
- **Sticker controls:**
  - Numbered part stickers in the tray and on the tour.
  - Pill buttons with a solid 3 px under-edge that compresses when pressed.
  - Stepping-stone journey rail.
- **PIX speech bubble:** dark text on a bone background, with a tail. It turns amber for concern and alarm, and teal for confirmed and reveal.
- **Hierarchy and mobile:**
  - The current task is the first thing in the status strip.
  - Every label is in sentence case; the all-caps mono eyebrows are gone.
  - The part panel becomes a bottom sheet on phones.

### Rejected, and why

- **A's floating rack, plate and deck overlaid on the scene.** Panels over the apparatus break "the apparatus is the star" and the no-overlay rule from the apparatus overhaul.
- **A's Big Shoulders and IBM Plex type.** Two condensed families on top of B's would have meant four typefaces; B's pair reads better at small sizes.
- **A's hero chamber and orbital arches (Meshy).** They are homepage set pieces. In the bay they would compete with the apparatus and add about 2.5 MB.
- **B's bright ultramarine and cloud page and its ink-outline stickers.** On a dark 3D stage they clash. B's sticker geometry was kept and rebuilt as graphite plates with solid under-edges.
- **B's illustrated SVG PIX.** The site already has one PIX character, used on the homepage and the tour. Two would be inconsistent.

## Design system

| Token | Value | Role |
|---|---|---|
| graphite / plate / plate-hi | `#0c0e10` / `#15191d` / `#1f252b` | stage, panels, stickers |
| edge / edge-hi / under | `#2c343b` / `#46515a` / `#050607` | 2 px outlines; solid under-edge (no blur) |
| bone / bone-dim | `#ece7dc` / `#aaa59b` | text |
| heat | `#ff6a1f` | your action: selected part, chosen mount, primary button, current stage |
| signal | `#3fd2c7` | confirmed by the server, fitted, designated mount |
| amber | `#e2b04a` | authored training fault |
| coral | `#ff6b6b` | refused by the server (with a ✕), never styled like confirmed (✓) |
| violet | `#c3b3ff` | learner-authored |

- **Geometry:** plates have radius 18; stickers have radius 14 and a number; actions are pills.
- **Motion:**
  - UI presses use a short spring (150 ms).
  - Camera moves ease slowly.
  - Each new PIX pose gets one gesture.
  - Nothing loops except the loading pulse.
  - All of it is removed under reduced motion.

## Interaction changes

- **Phone placement dock** (fixes "can't see the bench and the controls together"):
  - While part details are open, the view docks at the top (40 svh) and the part sheet takes the rest of the screen.
  - The two never overlap (covered by a test).
  - "Back to bench" closes the sheet and undocks.
  - Mounts can be tapped in the sheet or on the 3D rings.
- **Refusal in 3D.** The mount the server refused turns coral, shakes once, then stays coral while that refusal is the latest answer. A fit still expands teal.
- **No client-side judgement.** The ghost preview sits at the chosen mount and pulses while a request is pending. The designated mount (teal, from the public part spec) stays distinct from the server's verdict.
- **Resizing.** The bench now watches its own size with a ResizeObserver (needed for the dock).
- **Diagnosis form.** The component select no longer stretches to the height of the fault-category column.

## Evidence

The same script (`tests/visual/hybrid.mjs`) produced both sets:
- before: `docs/qa/screenshots/hybrid/before-63f7dcf/`;
- after: `docs/qa/screenshots/hybrid/after/`.

The shots, in order:
1. Cinematic opening
2. Assembly work view
3. Apparatus close-up
4. Fan inspection
5. Honeycomb inspection
6. Placement preview
7. Wrong placement
8. Fault diagnosis
9. Repair
10. Desktop layout (full page)
11. Mobile layout and placement, at 390 and 320
12. Reduced motion
13. Software-graphics fallback (SwiftShader)

## Performance

Single runs, Apple Metal, same probe as before. They are indicative, not statistically robust.

| Route | Viewport | First frame | Transferred | WebGL contexts | Long tasks | Frame time (median) |
|---|---|---|---|---|---|---|
| Tour (before, 63f7dcf) | desktop | 0.43 s | 4.89 MB | 2 | 276 ms | 16.7 ms |
| Tour (after) | desktop | 0.64 s | 4.14 MB | 1 | 428 ms | 16.7 ms |
| Tour (before) | mobile | 0.80 s | 1.72 MB | 1 | 638 ms | 16.7 ms |
| Tour (after) | mobile | 0.50 s | 1.88 MB | 1 | 335 ms | 16.7 ms |
| Gameplay, 2D default (after) | desktop / mobile | 0.21 / 0.14 s | 0.46 / 0.44 MB | 0 | 0 ms | 16.7 ms |

The two fonts add about 0.15 MB.

## Remaining weaknesses

- **Sparse assembly view.** During assembly only the duct is fitted, so the work view shows a lone glass box. That is honest to the state, but less striking than the tour's fully fitted reference.
- **Low-contrast rings.** At the far end of the duct, the mount rings and the coral refusal ring are thin against the bright glass.
- **Phone dock covers the site header.** While docked, the header is under the view. It returns when the sheet closes.
- **Flat mobile lighting.** The lite tier (phones) has no fill light or bloom, so the apparatus looks flatter there than on desktop.
- **Arrival title.** It now uses the display face, but the dark-graded backdrop makes the bay read dim behind it.
- **Flag patches.** The suit carries generated flag patches from the retexture. They are generic, not NASA marks, but the owner may prefer a plain suit.

## Sol backend

The mission is not integrated, and the fixture gallery is presentation evidence only. Details are in `docs/M2_FRONTEND_INTEGRATION.md` (re-checked 2026-10-22). Sol's branch is unchanged at `196b61a`, and a dry-run merge reports no conflicts.

These steps block a real end-to-end browser test, in order:
1. Astra's Stage A approval.
2. Owner-authorised merge, then the three-file seam (`contractRuntime`).
3. A local launcher with private secrets.
4. Live browser tests.

Writable browser saves stay off until Astra accepts the per-engine consistency results. Sol still needs to answer two questions: whether responses should go through `parsePreviewJson`, and whether the fault-category labels are approved.
