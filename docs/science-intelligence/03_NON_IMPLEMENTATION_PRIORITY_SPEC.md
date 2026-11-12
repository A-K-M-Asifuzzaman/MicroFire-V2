# Scientific feature priority specification — not implementation

Prepared as permitted pre-event research, November 12, 2026, Asia/Dhaka. This document supplies requirements and future acceptance criteria. It creates no application code, endpoint, schema, dataset admission, model integration or deployment. The order is the owner's P0–P4. Existing architecture is retained; no new database, vector service, framework or paid provider is selected.

## Conditions before implementation

Establish the applicable documented start time or written authorization **and** understand reuse restrictions for the inventoried prior work. Arrival of an event date does not automatically authorize reuse of the whole repository. Scientific admission, shared-contract acceptance and security/deployment approval remain separate gates. The source-resource list must also be checked after publication; current BASS-II/PSI discovery is not an organizer qualification receipt.

## Existing functionality versus the challenge

Assessment scope: the preserved Sol baseline `d9a3313` / research base `ddcd6f8`, read without a rebuild. Prior test reports are historical evidence, not fresh test results. Parallel Claude heads are inventoried but were not independently retested or treated as approved here.

| Need | Existing implementation/evidence | Remaining scientific/product gap |
|---|---|---|
| Investigation discovery | One admitted BASS-II report/B20 catalog; quarantined primary-source candidates for four families | No released, source-only four-family Investigation Library or reviewed PSI-release linkage. Program descriptions and run measurements need separate scope. |
| Condition comparison | `packages/science/src/evidence.ts` compares six target dimensions and reports mismatches/missing fields; exact search filters also exist | No complete transferability analyzer that handles measurement basis, temporality, apparatus/fuel-phase differences and applicability limits. Current tolerances are retrieval choices, not uncertainty bounds. |
| Explainable ranking | Deterministic question/condition score, explanations, source IDs, claim support and evidence level; frontier/gap distinctions | The admitted corpus has one record. A high relevance score does not prove support, cross-investigation comparability or transferability. |
| Grounded summaries | `packages/science/src/ask.ts` uses deterministic authored templates, statement categories, lineage verification and abstention | Coverage is deliberately narrow. No provider/model or general scientific synthesis is implemented. Exact-locator validation is not an independent entailment assessment. |
| Reproducible evaluation | Checked-in gold cases and generated report: 30 Ask and 7 ranking cases; repeatability/citation/unsupported-intent checks | Agent-authored one-record regression set is not an independent multi-investigation benchmark or a measured prediction system. |
| Educational mission support | Private campaign schemas, reducers and authenticated replay/checkpoint service for all five missions; M2 transport is separate | Remaining scenes need a separately reviewed transport and release-target acceptance. A private reducer/service does not establish publicly playable missions. |

## P0 — Official challenge-resource linkage and investigation metadata

**Highest-value slice:** a small, fully cited investigation index covering BASS-II, FLEX, ACME sub-investigations and specific Saffire flights, retaining one admitted B20 run until additional admission is approved.

The index should let a researcher distinguish a program, investigation, source document, dataset release and individual run. Metadata needs a stable identity; objectives; fuel phase/material and geometry; platform/facility; variables manipulated; sensor/measurement types; available versus missing records; primary links/locators; source/version/hash/access date; rights and review status. Investigation context must not populate unknown run-level measurements.

Use PSI-25 Version 4/DOI as the first candidate mapping only if the released challenge resources and review support that choice. B20's initial/final calibrated oxygen agrees at 17.4 in the public PSI table and existing NASA report. That agreement is not permission to admit the other 129 displayed rows. For FLEX/ACME/Saffire, a useful source-only entry can exist with explicit incomplete-run status; it must not masquerade as a measured record or enter quantitative ranking as one.

**Future acceptance evidence:** one selected qualifying resource traced from the official challenge tab to the exact data/source used; document and run identities reconciled; independent source/rights review recorded; source-only entries visibly distinct from admitted measurements; one B20 and all 55 legacy quarantine rows unchanged unless a separate approved promotion occurs. Jointly review shared metadata shapes with Claude before adopting them in a strict consumer.

## P1 — Evidence Transferability Analyzer

**User question:** which parts of a source record resemble a target crew environment, which differ, and what prevents a supported inference?

Show requested versus recorded values with units and provenance, raw source representation, known/unknown status and a reason for each dimension. Initial dimensions reuse gravity, material, geometry, oxygen, pressure and airflow; scientifically necessary extensions such as flow direction, fuel phase, oxygen basis, sample scale and time-dependent conditions require explicit contract review. No hidden target presets should be presented as measured NASA mission conditions.

Separate exact recorded equality, retrieval-tolerance matches, conditions that differ, missing measurements and context-only analogies. Search tolerances (currently ±0.5 oxygen percentage points, ±2 kPa and ±1 cm/s) must not be presented as validated equivalence or experimental uncertainty. Record a source's actual uncertainty only when it is established. Never replace unknown B20 acceleration with an invented numeric microgravity value.

