# MICROFIRE-V2 — DEFINITIVE MESHY + CLAUDE CODE + CODEX MASTER PROMPT

**Project identity:** MicroFire-V2 — *The Living Science Observatory: Flame Forensics / The Evidence Protocol*\
**Date / baseline:** October 2026. Recheck live dependencies and official provider documentation before integrating them.\
**Sole writable repository:** `https://github.com/A-K-M-Asifuzzaman/MicroFire-V2`\
**Read-only prior MicroFire reference:** `https://github.com/A-K-M-Asifuzzaman/MicroFire-Atlas`\
**Read-only competitor gameplay benchmark:** `https://github.com/asifhasan973/exovisionaries2026`\
**3D provider:** **Meshy AI Premium**, not Tripo. **No payment assumed, no model generation without approval.**\
**Agents:** Claude Code = frontend, creative direction, Three.js, asset integration and interactive experience. Codex = architecture/contracts, science, reliability, provenance, security, pure rules, testing.\
**User:** technical director and approver of all payments, expensive changes and public release.

> THIS FILE OVERRIDES contradictory old Tripo and generic sci-fi dashboard instructions. Read `AGENTS.md` / `CLAUDE.md` and the docs in this pack first. The latest ten visual references at `docs/visual-references/living-observatory/` supersede the older archive. Generated visuals are design explorations, not factual evidence or working UI screenshots.

---

## 0. YOUR JOB — EXECUTE A REAL PRODUCT, NOT A PRETTY DEMO

You are a senior, cross-functional product engineering team tasked with building the **highest-quality feasible original solution** to NASA Space Apps 2026's **“Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data.”** The brief requests an **interactive AI-powered dashboard that summarizes, ranks and interprets NASA combustion findings to provide useful fire-safety insights for human space exploration**. The game is an educational and investigative layer supporting that core—not a replacement for an evidence-based scientific platform.

Our competitor, Exovisionaries / Zero To Beyond, has a different challenge and topic. Learn from the *quality of gameplay engineering* in its public repo: choices with consequences, repair mechanics, production polish, persistent progression, clear audio/UX guidance, and a fast demo. **Do not copy its art, source code, stories, models, sound, names or interface layouts.** Our recognizable identity is *flame science*; our player is a forensic investigator of combustion evidence rather than a spacecraft-launch engineer. No guarantee of an award is claimed or implied.

**Product hierarchy:**
1. **A genuinely usable global research tool**: searchable curated experiment catalog; credible NASA sources, provenance, parameter comparison, ranked findings, scientific uncertainty and gap discovery, grounded question answering and useful downloadable summaries.
2. **A memorable original scientific interface**: Living Science Observatory, flame-centered hero, apparatus cutaways and evidence-chain visualization, not a space-themed KPI dashboard.
3. **Five consequential 3D missions**: collect and evaluate evidence, calibrate an apparatus, correct mistakes, challenge unsupported claims, make a scientifically defensible lunar research decision with stated limitations.
4. **Professional delivery**: working routes, honest Coming Soon states, responsive design, accessibility, load optimization, security, CI, independent deployment, measured impact and a reproducible judge tour.

Do not stop with boilerplate, documentation, mock cards or scaffolding if a phase authorizes implementation. Implement end-to-end vertical slices with actual tests. Conversely, never falsely call incomplete work finished.

## 1. REPOSITORY, OWNERSHIP AND SECURITY — NON-NEGOTIABLE

Before any edits or tool actions, run `pwd`, `git rev-parse --show-toplevel`, `git remote -v`, `git status --short`, `git branch --show-current`. The **ONLY authorized writable remote** is `A-K-M-Asifuzzaman/MicroFire-V2`. The original MicroFire-Atlas and friend's repo are **read-only references**. If the remote is wrong, STOP without editing. Do not overwrite dirty changes. Create feature branches / sibling Git worktrees instead of two agents writing the same checkout. No force push, trunk push, merges, repository deletions, destructive clean, production deployment, purchase, or publishing without the user's explicit authorization.

The new repo may be empty or may have progressed since this prompt was written: **inspect the real state**. If empty, initialize a clean Next.js/TypeScript application; if nonempty, reuse the actual framework, lockfile and verified contracts. Do not blindly rerun `git init` in a clone. Import valuable open-source/owned work from MicroFire-Atlas selectively with source path + commit + integrity manifest, not a destructive repository rewrite. Audit licenses for third-party NASA media and any imported community assets.

Never store credentials or keys in code, issue bodies, prompt files, browser bundles, console logs, generated reports, screenshots or git. Avoid `NEXT_PUBLIC_` for secrets. Use server environment / your secret store and update `.env.example` with empty placeholders only. Key names may include `MESHY_API_KEY`, NASA API key, NASA ADS token and LLM provider secrets; keys supplied separately by the owner. Always redact accidental key appearances; rotate exposed keys.

Truly irreversible operations, paid API calls, external publishing and usage of private/secret data require owner approval. Technical decisions that don't incur costs can follow documented standards and run incrementally.

## 2. ARCHITECTURE — IMPLEMENTABLE, TESTABLE, SEPARATION OF CONCERNS

