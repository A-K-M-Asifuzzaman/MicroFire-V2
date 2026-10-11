# Independent backend review and correction — 2026-10-11

## Scope and state

Writable origin: `https://github.com/A-K-M-Asifuzzaman/MicroFire-V2.git`. Reviewed Phase Zero base: `0bd3f056394ceeaa2891753055a7ab782d3be5c2`. Existing Phase One commits independently reviewed: `e8ea08c381054717ba4d0cd5f349001d75e03aa5` and `882e3c88a1737d65e83234b5dacd6163d6a98b00` (31 changed paths together). Git author metadata cannot establish which implementation agent wrote them; both were inspected regardless of the reported author. No independent external backend branch was exposed other than that history; Dependabot branches are unrelated and were not integrated.

Initial environment: parent cwd was the specification directory. Primary `MicroFire-V2/` remained clean on feat/phase-zero-contracts at 0bd3f05; backend `MicroFire-V2-codex/` was at 882e3c8 on feat/phase-one-science with an uncommitted shared-registry proposal. Both remote main and feat/phase-one-science were verified at 882e3c8. A new sibling `MicroFire-V2-backend-review/` on **feat/phase-one-backend-review** was created from that exact commit, preserving the primary Git directory and Claude's dirty file. No reset, blind cherry-pick, frontend overwrite, reference-repository write, paid/model/Meshy call, main push or deployment occurred.

Reviewed code includes the science catalog/quarantine/retrieval/Ask engine, Zod/API/save contracts, route handlers, rate budget and security headers, all unit/API/browser tests, the evaluator, fixture validator/security script, package/CI changes and source-review records. Pack specs, AGENTS.md, current API/ownership/acceptance/calibration documents and relevant project skills were read. Memory work_state tools were unavailable; this report records the review state instead of claiming it was saved remotely.

## Classification of existing work

| Area / claim | Decision | Evidence and limitations |
|---|---|---|
| One B20 fixture, source cells, immutable provenance and correction ledger | Accepted | Runtime remains one research record/claim/source; primary PDF and pinned legacy bytes re-hashed; table pages re-inspected. This is source checking, not independent human scientific validation |
| Manual NASA ingestion/review and 55-row quarantine | Accepted with corrections | Existing ledger/source audit preserved; guard additionally rejects quarantined test identities after IDs are renamed. No automated live ingestion or new record promotion |
| Search/index/filter, transparent ranking, gaps, restricted comparison, source lookup and export | Accepted with corrections | Real pure implementation and schema-valid HTTP; no controlled comparison or meaningful multi-study ordering claimed. Empty pure citation trails and long target display bounds corrected |
| Fixed-template grounded Ask | Accepted with corrections | No model or provider; unknown long IDs abstain, no-match target applicability disclosed, claim kinds/research origin enforced and oversized answers abstain safely. Free-text semantic entailment is not independently validated by locator checks |
| Strict API validation and safe errors | Accepted with corrections | Streamed 32 KiB, Zod strict DTOs, HTTPS source URLs, duplicate-query rejection, safe CSP/no-store and process budgets. Limiter exceptions now fail closed inside safe error envelopes |
| Pure game rules, faults, repair recovery, Passport and persistence | Accepted with corrections | Existing prerequisite/anchor/orphan fixes and v1→v2 migration retained; post-observation prediction edits rejected. Real registry still makes all starts UNAVAILABLE. Client saves are not authenticated achievements |
| Shared DTO compatibility within the current checkout | Accepted for backend consumption; joint signoff pending | No new DTO-shape/save-version changes here. P1's v2/signature/Ask changes need Claude's review; current foundation compiles against shared exports. External frozen v1 clients must update together; "additive" does not mean old strict schemas tolerate new keys |
| Six feature explanations | Accepted as proposed text; Requires changes for integration | Exact evidence/diff in FEATURE_REGISTRY_REVIEW.md. Owner requested leave pending. Stale methodology/home copy remains in Claude-owned components |
| Independent science validity, general retrieval/intent accuracy, AI-provider failure handling and public-scale security | Not yet verifiable | No human review, external/model adapter, distributed limiter, independent query set or comprehensive security audit. Existing tests cover deterministic behavior, not those claims |
| Fully functional frontend, playable missions, global rankings, verified legacy corpus or public readiness | Rejected as completion claims | No UI consumes the new actions/API workflows, no mission browser loop exists, only B20 is served and all release gates remain active |

## Confirmed defects corrected locally

1. **High scientific-integrity boundary:** the answer verifier accepted a cited hypothesis relabelled as direct observation. It now checks claim kind/category and research origin. This verifies labels/lineage, not semantic truth of arbitrary prose.
2. **High quarantine boundary:** changing both IDs allowed a B16 test identity through the catalog guard. The guard now checks test identity as well. No legacy row was actually imported.
3. **Medium relevance:** B999/F123/GMT9999-T123 mentions could fall through to B20 via PMMA lexical overlap. Expanded identifier recognition abstains before retrieval.
4. **Medium applicability:** a named B20 answer with no requested condition matches lacked an explicit target gap. It now states no requested conditions match and separates source observations from requested applicability.
5. **Medium citation correctness:** verifyCitations returned lineage-verified for an empty pure-function trail. It now returns lineage-mismatch; HTTP already rejected empty arrays.
6. **Medium prediction history:** PREDICT_OUTCOME could replace a prediction after the result was recorded, leaving the Passport and current prediction contradictory. Existing INVALID_ACTION now preserves both at that revision.
7. **Medium API reliability:** limiter exceptions occurred outside safe GET/POST error boundaries. They now return safe JSON 500 and no research operation proceeds.
8. **Medium API reliability:** valid 4,000-character target input or a long question could produce invalid response text and return 500. Target previews are explicitly truncated for display only; Ask checks response text bounds and abstains without truncating science.

