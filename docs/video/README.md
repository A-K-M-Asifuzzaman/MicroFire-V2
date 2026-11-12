# Submission videos

Two finished cuts are built from real recordings of the site. There is no music and no voice. Captions carry the story, and every unfinished feature is labelled on screen.

| Cut | EDL (editable project) | Target | Structure |
|---|---|---|---|
| Local, Nov 13 | `edl-240.json` | under 240 s | WHO 45 s · WHY 60 s · WHAT 60 s · SO WHAT NEXT 75 s |
| Global, Nov 14 | `edl-30.json` | under 30 s | problem → solution → strongest real demo → link |

## Rebuild

```sh
# 1. Record the judge route from a deployed or local build (writes one clip per segment).
node tests/visual/demo-record.mjs <clips-dir> https://microfire-v2-preview.vercel.app
# 2. Cut a video from the clips and an EDL.
node tests/visual/video-edit.mjs docs/video/edl-240.json <clips-dir> <out>/microfire-240.mp4
node tests/visual/video-edit.mjs docs/video/edl-30.json  <clips-dir> <out>/microfire-30.mp4
```

Each EDL shot is either a card (`{ card: { kicker, title, body, foot }, dur }`) or a clip (`{ clip, from, dur, chapter, caption, tag }`). To edit, change the caption text or the `from`/`dur` windows and rerun step 2. Cards and captions are rendered as Design B PNGs in Chromium and composited with ffmpeg.

## Narration

The owner's voice-over script is the narration baseline. It was not in the repository when these cuts were made, so the on-screen captions follow the same four judging blocks. A voice-over can be laid on top without re-editing. Keep any spoken claim within what the captions already say:

- **One admitted NASA experiment (BASS-II test B20).** Its calibrated oxygen is 17.4%, from NASA Table A.1, PDF page 112. 55 legacy rows are quarantined.
- **PIX is deterministic.** It answers from cited evidence or abstains, and no AI model is used.
- **Missions are not playable yet.** The BASS-II training bay is a 3D tour, and its gameplay waits on server integration. The mission dioramas and opening film are illustrations.
- **Do not claim** fire-safety certification, NASA endorsement, or results from more than one record.

Team identity (the WHO block) uses only "Team MicroFire". Add names on the title card in `edl-240.json` if the team wants them shown.
