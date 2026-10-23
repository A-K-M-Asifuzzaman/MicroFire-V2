# Astra findings — fixes and Claude M1 integration report

Date: 2026-10-14. Integration branch: **feat/astra-defect-fixes**. Worktree: **MicroFire-V2-astra-fixes**. Reviewed parent: **1c1af90e41390a6dcb3e3cb87fefa0f9472f6542**. The final committed SHA is supplied in the delivery message; resolve the identical local integration head with `git rev-parse feat/astra-defect-fixes`.

**Verdict: READY for Claude's frontend M1 development against this backend contract baseline.** No backend blocker from Astra's five findings remains. Claude must adopt/review the current contracts and verify actual frontend consumers. This is not frontend integration acceptance, independent human scientific approval, playable-game acceptance or public-release approval.

## Recovery and ownership

Read the full independent review, its eight probes/six failures and logs, the recovery audit, backend review and authoritative contracts/ownership/specifications. Reproduced the original six failures on 1c1af90 in the new integration worktree before changes. No Phase Zero work was restarted. Existing review commits are included by ancestry.

The primary Phase Zero checkout stays at 0bd3f05; the science checkout stays at 882e3c8 with its original six unstaged reason proposals; the backend-review checkout stays at 1c1af90 with its pre-existing untracked recovery audit. Their files were not modified. The original proposal SHA-256 remains 4cbae99f3419faf80684c65eb4a417f223cca39282570afd0c4ececd52a63d0d. No reference repository was written, no force operation/push/main merge/deployment occurred, and no Meshy or provider call occurred.

The owner's latest instruction explicitly authorizes these defect/contract corrections and applying the approved descriptions. Shared changes and consumer obligations are documented in API_CONTRACTS.md, OWNERSHIP.md and CLAUDE_BACKEND_HANDOFF.md. This report does not claim another agent's signoff or a message sent to Claude.

## Findings and exact corrections

| Finding | Correction | Regression evidence |
|---|---|---|
| R1: metadata matches promote an unmeasured outcome to direct | Ranking now computes source claim support independently of relevance. A complete canonical claim-text match is required; research origin, evidence-bearing kind and a resolvable declared source/citation are checked. Direct additionally requires observed kind and exact recorded target values. Tolerance-only matches cannot become direct. Results carry support.kind/claimId/citations and explain the limit. Unsupported or unrecognized claims remain gap. | Temperature request with PMMA remains gap despite matching metadata; negation and added causal claims cannot match; exact observed claim is direct at 17.4 and analogous at retrieval-only 17.5; derived/interpretation/hypothesis/unknown remain distinct; unresolved citations fail support. |
| R2: learner notes evict canonical limitations | Entry.limitations copies all canonical experiment caveats without truncation or learner overrides. Entry.learnerNotes is separate, with bounded exact deduplication for the lunar report. Passport validation rejects missing canonical limitations. | All canonical caveats survive 20 distinct learner notes, export, save and reload. Long repeated notes retain source warnings. Removing the warnings fails validation. |
| R3: repeated test IDs overflow Ask's reason and cause HTTP 500 | Deduplicate references case-insensitively. Lookup still uses full IDs; display summaries bound distinct IDs/count and visibly abbreviate exceptionally long IDs. Existing safe errors and citation verification remain. | Both original 3,994/3,995-character inputs return schema-valid 200 abstentions. Distinct IDs and one 4,000-character ID remain bounded; repeated B20 retains the same source citations. Malformed requests return 400; unexpected failures expose no internal error text. |
| R4: accepted state cannot be saved | The reducer's common success boundary checks schema, apparatus consistency and the same exported MAX_SAVE used by save/load. Oversized candidates return SAVE_LIMIT_REACHED with the identical previous state. REMOVE_PROPOSAL provides explicit reversible budget recovery. Restore also checks size after migration/default normalization. | The seventh oversized proposal is refused before mutation; all accepted states save. A proposal can be removed and the mission completed/saved. Exact 500,000-character boundary saves/restores, one character over is rejected without replacing a prior save. |
| R5: attempt cap prevents correction | At 200 attempts, discard the oldest superseded attempt while retaining each statement's latest answer, then append the new classification. The cap bounds history rather than correction opportunities. No score/attempt penalty is introduced. | Correct after 200 mistakes, save/reload, classify remaining statements and complete. Latest answers for other statements survive 205 repeated attempts. |

The matcher in R1 deliberately does not claim general semantic entailment. Case/Unicode/whitespace and terminal question marks/full stops are normalized; arbitrary paraphrases are not accepted as proven source support. Discovery results can still have a high relevance score with gap support. A gap here means support was not established by this matcher, not global absence of evidence. This conservative limitation is explicit in the API/UI handoff.

## All six original failure scenarios

| Assertion | After fix |
|---|---|
| Repeated B999 references: expected 200 bounded abstention | PASS |
| Repeated B16 references: expected 200 quarantined abstention | PASS |
| Learner notes must retain every canonical caveat | PASS |
| Every accepted proposal state must be persistable | PASS with safe early rejection asserted |
| Correct classification after 200 attempts | PASS; also persists and completes |
| Unmeasured flame temperature must not be direct evidence | PASS; unsupported/gap |

Five original assertions pass unchanged. The original save probe's helper required all seven oversized actions to succeed, even though its stated intent allowed rejection before committing state. Re-running that untouched probe now fails at the new safe rejection, rather than at save. The committed adaptation checks the intended safety property, identical prior state, persistability and recovery. The original external review/test evidence was preserved. No scientific value or source fixture was changed to satisfy tests.