Regression evidence: the first added test run had 9 failures and 69 passes (78 total); the availability guard passed while the defect cases failed. After those fixes, two additional size-bound tests reproduced HTTP 500 and failed separately. Final unit suite has 80 cases. Two Ask evaluation cases were added (30 total); these remain author-labelled regressions, not an independent scientific benchmark. Existing repairs/negative cases were not removed.

## Scientific validation report

The cached primary NASA report re-matches SHA-256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`; cached pinned experiments.json re-matches `bb756a0e8133cbe2567cdcfdc43e4efd1509fa0e699e24efa6c0d4fed194b993`. Original PDF pages 111/112 were text-extracted and existing rendered pages inspected in this review. This was not a fresh network download and not a human independent review.

- B20 calibrated O2 remains 17.4/17.4, with initial logged flow 5 cm/s and raw sequence `5, 3, pot 0.5`. Pressure/run acceleration/uncertainty remain unknown/unextracted.
- B16/B19 calibrated O2 17.3/17.2 versus adjacent uncalibrated legacy columns is confirmed. Restrictors B16/B20=2 and B19=0; B16 igniter-wire anomaly and raw pot notation were retained. No universal offset, velocity conversion or controlled-series claim is accepted.
- Runtime: **1 B20 record, 1 claim, 1 NASA source**. Quarantine: **55**, including B16/B19 source-cells-checked-pending-review and 53 quarantined. No science fixture, hash manifest, source-review cells, ledger or datasetVersion changed.
- No full-dataset ranking performance, semantic entailment accuracy, lunar risk, certification, instrument dimensions or independent scientific validity is claimed. The game uses an educational dependency model. Prediction sequencing is not blinding, because previous source/Assembly views can expose the result.

## Verification (actual run evidence)

All npm commands use the bundled Node 24.19.0; NEXT_TELEMETRY_DISABLED=1 for build/browser verification. Clean npm ci succeeded (200 installed, 205 audited, zero vulnerabilities); existing esbuild/fsevents allow-scripts warnings remain, with no broad approval or dependency change. Browser cache is the already-approved absolute cache in primary MicroFire-V2; no download needed. Browser suites use 3217 sequentially; additional production API probes use 3103.

| Check | Result | Evidence |
|---|---|---|
| npm ci | PASS | Exit 0, clean lockfile install |
| npm test | PASS | Exit 0, 80 tests / 4 files |
| npm run check (lint, types, unit/API tests, source integrity, evaluation, security, production build) | PASS | Exit 0: zero lint warnings; root/Next types; 80 unit/API tests; 1 source/record, 55 quarantined, 4 file hashes; Ask 30/30, rank 6/6, citation/category checks 13/13, forbidden 0; basic security; Next 16.4 webpack build |
| npm audit --audit-level=high | PASS | Exit 0, zero vulnerabilities |
| npm run test:e2e | PASS | Exit 0, 12 desktop/mobile production Chromium tests, 8.6 seconds; source/offline/no-JS journey, route/mission gates, API/headers/quarantine checks |
| New production HTTP regression probes | PASS | Exit 0, 9/9 assert-based probes: three unknown IDs, zero-target match gap, answer/rank bounds, empty-citation rejection, unchanged registry gating, strict CSP. Temporary production server on 3103 was intentionally stopped afterward (SIGINT/130), not a failed application test |
| Expanded credential review / git diff --check | PASS (limited scope) | Exit 0: named-token/private-key patterns on 4 ancestor commits / 470 text snapshots found 0 matches; current files scanned by security guard, whitespace check clean. No secret values printed; no entropy scan |
| Remote CI for 882e3c8 | PASS | Previously independently confirmed run 38155438859 on exact SHA; does not verify this new local commit |
| Remote CI for this local review | NOT TESTED | No push authorized/performed |
| HawkScan / comprehensive entropy/history scan | NOT TESTED | HAWK_API_KEY is unset (presence only checked); gitleaks/trufflehog unavailable. Limited history pattern check above is not a full audit; no cloud scan, tool install or secret disclosure |
| Independent human science, mission UI, full WCAG/performance, non-Chromium/device matrix | NOT TESTED | Separate acceptance gates, outside this backend correction run |

## Open gates and handoff

**Status: Accepted with corrections for the reviewed backend handoff; all executed local checks pass. Phase One stays at the integration gate. Public release is BLOCKED.** CLAUDE_BACKEND_HANDOFF.md gives typed consumption/examples; FEATURE_REGISTRY_REVIEW.md gives all six decisions and exact proposed text. No shared/frontend/config/browser-test file is changed here. Claude approval of the pending registry patch and P1 shared contracts is not inferred from a build or this report. The existing browser suite was reused without editing shared tests; its captures were reproduced without a tracked screenshot change. The new regression HTTP probes were additional local assertions, not claimed as nine new Playwright tests.

High release gates: distributed/per-client quotas and slow-body/host protection; independent human science before record promotion or applicability claims; meaningful corpus coverage before comparisons/global rankings. Medium gates: nonce/hash page CSP agreed with Claude, complete secret/history audit, immutable CI-action pins, source/asset rights and apparatus geometry review. Model/provider integration additionally requires approved budget, allowlisted network/cache/timeouts, bounded retry/failure tests and semantic evidence checks. Current public read-only APIs have no auth, uploads, provider fetch, user identity or server persistence; corresponding auth/CSRF/SSRF controls are required if those capabilities are introduced, not falsely asserted as tested today.

Retain the primary checkout, do not overwrite Claude's dirty registry, and do not push directly to main. Final handoff supplies this report's exact local commit SHA. No next-phase frontend/game scene work or mission activation is authorized by this backend audit.
