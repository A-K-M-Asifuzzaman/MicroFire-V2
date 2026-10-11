# 12 — MESHY 3D ASSET FACTORY: PREMIUM + MCP/REST + MANUAL FALLBACK

This file replaces `12_TRIPO_ASSET_PIPELINE.md`. Meshy is a provider of game-ready-looking 3D assets, **not a source of verified scientific geometry or game mechanics**.

## First: entitlement/billing check before generation
Read `docs/22_MESHY_SUBSCRIPTION_API_BILLING_CHECK.md`. Paid individual Meshy plans offer keys and official MCP, but account-specific API balance/extra purchase cannot be inferred from a price table. Verify readonly API balance and official billing; if 0/403/purchase required, do NOT buy or loop; use the web app and owner manual exports. NEVER print or commit API key or put it in shell history. No automatic API task without owner approval per operation.

Official docs: https://docs.meshy.ai/en/api/ai , https://docs.meshy.ai/en/api/pricing , https://docs.meshy.ai/en/api/balance and https://docs.meshy.ai/llms.txt. Verify supported current models and real MCP tool schemas. `meshy-5` retired on Oct 10, 2026. Don't use deprecated `lowpoly` on/after the documented retirement date, and recheck models as APIs evolve.

## Why generate and why not
Generate: PIX robot (original silhouette), scientist astronaut (reference-controlled), space station modular environment props, lunar habitat props, distinct science-console set dressings and manually approved themed details. Do not spend on repeating bolts, vents, generic chairs, walls or dense background décor when procedural Blender / Three.js works. Do not AI invent exact BASS-II duct geometry, critical alignment or named mechanical anchors. Exact 10 parts are scripted and validated by source.

## Controlled process
1. Scene-driven asset registry identifies purpose and functional requirements, correct scale, target LoD/draw calls, inputs and output format.
2. Create two plausible text prompts and/or legally permitted reference angles, rendering possible style draft.
3. Agent demonstrates the scene works with primitive placeholder asset first.
4. Check actual API balance, billing and task price; present approval for **one** specific paid job with best/worst-case costs and a stop limit.
5. Only after explicit user approval submit ONE supported generation task, capture job ID, bound polling/backoff, handle failure, download local GLB.
6. Inspect triangle count, disconnected floating parts, PBR/UV, normals, animation/rig eligibility, pivot, bounding box, units, textures, license, orientation and mobile target. Reject/regenerate ONLY with new owner permission.
7. Optimize with supported glTF-Transform / meshopt / Draco / KTX2 (validate pipeline). Integrate lazy-loaded GLB with skeletal/procedural animation and collision proxies. Provide 2D fallback.
8. Record approved actual credit changes and QA screenshots in `docs/asset-manifest.json` / `docs/meshy-credit-ledger.md` without including credentials or expiring URLs.

## Suggested prompt prefix
Production-ready original 3D game asset for an educational microgravity combustion investigation. Premium stylized/semi-realistic space-science materials, restrained ivory/navy, signature amber and scientific cyan accents, independent asset with no environment floor or text/logo/watermarks, centered scale and pivot, distinct moving elements where applicable, believable physically based materials, easy-to-optimize silhouette, consistent front/side/back references, suitable for textured GLB. No NASA insignia, trademarked patches or copyrighted character references.

## Model QA gates
Character: recognizable from small phone view, consistent limb separation, stable rig or procedural articulation, tested at least idle/walk/gesture as needed. Environment: modular instead of one fused room, collision and path guides, reasonable overdraw, no texture 'photobaked' source windows. Apparatus: ALL dimensions/alignments from references or labeled educational approximation; verified script geometry, no AI-engineered substitutes. UI screenshots do not establish functional GLB compatibility. Mobile with WebGL disabled must still play education path.
