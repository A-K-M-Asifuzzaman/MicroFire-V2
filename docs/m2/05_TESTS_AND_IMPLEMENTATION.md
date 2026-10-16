# Implementation ownership, fixtures and acceptance

## Responsibility and start conditions

| Area | Sol | Claude | Astra / gate |
|---|---|---|---|
| Science/catalog binding, game-core coordinator | Implement pure rules, prerequisites, qualification/Passport guards and unit/property tests | Consume frozen commands/results, no duplicate science or collision-based truth | Review source/rules and falsification cases |
| Preview capability, session/HTTP/checkpoint | Server authorization, fail-closed local operation, MACs/CAS, budgets/limits, error/privacy tests | Private authorization form and session controller; no secret persistence | Review security boundary before enablement |
| Persistence and migration | Nested v2 loader adapter, raw recovery, lineage and size checks | Explicit saved/unsaved/read-only/error views, downloads/confirmations | Independent interruption/restore audit |
| 2D / 3D | Export part/fault/progress data and common deterministic commands | Accessible 2D apparatus first, then 3D bench, manipulation, feedback, HUD, PIX and animations | Real gameplay, visual/UX and state-consistency review |
| Browser/API tests | Core/API/authorization/security fixtures; maintain existing guarantees | User-control desktop/mobile/keyboard/2D/3D playthroughs and performance | Independent cases over real endpoints; final vertical-slice acceptance |
| Shared contracts / registry / dependency files | Draft/extract domain definitions and reviewed registry reconciliation | Review consumer adoption; owns next dependency/lockfile edit | Explicit freeze and integration review; no Available promotion from unit tests |

No tasks or messages have been sent to other agents. This document is the handoff, not evidence of their signoff. Sol starts implementation only after the owner supplies Astra's contract approval. Claude can review/scaffold designs without changing domain contracts; coordinated gameplay code starts after schemas, action/result examples, authorization behavior, checkpoint format and test fixtures are frozen. Active implementation happens in separate branches rooted at the approved documentation commit (whose parent is b6d15a4), with no unreviewed deployment commit included.

## Prioritized stages and concrete exits

| Stage | Owner / scope | Exit gate |
|---|---|---|
| 0 — Contract review | Astra reviews this package; resolve checklist in 07 | Freeze episode IDs, auth approach, metadata/actions, byte limits, restore semantics and rights ownership. No runtime activation |
| 1 — Pure training logic | Sol implements strict schemas, transitionTraining/progress and B20 binding using existing core | New deterministic/negative/property tests; unchanged 103 baseline tests; honest unit-only result |
| 2 — Local API and persistence | Sol implements disabled-by-default endpoints, authorization, signed checkpoints, atomic session handling | Real HTTP tests: off/default, unauthorized, tamper, resume, CAS/idempotency, size/rate/security; no frontend availability change |
| 3 — First complete 2D slice | Claude consumes frozen contract; Sol supports adapters | Real browser entry→source→ten parts→fault→diagnosis→repair→qualification→B20→Passport→save→reload. Keyboard/mobile and failure recovery; Astra reviews mechanics before 3D |
| 4 — Cinematic bench | Claude integrates existing PIX/console, procedural apparatus and 3D interaction | Same backend state/events, no-WebGL switches to fully playable 2D, same checkpoint resumes across views; performance evidence |
| 5 — Independent acceptance | Astra independent walkthrough, source/restore/security/UX checks | Exact commit/screenshot/log evidence, unresolved limits stated; local preview acceptance only |
| 6 — Later release decision | Owner / joint review | Separate availability, human science, security, accessibility and deployment approval. Not part of M2 planning |

Do not begin by rewriting core parts, introducing a database/framework, purchasing assets, raising request limits or making later three missions playable. Three.js already exists; R3F is optional only if Claude demonstrates a concrete need through the next jointly reviewed dependency proposal.

## Twenty-area acceptance matrix

