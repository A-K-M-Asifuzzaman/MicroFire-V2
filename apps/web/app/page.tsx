import Link from 'next/link';
import { catalog, coverage } from '@microfire/science';
import { ObservatoryHero, type Station } from '../components/observatory-hero';
import { GravityDuel, PixIntro, TrustStrip } from '../components/home-sections';
import { locatorText, value } from '../components/page-kit';

const stations: Station[] = [
  { title: 'Experiment Atlas', short: 'Atlas', href: '/atlas', description: 'Browse real flame experiments.' },
  { title: 'B20 evidence dossier', short: 'B20 Dossier', href: '/experiments/bass2-b20', description: 'Every value with its NASA page.' },
  { title: 'Evidence Workstation', short: 'Workstation', href: '/dashboard', description: 'Trace a question to where confidence ends.' },
  { title: 'Ask PIX', short: 'PIX', href: '/ask', description: 'Cited answers, or an honest “not known”.' },
  { title: 'Research Frontier', short: 'Frontier', href: '/gaps', description: 'See what nobody has measured yet.' },
  { title: 'Mission map', short: 'Missions', href: '/missions', description: 'Five missions in development.' }
];

export default function Home() {
  const e = catalog.experiments[0]!;
  const cov = coverage();
  const href = `/experiments/${e.id}`;
  return <>
    <ObservatoryHero stations={stations}
      record={{ href, title: e.title, flowDirection: value(e, 'flowDirection'), initialFlow: value(e, 'flowCmS'), locator: locatorText(e) }}>
      <div className="obs-head reveal">
        <p className="eyebrow">The Living Science Observatory</p>
        <h1 id="home-title">Fire, without the weight of <em>gravity.</em></h1>
        <p className="lede">Flames reach upward on Earth. In orbit they curl into quiet blue spheres.<span className="lede-more"> Bend gravity yourself, then trace a real NASA flame record back to its source page.</span></p>
      </div>
      <div className="obs-body reveal">
        <div className="actions">
          <Link className="btn btn-primary btn-glow" href={href}>Open the {e.testId} record <span aria-hidden="true">→</span></Link>
          <Link className="btn btn-quiet" href="/atlas">Explore the Experiment Atlas</Link>
        </div>
      </div>
    </ObservatoryHero>
    <GravityDuel recordHref={href} />
    <PixIntro />
    <TrustStrip admitted={cov.validatedExperiments} sources={cov.validatedSources} quarantined={cov.quarantinedCandidates} />
  </>;
}
