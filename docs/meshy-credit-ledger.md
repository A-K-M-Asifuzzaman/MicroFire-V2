# Meshy ledger

## Phase Zero
Generation jobs: 0. Credits spent: 0. Balance: NOT CHECKED. No key read, balance call, MCP installation or deployment.

## M1.5 (2026-10-15)
- Generation jobs: **0**. Credits spent: **0**.
- Owner-reported website balance: 3,100. Authenticated API balance: **NOT VERIFIED**, because `MESHY_API_KEY` is not configured in the agent environment. A key was pasted into chat; the owner should rotate it before configuring the new key privately. It was not stored, used or echoed.
- Meshy pricing says API jobs draw on a prepaid API balance. `GET /openapi/v1/balance` with the owner's key must confirm the spendable pool before any job runs.
- Pilot proposed, awaiting approval: `pix-v1` (30), `console-v1` (30). Estimate 60, requested cap 100. Planning ceilings: M1.5 800, M2 1,300, M3 700, revisions 300.
- Tool: `tools/meshy/meshy.mjs` (local only). Per-job balance before/after goes to `tools/meshy/ledger.jsonl`.
- Meshy MCP registered at user scope (Keychain launcher). Keychain entry not yet created by the owner, so the server cannot connect and no balance has been read.

## M1.5 activation attempt (2026-10-15)
- Owner authorised Meshy use and set the reserves below. Connection check: Keychain service `meshy-api-key` is **absent** (any account), `MESHY_API_KEY` unset, no env file holds it, and the MCP server shows "Failed to connect". No API call was made. Jobs: **0**. Credits spent: **0**.
- Existing Meshy assets: not listable without the key. Locally there are no Meshy GLBs; the legacy repos' models are NASA / Poly Haven CC0, not Meshy.
- Pricing (docs.meshy.ai/en/api/pricing, read 2026-10-15): "The Meshy API uses a prepaid credit system… Purchase API credits from your subscription settings." The page doesn't say whether website credits are spendable through the API, so only `GET /v1/balance` can settle it.
- **Verified later the same day:** the owner stored the key in the repo-root `.env` (git-ignored, mode 600). `GET /v1/balance` → balance **3,100** (monthly 3,100, permanent 0), so the subscription credits *are* spendable through the API. Existing tasks: 0 across text-to-3D, image-to-3D, multi-image, remesh, retexture, rigging, text-to-image and image-to-image, so there's nothing to reuse. MCP status: Connected. Jobs: 0. Spent: 0.
- Planning split of the 3,100: M1.5 ≤800 (pilot cap 100 first), M2 1,300, later missions 700, revisions 300. If the verified API balance is lower, every tier scales down proportionally before any job runs.

## M1.5 pilot — executed (2026-10-15)
Owner approved the pilot (pix-v1 + console-v1, hard cap 100) and then one PIX redo inside the same cap. Every job ran once, with no automatic retries. The balance was read before and after each job; raw entries are in `tools/meshy/ledger.jsonl`.

| Job | Mode | Credits | Balance after | QA | Used |
|---|---|---|---|---|---|
| pix-v1 | Text-to-3D meshy-7.1, preview + PBR 2K | 30 | 3,070 | **Rejected**: humanoid with claw feet and three eyes; off-brief and not child-friendly | No (kept locally in git-ignored `incoming/`) |
| console-v1 | Text-to-3D meshy-7.1, preview + PBR 2K | 30 | 3,040 | Pass: clean workstation, blank screen, 10.9k triangles | Yes: observatory stations (5×) |
| pix-v2 | Image-to-3D meshy-7.1 from in-house concept art (`tools/meshy/concepts/pix-v2-concept.png`), PBR 2K | 30 | **3,010** | Pass: faithful to the PIX design, 20.4k triangles | Yes: observatory PIX station, home PIX intro, Ask PIX (state-driven motion) |

- **Pilot total: 90 of the approved 100.** No purchases. Remaining planning split: M1.5 headroom 710 (needs a new approval per batch), M2 1,300, later missions 700, revisions 300.
- Optimisation: glTF-Transform 4.2.1 (quantised geometry, external WebP textures at 1024 px). PIX is 6.3 MB → 865 KB (textures kept at 2048 px, because 1024 px bled UV-seam lines across the visor) and the console is 7.0 MB → 563 KB (1024 px). Models load same-origin as plain glTF, so the site CSP is unchanged (no WASM decoder, no `blob:` textures).
- Rights: `data/asset-rights.json` (one entry per served file). Meshy paid-plan output is owned by the account holder; designs are original, with no logos or insignia.

