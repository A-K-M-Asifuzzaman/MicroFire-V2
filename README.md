# MicroFire: Flame in Freefall Evidence Observatory

**NASA Space Apps Challenge 2026, Flame in Freefall, by Team MicroFire.**

MicroFire is a research observatory and a five-mission learning game built on NASA microgravity combustion evidence. It helps students and curious learners separate what an experiment actually shows from what people assume. Every conclusion starts with a NASA source and ends with its limitations.

| | |
|---|---|
| **Live site** | https://microfire-v2-preview.vercel.app |
| **Play the five missions** | https://microfire-v2-preview.vercel.app/missions/play |
| **Video (3:57)** | https://youtu.be/-neeWB1QJyc |
| **Code** | this repository (`main`) |

## The science we stand on

**BASS-II test B20** is our verified record. A copied entry listed its oxygen as 16.5%, but NASA's own table records **17.4 vol% calibrated** oxygen ([BASS-II Summary Report, NASA TM-20210011385](https://ntrs.nasa.gov/citations/20210011385), Table A.1, PDF page 112). MicroFire keeps that distinction.

- **1** NASA experiment record is admitted after checking it against the primary source.
- **55** legacy records stay quarantined and are never shown as evidence until each one is checked.
- Unknown values (for example gravity level and pressure for B20) are shown as unknown. They are never filled in.
- Nothing in MicroFire certifies fire safety, and it is not NASA-endorsed. 3D scenes are labelled as illustrations.

## What you can do

| Feature | Route | What it does |
|---|---|---|
| Gravity Lens | `/` | Compares an illustrated flame at 1 g and in microgravity |
| Evidence Atlas | `/atlas` | Separates admitted observations from quarantined records |
| B20 dossier | `/experiments/bass2-b20` | Every value with its NASA page, including the 17.4% correction |
| Investigation Library | `/investigations` | NASA investigation descriptions, kept separate from observations |
| Ask PIX | `/ask` | A fixed-template guide (no AI model) that answers only from cited statements and refuses unsupported questions |
| Evidence Workstation and At a Glance | `/dashboard` | What matches, what differs and what NASA never reported |
| Citation Checker | `/investigations/bass-ii` | Confirms the right NASA page and flags a wrong one |
| **Five missions** | `/missions/play` | Station Arrival, BASS-II Training Bay, Flame Detective, Claim Trial, Lunar Habitat (fictional) |
| Research Passport | inside the campaign | Five source-linked entries, exported as JSON |

### The missions are checked on the server

Every learner action goes to the MicroFire server, which checks it and saves the case in PostgreSQL. The browser never holds the answers. For example, in the fictional Lunar Habitat the server refuses "the habitat is fire safe": *"The admitted orbital record cannot certify this fictional habitat as safe or unsafe."*

Cases are anonymous and last 24 hours. The campaign uses HttpOnly, Secure, SameSite=Strict session cookies; per-request origin and CSRF checks; per-visitor and global request quotas; and a restricted database role.

## NASA data used

1. [NASA PSI investigation PSI-25, BASS-II](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25): investigation metadata and citation target.
2. [BASS-II Summary Report, TM-20210011385](https://ntrs.nasa.gov/citations/20210011385): the admitted B20 record (Table A.1, PDF page 112).
3. [NTRS 20210011521](https://ntrs.nasa.gov/citations/20210011521), [NTRS 20205008449](https://ntrs.nasa.gov/citations/20205008449) and [NTRS 20220015583](https://ntrs.nasa.gov/citations/20220015583): investigation descriptions only, not admitted as observations.
4. [NASA PSI-69, FLEX](https://psi.nasa.gov/physci/repo/data/investigations/PSI-69) (v5, DOI 10.60555/mbq8-0451): three methanol-droplet rows (20CAL10, 20CAL12, 30CAL03) were checked value by value against NASA's table. They are **candidates awaiting independent scientific review**, not admitted evidence ([`data/candidates`](data/candidates), [PR #17](https://github.com/A-K-M-Asifuzzaman/MicroFire-V2/pull/17)).

## How it is built

| Path | Contents |
|---|---|
| `apps/web` | Next.js 16 app (React 19, TypeScript, three.js scenes); server-only API routes |
| `packages/shared` | Zod schemas shared by client and server: science records, API, missions, Passport |
| `packages/science` | The admitted catalog, citation lineage, ranking and abstention rules behind PIX |
| `packages/game-core` | Deterministic mission rules and grading, run on the server |
| `data` | The admitted B20 record, the 55-record quarantine ledger, integrity hashes, candidates and the database migration |
| `tests` | Unit, science-evaluation, backend (real PostgreSQL and HTTPS), browser and hosted acceptance tests |
| `docs` | Design, science, security and review documentation; [`docs/internal`](docs/internal) holds our planning prompts |

## Run it locally

Use Node 24 (see `.nvmrc`):

```sh
npm ci
npm run dev        # research site at http://127.0.0.1:3000
npm run check      # lint, types, 266 unit tests, data integrity, science evals, security checks, production build
```

The research site needs no secrets. The playable campaign also needs PostgreSQL and the `MICROFIRE_PUBLIC_CAMPAIGN_*` settings listed in [`.env.example`](.env.example) and [`docs/integration`](docs/integration). Without them, `/missions/play` stays switched off.

## Testing evidence

- `npm run check`: lint, strict types, 266/266 unit tests, and science evals (Ask 30/30, ranking 7/7, faithfulness 13/13, 0 forbidden claims).
- Backend tests against real PostgreSQL over HTTPS cover CSRF and origin refusal, visitor isolation, retries, quota-starvation attacks and database restarts.
- Hosted acceptance on the deployed site (`tests/visual/hosted-two-visitors.mjs`): two visitors at once (desktop and iPhone-sized touch), no login. Each completed all five missions (42 server-accepted steps), got 5 Passport entries in the export and the downloaded JSON, and recovered after reload, with isolated sessions and no page errors.

## Team

Asif Zaman (Team Leader · AI/ML Engineer and Web Developer), Nusrat Jahan Isma (Voice Artist and Researcher), Adrita Biswas (Voice Artist and Researcher), Robiul Hasan Jisan (AI/ML Engineer and Web Developer), Muhammad Abdullah Al Jamee (Web Developer), Joydeep Bhattacharjee (Graphics Designer).

## Use of AI and third-party material

- **Code:** Anthropic Claude (Claude Code) built the frontend, 3D scenes, tests and film tooling. OpenAI Codex built the backend campaign API and did security review.
- **3D models:** Meshy AI generated decorative, illustrative models.
- **Captions:** whisper.cpp, run locally, timed the video captions.
- **No AI:** the narration was recorded by team members. PIX uses fixed templates, not an AI model.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [SECURITY.md](SECURITY.md).

*Independent educational research project. NASA source data cited. Not NASA-endorsed. Not fire-safety certified.*
