# Scientific intelligence phase: eligibility and resource verification

Checked November 12, 2026, Asia/Dhaka. Research-only branch: `codex/science-intelligence-20261112`; isolated worktree: `MicroFire-V2-science-intelligence`. Base: `d9a331304d315b5b14c2b29b9f1a127ccd13744f`.

**New competition implementation has not begun.** The owner requires confirmation of the permitted development period and project eligibility first. Today's date precedes the published Chattogram event. These notes record permitted resource research and the unresolved gate; they do not establish eligibility or change the completed BASS-II milestone.

## Development-period finding

The [Global Organizing Team's answered discussion](https://github.com/nasa/spaceapps/discussions/1827) starts development at 09:00 local time on November 14 for the standard event, allows advance topic/resource research and warns that early project work can affect eligibility. It also requires citation of used resources and at least one NASA source from the challenge's Resources for Global Awards.

The [participant terms](https://www.spaceappschallenge.org/legal/) permit a different event day in the same week when previously approved in writing by the Global Organizing Team. The owner identified [Chattogram's local site](https://chattogram.nasaspaceappsbd.com/), which publishes November 13–14. Its linked [NASA-hosted local listing](https://www.spaceappschallenge.org/2026/local-events/chattogram/) also describes that shift and says the local event begins at 07:00 on November 13, UTC+6. That listing identifies its contents as Local Lead/participant submissions that may not have NASA review; publication alone is not proof of the written exception or permission to develop on November 12.

No reviewed source establishes permission for today's competition implementation or acceptance of the existing MicroFire code. The owner has been asked for the applicable notice. Existing code and history must remain intact and be disclosed as required; this document makes no determination that the project is eligible or disqualified. Starting a new branch does not resolve earlier-work eligibility.

## Conflicting submission times

| Source | Published information | Reliability limit |
|---|---|---|
| Chattogram home, public configuration | Local 240-second window: November 13, 00:00–18:00 | Fields have no UTC offset; visible home countdown calls it registration. The 30-second fields are null. This is not an authenticated submission receipt. |
| NASA-hosted Chattogram day schedule | November 13, 18:30: 240-second upload; November 14, 09:00: 30-second upload | UTC+6 is declared, but the same page contradicts itself elsewhere. |
| Same listing, key dates | November 1, 18:30: local 240-second cut; November 14, 12:00: final 30-second video | Earlier local date appears stale; no correction should be assumed. |
| Local FAQ | Repeats November 14–15 globally and November 15, 23:59 for submission | Does not replace the owner's earlier video deadlines. |

The official local listing's structured `startDate`, `endDate` and `submissionDeadline` are null; the dates above come from its authored description/schedule. Protect November 13 at 18:00 and November 14 at 09:00 as conservative planning bounds until the organizer resolves the conflict. Retain an upload/correction margin. These are provisional bounds, not confirmation of the actual cutoffs or development permission. The previous local-stage videos and website remain Claude-owned and unchanged.

## Challenge requirements verified as topic research

The [Flame in Freefall statement](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) requests a dashboard that summarizes, ranks and interprets combustion investigations for crew environments. It identifies solid-fuel BASS/Saffire, liquid-droplet FLEX and gaseous-fuel ACME work. Suggested comparisons include fuel geometry, oxygen, airflow, experimental variables, instrumentation and shared apparatus.

The statement says PSI currently has no partial-gravity combustion data. E-FIELD's electrical forcing must not be labelled a lunar-gravity measurement. Its Resources tab currently announces November 13 availability. The four NASA-hosted sources below are research leads; their presence in the eventual challenge Resources list has not been confirmed. NASA hosting does not itself prove challenge-resource eligibility. The existing deterministic science code must not be described as an implemented model or safety predictor.

## Primary-source inventory preserved and reverified

This is a source-research inventory, not an implemented Investigation Library or an expanded admitted dataset. Four preserved PDFs were rehashed from each of two existing download directories; all eight checks matched the quarantine manifest's SHA-256 and byte counts. No new download, independent scientific approval or experimental admission is claimed in this phase.

| Investigation | Primary source | Existing verification scope and limits |
|---|---|---|
| BASS-II | [NASA NTRS 20210011385](https://ntrs.nasa.gov/citations/20210011385) | Report Table A.1, PDF page 112. Existing admitted B20 retains calibrated oxygen 17.4%. B19 remains quarantined; potentiometer readings cannot be silently treated as velocity. |
| FLEX | [NASA NTRS 20205008449](https://ntrs.nasa.gov/citations/20205008449) | PDF page 4 contains the previously inspected FLEX-062 inset. Diameter units/symbols and original run linkage remain unresolved; plotted points were not digitized. |
| ACME | [NASA NTRS 20220015583](https://ntrs.nasa.gov/citations/20220015583) | Poster supports program/apparatus discovery. It does not provide a complete identified run with oxygen, pressure and fuel/flow measurements. |
| Saffire | [NASA NTRS 20210011521](https://ntrs.nasa.gov/citations/20210011521) | Previously inspected Table 1 on PDF page 3 and Section III.A/page 4. Oxygen basis, changing flow, geometry discrepancies and narrative timing require review before normalization. |

Hashes, byte counts, public-page capture hashes and selected deadline fields are in [research-evidence-20261112.json](research-evidence-20261112.json). Existing source/page inspection is documented in `docs/codex-completion/09_DATA_VERIFICATION.md`; this phase's rehash is not a substitute for that inspection or independent review. All 55 legacy rows and every new candidate remain quarantined. No source, condition, measurement, confidence, fire-risk probability or safety certification was added.

## Handoff state

- Implementation commits for this phase: none. The only new deliverables are this research record and its evidence JSON.
- New API endpoints/shared runtime schemas: none; no private mission API was exposed or redesigned before the period gate.
- No dependencies installed, BASS-II rebuild, tests repeated, deployments, merges, source promotions, video edits or changes to Claude's active checkout.
- Required clarification: the applicable approved local start time/timezone; whether the existing project and pre-event code may be reused and how they must be disclosed; corrected local/final video deadlines.
- After that confirmation and arrival of the permitted period, competition implementation can start in this isolated branch. Independent scientific promotion and Astra API/security acceptance remain separate requirements.
