# Official NASA Flame in Freefall resources — evidence expansion audit
Date: 2026-11-13 (Asia/Dhaka)
Status: source-discovery handoff, **not data admission, runtime integration, or independent scientific review**.
Owner-facing objective: grow verified cross-experiment combustion evidence to improve the NASA Space Apps submission without diluting provenance or breaking the B20 baseline.

## Challenge-authoritative resources

NASA's 2026 Flame in Freefall Resources tab is the authority for this list:
https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources

| Official challenge resource | URL | Classification and MicroFire action |
| --- | --- | --- |
| PSI Data Repository: Combustion Science | https://psi.nasa.gov/physci/repo/search?q=combustion | **P0**: primary experiments and source-of-truth data |
| NASA Combustion Science | https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/ | P1: investigation context, not per-run results |
| NASA ScienceCasts: Power of Studying Combustion on ISS | https://www.youtube.com/watch?v=W1oXykoz9zg | P3: educational context; don't present as run evidence |
| A Researcher's Guide to ISS Combustion Science | https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ | P1: background, methods and source discovery |
| Apollo 1 | https://sma.nasa.gov/sma-disciplines/accllp/apollo-1 | P2: historical incident; not microgravity experimental data |
| Apollo 13 | https://sma.nasa.gov/sma-disciplines/accllp/apollo-13 | P2: oxygen-tank explosion, not a fire-spread experiment |
| Fire Aboard Space Station Mir | https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/ | P2: historical spacecraft incident; separate evidence class |
| Fireman's Air Tanks | https://spinoff.nasa.gov/node/9582 | P3: technology transfer, not combustion measurements |
| Fire Detector | https://spinoff.nasa.gov/node/9407 | P3: technology transfer, not combustion measurements |
| New Technology for the Fire Attire | https://spinoff.nasa.gov/node/9918 | P3: technology transfer, not combustion measurements |

The PSI site's policy requires citing each collection by its persistent DOI / investigation citation. Keep source rights and media reuse checks per asset. The presence of a resource in the challenge list is not itself evidence for an experimental claim.

## Highest-yield confirmed NASA PSI investigation leads (discovery only)

| Priority | Experiment | Canonical PSI page / DOI | What source listing shows | Evidence status now |
| --- | --- | --- | --- | --- |
| 1 | BASS-II / PSI-25 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 ; DOI 10.60555/4qc4-de67 | Version 4; the public experimental table shows **1–5 of 130** entries, and the listing includes raw videos and engineering/science documents; the version-history page says **694 files added** (not 694 unique experiments) | Existing MicroFire admission remains **only B20**; other rows are candidates until independently cross-checked |
| 2 | FLEX / PSI-69 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 ; DOI 10.60555/mbq8-0451 | Version 5; experimental table visibly includes droplet fuel, ambient pressure, oxygen mole fraction, initial/extinction diameters, burn duration and end status, including tests 1–5 | **Zero additional admitted FLEX runs** until NASA-row/document conditions and outcome are checked |
| 3 | SAFFIRE-I / PSI-98 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-98 ; DOI 10.60555/0t15-1z43 | Version 4; version-history listing includes raw imagery/data archives and engineering documents, with 74 files marked added (not 74 individual runs) | **Description/raw-file lead**, not admitted experiment evidence |
| 4 | ACME E-FIELD Flames | https://science.nasa.gov/biological-physical/investigations/e-field-flames/ | NASA describes measured electric-field strength, ion current and flame characteristics; the official description does not establish an individual usable observation with source locator | Identify the matching PSI accession and downloadable scientific records before any per-run claims |
| 5 | Additional BASS/FLEX-2/CFI/SAME/SLICE/SoFIE | https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/ | NASA lists further combustion investigations | Discovery backlog; rank by data accessibility and comparability |

Important scientific distinction: **solid-fuel flame spread** (BASS-II), **liquid-droplet extinction** (FLEX), **large-scale flame spread** (SAFFIRE), and **gaseous electric-field flames** (ACME) are not interchangeable measurements. Comparisons require explicit compatibility gates, not naive pooling across test types.

## Current baseline to protect

- MicroFire presently reports **one admitted individual run**, BASS-II B20. The review evidence pins the NASA source to Table A.1, PDF page 112 / printed page 104.
- B20 oxygen: **17.4 vol% calibrated**, distinct from **16.5 vol% uncalibrated**. Preserve units and the calibration label; do not rewrite as a NASA data error.
- **55 legacy records** remain quarantined. Other investigation cards/descriptions are not admitted observations.
- PIX is a deterministic evidence-grounded response path, not a deployed LLM.
- Gravity Lens and mission visualizations are educational illustrations, not validated CFD.
- No NASA endorsement, spacecraft certification, lunar safety assurance, or general flammability guarantee.

