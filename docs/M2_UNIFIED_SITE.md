# Unified MicroFire site: M2 visuals in ordinary navigation

- **Date:** 2026-10-21. **Owner:** Claude (frontend).
- **Branch:** `feat/m2-claude-gameplay`, from `f47de5c`. This branch already contains `origin/main` (`882e3c8`), M1 `e8731c0` and M1.5 `b6d15a4`. It does not contain the deploy-guard commit `322f2c2` or Sol's `196b61a`.
- **Status:** the frontend is integrated, the mission backend is pending, nothing is deployed.

## What a visitor now sees

| Route | Change |
|---|---|
| `/` | The M1.5 cinematic observatory hero, unchanged. Directly below it is a new full-bleed **"Step inside the training bay"** invitation built from MicroFire's own render of the 3D bay, with **Tour the training bay** and **Mission briefing** links. |
| `/missions/bass-assembly/tour` | **New. An illustrative tour** of the training bay: the full M2 3D scene (Meshy chamber gantry, astronaut, inspection arm, panoramic window, cinematic lighting and bloom) with the apparatus in its reference configuration. It includes:<ul><li>the cinematic arrival, played once per session, skippable, and off under reduced motion;</li><li>camera presets Bay, Work and Inspect, plus full screen;</li><li>honest loading steps;</li><li>a parts inspector using the frozen equipment copy;</li><li>PIX guidance;</li><li>opt-in lab sound and narration.</li></ul>It has no session, server state or fixtures, and records nothing. |
| `/missions` | The invitation card, and a link to the tour in the map note. |
| `/missions/bass-assembly`, `/missions/station-arrival` | The status stays **Coming Soon** (disabled). The text now says the bay is built and that gameplay, training qualification and Passport entries open only after server integration. The invitation card is added. |
| Navigation | Mission tools gains **Training bay**; the mobile menu gains a **Missions → Training bay tour** link. |
| `/m2-fixtures` | Unchanged: a 404 unless `MICROFIRE_M2_FIXTURE_GALLERY=1` is set. It is not linked anywhere. |

Research routes (Atlas, B20 dossier, Workstation, Ask PIX, Frontier, Passport, Methodology, Sources) are unchanged. They already share the M1.5 identity.

## Scientific and gameplay protection

- The tour shows each part at the mount named in the frozen equipment specification. The 2D tray shows the same data.
  - It flags no fault and qualifies nothing.
  - It writes nothing to the Evidence Passport.
  - Its caption says the apparatus is schematic and that the bay, astronaut, arm and Earth view are illustrative.
- The real mission is unchanged. It is reachable only through `?preview=bass-b20-training-v1`, which still reports that the backend is not integrated and sends nothing.
- B20 remains the only admitted record (17.4 vol%), and the 55 legacy rows stay quarantined. Ask PIX and the evidence pipeline are untouched.

## Performance

- Each WebGL scene (observatory, PIX, bench) now calls `forceContextLoss()` when it stops, so client navigation releases the GPU context immediately.
- A browser test counts live contexts across three home → tour → home round trips.
- 3D loading is unchanged:
  - the bench chunk loads only on the tour or mission pages;
  - small screens get the lite tier;
  - software renderers get no scenery;
  - without WebGL, the tour shows a rendered still and keeps the parts inspector working.

## Evidence

- **Before** (`f47de5c`): `docs/qa/screenshots/site/before-f47de5c/`.
- **After:** `docs/qa/screenshots/site/after/`, numbered along the visitor journey: home → invitation → arrival → bay → work view → part inspection → mission map → briefing.
- **Tests:** `tests/m2-ui/site-journey.spec.ts` covers the real-link journey, navigation, WebGL release, no-WebGL fallback, reduced motion, axe checks and 320 px reflow.

## Handoff to Sol (backend)

No contract changes. When Stage A is approved and integrated:
1. Export `contractRuntime` (the shared schemas plus canonical identity) to `apps/web/game/contract`. `preview-app.tsx` then boots the real controller against the preview API.
2. Decide how the public mission entry opens: replace the `?preview=` gate with the registry state of `/missions/bass-assembly`. This is Sol's registry, and Astra's acceptance.
3. Once the mission is live, the tour can link to it. The tour itself stays illustrative and separate.

Open items from `docs/M2_FRONTEND_INTEGRATION.md` remain:
- `parsePreviewJson`;
- the fault-category labels;
- the `coordination` entries in the asset-rights ledger;
- the 12 lint errors in `docs/m2/fixtures/verify-contracts.ts`.

## Before any public deployment

1. Owner approval to merge `feat/m2-claude-gameplay`. There is no direct push to main.
2. Sol confirms the asset-rights entries flagged `coordination` (Meshy models and the arrival render).
3. Decide whether to apply `322f2c2` (the `.vercelignore` guard against shipping `.env`, Meshy tools, docs and tests), and review it separately.
4. Ensure `MICROFIRE_M2_FIXTURE_GALLERY` is unset in the deployment environment.
5. Run `npm run check`, the M1 suite (port 3217) and the M2 suite (port 3240) on the merge commit.
6. Have Astra review the tour wording: "illustrative", "records nothing", "opens after server integration".
7. Run a HawkScan DAST pass once `HAWK_API_KEY` is available.
