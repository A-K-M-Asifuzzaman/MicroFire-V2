# 02 — IMPLEMENTABLE FULL-STACK SYSTEM ARCHITECTURE

## New repository target
```
MicroFire-V2/
  README.md  CLAUDE.md  AGENTS.md  .gitignore  .env.example
  apps/web/                  # Next.js App Router, visual app and API handlers
    app/                     # / /dashboard /atlas /experiments/[id] /compare /gaps /ask
                             # /lab /missions /missions/[id] /passport /methodology /sources /roadmap /challenge
    components/              # site layout, dashboard, evidence, PIX, scene shells
    game/                    # visual Three.js canvas, accessibility input, audio cues
    public/models/           # optimized GLB (only validated owned or licensed assets)
  packages/science/          # strict TS types, data normalization, provenance, ranking and evaluation
  packages/game-core/        # pure typed reducer, mission gates and versioned saves
  packages/shared/           # API DTOs and feature flags
  data/                      # source manifest, verified records, update scripts
  docs/                      # specs, research licenses, validations, comparisons
  tests/e2e/                 # Playwright browser flows
  .github/workflows/quality.yml
  .claude/skills/*/SKILL.md
  .agents/skills/*/SKILL.md
```

## Core typed interfaces (Codex defines before Claude implements)
```
Experiment { id; program; sourceIds[]; testName?; dimensions{gravity,oxygenPct,pressureKpa,flowCmS,material,geometry}; measurements; outcome; provenance; completeness }
Source { id; title; institution; URL; pages?; retrievedAt; assetRights? }
Claim { id; text; epistemicKind: observed|derived|interpretation|not_established; supportingSourceIds[]; conditions; limitations[] }
Question { goal; targetConditions; compareMode; requestedOutcome }
RankedEvidence { recordId; score; matchedFields[]; mismatches[]; missingFields[]; reasons[]; limits[] }
AIAnswer { answer; claimIds[]; citations[]; unsupportedStatements[]; abstained; retrievalVersion }
GameStateV1 { version; chapter; setup; installedParts[]; instrumentation; predictions; inspectedEvidence[]; decisionLog[]; earnedPassportItems[]; saveSignature }
FeatureStatus { id; state: available|preview|coming_soon|blocked; route?; documentation?; testedAt? }
```
These are conceptual shapes; Phase Zero must write exact Zod/TS contracts, test schemas and API payload examples. Do not infer missing numeric fields are zero. Unknown values are nullable.

## System flow
Primary NASA/other reference URLs -> verified ingest/curation pipeline -> normalized sources/experiments/claims -> indexed hybrid retrieval and evidence ranking -> server-side explainable synthesis -> citation verifier -> authenticated or public rate-limited API -> clean dashboard/compare/gaps/passport.
Game view -> pure game reducer and evidence-bound scenario registry -> validated mission output -> Evidence Passport. 3D renderer is **view**, never source of scientific truth. Game graphics cannot amend science records.

## Deployment path
Phase P0/P1: single Next.js server deployment on Vercel, static verified source snapshot, route handlers, no database until data volume requires. Optional Postgres for shareable cases and audit logs; vector DB/hybrid BM25 for >hundreds/thousands sources only after benchmarking. Avoid oversized LLM stacks, agent swarms, re-ingestion cron and speculative microservices before baseline.

## API design
GET /api/health; GET /api/feature-status; GET /api/experiments?filters; GET /api/experiments/:id; POST /api/evidence/rank; POST /api/evidence/compare; POST /api/ask; POST /api/passport/validate; GET /api/sources. All pagination/caching/errors typed and validated, rate-limited, server-only secrets.
External providers must have adapters, retrieval timestamps, ETags where possible, stale fallback and explicit source provenance.

## Performance & inclusive access
Core research pages must render without WebGL or LLM. Lazy import Three.js, control DPR/drawcalls, use deterministic low/medium/high quality preset, GLB mesh decimation and texture compression. Prefer user-controlled motion, captioned voice and keyboard/touch controls, readable graphs, accessible contrast, screen-reader research summaries, clear loading/empty/error states. Mobile 360/390/768, desktop 1440. No fake 'real-time experiment monitoring'.
