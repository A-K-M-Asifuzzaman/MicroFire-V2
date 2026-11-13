# 15 — MACOS EXACT START AND PARALLEL WORKTREE PLAYBOOK

**Important:** `A-K-M-Asifuzzaman/MicroFire-V2` already exists on GitHub and was **empty** at the time of this pack. Therefore clone it. Your supplied `git init`, `git remote add origin` sequence is appropriate ONLY if you already have a new local folder to turn into a repository and do not clone. Don't use both. Never accidentally push to `MicroFire-Atlas`.

## A. Prerequisites
```
git --version
node --version
npm --version
claude --version
codex --version
gh --version         # optional GitHub CLI; install with Homebrew if missing
```
Install a maintained Node LTS if no Node. You may use macOS Terminal in your existing workspace. Never paste production API secrets into chat.

## B. Clone the independent empty repo and verify
```
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/A-K-M-Asifuzzaman/MicroFire-V2.git
cd MicroFire-V2
pwd
git remote -v
```
If already cloned or repo no longer empty, inspect `git status`, `git log` and files; adapt. If using the manual init commands from the user instead, do not run clone, and verify this is a completely NEW folder. Keep the original MicroFire-Atlas clone in a different directory.

## C. Add starter pack
Unzip this ZIP to a folder alongside your clone. Copy the **contents** of the extracted `MicroFire_V2_Independent_Agent_Pack/` into the new repo root, preserving hidden `.claude`, `.agents`, `.github` directories. Example if ZIP unpacked at `~/Downloads/MicroFire_V2_Independent_Agent_Pack`:
```
rsync -a --exclude '.DS_Store' ~/Downloads/MicroFire_V2_Independent_Agent_Pack/ ./
git status --short
git add README.md docs/internal/README_START_HERE.md docs CLAUDE.md AGENTS.md .claude .agents .github .gitignore .env.example
# review staged changes, no credentials
git diff --cached --stat
git commit -m "docs: initialize science-first v2 agent workflow"
git push -u origin main
```
Do not copy `*.env.local`, production keys or proprietary 3D assets. If Git user identity isn't configured, set your own with git config before commit. The ZIP can be extracted with Finder; rsync is an example, not mandatory.

## D. Codex Phase Zero FIRST
```
git switch main
git pull --ff-only origin main
git worktree add ../MicroFire-V2-contracts -b feat/phase-zero-contracts main
cd ../MicroFire-V2-contracts
codex
```
Paste `docs/PROMPTS_TO_PASTE.md` **Codex** block. Contract/Next.js scaffold may create new `apps/web` and packages. After Codex commits and passes checks:
```
cd ../MicroFire-V2
git switch main
git status --short
git merge --no-ff feat/phase-zero-contracts
npm install   # only when root package.json actually exists
# run scripts discovered via package.json before moving forward
git push origin main
```
Alternative PR flow via `gh pr create`, peer review and GitHub merge preferred for teamwork. Do not merge if tests fail.

## E. Parallel Claude and Codex after contract merge
```
cd ~/Projects/MicroFire-V2
git pull --ff-only origin main
git worktree add ../MicroFire-V2-claude -b feat/ui-game main
git worktree add ../MicroFire-V2-codex -b feat/science-core main
```
Terminal 1: `cd ~/Projects/MicroFire-V2-claude && claude` -> paste Claude block from `PROMPTS_TO_PASTE.md`.
Terminal 2: `cd ~/Projects/MicroFire-V2-codex && codex` -> paste Codex Phase 1 block.
**Ownership:** Claude app routes/Three.js/CSS and UI browser tests; Codex science/backend/game pure rules, science eval; neither edits other's owned files without opening an interface-change PR. Both rely on shared `packages/shared` contract branch already merged. Only one agent (Claude) coordinates Meshy credit approvals and generated assets.

## F. Reconcile each working increment
Each agent runs tests and commits in its worktree. From main checkout, review diffs and merge sequentially, resolving actual conflicts with both agents. No simultaneous write to the same file, no `git reset --hard` / force-push. Run full CI and manual Playwright browser checks, open Vercel preview. Promote statuses only after proof.

## G. Go live
Push main after approval; connect **only** MicroFire-V2 to a **new Vercel project** (not the existing MicroFire Atlas deployment). Add secret values in Vercel project dashboard only; redeploy. Store preview URL in docs. Never change the older domain/site unless explicitly requested.
