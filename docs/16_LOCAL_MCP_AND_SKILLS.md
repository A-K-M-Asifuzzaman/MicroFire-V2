# 16 — LOCAL AGENT TOOLS, PLUGINS AND SKILLS (MESHY EDITION)

ChatGPT apps/plugins are not automatically available inside locally run Claude Code and Codex. Inspect local versions and actual MCP lists before installing anything; use minimal access scopes and official docs. User permissions required for tokens and tool installations with elevated access.

## Included in this pack
Project-native skills: `.claude/skills/microfire-science-integrity/SKILL.md`, `.claude/skills/microfire-feature-staging/SKILL.md`, `.claude/skills/microfire-3d-assets/SKILL.md`, `.claude/skills/microfire-game-qa/SKILL.md`, `.claude/skills/microfire-judge-release/SKILL.md`; mirrored under `.agents/skills/` for Codex. They are **not preinstalled outside this repository**. Read/validate them, don't use untrusted directories.

## Local tooling priority
1. Git, Node.js LTS and package manager based on actual lockfile.
2. Playwright testing (`https://playwright.dev/docs/intro`), TypeScript strict, Zod, unit test runner, ESLint and secret scanning.
3. Blender for scripted precise BASS-II geometry, plus glTF/GLB optimization tooling tested with current Three.js/R3F.
4. Official Meshy AI MCP (only if authenticated entitlement allows API): `https://docs.meshy.ai/en/api/ai`. Official package listed as `@meshy-ai/meshy-mcp-server`; verify publisher + official docs before installing. Alternative official `meshy-dev/meshy-3d-agent` skill via official instructions; no need to install both just for decoration. Key should be supplied securely by user and never copied into command literal, git files or logs. A 3D asset **manual web export** workflow is sufficient if no funded API access.
5. Optional Context7 for current framework documentation if actually needed; official OpenAI developer docs MCP only if relevant OpenAI API integration, GitHub CLI/MCP for branch/PR management with repo-scoped permissions, Vercel CLI for permissioned preview deployments.

## Safe setup inspection
```
claude --version
codex --version
claude mcp list
codex mcp list
node --version
git remote -v
```
No dangerous dev channels; never ask the user to expose tokens in the chat. Confirm before touching private models/account/credit balance. Do not assume an arbitrary tool name; enumerate advertised schemas from installed tool.

## Agent ownership
Claude drives Meshy proposals, artistic GLB QA, game UI, 3D. Codex tests science and machinery constraints; doesn't duplicate API generation. Each billable request requires separate human approval and recorded balance. See `docs/22_MESHY_SUBSCRIPTION_API_BILLING_CHECK.md`.
