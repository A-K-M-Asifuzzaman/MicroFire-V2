import Link from 'next/link';
import { catalog, coverage } from '@microfire/science';
import { ObservatoryHero, type Station } from '../components/observatory-hero';
import { locatorText, value } from '../components/page-kit';

const stations: Station[] = [
  { title: 'Experiment Atlas', short: 'Atlas', href: '/atlas', description: 'Search the admitted experiments.' },
  { title: 'B20 evidence dossier', short: 'B20 Dossier', href: '/experiments/bass2-b20', description: 'Every value with its NASA page.' },
  { title: 'Evidence Workstation', short: 'Workstation', href: '/dashboard', description: 'Trace a question to where confidence ends.' },
  { title: 'Ask PIX', short: 'PIX', href: '/ask', description: 'Cited answers, or an honest refusal.' },
  { title: 'Research Frontier', short: 'Frontier', href: '/gaps', description: 'Map what has not been measured.' },
  { title: 'Mission map', short: 'Missions', href: '/missions', description: 'Five missions in development.' }
];

export default function Home() {
  const e = catalog.experiments[0]!;
  const cov = coverage();
  return <ObservatoryHero stations={stations}
    record={{ href: `/experiments/${e.id}`, title: e.title, flowDirection: value(e, 'flowDirection'), initialFlow: value(e, 'flowCmS'), locator: locatorText(e) }}>
    <div className="obs-head reveal">
      <p className="eyebrow">The Living Science Observatory / 01</p>
      <h1 id="home-title">Fire, without the weight of <em>gravity.</em></h1>
    </div>
    <div className="obs-body reveal">
      <p className="lede">Step into an observatory built around real NASA combustion evidence. Change gravity in the chamber, then follow a flame-spread record to its source page, its recorded conditions and the limits of what it shows.</p>
      <div className="actions">
        <Link className="btn btn-primary" href={`/experiments/${e.id}`}>Open the {e.testId} record <span aria-hidden="true">→</span></Link>
        <Link className="btn btn-quiet" href="/atlas">Explore the Experiment Atlas</Link>
      </div>
      <p className="meta" style={{ marginTop: 16 }}><strong style={{ color: 'var(--frost)' }}>{cov.validatedExperiments}</strong> admitted experiment · <strong style={{ color: 'var(--frost)' }}>{cov.validatedSources}</strong> NASA source · <strong style={{ color: 'var(--frost)' }}>{cov.quarantinedCandidates}</strong> legacy candidates held in quarantine</p>
      <p className="obs-label">Artistic interpretation · flame and chamber are illustrations, not footage or a simulation</p>
    </div>
  </ObservatoryHero>;
}
