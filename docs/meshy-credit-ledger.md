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
