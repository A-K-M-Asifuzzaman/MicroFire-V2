# Challenge-resource and primary-source findings

Research only, November 12, 2026, Asia/Dhaka. Evidence: [primary-research-update-20261112.json](primary-research-update-20261112.json). This report changes no catalog, API, model, asset or feature state.

## Required official resource: what is established

The [Global Organizing Team's answer](https://github.com/nasa/spaceapps/discussions/1827) requires use of at least one NASA data source included in the selected challenge's Resources for Global Awards, with the used data, code, text, images and tools disclosed/cited. It does not designate one universally mandatory named combustion dataset.

A fresh HTTPS fetch and rendered-browser inspection of the [Flame in Freefall Resources tab](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources) still returned its November 13 release notice. **A specific qualifying resource or dataset therefore cannot yet be confirmed from that list.** The correct report is pending publication, not “B20/PSI-25 is already an approved challenge resource.” Once released, preserve the exact listed resource URL, the dataset identifier/version actually used and its citation/rights requirements. If a general PSI portal is listed, confirm whether an investigation reached through it qualifies.

NASA's [PSI research-area directory](https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/) lists BASS-II, FLEX/FLEX-2, multiple ACME investigations and Saffire-I/II/III. Its ROSES eligibility label concerns a different program and must not be read as a Space Apps eligibility decision. A NASA-hosted paper is a primary-source lead, but that hosting alone does not satisfy the challenge-resource-list requirement.

## Verified candidate: BASS-II PSI-25

The public [PSI-25 investigation](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25) rendered successfully. It identifies BASS-II, Version 4, DOI [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67), a CC0-1.0 declaration and an experimental table showing 130 entries. The displayed version history says November 24, 2025, metadata update. Raw-data and supporting-document folders exist; no complete archive was downloaded.

A read-only B20 filter exposed its calibrated initial and final oxygen cells, both **17.4% by volume**, with the matching sample/date identifiers. This independently corroborates the existing correction. The raw airflow display remains a mixture of numbers and a potentiometer setting. Only this transcription check was recorded; no table rows were imported.

This is the first candidate to reconcile with the existing B20 report because it offers an identifiable investigation and release. It is **not** an admitted 130-run expansion, proof of uninspected table values, proof of complete raw-data access, or confirmation of challenge qualification. Investigation-level license/context does not automatically relicense every linked publication, photo or video. The existing app cites the NTRS report; it must not retroactively claim that PSI data was already ingested.

## Four primary-source leads and their boundaries

The preserved PDF hashes and prior source-page inspection remain in [the initial research evidence](research-evidence-20261112.json). Current NTRS metadata was fetched separately; no new experimental values were admitted.

| Family | Primary source | Appropriate research use | Boundary before admission |
|---|---|---|---|
| BASS-II | [NTRS 20210011385](https://ntrs.nasa.gov/citations/20210011385) | Apparatus description and Table A.1, PDF page 112, including already admitted B20 | Keep calibrated oxygen 17.4%; unknown pressure/run acceleration remain unknown. “pot 0.5” is not a calibrated velocity. Reconcile PSI releases and row identity before any new import. |
| FLEX | [NTRS 20205008449](https://ntrs.nasa.gov/citations/20205008449) | Droplet/cool-flame study context and previously inspected FLEX-062 inset on PDF page 4 | Resolve diameter units and symbols, run linkage and uncertainty. No plotted points were digitized. Mole fraction cannot silently acquire BASS's calibration provenance. |
| ACME | [NTRS 20220015583](https://ntrs.nasa.gov/citations/20220015583) | Program/hardware and investigation discovery | The poster lacks a complete identified run with all required measurements. ACME is a family of investigations, not one uniform experiment. A discovery description cannot become a measured outcome. |
| Saffire | [NTRS 20210011521](https://ntrs.nasa.gov/citations/20210011521) | Source-linked study context; previously inspected Table 1/page 3 and narrative/page 4 | Keep oxygen basis, initial versus changing flow, timing and geometry conflicts explicit. Source states preliminary results; do not infer resolved causation or transfer measured outcomes to a habitat. |

NASA's [ACME account](https://www.nasa.gov/humans-in-space/space-stations-quest-for-the-secrets-of-fire/) describes multiple gaseous-fuel investigations with distinct objectives. Program membership or shared hardware cannot establish matching fuel geometry or measurement conditions. Authorized-only operational systems linked from some NASA operations pages are not assumed to be public PSI downloads.

## Scientific limits to retain

The [challenge statement](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) emphasizes investigations relevant to crew environments and comparison of fuels, geometry, conditions, variables and measurements. It says no partial-gravity combustion data is currently available in PSI; electrical-field analogs are not actual lunar-gravity measurements. A source-library overview can explain this gap, while an analyzer must not fill it with invented measurements.

For every comparison, distinguish platform context from measured run acceleration; source-reported conditions from derived conversions; search tolerances from scientific uncertainty; initial flow from a time-varying experiment; and direct observation from mechanism, analogy, hypothesis or absent evidence. Unrecorded pressure plus recorded oxygen cannot support a source-backed oxygen partial-pressure calculation. A controlled causal comparison requires more than two related records.

Citation verification must have two levels: exact document/version/page/table/row lineage, and independent review that the cited material actually supports the statement. A valid URL, catalog signature, model answer or locator alone does not prove scientific entailment. Abstain on fire-risk probabilities, operational recommendations, certifications and conclusions not established by admitted evidence.

## Citation and disclosure requirements

For each used resource, record its publisher/creator, exact title, persistent identifier/DOI, dataset or document version, URL, access time and source-file hash where obtained. Use the repository-provided dataset citation rather than inventing author names or substituting an article DOI for a dataset DOI. Add the exact physical/printed page, section, table, row and column for a factual extraction, with original units/calibration basis. Derived claims additionally require their source inputs, stated conversion/assumptions and review status. A browser-table capture hash identifies that observation; it is not the hash of an original downloadable data file.

The B20 calibration citation is NASA report 20210011385, Table A.1, B20 (as-run 50), PDF page 112 / printed 104, calibrated initial/final oxygen columns. The new corroborating reference is PSI-25 Version 4, its dataset DOI and B20 experimental-table cells, accessed November 12, 2026; it remains a separate source observation. Preserve both locators rather than pretending the app already uses the PSI release.

For code/art/media reuse, record source paths/commits, creation tools, licenses/attribution and changes. Cite the resources actually used in the submission. Distinguish a tool used to create content, a source cited for scientific facts and a library used at runtime. The disclosure inventory supplies evidence for this accounting; it does not confer reuse permission.

## Rights findings

| NTRS ID | Current distribution | Current rights determination |
|---|---|---|
| 20210011385 | PUBLIC | GOV_PERMITTED |
| 20205008449 | PUBLIC | PUBLIC_USE_PERMITTED |
| 20210011521 | PUBLIC | MAY_INCLUDE_COPYRIGHT_MATERIAL |
| 20220015583 | PUBLIC | GOV_PUBLIC_USE_PERMITTED |

These are metadata declarations, not this agent's legal clearance. Preserve factual extraction and precise citations; do not bundle entire papers or figures on the strength of “PUBLIC.” NASA's [media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) distinguish NASA content, protected identifiers, third-party material and endorsement restrictions. Check each intended asset and source-specific terms. No NASA media was copied into the application during this research.
