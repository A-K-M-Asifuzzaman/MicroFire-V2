# Fastest responsible NASA PSI evidence expansion — 2026-11-13

**Priority:** Add traceable, reviewed NASA observations to the MicroFire science runtime without delaying the five-mission deployment or altering B20's scientific invariant. Video editing remains postponed.

## Evidence already transcribed

See `data/candidates/nasa-psi-primary-table-20261113.json` in this branch. Nine primary NASA PSI table leads (4 BASS-II condition rows, 5 FLEX outcome rows) have been transcribed from the official public investigation pages. They are **not admitted evidence yet**.

NASA BASS-II: https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 — v4, DOI 10.60555/4qc4-de67.
NASA FLEX: https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 — v5, DOI 10.60555/mbq8-0451.

## P0: Three FLEX source rows with complete key fields

The following official FLEX `Experimental Table` entries are the initial independent-review targets:

| FLEX test # | Test identifier | Fuel | Date | Pressure (mmHg) | O2 mole fraction | Initial droplet diameter (mm) | Visible flame extinction diameter (mm) | Burn time (s) | Test end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 20CAL10 | Methanol | 2009-03-05 | 762.0 | 0.21 | 1.86 | 0.94 | 5.00 | Extinction |
| 3 | 20CAL12 | Methanol | 2009-03-05 | 764.2 | 0.21 | 1.61 | 0.92 | 3.20 | Extinction |
| 5 | 30CAL03 | Methanol | 2009-03-31 | 760.0 | 0.21 | 1.92 | 0.81 | 6.34 | Extinction |

These are first-party NASA PSI table fields, not modeled/simulated outcomes. This is **transcription of a published table**, not a claim that data admission has passed the project-specific review process.

The source table also has a `Burning rate; mm` header whose physical unit is ambiguous in the extracted page. Do **not** put that field into an SI-rate schema until verified from original metadata. The FLEX-2/3/5 pressure and O2 conditions are similar but not identical; **no controlled causal comparison is authorized**.

## Admission execution in a separate science integration branch

1. Retrieve the official PSI-69 v5 table export or primary experiment file; pin bytes and SHA-256, dataset version, DOI, retrieval timestamp and exact row identifiers. Verify each transcribed cell against original primary table rendering/export.
2. Have a reviewer inspect the three rows and explicit raw-vs-normalized unit mapping; mark genuinely missing uncertainties/accelerations as unknown. Verify that the outcome column is a reported **test end** and not proof of complete combustion, flame-spread rate or flammability limit.
3. Extend the science fixture/schema with a **distinct liquid-droplet FLEX observation type**, not a fake BASS-II PMMA record. B20's existing types, 17.4% calibrated condition, 55 quarantines, scientific ranker and mission gates must remain unchanged.
4. Add citations to PSI-69 v5 (DOI 10.60555/mbq8-0451) with unique experimental-row locators; don't use the parent investigation abstract as a substitute for a per-run citation.
5. Add positive tests for source-specific methanol droplet extinction observations, plus negative tests for cross-fuel pooling with PMMA, oxygen calibration-field substitution, unsupported pressure/gravity, missing uncertainty, false astronaut/habitat certification, invalid row locator and spurious cause claims.
6. Ensure PIX/Workstation expose these values **only within the approved scientific scope**; maintain abstention when user asks broader questions. If ranking cannot preserve fuel-phase incompatibility, integrate the table as an explicitly sourced comparative data browser first, and leave direct experimental claim ranking gated.
7. Recompute integrity manifests and tests. Never let a catalog-version change silently break existing public campaign visitor binding/progress; coordinate versioned release or data-only display.
8. Independently sign off each row and record admission status before deploying it. Source verification and project scientific admission are separate gates.

## Parallel hosted campaign work (highest release priority)

At time of preparation:
- Protected Vercel staging project exists and its Node deployment reports READY; /api/health and /missions/play returned 200 when fetched through authenticated Vercel access.
- Vercel staging flag for public campaign is 1, but the staging project remains protected behind SSO and is not public judge access.
- Supabase staging includes campaign visitor/head/budget tables and at least one test visitor with 25 recorded progression events. **There is no verified end-to-end two-visitor hosted five-mission completion yet.**
- Owner must maintain staging access control while completing actual hosted Playwright/HTTP acceptance. Focus on 2 independent browsers, 5 missions each, 5 Passport entries each, restart/reload, cross-owner rejection, correct CSRF and no secret leakage. After passing, publish a separate judge-accessible build with a basic abuse/connection cap and a rollback while preserving the original submission deployment.

## Scope

This is an actionable science/release handoff. No new runtime experiment records have been admitted, no campaign endpoints modified, no deployment promoted, and no video modified by this file.
