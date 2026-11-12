# Station Arrival — campaign contract

Implemented: source terminal inspection through existing TRAINING/GAME INSPECT_EVIDENCE; REVIEW_SOURCE checks the canonical claim and exact citation plus research observation versus fictional incident classification. A wrong answer returns educational reasons without awarding source review. COLLECT_EVIDENCE retains the existing source-only entry. Station completion requires successful review and the existing cited observation. CORE cannot bypass the training completion gate.

The M2 frozen guided Station Arrival remains unchanged. This richer campaign action is a separate versioned consumer contract; do not send it to /api/game/preview/action.

Contracts live in packages/shared/src/campaign.ts; deterministic authority in packages/game-core/src/campaign.ts; private authenticated adapter in apps/web/lib/campaign-service.ts. The new campaign format is version 1 / evidence-campaign-v1; it embeds the existing GameState v2, Passport v1 and unchanged M2 Training metadata. It does not alter the frozen bass-b20-training-v1 HTTP interface. No campaign HTTP route is installed; review of the new adapter/transport is required before wiring it to a frontend. The public registry stays unchanged.

Campaign records contain accepted, time-ordered actions. Replay derives objectives and all evidence, rather than trusting a saved completion boolean. The server adapter requires local operator authorization, scopes identities to runtime/session/revision, serializes competing commands, preflights/signs candidates and refuses live-head rollback. Revision is the accepted-event count. Snapshots are parsed with CampaignSnapshotSchema. Tests cover domain completion and server replay/restart; they do not establish mission UI availability.