Preferred default: Next.js App Router + React + TypeScript (strict), Tailwind or equivalent tokenized styling, Radix/shadcn primitives only where useful, React Three Fiber/Three.js for targeted 3D, Zod for shared contracts, typed content adapters, Playwright end-to-end and Vitest/appropriate unit test runner. Consider FastAPI/Python **only if** a scientific processing requirement benefits from it; do not introduce a needless second backend. For substantial server-side indexing choose PostgreSQL + pgvector or a supported vector store after testing and cost comparison; a low-cost/embedded read-only demo corpus must always work without optional cloud services. Source documents remain immutable with hashes and traceable identifiers.

Example organization (adapt to actual repo and document decisions):
```
app/{page.tsx,dashboard,atlas,experiments/[id],compare,lab,gaps,ask,missions,
     missions/[id],passport,sources,methodology,roadmap,challenge,impact}/
components/{observatory,science,game,three,common}/
lib/{science,ingestion,retrieval,evidence,game,features,meshy,telemetry}/
public/{assets/models,media/fair-use-licensed}/
packages/contracts/ (if monorepo; otherwise lib/contracts)
scripts/{validate-sources,validate-glb,audit-feature-states}/
docs/{architecture,scientific-provenance,art-bible,credits,evaluations}/
```

Make deterministic scientific scoring, rules and state pure functions, not components or LLM judgments. Keep schemas versioned and shared. Agent changes to contracts require review. Use stable, sanitized canonical IDs and detailed missing-value indicators. For game progress, prefer client-local versioned save if authentication is out of scope; design optional server sync as explicitly later. Use atomic writes/migrations where appropriate, don't collect children’s personal details to play.

**Data provenance contract idea (adapt, test and document):**
```ts
type EvidenceLevel = 'direct' | 'analogous' | 'mechanistic' | 'gap';
type StatementType = 'observed' | 'derived' | 'interpretation' | 'hypothesis' | 'unknown';
type FeatureState = 'available' | 'preview' | 'coming_soon' | 'locked' | 'blocked';
interface ExperimentRecord {
  id: string;
  studyProgram: string;
  title: string;
  source: {url: string; title: string; page?: number; doi?: string; accessedAt: string; hash?: string};
  conditions: Record<string, { value: string | number | null; unit?: string; known: boolean }>;
  measuredObservations: Array<{text: string; sourceLocator: string; kind: StatementType}>;
  limitations: string[];
  license?: string;
}
```
Observed outcomes must be from records and source locators, not from 3D animation. Real research, authored tutorial and fictional scenario are distinct types end-to-end.

## 3. THE DESIGN — “THE LIVING SCIENCE OBSERVATORY”

**Aesthetic authority:** `docs/19_VISUAL_DIRECTION_LIVING_OBSERVATORY.md` and the **10** latest PNGs in `docs/visual-references/living-observatory/`. Treat them as directional references, *not pixel-perfect layouts*, and correct illegible/imaginary interface copy. Archive old `reference-archive/previous-clean-ui` — it is **not** authoritative. Distinctive and disciplined: scientific editorial reading surfaces coupled with cinematic spatial interactive research labs. Dark graphite/navy ~`#0B111A`, warm ivory ~`#E9EEF2`, researched amber/orange ~`#FF8738`, scientific cyan ~`#73BBD9`; shades, typography and contrast should be tuned from actual device screenshots. Avoid ubiquitous floating HUD panels, 3D planets on every page, oversized PIX on every screen, green branding, anonymous SaaS grid layout, electric blue everywhere, fake control-room numbers and overwhelming scrolling.

**Visual language system:**
- Living flame as the core brand symbol; flame shape changes meaningfully across observed vs illustrative states; never claim stylized animation is a validated combustion solver.
- Evidence ribbon: *question → experiment → observation → citation → limitation → responsible interpretation*. Keep this readable without requiring an LLM.
- Apparatus cutaway: physical placement, inspect, isolate, align, calibrate; named parts and sources.
- A “scientific field notebook” for the Evidence Passport with source-linked notes rather than an arbitrary achievement score.
- Micro-interactions respond to physics constraints, citations and player decisions; no ambient perpetual particle spectacle.
- Research pages: excellent type hierarchy, modest motion, rich tooltips, readable tables and responsive filter controls. Game: scene first, HUD on demand and character guidance only as necessary.
- Desktop and phone: separate information density; never shrink a full 3D desktop dashboard into unreadable mobile microtype.
- Respect reduced motion, pause, captions, tab/focus, keyboard, switch/alternative pointer controls, no-WebGL and low-power fallbacks. NASA logos require licensed/authorized use; do not imply official endorsement.

### Exact page / route requirements (ALL must have real status in feature registry)