These are **required future tests**, not claims that unimplemented preview code passes. Existing anchors below are exact current test descriptions/locations; preserve them.

| # | Area | Reuse now | Required new unit / HTTP / real-browser acceptance |
|---:|---|---|---|
| 1 | Mission gating | game.test.ts production gating; contracts.test.ts unfinished feature guards | All five default starts denied in normal/demo; preview disabled returns 404. Guessing mission route or editing feature flags/local state cannot obtain session/checkpoint |
| 2 | Preview authorization | api.test.ts request/rate/fail-closed tests | Real authorize cookie, missing/wrong/expired token, wrong Host/Origin, hosted environment and normal-mode start denied; only two allowlisted IDs; no client callback/validation flag accepted |
| 3 | Correct assembly | game.test.ts dependencies/anchors; diagnose | All ten sourced part IDs installed through actual controls/API; correct ordering; controller injects exactly one required fault; no fake auto-completion |
| 4 | Incorrect assembly | same guards, HAS_DEPENDENTS | Wrong anchor/order/duplicate/remove parent yields unchanged state/checkpoint; reversed orientation accepted but not qualified; clear repair feedback |
| 5 | Fault triggering | existing reversed fan/camera test | Trigger only at first zero-fault ten-part assembly; fixed authored ID, atomic last install/remove/reinstall; failure during injection commits nothing; reload cannot trigger twice |
| 6 | Diagnosis | diagnose fault details | Stale/missing diagnostic denied; wrong part/type accepted as feedback false with correct counts; correct diagnosis at fault revision unlocks manual repair |
| 7 | Successful repair | remove/reinstall core test | Actual fan remove then correct reinstall, receipt tied to injected fault; zero faults required before qualification; UI action changes real core orientation/revision |
| 8 | Failed repair | qualification and reversed tests | Wrong part/anchor/reversed replacement can't qualify or satisfy required repair; clear reversible path; repeated repairs preserve progress |
| 9 | Scientific qualification | core QUALIFY + invalidation | Healthy rig before authored fault is not sufficient episode completion; postrepair check is training-only; later edits revoke qualification; no source outcome from simulated check |
| 10 | B20 inspection | real science-api/observatory-http; source-cell contract test | Exact B20/hash/claim/opposed regime; oxygen17.4/calibrated and flow sequence; unknown pressure/acceleration remain unknown; source links PDF112; reject synthetic concurrent record |
| 11 | Unsupported evidence | astra-review.test.ts unmeasured temperature/rank; Ask cases | Matching conditions, tutorial statements, invented temperature, lunar safety and B16/B19 cannot generate direct evidence/Passport proof; real HTTP abstention |
| 12 | Passport generation | game full campaign/export + validatePassport | Exactly current source and assembly entries, training repair separately labeled, counts/current choices accessible, canonical quote/citations; retries don't duplicate; actual UI sees earned output |
| 13 | Canonical limitations | astra-review learner notes; M1 browser canonical/unknown-reference cases | Four notes/update/reload cannot remove caveats or become source text; test mixed B20+constructor, B19, unknown claim, missing warnings; raw download remains available even on render fault |
| 14 | Save/reload | game round-trip/storage failures; M1 Passport tests | Reload at each phase: half-built, faulty, diagnosed, fan removed, repaired, qualified, Passport, complete. Real localStorage checkpoint and real resume API; phase/notes/revisions survive |
| 15 | Oversize rejection | exact MAX_SAVE and accepted-proposal probes; streaming body tests | UTF-8 20,480 exact/over checkpoint; encoded resume 32,768 exact/over; multibyte/control/escaped note cases; any rejection preserves prior bytes/head. Every accepted legal case can still complete |
| 16 | Migration | existing v1/default learnerNotes tests | v1 parts/proof invalidation retained; legacy normal/demo keys untouched; unsigned v2 cannot become trusted preview; unsupported checkpoint/rules/key/dataset recovery is read-only, not silent reset |
| 17 | Exhausted-attempt recovery | astra-review 200/205 classification cases | 1,000+ wrong diagnoses remain correctable after reload, finite histogram not growing log; latest correct diagnosis/real repair then complete. Keep later Claim Trial cap regression unchanged |
| 18 | Mobile and keyboard | existing skip/menu/lens/reduced tests, four-width screens | Complete 2D gameplay by keyboard only and touch at390/320; select→anchor→orient→install alternative to drag, focus feedback, ≥44px primary targets, 200% zoom, no loss of scientific notes |
| 19 | 2D/3D consistency | existing no-WebGL/context lifecycle | Same sequence of semantic commands from either renderer produces identical normalized snapshot/checkpoint payload (fixed time/IDs); switch renderers midfault/reload without new truth; mesh failure doesn't stop play |
| 20 | Browser interruption | existing research error/retry and raw recovery cases (mutating game commands must not reuse abort-on-new-request semantics) | Drop response after server commit; resend same command ID, GET recovery, duplicate click, stale tab409,429/backoff, quota error, server restart with stable key, auth expiry, partial/offline local read-only recovery |

