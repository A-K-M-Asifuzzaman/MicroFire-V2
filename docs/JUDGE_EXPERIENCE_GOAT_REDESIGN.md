# MicroFire-V2 — Judge-First Redesign: Implementation Brief

**Status:** implementation brief, not a completed rebuild.  
**Base:** `main` at `f4c5e97` (judged release).  
**Working branch:** `feat/judge-first-guidance-20261113`.  
**Primary challenge:** https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/

## Mission

Turn the current research-plus-campaign product into a coherent, premium scientific experience. A judge arriving cold must understand **the question**, **the real NASA evidence**, **the dashboard's capabilities and limitations**, **five clearly different games**, and **what the final Passport proves** without oral coaching.

The challenge specifically requests an interactive intelligence-powered dashboard that summarizes, ranks, and interprets microgravity combustion research. The game is a learning companion to the scientific dashboard, not a replacement for it.

**Current, evidence-backed audit:**
- `apps/web/game/campaign/campaign-play.tsx` mounts the five public missions; server-authoritative decisions live in `packages/game-core`.
- `apps/web/game/missions/scene-viewport.tsx` maps station/detective/trial/habitat layouts through `mountStationScene`.
- `apps/web/game/missions/station-scene.ts` gives the 3D worlds the same cylindrical shell and blue ring ribs. Different props alone do not sufficiently distinguish the environments.
- `apps/web/game/campaign/bass-training.tsx` uses a dropdown/table even though a sophisticated `/missions/bass-assembly/tour` exists.
- `apps/web/components/static-pages.tsx` currently treats `/lab` as an unfinished route; the available Design B lab prototype is a **tour**, not a scientific measurement system.
- `apps/web/components/workstation.tsx` has source-linked ranking, example questions and conservative abstention. The README explicitly says PIX is fixed-template, **no AI model**.
- The true evidence state is **one admitted B20 test**, **55 quarantined legacy records**, and **three FLEX candidates not admitted pending independent review**. Preserve it.

## Product architecture (three clear journeys)

1. **Start Here — Guided Judge Tour.** Default prominent CTA on home and navigation. Gives a reliable, linear route: Gravity Lens → B20 primary source → Evidence Workstation → five missions → Passport. First implementation in this branch at `/judge-guide`.
2. **Research & Intelligence — the actual challenge deliverable.** One clearly labeled workspace with question composer, condition matching, observed data, support ranking, source citations, limitations and abstentions. Expose exactly what is deterministic vs genuinely AI-based. Do not advertise an AI model unless one exists and passes evaluation.
3. **Mission Campaign — five distinct interactions.** Missions have different visual worlds, control paradigms, goals and conclusions, while retaining server-side grading and anonymous-case persistence.

Navigation should remain 3-level at most; no duplicate/contradictory route names, stale “coming soon” badges, or ambiguous UX. Show a concise one-line reason to visit each page. Every important user journey has a visible Back / Next / Return to Tour route, but do not auto-advance server mission state.

## Five differentiated gameplay experiences

### M1: Source Hunt — orbital arrival (exploration)
- **World:** cinematic orbital arrival with airlock and real station interior, moderate first-person or orbit camera, no disorienting free movement. Scene is an original illustration.
- **Primary interaction:** inspect/scan, visually distinguish observed evidence from fictional narrative, collect citation cards; not another questionnaire.
- **Learning:** what a NASA report is, what is recorded, what is fictional.
- **Finish:** first sourced Passport entry; clear hatch transition to M2.
- **Controls:** highlighted station, next-step panel, keyboard/touch equivalents, explicit feedback.
- **Existing authoritative events:** `INSPECT_EVIDENCE`, `REVIEW_SOURCE`, mission completion; never override server rules.

### M2: BASS-II Engineering Workshop (spatial assembly and diagnostics)
- **World:** actual instrument workshop/engineering bench; use existing lab models and /missions/bass-assembly/tour as asset sources without bypassing any gated route or security.
- **Primary interaction:** 3D assembly slots, visible component placement and orientation, animated fault detection, repair and qualification. A synchronized accessible list/dropdown must always remain an equivalent fallback.
- **Learning:** a rig requires correct mounting and diagnosis; seeded failure is a **fictional training exercise**, not a NASA incident.
- **Finish:** qualification plus historical B20 inspection; server must still decide every action.
- **Technical:** view the same `installedPartIds`, `trainingStep` and `diagnostic` DTO. Never treat client-generated placement graphics as proof of accepted install. Do not make a 3D model's decorative position into a hidden required hit target.

