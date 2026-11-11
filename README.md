# MicroFire-V2 — The Living Science Observatory

An independent, source-grounded website about fire in microgravity: research tools built on NASA evidence checked at the source (one admitted experiment, B20), a deterministic research guide (PIX, no AI model), and a five-mission educational game whose missions are not yet playable. Pre-release; not NASA-endorsed. **Reviewing the project? Start with [docs/REVIEW_GUIDE.md](docs/REVIEW_GUIDE.md).** Live preview: https://microfire-v2-preview.vercel.app

**Current state (Nov 2026):**
- **Design:** Design B ("Field Journal") across the whole site.
- **Stack:** Next.js 16.4.1.
- **Research tools:** Atlas, B20 dossier, Workstation, Ask PIX, Frontier, Compare and Passport are implemented for review.
- **Training bay:** the BASS-II bay has an illustrative 3D tour and a gameplay frontend; it is not yet connected to its backend.

The sections below describe the original Phase Zero foundation; the review guide covers everything since.

## Run

Use Node 24 LTS (see `.nvmrc`) and npm, from this repository root:

```sh
npm ci
npm run dev
# http://127.0.0.1:3000
```

No secrets or external services are required. `/atlas` → `/experiments/bass2-b20` displays one NASA-source-checked fixture. The source PDF is linked, not bundled. A running local server works with internet disconnected; this is not a PWA installed for serverless offline navigation.

```sh
npm run check             # lint, strict types, unit tests, fixture hashes, basic security, production build
PLAYWRIGHT_BROWSERS_PATH=./.cache/ms-playwright npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=./.cache/ms-playwright npm run test:e2e
npm audit --audit-level=high
```

Browser tests start and stop a production server themselves; build first. Windows users can set `PLAYWRIGHT_BROWSERS_PATH` with their shell's environment syntax. No paid endpoints, generation or deployments are wired in.

## Architecture and handoff

- `apps/web`: Next.js App Router, minimal accessible preview, server-only API handlers.
- `packages/shared`: Zod/TypeScript science, API, feature, mission, state and Evidence Passport contracts.
- `packages/science`: validated read-only fixture and passport citation-lineage checks.
- `packages/game-core`: deterministic evidence inspection, unavailable-mission guards and versioned local save adapter.
- `data`: one audited B20 record, transcribed source-cell audit, integrity hashes and migration manifest.
- `tests`: unit trust-boundary checks and desktop/mobile Chromium foundation journeys.

Read [Phase Zero report](docs/PHASE_ZERO_REPORT.md), [API contracts](docs/API_CONTRACTS.md), [Claude ownership](docs/OWNERSHIP.md), [data provenance](docs/DATA_PROVENANCE.md), [integration requirements](docs/API_INTEGRATIONS.md) and [security](SECURITY.md).

The subsequent [Phase Zero acceptance review](docs/PHASE_ZERO_ACCEPTANCE.md) records current checks, remaining gates and contract corrections. Follow its accepted local commit and OWNERSHIP.md worktree instructions before starting Phase One; the original report and scorecard retain their historical results.

**Scientific correction:** upstream B20 labels 16.5% oxygen as calibrated. NASA Table A.1, PDF page 112, has calibrated initial/final oxygen **17.4%**; V2 preserves this correction and does not silently inherit legacy values. Other upstream rows require re-audit.

The supplied master prompt, instructions, project skills and design references are preserved for future phases. They describe target scope, not completed functionality. Stop after the Phase Zero handoff; UI/science parallel work begins only after contracts are reviewed and agreed. No remote push or production deployment is part of this handoff.
