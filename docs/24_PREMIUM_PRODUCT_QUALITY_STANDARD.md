# 24 — PREMIER PRODUCT QUALITY STANDARD (AUTHORITATIVE QUALITY ADDENDUM)

**Status:** Added after the Meshy/Living Observatory master review. Read this with `FINAL_MASTER_PROMPT.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/19_VISUAL_DIRECTION_LIVING_OBSERVATORY.md`. It adds enforceable **quality gates**, not a new feature wishlist. In any conflict: repository safety/scientific integrity always wins; the newest *Living Observatory* references win over old visual mockups. This is an original NASA-inspired educational/scientific product, **not an officially endorsed NASA safety system**.

## A. The ambition and the boundary
Build a distinct, genuinely excellent **microgravity fire-science observatory**, not a space-game template or a science-dashboard clone. Meet or exceed the engineering polish of the friend's Exovisionaries public project while solving a **different problem**: explain and responsibly compare microgravity combustion evidence. The quality reference is its tested gameplay properties—state transitions, meaningful consequences, correction/retry, responsive storytelling, save/recovery—not its copyrighted UI, characters, assets or scenes. Never make a claim of guaranteed contest victory, scientific validation or operational fire safety.

**Non-negotiable hierarchy:** (1) authentic research evidence and responsible interpretations, (2) a differentiated user journey that makes that evidence usable, (3) memorable interactive gameplay expressing the same evidence, (4) fast and accessible implementation, (5) extra decorative polish. If facing a deadline, cut decoration, not citations, completion or testability.

## B. Three recognizable signature experiences

### 1. Gravity Lens — the first 15 seconds
On the homepage, show one beautiful, fast-loading, spatially composed **living flame** with excellent typography and breathing room. The user can switch between labeled *Earth illustration* and *microgravity illustration* and immediately see both shape and a readable causal explanation. This is an **illustration**, not a combustion CFD solver or live ISS feed. One-click jump to a real source-backed experiment. Load with a beautiful static frame and defer WebGL until it is genuinely needed. Mobile users and reduced-motion users get equally meaningful textual/2D content. No page-long particle wallpaper and no fabricated measurements in the hero.

### 2. Evidence Loom — a research interaction, not KPI cards
Create a distinctive core research interface that joins a **question** to a **study**, an **observed outcome**, its **original citation**, and its **limitations**, in a traceable chain. Desktop can use three adaptive zones: left scientific parameters/filters; center inspectable evidence chain or comparison; right expandable source/uncertainty drawer. Mobile becomes a linear evidence sequence with no tiny labels. Every evidence chip is keyboard-accessible; source links lead to real locations. Users can choose two experiments, see which dimensions actually differ, and receive an explicit *not directly comparable* warning. Provide plain-language and advanced scientific interpretation modes using the **same verified underlying data**. An LLM explanation may enhance this, but source browsing must work without an LLM.

### 3. Evidence Passport — the bridge between game and research
A mission choice is never just points. It creates an inspectable, versioned entry containing mission ID, experiment IDs, observation type, evidence level (direct/analogous/mechanistic/gap), player conclusion, correction history, limitations and a canonical source link. Players can reopen the science from the passport. The last fictional lunar-habitat mission reads previous passport entries and asks the player to distinguish **documented findings**, **reasonable extrapolations**, and **unknowns**. Export must not call it operational safety certification.

## C. Five distinct worlds and game loops

| Mission | Distinctive scene and interaction | Must carry forward |
|---|---|---|
| 1 — Station Arrival | Station observatory; navigate a small purposeful 3D space, inspect a credible research question, learn controls from PIX | Mission objective and first cited question |
| 2 — BASS-II Assembly | Instrument bench with an engineering cutaway; snap independently named parts; fix a deliberately seeded but recoverable configuration fault | Validated assembly state, correction log |
| 3 — Flame Detective | Investigation cinema with documented experiment footage or source-specified stills; make falsifiable predictions and reconcile observations | Prediction vs measured/recorded result, citation and uncertainty |
| 4 — Claim Trial | Evidence chamber; compare conflicting cards, discover missing experimental controls and reject an unjustified claim | Reasoned evidence-level classification |
| 5 — Lunar Habitat | Fictional lunar research setting with multiple defensible options and incomplete direct evidence; write an evidence-backed provisional recommendation | Final Evidence Passport case report with limitations |

Every mission has a unique primary mechanic, teaching goal, scene silhouette, lighting identity, progress state, failure/recovery and a demonstrable ending. Do not pad the campaign with five variants of quiz cards. Preserve scientific uncertainty: never claim the fictional lunar outcome is a NASA-tested safety prediction.

## D. Premium visual direction: originality without clutter
- Create a small **art bible** with typography scale, grid, spacing, materials, camera positions, motion timing, flame-shape vocabulary and documented color usage. Review every completed route against it.
- Editorial research surfaces: deliberate white/graphite negative space, strong typographic hierarchy, rare meaningful amber/cyan highlights. Readable sources, tables and graphs outrank cinematic effects.
- Interactive 3D surfaces: stage-managed cinematic framing, clear foreground/midground/background, physically coherent PBR lighting, art-directed composition and controlled micro-animation. No indiscriminate bloom/glassmorphism/neon and no floating panels obscuring objectives.
- Pixar-like memorability is not a license to imitate another company's character. PIX must be an original friendly **robot identity** with consistent proportions, color accent, expressive gestures and purposeful scientific assistance. Create turntable views / rig tests before spending on variants.
- Mission transitions are short and meaningful. Use motion to explain physical causation and navigation, not to prolong load time. Sound effects are user-controlled, captions provided and nothing autoplays loudly.
- Use actual media only where rights and attribution are verified. Never fabricate a scientific image, quote, flame behavior, measurement, graph, or NASA endorsement.
- Capture at least one full-size desktop **and** mobile screenshot of each important completed route, compare against the latest ten visual references, record discrepancies and fix before calling it finished.

