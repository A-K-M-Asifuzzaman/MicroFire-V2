# Executed test evidence — 2026-11-12

Environment: Darwin arm64, bundled Node 24.22.1, npm 11.16.0, Next 16.4.1, Vitest 5.0.3, Playwright 1.64.0. All runs were in MicroFire-V2-sol-completion. Browser desktop 1440×900 plus iPhone-size Chromium emulation; native Firefox/WebKit used the explicitly downloaded temporary binaries. No real phone, independent human scientific review, public deployment test or remote CI run is claimed.

Command prefix used throughout:

```sh
export PATH=/Users/asifzaman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
export NEXT_TELEMETRY_DISABLED=1
export PLAYWRIGHT_BROWSERS_PATH='/Volumes/ssd(mac)2/NASA SPACE APP CHALLENGE 2026/untitled folder 3/MicroFire-V2/.cache/ms-playwright'
```

Each row reports actual test cases, not assertion counts. “—” means a non-test command. Full output is retained in evidence/.

| Exact command | Exit | Passed / failed / skipped | Evidence / limits |
|---|---:|---|---|
| npm ci | 0 | — | Clean install repeated on Node 24; existing esbuild/fsevents allow-scripts notices; no dependency edits |
| npm audit --audit-level=high | 0 | — | audit.log: no high/critical; 10 moderate transitive development findings; no forced upgrade |
| npm run check | 0 | 197 / 0 / 0 | delivery-check.log: lint, root/Next types, all unit tests, data validation, science evaluation, security and production build |
| npm run lint | 0 | — | final-lint.log; zero lint errors/warnings |
| npm run typecheck | 0 | — | final-types-complete.log; both root and web types |
| npm test | 0 | 197 / 0 / 0 | final-unit.log; 16 test files, including 41 M2 backend and 12 campaign tests |
| npm run validate:data | 0 | — | Within delivery-check.log: one source/experiment, 55 legacy rows, pinned fixture bytes unchanged |
| npm run eval:science | 0 | Ask 30/0/0; rank 7/0/0; citation/category 13/0/0 | delivery-check.log: repeatability 30/30, forbidden 0; author-labelled regression set, not an independent science benchmark |
| npm run security | 0 | — | delivery-check.log: 1,022 scanned files at execution; basic patterns, not a complete entropy/history audit |
| npm run build | 0 | — | final-build.log and delivery-check.log; network escalation permitted existing Google Fonts; no font/UI source changed |
| npx vitest run --config vitest.m2-ui.config.ts | 0 | 30 / 0 / 0 | frontend-unit.log; actual transport/controller tests |
| npx vitest run tests/unit/training-contracts.test.ts tests/unit/training-coordinator.test.ts tests/unit/training-security.test.ts tests/unit/training-api.test.ts tests/unit/training-save.test.ts | 0 | 41 / 0 / 0 | stage-a-focused.log |
| node --import tsx --test tests/backend/training-http.test.ts | 0 | 11 / 0 / 0 | stage-a-http-local.log; disposable production servers and real Chromium canonical vectors |
| MICROFIRE_CLAUDE_WORKTREE=/tmp/microfire-consumer-20261112 node --import tsx --test tests/backend/claude-http.test.ts | 0 | 1 / 0 / 0 | m2-consumer-http-pinned.log: pinned clean main b82db9c transport/controller, full M2, lost acknowledgement, resume/revoke, 30 POSTs |
| node --import tsx scripts/verify-m2-consumer.ts /tmp/microfire-consumer-20261112 | 0 | — | m2-consumer-types.log: exactOptionalPropertyTypes compatibility; no frontend edit |
| node --import tsx --test tests/backend/review-http.test.ts | 0 | 1 / 0 / 0 | r4-http.log: real HTML/RSC credential matrix and unknown-hosting forged locality |
| npx playwright test --output=.cache/test-results/research | 0 | 88 / 0 / 22 | research-browser-isolated.log; all existing research desktop/mobile checks; intentional per-project skips |
| npx playwright test -c playwright.m2-ui.config.ts | 1 | 116 / 7 / 47 | m2-browser.log: six custom-context credential failures corrected in test setup; one artifact collision |
| npx playwright test -c playwright.m2-ui.config.ts --output=.cache/test-results/m2 | 1 | 112 / 4 / 38; 16 did not run | m2-browser-isolated.log: all credential/matrix cases passed; film/tour timing and accessibility failures while another build was running; no visual code was edited |
| npx playwright test -c playwright.m2-ui.config.ts tests/m2-ui/ignition.spec.ts tests/m2-ui/site-journey.spec.ts --workers=1 --output=.cache/test-results/m2-followup | 0 | 37 / 0 / 15 | m2-browser-followup.log: reran the entire affected film/tour files serially against the completed build, including all four prior failures and serially blocked cases |
| PLAYWRIGHT_BROWSERS_PATH=/tmp/microfire-browsers-20261112 npx playwright install firefox webkit | 0 | — | browser-install.log; temporary test binaries only |
| PLAYWRIGHT_BROWSERS_PATH=/tmp/microfire-browsers-20261112 node --import tsx --test tests/backend/browser-save-consistency.test.ts | 1 | 1 / 2 / 0 | browser-save-smoke-verified.log: Chromium primitive smoke passed; Firefox could not launch; WebKit 100 locked updates yielded 86. Writes remain disabled |
| node --import tsx scripts/fetch-candidate-sources.ts /tmp/microfire-nasa-script-20261112 | 0 | — | candidate-fetch.log: four bounded, hash-verified NASA PDFs; no admission |
| node --import tsx scripts/verify-candidates.ts /tmp/microfire-nasa-20261112 | 0 | — | candidate-hashes.log: four original PDF hashes matched; all review items quarantined |
| git diff --check | 0 | — | No whitespace errors |

Additional recorded attempts: initial npm ci --ignore-scripts under host Node 25 succeeded with engine warnings, then was repeated properly on Node 24. stage-a-check.log failed only at sandbox-blocked Google Fonts after all preceding checks passed; the network-enabled build passed. stage-a-http.log contains 11 sandbox server-start failures before the successful approved local-server run. Initial consumer checks refused dirty worktrees and were rerun against a clean pinned main. Initial campaign regressions exposed decimal canonicalization, reserve-path and typing issues; corrected runs are in delivery-check.log. An initial combined check exposed the downloader DOM stream typing issue; it was fixed before the passing combined run. Initial shared-artifact browser runs failed during trace copying (research 86 passed/2 failed/22 skipped), then the isolated research run passed. A first primitive test harness left a server alive after browser launch failure; cleanup was corrected and complete failing engine results retained.

Do not sum repeated runs into a fabricated unique total. No single final all-M2 browser run is claimed green: its affected files passed in the explicit follow-up above. Browser UI fixtures do not prove real mission playability. Full live rendered M2 and campaign UI acceptance, process-isolated save consistency, physical devices, complete WCAG/performance, independent source promotion and Astra acceptance remain separate gates.
