# NASA combustion source prioritization — November 13, 2026

Implemented code: `b3bdbfb539d8a65d256cef5055eaa3dedab0b6cb` on `codex/science-intelligence-20261112`. This extends the authorized scientific implementation without changing the public deployment or Claude worktrees. Owner-relayed organizer authorization and prior-work disclosures remain intact.

## Exact sources used

| Investigation/source | Identity and original URL | Rights and actual use |
|---|---|---|
| BASS-II | [PSI-25 v4](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25), DOI [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67); [NTRS 20210011385](https://ntrs.nasa.gov/citations/20210011385), Table A.1, PDF page 112/printed 104 | PSI displays CC0-1.0; NTRS GOV_PERMITTED. Existing admitted B20 remains authoritative: calibrated initial/final oxygen 17.4/17.4 vol%, PMMA film, first Air entry 5 cm/s with raw mixed-flow limitations. Original catalog unchanged; pressure/run acceleration unknown. |
| FLEX | [PSI-69 v5](https://psi.nasa.gov/physci/repo/data/investigations/PSI-69), DOI [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451); existing [NTRS 20205008449](https://ntrs.nasa.gov/citations/20205008449) | PSI displays CC0-1.0; existing report PUBLIC_USE_PERMITTED. Functional dataset metadata/citation link added to FLEX. No PSI run admitted. |
| ACME BRE | [PSI-20 v4](https://psi.nasa.gov/physci/repo/data/investigations/PSI-20), DOI [10.60555/vb93-3y72](https://doi.org/10.60555/vb93-3y72); ACME family [NTRS poster 20220015583](https://ntrs.nasa.gov/citations/20220015583) | PSI displays CC0-1.0; poster GOV_PUBLIC_USE_PERMITTED. Separate BRE source-description entry and dataset/citation link added. Family overview remains separate; gas-burner emulation is not direct solid-fuel evidence. |
| Saffire-I | [PSI-98 v4](https://psi.nasa.gov/physci/repo/data/investigations/PSI-98), DOI [10.60555/0t15-1z43](https://doi.org/10.60555/0t15-1z43); [NTRS 20170008805](https://ntrs.nasa.gov/citations/20170008805), Table I, PDF/printed page 29 | PSI displays CC0-1.0; new NTRS source PUBLIC_USE_PERMITTED. Separate library description, exact dataset/source citations and review candidates; no run admission. |
| Saffire IV/V | Existing [NTRS 20210011521](https://ntrs.nasa.gov/citations/20210011521) | MAY_INCLUDE_COPYRIGHT_MATERIAL. Existing source-only entry/candidate V-2 retained; PSI-98 is not its dataset. No figures redistributed. |

The new NTRS PDF SHA-256 is `e38ec36f54817aa97e0c01a05f12b212521d6320ce3f4cb7a38bb7c837cfea8d` (5,091,642 bytes). Only this newly selected source was downloaded/hashed; completed source hashing was not repeated. Table I was rendered and visually checked, not accepted from search snippets alone. PSI metadata and first experimental-table pages were inspected through the public browser, with no login or API key. These are metadata/table previews, not bundled raw archives or a claim of a documented PSI API. No imagery API was necessary, and none was added.

## Prepared observations and unresolved issues

`data/candidates/review-20261113.json` uses the existing CandidateReviewSchema and a mandatory quarantined-pending-independent-review status:

| Candidate | Source observation retained | Independent-review requirements |
|---|---|---|
| candidate-saffire-i-1-1 / sample 1-1 | Cotton-fiberglass, 20 cm/s concurrent flow, 420 s scheduled burn, approximately 84 cm burned, 1.8 mm/s spread | Preserve derived oxygen range 21.7 to 21.5, fan-shutdown endpoint and missing pressure/acceleration. Reconcile 0.37 mm in the paper versus 0.37 cm in PSI, reversed length/width labels and 165 W narrative versus 182 W table ignition power. |
| candidate-saffire-i-1-2 / sample 1-2 | Opposed-flow test, approximately 10 cm remaining fuel, 70 s, 1.3 mm/s | This reused previously burned material; do not treat it as an independent pristine repeat or infer a directional causal effect. Retain approximate oxygen and geometry. |
| candidate-saffire-ii-2-1 / sample 2-1 | 0.27 mm silicone; the table reports insignificant burn duration, approximately zero spread length and n/a spread rate | Preserve source strings, not exact zero conversions. Collective silicone narrative does not prove mechanisms or general material safety. PSI-98 describes Saffire-I, not this flight. |

Additional discovery: PSI-69's first page identifies methanol test 2 / 20CAL10, including pressure in mmHg, initial oxygen mole fraction, and an extinction endpoint. The first page contains five of 275 displayed entries, not the previously inspected FLEX-062 cool-flame slide identity. Burning-rate column units are not silently corrected; original raw file, diagnostics and run-level acceleration require review. No unsupported cross-link or new FLEX record was fabricated.

PSI-20 exposes 19 day-summary rows, each potentially including multiple ignitions and oxygen conditions; pressure varies but is absent from the summary. A visible 3400% oxygen entry is retained as a display discrepancy, not guessed to be 34%. It cannot produce an individually attributable BRE observation yet.

PSI-98's project fields give ISS and 2001–2008 dates, whereas its approach describes the departed Cygnus experiment. These conflicts, its thickness/geometry labels, and the paper's oxygen footnote stay explicit. Paper oxygen values are derived from CO2 production referenced to an ISS O2 reading, not equivalent to B20 calibrated-vol% provenance. Source labels do not imply compatibility or validated transferability.

## Implemented containment and actual checks

The dated review batch is parsed with the existing schema. `candidateReviews` aggregates both batches; `candidateReview` remains the original batch for existing consumers. Quarantine checks include all candidate IDs/test identities, including catalog renaming attempts. Acquisition/verification scripts traverse both batches. They do not promote records. Seven total review items include the four previous items (one overlaps legacy B19); this is not seven new validated experiments or an additive count of distinct legacy rows.

Latest full `npm run check`: exit 0, 223 units in 18 files, lint/types/data validation/science evaluation/basic security checks and production build pass. Reproducible intelligence evaluation: 11/11 authored applicability/abstention cases plus 5/5 citation cases. Production HTTP acceptance: 1/1, no skips; six descriptions/one admitted B20/55 legacy quarantine rows, correct new DOI links, refusal of all three new candidates, unsupported-summary abstention, real POST quota and ordinary campaign/M2 preview 404. Disposable server stopped. New-source/metadata tests prove lineage and containment, not independent scientific correctness.

Pinned hashes, code commit and checks: `evidence/source-expansion-run-20261113.json`. Public source observations and release-state snapshot: `evidence/source-verification-20261113.json`. Normalized logs: `evidence/nov13-*.log`.

## Claude integration and competition requirement

No TypeScript/Zod shape, endpoint or request limit changed. GET `/api/investigations` / `InvestigationsResponseSchema` now returns six source descriptions; render the array rather than hard-coding four. New IDs are `acme-bre` and `saffire-i`. FLEX now has non-null dataset metadata. Dataset nullability remains necessary for the ACME family and Saffire IV/V entries. Parse detail responses with InvestigationResponseSchema and metadata citation checks with InvestigationCitationResponseSchema. Updated `examples/library-response.json` is generated and schema-checked.

Render each dataset DOI, original PSI link, declared license, limitations and source-only scope. Keep admission and dataset identity visibly separate. Do not put new candidates into selectors for `/api/evidence/transfer`, rankings, PIX or Passport evidence. Existing `/api/intelligence` uses limit 4 and the strict answered/abstained response; prior retry/stale-response instructions remain in `08_SCIENCE_API_AND_CLAUDE_HANDOFF.md`. No new frontend UI or shared-contract change is required to display the metadata; Claude visual/browser acceptance remains outstanding. Campaign route mounting/cookie review is untouched.

The single authorized inspection of the official Flame in Freefall Resources tab still displayed its November 13 release notice. No exact listed qualifying source is confirmed; neither a PSI license nor its existence establishes challenge-list membership. No repeating monitor was restarted. Inspect the released list during the next authorized work session and document direct or explicitly allowed listed-source lineage before claiming the competition data requirement is satisfied. Independent science admission and any redistribution clearance remain required. No universal promise about other NASA services' authentication is made.

No new experiment promotion, B20/calibration modification, change to the 55-record legacy ledger, public deployment, main merge, Claude/video/asset edit or paid API was performed.