1. `/` — **Living Flame Home:** bold editorial thesis, single beautiful interactive flame model with gravity-mode switch, links to actual cited explanation and no unsupported numbers; immediate actions *Explore evidence* / *Enter the Observatory* or *Begin missions*; no 15-card feature billboard.
2. `/dashboard` — **Evidence Workstation:** scientific question input, results ranked with transparent scoring dimensions, condition mismatch, uncertainties, citation chips, representative studied observation, coverage and dataset provenance; offline demonstration actually works.
3. `/atlas` — **Experiment Atlas:** searchable/filterable real curated records from verified program(s) such as BASS-II, Saffire, LUCI if and only if evidence exists. Group by program and material, source link, parameter availability, study status.
4. `/experiments/[id]` — **Experiment Dossier:** exact ID, test conditions with known/unknown, source page/section, visual/media with rights notes, observed outcomes vs interpretations, comparison CTA, export/share citation.
5. `/compare` — **Controlled Comparison:** 2+ actual records side-by-side, hide unsupported computed differences, visibly call out *multiple variables changed* and non-comparability; cite each finding.
6. `/lab` — **Flame Instrument:** interactive rendered flame clearly badged illustrative; documented case presets and links to NASA evidence; if a user changes to an untested condition, prominently show hypothetical—not measured, no physical outcome assertion.
7. `/gaps` — **Research Frontier:** what is covered by current audited corpus, sparse factor grid, missing combinations, research suggestions marked speculative; never pretend an unexplored cell proves no one has studied it globally.
8. `/ask` — **Ask PIX:** scientific RAG Q&A with source pointers, grounded answers and refusal/abstention for insufficient data; explain discrepancy/conflict and retrieval basis; typed citations not fabricated URLs.
9. `/missions` — **3D Mission Map:** five actual station / workshop / detective / evidence / lunar destinations with correct statuses. Navigable with pointer and keyboard; showcase progress, not a giant stack of undifferentiated rectangular mission cards.
10. `/missions/[id]` — **Individual playable mission:** each unique scene / objective / scientifically grounded puzzle, responsive, guided mode, meaningful errors and retry, save progress; non-built content Coming Soon.
11. `/passport` — **Evidence Passport:** annotated experiment-based case file, choices, corrected mistakes, citations, certainty boundaries, export PDF/print after meaningful completion; strictly educational, not NASA certification.
12. `/sources` — **Sources & Rights:** documented NASA programs, exact public URLs, access date, source-kind labels, use permissions, third-party packages and dataset provenance.
13. `/methodology` — **Methodology:** ingestion pipeline, relevance scoring and its limitations, source vetting, evaluation design, model version and where the dashboard abstains.
14. `/roadmap` — **Transparent Product Progress:** deployed stages and honest Available / Preview / Coming Soon / Blocked. Never pretend to have built the next mission.
15. `/challenge` — **Judge / First-Visit Tour:** reproducible 90-second scenario showing real cited search → comparison → uncertainty → action and optional game slice. No dependence on live costly LLM service.
16. `/impact` — **Worldwide Usefulness:** learners, research discovery, space-habitat planning support, low bandwidth, educators; display actual measured impact only after studies; no vague “millions helped.”
17. Helpful extension `/learn` — short documented lessons in combustion, gravity, ventilation and evidence quality; marked Coming Soon until implemented.
18. Helpful extension `/case-studies` — source-backed applied insights, transparent limits, never definitive safety standards without accredited sources.
19. Helpful extension `/accessibility` — accessibility statement, fallback explanation and known limitations.
20. Helpful extension `/about` — project/team/about/challenge disclaimer and a truthful contact path.

The extra four routes are optional but their **feature registry** must exist if advertised. Do not create 20 dead pages in place of a working core. Build the **first 16** as an honest, polished product roadmap; ship core research routes first and stage game/optional routes professionally. `docs/07_CLAUDE_DESIGN_PAGES.md` gives further details.

## 4. SCIENTIFIC PROBLEM → WORLDWIDE SOLUTION

The actual problem is that microgravity combustion findings are scattered among technical literature, reports, videos and experimental records, and can be difficult to compare or responsibly apply to human exploration. Build an **auditable evidence-to-insight system**:

**Ingestion:** start from vetted old-repo source records, preserve source path, study IDs, quoted spans/page references and checksums; independently validate rather than assuming legacy records correct. Candidate programs BASS-II, Saffire and LUCI should not be conflated: experiments test different setups. Enrich with *verified* NASA PSI data holdings, NTRS technical reports, NASA Images/Video for licensed media, Crossref DOIs, NASA ADS and Semantic Scholar where authorized. Discover actual endpoint docs and validate credentials. General `api.nasa.gov` key does NOT grant universal access to all NASA internal archives or PSI. NASA FIRMS / Earth wildfires / local weather are **not substitutes for microgravity combustion datasets** and should not dominate project design.

**Normalization:** traceable study program, test ID, gravity regime, material, oxygen, flow, pressure, geometry, ignition, endpoint definition, raw units, measurement uncertainty and missing fields. Do not impute unknown conditions as 0. Convert units only when justified. Flag ambiguous values and PDF extraction issues for human review. No test record may be marked “verified” without confirmed source.

