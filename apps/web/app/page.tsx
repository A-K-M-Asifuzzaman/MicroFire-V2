import Link from 'next/link';
import { catalog, coverage } from '@microfire/science';
import { EnterBayLink, ObservatoryHero, type Station } from '../components/observatory-hero';
import { BayTeaser, GravityDuel, PixIntro, TrustStrip } from '../components/home-sections';
import { Ignition } from '../components/ignition/ignition';
import { locatorText, value } from '../components/page-kit';

export default function Home() {
  const e = catalog.experiments[0]!;
  const cov = coverage();
  const href = `/experiments/${e.id}`;
  // What PIX says at each station: guidance only, with counts straight from the catalog (no new science).
  const stations: Station[] = [
    { title: 'Experiment Atlas', short: 'Atlas', href: '/atlas', description: 'Browse real flame experiments.', mood: 'guide',
      pix: `These are the flame records in this catalog. Only checked ones count: ${cov.validatedExperiments} admitted, ${cov.quarantinedCandidates} still in quarantine.` },
    { title: 'B20 evidence dossier', short: 'B20 Dossier', href: '/experiments/bass2-b20', description: 'Every value with its NASA page.', mood: 'cite',
      pix: `${e.testId} is a real NASA test. Every value in its dossier links to the page it came from.` },
    { title: 'Evidence Workstation', short: 'Workstation', href: '/dashboard', description: 'Trace a question to where confidence ends.', mood: 'guide',
      pix: 'Bring me a question and we will trace it, step by step, to where the evidence ends.' },
    { title: 'Ask PIX', short: 'PIX', href: '/ask', description: 'Cited answers, or an honest “not known”.', mood: 'cite',
      pix: 'Ask me about fire in space. I answer only from admitted records, with the page, or I say it is not known.' },
    { title: 'Research Frontier', short: 'Frontier', href: '/gaps', description: 'See what this catalog does and does not document.', mood: 'gap',
      pix: 'This is where the records stop. I mark the gaps instead of guessing.' },
    { title: 'Mission map', short: 'Missions', href: '/missions', description: 'Mission previews and the 3D training bay · none playable yet.', mood: 'guide',
      pix: 'Five missions are on the map. None is playable yet, but the training bay is open for a tour.' }
  ];
  return <>
    <Ignition />
    <ObservatoryHero stations={stations}
      record={{ href, title: e.title, flowDirection: value(e, 'flowDirection'), initialFlow: value(e, 'flowCmS'), locator: locatorText(e) }}>
      <div className="obs-head reveal">
        <p className="eyebrow">The Living Science Observatory</p>
        <h1 id="home-title">Fire, without the weight of <em>gravity.</em></h1>
        <p className="lede">See how gravity can change a flame in still air. Then inspect a real NASA experiment with opposed airflow.</p>
      </div>
      <div className="obs-body reveal">
        <div className="actions">
          <Link className="btn btn-primary" href={href}>Open the {e.testId} record <span aria-hidden="true">→</span></Link>
          <Link className="text-link" href="/atlas">Explore the Experiment Atlas</Link>
        </div>
        <div className="actions obs-enter">
          <EnterBayLink />
        </div>
      </div>
    </ObservatoryHero>
    <BayTeaser />
    <GravityDuel recordHref={href} />
    <PixIntro />
    <TrustStrip admitted={cov.validatedExperiments} sources={cov.validatedSources} quarantined={cov.quarantinedCandidates} />
  </>;
}
