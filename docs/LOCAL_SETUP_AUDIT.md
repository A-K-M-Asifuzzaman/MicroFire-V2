# Local setup audit — 2026-10-11

Initial cwd: `/Volumes/ssd(mac)2/NASA SPACE APP CHALLENGE 2026/untitled folder 3`. It held the supplied specification pack and was not a Git repository. Cloned the explicitly authorized empty MicroFire-V2 remote into `MicroFire-V2/`, verified sole origin, clean/unborn main, and created `feat/phase-zero-contracts`. No existing feature branch or user code existed to preserve. Copied the supplied pack excluding .DS_Store; no git init or remote reassignment.

Git 2.50.1; gh 2.96.0; Codex CLI 0.162.1; Claude Code 2.1.296. Default Node was 25.2.0 (npm 11.16.0), so checks used already-bundled Node **24.19.0 LTS**, with no global installation or PATH configuration change. `.nvmrc` and engines require Node 24. Package-lock pins exact resolved dependencies.

Five project skills are present in both `.agents/skills` and `.claude/skills`: science-integrity, feature-staging, game-qa, 3d-assets and judge-release. Their frontmatter/instructions were inspected; science-integrity and feature-staging applied for P0. No additional skills/MCPs installed. `codex mcp list` ran successfully with a sandbox PATH-alias warning; enabled integrations include context7 and local tool servers. No MCP credentials were accessed or copied; no Meshy connectivity inferred from connector availability.

Project-local npm dependencies and repository-local Chromium test binaries were installed. Poppler's pdftotext/pdftoppm were already present and used for primary PDF inspection. Blender and 3D tooling were not needed or installed. The initial sandbox could not resolve GitHub; approved elevated network commands fetched public references/dependencies. No paid services were contacted.

Claude-mem tool discovery exposed no work_state_write/read tool; its observer also reported exhausted allowance and stale OAuth. No worker restart/configuration change was attempted. The repository handoff documents preserve the durable work evidence.
