# 22 — IMPORTANT: MESHY PREMIUM vs ACTUAL API GENERATION BALANCE

**Do not infer account-specific API entitlement from subscription marketing alone.** Current official material is nuanced:
- Individual Premium plan includes API key/access according to Meshy's plan guidance: https://help.meshy.ai/en/articles/12062933-which-meshy-plan-is-right-for-you-free-vs-pro-vs-premium-vs-ultra
- The official AI integration document shows Meshy MCP for Claude and Codex, authenticating with `MESHY_API_KEY`: https://docs.meshy.ai/en/api/ai
- API pricing describes API work as *pay-before-you-go* and says buy API usage: https://docs.meshy.ai/en/api/pricing
- Other help pages say monthly credits are consumed before purchased permanent credits and plugins/integrations charge the same balance: https://help.meshy.ai/en/articles/9991981-how-do-meshy-credits-work and https://intercom.help/meshy/en/articles/16815622-how-many-credits-does-each-meshy-api-task-cost

**Resolution protocol, NO assumptions:**
1. User obtains API key themselves; never paste it in chat, prompts, repo or public `.env`.
2. With secure local env/MCP, do **readonly** `meshy_check_balance` or call the official Balance endpoint `GET https://api.meshy.ai/openapi/v1/balance`. Do not log the bearer token. Note displayed account monthly/purchased balance separately, without recording account IDs.
3. Confirm from actual usage/billing UI (or Meshy support) **which credits API jobs deduct** before a paid test. A readable balance value alone is not proof about billing provenance. API call authorization and credit availability also vary with team/account scope.
4. If no usable API credits, extra purchase asked, or API check unauthorized, do **not** purchase automatically. Switch to web app generation by owner and manually integrate exported GLB; keep Claude/Codex programming workflow unchanged.
5. If usable API entitlement confirmed, present ONE specific job's supported model version, expected task costs (including text preview/refine, texture, remesh, rigging, animation if desired), allowed max spend and stop conditions; only then seek explicit owner approval to run that job.
6. Monitor balance/usage after each approved task, record cost. Limit first pilot to at most 120 planned credits, and reserve the majority of 3,000 pending proof of end-to-end game functionality. No unattended queue, auto-renew, auto top-up or infinite retries.
7. Re-check live pricing and models; API documentation shows retired `meshy-5` on October 10, 2026 and future retirement of `lowpoly` October 30, 2026.

**Manual path is fully supported:** owner generates PIX etc. in Meshy browser, downloads permitted `GLB` files, puts them in `public/assets/models/incoming/`, and asks Claude to run `scripts/validate-glb` and optimize/import them. Neither Codex nor Claude needs paid API access to integrate 3D models.

Never give or copy user API key to a remotely untrusted MCP server; verify official package provenance and permission boundaries before installing. Use only targeted configuration and avoid accidental secret inclusion in shell history.