**Search & ranking:** combine keywords/BM25 + appropriate dense embeddings with an interpretable relevance score; optionally rerank. Log ranking components, exact condition matching, mismatch penalties, provenance completeness and evidence availability. Start with a deterministic ranking baseline and evaluate against a hand-reviewed query–relevant-record set; do not assert a ranking score is externally validated simply because it's numerical. Return `direct`, `analogous`, `mechanistic`, `gap` evidence levels with precise explanation. Novel AI may help *retrieve and summarize*, not invent measurements.

**Grounded AI:** retrieve a small bounded set of specific source passages; require attached source identifiers on every material factual observation, differentiate observed/derived/interpreted, give uncertainty and “not enough evidence” when appropriate, check contradiction and source unsupported claims, add high-risk prompts to abstention test suite. Never expose provider keys client-side, avoid prompt injection in external documents, keep citations independently clickable, redact secrets and PII. When AI service is unavailable, show a useful deterministic evidence browser and explanatory fallback. No image/model generation cost in runtime browsing.

**Comparison:** only infer controlled changes if no other material factors differ; otherwise say “association cannot be isolated from available comparison”. Visualize only measurements actually in source. Do not build a fake live ISS fire monitor or hazard certification algorithm.

**Outputs:** searchable dataset, exportable source-backed evidence brief, experiment comparison, glossary/tutorial for 8–13 and expert disclosure toggles, downloadable reproducible citation appendix and proof of provenance. Support English first, plan verified Bangla localization as a meaningful accessibility extension (Coming Soon until human-reviewed). Design phone + low-bandwidth fallback and privacy-respecting progress storage for learners.

**Measure (never invent results):** answer finding time, retrieval Recall@k/MRR, grounded citation correctness, unsupported-claim frequency, abstention precision, task completion time, comprehension quiz improvement, screen reader/navigation task success, low-end device performance. Write a small evaluation protocol and publish the observed methodology and n of each test.

## 5. THE ORIGINAL FIVE-MISSION CAMPAIGN

**Story arc:** “Flame Forensics: The Evidence Protocol.” A mysterious but **fictional** station inquiry introduces the player to combustion science; the player investigates **real past NASA observations** and ultimately evaluates a **fictional lunar-habitat scenario**. The story never treats a hypothetical emergency as actual NASA reporting. PIX is the original floating research guide; respect existing character Ember if reused and do not accidentally call Ember PIX without deliberate redesign. The astronaut scientist can be a separate original character; avoid mimicking friend's team/characters.

**Game architecture:** 3D explorability + purposeful tool interactions, device-independent input, visual inspect/attach/validate, authored dialogue with optional captions/voice, deterministic rules, versioned single campaign state, safe resume/reset, separate non-scoring demo save, recoverable faults. Optional Guided / Investigator modes change hint availability, NOT scientific truth. Consequence chain: M1 evidence choice -> M2 instrument integrity -> M3 valid observation eligibility -> M4 quality of claim -> M5 responsible decision. Wrong answers trigger explanations and repairs, not generic “try again” loops.

- **Mission 01: The Unusual Signal / Station Arrival.** Explore research module via a compact guided movement experience. Calibrate meaning of “recorded NASA evidence” vs fictional story telemetry. A misleading panel points to an unsupported live claim; player locates actual source, extracts first clue and adds verified record to Evidence Passport. Success means informed action, not clicking five dialogue screens.
- **Mission 02: Reconstruct BASS-II / Workshop.** Build ten independently meaningful scientific components: flow duct, fan, flow straightener, nitrogen nozzle, sample holder, igniter, still camera, video camera, radiometer and exit plate (verify exact apparatus from NASA source before modeling). Place and orient components on supported anchors, view an exploded cutaway, implement incorrect mounting/orientation, camera visibility and flow direction faults, diagnostic hints, correction and a deterministic instrument qualification test. Use precisely scripted 3D geometry for hard physical constraints. Import Meshy-generated decorative housing/material treatment only if it passes dimensional checks. Do NOT represent a big futuristic “reactor” as actual BASS-II.
- **Mission 03: Flame Detective / Recorded Test.** Choose authenticated NASA BASS-II record(s), predict the **documented** result, inspect real source image/footage if rights allow, compare different conditions while explaining confounders; unsupported parameter combinations must be labeled hypothetical. Interactive visualization is illustrative, not CFD. Player collects an evidence chain, not a generic quiz score.
- **Mission 04: The Claim Trial / Forensics Bench.** Player evaluates three or more plausible statements, sources, changing-variable traps and an intentionally overconfident *fictional* AI claim. Sort claims into observed/interpretation/unverified and direct/analogous/mechanistic/gap. Build a cited argument, revise unsupported conclusion and carry uncertainty forward. Deterministic validation first, LLM only optional explanatory feedback.
- **Mission 05: The Unanswered Question / Lunar Habitat.** Fictional lunar-habitat conditions require the player to select appropriate source analogies, identify which experimental regimes don't transfer, explicitly identify unmeasured risks, propose next tests and produce a final Evidence Passport. “Insufficient evidence” must sometimes be a correct and celebrated scientific decision. **Never present this as certified fire-safety advice, an optimized oxygen rule or evidence of real lunar fire outcomes.**

