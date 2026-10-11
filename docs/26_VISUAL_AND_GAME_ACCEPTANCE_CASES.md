# 26 — VISUAL AND GAME ACCEPTANCE CASES

Use this as a visual QA specification, not a static image-copying task. Run actual Playwright flows and manually inspect representative screenshots. Record steps and results under `docs/qa/`.

## Visual cases
1. **Homepage, 1440×900** — one focused flame-centered hero; primary CTA visible; no rows of generic statistic tiles; all science claims evidenced and no invented metrics.
2. **Homepage, 390×844** — no sideways scrolling; static/2D fallback appropriate; header, hero, explanation and link visible; readable with JS animation disabled.
3. **Evidence dashboard** — user asks “what does airflow change?”; returns a clearly labeled, grounded set or honest limited-evidence message; ranking explanation works with keyboard.
4. **Experiment dossier** — every observed value has units, source locator and known/unknown status; the page never labels hypothetical simulation as measurement.
5. **Compare** — when experiments vary oxygen and flow simultaneously, UI warns not to attribute the difference to one factor.
6. **Research gaps** — states “not present in this audited corpus”, not “never studied anywhere”.
7. **Mission map** — spatial map conveys five locations and real release status; an unfinished scene has a truthful Coming Soon state, not a broken Play button.
8. **Passport** — a single traceable observation can be inspected in 2 clicks and printed/exported without fake NASA certification.
9. **Loss of WebGL** — source browsing continues, 2D scene guide available, no loading spinner forever.
10. **Slow internet / AI unavailable** — show cached NASA evidence and limitations rather than broken empty cards or fake AI answers.

## Gameplay cases
1. New player begins station mission, gets context-sensitive PIX assistance, learns move/inspect controls, can pause/caption audio and save progress.
2. In assembly, placing a dependent BASS-II component before prerequisite creates a visible, correctable fault, not an arbitrary fail screen.
3. Fix is validated by pure shared game rules; view layer cannot pass by merely animating.
4. Recorded scientific outcome shown only when matching validated source/test conditions; scenario variation outside evidence is flagged hypothetical.
5. Player makes an unsupported causal claim; the Evidence Trial explains which uncontrolled factors or missing source evidence invalidate it.
6. Player restarts/reloads; previous passport entries persist exactly once, with no duplicates or lost citations.
7. Final fictional Moon scene asks for a provisional choice, displays evidence strength and uncertainty, does not imply real spacecraft safety certification.
8. Test a missing GLB: interactions remain completable via geometry placeholder / accessible schematic.
9. Test keyboard-only, touch-only and reduced motion play modes.
10. Test every feature-status route: Coming Soon does not claim working content; Locked applies only to an actually implemented gated mission.

## Acceptance evidence expected
Actual URL / commit, source-record IDs used, tested browser/device sizes, screenshot or recorded interaction, steps, assertion outcome, any failed checks and fixes. A passing CI test suite alone cannot substitute for real browser inspection.
