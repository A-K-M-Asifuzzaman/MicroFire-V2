# Handoff to Sol: M1.5 correction pass

From Claude (frontend) on `feat/p1-ui`. Every item below needs Sol's review or joint review.

This pass changed no shared package, contract, registry state, science data or API. The registry file `packages/shared/src/features.ts` is **untouched**. Pending edits in `../MicroFire-V2-codex` were not touched.

## 1. Feature registry: proposed wording (S3)

No feature should become **Available**. Each row keeps or proposes a state; Sol and joint review decide.

"Backend" means the API exists and is tested. "Frontend" means a UI is implemented on that route. "E2E" means browser-tested over real or oracle-backed HTTP on this branch (`tests/e2e/*`).

| id | Backend | Frontend | E2E | Current state | Proposed state | Proposed `reason` (exact) |
|---|---|---|---|---|---|---|
| `home` | — | yes | yes | preview | preview | `Observatory home with the Gravity Lens still-air teaching illustration and an optional 3D scene; interface implemented for review, release acceptance pending.` |
| `atlas` | yes | yes | yes | preview | preview | `One audited BASS-II record; search and filter interface implemented for review; broader coverage pending.` |
| `experiment` | yes | yes | yes | preview | preview | `One cited record with field-level provenance, source-linked apparatus and evidence export; interface implemented for review.` |
| `dashboard` | yes | yes | yes | coming_soon | preview (after review) | `Evidence ranking over one validated record; interface implemented for review, release acceptance pending.` |
| `gaps` | yes | yes | yes | coming_soon | preview (after review) | `Coverage comparison over one validated record; interface implemented for review, release acceptance pending.` |
| `ask` | yes | yes | yes | coming_soon | preview (after review) | `Deterministic, catalog-grounded answers with citation-lineage checks and abstention (no AI model); interface implemented for review, release acceptance pending.` |
| `passport` | yes | yes (restore/recovery) | yes | coming_soon | coming_soon | `Contracts, local persistence and safe restore exist; earned entries and export UI are pending.` (unchanged) |
| `lab` | — | handoff only | yes | coming_soon | coming_soon | `The Gravity Lens illustration is available on Discover; the Lab workspace is pending.` |
| `missions` | yes (definitions, reducer) | map preview | yes | preview | preview | `Mission descriptions only; none is playable yet.` (unchanged) |

**Moving `coming_soon` to `preview`.** The registry rule allows `preview` when `implemented` is true. Promoting Workstation, Frontier and Ask needs joint review, and it must not change availability gating.

**Interim presentation, already shipped and reversible.** On routes with a built interface (`StatusLine built`), the page says "Interface implemented for review; release acceptance pending." The registry's current reason is shown under a "Registry note" disclosure, marked "registry wording update proposed for review". The state badge always comes from the registry.

Once Sol updates the reasons, this disclosure can be removed (`apps/web/components/evidence-ui.tsx`). Navigation tags ("Soon" on Flame Lab, "Preview" on Missions) are computed in `app/layout.tsx` from the registry states.

**Tests to update with the registry change.**
- `tests/e2e/m15-corrections.spec.ts` "S3" asserts the current badges per route; update it together with any state change.
- `tests/unit` registry invariants are unchanged.

## 2. Scientific copy for semantic review (S1, S2)

These are presentation strings only; no backend text was changed.