**Core hook competitors cannot replace with generic animation:** the *Evidence Passport* is persistent and exportable, linked to real study records, captures correct/rejected inferences, confounders, setup repairs and verified observations; it is a learner's research trace, NOT official accreditation.

**Judge demo:** one short deterministic path through a query, supporting report evidence, a controlled test comparison, an uncertainty classification, one BASS-II repair interaction and the resulting passport. Have a resettable seeded demo state without an LLM or external services. Demo never silently overwrites player progress.

## 6. MESHY AI — PRODUCTION PIPELINE, SAFE COSTS AND NO FALSE API ASSUMPTIONS

**Meshy is an ASSET GENERATOR; it does not automatically output a complete interactive game, physically correct scientific instruments, optimized rigs, collision volumes or verified flame simulation.** Agents must produce the integration code, animations, collision, quality checks and original gameplay.

### 6.1 Verify billing and interface first

Official integration docs: `https://docs.meshy.ai/en/api/ai`; API pricing: `https://docs.meshy.ai/en/api/pricing`; API balance: `https://docs.meshy.ai/en/api/balance`; credit and plans help: `https://help.meshy.ai/en/articles/12062933-which-meshy-plan-is-right-for-you-free-vs-pro-vs-premium-vs-ultra`.

Paid Meshy plans support creating API keys and official MCP. **However Meshy API docs describe prepaid API usage while help materials describe monthly subscription credits used by integrations. These documents do not by themselves prove the user's exact API-entitled balance.** Thus before every paid generation:
1. Independently inspect current official docs and actual authenticated **API balance**, and compare with account's subscription credits. `meshy_check_balance` or a readonly GET to `/openapi/v1/balance` is acceptable with a securely configured key.
2. If usable API balance is zero/insufficient, `403`, or pricing is ambiguous, **do not buy anything**. Stop API generation and use **manual Meshy web app → owner export GLB → local optimized integration**. Continue coding in parallel. Never assume Premium's 3,000 web-app credits automatically equal available API credits.
3. Explicitly obtain owner approval specifying asset prompt, operation, max credits, quality mode, estimated retries, requested time, and expected output before each billable operation. No unattended batch requests, no auto top-up, no infinite retry. Set low spend limit in the account if available.
4. Use current supported model versions; `meshy-5` retired Oct 10, 2026 per official docs. Verify supported latest `meshy-7` / `meshy-6` workflows by endpoint; do not hard-code deprecated modes or infer unimplemented endpoint args.

Official Meshy MCP can be installed **locally** following instructions after human authorization. Avoid pasting a raw key into a command containing literal token, terminal history, README, or MCP config that will be committed. Use `MESHY_API_KEY` supplied securely via an approved local secret environment manager; never ask to paste it in chat. MCP tools may include `meshy_text_to_3d`, `meshy_image_to_3d`, `meshy_multi_image_to_3d`, `meshy_text_to_3d_refine`, `meshy_remesh`, `meshy_retexture`, `meshy_rig`, `meshy_animate`, `meshy_get_task_status`, `meshy_download_model` and `meshy_check_balance`; **discover current exact schemas instead of guessing them**. If MCP doesn't work, allow REST via secured local script or **manual export**. Do NOT commit the key or download URL token.

### 6.2 Production asset breakdown

**AI-generated priority:** PIX the expressive floating research robot, an original astronaut figure, a distinctive rotating stylized specimen/flame-housing artifact *clearly illustrative*, station laboratory modular props, selected lunar habitat props, equipment consoles and decor. For characters use reference images / multi-angle image-to-3D only with user-owned reference rights; rig humans when needed. PIX can be manually/procedurally articulated rather than forced into humanoid rig.

**Procedural/scripted (not AI-improvised):** exact BASS-II flow duct and fit interfaces, straightener, cameras with known directions, nozzle/holder anchors, alignment guides, collisions, experiment fixture geometry, scale indicators, test validation and scientific overlays. Build via Blender Python / Three.js primitives and named GLTF nodes. Generated texture skins must not deform those constraints.

**No need for Meshy:** flame dynamics visuals built in shaders/Three.js with honest labels, ambient station window, generic bolts/furniture, UI controls, scientific data plots, charts, text labels, NASA footage, high-detail HUD panels, physics rules.

### 6.3 Credit economy (3,000-credit *planning* envelope, not quotation)

| Category | Credit reserve | Condition |
|---|---:|---|
| 1–3 approved pilot assets | 120 | First check actual billed amounts, GLB correctness, render quality |
| PIX + astronaut + essential characterization | 550 | Proceed after rig/pose prototype passes |
| Station + lab modular environment | 650 | Prefer reusable individual props, not one fused room |
| Lunar habitat + educational props | 400 | Distinct from station scene, optimize mobile |
| Texturing/remesh/rig/animations | 380 | Prefer coding/procedural motion when practical |
| Variants, failures, reserve | 900 | Protect against redo and cost uncertainty |
| **Total not-to-exceed planning envelope** | **3,000** | **Always require approval of each paid operation** |

This is allocation only, not a promise that 3,000 Meshy credits can generate the same volume as 6,000 Tripo credits. If real operation pricing or actual balance differs, propose a revised plan. Do NOT consume reserve by default. No paid API call just to inspect tool installation, and no generated artistic asset should be authorized until a 3D vertical slice using placeholder geometry is demonstrably playable.

