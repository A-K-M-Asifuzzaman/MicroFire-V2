# Implementation status — Phase One backend review

Source of truth: `packages/shared/src/features.ts`. API: GET /api/feature-status. No dates or completed features are invented.

| State | Current routes/features |
|---|---|
| Preview | Home, one-record Atlas and dossier, source/rights page, methodology, mission descriptions, roadmap |
| Coming Soon | Dashboard/ranking, compare, lab, gaps, Ask PIX, all five missions, Passport UI, judge tour, impact |
| Blocked | Meshy assets: no verified funded API entitlement or job approval |
| Available | None promoted to full product readiness |
| Locked | None: unfinished missions must not be progression-locked |

Phase One backend search, source lookup, ranking, restricted comparison, gaps, citation lineage, exports and deterministic Ask exist over B20 only. Pure five-mission rules and v2 save migration exist; no mission UI is implemented or promoted. Current tests and limitations are recorded in PHASE_ONE_BACKEND_REVIEW.md. Backend coverage is not frontend integration, independent science validation or public-release approval.

Claude's six proposed explanation edits were reviewed separately in FEATURE_REGISTRY_REVIEW.md and remain pending per the owner. No registry state, implementation flag or verification receipt was changed in this review. Feature readiness promotion requires functionality, error/recovery behavior, science validation and browser evidence in the registry. See OWNERSHIP.md before changing a shared status.
