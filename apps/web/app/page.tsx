import Link from 'next/link';
import { catalog, coverage } from '@microfire/science';
import { HomeHero, type Station } from '../components/home-hero';
import { BayTeaser, GravityDuel, PixIntro, TrustStrip } from '../components/home-sections';
import { Ignition } from '../components/ignition/ignition';
import { locatorText, value } from '../components/page-kit';
import { BAY_TOUR } from '../components/routes';

export default function Home() {
  const e = catalog.experiments[0]!;
  const cov = coverage();
  const href = `/experiments/${e.id}`;
  // What PIX says at each station: guidance only, with counts straight from the catalog (no new science).
  const stations: Station[] = [
    { title: 'Experiment Atlas', href: '/atlas', description: 'Browse real flame experiments.', mood: 'guide',
      pix: `These are the flame records in this catalog. Only checked ones count: ${cov.validatedExperiments} admitted, ${cov.quarantinedCandidates} still in quarantine.` },
    { title: `${e.testId} evidence dossier`, href, description: 'Every value with its NASA page.', mood: 'cite',
      pix: `${e.testId} is a real NASA test. Every value in its dossier links to the page it came from.` },
    { title: 'Evidence Workstation', href: '/dashboard', description: 'Trace a question to where confidence ends.', mood: 'guide',
      pix: 'Bring me a question and we will trace it, step by step, to where the evidence ends.' },
    { title: 'Ask PIX', href: '/ask', description: 'Cited answers, or an honest “not known”.', mood: 'cite',
      pix: 'Ask me about fire in space. I answer only from admitted records, with the page, or I say it is not known.' },
    { title: 'Research Frontier', href: '/gaps', description: 'See what this catalog does and does not document.', mood: 'gap',
      pix: 'This is where the records stop. I mark the gaps instead of guessing.' },
    { title: 'Mission map', href: '/missions', description: 'Mission previews and the 3D training bay · none playable yet.', mood: 'guide',
      pix: 'Five missions are on the map. None is playable yet, but the training bay is open for a tour.' }
  ];
  const steps = [
    { title: 'Discover', what: 'See gravity reshape a flame', href: '#gravity-lens' },
    { title: 'Explore the evidence', what: 'The Experiment Atlas', href: '/atlas' },
    { title: 'Check a real test', what: `${e.testId}, from NASA's BASS-II report`, href },
    { title: 'Enter the laboratory', what: 'Tour the BASS-II training bay', href: BAY_TOUR },
    { title: 'Prepare for the mission', what: 'Five missions on the map', href: '/missions', locked: 'Not playable yet' }
  ];
  return <>
    <Ignition />
    <HomeHero testId={e.testId} stations={stations}
      record={{ href, title: e.title, flowDirection: value(e, 'flowDirection'), initialFlow: value(e, 'flowCmS'), locator: locatorText(e) }}
      trail={<nav className="wrap home-trail" aria-label="Your route through MicroFire">
        <h2>Your route through MicroFire</h2>
        <ol>{steps.map((s, i) => <li key={s.title}>
          <Link className="sticker" href={s.href} data-locked={!!s.locked}>
            <span className="sticker-num" aria-hidden="true">{i + 1}</span>
            <b>{s.title}</b><span>{s.what}</span>{s.locked && <em>{s.locked}</em>}
          </Link>
        </li>)}</ol>
      </nav>}>
      <h1 id="home-title">Fire, without the weight of gravity.</h1>
      <p className="lede">See how gravity can change a flame in still air. Then inspect a real NASA experiment with opposed airflow.</p>
    </HomeHero>
    <GravityDuel recordHref={href} />
    <BayTeaser />
    <PixIntro />
    <TrustStrip admitted={cov.validatedExperiments} sources={cov.validatedSources} quarantined={cov.quarantinedCandidates} />
  </>;
}
