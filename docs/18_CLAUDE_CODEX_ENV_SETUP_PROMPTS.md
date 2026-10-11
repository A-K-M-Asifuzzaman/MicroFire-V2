# 18 — FIRST ENVIRONMENT & SKILLS SETUP PROMPTS

These are **one-off setup prompts**, executed from the **MicroFire-V2** cloned repository root. They must not silently install subscriptions, privileged daemons, paid MCPs, or unverified community tools. The five custom project-specific skills for each agent are already bundled in the repository.

## Claude Code — paste before app construction

You are operating ONLY in the MicroFire-V2 new repository, never in old MicroFire-Atlas. Verify git remote, pwd and branch. Read docs/16_LOCAL_MCP_AND_SKILLS.md and the five local `.claude/skills/*/SKILL.md` plus `CLAUDE.md`. Inspect git, gh, node/npm, claude, codex, `claude mcp list`, `codex mcp list`, Blender, Playwright, and the availability of official Meshy MCP tooling. Report missing packages and reliable official installation commands. Install only project-local npm dev dependencies as needed after reviewing package changes. Request permission for machine-wide installs, any third-party MCP, browser downloads, login steps, new credential permissions, and any billable API or Meshy job. Verify whether the official Meshy MCP package `@meshy-ai/meshy-mcp-server` is installed using supported client MCP listing commands. Do not invent a `meshy-cli` binary or execute any billable job. Follow `https://docs.meshy.ai/en/api/ai` and `docs/22_MESHY_SUBSCRIPTION_API_BILLING_CHECK.md` for secure setup. Confirm the bundled skills load and provide a concise setup audit and exact next steps; no changes to other repositories.

## Codex — paste in Phase Zero

You are operating ONLY in MicroFire-V2. Verify `git remote -v` first. Read AGENTS.md, docs/16_LOCAL_MCP_AND_SKILLS.md, docs/06_CODEX_MASTER.md and all `.agents/skills/*/SKILL.md`. Inspect existing local tools, `codex mcp list`, git/gh, npm and Playwright options. Optional official OpenAI developer docs MCP setup, only if needed and with user approval for settings change: `codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp`. Do not install a paid Meshy integration; Claude owns asset production. Validate repo-local skill frontmatter and paths and recommend only necessary additional tools. Produce `docs/LOCAL_SETUP_AUDIT.md` with verified versions, working configs and failures. Don't print secrets or perform machine-wide installs without consent.

## Shared after Phase Zero

Claude can use its built-in `/run`, `/verify`, and `/code-review` skills where supported by its installed version. Codex uses its local five skills and executes science/API/test checks. Never confuse ChatGPT-connected plugins with local CLI MCP servers; don't bypass authentication or enable experimental channels unsafely.
