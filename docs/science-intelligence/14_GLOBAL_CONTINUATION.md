# Separate global science/campaign continuation — November 13

Branch `codex/global-science-campaign-20261113`; worktree `MicroFire-V2-global-science-campaign`; parent `3ceeca0e4f6bbc4de8cc71d0e1843dd46cb0c816`. This deliberately excludes the unreviewed B20 paraphrase candidate on `codex/b20-direct-paraphrases-20261113` (`af2281e507a816284d397b3dcfafa69b99f1025f`). No local submission/video worktree is changed.

## Implemented private transport boundary

Code commit: `fe4f067ad1428770c94e8a83fc39d22063930a85`. New server-only module `apps/web/lib/campaign-body.ts` is NOT imported by a route or consumer. It implements the byte budgets already proposed in the versioned contract:

| Body route | Maximum UTF-8 bytes |
|---|---:|
| authorize / revoke / start | 1,024 |
| action | 65,536 |
| resume | 176,128 |

`readCampaignBody(request, route)` returns unknown JSON for subsequent strict shared-schema validation. It rejects unknown/inherited route names, invalid Content-Length, unsupported media, body overflow even when the declared length is absent/false, malformed UTF-8, duplicate/escaped-duplicate/nested-duplicate keys, nonfinite numeric overflow, malformed/trailing JSON and excessive nesting. Overflow cancels the stream and releases its reader. Existing duplicate-key parsing and campaign decimal canonicalization are reused, preserving 17.4 rather than using frozen M2 integer canonicalization.

This function supplies neither authorization nor scientific validation. Before using its result, a future reviewed handler must enforce disabled/hosted/local-origin gates, rate limits and campaign grant, parse the exact shared endpoint schema, verify start/resume runtimeId before calling CampaignService, recheck authorization before mutation and handle response budgets. Do not cast unknown into a command or call the service after a failed boundary.

The M2 request reader, cookie authority, 32 KiB envelope, canonical bytes, routes, checkpoints and UI are unchanged. A test explicitly verifies that the existing M2 reader still rejects a body which the larger campaign action budget accepts. No generic parser option was added to M2.

## Actual verification

- 20 new body-boundary cases; targeted body/service/wire tests: 26/26 pass.
- Full unit run: 243/243 in 19 files. Lint, root/web types, data/source validation, existing science evaluation (Ask 30/30, rank 7/7) and basic security checks pass.
- The first `npm run check` exited 1 solely because this fresh worktree could not fetch existing Google Fonts under restricted network access. A separately authorized `npm run build` then exited 0. No font/dependency/source setting was changed to bypass that failure. Logs preserve both results.
- No campaign HTTP/browser acceptance is claimed: this module is deliberately unmounted. The earlier private-service progression tests still pass, but they do not solve browser-cookie delivery or prove end-to-end mission playability.

Logs: `evidence/global-campaign-boundary.log`, `evidence/global-campaign-check.log`, `evidence/global-campaign-build.log`.

## Resource integration continuation

One authorized rendered inspection after finishing the targeted science work checked the official challenge Resources tab at 02:23 Asia/Dhaka on November 13. It still contained the November 13 release placeholder, with no named qualifying list. Snapshot: `evidence/global-resource-state-20261113.json`. No polling automation was restarted, no old source hashing was repeated, and no qualifying-data claim was invented.

The functional six-entry library/PSI links and quarantined review batches from `12_NASA_SOURCE_PRIORITIZATION.md` are preserved. When the named resources appear, inspect the original link/version/rights and prove the existing feature uses it, or make the smallest reviewed integration. No raw archive is silently ingested and no candidate becomes an admitted experiment merely because its investigation appears on a list.

## Remaining exact dependencies

- Independent review of the separate six-phrase B20 candidate and its essential-condition/source-run policy before any adoption.
- Actual published resource list before asserting competition qualification; source-specific licensing and independent scientific admission remain distinct gates.
- Joint campaign credential/shared-contract acceptance and Astra review. Present M2 cookie `microfire_m2_grant` has Path `/api/game/preview` and cannot authorize `/api/game/campaign/v1` in a browser. This body reader does not bypass or resolve that blocker.
- Reviewed HTTP adapter, browser authorization/recovery/progression acceptance, and Claude scene consumption before any mission availability or public exposure.

B20 remains 17.4 calibrated oxygen; the catalog, all 55 legacy quarantine entries, seven separate review items, source contracts, Claude worktrees/assets/videos and deployment are unchanged. No new records admitted, routes mounted, source contracts altered, merge, deployment or paid API call occurred.
