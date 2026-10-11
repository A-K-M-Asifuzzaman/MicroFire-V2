# Legacy calibration audit — acceptance review, 2026-10-11

Scope: the **pinned** MicroFire-Atlas data snapshot at `acb9aaa69486154da657c61469d3a1886e4c12b1`, not the latest unpinned upstream branch. Reference files were read from the temporary Phase Zero snapshot; no reference checkout, scripts, credentials or writes were used.

The temporary experiments.json hash still matches `bb756a0e8133cbe2567cdcfdc43e4efd1509fa0e699e24efa6c0d4fed194b993`. The primary NASA PDF matches `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`. Original table text and column positions were checked, including visual inspection of the B16/B19/B20 rows. Runtime V2 coverage remains **one** B20 fixture; the extra rows below were inspected for calibration discrepancies only and were not imported or fully verified.

Primary authority: [NASA NTRS 20210011385](https://ntrs.nasa.gov/citations/20210011385), [Table A.1, PDF page 111 / printed 103](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf#page=111) and [PDF page 112 / printed 104](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf#page=112).

| Legacy test | Legacy initial/final O2 vol% | Original calibrated initial/final columns | Status in V2 |
|---|---|---|---|
| B16, as-run 51, page 111 | 16.5 / 16.4, labelled calibrated | 17.3 / 17.2 | BLOCKED for import; calibration mismatch confirmed, full record review pending |
| B19, as-run 52, page 112 | 16.4 / 16.3, labelled calibrated | 17.3 / 17.2 | BLOCKED for import; calibration mismatch confirmed, full record review pending |
| B20, as-run 50, page 112 | 16.5 / 16.5, labelled calibrated | 17.4 / 17.4 | Corrected fixture only; other fields remain limited to the audited subset |

The legacy values above appear in adjacent initial/final columns rather than the columns headed calibrated O2. Do not apply a universal numeric offset: reported offsets and missingness vary by row and procedure. This audit confirms column transcription differences, not the independent accuracy of the instruments or NASA's calibration model.

## Quarantine inventory

The pinned file has 56 candidate BASS-II rows. Twenty-five rows annotate their oxygen value as from a calibrated column: B1–B22 (22, Table A.1) and F1–F3 (3, Table A.2). This is a **review-candidate count, not a count of proven errors**. B20 is corrected in V2; the other 24 annotated candidates require row/header verification, as do the other 31 rows whose calibration basis is not established by that annotation. All 55 rows absent from the fixture stay quarantined. No Saffire/LUCI/findings/media content was imported during acceptance.

## Claims that must remain blocked

| Claim or action | Gate / reason |
|---|---|
| Present legacy B16/B19 oxygen values as calibrated | Confirmed source-column mismatch; must correct values and retain the correction ledger before import |
| Import a full legacy catalog or advertise 56 verified V2 experiments | Only one runtime record has an accepted source trace; candidate inventory is not scientific verification |
| Call B16/B20/B19 a controlled experiment with identical oxygen and only airflow changing | Their calibrated initial values are not identical, flow changes during runs, and other setup/procedure differences must be reviewed |
| Convert fan potentiometer values (pot 0.4, 0.5 or 6.0) to velocities | No reviewed calibration supports that conversion; retain raw notation instead |
| Promote a series pressure range to an individual test reading | Per-test pressure has not been established in the accepted fixture |
| Use legacy-derived sustained/quench/blowoff categories as verified labels for ranking, model training or gameplay | Reconcile the original observations, endpoint definitions, procedure and corrected conditions first; an authored outcome code is not a new NASA measurement |
| Claim matched lunar/Martian evidence, safety probabilities or certified operational recommendations | Not supported by the accepted one-record corpus; the fictional lunar mission remains Coming Soon and cannot award direct lunar evidence |
| Reuse unreviewed NASA/third-party footage or model dimensions as evidence | Requires experiment identity, source locator and rights/geometry verification, independent of calibration fixes |

Runtime containment: the catalog imports only data/fixtures/catalog.json. There is no upstream loader, ingestion scheduler or provider call. GET requests for bass2-b16/bass2-b19 do not resolve; rank/compare/Ask services return 501 rather than publishing those claims. The migration manifest's per-record review gate remains in force. A future dataset update must add original source cells, corrections, missingness, terms and tests in a reviewed V2-only commit and change datasetVersion; never patch the reference repository.

Independent human scientific review and full-corpus calibration/endpoint evaluation remain **NOT TESTED**. That is a data-promotion gate, not permission to treat the legacy candidates as verified during Phase One.

## Phase One B16/B19 primary-source review — 2026-10-11

Machine-readable record: `data/quarantine/b16-b19-source-review.json` (hash-pinned in `data/integrity.json`). The NASA PDF was freshly downloaded and its SHA-256 re-matched (`5ffa911f…f770`). Column alignment was checked two ways: pdftotext `-layout` character offsets of each header against each value, and visual inspection of PDF pages 111 and 112 rendered at 110 dpi. The legacy file at the pinned commit re-matched `bb756a0e…b993`.

| Field | B16 (as-run 51, p.111 / printed 103) | B19 (as-run 52, p.112 / printed 104) | Legacy |
|---|---|---|---|
| Calibrated initial / final O2 vol% | **17.3 / 17.2** | **17.3 / 17.2** | B16 16.5/16.4, B19 16.4/16.3, labelled "calibrated" |
| Initial / final O2 vol% (uncalibrated columns) | 16.5 / 16.4 | 16.4 / 16.3 | — the legacy values come from these columns |
| Flow restrictor | 2 | **0** | not recorded |
| Air display | 3, 5 pot, 0.4 pot | 10, blowoff | matches |
| Observation | quenched after prolonged burn at 0.4 pot; one-sided flame; "did igniter wire affect top flame?" | blew out at a pot of 6.0 | outcome labels "quenched as flow was reduced" / "blew off at high flow" |

Findings:

1. **Confirmed (High):** both rows have the same column-transcription error as B20. Legacy oxygen comes from the uncalibrated Initial/Final O2 columns while claiming the calibrated column. The calibrated-minus-uncalibrated difference is 0.8 (B16) or 0.9 (B19, B20) vol%. No universal offset applies.
2. **New (Medium):** B19 ran with flow restrictor 0, while B16 and B20 used 2. Section 1.2 (PDF page 12) states that restrictors change the maximum duct flow (~55 cm/s with none, ~35 cm/s with two). The legacy schema has no field for this, so a B16/B19/B20 "airflow series" would hide a hardware difference.
3. **New (Medium):** both legacy outcome labels are authored interpretations. The rows record potentiometer settings at quench and blow-out, not velocities, and no pot-to-velocity conversion is reviewed for these rows.
4. **New (Medium):** B16's observation records an anomaly question about the igniter wire and a one-sided flame, but the legacy record has no quality flag.

**Decision:** B16 and B19 stay quarantined (ledger status `source-cells-checked-pending-review`). They are not in the runtime catalog, and every research API, Ask and gameplay path refuses them; regression tests cover each path. Promotion requires independent human review of these cells and findings, a corrected V2-only record with its own claims/limitations, and an owner-approved datasetVersion change. The other 53 rows stay `quarantined`, with legacy locators marked `verified: false`. The full containment list is `data/quarantine/legacy-ledger.json` (55 rows, every legacy row except B20).
