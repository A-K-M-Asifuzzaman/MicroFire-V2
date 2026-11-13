# 238-second video v3: the complete verified experience (plan)

**Target length:** 238.0 s (7,140 frames), 1080p30, with captions and an SRT.

**Status: preparation authorized by the latest owner instruction (2026-11-13), superseding the earlier video hold. Recording and editing wait for the approved staging or release deployment to pass its acceptance tests. This revision changes the plan only; no footage or existing video assets were changed.**

**Footage rule:** every gameplay shot must be recorded from a real, functioning deployment, either the approved staging deployment or the approved public release. Record the exact approved deployment URL and tested release commit; the final submission must identify the deployed version shown to judges. Mocked responses, fixture galleries and local test builds may not appear as "the product".

**Fallback:** if staging isn't approved in time, the submitted video stays as locked v2 (`MicroFire-local-236s-1080p-v2.mp4`, paired with `microfire-v2-cbfazx7ir`). Missions then appear only as clearly labelled "in review" scenes, never as playable.

## On-screen labels (always visible on a shot that needs one)

| Label | Used for |
|---|---|
| **NASA observation** | Values and sentences quoted from the BASS-II report, with a PDF page |
| **Educational scenario** | The authored training fault, the station alarm and the fictional lunar habitat |
| **Illustrative scene** | 3D rooms and props; they are not apparatus geometry |
| **Limitation** | One run; pressure unknown; gravity not extracted; no lunar safety inference; educational progress, not certification |

## Timeline

| Shot interval (s) | Block | Shot source | Recording gate |
|---|---|---|---|
| 0–18 | The scientific problem: flames in microgravity and why fire-safety data is scarce | Live research site | Approved deployment acceptance tests pass |
| 17.6–40 | NASA PSI data integration: sources, Atlas, the 55 quarantined records excluded | Live research site | Approved deployment acceptance tests pass |
| 39.6–56 | Verified B20 oxygen calibration: 17.4 vol% calibrated vs 16.5 uncalibrated, Table A.1, PDF page 112 | Live research site | Approved deployment acceptance tests pass |
| 55.6–76 | PIX and evidence traceability: an answer → its citation → the source page | Live research site | Approved deployment acceptance tests pass |
| 75.6–96 | Evidence comparison (At a Glance, Transferability) and the Citation Checker flagging a wrong page | Live research site | Approved deployment acceptance tests pass |
| 95.6–114 | Mission 01, Station Arrival: source review (research vs fiction), Passport entry | **Staging/release `/missions/play`** | Approved deployment acceptance tests pass |
| 113.6–136 | Mission 02, BASS-II Training Bay: fit parts, authored fault, Training check, diagnosis, repair, qualify, open B20 | Staging/release | Approved deployment acceptance tests pass |
| 135.6–152 | Mission 03, Flame Detective: select B20 at 17.4, lock a prediction, reveal, explain with limits | Staging/release | Approved deployment acceptance tests pass |
| 151.6–168 | Mission 04, Claim Trial: appraise four statements, server reasons on a wrong one | Staging/release | Approved deployment acceptance tests pass |
| 167.6–184 | Mission 05, Lunar Habitat (fictional): an "insufficient evidence" verdict; a "safe" verdict is refused | Staging/release | Approved deployment acceptance tests pass |
| 183.6–204 | Passport progression: five entries, a reload resumes the case, JSON export | Staging/release | Approved deployment acceptance tests pass |
| 203.6–222 | Scientific limitations, stated plainly | Site plus captions | Approved deployment acceptance tests pass |
| 221.6–238 | Real-world relevance and future expansion: more PSI datasets added only after evidence acceptance checks | Site plus captions | Approved deployment acceptance tests pass |

**Overlap accounting:** the 13 planned shots total 242.8 s before transitions. Twelve 0.4 s crossfades overlap 4.8 s, so the finished duration is `242.8 − (13 − 1) × 0.4 = 238.0 s`. The intervals above show those overlaps explicitly; fades at the beginning/end do not shorten the cut. If a block becomes multiple shots, recalculate `sum(shot.dur) − 0.4 × (shotCount − 1)` and keep 238.0 s; do not subtract transitions twice.

## Recording method

- Use `tests/visual/demo-record.mjs` (CDP screencast) against the deployment URL.
  - Add new segments for `/missions/play`, driven by the same selectors as `tests/backend/public-campaign-browser.test.ts`.
  - Record the mission sequence in one real visitor case so later missions retain their earned prerequisites. A new take starts a fresh case and plays the required steps; cuts may shorten waits, never manufacture progression.
  - Record a reload mid-mission to show the server restoring inspections, learner prediction, grading feedback and decisions, plus the five-entry Passport and JSON export.
- Staging is access-controlled. Use Vercel's automation bypass for the recorder only, and never show the token or the URL query on screen.
- Edit with `tests/visual/video-edit.mjs` and a new `edl-238-v3.json`, using its existing 0.4 s crossfades and Chromium PNG captions. The current editor outputs video only (`-an`); mux a silent AAC track for the final file if narration is absent. Leave locked v2, its edit list and its assets unchanged.
- Narration is synced with `place-voice.sh` if it arrives.
- Verify with ffprobe: duration 238.0 s (within one 30 fps frame), 1920×1080 at 30 fps, captions/SRT timing, an audio stream, and 0 decode errors. Then update checksums and the README pairing (video ↔ exact deployment URL).
- Before capture, verify the approved deployment passes the five-mission browser journey, mid-mission reload/reconciliation, export, expiry/restart, mobile and accessibility checks. Use only actual deployment footage after that gate; local and mocked runs remain test evidence.
- Keep the locked v2 video/deployment pairing as the rollback until the finished v3 file and its exact deployment pairing are verified and approved.
