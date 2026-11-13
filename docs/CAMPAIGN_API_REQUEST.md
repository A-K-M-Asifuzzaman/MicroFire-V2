# Campaign HTTP API: request from Claude (frontend) to Sol (backend)

**Status: requested, not implemented.** Missions 1, 3, 4 and 5 have frontend scenes in fixture mode. They cannot become playable until the private `CampaignService` has an HTTP transport and that transport passes independent review. Claude will not add backend routes or run campaign rules in the browser.

## What the frontend already does

`apps/web/game/missions/` renders `CampaignSnapshotSchema` states and emits `CampaignActionSchema` intents. Every intent is validated with the shared schema before it leaves the component. In the fixture gallery (`/m2-fixtures/missions/<mission>`, behind the same review gate as `/m2-fixtures`), intents are logged, never applied. The fixtures come from `scripts/campaign-fixtures.ts`, which drives `CampaignService` with a local authority and fresh random secrets, and writes each step's snapshot, feedback or refusal, with checkpoints stripped.

## Requested endpoints

These mirror the frozen M2 preview semantics so the existing transport and controller patterns carry over.
- **Gating:** the same local-only gate as `/api/game/preview/*`: `previewConfig`, loopback origin, the operator credential and the HttpOnly grant.
- **Envelope:** the same response envelope (`{ apiVersion: 1, data }`) and failure codes (400 / 403 / 404 / 409 / 413 / 415 / 429 / 503).

| Method and path | Body | Returns |
|---|---|---|
| `GET /api/game/campaign/capability` | none | Whether campaign mode is enabled on this server (404 when off, like the preview API) |
| `POST /api/game/campaign/start` | `{ sessionId }` | `CampaignSnapshot` |
| `POST /api/game/campaign/command` | `CampaignCommand` (identity from `campaignIdentity`) | `{ ok: true, snapshot, feedback? }` or `{ ok: false, code, message, snapshot }`. Domain refusals return HTTP 200 with an unchanged snapshot |
| `GET /api/game/campaign/session/:id` | none | `CampaignSnapshot`, for unknown-commit reconciliation |
| `POST /api/game/campaign/resume` | `{ checkpoint }` | `CampaignSnapshot` |
| `GET /api/game/campaign/export/:id` | none | `CampaignExport` (`record` + `passport` + `checkpoint`) |

## Questions for Sol

1. **M2 inside the campaign.** Should the M2 steps run through the campaign `TRAINING` actions (one session for all five missions), or should Mission 2 keep the frozen preview session, with the campaign starting from its qualified state?
2. **Refusal snapshot.** Can a refusal response include the unchanged snapshot? Today `CampaignService.command` returns `{ ok: false, code, message }`, and the UI needs the confirmed state.
3. **POST budget.** What POST budget applies? A full five-mission run is about 45 commands; M2 alone used 25–27.
4. **Exports.** Should `CampaignExportSchema` downloads be offered to learners, or stay operator-only until review?
