# 240-second video v3: the complete verified experience (plan)

**Target length:** 236.5–240 s, 1080p30, with captions and an SRT.

**Status: plan only. The owner asked to wait on making the video (2026-11-13); no footage is recorded or edited until the owner says to start.**

**Footage rule:** every gameplay shot must be recorded from a real, functioning deployment, either the approved staging deployment or the approved public release. The release URL must be the one given to judges. Mocked responses, fixture galleries and local test builds may not appear as "the product".

**Fallback:** if staging isn't approved in time, the submitted video stays as locked v2 (`MicroFire-local-236s-1080p-v2.mp4`, paired with `microfire-v2-cbfazx7ir`). Missions then appear only as clearly labelled "in review" scenes, never as playable.

## On-screen labels (always visible on a shot that needs one)

| Label | Used for |
|---|---|
| **NASA observation** | Values and sentences quoted from the BASS-II report, with a PDF page |
| **Educational scenario** | The authored training fault, the station alarm and the fictional lunar habitat |
| **Illustrative scene** | 3D rooms and props; they are not apparatus geometry |
| **Limitation** | One run; pressure unknown; gravity not extracted; no lunar safety inference; educational progress, not certification |

## Timeline

| Time (s) | Block | Shot source | Recordable now? |
|---|---|---|---|
| 0–18 | The scientific problem: flames in microgravity and why fire-safety data is scarce | Live research site | Yes, from `cbfazx7ir` or its successor |
| 18–40 | NASA PSI data integration: sources, Atlas, the 55 quarantined records excluded | Live research site | Yes |
| 40–56 | Verified B20 oxygen calibration: 17.4 vol% calibrated vs 16.5 uncalibrated, Table A.1, PDF page 112 | Live research site | Yes |
| 56–76 | PIX and evidence traceability: an answer → its citation → the source page | Live research site | Yes |
| 76–96 | Evidence comparison (At a Glance, Transferability) and the Citation Checker flagging a wrong page | Live research site | Yes |
| 96–114 | Mission 01, Station Arrival: source review (research vs fiction), Passport entry | **Staging/release `/missions/play`** | After approval |
| 114–136 | Mission 02, BASS-II Training Bay: fit parts, authored fault, Training check, diagnosis, repair, qualify, open B20 | Staging/release | After approval |
| 136–152 | Mission 03, Flame Detective: select B20 at 17.4, lock a prediction, reveal, explain with limits | Staging/release | After approval |
| 152–168 | Mission 04, Claim Trial: appraise four statements, server reasons on a wrong one | Staging/release | After approval |
| 168–184 | Mission 05, Lunar Habitat (fictional): an "insufficient evidence" verdict; a "safe" verdict is refused | Staging/release | After approval |
| 184–204 | Passport progression: five entries, a reload resumes the case, JSON export | Staging/release | After approval |
| 204–222 | Scientific limitations, stated plainly | Site plus captions | Yes |
| 222–240 | Real-world relevance and future expansion: more PSI datasets added only after evidence acceptance checks | Site plus captions | Yes |

## Recording method

- Use `tests/visual/demo-record.mjs` (CDP screencast) against the deployment URL.
  - Add new segments for `/missions/play`, driven by the same selectors as `tests/backend/public-campaign-browser.test.ts`.
  - Each segment starts a fresh visitor case.
- Staging is access-controlled. Use Vercel's automation bypass for the recorder only, and never show the token or the URL query on screen.
- Edit with `tests/visual/video-edit.mjs` and a new `edl-240-v3.json`, using 0.4 s crossfades, Chromium PNG captions and a silent AAC track.
- Narration is synced with `place-voice.sh` if it arrives.
- Verify with ffprobe: duration 236.5–240 s, 0 decode errors. Then update checksums and the README pairing (video ↔ exact deployment URL).
- When the owner gives the go-ahead, the research blocks (0–96 s and 204–240 s) can be recorded from the live site. The mission and Passport blocks also need the approved deployment.
