# 30-second project demo (Space Apps 2026)

The Project Submission Guide requires a video of **30 seconds or less** or a deck of **at most 7 slides**. Projects that exceed these limits are not eligible for Global Judging. The full film (`MicroFire-v3-cinematic-1080p.mp4`, 236.5 s) is longer than 30 seconds, so the demo link needs a separate cut. The film itself is unchanged.

## Cut list

Every segment comes from the master film and contains whole sentences, with no speed change. English subtitles are already burned in.

| Demo time | Master time (s) | Guide beat | Picture / line |
|---|---|---|---|
| 0:00–0:05 | 13.80–18.90 | Introduce the team | Team banner with all six names; "We are Team MicroFire…" |
| 0:05–0:09 | 5.00–9.30 | The challenge | Microgravity flame; "In space, fire does not follow the rules we see on Earth" |
| 0:09–0:16 | 23.40–30.00 | Project title and tagline | MicroFire title; "Meet MicroFire, a research observatory connected to an interactive, five-mission learning journey" |
| 0:16–0:22 | 107.40–113.00 | How it works, with NASA data | Live site: PIX refuses "does B20 prove the lunar habitat is safe?" |
| 0:22–0:27 | 30.10–35.70 | The future | "Every conclusion starts with a source and ends with its limitations" |

- **Total length:** 27.2 s.
- **Audio:** 0.12 s fade-in and 0.2 s fade-out at each cut.
- **SI watermark:** "Includes AI-generated 3D models (Meshy)" sits bottom-left for the whole demo, as the guide requires for SI-generated imagery.

## Render

Run from `MicroFire-Film-v3/`. This needs ffmpeg plus Python with Pillow, which draws the watermark PNG because the local ffmpeg has no `drawtext`. Segment trims are concatenated, then `overlay=x=24:y=H-h-24`. Output: H.264 CRF 20 and AAC 160 kbps.

## Before submitting

1. Watch the draft end to end and check every line of the subtitles.
2. Upload it as a separate public video (for example, YouTube, unlisted or public).
3. Put that link in **Link to Project Demo**. The full film can go in the detailed description as an extra.
4. Confirm that no one shown is under 18, per the Terms and Conditions.
