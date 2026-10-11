# Read-only migration manifest — Phase Zero

Source repository: https://github.com/A-K-M-Asifuzzaman/MicroFire-Atlas
Pinned HEAD inspected: `acb9aaa69486154da657c61469d3a1886e4c12b1` (2026-10-11).
Access: public GitHub GETs only; no local writable reference checkout, push, PR or remote change.

| Source path | Observed inventory / bytes | Decision |
|---|---|---|
| apps/web/data/experiments.json | 56 BASS-II records; SHA-256 bb756a0e8133cbe2567cdcfdc43e4efd1509fa0e699e24efa6c0d4fed194b993 | B20 reviewed/corrected; other 55 not validated for V2 |
| apps/web/data/sources.json | 19 source entries; SHA-256 ea31209e6f1a5be59ce57ed20f290d53392eaa084de1acdd8c33a63f2fee639a | One source independently fetched/checked |
| apps/web/data/saffire.json, luci.json, findings.json, media.json | Paths confirmed in pinned tree; contents not audited | Not imported; counts/claims not asserted |
| LICENSE | MIT, copyright 2026 AKM Asifuzzaman | Notice preserved; does not supersede NASA media rights |

Accepted mapping: bass2-B20 → bass2-b20; test_id → testId; source_id → canonical source ID; record locator → explicit PDF physical page plus printed page. Candidate material, geometry, flow and observation were rechecked against NASA. Oxygen corrected 16.5 → 17.4 calibrated; thickness explicitly derived from source units; series pressure omitted from the per-test condition. Normalized evidence is in data/fixtures/catalog.json. No source runtime code or competitor content was imported.

## Future migration procedure

1. Pin reference commit before reading. Download only public selected data files to temporary/quarantine storage; record exact SHA-256, path, license and immutable commit URL. Never run upstream scripts or package installation.
2. Fetch each canonical NASA document by reviewed allowlisted URL, with bounded size/time/retries. Resolve redirects only after host/IP review; never accept a user-provided arbitrary fetch URL. Keep originals immutable outside the served bundle.
3. Inspect headers, units, footnotes and row/page alignment, using both extraction and visual PDF review. Confirm citation resolves to the asserted fact. A JSON parser passing is not scientific verification.
4. Keep a per-record acceptance ledger: pending/rejected/accepted, source cells, corrections, reviewer/date, missingness and rights. Treat all unreviewed records as quarantined and absent from public catalog.
5. Normalize into the v1 schemas without unit guesses or unknown→zero. Validate unique IDs, sources/locators, hash checks and source-to-claim tests. Have a second reviewer check scientific meaning, especially oxygen calibration.
6. Stage the whole new dataset and integrity manifest as a reviewed commit on MicroFire-V2 only. Update datasetVersion, test consumers, and plan save compatibility; do not mutate old snapshots in place. Production reads only the accepted bundled catalog, never a watched upstream branch.
7. Roll back by selecting the previous V2 dataset commit; never roll back or write into MicroFire-Atlas. Human approval is required for publishing the new corpus.

No full-corpus migration job is enabled. No network ingestion runs during builds or browser requests. Known column discrepancy blocks bulk promotion.