## M2 premium asset batch 1 (2026-10-16/17)
Owner authorised up to 600 new credits for M2: 300 first, then a quality review before the second 300. The tool refuses any job whose estimate would take the live balance below the floor (2,710 for the first 300; 2,410 overall). Every job ran once, with no retries. Raw entries are in `tools/meshy/ledger.jsonl`.

| Job | Mode | Credits | Balance after | QA | Used |
|---|---|---|---|---|---|
| astronaut-v1 | Text-to-3D meshy-7.1, A-pose, PBR 2K | 30 | 2,980 | Pass: original suit, no insignia; mostly white (less navy/orange than prompted) | Via rig + animation |
| training-bench-v1 | Text-to-3D meshy-7.1, PBR 2K | 30 | 2,950 | Pass: clean workstation; work surface measured at 42% of height | Yes: bench under the apparatus |
| lab-viewport-v1 | Text-to-3D meshy-7.1, PBR 2K | 30 | 2,920 | **Rejected**: reads as an armour plate; the porthole is a solid dome, so no Earth backdrop is possible | No (kept in git-ignored `incoming/`) |
| lab-wall-v1 | Text-to-3D meshy-7.1, PBR 2K | 30 | 2,890 | Pass | Yes: three back-wall modules (one fetch) |
| storage-cabinet-v1 | Text-to-3D meshy-7.1, PBR 2K | 30 | 2,860 | Pass (plain) | Yes: desktop only |
| tool-cart-v1 | Text-to-3D meshy-7.1, PBR 2K | 30 | 2,830 | Pass | Yes: desktop only |
| astronaut-v1:rig | Rigging, 1.75 m | 5 | 2,825 | Pass | Yes |
| astronaut-v1:animate | 4 library actions × 3 (Idle, Wave One Hand, Breathe and Look Around, Victory Fist Pump) | 12 | **2,813** | Pass: one file holds mesh, skeleton and all four clips | Yes: idle loop; look on fault; wave on correct diagnosis and repair; cheer on qualification |

- **Batch total: 197** (6 × 30 + 5 + 12). First allowance remaining: 103. Overall M2 allowance remaining: 403. No purchases.
- **Optimisation:** glTF-Transform 4.2.1, quantised geometry, external WebP textures (1024 px bench and astronaut; 512 px props, lightly simplified). 47 MB of GLBs → 3.1 MB served. CSP is unchanged.
- **Payload:** desktop bay 2.99 MB across 28 files (PIX included). Mobile (≤760 px or coarse pointer) skips the side props and two walls: 2.44 MB, 18 files. Loaded only after the learner opens the 3D bench.
- **Grounding:** decoration only. The apparatus, mounts, faults and qualification remain procedural and server-decided. Meshy geometry never decides an outcome.
- **Rights:** `data/asset-rights.json` entries carry a `coordination` field because Sol owns the ledger migration and must confirm them.

## M2 visual correction pass (2026-10-17) — no spending
- Live balance verified again: **2,813**. Jobs: 0. Credits spent: 0.
- **lab-wall-v1 retired.** Procedural dark paneling replaced it because it read as a plain, bright wall. Its served files and proposed rights entries were removed; the raw GLB stays in git-ignored `incoming/`. The 30 credits remain spent.
- The Meshy workstation is now a side console. The hero workstation, window wall, observation window and inspection arm are procedural. The rejected `lab-viewport-v1` stays unused; the procedural window has a genuine opening.
- **Proposed next batch, awaiting owner approval (not run):** ≤ 90 credits, text-to-3D meshy-7.1 at 30 each (20 preview + 10 PBR refine), no retries without approval.
  1. Mechanical wall module for both sides of the window.
  2. An artistic chamber housing frame around the apparatus; open apertures stay procedural.
  3. A recessed control-panel housing for the workstation.

  The inspection arm stays procedural: Meshy returns one fused mesh, which cannot articulate.

## M2 chamber housing pilot (generated 2026-10-17, QA 2026-10-21)
The owner authorised **one** generation with a 30-credit cap; the other two proposed models and any retries were not authorised. Published price (docs.meshy.ai/en/api/pricing): text-to-3D preview 20 + 2K refine 10 = 30. The tool was run with cap 30 and floor 2,783.

