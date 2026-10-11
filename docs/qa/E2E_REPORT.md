# Browser foundation verification

Local run: 2026-10-11. Node 24.19.0; Playwright 1.64.0; Chromium 156.0.8078.4 (full chromium channel), macOS ARM64. Production Next server on 127.0.0.1:3217. No external provider keys.

**8 tests passed** across desktop 1440×900 and mobile iPhone-13 viewport 390×844, using Chromium emulation (not real iOS Safari).

1. Home → Atlas → B20 dossier with all non-local requests blocked, reduced motion, keyboard skip-link focus, calibrated oxygen and canonical PDF locator assertions, no horizontal overflow, no page errors. Captured four home/dossier screenshots.
2. Every advertised feature route resolves; all five mission buttons disabled as Coming Soon; invented experiment shows not-found UI.
3. Read API returns real fixture; invalid pagination/unknown record error correctly; unsupported Ask gives 501; empty Passport validates structure only, certification false; nosniff header present.
4. Source dossier readable with JavaScript disabled and no canvas/WebGL dependency.

Initial screenshot tests stalled in Playwright's headless shell. A minimal capture succeeded using full Chromium; the suite now explicitly uses that channel. All eight tests were rerun successfully; no screenshots or checks were suppressed. Port 3000 was occupied by an unrelated service, so tests use 3217 without reusing/stopping it.

Not tested: 3D/gameplay, save UI, exports, full offline-PWA navigation, Safari/Firefox, real touch hardware, missing GLB recovery or external provider retry. Those features do not exist yet. Traces on failure and HTML results are generated locally (ignored); CI will upload artifacts when a PR is authorized and pushed.
