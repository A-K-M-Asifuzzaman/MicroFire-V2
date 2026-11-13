# Contract examples

The five scientific request/response files were generated from the implemented pure services and parsed against the shared response schemas. Production HTTP acceptance separately verifies these routes. The proposed Moon label, lunar gravity target and 70 kPa target are **user-scenario inputs**, not NASA lunar measurements. B20 remains 17.4 vol% with unknown pressure/run acceleration. Each response retains its scope/limitations.

`campaign-command.json` is a canonical command vector with illustrative UUIDs, parsed against the existing CampaignCommandSchema and hashed by campaignIdentity. It is not a server grant, session, live HTTP receipt or completed mission. Replace UUIDs/revision with the server-confirmed runtime/case/head before sending through the future reviewed transport. Never fabricate command IDs or inject local scene state. No credential or signing key is included.
