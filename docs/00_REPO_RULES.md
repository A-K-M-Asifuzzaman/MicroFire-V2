# 00 — SHARED NON-NEGOTIABLE MASTER CONTRACT

You are an interdisciplinary team building **MicroFire-V2**, a new independent 2026 NASA Space Apps Flame in Freefall research observatory and an evidence-driven 3D game.

## Git and ownership hard stops
- ONLY authorized writable repository: `A-K-M-Asifuzzaman/MicroFire-V2`. Check `git remote -v` BEFORE any commit/push. If not this exact origin, stop immediately.
- Existing `A-K-M-Asifuzzaman/MicroFire-Atlas` is a separate deployed product. READ-ONLY reference; do not open PR, push, change settings, or delete it. Never use `git remote set-url` to hijack a directory. No force push.
- Rival `asifhasan973/exovisionaries2026` is READ-ONLY comparison; no copying source, assets, design, characters, scripts or voice files. Compare verifiable usability and game mechanics, then design original behavior.
- Do not claim any completed functionality based on mockups, roadmap items, README aspirations, fabricated API responses, or untested code.
- When migrating scientific **data** from prior MicroFire Atlas, import only after checking source IDs, source document URL/pages, terms/license and QA. Preserve attribution. Prefer new deterministic code, not wholesale repo duplication. Confirm original repo's actual HEAD before referencing paths/counts. An early snapshot had 56 BASS-II records, 20 Saffire records, 2 LUCI records; this does NOT mean all NASA experiments or current live counts.

## Problem fit and epistemology
Official 2026 challenge: build an interactive AI-powered dashboard to **summarize, rank and interpret** microgravity combustion experiments to yield human-exploration fire-safety insights. Research app is indispensable, playful layer is important but secondary.
Every asserted claim must link to evidence/experiment/source. Categories: `observed`, `derived`, `interpretation`, `not_established` (or `data_gap`). Never turn research relevance score into quantified fire-risk/safety certification. Say 'Evidence insufficient' when justified. Fictional incidents and imagined 3D flame geometry must be labeled educational illustration. No fake maps of physical experiment locations, no made-up experiment counts, temperatures, paper titles, soot curves, smoke toxicity or spacecraft telemetry.
Data completeness score != scientific certainty. NASA affiliation/endorsement MUST NOT be implied. Label sources, collection dates, permissions, licensing and caveats. Earth wildfire FIRMS and Earth meteorology are NOT microgravity flame measurements.

## Engineering & operating rules
- Stack: Next.js App Router, React, TypeScript strict, responsive accessible CSS/Tailwind, Three.js 3D, Python/FastAPI optional *only after a documented need*. Prefer one Next.js deployment initially; add services only for clear measurable value. Tested server-only API integration, no secrets exposed to browser.
- One canonical versioned persisted game state, typed domain contracts, tests for gates and repairs, lazy-load 3D, monitor bundle size and mobile frame rates.
- Share low-level contracts first. Codex owns `packages/science/`, API contracts, backend, pure reducers, tests. Claude owns `apps/web` routes, CSS, visual systems, 3D/game presentation. Coordinated changes via PR; do not concurrently edit same paths.
- No billable 3D generation or external paid API calls without owner's explicit approval for each job/batch and cost estimate. If tool unavailable, create placeholder and `Coming Soon` without implying functionality.
- Do not install arbitrary MCPs or skill repos blindly. Vet trust, data exfiltration, licensing and billing; ask for approval before system-wide installation.
- Each PR gives what changed, what is verified (test command output), what's not done, screenshots or clips, actual browser check, source and limitations. Passing unit tests != successful gameplay/browser verification.
