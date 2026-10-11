# Six feature explanations — independent backend review

Reviewed starting at `882e3c88a1737d65e83234b5dacd6163d6a98b00`. Shared owner: Claude/Codex under OWNERSHIP.md. The owner confirmed: **"Claude proposed them; review and leave pending."** The uncommitted `MicroFire-V2-codex/packages/shared/src/features.ts` patch was inspected and preserved. No reachable Claude Code thread was exposed by the task tools; this report and CLAUDE_BACKEND_HANDOFF.md carry the review. No patch was applied or committed to the shared registry in this worktree.

Follow-up review: local backend HEAD is `6a82887be81653255867fc748751e8b84b2479bd`; its corrections are not pushed or integrated into `882e3c8`. The six capability statements were checked against both baselines. **Five are accurate as written; Ask needs wording clarification.** Methodology's proposed reason is accurate, but its rendered page contradicts it. All six remain pending joint review and owner approval; this report is not permission to apply them.

## Evidence and decisions

| Entry / retained state | Current backend / exact unit evidence | Production browser evidence | Frontend / science / release boundary | Decision |
|---|---|---|---|---|
| dashboard / Coming Soon | searchExperiments + rankEvidence; science.test.ts: "searches deterministically with AND semantics and exact filters", "ranks reproducibly, explains its formula, and never labels unknown gravity as direct" | science-api.spec.ts: "research APIs serve truthful limited-data responses end to end" | No question/filter/ranking workstation UI. One B20 record, retrieval tolerances not equivalence, independent evaluation pending | Accepted proposed explanation; keep Coming Soon |
| atlas / Preview | searchExperiments + GET experiments; same search unit, api.test.ts: "validates pagination, rejects unknown/duplicate filters and distinguishes missing records" | API browser test above; foundation.spec.ts: "offline source journey, keyboard access, corrected science and screenshots" | Existing one-record browse/dossier journey works; no search controls, no broader curated corpus | Accepted proposed explanation; keep Preview |
| experiment / Preview | GET experiment + exportEvidence; science.test.ts: "exports reproducible, hash-pinned evidence records with resolvable links" | API browser test verifies export 17.4; foundation source journey verifies dossier/citation | Dossier displays known/unknown provenance. No export UI; no second approved record for comparison | Accepted proposed explanation; keep Preview |
| gaps / Coming Soon | classifyGaps; science.test.ts: "classifies coverage per field and states that absence is not global absence" | API browser test verifies pressure not-recorded | No frontier controls/coverage visualization. Field coverage does not answer every research question or establish worldwide absence | Accepted proposed explanation; keep Coming Soon |
| ask / Coming Soon | answerQuestion + verifyAnswerStatements; science.test.ts: "answers airflow questions with separated, verifiable statements and explicit gaps", "withholds an answer when a drafted citation does not resolve to the catalog"; api.test.ts: "abstains on unsupported safety questions instead of fabricating answers" | API browser tests verify answered and quarantined responses | No PIX question/answer UI. Fixed catalog templates, no AI model. Citation verification is lineage, not scientific truth or general semantic entailment | Accepted with wording correction below; keep Coming Soon |
| methodology / Preview | scripts/eval-science.ts + data/evals/science-gold.json; generated docs/evals/report.md | foundation.spec.ts: "every advertised route resolves and all missions remain unavailable"; no evaluation-reading task tested | Small author-labelled regression set exists; independent evaluation is pending. Page body still says ranking/AI answers/evaluation are unimplemented | Accepted registry proposal; **Requires changes** to stale page copy by Claude before integration acceptance |

All listed browser tests are run against the production server in desktop/mobile Chromium. API requests inside Playwright prove HTTP behavior, not a finished research UI. Tests in tests/unit/contracts.test.ts reject false Available/Locked/Preview labels; api.test.ts adds "does not promote backend-implemented features or missions without UI verification". The status inventory remains 0 Available, 7 Preview, 13 Coming Soon, 1 Blocked, 0 Locked. All five mission starts remain UNAVAILABLE under the real registry.

Only B20 is source-checked in runtime; it is not independently human validated. All 55 legacy records remain quarantined. No reviewed public release exists, and per-process quotas, page CSP and release-security gates remain open.

"Validated" in these proposals means admitted to the current source-checked catalog, not independent human scientific approval. Dashboard, atlas, experiment, gaps and Ask have implemented/tested backend behavior. Only atlas browsing and the dossier have a partial frontend journey tested; the workstation, search controls, export controls, frontier and PIX workflows are not integrated or end-to-end UI tested. Methodology displays fixture methodology, not the evaluation report. None of the six has public-release approval. A successful HTTP request inside Playwright must not be recorded as verification of a complete frontend feature.