Explain confounders and applicability limits before a conclusion: solid versus droplet versus gaseous fuel, oxygen reporting/calibration basis, pressure, ventilation regime, sample/duct geometry and changed variables. A source experiment does not become evidence of habitat safety merely by matching oxygen. Do not calculate source-backed oxygen partial pressure when pressure is unknown, or infer velocities from potentiometer settings. If permitted derived quantities are later added, state inputs, units, assumptions and source support separately from observations.

**Future acceptance evidence:** deterministic field explanations; no unknown counted as a match; explicit insufficient-evidence outcomes; no causal claim from uncontrolled comparisons; no risk probability/certification/recommendation. Positive, mismatch, unknown, mixed-basis and time-varying cases must be independently reviewed before integration. Results remain bounded by the audited catalog.

## P2 — Explainable ranking and source-grounded summaries

Reuse deterministic ranking and the current source/claim structure. Explain each contributing condition/text match and the separation between relevance, statement support and evidence applicability. A result can be relevant yet supply no supported answer. Do not rename relevance as confidence, certainty, safety or prediction accuracy; do not infer a literature-wide absence from this small catalog.

A scientific summary should identify the investigation/run, documented objective, relevant measured conditions, supported observation, exact citation and limitations. Preserve observed/derived/interpretation/hypothesis/unknown labels and source/training/learner separation in exports and Passport displays. Source disagreement must appear as disagreement, not be averaged into an invented consensus. Out-of-scope, unavailable, contradictory or unsupported conclusions must abstain or state the bounded gap.

Keep the existing deterministic composer honest. An SI/model integration is a separate proposal requiring authorization, source-constrained output validation, evaluated abstention and disclosure. No general model claim should be made for the existing templates, and an evaluation cannot promote data or establish operational fire-safety advice.

**Future acceptance evidence:** reproducible order and explanations for a pinned catalog/version; support citations attached to every evidence-bearing statement; independently reviewed entailment; explicit refusals on unsafe extrapolation; strict DTO compatibility checked by both backend and frontend owners.

## P3 — Scientific evaluation and provenance verification

Extend the existing reproducible regression process only after approved sources and labels exist. Preserve source hashes/releases and evaluation-set version, code commit, environment, expectations and actual results. Freeze gold labels before running a candidate; independent review must be distinguishable from labels authored by the implementation agent.

Evaluation dimensions: document/page/table/row accuracy; whether a citation entails the statement; oxygen-column/calibration/unit correctness; unsupported conclusions; expected and false abstentions; contradictory records; missing-condition treatment; fuel/geometry/flow confounding; target applicability; quarantine exclusion; deterministic exports and repeated results. Include adversarial citation-swapping and prompt-injection cases without representing synthetic conditions as NASA measurements.

Report actual denominators and failures. Agent regression cases, synthetic robustness cases and independently reviewed real-source cases are different evidence. With one admitted record, do not report meaningful retrieval recall/MRR, predictive accuracy or statistical confidence intervals. Any future multi-record metric needs a defined evaluation population and independent relevance labels.

**Future acceptance evidence:** repeatable offline evaluation with no silent failures, source/rights review attached, independent scientific limitations and test failures reported, and unchanged calibration/quarantine protections. Evaluation success alone does not grant source admission, release approval or competition eligibility.

## P4 — Secure APIs for remaining missions

Inspect/reuse the existing private `CampaignService` and campaign types after confirming which prior components may be reused. The shared campaign actions/record/command/snapshot/export interfaces are a review candidate; their existence is not approval of a public transport. Preserve the frozen M2 contracts and its checkpoint/body limits.

The required transport capabilities are authorized capability/start/read/command/resume/export of a bounded server-owned case. Exact routes, response DTOs, payload/rate limits and failure handling must be jointly specified and accepted; no new route name is declared approved here. A campaign payload cannot simply be sent through M2's smaller frozen resume envelope.

Preserve separate review-route and gameplay credentials and both review-protection layers. Hosting/loopback markers alone are not authorization. Do not weaken the existing private-preview gate to make scene integration convenient. The current bounded local adapter is not a durable public multi-user service; persistence/hosting expansion requires separate acceptance.

Required properties include local/private defaults, server-only credentials, origin/authorization checks, runtime/case/revision identity, canonical signed replay, serialized mutation, idempotent retries, conflict refusal, bounded state and explicit recovery. Source attribution and fictional/training/learner distinctions must survive Passport updates and export. A scene sends intent and renders confirmed state; animation cannot grant progress.

**Future acceptance evidence:** all four scene journeys plus invalid/out-of-order/unauthorized actions, exact retries, source/Passport attribution, budget exhaustion, tampered/stale restore, restart and revoke recovery. Astra's review must cover the exact transport commit before exposure, followed by Claude's full browser acceptance and an explicit owner release decision. Writable browser saves remain disabled unless their separate consistency gate is accepted.

## Scope selection after the gate

P0 source linkage and P1 bounded explanations improve the challenge's central scientific task before additional visual/gameplay volume. P2/P3 make those outputs explainable and reviewable; P4 follows without disrupting Claude's M2 work. Prefer one verified vertical slice over expanded unreviewed record counts. Keep the local submission baseline separate; no branch merge or deployment is authorized by this specification.