## Admission gate — apply separately to every candidate run

1. Discover a canonical NASA PSI accession, DOI, investigation version and unambiguous run/test identity.
2. Retrieve the primary source bytes (experiment table, report, video or instrument metadata) and log SHA-256, retrieval date, source URL and exact table/column/page/row or time locator.
3. Record sample identity, geometry, material, gas composition **with calibration labels**, pressure, gravity platform, airflow (including any changes during the run), outcome type, units, uncertainty and missingness. No guessed values.
4. Cross-check an independent primary source or an independently reviewed rendering. Resolve contradictions and mark ambiguities. Image/video-derived measures require a declared method, uncertainty and visual audit.
5. Deduplicate the same run across PSI table, report and image/video archives. File-count or catalog-row-count is **not** verified-run-count.
6. Admit only after existing MicroFire provenance, fixture integrity, reviewer-signoff and negative-case tests pass. A candidate may remain DISCOVERED, EXTRACTED, NEEDS_REVIEW, QUARANTINED or ADMITTED; never silently promote.
7. Ensure the ranker returns DIRECT only on explicitly verified, exact-condition supported claims. Across heterogeneous investigations, return RELATED / INCOMPATIBLE / UNKNOWN whenever comparison isn't scientifically defensible.
8. Supply exact citations and meaningful limitations in Workstation, Investigation Library, PIX, Citation Checker and Passport. Prevent reverse links from implying experimental support for historical incidents or descriptive material.

Suggested source ledger fields: investigationId, accessionId, investigationVersion, doi, sourceUrl, retrievedAt, sha256, fileName, page, table, rowKey, exactQuoteOrCells, observationId, duplicateOf, platform, fuel, material, geometry, oxygenValue, oxygenUnit, oxygenCalibration, pressure, gravity, airflowSchedule, outcomeKind, outcomeValue, outcomeUnit, missingFields, reviewer, reviewDate, status, limitations.

## Execution order and integration handoff (non-video work only)

**P0: BASS-II expansion.** Start with the accessible PSI-25 130-row experimental table and its original supporting documents. Select a small diverse batch of individual rows; prioritize verified condition/outcome variety, not arbitrary count. Preserve the B20 test as an invariant. Build immutable source-cell fixtures and adversarial tests. Do not turn all 130 rows into 'verified' records merely because the PSI interface displays them.

**P1: FLEX per-run track.** Extract a small batch of tests with complete droplet metrics and unambiguous end status from PSI-69. Keep measurement types and conditions distinct from BASS-II. Test comparisons that must abstain across solid and liquid fuels.

**P2: SAFFIRE/ACME discovery.** Locate inspectable raw data and scientific source locators before deciding whether to integrate measured outcomes. If only descriptive material is accessible, retain description-only status.

**P3: Provenance-facing UI.** Give Claude a count by state (discovered/extracted/reviewed/admitted/quarantined), per-investigation admitted-run badges, DOI and version links, and a provenance/limits viewer. New categories should never overstate admitted evidence.

**P4: Judge-ready *working* example.** Build one end-to-end research flow: user question → candidate evidence selection → compatible-condition check → sourced observation → limitation/abstention → export. Prefer one multi-run scientific contrast to a large unreviewed import.

## Acceptance and reviewer tasks

- Unit tests pin B20 17.4 calibrated and the 55 quarantines; an investigation description must not be promoted by retrieval or ranking.
- Negative tests: wrong oxygen (including 16.5 vs 17.4), absent fuel, false gravity/pressure, uncertain outcome, duplicate identifiers, incompatible investigation modality, wrong source page, causal/safety extrapolation.
- Independent science review must assess *each newly admitted run*, not just the parser and UI.
- Security review must treat all new document/table text as untrusted input, including file paths and labels. No hidden prompt or document content should be executed as instructions.
- Public campaign authentication and quota remediation are separate release gates; do not unblock unsafe gameplay by merging science-only changes.
- No application runtime, videos, mission data, source fixtures or admitted records have been changed by this document.

## Discovery sources consulted

- NASA official challenge Resources tab: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources
- NASA PSI-25 (BASS-II), v4, DOI 10.60555/4qc4-de67: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25
- NASA PSI-69 (FLEX), v5, DOI 10.60555/mbq8-0451: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69
- NASA PSI-98 (SAFFIRE-I), v4, DOI 10.60555/0t15-1z43: https://psi.nasa.gov/physci/repo/data/investigations/PSI-98
- NASA ACME E-FIELD: https://science.nasa.gov/biological-physical/investigations/e-field-flames/
- NASA PSI investigation listing: https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/
- NASA's explanation of PSI raw/processed resources: https://science.data.nasa.gov/blog/psi-spotlight