| Job | Mode | Credits | Balance after | QA | Used |
|---|---|---|---|---|---|
| chamber-housing-v1 | Text-to-3D meshy-7.1 preview `01a148d3-b0fd-73bf-a24c-a41174f0d5d3` → refine `01a148d4-e29d-70f1-93e4-43ff2fd98741`, PBR 2K | 30 | **2,783** | **Accepted, desktop only.** A genuinely open gantry: four pillars, truss top, no panels or glass. Meshy added a round pedestal (sunk out of sight under the instrument plate) and a thin flat sheet under the truss. On phones that sheet and the faceted truss crossed the pulled-back view, so the lite tier excludes it | Yes: framing the apparatus (desktop) |

- Optimised to 0.94 MB on disk (0.84 MB transferred), 18.4k triangles, WebP at 1024 px. Live balance before 2,813; after 2,783.
- No retries. The wall-module and control-panel proposals are not authorised and were not run.

## M4 art-direction prototypes, batch 1 (2026-10-21): 70 credits

The owner authorised up to 300 credits for this milestone; the first batch was capped at 100. Floor: 2,483.

| Job | Credits | Result |
|---|---|---|
| `hero-chamber-v1` (meshy-7.1, text-to-3D + 2K PBR refine) | 30 | Accepted. Design A's hero exhibit chamber, built around MicroFire's own illustrated flame |
| `orbital-arch-v1` (meshy-7.1, text-to-3D + 2K PBR refine) | 30 | Accepted. Design A's colonnade of structural arches |
| `astronaut-v1-suit` (retexture, original UVs) | 10 | Accepted after compositing. The first request was rejected at creation (HTTP 404 on an expired task id; no task, 0 credits) and was re-sent once with the original GLB |

- **Balance:** 2,783 → 2,713, verified live.
- **Ledger rows:** the two text-to-3D jobs ran concurrently, so their rows' `spent` fields overlap. The `reconcile:M4-batch-1` ledger row records the true per-job split. Paid jobs now run sequentially.
- **Suit fix:** the retexture produced a clear visor with a generated face. The visor region was restored from the original texture before use.
- **Spending stopped at 70.** The prototypes did not need more models (Design B is illustrated).

## Reconciliation (2026-10-22, read-only; no paid calls)

**Live balance: 2,713** (free balance endpoint, checked twice: once through `tools/meshy/meshy.mjs balance`, once through the Meshy connector). Monthly credits 2,713, permanent 0, monthly reset 2026-11-11.

**2,813 → 2,713 (−100)** is fully explained by two charged events:

| When | Job | Tasks | Credits | Accepted? | Used where |
|---|---|---|---|---|---|
| 2026-10-17 | `chamber-housing-v1` (text-to-3D + refine) | preview `01a148d3-b0fd-73bf-a24c-a41174f0d5d3`, refine `01a148d4-e29d-70f1-93e4-43ff2fd98741` | 30 | Yes, desktop tier only | Open gantry around the apparatus in the 3D bench and tour |
| 2026-10-21 | `hero-chamber-v1` (text-to-3D + refine) | preview `01a15f3f-5d2a-7304-98fb-4a44b238fcbd`, refine `01a15f40-bafd-74af-a79e-b060aa58323d` | 30 | Yes, prototype only | Design A homepage (`/design/a`); not used in the training bay |
| 2026-10-21 | `orbital-arch-v1` (text-to-3D + refine) | preview `01a15f3f-70a6-726d-a5b8-d2647c3672a3`, refine `01a15f40-cc45-7338-954f-48359a9d5548` | 30 | Yes, prototype only | Design A homepage colonnade; not used in the training bay |
| 2026-10-21 | `astronaut-v1-suit` (retexture) | `01a15f42-5c1e-70f2-a823-52534d70a9c5` | 10 | Yes, after visor compositing | Since 2026-10-22 the astronaut in the training bay, tour and arrival still |

The **70-credit art-direction cost was charged**, not proposed (2,783 → 2,713).