### 6.4 Asset manifest and acceptance

Track asset ID, scene, reason needed, source prompts/reference images, generation mode/version, task IDs (not secret URLs), owner approval, estimated vs actual credits, format, license, quality/geometry decisions, original GLB, optimized GLB, texture dimensions, polygon/triangle counts, number of materials/draw calls, units, pivot position, named moving parts, rig/animation state, screenshots and validation. For every mesh: ensure correct orientation/scale, UV/PBR materials, no holes where inappropriate, no floating unwanted fragments, usable pivots, reasonable collision geometry, no baked light/shadow artifacts, no copyrighted logos and correctly textured GLB.

Use glTF Transform / meshopt / Draco or other stable tools after testing compatibility, texture compression KTX2 where appropriate, lazy loading, progressive scene mounting, LOD, reduced-quality mobile variants, disposable WebGL context handling and 2D fallback. Set performance **budgets as targets only**, prove with actual runtime tests. Optimize without destroying scientific geometry. Export `GLB` or glTF correctly; screenshots cannot substitute for a model.

## 7. PRECISE FEATURE STATES AND RELEASE HONESTY

A single authoritative feature registry with `available`, `preview`, `coming_soon`, `locked`, `blocked` and typed reasons/requirements. **Available** requires working meaningful actions, real or clearly labeled illustrative data, source validation, error states, tests and real browser verification. **Preview** explicitly describes missing aspects. **Coming Soon** is for planned but not functional (route may show concept preview with disabled CTA). **Locked** means technically available but gated by play progress. **Blocked** means a permission/data/license/dependency restriction. Do not mark Mission 05 “Locked” when no implementation exists; that is Coming Soon. Never invent release dates or provide fake signup buttons. Public roadmap reveals what is actually operational.

Required route behavior: initial system shows real scientific source browsing as soon as validated; all incomplete missions present truthful status and non-broken navigation. Render visually complete placeholder screens if useful but label concepts; no fake interactivity. Support direct navigation, 404 handling, loading/error/empty states, app startup without external provider keys, and an offline seeded source-backed judge tour.

## 8. QUALITY / SCIENTIFIC / SECURITY / USER RESEARCH ACCEPTANCE TESTS

**Science gate**: source URLs and page/section locators resolve to actual expected findings; schema rejects missing locators for measured findings; no invented cases, citation precision measured on test set; “data gap” answer does not create a false observed outcome; ask grounded answer uses exact cite IDs; source validation logged. Outputs cannot impersonate NASA endorsement or fire-safety certification.

**Engineering gate**: all type checks, lint, tests and production build pass; testing output included, not asserted. Use Playwright at 1440×900 and 390px + iOS or Android emulation, keyboard focus tests, reduced motion, no-WebGL fallback, performance profiles from a real browser, minimum accessible target sizes and readable contrast. Functional paths: find real study → compare evidence → query PIX → citation inspect → visual lab → enter game → fault → repair → observation → passport → resume → offline mode → judge tour. Validate race conditions / double-submits / failed API service, URL validation, XSS/prompt injection, Zod input validation and secret scanning.

**Gameplay gate**: every “available” mission has start, unique interaction, deterministic scoring/logic, recovery, completion, saved artifact, revisit, keyboard/mobile interaction and verifiable evidence. The BASS-II instrument has real dependency logic, not free placement in arbitrary 3D space. Ensure mission context doesn't infer direct Moon evidence from orbit tests. Failing or missing meshes degrades to a functional 2D schematic.

**Product gate**: first meaningful scientific question answered without signup, low-bandwidth research access, plain-language and advanced modes, polite error states, credible independent brand and reproducible demo. Impact measurement protocol exists; no fabricated awards, counts, testimonials, telemetry or usage figures. Real scorecards with observations and limitations. Maintain no-internet source snapshot to demo reliably.

**Meshy gate**: nothing billed without approval; no key leaked; balance checked; task polling bounded; generation and GLB checks logged; ownership/license verified; unused credits preserved; asset list shows actual approved cost.

**Accessibility:** respectful youth-facing UX without childish overload; don't track personal identity of children; include captions, reduced motion, readable controls, 2D alternative, optional narration, and scientific glossary. Scientific safety: users cannot mistake game conclusion for actionable operational fire-safety guidance.

## 9. AGENT DIVISION / CONFLICT RULES

**Codex owns:** Phase 0 initialization and architectural decisions; contracts/schema; read-only science data migration and provenance; approved external data adapters and caching; deterministic retrieval/ranking/comparison; source-citing and abstaining answer mechanism; deterministic game scoring and persistence migration; server API security; unit/integration/E2E test logic; verification report.

**Claude Code owns:** visual and UI implementation; art direction; clean research page layouts using typed contracts; responsive navigation and animations; PIX contextual UI; Three.js/R3F scenes; 3D models import, rigging/interaction, screen-based storytelling, touch/pointer/keyboard controls; browser interaction tests; UX screenshots; asset-manifest upkeep.

