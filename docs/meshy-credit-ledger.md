# Meshy ledger

## Phase Zero
Generation jobs: 0. Credits spent: 0. Balance: NOT CHECKED. No key read, balance call, MCP installation or deployment.

## M1.5 (2026-10-15)
- Generation jobs: **0**. Credits spent: **0**.
- Owner-reported website balance: 3,100. Authenticated API balance: **NOT VERIFIED**, because `MESHY_API_KEY` is not configured in the agent environment. A key was pasted into chat; the owner should rotate it before configuring the new key privately. It was not stored, used or echoed.
- Meshy pricing says API jobs draw on a prepaid API balance. `GET /openapi/v1/balance` with the owner's key must confirm the spendable pool before any job runs.
- Pilot proposed, awaiting approval: `pix-v1` (30), `console-v1` (30). Estimate 60, requested cap 100. Planning ceilings: M1.5 800, M2 1,300, M3 700, revisions 300.
- Tool: `tools/meshy/meshy.mjs` (local only). Per-job balance before/after goes to `tools/meshy/ledger.jsonl`.
