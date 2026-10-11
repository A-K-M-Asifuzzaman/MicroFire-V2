# 11 — CODEX: GAME RULES, DETERMINISM AND PERSISTENCE

Implement `packages/game-core` as typed pure functions with explicit initial state, action events, guard logic, errors, transitions, versioned migration and serializable save. No Three.js imports or API calls in game-core. Domain contracts agreed before Claude starts 3D.

`GameAction` examples: `START_CASE`, `PICK_SOURCE`, `INSPECT_INSTRUMENT`, `INSTALL_PART`, `REMOVE_PART`, `CONNECT_SENSOR`, `CALIBRATE`, `PREDICT_OUTCOME`, `OBSERVE_DOCUMENTED_RESULT`, `PIN_EVIDENCE`, `CLASSIFY_CLAIM`, `IDENTIFY_LIMITATION`, `PROPOSE_NEXT_TEST`, `RECORD_DECISION`, `COMPLETE_CHAPTER`.

### Guards
- Cannot ignite before duct, holder, igniter and valid instrument view/experiment preset; NASA preset conditions must match actual record for a source-backed observation.
- Contradictory setup makes data ineligible, not fake simulated NASA results. Fault detection gives exact correction, preserves meaningful partial progress.
- Changing a camera/sensor/oxygen preset invalidates dependent observations and later claimed Evidence Passport proofs but not unrelated source note progress.
- Chapter 4 must cite actual studies; any unsourced safety claim prevents advancing, suggests 'not established' response.
- Lunar case cannot claim 'safe' from ISS study alone. Persist scientific caveats.
- Demo mode must not mutate normal save. All progression cannot be bypassed by typing a URL, manipulating client storage or clicking disabled controls (for serious server-side achievements revalidate on server).

### Tests and data
- Golden cases: install ten parts in order, invalid part, remove prerequisite, correct fault, save/reload, malformed save, legacy version migration, report citation lineage, one win path, failure path, no WebGL; compare actual source conditions.
- Property tests: no action creates evidence without source, no invalid assembly reports verified, repeated retries don't duplicate passport proof, rank reproducible, idempotent persistent completion.
- E2E checks use real UI controls and screenshots; no hardcoded state override except clearly labeled judge demo fixture and only in demo environment.
- Provide deterministic state snapshot examples to Claude; state schema tests and verification `npm test` or workspace equivalent.