### M3: Flame Detective — scientific prediction laboratory (predict–reveal–analyze)
- **World:** dark observation laboratory, cinematic sample chamber, instrument camera angles; visually unrelated to the M1 station corridor.
- **Primary interaction:** lock outcome prediction, reveal verified B20 observation, visually compare own prediction against NASA's documented outcome, examine experimental limits.
- **Dashboard:** evidence-vs-prediction comparison card, conditions strip (PMMA, calibrated 17.4 vol% O2 as sourced), evidence provenance.
- **Scientific rule:** no invented time series, flame speeds, extinction thresholds or other fabricated measurement. Illustrative flame effects must state they are illustrations, not B20 footage.
- **Finish:** nuanced conclusion with citations and causal limits.

### M4: Claim Trial — evidence courtroom (argument and source matching)
- **World:** tribunal/evidence board with four claim cards, source exhibit drawer and verdict board, not another corridor.
- **Primary interaction:** move/select a claim, classify its type and strength, attach the applicable source and note confounders. Keyboard click/selection parity mandatory; never rely only on drag/drop.
- **Learning:** observed, derived, interpretation, hypothesis and unknown are different. Citation lineage does not certify scientific truth.
- **Visual output:** each correct appraisal snaps into the case board with an explanation returned by the backend.
- **Finish:** defensible claim-review report, not a generic repeated B20 sentence.

### M5: Lunar Habitat — Moon exterior decision scenario (scenario planning)
- **World:** unmistakable Moon surface, terrain, horizon, habitat dome, life-support subsystem; no shared blue-ringed station interior.
- **Primary interaction:** inspect habitat schematic, compare orbital B20 conditions against hypothetical conditions, expose mismatches/unknowns, propose next measurements, make a provisional evidence-limited decision.
- **Dashboard:** source-vs-scenario matrix + gap visualization; unknowns visibly distinct from mismatches.
- **Scientific boundary:** cannot certify the fictional lunar habitat as fire safe or unsafe. Never silently infer unknown B20 pressure or gravity from location.
- **Finish:** decision with evidence gaps and next test; Passport conclusion must explain **why** it cannot certify.

## Shared mission guide

Each mission must display:
- an explicit one-sentence **goal**;
- why the task matters scientifically;
- **three step-by-step instructions** (without giving the correct answer);
- one visually obvious **next action** with label, not color alone;
- server feedback / error recovery; hints are informative, not cheating;
- progress (mission number, current step, Passport entries) and accessible Help toggle;
- how to navigate on desktop and mobile; 2D/no-WebGL equivalence;
- correct Back / Next navigation without bypassing authoritative server progression;
- no auto-restarted case, no forced login and no localStorage pretending to be durable server state.

The current branch implements a **first pass** of mission-specific instructions in `mission-guide.tsx`; this is **not** the finish line.

## Passport redesign

Show distinct task, recorded learner action, actual server acceptance, evidence claim, source locator and limitations for each mission. Presentation-only labels in this branch are provisional; the final source of action-specific detail should be the backend's existing accepted events or an intentionally versioned derived view. Do not fake novel NASA observations to create variety. Preserve the exact citations and restrictions on the accepted B20 claim.

## Flame Lab: real working function, not “Coming Soon”

Build a public `/lab` that provides a functional, educational and clearly labeled **simulation/illustration** where the user explores flame shape, buoyancy context, fuel and ventilation concepts using cautious presets, with scientific explanations and links to source evidence. Distinguish `illustration`, `authored toy model`, `sourced recorded observation` and `unknown` at every state. No invented calibrated NASA results, equations falsely branded as research-grade, or fake operational risk metrics. The BASS-II equipment tour can live beside this as a separate hardware learning module.

Update `packages/shared/src/features.ts` status only after the route works and tests exist. Check `apps/web/app/[...path]/page.tsx` route mapping so the current `LabPage` placeholder no longer shadows a new route.

## Scientific dashboard & AI implementation