## E. Meshy: buy visual distinctiveness, not unnecessary geometry
Spend approved Meshy credits on hero **PIX**, astronaut, modular lab and lunar environmental pieces where generation saves genuine time. Favor a reusable, editable kit of small modular models over giant fused rooms. Use Blender Python/Three.js for the accurate BASS-II duct, nozzles, holders, alignment constraints, pivots, colliders and measurement overlays. Confirm actual API balance and whether plan credits can be spent through the API **before calling any billable endpoint**. If unavailable or additional costs apply, prepare prompts for manual Meshy Studio generation + owner-approved GLB import. Record each task's approval, credits and result in `docs/asset-manifest` or an equivalent file. Do not spawn parallel paid jobs or unlimited retries. Optimize all scene files after import.

### Per-asset approval checklist
Original design and proper permissions; correct scale/orientation/units; no obvious topology artifacts; sensible material count; no mysterious background geometry; movable pivots where needed; rigged characters animate correctly; compressed GLB actually renders on Android/macos; collision proxy verified; named submeshes for interactive parts; documented memory, triangles, draws and download size. Scientific apparatus uses independently verified dimensions where sources exist, never imagination dressed as fidelity.

## F. Product and quality acceptance targets — measure; never fabricate
These are project **targets**, not promises or a claim that every machine will meet them. For representative lab-tested pages on an emulated mid-tier mobile connection, aim for LCP <= 2.5 s, INP <= 200 ms and CLS <= 0.1. Aim for 60 fps desktop and >=30 fps reasonable mobile during representative 3D interaction, without claiming those numbers absent frame-time profiling. Set and record practical per-scene GLB/download and texture memory budgets **after the first prototype**, not from guesses. Use lazy loading, LOD, KTX2/meshopt when tool compatibility permits, a static/2D fallback, and no-WebGL recovery. Research UX must remain useful while heavy scene bundles are unloaded. Target WCAG 2.2 AA, usable 360/390/768/1024/1440/1920px layouts, robust keyboard/tab/focus, contrast, caption, touch, reduced-motion and colorblind-friendly plots.

### No cosmetic QA passes
For each major feature require: (1) real starting data or labeled example, (2) user action, (3) visible cause-and-effect, (4) explanation and canonical provenance, (5) errors and retry, (6) persistence if applicable, (7) tested mobile/desktop, and (8) an authentic screenshot or short recorded test trace. A beautiful feature that can't be used fails; an accurate feature users can't understand also fails.

## G. Evidence integrity: make global usefulness concrete
- Publish a dataset/source coverage inventory with program, record counts, source types, freshness/accessed dates, supported parameters, absent fields and exact validation status. Never advertise total counts until audited.
- Create a **source-to-claim trace test**: choose facts from canonical documents, confirm their page/section locator and displayed interpretation, including a test for contradictory or uncertain outcomes.
- Rank questions or findings with documented formula and evidence evaluation on a hand-labeled query set. Report actual retrieval metrics and uncertainty, including fail cases. Do not substitute flashy leaderboard scores for scientific validation.
- Test three user journeys: a nontechnical child/parent or educator, a technically competent student, and a research-oriented evaluator. Confirm each can locate an observation and understand its limitation **without trust in AI-generated prose alone**.
- The global impact page needs an actual plausible use case, cited research outputs, localized plain-language mode where feasible, and a **measurement plan**. Don't invent adoption, partner names or operating metrics. Keep optional future internationalization ready rather than delay the evidence core.

## H. Delight and presentation discipline
The judge / first-visit tour must be runnable in approximately 90 seconds as a scripted interaction: question → source-backed experiment → controlled comparison → unsupported leap flagged → meaningful game action → Evidence Passport. Test it offline/with deterministic fixtures and with API failures. An animated trailer cannot stand in for a working flow. Voiceover and screenshots are supporting material only. Include progress UI, retry, empty data, source unavailable, missing Meshy asset, slow GPU, disconnected internet, and user dismissal of animations.

## I. Conflict and escalation rules
Claude owns visual quality, interaction scenes and human experience; Codex owns scientific contracts, data correctness, deterministic rules and verification. They share interface schemas and integration tests; neither may silently change source IDs or claim classifications. Both must independently audit the other's output at integration gates. Prioritized blockers: fake/unsupported science > broken safety/permissions > non-playable released feature > lost evidence/persistence > inaccessible core > slow/inconsistent UX > visual polish > new features. Owner approves purchases and production deployment. Never hide scope slippage behind an attractive Coming Soon illustration.

## J. Mandatory deliverables at each release gate
1. A `RELEASE_SCORECARD.md` with actual PASS/FAIL/NOT TESTED evidence, no made-up test results.
2. Screenshot set for home, a source dossier, comparison, scene, passport at desktop and mobile sizes.
3. Scientific claim-provenance audit sample, retrieval test outputs and an honest incomplete-data list.
4. A tested E2E flow transcript/video reference including an intentionally failed interaction and recovery.
5. Meshy spend ledger (including zero-spend status) and performance report with actual methodology.
6. A feature-status registry audit proving Coming Soon/Locked/Blocked/Preview behavior matches real implementation.
7. An integration checklist jointly signed off by agent reports and **human owner approval** for public release.

**Never assert excellence from a prompt alone.** A release earns its quality label only through working behavior and verified results.