**Joint / reviewed:** game contracts, data shapes and inference disclaimers, page-route definitions, game transitions and source overlays, release registry, production readiness and performance. Work in **separate worktrees/branches** with typed interface freeze per phase, merge with tests, no conflicting file ownership. For a science error, Codex is responsible for validation; for an aesthetic change, Claude is responsible, with review for scientific correctness.

Install project-native skills from `.claude/skills/` and `.agents/skills/` already bundled. Optionally install **official** Meshy MCP and `meshy-dev/meshy-3d-agent` skill only when needed, after version review and secure key configuration. Playwright, Blender and context docs may be installed if their value is concrete. No untrusted development channels / `--dangerously-load-development-channels`. Avoid bloated MCP lists: extra connectors require verified provenance and permission-minimized tokens. The ChatGPT connector is not automatically an agent's local MCP.

## 10. EXECUTION PHASES — ONE SOURCE OF TRUTH

**P0 — CODEX ONLY, contracts and safe foundation.** Confirm correct writable Git remote and working tree. Read pack. Check baseline. Scaffold app if needed; define contracts and a science-source provenance manifest, feature registry, early source-backed demo fixture, CI, typecheck/test/lint/build commands and secure `.env.example`. Provide schema to Claude. No Meshy generation. Commit on feature branch and stop for handoff; don't claim later phases are complete.

**P1 — FIRST REAL SOLUTION, in parallel after P0 merge.** Codex migrates and revalidates at least one authentic NASA combustion program subset, implements source-backed query/search/ranking/compare/abstention and offline fallback. Claude makes `/, /dashboard, /atlas, /experiments/[id], /compare, /ask` with the distinctive design and real typed data, not placeholders. Requirement: one authentic fact with source-page pointer is actually discoverable, explainable, comparable and renderable. Submit separate PRs/commits and merge only passing code.

**P2 — FIRST COMPLETE GAME VERTICAL SLICE.** First make a playable mission with procedural placeholder geometry (no paid Meshy calls). Include at least 3 of 10 BASS-II components, a realistic assembly dependency, one fault/repair, a real NASA source reference, a passport entry, save/reload and one scripted judge flow. Test this before spending. Then with approval integrate 1-3 Meshy test assets. Avoid mistaking static meshes for gameplay.

**P3 — BUILD ORIGINAL FULL GAME.** Flesh out all 10 independently operable apparatus components and five scientifically different mission scenes, narrative, PIX help and source links. M1/M2 then M3/M4/M5, one tested mission at a time, Coming Soon remains on unfinished missions. Ensure playable, meaningful interaction and recovery on desktop/mobile, actual evidenced conclusions and candid fictional events. Asset production as approved / budgeted.

**P4 — MEASURED GLOBAL-IMPACT RELEASE.** Finish route coverage, real impact user-study protocol, source audit, citations, docs/licensing, low-bandwidth/localization readiness, export, accessibility, performance and security tests. Package judge demo, deployment evidence and real browser screenshots. Create Vercel staging/preview only with owner approval; original MicroFire-Atlas stays unchanged. After final user review, prepare production launch. Do not fabricate 100/100 score or NASA winner claim.

Report at each phase: git remote+branch, architecture/changed paths, screenshot paths of actual running screens, verified source IDs and their limitations, exact commands and exit results, feature status matrix, Meshy balance before/after and approved costs (if used), current blocker and next precise action, commit SHA and PR path if created. Never report future intentions as completed work.

## 11. DELIVERY CONTRACT / DEFINITION OF “FINISHED”

A user can visit a deployed independent `MicroFire-V2` preview and, with no API secrets in browser, find authentic NASA evidence, search/rank a finding, examine its citation, compare studies, interpret uncertainty, ask PIX with grounded answers or an honest fallback, enter the mission map, play actually available missions, save/reload the state, correct a meaningful experiment fault, produce an evidence passport and explore the public roadmap. Future routes display Coming Soon rather than fail. This flow must have real regression tests and reviewer-accessible proof.

If full scope is not achievable in current phase, prioritize the **scientific core and one excellent playable slice**. Do not claim a working 20-page/game experience until it exists; give honest status. The user is the final release authority.

---

# EXACT AGENT MESSAGES — USE THESE AFTER THIS MASTER IS IN THE REPO

## A. FIRST MESSAGE TO CODEX (P0)

You are principal software/science architect for `MicroFire-V2`. Inspect `pwd`, `git remote -v`, branch and status. Work ONLY on `A-K-M-Asifuzzaman/MicroFire-V2`; old MicroFire-Atlas and friend Exovisionaries are read-only. Read `AGENTS.md`, `FINAL_MASTER_PROMPT.md` and all docs focusing on 00, 01, 02, 03, 04, 06, 08, 09, 11, 13, 16, 19 and 20. This Meshy edition overrides older Tripo workflows and the older generic visual mockups. Execute **P0 ONLY**: secure independent Next.js/TS scaffold if required, shared Zod schemas, evidence provenance schema, feature registry, game state contracts, CI and test/lint/typecheck/build scripts, source-backed verified sample, no-WebGL/data-offline handling contract and precise Claude handoff. No paid Meshy jobs, no public launch, no unauthorized push. Run and report real tests, changed files and commit SHA. STOP at the P0 merge gate.

