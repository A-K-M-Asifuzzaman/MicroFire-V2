# 03 — PROFESSIONAL FEATURE PHASING AND HONEST COMING SOON STATES

## Principle
**An unimplemented feature is NEVER a dead button, a false 'Live' display, or a deceptively unlocked mission.** Build professional feature flags and route status registry. It is fine to use `Coming Soon` for genuine future work, as your friend's product does; do it transparently and keep the core judged workflow finished.

### State machine
`available`: implementation + evidence + unit/e2e + browser verification all pass; link works.
`preview`: interactive but explicitly limited, limitations visible; cannot be used to support published claims, not presented as complete.
`coming_soon`: genuinely planned but not built; disabled button or dedicated informative roadmap page, brief purpose, no arbitrary fake release date; optional notify link only if email flow exists.
`blocked`: not deliverable now because permissions/data/licenses absent; label restriction and do not silently substitute fabricated sample data.

## Staged release milestones (recommended; not invented deadlines)
- **P0 — Foundation**: new repo scaffolding, docs, CI, typed science contracts, verified read-only migration manifest, brand shell, feature registry; all future routes present as honest Coming Soon.
- **P1 — Viable Challenge Solution**: real dashboard + atlas + source citations + question-based explainable ranking + comparison + gaps + honest AI abstention + 90-second judge tour; core product is actually usable. Game hub may show Mission 1 preview / Missions 2–5 Coming Soon.
- **P2 — Working Scientific Adventure**: Mission 1 interactive station and Mission 2 ten-part BASS-II with fault/repair, genuine persistence, 3D fallback; latter missions Coming Soon while incomplete.
- **P3 — Full Evidence Game**: Missions 3–5 integrated with documented outcomes and Evidence Passport, performance/cross-browser and mobile checks. At this stage no game missions may be labeled available until full flow verified.
- **P4 — Expansion**: optional multilingual support (Bangla + English after review), external literature explorer, advanced visuals and educator exports, user feedback, more verified studies. Leave Coming Soon; not central to judges.

## Example presentation: /missions
Mission 1 • Station Arrival          AVAILABLE (only after tested)
Mission 2 • BASS-II Assembly         PREVIEW or AVAILABLE according to gate
Mission 3 • Flame Detective          COMING SOON until coded and tested
Mission 4 • The Claim Trial          COMING SOON until coded and tested
Mission 5 • Lunar Habitat Decision   COMING SOON until coded and tested

Unlocked != available: a completed but progression-locked mission shows `Locked — complete previous mission`; an unbuilt feature shows `Coming Soon`; never conflate.

## Exact definition of done for EACH route / mission
1. Main user action functions; data sourced or hypothetical labeled.
2. Baseline unit tests, negative cases, accessibility and actual browser screenshots captured.
3. Failure/retry/fallback works, no open dead links or accidental runtime errors.
4. Telemetry/screenshots reviewed; no invented NASA observations.
5. Only then change `feature.state` to `available` in a code-reviewed PR.

## Automated checks
Test feature registry exhaustiveness, link validity for available routes, Coming Soon badge and disabled controls for unavailable, no hidden open API billed accidentally, accessibility. Add playwright tests for the entire stages route. Document stage/status changes in RELEASE_NOTES.
