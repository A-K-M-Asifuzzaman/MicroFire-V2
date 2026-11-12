# M2 integration: review package for Astra

**Status: REVIEW REQUESTED, NOT APPROVED.** Local engineering evidence below does not stand in for independent sign-off. Until Astra approves:
- Nothing here is merged to `main` or deployed.
- Mission 2 stays locked on the public site.
- Writable browser saves stay off.

## What is being reviewed

| | |
|---|---|
| Integration branch | `claude/m2-integration-20261112` (worktree `MicroFire-V2-m2-integration`), local only |
| Base | `5ad700d`, Claude's Design B, mission map, Meshy stills and video tooling (on `feat/m2-claude-gameplay`) |
| Backend merged | `codex/backend-completion-20261112` at `d9a3313`, merged as `df3538e`. The merge was clean, with no conflicts and no history rewritten. |
| Seam commit | `c024d11`: the two-file patch `docs/codex-completion/evidence/m2-integration.patch`, with tidied formatting and the same semantics |

## The frontend seam (`c024d11`)

Only two files change:
- **`apps/web/game/contract.ts`:** types now come from `@microfire/shared`. `contractRuntime` is built from the shared schemas for the capability, authorize, revoke, start (snapshot), action and failure responses, plus `requestIdentity` (canonical SHA-256) and `noteIssue`.
- **`apps/web/game/contract/specs.ts`:** equipment now comes from shared `equipmentCopy` / `equipmentDefinitions`.

Unchanged:
- The transport and controller (including Codex's valid-cookie reload correction `0b17864`, already reviewed in its own patch).
- The mirrored `equipment-copy.ts` and its drift test.
- All scene and UI code. React holds no game rules: qualification, observation and rewards are derived on the server.

## Backend, API and authorization changes inside the merge

Everything below is Codex's, with details in `docs/codex-completion/`.
- **`apps/web/lib/game-preview.ts`, `game-preview-security.ts`:** the preview API.
  - It is off unless all of these hold:
    - `MICROFIRE_LOCAL_GAME_PREVIEW=1`;
    - no hosting marker is present;
    - the origin is `http://127.0.0.1:<port>`;
    - separate access and signing secrets are present;
    - the realm and key IDs are valid.
  - Requests are narrowed by Host, Origin and fetch-site, but only the operator credential grants access.
  - Writes carry signed checkpoints, size limits, a process rate budget and runtime invalidation.
- **`apps/web/proxy.ts`, `lib/review-policy.ts`, `lib/review-routes.ts`:** R4 adds `MICROFIRE_REVIEW_ACCESS_TOKEN`.
  - Requests must carry `x-microfire-review-token`, checked with `timingSafeEqual` at both layers.
  - The R1 and R2 defences (exact flag, presence-based hosting markers, strict Host, matching `X-Forwarded-Host`) are kept.
- **`apps/web/lib/campaign-service.ts`, `packages/game-core/src/campaign.ts`:** a private campaign engine with no HTTP route and no release flag.
- **`packages/shared/src/*`:** training schemas, canonical identity, equipment, local-save admission and campaign schemas.
- **`packages/science/src/*`:** PIX v3 (deterministic), evidence filters and the frontier categories. The quarantine stays at 55 and B20 stays the only admitted record.

## Decisions needed from Astra

1. R4: the two-layer review-route authorization and the trusted loopback launch (`scripts/local-review.ts`).
2. Stage A: the endpoint, crypto and recovery semantics, plus this frontend seam.
3. The campaign contract, before any mission scene uses it.
4. The writable-save gate, which stays off. Cross-process proof across Chromium, Firefox and WebKit is still missing.
5. Human scientific review of the training content.

## Evidence on this branch (run by Claude on 2026-11-12)

See the results section appended below. Codex's own evidence is in `docs/codex-completion/DEADLINE_EXECUTION_STATUS.md` and `12_TEST_EVIDENCE.md`.

### Results (all run locally; none of this deploys anything)

| Check | Result |
|---|---|
| `npm run check` on `c024d11` (lint, types, unit, data, science, security, production build) | Passed. 197 unit tests; 1 admitted experiment, 55 quarantined; production build compiled |
| Frontend game suite, `vitest.m2-ui.config.ts` | 33/33 |
| **Live real-browser M2**: Codex's `tests/backend/m2-live-browser.test.ts`, pinned to `df3538e` (latest Design B frontend merged with Codex's backend) | **4 passed, 0 failed, 0 skipped** in 229 s |
| e2e (`playwright.config.ts`) | 88 passed, 22 skipped; same as the stable branch |
| M2 UI (`playwright.m2-ui.config.ts`) | 123 passed, 47 skipped; same as the stable branch |

**How the live harness ran.** It created its own throwaway checkout, applied a seam semantically identical to `c024d11`, built for production, and started loopback-only credentialed preview servers. The full mission was driven only through UI controls and real API responses: start, install, fault, diagnose, repair, qualify, B20 reveal, Passport, export, reload and resume.

| Mode | POSTs | Final revision | Learning checks | Source entries | Page errors | Writable saves |
|---|---:|---:|---:|---:|---:|---|
| Keyboard | 27 | 23 | 5/5 | 2 | 0 | off |
| Touch (emulated, 390×844) | 25 | 22 | 5/5 | 2 | 0 | off |
| No WebGL (schematic fallback) | 25 | 22 | 5/5 | 2 | 0 | off |
| 3D bench | 25 | 22 | 5/5 | 2 | 0 | off |

Raw evidence is in `docs/m2-integration-evidence/`: the TAP log, the per-mode JSON and the seam the harness injected. Keyboard reports one console error, the deliberately aborted network response used for the lost-acknowledgement recovery. No-WebGL reports its expected renderer error. Runs used Chromium 156 on macOS: touch is emulated and 3D used headless graphics. **Not proven:** physical devices, rendered expiry/revoke/restart recovery, and cross-process saves.

**One test changed.** `tests/m2-ui/gameplay-ui.spec.ts` ("public mission pages stay locked…") expected the old "runtime not integrated yet" wording. With the runtime connected, a server without the local preview launch now answers "The local training preview is not enabled on this server. Public missions remain locked." The assertions that matter are unchanged: the public page stays locked, the preview loads only on an explicit request, and no start button appears. Only the expected copy was updated; the test was not disabled.

### Release status

**Not eligible for public release.** Astra's decisions 1–5 above are pending. The stable public site (`f7937cf` on `feat/m2-claude-gameplay`) is unchanged and does not include this branch.