1. Put **Evidence Workstation** front and center. Offer a few grounded example questions as quick starts, with immediate clearly explained results.
2. Add readable visuals **from actual available data only**: B20 conditions card, supported-vs-unknown evidence map, record-status coverage, query-to-citation trace, comparison/mismatch map. The one admitted record **cannot** support a meaningful statistical trend, materials risk ranking or multi-experiment comparison.
3. If implementing genuine AI inference, place it **behind the server** with source-grounded retrieval, strict citation verification, claim support checks, rejection of unsupported conclusions, abuse controls and a fallback mode. Evaluate hallucination/abstention and document the model and limitations.
4. Do not relabel rule-based PIX as an LLM. If model integration is not reviewed, expose the existing deterministic evidence intelligence honestly.
5. Complete independent review of the three FLEX candidate rows separately if feasible; never promote them to admitted simply to add charts.
6. No predictions of astronaut safety from the current catalog; no transfer from orbital measurements to Moon/Mars safety without matching evidence.

## Visual direction

Premium scientific-exploration aesthetic: cinematic, restrained and readable, not a childish sticker UI or a generic SaaS dashboard. Distinguish five environments by architectural silhouette, camera framing, light and materials **before** colors or icon badges. Prioritize legible typography and stable controls over decorative motion. Scenes may use existing original Meshy assets and must carry illustration labels. Limit shader complexity, provide reduced-motion support, lazy-load three.js, and preserve 2D fallback parity.

## Security & deployment invariants

- Do not rewrite backend rules, action protocols, CSRF/origin handling, quotas or signed visitor identity merely for UI convenience.
- An accepted step changes the UI only after a response/reconciled view from the authoritative server.
- Preserve two-visitor isolation and reload recovery; no auto-step scripts in production.
- Never publish local-only review endpoints, preview tokens or secret configuration.
- Never display quarantined records as admitted; FLEX stays candidate until independent review.
- Work in a branch and open PRs. Don't deploy over the submitted alias until acceptance passes.
- Video deliverables are separate: do not alter the competition video without an explicit request.
- Select an open source license after confirming third-party rights, rather than making an unreviewed blanket MIT claim about assets.

## Acceptance gates (no self-reported PASS without evidence)

**Functional:**
- All five missions still playable through the **public** `/missions/play` on a clean anonymous browser.
- Each mission has a different, recognizable environment and gameplay interaction; ask a first-time reviewer to distinguish each without looking at the title.
- Every step includes task, control, guidance and error recovery; first-time judges can complete without developer coaching.
- Distinct accepted Passport entries, correct server-backed actions, JSON export, reload restoration, 24-hour lifecycle.
- Research routes, citation checker, Ask PIX, Atlas, B20, dashboard, Lab all reachable and appropriately labeled.
- Homepage has a single obvious judge-first path. No contradictory 'not playable' messages.

**Scientific:**
- B20 calibrated oxygen stays **17.4 vol%**, not 16.5%; preserve NASA TM-20210011385 Table A.1, PDF p. 112.
- One admitted, 55 quarantined; three FLEX candidates are not admitted.
- Missing condition values remain unknown; no invented experimental results, time-series or operational safety claims.
- Rank scores are not treated as real-world fire-risk scores.
- Clearly disclose actual AI model usage versus deterministic methods.

**Technical:**
- Run `npm run check` (baseline on submitted main: 266 unit tests plus science/security/build checks).
- Test keyboard, mouse, touch, small iPhone viewport, no-WebGL, reduced-motion and one slow device; watch for clipped buttons and giant forms.
- Run the repository's real backend HTTPS/PostgreSQL tests and hosted two-visitor acceptance.
- Verify mission resume, concurrency, export, rate-limiting, security refusals, direct route access and browser-console cleanliness.
- Capture desktop/mobile screenshots of each mission and compare independently; a different accent color does not satisfy visual distinction.
- Check page performance and provide measured numbers rather than claiming arbitrary targets are met.
- Audit GitHub CI on the exact merge commit. Keep `main` and the submitted Vercel alias unchanged until all gates pass.

## Delivery report format

For every implementation increment report: changed files; screenshots before/after for all affected views; exact test commands/results; science invariants checked; current build URL; known deficiencies; reviewer concerns. Use PRs; never respond 'done' merely because a component renders. Above all, **do not trade scientific honesty and session security for visual spectacle.**