- **API check.** The three M4 tasks are still returned by the Meshy API. The 2026-10-17 and earlier task ids now return "not found", which looks like the API's retention window. For those rows, the balance-before and balance-after readings recorded at run time are the evidence.
- **Rejected or retired assets:**
  - `lab-viewport-v1` (30, 2026-10-16) was rejected.
  - `lab-wall-v1` (30) was retired in the 2026-10-17 visual rebuild.
  - `pix-v1` was superseded by `pix-v2`.
  - All of these were charged and are in the totals.

**Ledger totals since the first paid call (3,100):**

| Item | Credits |
|---|---|
| M1.5 pilot | 90 |
| M2 batch 1 | 197 |
| Chamber pilot | 30 |
| M4 batch 1 | 70 |
| **Total** | **387** |

3,100 − 387 = 2,713, which matches the live balance.

## November 2026 production (owner plan: cap 1,500 across three batches)

**Owner approval (2026-11-12):** "Full plan, cap 1,500".
- Batch 1: 300 credits, 10 models. These are 5 mission dioramas plus 5 hero props for Missions 01, 03, 04 and 05.
- Batch 2: 900 credits, 30 environment props. Runs only after Batch 1 passes QA.
- Batch 3: 300 credits for revisions, rigging and animation.
- That leaves about 189 credits for the owner's other project, which shares the pool.

No top-ups and no automatic retries. Each job runs once with `--approved-cap 30`, sequentially, with a balance floor of 1,389 for Batch 1.

**Starting balance:** 1,689 (monthly 1,689, permanent 0), read live on 2026-11-12. The monthly credits reset at 2026-12-11T08:11:47Z.

**Gap from the October ledger:** the earlier ledger ended at 2,713. The 1,024 difference was spent by the owner's separate portfolio project, which shares this Meshy account. None of that spend is MicroFire assets.

### Batch 1 (meshy-7.1 text-to-3D preview 20 + PBR refine 10 = 30 each)

Task IDs, balance before and balance after for every job are in `tools/meshy/ledger.jsonl`. Source GLBs and textures are kept locally in `tools/meshy/incoming/<job>/`, which is git-ignored. QA used five-view turnarounds rendered by `tools/meshy/render-stills.mjs`.

| Job | Destination | Credits | QA | Integration status |
|---|---|---|---|---|
| `m1-diorama-v1` | Mission map + Mission 01 page | 30 | Accepted | Card and page still (`public/media/missions/station-arrival.webp`) |
| `m2-diorama-v1` | Mission map + Mission 02 page | 30 | Accepted | Card and page still |
| `m3-diorama-v1` | Mission map + Mission 03 page | 30 | Accepted with note: the chamber renders opaque, with no visible flame | Card and page still, generic illustration only |
| `m4-diorama-v1` | Mission map + Mission 04 page | 30 | Accepted | Card and page still |
| `m5-diorama-v1` | Mission map + Mission 05 page | 30 | Accepted with note: the ground is pale blue, not grey regolith (fictional scene) | Card and page still |
| `m1-science-rack-v1` | Mission 01 scene (glovebox rack) | 30 | Accepted | Generated + QA'd; not yet placed in a scene |
| `m3-sample-carousel-v1` | Mission 03 scene | 30 | Accepted with note: the dome is opaque and open at the front | Generated + QA'd; not yet placed |
| `m4-evidence-lectern-v1` | Mission 04 scene | 30 | Accepted with note: reads as a reading desk with a floating holo disc | Generated + QA'd; not yet placed |
| `m5-ventilation-unit-v1` | Mission 05 scene | 30 | Accepted | Generated + QA'd; not yet placed |
| `m5-airlock-v1` | Mission 05 scene | 30 | Accepted with note: a round hatch, not a full module; also serves Mission 01 | Generated + QA'd; not yet placed |

**Batch 1 totals:** 10 jobs, 10 succeeded, 0 failed, 0 retries. Spent **300**, taking the balance from **1,689 to 1,389**; this matches the live balance.

A generated model is not a game feature. The props join mission scenes only when those missions are built. None of them affects placement, qualification or any scientific outcome.

### Batch 2 (started 2026-11-12 after Batch 1 QA passed)

- **Jobs:** 29 of the 30 planned. `m1-airlock-hatch-v1` was dropped because it would duplicate `m5-airlock-v1`.
- **Spend:** estimate 870, hard floor 519. That leaves 300 for Batch 3 plus about 219 in reserve.
- **Results:** recorded per job in `tools/meshy/ledger.jsonl`, with QA results appended when the batch finishes.
