# Registry reconciliation and ownership proposal

**Candidate2 retains all nine reviewed wording proposals verbatim.** No registry, ownership, asset, package or lockfile is changed by this documentation-only branch. Below is the exact row-level proposal for future shared review.

## Nine handoff descriptions

Independent M1.5 acceptance already supports these interfaces as limited review implementations. Backend implementation, frontend integration, browser evidence and release approval remain separate. No Available status is approved.

| id | Current state → proposed | Exact proposed reason / decision |
|---|---|---|
| home | preview → preview | `Observatory home with the Gravity Lens still-air teaching illustration and an optional 3D scene; interface implemented for review, release acceptance pending.` Accepted wording |
| atlas | preview → preview | `One audited BASS-II record; search and filter interface implemented for review; broader coverage pending.` Accepted wording; audited means source-checked, not human approval |
| experiment | preview → preview | `One cited record with field-level provenance, source-linked apparatus and evidence export; interface implemented for review.` Accepted wording |
| dashboard | coming_soon → preview **after joint review** | `Evidence ranking over one validated record; interface implemented for review, release acceptance pending.` Supported by tested UI; no public Available |
| gaps | coming_soon → preview **after joint review** | `Coverage comparison over one validated record; interface implemented for review, release acceptance pending.` Supported by tested UI |
| ask | coming_soon → preview **after joint review** | `Deterministic, catalog-grounded answers with citation-lineage checks and abstention (no AI model); interface implemented for review, release acceptance pending.` Supported by deterministic/API/UI evidence |
| passport | coming_soon → coming_soon | **Clarified:** `Contracts, local persistence and safe restore exist; earned mission entries and structured Passport export UI are pending.` Raw-save download already works, so unqualified “export UI pending” is ambiguous. Handoff's addition of safe restore is a real wording change, not literally unchanged |
| lab | coming_soon → coming_soon | `The Gravity Lens illustration is available on Discover; the Lab workspace is pending.` Accepted; does not mean standalone lab completion |
| missions | preview → preview | `Mission descriptions only; none is playable yet.` Already accurate for the current public product; a future guarded local preview must not silently change this public state |

Preview requires implemented partial behavior in FeatureSchema; definitions currently derive implemented from Preview. Apply the three state transitions and associated test expectations together only after joint review; do not set contradictory coming_soon + implemented:true. Maintain schema invariants and keep mission IDs unavailable. Current built-interface Registry note is a truthful temporary disclosure until reconciliation. Claude can remove stale reasons/temporary disclosure after integration; no field change here is a claim of release approval.

## Six pending Codex edits: preserve, reconcile, do not blindly replay

Original dirty `packages/shared/src/features.ts` SHA-256: **4cbae99f3419faf80684c65eb4a417f223cca39282570afd0c4ececd52a63d0d** in MicroFire-V2-codex. That checkout is at older882e3c8, while the accepted baseline already includes backend-corrected wording. Applying its whole file would regress accepted code.

| Pending row | Decision |
|---|---|
| dashboard | API-exists/UI-pending text was historically valid; superseded by verified M1.5 UI reason above. Preserve original file; reconcile row in new integration branch |
| atlas | Search API but UI pending is stale; use nine-row proposal |
| experiment | Export API but UI pending is stale; use source-linked/evidence-export proposal |
| gaps | API exists/UI pending is stale; use coverage interface proposal |
| ask | Old pending grounded-API description must not overwrite accepted deterministic/no-AI correction; use proposal above |
| methodology | Author-labelled small evaluation set and independent-evaluation caveat already match the accepted baseline's backend correction; preserve that wording. No unrelated rewrite or false independent scientific approval |

Sol's integration action: create a reviewed row-level diff against **b6d15a4 + this approved plan**, record before/after states and reasons, update S3 browser badge expectations and tests/unit/api.test.ts exact state expectations only for the three reviewed Preview changes, re-run registry invariants/current research browser tests. Do not replace the file with the older dirty proposal. Leave the original six edits physically intact until their owner explicitly resolves them. This reconciliation can proceed in parallel with M2 planning/contract review; runtime feature changes are not part of this planning commit.

## Assets and budget