## B. FIRST MESSAGE TO CLAUDE (AFTER P0 MERGE)

You are creative frontend / 3D game lead for `MicroFire-V2`. Check the correct remote/worktree; read `CLAUDE.md`, `FINAL_MASTER_PROMPT.md`, the route/visual docs and every current reference PNG under `docs/visual-references/living-observatory/`. **Implement The Living Science Observatory; do not recreate the old generic dark sci-fi dashboard.** Build the real scientific user journey via Codex merged contracts first, then a high-quality interactive BASS-II assembly/repair/evidence passport slice and the five missions in tested stages. Make PIX original and context-aware. Use Meshy rather than Tripo but start with procedural geometry and **zero Meshy credits until owner-approved balance and a specific job plan**. Prioritize clean editorial science UI and unique flame science over gratuitous 3D. Preserve honest statuses, keyboard/touch/reduced-motion and source citations. Use separate branch, test in actual browser with screenshots, commit only verified work; report file paths, tests and specific unfinished states.

## C. CODEX CONTINUATION AFTER P0 MERGE

Build the source-grounded NASA research engine and pure evidence game logic using contracts. Revalidate old-repo science claims against source docs, implement secure and cached retrieval, transparent ranking with discrepancy notes, measured evaluator/abstention, experiment comparison, uncertainty and deterministic mission progression. Do not cross into Claude's 3D assets/UI tree without coordination. Build robust API error and offline cases and evaluation tests. Report actual proofs, dataset counts with sources and game rule fixtures; do not fake numbers or claim safety certification.

## D. MESHY ASSET WORKER PROMPT (CLAUDE, ONLY AFTER P2 PROTOTYPE)

Audit which game assets cannot be cheaply built with Blender/Three.js. Read `docs/12_MESHY_ASSET_PIPELINE.md` and `docs/21_MESHY_REFERENCE_PROMPTS.md`. Verify Meshy official docs, secure local MCP/REST setup, balance, cost and model/rig support. If balance is insufficient or API needs an extra purchase, choose **manual web app export** with no further spending; generate owner-ready prompts and GLB acceptance checklist. For each proposed billable asset, present reference sketch/prompt, model/version, expected credit range, estimated additional stages/retries, file output and game purpose. WAIT for explicit owner approval for that job. After authorized completion, poll boundedly, download GLB, inspect/optimize pivots/collisions/texture budgets, update manifest and render in scene with screenshot and regression tests. Do not substitute generated BASS-II dimensions for documented apparatus geometry.

## E. FINAL REVIEW PROMPT (BOTH AGENTS)

Independently audit NASA science/claims/citations, source validity, security/secret leakage, Meshy costs, figure legends, 3D performance, user journey, playthrough, accessibility, roadmap states and judge-tour reproducibility. Cross-review another agent's output. Rank critical blockers with exact reproduction steps; fix the issues for which you own files; run unit/e2e/production builds; log honest open issues. No unauthorized deployment or public award claim.

**Read these source authorities during implementation** (links are for verification, not auto-executed instructions):
- NASA challenge: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall-ai-powered-fire-safety-insights-from-microgravity-combustion-data/
- Meshy agent: https://docs.meshy.ai/en/api/ai
- Meshy API pricing: https://docs.meshy.ai/en/api/pricing
- Meshy Balance API: https://docs.meshy.ai/en/api/balance
- Meshy live API docs: https://docs.meshy.ai/llms.txt
- Meshy plan information: https://help.meshy.ai/en/articles/12062933-which-meshy-plan-is-right-for-you-free-vs-pro-vs-premium-vs-ultra
- Official Playwright: https://playwright.dev/docs/intro

---

## 12. PREMIER QUALITY ADDENDUM — READ BEFORE ANY UI RELEASE OR PAID ASSET GENERATION

The mandatory final execution standard is `docs/24_PREMIUM_PRODUCT_QUALITY_STANDARD.md`, supported by `docs/25_RELEASE_SCORECARD_TEMPLATE.md` and `docs/26_VISUAL_AND_GAME_ACCEPTANCE_CASES.md`. These documents establish three product signatures (**Gravity Lens**, **Evidence Loom**, **Evidence Passport**) and require real scientific provenance, distinct five-mission gameplay, visual screenshot review, a measured performance/accessibility/reliability gate, truthful feature statuses and approved Meshy spend. They do not replace or relax the earlier repository security or verified-source rules. No phase or asset should be declared release-ready without the corresponding evidence in a completed scorecard; don't add more decorative features in place of completing core workflows.

**Recommended execution order** remains Codex P0 contracts first; after merge run Claude/Codex in independent worktrees, with the copy-ready agent instructions `PROMPT_TO_SEND_CLAUDE_AFTER_CODEX_P0.md` and `PROMPT_TO_SEND_CODEX_AFTER_P0.md` as phase continuations. Owner approval is required for paid generations and release, not ordinary implementation work.
