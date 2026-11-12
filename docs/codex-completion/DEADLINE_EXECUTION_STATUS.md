# Deadline execution evidence — 2026-11-12

The submission baseline remains available. A real mission reload defect was reproduced and fixed in the isolated Codex branch; independent integration approval is still required. No deployment, main push, source promotion, paid generation, video edit or modification to Claude's checkout occurred.

## Hosted demonstration verified now

Read-only checks of https://microfire-v2-preview.vercel.app at 10:48 UTC (16:48 Bangladesh) returned 200 for home, health, B20, missions and Passport; `/api/game/preview/capability` and `/design` returned 404. This is an observation of the current deployment, not proof of its source SHA or a complete security audit. The Vercel connector denied deployment-metadata access (403); no authorization change was attempted.

Actual Chromium 156 desktop (1440×900) and touch emulation (390×844) both passed the hosted B20 dossier, NASA page-112 link, real evidence download, supported PIX answer and habitat-certification abstention. No page errors were observed, and the final PIX view had no horizontal overflow. Export bytes matched across the two browsers: SHA-256 `2b976e48c27dd0e2f38111c0f57ef2307d6156ed9cde80d0c6ec98c6a5c4efe0`. Both contained exactly one admitted B20, calibrated oxygen 17.4, unknown pressure/run acceleration and the primary citation. Catalog SHA-256: `1f9d4883791da73e256af09eb3994805b53c3a394eff3db0f0d066fc558779dc`.

Safe demonstrated recording content: inspect B20, show its calibrated measurement/unknowns/limitations, follow its citation, export the evidence, ask PIX a supported question and show an explicit unsupported-intent abstention. Identify PIX as deterministic. Keep source evidence and educational illustrations labelled. Public mission availability remains locked; neither the campaign nor M2 should enter a public gameplay recording before its approval and integration gates pass.

## Focused implementation

Product correction: `0b17864c416669e6ec66072afcd4dea814cf812e`, two files. `authorized(runtimeId)` used the old controller runtime when booting with a valid HttpOnly grant; it returned idle and hid both start and resume. It now explicitly returns ready when no case is loaded, confirmed for the same runtime, or runtime-changed for an older case. No cookie or token policy changed. The three new regressions prove all three states and preserve the existing snapshot. The fresh valid-cookie test failed before the correction; all 33 frontend tests passed afterward. A reviewable narrow patch is in `evidence/m2-valid-cookie.patch`.

The real-browser acceptance harness is `tests/backend/m2-live-browser.test.ts`. It pins a clean source SHA, creates its own disposable checkout, installs unchanged dependencies offline, runs the real controller tests, applies only the two integration seam edits, builds production, and launches loopback-only credentialed preview servers. It uses UI controls and real API responses throughout. No scene state or learner success is injected. The public checkout keeps `contractRuntime = null`; the disposable patch is evidence for review, not release authorization.

After the product correction, `npm run check` passed: lint, root/web types, 197 units, data/science/security validation and production build. The frontend suite passed 33/33. See `evidence/deadline-check.log` and `evidence/reload-regression-{before,after}.log`.

## Final live acceptance — one pinned run

`node --import tsx --test --test-reporter=tap tests/backend/m2-live-browser.test.ts` exited 0: **4 passed, 0 failed, 0 skipped** in 228.97 seconds. Source SHA: `c22d6c917b161807565e9bed8e36ab05ce9b94d4`. Disposable integration used the exact two-file `evidence/m2-integration.patch`; that integrated build also passed all 33 frontend tests and production build. Product code matches reload correction 0b17864; subsequent commits before this pin changed the harness/evidence only.

| Real UI mode | POSTs | Final revision | Checks | Source entries | Result |
|---|---:|---:|---:|---:|---|
| Keyboard | 27 | 23 | 5/5 | 2 | complete/export/reload/resume |
| Touch emulation | 25 | 22 | 5/5 | 2 | complete/export/reload/resume |
| WebGL unavailable | 25 | 22 | 5/5 | 2 | schematic fallback, complete/export/reload/resume |
| 3D bench | 25 | 22 | 5/5 | 2 | actual rendered canvas, complete/export/reload/resume |

Every mode retained the learner note visibly after resume, kept source evidence separate from authored training, retained 17.4, and wrote no preview save key. Keyboard additionally recovered one genuinely committed/lost response by reading the server receipt, refused a premature install without advancing state, and accepted a wrong diagnosis as coaching before manual correction. All page-error counts were zero. The keyboard console contains the one deliberately aborted network response; the WebGL fallback records its renderer errors; no unexpected console errors were accepted. All runs use Chromium 156.0.8078.4 on macOS; touch is emulation and 3D uses headless/software graphics. These results do not prove physical-device behavior, rendered expiry/revoke/restart recovery, cross-process saves or release readiness.

Raw output: `evidence/deadline-live-m2.log`; structured records: `evidence/deadline-live-m2.json`. Actual bench/Passport screenshots and signed synthetic checkpoints are outside the repository at `/Users/asifzaman/.codex/visualizations/2026/11/12/01a1cf2b-dc04-7572-a122-84cd3aed8524/m2-live-acceptance`. The 3D apparatus and mobile Passport captures were visually inspected. All owned disposable live worktrees and their preview servers were removed/stopped.

Earlier failed attempts are retained honestly: the first two exposed test selectors; the 0eb3fa3 run passed 0/4 with the real valid-cookie reload defect in the three non-keyboard paths; after the product correction, 0b17864 passed 3/4 while the keyboard harness accidentally submitted a native select with Enter. A corrected keyboard follow-up passed 1/1. The final run above passes all four together with native typeahead/Tab and explicit learner-note assertions. See `live-m2-before-reload-fix.log`, `live-m2-partial-followup.log`, and `live-m2-keyboard-followup.log`; repeated runs are not summed into a unique test total.

## Ownership, dates and recovery

Owner deadlines remain November 13 (local 240 seconds) and November 14 (global 30 seconds). Exact organizer cutoff times are **unconfirmed**; the owner's clarification is pending. Public NASA dates do not replace the earlier owner deadlines. Do not invent an absolute freeze/upload time until those cutoffs are established. Retain a stabilization and upload margin instead of accepting changes until the last minute.

Claude's video instructions and EDLs were read only. Their planned shot totals are 233.1 and 29.2 seconds; these totals do not verify rendered MP4 duration, audio, upload success or final submission. Claude remains responsible for rendering, `ffprobe` duration checks and delivery. No rendered video artifact was certified by this work.

Fresh remote-main lookup still returned `b82db9c0be16c3485b67c774d9da734334192aec`. This pinned source is the rollback/reconstruction point; the deployed source SHA could not be established through the denied connector. Preserve the current deployment. Recover the source in a new worktree using `git worktree add --detach <new-empty-path> b82db9c0be16c3485b67c774d9da734334192aec`; never reset Claude's active checkout. Candidate changes stay on `codex/backend-completion-20261112` until required review, consumer adoption and owner deployment approval.

Writable browser saves remain disabled. Device/cross-process save proof, independent Astra acceptance, scientific promotion and public release remain separate gates. The private five-mission engine remains available for continued review/development after each submission; no new campaign HTTP route was exposed under deadline pressure.