The ledger has three30-credit entries (pix-v1, console-v1, pix-v2), total **90 recorded**, ending recorded balance **3,010**. pix-v1 was rejected and is not served. Ten served model files (two glTF/bin/WebP sets) have rights-ledger entries and exist. No new assets, generation or balance call is made by this plan. Ledger verification is not a live account entitlement check or renewed spending authorization.

`meshy-assets` currently says no funded entitlement/per-job approval was verified; historical pilot records now exist, so this additional stale reason needs separate owner review. It is **outside the nine-row handoff**. Keep Blocked while future generation lacks a newly approved job; proposed future wording: `Existing approved pilot assets are integrated; further generation requires a new owner-approved job and live balance verification.` Do not silently unlock a pipeline because a past pilot spent credits.

## Exact ownership additions proposed to docs/OWNERSHIP.md

| Path / responsibility | Editor / reviewer |
|---|---|
| packages/game-core scientific progression, training coordinator, save adapters | Sol; Astra reviews invariants; Claude consumes |
| packages/science, catalog/provenance validation | Sol; human/source promotion gate unchanged |
| packages/shared/src/training.ts and exports, core/HTTP type extraction | Shared freeze; Sol authors; Claude consumer review; Astra independent approval |
| apps/web/lib/game-preview.ts and API dispatch/limits | Sol; shared review for contract/security changes |
| apps/web/game, game pages/components, 2D/3D, PIX/HUD and accessible controls | Claude; Sol reviews payload/proof use, Astra tests experience |
| data/asset-rights.json and its validation schema | **Sol is the single editor** for the ledger/schema migration window; Claude supplies accurate asset provenance/processing/rights data; joint rights approval before publication |
| tools/meshy/ tooling, private-config handling and credit ledger | Sol owns safe tooling/budget invariants; Claude proposes asset jobs and visual acceptance; owner alone authorizes paid batches |
| apps/web/public/models/ (GLB/glTF/bin/textures) and future procedural game assets | Claude owns visual files/optimization; Sol reviews dimensions/claims/source binding; rights schema and independent QA apply |
| root/workspace package manifests + package-lock.json + shared config | Claude owns the **next** frontend dependency proposal/edit window; one editor at a time, pinned/jointly reviewed; Sol makes no concurrent edits |
| tests/unit game/science/API/security | Sol |
| tests/e2e and future authorization fixtures | Shared; Claude writes UI playthroughs, Sol writes backend/security fixtures; separate files and agreed ownership per batch |
| new science data/game schemas | Sol authors domain rules; shared review for schema changes; no frontend-generated observation or source record |

Use the current Three.js dependency and existing props first. No R3F dependency is mandated; no new package was installed here. A new asset is not automatically approved by a `approved:true` field: its entry must name reviewer/decision provenance and the owner-reviewed rights basis. Validate paths, extensions, finite metadata, missing/extra files and absence of secrets/expiring URLs. Existing rights statements are recorded claims, not an independent legal audit.

Required asset schema proposal: strict versioned object (`schemaVersion:1`, note, assets); each record retains current path/title/source/license/processing/reviewedBy/approved/part fields, with unique repo-relative allowlisted public-media paths, nonblank bounded strings and approved boolean. Adding schemaVersion to existing root needs an explicit ledger migration/test because the current ledger lacks it. Do not drop current provenance text during conversion. A rights release gate also needs a substantive approval decision, not only structural validation.

The first M2 bench uses scripted geometry for all scientific fit interfaces, with only duct dimensions treated as sourced; other geometry labeled schematic. Model thumbnails, actors and consoles are artistic props. No Meshy-generated mesh may define anchor constraints or stand in for validated NASA hardware.


## Correction-batch ownership freeze proposal

Sol alone edits docs/m2 in this correction; no shared runtime file changes. After approval, Sol authors packages/shared/training types/exports and domain/save-admission schemas, game-core logic and server-only API/crypto. Claude reviews those changes, then owns apps/web/game browser transport/controller/lock/storage implementation and2D/3D components. Neither imports a server signer through a browser barrel. Allocate explicit separate E2E files before parallel batches; API dispatch remains Sol-owned despite broad frontend app ownership. Root/shared config stays one named editor per reviewed window. package-lock.json and manifests remain Claude's next dependency-edit window; Sol does not edit them concurrently. Astra approves actual integrated contracts/tests, not shared-file concurrent ownership.
