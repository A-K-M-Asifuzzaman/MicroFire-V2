# NASA primary-source candidate review — 2026-11-12

No promotion. Admitted catalog/integrity fixture bytes unchanged. New data/candidates/review-20261112.json records four quarantined review items with primary URLs, fresh byte hashes, exact locators, raw units, missing values and contradictions. candidates.ts validates the review-only shape; quarantine.ts excludes candidate IDs and original test identities, including renamed candidates. ACME is a source lead, not an invented individual experiment.

BASS-II: fresh 48,972,416-byte report re-matches existing source SHA-256 5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770. Physical PDF 112 / printed 104 was rendered and inspected. B20 calibrated oxygen remains 17.4 vol%; B19's adjacent calibrated/uncalibrated columns and restrictor were checked again. Existing B16/B19 review remains quarantined. [Primary report](https://ntrs.nasa.gov/citations/20210011385).

FLEX: PDF 4, inset FLEX-062, inspected visually. Original oxygen mole fraction and pressure unit retained. Diameter symbols/units require further review; no curve digitization or invented time series. [Primary document](https://ntrs.nasa.gov/api/citations/20205008449/downloads/Effects%20of%20ambient%20inert%20gas%20properties%20-Combustion%20Science-Nayagam-FAW.pdf).

Saffire V-2: Table 1 is physical/printed page 3, not page 5. Oxygen is mol%; initial flow is not the full flow history. Pages 2–4 contain geometry/timing discrepancies requiring review; no controlled transfer to B20 or lunar conditions. [Primary paper](https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf).

ACME: NTRS metadata led to the primary poster; page 1 visually inspected. It identifies investigations/apparatus but no complete run. Dates differ between poster and metadata abstract; no run timestamp inferred. [Primary citation](https://ntrs.nasa.gov/citations/20220015583). NASA PSI Saffire-I PSI-98 was located, but page extraction exposed no readable data files; access/API/holdings remain unverified. [PSI discovery](https://psi.nasa.gov/physci/repo/data/investigations/PSI-98).

Reproduce: node --import tsx scripts/fetch-candidate-sources.ts /tmp/microfire-sources then node --import tsx scripts/verify-candidates.ts /tmp/microfire-sources. Downloads are explicit, NASA-only, bounded, hash-pinned and never overwrite changed existing bytes. No runtime ingestion and no promotion command. Original PDFs remain temporary research inputs and are not served or redistributed. Hashes prove bytes, not scientific approval.

Promotion requires an independent scientist to check each locator, units/calibration, uncertainties, anomalies, original PSI linkage and source rights; owner-approved datasetVersion/integrity/quarantine changes; new per-record evidence/negative tests; separate apparatus/comparison applicability review. The candidate schema deliberately cannot mark a record approved.
