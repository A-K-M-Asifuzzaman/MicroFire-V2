# Audited offline evidence

Coverage: **1 experiment (BASS-II B20), 1 claim, 1 NASA technical report**. This is a foundation fixture, not complete NASA coverage or an evaluated retrieval dataset.

Primary source: [NTRS 20210011385](https://ntrs.nasa.gov/citations/20210011385), *Burning and Suppression of Solids–II (BASS-II) Summary Report*. [PDF, page 112](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf#page=112), printed page 104, Table A.1, row B20/as-run 50. Download SHA-256: `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`.

The original report was downloaded to a temporary research directory, text-extracted and visually inspected. The source hash matches the upstream manifest. Local files `data/fixtures/catalog.json` and `b20-source-cells.json` store the reviewed factual transcription, not the entire PDF. `data/integrity.json` pins both files; npm run validate:data checks schema/relationships and bytes without contacting NASA. A local hash proves reproducibility, not independent scientific correctness. Human expert review is pending.

## Discovered discrepancy

The pinned upstream B20 record sets oxygen_vol_pct/oxygen_final_vol_pct to 16.5 and describes the initial value as calibrated. The source table's **calibrated initial/final O2 columns both say 17.4**. The adjacent initial/final readings say 16.5. V2 uses 17.4 vol% and preserves both readings in the source-cell audit. No reference repository was modified. Other rows may have the same column-mapping issue and must be rechecked before import.

Known fixture fields: material PMMA, 2 cm film width, opposed orientation, initial air-display value 5 cm/s, 100 micrometre thickness converted to 0.1 mm. The row's observation says the flame consumed the sample. Flow sequence retains `5, 3, pot 0.5`; a potentiometer value is not velocity. Do not claim a controlled constant-flow experiment.

Unknown/unextracted: individual pressure, acceleration, uncertainty, sample length, detailed time series. The report provides ISS microgravity context, but this fixture does not invent a run-level acceleration. No numerical fire risk, lunar safety conclusion or modeled flame outcome is provided.

## Rights

NTRS describes public distribution and “Use by or on behalf of the US Gov. Permitted.” That is not blanket permission for all third-party images. V2 bundles limited factual transcription and a short observation only; no PDF/figures/media/NASA logo. Upstream normalization is MIT-licensed; its notice is retained in THIRD_PARTY_NOTICES.md. Supplied design illustrations remain concept references, not scientific evidence or approved production assets.

See `data/migration/provenance-manifest.md` for upstream commit, file hashes, import mapping and quarantine policy.
