# 13 — PROOF-BASED QA FOR BOTH AGENTS

## Gates
1. Typecheck/lint/unit tests/build all pass on actual output. CI re-runs on PR. Zero fabricated logs.
2. Playwright real browser flows at 390/768/1440px: research search -> open NASA source -> rank -> mismatch -> cited question -> honest abstention -> printable passport; 5-mission campaign tests separately as features become available.
3. Negative science: not-yet-measured condition; conflicting experimental regimes; missing number represented unknown; prompt injection in retrieved PDF; bogus source DOI; external provider timeout; RAG refusal/abstention.
4. Game: valid/invalid mechanical assembly; exact fault repair; restoring saved progress, edit-invalidates-records, keyboard/touch, low-power fallback, resume, demo isolation, no stage skipping.
5. Accessibility: WCAG 2.2 AA aspirations; check focus, contrast, motion reduction, click targets, labels, image alt captions, chart text summaries, reading order, responsive horizontal scrolling.
6. Security: secret scans, no exposed NASA/ADS/FIRMS/Meshy keys, CSP/CORS/rate-limit, SSRF protection on external source fetch, dependency audit, sanitization, zero remote writes to old repos.
7. Performance: LCP/inp/CLS real browser measurement under documented conditions; reasonable 3D fps, byte budget, no WebGL support; resource disposal, no mobile GPU overheat. Don't claim specific performance until measured.
8. Feature gating: Coming Soon disabled route/UI truthful; available feature must have E2E tests, working link, screenshot, source coverage, and owner review.

## Required artifacts
`docs/qa/Baseline.md`, `docs/qa/E2E_REPORT.md`, `docs/qa/SCIENCE_EVAL.md`, `docs/qa/PERFORMANCE.md`, `docs/qa/ACCESSIBILITY.md`, `docs/qa/SECURITY.md`, `docs/qa/KNOWN_LIMITATIONS.md`, checked screenshots under `docs/qa/screenshots/`. No fake sensor readings or benchmark scores.

## Rival parity test, differentiated implementation
Check whether we have *measured* progressive story, input feedback, meaningful consequences, recoverability, save/resume, responsive HUD, single screen accessibility and judge demo. Comparing topic relevance is invalid (the challenges differ). Document legitimate strengths and our current gaps without personal disparagement or promises of beating them.
