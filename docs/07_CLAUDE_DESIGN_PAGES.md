
**IMPORTANT (later revision):** The distinctive **Living Science Observatory** aesthetic in `docs/19_VISUAL_DIRECTION_LIVING_OBSERVATORY.md` and current 10 reference PNGs overrides older layout suggestions and any old visual files. Keep the route functional requirements below, reinterpret their presentation using new direction.
# 07 — CLAUDE: CLEAN GLOBAL-SCALE SCIENCE UI BY ROUTE

**Guiding goal:** world-class but not cluttered. Previous concept images had too much PIX, neon, floating HUD and unverified numbers. New aesthetic: editorial scientific workstation and restrained 3D cinematic experience, not duplicate neon panels. Palette #0B111A, #182431, #E9EEF2, #FF8738, #73BBD9, optional warmer light reading mode. Max 1 primary CTA each view; generous whitespace; clear headings; compact nav; no forced scrolling in game; source labels always visible.

- `/` HOME: first screen split 45% thesis and primary CTAs, 55% hero 3D flame apparatus/spacecraft outside pseudo-ISS. Two actions `Explore evidence` and `Enter mission`; 3 explanatory blocks below, no inflated metrics or auto chat overlay. Clearly independently developed, not NASA endorsed.
- `/dashboard` SCIENCE OBSERVATORY: calm workspace. Top question search + source/status breadcrumb; compact dataset coverage card with real computed counts; question-specific matching factor summary; two compact scientific visualizations only if verified data; main ranked finding list with provenance and uncertainty; PIX assistant accessible via small optional drawer; one sidebar for conditions, not three.
- `/atlas` REAL EXPERIMENT LIBRARY: search, program tabs BASS-II/Saffire/LUCI etc only where sourced; filters; source record cards with conditions, measurement availability and comparison. No fake 'live' experiment GPS/world-map pin because orbital experiments are not Earth fire detections.
- `/experiments/[id]`: experiment ID, conditions, source PDF/page links, images/footage rights checked, observations, unknowns, data quality and compare action.
- `/compare`: precisely matched vs mismatched conditions table; side-by-side observations, program differences and limits; no overstatement.
- `/lab`: central 3D flame scene and documented preset selector, SMALL controls, output label `illustrative visualization from recorded observation` (not 'real-time physics simulation'); real source video link when available; keyboard and no-WebGL text fallback.
- `/gaps`: sparse coverage matrix (not invented dots), 'what is known' vs 'unexplored within current catalog', proposed next experiment with clearly speculative tags.
- `/ask`: question-to-evidence with citations and explicit abstention. No chat API key in client, cached default example and accurate failures.
- `/missions`: full-bleed five beautifully differentiated mission cards. Available, Preview, Coming Soon, Locked statuses are *real*.
- `/missions/[id]`: full-screen 3D canvas; mission title/small objective toggle, progress, context-sensitive PIX; modal only when needed; no game UI over 25–30% of active central viewport unless user opens panel. No fake 60fps claim.
- `/passport`: sourced decisions with actual user actions, research citations, separate educational accomplishments from formal science certification; export after validated state.
- `/sources`, `/methodology`: data license/provenance, scoring details, AI eval results, missing-data disclaimers.
- `/roadmap`: professional available/preview/coming soon cards and real updates.
- `/challenge`: deterministic judge tour that *works offline or with LLM unavailable*, no fake live server metrics.

For each route require mobile 390px and desktop 1440px screenshots, keyboard navigation, meaningful empty/loading/errors, one golden interaction, real API and source link when available. UI mockup numbers/text are PLACEHOLDERS and must be replaced or removed.
