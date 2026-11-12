# Pre-existing work and reuse disclosure inventory

Research only. Capture began November 12, 2026 at 22:26:04 Asia/Dhaka. This is an inventory of existing work, **not an approved competition reuse list**. Git dates are reported metadata, not independent creation-time attestations. Nothing is relabelled as work created during the hackathon.

## Auditable artifacts

- [Pre-existing work inventory](preexisting-work-inventory-20261112.json): 13 local refs, 13 distinct tip commits, 13 registered worktrees, 108 reachable commits, 1,139 unique paths and 1,285 blob variants. Every committed path variant is identified by Git blob object ID and byte count, with the tip commits containing it. These IDs are Git SHA-1 object identities, not raw-file SHA-256.
- [Rights and production-source inventory](reuse-rights-and-media-20261112.json): 86 distinct versions of asset-rights declarations across branches, three lockfile variants, font declarations, tracked recording/EDL/narration/editor paths. A declaration version is not necessarily a distinct asset.
- [Workspace media inventory](workspace-media-inventory-20261112.json): nine media files in the scoped workspace, raw-file SHA-256, size, read-stability checks and existing ffprobe metadata. This is metadata inspection, not rendering, editing or submission.

Snapshot heads were checked for concurrent movement while collecting the initial inventory. Their committed trees are immutable references; mutable worktree overlays are explicitly separate. The new research documents produced after capture are not recursively included in their own baseline. No tags, other branches or historical commits were altered.

## Relevant preserved heads

| Work | Snapshot commit |
|---|---|
| Completed Sol backend milestone | `d9a331304d315b5b14c2b29b9f1a127ccd13744f` |
| Initial eligibility/source research base | `ddcd6f8634d41f08d9c297259c7e1e5d9561abbe` |
| Original Stage A | `6d1887b4b3860214cd0f2ab3c687527285be91d9` |
| Claude gameplay | `4a8df9e34a4b6029a0fc02b295cb0fd384db293e` |
| Claude local M2 integration | `f03b1568030307713baae453accb136f44effb18` |
| Claude mission scenes | `e9671fa3f4bd0126f14d400ded538487512c1495` |

These are observations, not independent acceptance of those branches. Their owners may continue changing them. The inventory does not merge, build, test or edit them. Two historical backend/science worktrees had local modifications at capture; their statuses/fingerprints are recorded and were preserved.

## Existing content at the research baseline

The baseline has 1,067 tracked files. Path-based categories comprise 192 code/test/tool files, 9 research-data/provenance files, 215 documentation/research files, 599 visual assets/captures, 22 design references, 1 media file, 1 license notice and 28 configuration/other files. These categories describe file placement, not code authorship or scientific value; TypeScript fixtures under documentation remain in the documentation category. QA screenshots are not 599 distinct production assets.

Pre-existing code includes the Next/React site, shared schemas, deterministic search/ranking/citation/Ask logic, quarantine and source fixtures, M2 server/controller/2D/3D flow, signed checkpoint admission/recovery, private remaining-mission rules/service, tests and evaluation machinery. The source metadata imports from MicroFire-Atlas are separately attributed in `THIRD_PARTY_NOTICES.md` and the migration manifest. That notice retains the upstream MIT text; it does not automatically license every original MicroFire-V2 file.

At this baseline all 46 served public media/model/texture files have exact rows in `data/asset-rights.json`. This proves ledger coverage, not actual ownership, legal clearance, compatibility or scientific accuracy. Other branches and non-shipped design references have their own declaration variants and remain separately identified.

## Licenses and disclosure gaps

| Material | Existing evidence | Still needed before claiming reusable/cleared |
|---|---|---|
| Original project code and contributions | Preserved Git history, imports and notices | No root `LICENSE` exists at the research baseline. Owner/contributor permission and the intended project-wide license remain to be established. Do not assume MIT applies everywhere. |
| Imported MicroFire-Atlas material | Upstream commit attribution and retained MIT notice | Keep the exact scope and notice attached to reused portions; record changes and original source. |
| npm dependencies | Three pinned lockfile variants; declared license metadata is inventoried | Retain distribution notices and review actual included components. MIT is common, but Apache/BSD/ISC, MPL, LGPL, CC-BY and other declarations also occur. Workspace/link entries without a license are not automatically unlicensed third-party packages. This is not an installed-distribution compliance audit. |
| Meshy models/textures | Per-path source/job history, processing and paid-plan ownership declarations | Confirm generation-date entitlement, input/reference rights, community-publication status and required attribution. Existing `approved` ledger fields do not mean organizer approval. No account balance, purchase or generation was invoked. |
| Original/procedural illustrations and renders | App/render source and rights-ledger declarations | Disclose creation tools and reused model inputs; retain illustrative labels. Do not call artistic apparatus geometry NASA CAD or measured flame data. |
| Fonts | Existing code requests Bricolage Grotesque and Atkinson Hyperlegible Next through next/font | Primary Google Fonts OFL files were retrieved/hashed; both state SIL OFL 1.1. Verify notices attached to the exact built/subset distributions. No font/application packaging was changed. |
| NASA facts, papers and figures | Per-source rights and exact citation metadata | Preserve source-specific restrictions; factual extraction does not grant a blanket paper/media license. Saffire's current metadata explicitly flags possible copyrighted material. |
| User-supplied design references/concepts | Preserved reference paths and content fingerprints | Confirm creator, original license/permission, SI-generation history and whether inputs can be used or redistributed. A supplied image is not automatically reusable production art. |
| Narration and submission media | EDL, README, narration document and editor fingerprints | Confirm authorship/consent, original recordings and output paths. No final submission video, voice consent, upload receipt or organizer acceptance is certified here. |

Meshy's current [ownership explanation](https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models) distinguishes paid-plan output ownership from free-plan licensing and conditions rights on inputs/publication. Its [terms](https://www.meshy.ai/terms-of-use) are the controlling reference; current website text alone does not establish an account's entitlement on an earlier creation date. Original font-license evidence and current NTRS determinations are in [the primary research JSON](primary-research-update-20261112.json).

## Videos: what was actually located

The workspace scan found an 18.08-second M3 walkthrough in five checkouts and four opening-film/M4 walkthrough recordings: nine paths, five unique content hashes. No MP4 submission export was found in that scan. This does **not** establish that no export exists elsewhere. Dependencies, build output, provider/browser caches and unknown external export locations were excluded.

The current tracked local EDL has 25 shots totalling 246.1 seconds. Its existing editor overlaps adjacent shots by 0.4 seconds, giving an estimated timeline of **236.5 seconds**. The 8-shot global EDL totals 29.2 seconds and estimates **26.4 seconds** after overlaps. Therefore the gross shot sum alone is not a duration failure. These are source-derived estimates, not ffprobe measurements of final cuts. No videos were rebuilt or edited, and the finished-video README is not used as proof of an inspected output.

## Preservation and scope

The inventory covers local branch/tag tips, their reachable history and registered worktree overlays. It excludes credentials/environment contents, dependency installations, arbitrary home directories and unlocated exports. Raw source PDFs remain outside the application and are referenced by their existing hashes. Git metadata is an audit aid, not a method of granting eligibility or disguising earlier work. Any future allowed reuse must be disclosed separately from genuinely new in-window contributions.