Also preserve research-route science, source-link/export, accessibility and existing lifecycle tests. Replace only the obsolete hero-position test premise with Astra's explicit offscreen fixture; do not weaken zero-draw, context recovery, reduced-motion or no-duplicate-loop assertions.

## Real test infrastructure and fixtures

- Unit tests call pure coordinator/core directly with a fixed clock and trusted catalog, not permissive client availability in production paths. Test both internal happy paths and server-denied public behavior.
- HTTP tests use the actual Node production server on isolated loopback ports, actual authorize endpoint and cookie, strict schemas and bounded request reader. Reuse tests/e2e/disposable-server.ts patterns; no rate-limit increase, alternate insecure route or global all-missions-open flag.
- The minimal happy path uses **23 POSTs** including authorize/start and two diagnosis commands; four optional notes raise it to27, and an explicit Passport validator call to28. Save itself is a local write, not another POST. Diagnostic errors/extra repairs may trigger the real 30/minute allowance: assert429 and respect Retry-After or pace actions. Test retries cannot multiply accepted commands. GET polling is event-driven and bounded, never a per-frame API call.
- Each destructive isolation scenario gets a disposable process with unchanged limits. Do not run several shared-budget suites concurrently on the same server or hide429 with mocks.
- Generate fixtures via accepted real actions: fresh, halfbuilt, injected fault, diagnosed, removed fan, repaired, qualified, B20 review, note-filled and complete. Internal pre-injection fixture is unit-only, never a public seed or GET unlock link.
- For invalid restore, deliberately modify a copy of a real signed token or unsigned legacy save; expect rejection/recovery. Synthetic concurrent-flow catalog is a unit fixture only, never runtime data. For lineage failure with an otherwise issued checkpoint, use an internal test fixture signed by the private test key; that is not a product signer endpoint.
- Snapshot examples in 03 describe shapes; fixture factories must populate **all fields** and parse entire responses. No placeholder strings labeled as valid MACs. Tokens/keys/authorization inputs are excluded from logs/screenshots/traces.

Required browser evidence: desktop1440×900, widths768/390/320, keyboard-only complete2D path, touch emulation, reduced motion, no-WebGL, failed mesh/context recovery, exact raw download, saved reload and interruption. Capture actual states and source/fiction labels. Add an axe pass for dynamic gameplay states; screen-reader/native zoom and a physical mobile performance pass are distinct checks, not inferred from headless screenshots.

## Vertical-slice acceptance statement

A reviewer must be able to reproduce the whole loop with actual controls and real local APIs, without editing storage, opening all missions, mocking scientific validation or supplying fake completion state. A source-bound Passport must survive save/reload with the same training fault/repair history and canonical limitations. After a refused action or failed network/save, the last valid progress remains recoverable. 2D must remain fully playable without WebGL. Passing unit tests or attractive scene screenshots alone cannot satisfy this gate.
