import Link from 'next/link';
import { notFound } from 'next/navigation';
import { featureLabels, features, type Feature } from '@microfire/shared';
import { catalog, citationUrl } from '@microfire/science';

const conditionLabels: Record<string, string> = { gravity: 'Gravity', material: 'Material', geometry: 'Sample geometry', flowDirection: 'Flow direction', oxygenPct: 'Calibrated oxygen', pressureKpa: 'Pressure', flowCmS: 'Initial airflow', thicknessMm: 'Film thickness' };

function Status({ feature }: { feature: Feature }) {
  return <><span className="badge">{featureLabels[feature.state]}</span><p className="notice">{feature.reason}</p></>;
}
export function Foundation({ path }: { path: string }) {
  const dossier = path.startsWith('/experiments/');
  const feature = features.find((f) => f.route === (dossier ? '/experiments/[id]' : path));
  if (!feature) notFound();
  const experiment = dossier ? catalog.experiments.find((e) => `/experiments/${e.id}` === path) : undefined;
  if (dossier && !experiment) notFound();
  return <>
    <p className="eyebrow">The Living Science Observatory · Phase Zero</p>
    <h1>{experiment?.title ?? feature.title}</h1><Status feature={feature} />
    {path === '/' && <><p>Start with the evidence. Trace one combustion observation from a NASA report to its recorded conditions, corrections and limits.</p><Link className="action" href="/atlas">Inspect the scientific fixture →</Link><p>This is the architecture handoff. The research engine and five interactive missions are still to come.</p></>}
    {path === '/atlas' && <><p>{catalog.experiments.length} audited fixture. Dataset {catalog.datasetVersion}. Bundled locally; no provider key required.</p>{catalog.experiments.map((e) => <article key={e.id}><h2><Link href={`/experiments/${e.id}`}>{e.title}</Link></h2><p>{e.claims[0]?.text}</p><p>{e.limitations[0]}</p></article>)}</>}
    {experiment && <>
      <h2>Documented observation</h2>{experiment.claims.map((claim) => <p key={claim.id}>{claim.text} <span className="badge">{claim.kind}</span></p>)}
      {experiment.claims.flatMap((claim) => claim.citations).map((citation, index) => {
        const source = catalog.sources.find((item) => item.id === citation.sourceId)!;
        const locator = citation.locator;
        return <p key={`${citation.sourceId}-${index}`}><a href={citationUrl(citation.sourceId, locator.kind === 'pdf' ? locator.page : undefined)}>
          {source.title} · {locator.section}{locator.kind === 'pdf' && ` · PDF page ${locator.page} (printed ${locator.printedPage})`} ↗
        </a></p>;
      })}
      <h2>Conditions and missing values</h2><dl>{Object.entries(experiment.conditions).map(([name, field]) => <div key={name} style={{ display: 'contents' }}><dt>{conditionLabels[name]}</dt><dd>{field.status === 'known' ? <>{field.value} {'unit' in field ? field.unit : ''}<small>{field.basis} · {field.note}</small></> : <>Unknown<small>{field.reason}</small></>}</dd></div>)}</dl>
      <p>Original airflow notation: <strong>{experiment.rawFlow}</strong>. A fan potentiometer setting is not a measured velocity.</p>
      <h2>Source correction</h2><ul>{experiment.provenance.corrections.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2>Limits of this evidence</h2><ul>{experiment.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
    </>}
    {path === '/sources' && catalog.sources.map((source) => <article key={source.id}><h2>{source.title}</h2><p><a href={source.url}>NASA NTRS {source.documentId} ↗</a></p><p>{source.verification.notes}</p><p>{source.rights.statement} {source.rights.notes}</p><small>Accessed {source.accessedAt.slice(0, 10)} · SHA-256 {source.sha256}</small></article>)}
    {path === '/methodology' && <><h2>Source → record → claim → limitation</h2><p>The bundled B20 fixture was checked against the original NASA PDF, including a visual inspection of its table columns. Field-level locators distinguish measurements, unit conversion and unknown values. Local integrity checks detect fixture changes.</p><p>One record cannot support controlled comparison or demonstrate retrieval quality. Rankings, AI answers, performance targets and scientific evaluation results are not yet implemented or measured.</p><p>The app reads its bundled fixture without external requests. Offline here means an already-running local server with the internet disconnected; this is not an installable offline PWA.</p></>}
    {(path === '/roadmap' || path === '/missions') && features.filter((f) => path === '/roadmap' || f.route.startsWith('/missions/')).map((f) => <article key={f.id}><h2>{f.route.includes('[') ? f.title : <Link href={f.route}>{f.title}</Link>}</h2><Status feature={f} /></article>)}
    {['coming_soon', 'locked', 'blocked'].includes(feature.state) && <><button disabled>{feature.state === 'blocked' ? 'Blocked' : feature.state === 'locked' ? 'Locked' : 'Coming Soon'}</button><p><Link href="/atlas">Explore the verified fixture</Link></p></>}
  </>;
}