The focused run selects these six scenarios: **6 passed, 17 unrelated tests skipped**. The full run executes all tests, with no skips. The two original boundary demonstrations (test-only arbitrary composer text, synthetic incompatible apparatus record) remain explicitly labelled limitations and are not reported as resolved vulnerabilities or admitted NASA evidence.

## Verification

All checks use the existing bundled Node 24 runtime and existing local dependencies. No install/update, package/lockfile/config change was made.

| Command/check | Final result |
|---|---|
| npm run check | PASS: lint, root/Next types, 103 tests in five files, data validation, science evaluator, basic security guard, production build |
| npm run test:e2e | PASS: 14/14 on production desktop/mobile Chromium; original 12 plus two regression project cases |
| Focused Astra six-scenario Vitest run | PASS: 6/6 selected |
| npm run eval:science within check | PASS: Ask 30/30; rank 7/7; citation/category “faithful” 13/13; forbidden 0; repeatable 30/30 |
| npm audit --json | PASS: zero reported vulnerabilities |
| git diff --check | PASS |
| Registry/readiness invariant probe | PASS: exactly six reasons changed; all other registry text/fields unchanged; 0 Available, 7 Preview, 13 Coming Soon, 1 Blocked, 0 Locked |
| Fixture/quarantine/integrity/dependency diff probe | PASS: no changes from 1c1af90 |
| Pending proposal hash/status checks | PASS: original dirty proposals preserved in the science worktree |

New tests live in tests/unit/astra-review.test.ts: the original eight probes with the documented save adaptation, plus 15 added cases (23 total). They cover unsupported claims, source kinds/locators, response schemas and error privacy, reference bounds/citation stability, exact save boundaries, legacy v2 defaulting and retained raw restores. Existing game tests now save/restore throughout 2,000 seeded actions and actually round-trip all five missions. Existing science expectations use an actual supported observation for direct evidence. The gold set adds the unmeasured-temperature case; its previous metadata-only direct query is replaced by the canonical observation, not by changed scientific data. Browser tests exercise both abstention regressions and unsupported/supported ranking through HTTP.

Browser screenshots are generated evidence of the existing foundation, not completed M1 interactions. The two regenerated dossier images are retained with this verification. The evaluator remains a small author-labelled deterministic regression set, not independent semantic or ranking-quality validation.

An intermediate final-check run timed out the expanded 2,000-action save/restore test at about six seconds under Vitest's five-second default, without a failed state assertion. Only that test now has a 15-second execution budget; all 2,000 actions and assertions remain. The subsequent full check is the final result reported above.

## Scientific data validation

Runtime remains one source, one BASS-II B20 experiment and one observed claim, dataset p0-bass-b20-v1. Fixture/integrity hashes and source cells are unchanged. Calibrated oxygen remains 17.4/17.4 vol%; raw flow remains 5, 3, pot 0.5. Unknown pressure, acceleration and uncertainty are not imputed. No fresh source download or new scientific record was required.

All 55 other legacy rows remain excluded. B16/B19 retain source-cells-checked-pending-review; the remaining 53 retain quarantine. B16 calibrated O2 17.3/17.2 versus legacy 16.5/16.4 and B19 17.3/17.2 versus legacy 16.4/16.3 remain documented, together with restrictor/procedure/anomaly concerns. No controlled B16/B19/B20 series, pot-to-velocity conversion or lunar safety claim was introduced. Independent human review is still required before data promotion.

## Registry and final contracts

The integration branch applies the five previously accepted reasons and corrected Ask wording: “Deterministic, catalog-grounded answers with citation-lineage checks and abstention exist as an API (no AI model); the PIX UI is pending.” All availability and implementation/verification fields remain unchanged. The separate original pending file is preserved so another agent's work is not overwritten. Home/methodology UI copy is still Claude-owned work.

| Boundary | Final contract |
|---|---|
| Rank | API envelope 1; rankingVersion p1-claim-support-v2; required support {kind, claimId, citations}; relevance separated from evidence support |
| Ask | Same request, envelope and response shapes; bounded deduplicated abstentions; no provider |
| Passport | Version 1; limitations stays canonical; learnerNotes defaults [] and is separate; missing source caveats rejected by validator |
| Game | State v2 and v1 migration retained; transition signature unchanged; new REMOVE_PROPOSAL action and SAVE_LIMIT_REACHED failure |
| Persistence | Same normal/demo keys; MAX_SAVE = 500,000 serialized UTF-16 characters exported and consistently enforced, including post-load normalization |

This pre-release API baseline must be consumed synchronously. Added response fields are not wire-compatible with older strict parsers. Existing v1 saves and v2 entries without learnerNotes have tested migration/default handling; old edited/defective passports missing source warnings are not silently approved by load. Canonical dossier warnings must always remain visible and Passport validation failures must be surfaced.

## Claude ownership and remaining gates

Claude owns the next Three.js/R3F dependency/package/lockfile proposal in its own branch; Sol makes no concurrent dependency edits. Review pinned versions, install/audit/check/browser results before merge. This assignment is recorded in OWNERSHIP.md; no other chat acknowledgement is claimed.

Use the integration branch as M1's base. Claude reviews the shared contract adoption and builds the research controls with coverage, source limitations, claim-support labels, abstention/error/retry and export states. No frontend implementation or next milestone was started by this correction task. Keep production missions gated until their full UI loops pass browser acceptance.

Remaining limitations: one-record corpus; no meaningful two-record comparison; no general semantic entailment validator; future multi-record apparatus binding still needs explicit review; public quota/CSP/timeouts/CI pinning and complete security review remain release gates. Client saves remain untrusted, last-writer-wins and subject to storage availability. No human science signoff, Safari/Firefox/real-device testing, measured performance/accessibility approval or user study was performed. Public release remains BLOCKED.

Stop at this integration report; no automatic M1 implementation, main push, paid call or deployment follows.
