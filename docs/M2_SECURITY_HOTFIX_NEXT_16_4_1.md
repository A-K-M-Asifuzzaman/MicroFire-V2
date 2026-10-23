# Security hotfix: Next.js 16.4.0 → 16.4.1 (handoff for Astra)

Branch `feat/m2-claude-gameplay`, worktree `MicroFire-V2-m2-claude`, 2026-10-23.

| Item | Value |
|---|---|
| Starting SHA | `a0bb27e` (descendant of 44b03c9 via 06f8b3a, the opening film) |
| Dependency commit | `b124330` (apps/web/package.json + package-lock.json only) |
| Backend compared | Sol `codex/m2-stage-a-backend` at `6d1887b`, read-only |

No Meshy spend. No push, merge or deploy. Sol's worktree is unchanged (HEAD 6d1887b, 0 modified files).

## Advisories fixed

All three affect `next >=16.0.0 <=16.4.0`. All three are patched in **16.4.1**.

| ID | Severity | Issue | Pattern in this app? |
|---|---|---|---|
| GHSA-673q-mjm6-r5xr | Critical | RCE in `use cache` functions returning typed arrays | No. There is no `use cache` anywhere, and the build config has `cacheComponents: false`. |
| GHSA-2464-fhr4-w9xw (CVE-2026-96889 per the advisory's references) | Critical | Image Optimization RCE with SVG (glibc Linux, upstream `sharp`) | No. There is no `next/image`, no `images` config and no SVG in `public/`. `sharp` is already 0.35.5. |
| GHSA-p3m5-59mp-jv5r / CVE-2026-94482 | High | App Router DoS through Server Actions | No. There is no `'use server'`. |

The patterns are absent, but the upgrade is applied anyway, as required.

## Why 16.4.1 and not 16.4.2

- **16.4.1** is a security-only release: its notes list exactly these three advisories.
- **16.4.2** adds only Turbopack and docs backports. This app builds with webpack, so 16.4.2 adds nothing to the fix.
- **Same line, no migration:** no major or minor migration. The React 19.3.0 peer range and every other dependency are unchanged.

## Package and lockfile changes

- `apps/web/package.json`: `next` 16.4.0 → 16.4.1 (exact pin kept).
- `package-lock.json`: 10 package entries change, all 16.4.0 → 16.4.1:
  - `next` and `@next/env`;
  - the eight `@next/swc-*` platform binaries.
  
  The only other edit is the `apps/web` dependency spec. No other version moves.
- No overrides, no `audit fix --force`, no suppression, no application code change.

## Validation

| Check | Command | Result |
|---|---|---|
| Clean install | `npm ci` | OK. 215 packages audited. |
| Audit | `npm audit` | **0 vulnerabilities**. Before: 1 critical package, 3 advisories. |
| Typecheck | `npm run typecheck` | Pass |
| Lint | `npm run lint` | **12 errors, all in `docs/m2/fixtures/verify-contracts.ts`**. This is Sol's file, inherited from contract base 11ec4ca, so the failure predates the upgrade; Sol's report says it is fixed on Sol's branch. Every other file passes with `--max-warnings 0`. |
| Unit | `npm test` | 103/103 |
| M2 Vitest | `npx vitest run --config vitest.m2-ui.config.ts` | 30/30 |
| Data | `npm run validate:data` | 1 source, 1 experiment, 55 quarantined |
| Science | `npm run eval:science` | Ask 30/30, rank 7/7, faithful 13/13, forbidden 0 |
| Security | `npm run security` | Pass. The client bundle (`.next/static`) has no preview-secret, Meshy or private-key patterns. |
| Build | `npm run build` (clean `.next`) | Next.js 16.4.1 (webpack), 25 pages, no warnings |
| M2 browser | `npx playwright test -c playwright.m2-ui.config.ts` | 88 passed, 14 skipped by design (same as before the upgrade) |
| M1 regression | `npx playwright test --workers=1` | 90 passed, 22 skipped by design (same as before). Tracked screenshots it rewrote were restored. |

The M2 browser suite covers:
- the bay, assembly, placement preview, fault, diagnosis, repair and qualification;
- the phone dock and tray;
- no-WebGL and lost-WebGL-context fallbacks;
- reduced motion;
- axe;
- the opening film;
- the design and fixture route gates.

## Compatibility with Sol 6d1887b on 16.4.1

Sol's commit was exported to a scratch directory. Only this commit's two package files were applied. That is the exact post-integration dependency set, since all other manifests are identical. No Git operation touched either worktree.

| Check | Result |
|---|---|
| `node --import tsx scripts/verify-m2-consumer.ts <claude worktree>` | Pass against b124330: runtime, transport and controller strict types |
| `tests/backend/claude-http.test.ts` and `training-http.test.ts` (offset 100) | **12/12 pass, 0 skipped** |
| Sol gate on 16.4.1 | lint, typecheck, 144 unit tests, data, science, security, `npm audit` 0 |
| `git merge-tree b124330 6d1887b` | Conflict-free; the merged tree pins next 16.4.1 |

The 12 HTTP tests include:
- the real consumer episode with lost-acknowledgement recovery;
- 429/Retry-After;
- resume, key rotation and restore-chronology checks.

The transport (`res.json()` followed by the shared schema), request identity, controller dispatch, retry and reconcile, and checkpoint handling are untouched and import nothing from `next`.

## Still open (not part of this hotfix)

1. **Public preview runs 16.4.0.** `microfire-v2-preview.vercel.app` was built from a0bb27e. It is public, because Vercel Authentication was disabled at the owner's request, and it runs with `MICROFIRE_DESIGN_REVIEW=1`. The owner should either redeploy from b124330 or re-enable protection. This task does not deploy.
2. **Lint is red on this branch** only because of Sol's inherited fixture file. It goes green when Sol's fixed file arrives at integration.
3. **Integration steps** follow Sol's sequence and need owner authorisation and Astra approval:
   - `contractRuntime` wiring;
   - shared part specs;
   - live `*-live.spec.ts` tests;
   - writable saves remain read-only.
