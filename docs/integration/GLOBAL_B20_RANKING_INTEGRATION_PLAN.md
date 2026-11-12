# Global integration plan: B20 paraphrase ranking (Codex `af2281e`)

Status (2026-11-13): **consumer review passed, waiting on independent scientific/Astra review.** Nothing is merged, pushed or deployed. The local submission (release `17621b4`, deployment `microfire-v2-cbfazx7ir`, video v2) is locked and does not change.

## What was reviewed

The commit is `af2281e507a816284d397b3dcfafa69b99f1025f` on `codex/b20-direct-paraphrases-20261113`, local to Codex's worktree and not on GitHub. Its handoff is `docs/science-intelligence/13_B20_PARAPHRASE_REVIEW_AND_CLAUDE_HANDOFF.md` (commit `c5e7f0e`).

- **Change:** `rankEvidence` accepts six fixed B20 phrasings, compared after normalization, as support for the canonical claim `bass2-b20-burned-entire-sample`. It also requires:
  - explicit PMMA and 17.4 vol% oxygen;
  - every other supplied condition to match a recorded value exactly;
  - one unambiguous B20 record and claim, with the exact page citation and source hash.

  `RANKING_VERSION` becomes `p1-claim-support-v4`. There is no token similarity, no model and no schema or route change.
- **Base:** it also brings in Codex's source expansion (`b3bdbfb`, `3ceeca0`). The library goes from four to six descriptions, adding `acme-bre` and `saffire-i`. Three Saffire candidates are added, all quarantined. No new admitted run.

## Consumer test results

The test branch is the local-only `claude/b20-consumer-review`: `claude/global-research` plus a merge of `af2281e` plus one test fix.

| Check | Result |
|---|---|
| Merge | Clean; no dependency or lockfile change |
| `npm run check` | Exit 0. 271/271 unit tests; science Ask 30/30, rank 22/22, faithful 13/13, forbidden 0, repeatable 30/30; production build |
| e2e | 116 passed, 2 failed, 22 skipped. Both failures were `library.spec.ts` expecting exactly 4 cards. The page renders the API array correctly; only the test was hard-coded. Fixed (`91f114f` on `claude/global-research`, `db2113b` on the consumer branch); the spec then passed 6/6 |
| M2-UI | 123 passed, 47 skipped (same as release) |
| Visual, desktop and mobile | `/investigations` shows 6 cards; `/investigations/saffire-i` and `/investigations/acme-bre` return 200 with no horizontal scroll, and each shows "Source description, not run evidence" with its PSI dataset link |
| Alias in Workstation | "Did the B20 flame burn the whole sample?" + PMMA + 17.4 gives "Supported by an observed NASA statement", `observed · direct`, B20 Table A.1 PDF page 112. Transfer stays "Not enough recorded evidence" because gravity and pressure are unspecified. Without the conditions, the same question correctly falls back to "Related evidence only" |

Frontend impact: none required. `rankingVersion`, `support.kind` and `evidenceLevel` are rendered from the response. Existing presets send canonical claim text, so the v4 change does not alter any current screen or the submitted video's scenes.

## Integration steps, after independent review accepts the exact commit

1. Merge the **reviewed** commit hash into `claude/global-research`. If review asks for changes, use the new hash. Never use the unreviewed one.
2. Rerun `npm run check`, e2e and M2-UI, sequentially.
3. Add one Workstation example (the only UI change):
   - label "Did the B20 flame burn the whole sample? (PMMA, 17.4 vol%)";
   - question `Did the B20 flame burn the whole sample?`;
   - values `{ material: 'PMMA', oxygenPct: '17.4' }`.

   Test it, plus the negative cases from the handoff: oxygen 17.5 or missing material gives a gap; added lunar gravity or pressure gives no direct applicability; negation and invented measurements give unsupported.
4. Merge into `claude/release-global`, then deploy and alias **only with owner approval**. Record the new immutable URL. The local-submission deployment `cbfazx7ir` stays untouched.
5. Global video: only if the shot adds clarity, record the new example (typed paraphrase gives a direct observation with its page, and the transfer limit stays visible). Keep the 30 s limit.

Display rules carried over from the handoff:
- `relevanceScore` and the direct badge are not truth or safety probabilities;
- never fill in conditions the user didn't supply in order to obtain `direct`;
- new Saffire/ACME candidates stay out of rank, transfer, PIX and Passport selectors.

## Other global dependencies (not Claude-owned)

- **Official resource list.** The Flame in Freefall Resources tab still read "Resources will be available on Friday, November 13" at 02:53 Asia/Dhaka. Once the list is published, map each listed source to library entries before claiming the competition data requirement is met.
- **Campaign API.** Codex's private body reader (`fe4f067`, unmounted) is ready. The blocker is still the cookie scope: `microfire_m2_grant` has Path `/api/game/preview`, so it cannot authorize `/api/game/campaign/v1` in a browser. A joint credential decision and Astra review are needed before a route is mounted. Missions 1, 3, 4 and 5 stay in fixture mode, and public gameplay routes stay 404.