## Exact proposed before / after

These are Claude's inspected edits, not an applied patch. State, route, implemented, prerequisites and verification are unchanged.

```diff
- dashboard: Search and scientific ranking arrive in Phase One.
+ dashboard: Search and ranking APIs exist over one validated record; the workstation UI is pending.
- atlas: One audited BASS-II fixture; search and broader coverage are pending.
+ atlas: One audited BASS-II record; search API exists, search UI and broader coverage are pending.
- experiment: One cited record with field-level provenance; comparison and export are pending.
+ experiment: One cited record with field-level provenance; export API exists, export UI is pending.
- gaps: Audited coverage analysis is pending.
+ gaps: Gap-classification API exists over one validated record; the frontier UI is pending.
- ask: Grounded retrieval, citation validation and abstention are pending.
+ ask: Grounded, citation-verified answers with abstention exist as an API (no AI model); the PIX UI is pending.
- methodology: Fixture methodology only; ranking and retrieval evaluation are pending.
+ methodology: Fixture methodology; a small author-labelled ranking/Ask regression set exists, independent evaluation is pending.
```

Claude should also correct the existing methodology body and home architecture-handoff copy that still describe the backend as future work. Backend ownership does not authorize editing those components. No status promotion follows from those copy corrections.

## Required precision correction to Claude's proposal

The Ask implementation checks recorded source/page lineage before releasing template output. API_CONTRACTS.md explicitly limits this to `citation-lineage-only-not-scientific-truth`. Use the narrower description to avoid implying scientific verification of arbitrary answers:

```diff
- ask: Grounded, citation-verified answers with abstention exist as an API (no AI model); the PIX UI is pending.
+ ask: Deterministic, catalog-grounded answers with citation-lineage checks and abstention exist as an API (no AI model); the PIX UI is pending.
```

The experiment proposal is accurate; dropping the old comparison clause does not make comparisons available. Retain `/compare` as Coming Soon and explain its one-record 404 in any future comparison consumer. Ranking over one record is retrieval scoring, not meaningful ordering across studies. Gap classification checks recorded fields within tolerance, not complete research coverage.

## Claude-owned page reconciliation (proposals only)

In `apps/web/components/foundation.tsx`, retain the one-record limitation and replace these stale passages alongside the reviewed reasons:

```diff
- One record cannot support controlled comparison or demonstrate retrieval quality. Rankings, AI answers, performance targets and scientific evaluation results are not yet implemented or measured.
+ One record cannot support controlled comparison or demonstrate retrieval quality. Backend ranking and fixed-template Ask APIs have a small author-labelled regression set; no AI model is used. Independent scientific evaluation and performance acceptance are pending.
- This is the architecture handoff. The research engine and five interactive missions are still to come.
+ The research APIs use one source-checked B20 record. Research controls and the five interactive mission interfaces are still pending; public release is blocked.
```

These page edits belong to Claude and are not applied here. Keep fixture provenance, limitations and the existing offline/server-only disclosure.

## Follow-up checks and preservation

- `npm test`: PASS, 80/80 tests, four files. `npm run eval:science`: initial command passed despite reporting only 17/30 repeated Ask outputs. The evaluator compared schema-parsed and raw output with order-sensitive JSON strings. The Codex-owned correction uses structural equality and marks any repeatability failure as a failing case; the corrected run passed Ask 30/30, rank 6/6, citation/category checks 13/13 and repeatability 30/30. A temporary negative probe deliberately changed repeated outputs: all 30 cases failed and the process exited 1; the probe was removed without changing runtime code or the real report.
- `npm run lint`, `npm run typecheck`, `npm run validate:data`, `npm run security` and `git diff --check`: PASS. Fixture validation retained one source/record and 55 quarantined rows; source URLs were not re-fetched. An assertion compared the actual proposed registry with the committed registry: exactly the six reasons differ, and every non-reason field is identical.
- Previous production browser evidence: 12/12 passed against the reviewed backend; no finished workstation/PIX/frontier/export UI was tested. These are earlier executed results, not a new browser run for the copy proposal.
- Proposed registry file SHA-256: `4cbae99f3419faf80684c65eb4a417f223cca39282570afd0c4ececd52a63d0d`. It remains the only dirty file in MicroFire-V2-codex. The follow-up only changes Codex review documents, the evaluator and its generated report in the isolated backend-review worktree; no shared file or frontend is modified.
- Installation, production build, browser suite, npm audit and remote CI were not repeated for this evaluator/documentation-only follow-up. Earlier full-check/browser results are documented in PHASE_ONE_BACKEND_REVIEW.md. Human science review and a comprehensive secret/history audit remain uncompleted.
