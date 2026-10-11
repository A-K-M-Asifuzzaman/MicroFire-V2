# Six feature explanations — independent backend review

Reviewed starting at `882e3c88a1737d65e83234b5dacd6163d6a98b00`. Shared owner: Claude/Codex under OWNERSHIP.md. The owner confirmed: **"Claude proposed them; review and leave pending."** The uncommitted `MicroFire-V2-codex/packages/shared/src/features.ts` patch was inspected and preserved. No reachable Claude Code thread was exposed by the task tools; this report and CLAUDE_BACKEND_HANDOFF.md carry the review. No patch was applied or committed to the shared registry in this worktree.

## Evidence and decisions

| Entry / retained state | Current backend / exact unit evidence | Production browser evidence | Frontend / science / release boundary | Decision |
|---|---|---|---|---|
| dashboard / Coming Soon | searchExperiments + rankEvidence; science.test.ts: "searches deterministically with AND semantics and exact filters", "ranks reproducibly, explains its formula, and never labels unknown gravity as direct" | science-api.spec.ts: "research APIs serve truthful limited-data responses end to end" | No question/filter/ranking workstation UI. One B20 record, retrieval tolerances not equivalence, independent evaluation pending | Accepted proposed explanation; keep Coming Soon |
| atlas / Preview | searchExperiments + GET experiments; same search unit, api.test.ts: "validates pagination, rejects unknown/duplicate filters and distinguishes missing records" | API browser test above; foundation.spec.ts: "offline source journey, keyboard access, corrected science and screenshots" | Existing one-record browse/dossier journey works; no search controls, no broader curated corpus | Accepted proposed explanation; keep Preview |
| experiment / Preview | GET experiment + exportEvidence; science.test.ts: "exports reproducible, hash-pinned evidence records with resolvable links" | API browser test verifies export 17.4; foundation source journey verifies dossier/citation | Dossier displays known/unknown provenance. No export UI; no second approved record for comparison | Accepted proposed explanation; keep Preview |
| gaps / Coming Soon | classifyGaps; science.test.ts: "classifies coverage per field and states that absence is not global absence" | API browser test verifies pressure not-recorded | No frontier controls/coverage visualization. Field coverage does not answer every research question or establish worldwide absence | Accepted proposed explanation; keep Coming Soon |
| ask / Coming Soon | answerQuestion + verifyAnswerStatements; science.test.ts grounded Ask cases; API abstention/error tests | API browser tests verify answered and quarantined responses | No PIX question/answer UI. Fixed catalog templates, no AI model; lexical/intent heuristics and semantic entailment have limited evidence | Accepted proposed explanation; keep Coming Soon |
| methodology / Preview | scripts/eval-science.ts + data/evals/science-gold.json; generated docs/evals/report.md | foundation.spec.ts: "every advertised route resolves and all missions remain unavailable"; no evaluation-reading task tested | Small author-labelled regression set exists; independent evaluation is pending. Page body still says ranking/AI answers/evaluation are unimplemented | Accepted registry proposal; **Requires changes** to stale page copy by Claude before integration acceptance |

All listed browser tests are run against the production server in desktop/mobile Chromium. API requests inside Playwright prove HTTP behavior, not a finished research UI. Tests in tests/unit/contracts.test.ts reject false Available/Locked/Preview labels; api.test.ts adds "does not promote backend-implemented features or missions without UI verification". The status inventory remains 0 Available, 7 Preview, 13 Coming Soon, 1 Blocked, 0 Locked. All five mission starts remain UNAVAILABLE under the real registry.

Only B20 is source-checked in runtime; it is not independently human validated. All 55 legacy records remain quarantined. No reviewed public release exists, and per-process quotas, page CSP and release-security gates remain open.

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