| Where | Before | Now |
|---|---|---|
| `app/page.tsx` hero lede | "Flames reach upward on Earth. In orbit they curl into quiet blue spheres." | "See how gravity can change a flame in still air. Then inspect a real NASA experiment with opposed airflow." |
| `app/page.tsx` Frontier station | "See what nobody has measured yet." | "See what this catalog does and does not document." |
| `app/page.tsx` Missions station | "Five missions in development." | "Five mission previews · none playable yet." |
| `home-sections.tsx` duel eyebrow / title | "Same fuel · different universe" / "On Earth, fire climbs. In orbit, it floats." | "Two teaching views · still-air illustration" / "On Earth, hot gas rises. In still microgravity air, it can't." |
| `home-sections.tsx` duel lede | "Gravity decides the shape of every flame … just a slow blue sphere …" | "Without buoyancy-driven flow, a flame in still air can become rounder and bluer. These drawings leave out forced airflow, and real microgravity flames vary with fuel, flow and soot. The B20 test you can inspect used opposed airflow." |
| duel captions and `aria-label`s | "Nothing rises … the flame turns round, dim and blue." | "With almost no buoyancy, oxygen arrives mainly by slow diffusion, so the flame can become rounder, dimmer and bluer." (and the 1 g equivalent, "can stretch") |
| PIX coach (`observatory-hero.tsx`) | "Back in orbit. Nothing rises, so the flame curls into a quiet blue ball." | "Still-air microgravity. With almost no buoyancy, this illustrated flame can turn rounder and bluer." |
| Gravity Lens | toggle "Microgravity", title "Microgravity illustration" | "Microgravity, still air", "Still-air microgravity illustration"; explanations shortened, keeping "Without a fan" |
| Frontier key (`exhibits.tsx`) | "The admitted record never measured it." | "No value is documented for this field in the admitted record." |
| Frontier "Documented" cell | — | "No value documented" for `not-recorded`; the API status label "Not recorded" is shown unchanged |
| Workstation / evidence chain | "never recorded" | "does not record" / "not recorded" |

**Kept, because they are correct caveats:**
- "Absence here is not absence everywhere."
- "Not found in our validated catalog is not the same as never studied globally."
- "Absence from this catalog is not evidence that a condition was never studied."

**Regression test.** `tests/e2e/m15-corrections.spec.ts` "S1/S2" scans the visible, hidden and `aria-label` text of nine routes for universal or absence overclaims.

## 3. Backend-owned text

- **No change required for S1/S2.** The science package text "Derivations and interpretations are not measured observations" is an accurate classification, and the eval id `rank-unmeasured-temperature` is internal.
- **Frontier note formatting (presentation dependency).**
  - The comparison row hides the note's redundant `"<field>: not recorded"` prefix, because the row already shows the field and status. It shows the field key as a small code tag.
  - If the note format changes, the full note is shown unchanged.
  - Optional future contract improvement: return `requested` and `documented` display values per field from `/api/gaps`, so the frontend stops pairing the request snapshot with catalog display values itself.

## 4. Ownership and assets

- **Asset-rights ledger.** `data/asset-rights.json` (Sol-owned `data/`) still needs a schema and owner adoption. There were no new assets in this pass, and Meshy spend is unchanged at 90 credits (balance 3,010).
- **`OWNERSHIP.md` lines needed** for `tools/meshy/` and `apps/web/public/models/`.

## 5. Test changes (joint review)

**Existing tests updated, intent preserved:**
- `observatory-http.spec.ts`: the request echo now uses human labels ("Oxygen 17.4 vol%"). Frontier rows are found by their "Pressure" label with an exact "Not recorded" status.
- `observatory.spec.ts`: the Frontier row is matched by `/Pressure/`.
- `observatory-m15.spec.ts`: the themed cursor test now asserts it is home-only, and that research pages keep the native cursor, typing and keyboard navigation.

**New:** `tests/e2e/m15-corrections.spec.ts`, with 9 tests per project (one is desktop-only and drives explicit viewports).

## 6. Astra's independent M1 checks: one precondition now conflicts with the M1.5 audit

Astra's M1 acceptance specs were run unchanged against this branch. Original passed 8/8, gate 4/4, and extra 7/8.

The one failure is `initially offscreen mobile lens does not continuously render`. It asserts that the lens starts below y=600 on a 390×600 viewport. The M1.5 audit requires the opposite: the gravity toggle at or above y=700 on 390×844, so the chamber now renders near the top.

The protected behaviour (zero WebGL draws while offscreen) is still enforced by `observatory-m15.spec.ts` "fix A", which places the lens offscreen with an explicit spacer and asserts zero draws. **Proposed for Astra:** give that check the same explicit spacer precondition.
