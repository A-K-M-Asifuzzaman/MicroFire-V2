import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExperimentQuerySchema, featureLabels, features, missionDefinitions, type Experiment, type Feature } from '@microfire/shared';
import { catalog, coverage, quarantineLedger, searchExperiments, sourceDetail, verifyCitations } from '@microfire/science';
import { CitationList, CoverageNote, Kind, Limitations, StatusLine, type SourceRef } from './evidence-ui';
import { AskPix } from './ask-pix';
import { GravityLens } from './gravity-lens';
import { PassportPreview } from './passport-preview';
// ponytail: one catch-all route bundles every client island (~62 KB app + ~95 KB zod); split into per-route files when bundles grow.
import { Atlas, CompareProbe, ExportButton, FilmGlyph, Frontier, Workstation, type AtlasQuery } from './research-tools';

const feature = (route: string) => features.find((f) => f.route === route);
const sources: SourceRef[] = catalog.sources.map(({ id, title, url, documentUrl }) => ({ id, title, url, documentUrl }));
const conditionLabels: Record<string, string> = {
  gravity: 'Gravity', material: 'Material', geometry: 'Sample geometry', flowDirection: 'Flow direction',
  oxygenPct: 'Calibrated oxygen', pressureKpa: 'Pressure', flowCmS: 'Initial airflow', thicknessMm: 'Film thickness'
};
const value = (e: Experiment, key: keyof Experiment['conditions']) => {
  const c = e.conditions[key];
  return c.status === 'known' ? `${c.value}${'unit' in c ? ` ${c.unit}` : ''}` : null;
};
const locatorText = (e: Experiment) => {
  const c = e.claims[0]?.citations[0]?.locator;
  return c?.kind === 'pdf' ? `${c.section.split(',')[0]}, PDF page ${c.page}` : c?.section ?? 'source record';
};
function Head({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede?: string; children?: React.ReactNode }) {
  return <header className="page-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{lede && <p className="lede">{lede}</p>}{children}</header>;
}

// ---------- Discover ----------
function Home() {
  const e = catalog.experiments[0]!;
  const cov = coverage();
  return <div className="wrap">
    <section className="hero" aria-labelledby="home-title">
      <div>
        <p className="eyebrow">A new way to investigate fire / 01</p>
        <h1 id="home-title">Fire, without the weight of gravity.</h1>
        <p className="lede">A living observatory for NASA combustion evidence. Trace a real flame-spread record to its source page, its recorded conditions and the limits of what it shows.</p>
        <div className="actions">
          <Link className="btn btn-primary" href={`/experiments/${e.id}`}>Open the {e.testId} record <span aria-hidden="true">→</span></Link>
          <Link className="btn btn-quiet" href="/atlas">Explore the Experiment Atlas</Link>
        </div>
        <div className="pillars"><p className="eyebrow" style={{ marginBottom: 6 }}>Science first</p><p>Real records · Openable source pages · Stated limits</p></div>
      </div>
      <GravityLens record={{ href: `/experiments/${e.id}`, title: e.title, flowDirection: value(e, 'flowDirection'), initialFlow: value(e, 'flowCmS'), locator: locatorText(e) }} />
    </section>
    <nav className="chain" aria-label="Evidence path">
      <Link href="/ask"><span className="n">01 · QUESTION</span><b>Ask PIX</b><span>Grounded answers that say when they cannot answer.</span></Link>
      <Link href="/atlas"><span className="n">02 · RECORD</span><b>Experiment Atlas</b><span>Search the admitted experiments.</span></Link>
      <Link href={`/experiments/${e.id}`}><span className="n">03 · SOURCE</span><b>{e.testId} dossier</b><span>Every value with its NASA page.</span></Link>
      <Link href="/dashboard"><span className="n">04 · LIMITS</span><b>Evidence Workstation</b><span>Trace a question to where confidence ends.</span></Link>
    </nav>
    <div className="admitted" aria-label="What is admitted today">
      <span><strong>{cov.validatedExperiments}</strong> admitted experiment</span>
      <span><strong>{cov.validatedSources}</strong> NASA source</span>
      <span><strong>{cov.quarantinedCandidates}</strong> legacy candidates held in quarantine</span>
      <span className="badge" data-state={feature('/')!.state}>{featureLabels[feature('/')!.state]} · pre-release</span>
    </div>
  </div>;
}

// ---------- Experiments ----------
function AtlasPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const pick = (k: string) => (typeof searchParams[k] === 'string' && searchParams[k] ? searchParams[k] : undefined);
  const parsed = ExperimentQuerySchema.safeParse(Object.fromEntries(['q', 'program', 'material', 'flowDirection'].flatMap((k) => (pick(k) ? [[k, pick(k)]] : []))));
  const query: AtlasQuery = parsed.success ? { q: parsed.data.q, program: parsed.data.program, material: parsed.data.material, flowDirection: parsed.data.flowDirection } : {};
  const items = searchExperiments(query);
  const facet = (fn: (e: Experiment) => string | null) => [...new Set(catalog.experiments.map(fn).filter((v): v is string => !!v))];
  return <div className="wrap page">
    <Head eyebrow="The experiment index" title="A library of real flames." lede="Documented observations with their sources and limits. One record is admitted today; the rest wait in quarantine until their source cells are reviewed." />
    <StatusLine feature={feature('/atlas')!} />
    <Atlas initial={{ items, total: items.length, coverage: coverage() }} query={query} sources={sources}
      facets={{ program: facet((e) => e.program), material: facet((e) => value(e, 'material')), flowDirection: facet((e) => value(e, 'flowDirection')) }} />
  </div>;
}

function Dossier({ experiment: e }: { experiment: Experiment }) {
  const oxygen = e.conditions.oxygenPct;
  const source = catalog.sources.filter((s) => e.sourceIds.includes(s.id));
  const lineage = e.claims.map((c) => ({ claim: c, verdict: verifyCitations({ subject: { type: 'claim', claimId: c.id }, citations: c.citations }).verdict }));
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="meta" style={{ marginBottom: 18 }}><Link href="/atlas">Experiments</Link> / {e.program} / {e.testId}</nav>
    <Head eyebrow={`Experiment dossier · ${e.id}`} title={e.title} />
    <StatusLine feature={feature('/experiments/[id]')!} />
    <div className="dossier">
      <div>
        <section aria-labelledby="obs">
          <h2 id="obs">Documented observation</h2>
          {lineage.map(({ claim, verdict }) => <div key={claim.id} className="stack">
            <p className="observation">{claim.text}</p>
            <p><Kind kind={claim.kind} /> <span className="meta">· {claim.origin} record · citation lineage {verdict === 'lineage-verified' ? 'verified against the catalog (lineage only, not scientific truth)' : `not verified (${verdict})`}</span></p>
            <CitationList citations={claim.citations} sources={sources} />
          </div>)}
        </section>
        {oxygen.status === 'known' && <section aria-label="Verified oxygen correction">
          <div className="correction">
            <span className="big">{oxygen.value} {oxygen.unit}</span>
            <strong>Verified oxygen value, checked against the source table</strong>
            <p>{oxygen.note}</p>
          </div>
        </section>}
        <section aria-labelledby="cond">
          <h2 id="cond">Conditions and missing values</h2>
          <div className="table-scroll" role="region" aria-label="Conditions table (scrolls horizontally on narrow screens)" tabIndex={0}><table className="conditions">
            <thead><tr><th scope="col">Condition</th><th scope="col">Value</th><th scope="col">Status</th><th scope="col">Source note</th></tr></thead>
            <tbody>{Object.entries(e.conditions).map(([name, c]) => <tr key={name}>
              <th scope="row">{conditionLabels[name] ?? name}</th>
              {c.status === 'known'
                ? <><td className="v">{c.value}{'unit' in c ? ` ${c.unit}` : ''}</td><td><Kind kind={c.basis === 'derived' ? 'derived' : 'recorded'} /></td>
                  <td>{c.note}{c.citation.locator.kind === 'pdf' && <span className="meta"> · PDF p. {c.citation.locator.page}</span>}</td></>
                : <><td className="v" data-unknown="">Unknown</td><td><Kind kind="unknown" /></td><td>{c.reason}</td></>}
            </tr>)}</tbody>
          </table></div>
          <p style={{ marginTop: 16 }}>Original airflow notation: <strong className="mono">{e.rawFlow}</strong></p>
        </section>
        <section aria-labelledby="bounds">
          <h2 id="bounds">Interpretation boundaries</h2>
          <div className="boundaries">
            <div><h3>This record supports</h3><ul>{e.claims.map((c) => <li key={c.id}>{c.text}</li>)}</ul></div>
            <div><Limitations items={e.limitations} title="It cannot support" /></div>
          </div>
        </section>
        <section aria-labelledby="corr">
          <h2 id="corr">Source corrections</h2>
          <ul>{e.provenance.corrections.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
        <section aria-labelledby="prov">
          <h2 id="prov">Document provenance</h2>
          <dl className="facts" style={{ display: 'grid', gap: 12 }}>
            <div><dt>Validation</dt><dd>{e.provenance.validation}</dd></div>
            <div><dt>Upstream record</dt><dd>{e.provenance.upstreamRecordId} in <span className="mono">{e.provenance.upstreamPath}</span></dd></div>
            <div><dt>Upstream commit</dt><dd className="mono" style={{ overflowWrap: 'anywhere' }}>{e.provenance.upstreamCommit}</dd></div>
            <div><dt>Upstream file SHA-256</dt><dd className="mono" style={{ overflowWrap: 'anywhere' }}>{e.provenance.upstreamFileSha256}</dd></div>
          </dl>
        </section>
      </div>
      <aside className="rail" aria-label="Record summary">
        <div className="panel">
          <p className="eyebrow">Evidence status</p>
          <dl>
            <div><dt>Admission</dt><dd>Source-checked against the primary NASA document</dd></div>
            <div><dt>Independent review</dt><dd>Pending: no independent human scientific review yet</dd></div>
            <div><dt>Observations</dt><dd>{e.claims.filter((c) => c.kind === 'observed').length} observed claim{e.claims.length === 1 ? '' : 's'}</dd></div>
            <div><dt>Dataset</dt><dd className="mono">{catalog.datasetVersion}</dd></div>
          </dl>
        </div>
        <div className="panel stack">
          <p className="eyebrow" style={{ margin: 0 }}>Take it with you</p>
          <ExportButton id={e.id} />
          <p className="meta" style={{ margin: 0 }}>Includes the record, its sources, citation links and the catalog hash.</p>
          <Link className="btn btn-quiet btn-sm" href="/ask">Ask PIX about {e.testId}</Link>
        </div>
        {source.map((s) => <div className="panel" key={s.id}>
          <p className="eyebrow">NASA source</p>
          <p style={{ fontWeight: 600 }}>{s.title}</p>
          <dl>
            <div><dt>Document</dt><dd><a href={s.url} rel="noopener noreferrer" target="_blank">NTRS {s.documentId} <span aria-hidden="true">↗</span></a></dd></div>
            <div><dt>Accessed</dt><dd>{s.accessedAt.slice(0, 10)}</dd></div>
            <div><dt>Rights</dt><dd>{s.rights.reuse}: {s.rights.statement}</dd></div>
          </dl>
        </div>)}
      </aside>
    </div>
  </div>;
}

// ---------- Evidence ----------
const claimIndex = Object.fromEntries(catalog.experiments.flatMap((e) => e.claims.map((c) => [c.id, c.text])));
function WorkstationPage() {
  return <div className="wrap page">
    <Head eyebrow="The research workspace" title="What does the evidence actually say?" lede="Name a question and the conditions you care about. Each result is traced from conditions to a cited observation to its limits. No invented certainty." />
    <StatusLine feature={feature('/dashboard')!} built />
    <Workstation sources={sources} claims={claimIndex} coverage={coverage()} />
  </div>;
}
function AskPage() {
  return <div className="wrap page">
    <Head eyebrow="Ask PIX" title="Ask, and see where the answer comes from." lede="PIX is a deterministic evidence guide. It assembles answers only from cited statements in the admitted catalog, and it withholds an answer when the evidence cannot support one." />
    <StatusLine feature={feature('/ask')!} built />
    <AskPix sources={sources} />
  </div>;
}
function GapsPage() {
  return <div className="wrap page">
    <Head eyebrow="Evidence frontier / where knowledge ends" title="The missing experiment is also a finding." lede="Map what the admitted catalog covers for your conditions. A blank cell is not proof of safety, and absence here is not absence everywhere." />
    <StatusLine feature={feature('/gaps')!} built />
    <Frontier coverage={coverage()} />
  </div>;
}
function ComparePage() {
  const e = catalog.experiments[0]!;
  return <div className="wrap page">
    <Head eyebrow="Controlled comparison" title="A comparison needs a second admitted record." lede="Comparing flames is only meaningful when the records were measured under documented conditions. With one admitted experiment, no comparison can be supported yet." />
    <StatusLine feature={feature('/compare')!} />
    <div className="boundaries" style={{ marginBottom: 28 }}>
      <div><p className="eyebrow">Record A · admitted</p><div className="thumb" style={{ maxWidth: 260 }}><FilmGlyph /></div><h3 style={{ marginTop: 12 }}><Link href={`/experiments/${e.id}`}>{e.title}</Link></h3><p className="meta">{value(e, 'material')} · {value(e, 'oxygenPct')} calibrated O₂ · {value(e, 'flowCmS')} initial airflow</p></div>
      <div style={{ borderStyle: 'dashed', display: 'grid', alignContent: 'center' }}><p className="eyebrow">Record B · none admitted</p><p>All {coverage().quarantinedCandidates} legacy candidates are quarantined pending source review, so none can be compared. When more records are admitted, this view will show which conditions differ and warn when more than one differs at once.</p></div>
    </div>
    <h2 style={{ fontSize: 'var(--step-2)' }}>Ask the evidence service anyway</h2>
    <p>This sends a real comparison request. The service refuses it rather than inventing a table.</p>
    <CompareProbe admittedId={e.id} />
  </div>;
}
function SourcesPage() {
  const cov = coverage();
  const byStatus = quarantineLedger.records.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  return <div className="wrap page prose-page">
    <Head eyebrow="Sources & provenance" title="Every claim starts on a page you can open." lede="The admitted source, how it was checked, what it is cited for, and what is deliberately held back." />
    <StatusLine feature={feature('/sources')!} />
    {catalog.sources.map((s) => {
      const detail = sourceDetail(s.id);
      return <article key={s.id} className="panel stack" style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ margin: 0 }}>{s.institution} · NTRS {s.documentId}</p>
        <h2 style={{ fontSize: 'var(--step-2)', margin: 0 }}>{s.title}</h2>
        <div className="actions">
          <a className="btn btn-quiet btn-sm" href={s.url} rel="noopener noreferrer" target="_blank">NASA NTRS record <span aria-hidden="true">↗</span></a>
          <a className="btn btn-quiet btn-sm" href={s.documentUrl} rel="noopener noreferrer" target="_blank">Report PDF <span aria-hidden="true">↗</span></a>
        </div>
        <p><strong>How it was checked:</strong> {s.verification.notes}</p>
        <p><strong>Rights ({s.rights.reuse}):</strong> {s.rights.statement} {s.rights.notes}</p>
        {detail && <p><strong>Cited by:</strong> {detail.citedBy.map((c) => <span key={c.experimentId}><Link href={`/experiments/${c.experimentId}`}>{c.experimentId}</Link> ({c.claimIds.length} claim{c.claimIds.length === 1 ? '' : 's'}; condition fields: {c.conditionFields.join(', ')})</span>)}</p>}
        <p className="meta" style={{ overflowWrap: 'anywhere' }}>Accessed {s.accessedAt.slice(0, 10)} · verified {s.verification.verifiedAt.slice(0, 10)} · SHA-256 <span className="mono">{s.sha256}</span></p>
      </article>;
    })}
    <section aria-labelledby="coverage-title" className="prose">
      <h2 id="coverage-title">Research coverage</h2>
      <CoverageNote coverage={cov} />
      <p style={{ marginTop: 16 }}>The quarantine ledger holds {quarantineLedger.records.length} legacy rows: {Object.entries(byStatus).map(([k, n]) => `${n} ${k.replaceAll('-', ' ')}`).join(', ')}. Quarantined rows are never searchable, answerable, comparable or exportable. Their legacy page locators are unverified.</p>
    </section>
  </div>;
}
function MethodologyPage() {
  return <div className="wrap page">
    <Head eyebrow="Methodology" title="How a page becomes evidence." lede="The path from a NASA document to what MicroFire shows you, and every place that path can stop." />
    <StatusLine feature={feature('/methodology')!} />
    <ol className="steps" aria-label="Evidence pipeline">
      <li><b>Source</b><span>A NASA document, hashed and inspected page by page.</span></li>
      <li><b>Record</b><span>Table cells copied with field-level page locators; unknowns stay unknown.</span></li>
      <li><b>Claim</b><span>Each statement is typed: observed, derived, interpretation, hypothesis or unknown.</span></li>
      <li><b>Limitation</b><span>Canonical caveats travel with every answer and export.</span></li>
    </ol>
    <div className="prose">
      <h2>Five kinds of statement</h2>
      <div className="categories">
        <div><Kind kind="direct-observation" /><p>Recorded in a cited source for the stated conditions. Only this level can be called direct evidence.</p></div>
        <div><Kind kind="supported-derivation" /><p>Computed from recorded values, such as a unit conversion, with the source it was derived from.</p></div>
        <div><Kind kind="scientific-interpretation" /><p>A reading of the evidence that needs its own citation and can be wrong.</p></div>
        <div><Kind kind="analogous-or-mechanistic" /><p>Evidence from different conditions or general mechanisms. Useful for reasoning, never a measurement of your case.</p></div>
        <div><Kind kind="unknown-or-gap" /><p>Not recorded in the admitted catalog. Not found here is not the same as never studied.</p></div>
      </div>
      <h2>Ranking, Ask and evaluation</h2>
      <p>One record cannot support controlled comparison or demonstrate retrieval quality. Backend ranking and fixed-template Ask APIs have a small author-labelled regression set; no AI model is used. Independent scientific evaluation and performance acceptance are pending.</p>
      <p>A retrieval score measures how well a record matches your words and conditions. It is not fire risk, safety or scientific confidence. A record only supports an outcome when an exact cited claim does.</p>
      <h2>Verification boundaries</h2>
      <p>Citation checks confirm that a statement points at the page it came from (lineage), not that the statement is scientifically true. The admitted B20 record was checked against the original PDF, including its table columns; it has not yet had an independent human scientific review.</p>
      <h2>Offline and privacy</h2>
      <p>The app reads its bundled catalog without external requests. Offline here means an already-running local server with the internet disconnected; this is not an installable offline app. Questions you ask are not sent to any AI provider.</p>
    </div>
  </div>;
}
// Canonical text comes only from the catalog, never from a saved passport.
const trustedCatalog = {
  experiments: Object.fromEntries(catalog.experiments.map((e) => [e.id, { title: e.title, limitations: e.limitations }])),
  claims: Object.fromEntries(catalog.experiments.flatMap((e) => e.claims.map((c) => [c.id, { experimentId: e.id, text: c.text, kind: c.kind, citations: c.citations }])))
};
function PassportPage() {
  return <div className="wrap page">
    <Head eyebrow="Evidence Passport · preview" title="A field notebook of what you actually established." lede="Each entry will record a mission, the experiment and claim it rests on, its evidence level, your conclusion, your corrections and the source's own limitations. It is an educational record, never a certificate." />
    <StatusLine feature={feature('/passport')!} />
    <div className="boundaries" style={{ marginBottom: 28 }}>
      <div><h3>Kept by the source</h3><p className="meta">Canonical limitations are always shown from the admitted catalog, never from the saved file, so saved text can never pose as NASA evidence.</p></div>
      <div><h3>Written by you</h3><p className="meta">Conclusions and notes are yours, shown separately and never labelled verified.</p></div>
    </div>
    <PassportPreview datasetVersion={catalog.datasetVersion} sources={sources} trusted={trustedCatalog} />
  </div>;
}

// ---------- Missions ----------
const briefs: Record<string, { scene: string; action: string; carries: string; glyph: React.ReactNode }> = {
  'station-arrival': { scene: 'A small orbital research module and its observatory window.', action: 'Find your way around, inspect a real research question in its source, and learn the controls with PIX.', carries: 'Your mission objective and a first cited question.', glyph: <><ellipse cx="0" cy="-4" rx="18" ry="12" fill="none" stroke="#9fd8ef" strokeWidth="3" /><path d="M-22 14h44" stroke="#ff8738" strokeWidth="3" /></> },
  'bass-assembly': { scene: 'An instrument bench with an engineering cutaway of the BASS-II flow duct.', action: 'Fit named parts in a workable order and repair a seeded but recoverable configuration fault.', carries: 'A qualified instrument and its correction log.', glyph: <><rect x="-22" y="-14" width="44" height="28" rx="6" fill="none" stroke="#ff8738" strokeWidth="3" /><circle cx="-8" cy="0" r="4" fill="#9fe3e3" /><circle cx="8" cy="0" r="4" fill="#9fe3e3" /></> },
  'flame-detective': { scene: 'An investigation room built around source-specified evidence.', action: 'Make a falsifiable prediction, then reconcile it with the documented result and its uncertainty.', carries: 'Your prediction beside the recorded result, with citation.', glyph: <path d="M0-22c8 9 12 16 12 22a12 12 0 0 1-24 0c0-6 4-13 12-22z" fill="#ff8738" /> },
  'claim-trial': { scene: 'A forensic evidence chamber.', action: 'Classify statements by evidence level, find missing controls and reject an unjustified claim.', carries: 'A reasoned evidence-level classification.', glyph: <g stroke="#9fd8ef" strokeWidth="3"><path d="M-18-10h36M-18 0h36M-18 10h36" /></g> },
  'lunar-habitat': { scene: 'A fictional lunar research setting with incomplete direct evidence.', action: 'Weigh what is documented, extrapolated and unknown, then write a provisional recommendation. Never a safety verdict.', carries: 'A Passport case report with its limitations.', glyph: <path d="M-12-14a18 18 0 1 0 24 24 14 14 0 1 1-24-24z" fill="none" stroke="#9fd8ef" strokeWidth="3" /> }
};
const nodes = [[160, 330], [440, 170], [720, 330], [1000, 170], [1280, 330]] as const;
function MissionsPage() {
  const missions = missionDefinitions.map((m, i) => ({ ...m, n: i + 1, feature: feature(`/missions/${m.id}`)! }));
  return <div className="wrap page">
    <Head eyebrow="The orbital investigation / mission map" title="Five places. One scientific mystery." lede="An interactive research station is being built. Every decision will leave an evidence trail in your Passport." />
    <StatusLine feature={feature('/missions')!} />
    <div className="mission-map">
      <svg viewBox="0 0 1440 470" role="group" aria-label="Mission map: five locations, none playable yet">
        <path d={`M${nodes.map(([x, y]) => `${x} ${y}`).join(' L')}`} fill="none" stroke="#2f5566" strokeWidth="14" strokeLinejoin="round" />
        <path d={`M${nodes.map(([x, y]) => `${x} ${y}`).join(' L')}`} fill="none" stroke="#ff8738" strokeWidth="2" strokeDasharray="6 10" opacity=".7" />
        {missions.map((m, i) => { const [x, y] = nodes[i]!; return <g key={m.id} className="mission-node">
          <a href={`/missions/${m.id}`} aria-label={`Mission ${m.n}: ${m.feature.title}, ${featureLabels[m.feature.state]}`}>
            <circle className="ring" cx={x} cy={y} r="78" fill="#10283a" stroke="#4f8ea6" strokeWidth="3" />
            <circle cx={x} cy={y} r="62" fill="none" stroke="#73bbd9" strokeOpacity=".3" />
            <g transform={`translate(${x} ${y})`}>{briefs[m.id]!.glyph}</g>
            <text x={x} y={y + 118} textAnchor="middle">{`0${m.n}  ${m.feature.title.toUpperCase()}`}</text>
            <text className="soon" x={x} y={y - 96} textAnchor="middle">{featureLabels[m.feature.state].toUpperCase()}</text>
          </a>
        </g>; })}
      </svg>
      <ol className="mission-list">{missions.map((m) => <li key={m.id} className="panel">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Mission 0{m.n} · {featureLabels[m.feature.state]}</p>
        <h2 style={{ fontSize: 'var(--step-1)', margin: 0 }}><Link href={`/missions/${m.id}`}>{m.feature.title}</Link></h2>
        <p className="meta" style={{ margin: '6px 0 0' }}>{briefs[m.id]!.action}</p>
      </li>)}</ol>
    </div>
    <div style={{ marginTop: 32 }}>
      <p className="eyebrow">Evidence Passport / persists between missions</p>
      <p className="path-steps">{['Explore', 'Assemble', 'Observe', 'Verify', 'Decide'].flatMap((s, i) => i ? [<span key={`a${i}`} aria-hidden="true">→</span>, <span key={s}>{s}</span>] : [<span key={s}>{s}</span>])}</p>
      <p className="meta">No mission is playable yet. Mission rules exist and are tested; the scenes are in development. <Link href="/passport">See how the Passport will work</Link>.</p>
    </div>
  </div>;
}
function MissionPage({ id }: { id: string }) {
  const index = missionDefinitions.findIndex((m) => m.id === id);
  const m = missionDefinitions[index]!, f = feature(`/missions/${id}`)!, brief = briefs[id]!;
  const prev = m.prerequisite ? feature(`/missions/${m.prerequisite}`) : null;
  const b20 = catalog.experiments[0]!;
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="meta" style={{ marginBottom: 18 }}><Link href="/missions">Mission map</Link> / Mission 0{index + 1}</nav>
    <Head eyebrow={`Mission 0${index + 1} · ${m.mechanic.replaceAll('-', ' ')}`} title={f.title} />
    <StatusLine feature={f} />
    <div className="mission-brief">
      <dl className="brief-dl">
        <div><dt>Scene</dt><dd>{brief.scene}</dd></div>
        <div><dt>What you will do</dt><dd>{brief.action}</dd></div>
        <div><dt>Carries forward</dt><dd>{brief.carries}</dd></div>
        <div><dt>Unlocks after</dt><dd>{prev ? prev.title : 'Available as the first mission once released'}</dd></div>
      </dl>
      <div className="panel stack">
        <p className="eyebrow" style={{ margin: 0 }}>Not playable yet</p>
        <p style={{ margin: 0 }}>This mission&apos;s rules are implemented and tested, but its scene and controls are still being built. Nothing here is simulated gameplay.</p>
        <button className="btn btn-quiet" disabled>{featureLabels[f.state]}</button>
        <div className="actions"><Link className="btn btn-quiet btn-sm" href="/missions">Back to the map</Link><Link className="btn btn-primary btn-sm" href={`/experiments/${b20.id}`}>Inspect the {b20.testId} record</Link></div>
      </div>
    </div>
  </div>;
}
function LabPage() {
  const f = feature('/lab')!;
  return <div className="wrap page">
    <Head eyebrow="Virtual laboratory / illustrative view" title="Change a condition. Check a record." lede="The Flame Lab will pair an illustrative instrument with links to the real records behind it, keeping footage, static evidence and illustration clearly apart." />
    <StatusLine feature={f} />
    <div className="actions"><button className="btn btn-quiet" disabled>{featureLabels[f.state]}</button><Link className="btn btn-primary" href="/">Try the Gravity Lens illustration</Link></div>
  </div>;
}

// ---------- Discover: progress and status pages ----------
function RoadmapPage() {
  const order = ['available', 'preview', 'coming_soon', 'locked', 'blocked'] as const;
  return <div className="wrap page">
    <Head eyebrow="Product progress" title="What works today, and what does not." lede="Every route's real release status, straight from the feature registry. No dates are promised." />
    <StatusLine feature={feature('/roadmap')!} />
    <div className="notice" data-tone="info" style={{ marginBottom: 24 }}><p>Interfaces built for review (Evidence Workstation, Ask PIX, Research Frontier) keep their registry status until an independent review changes it.</p></div>
    <div className="status-groups">{order.map((state) => {
      const group = features.filter((f) => f.state === state);
      if (!group.length) return null;
      return <section key={state} aria-labelledby={`st-${state}`}>
        <h2 id={`st-${state}`} style={{ fontSize: 'var(--step-2)' }}>{featureLabels[state]} <span className="meta">({group.length})</span></h2>
        {group.map((f) => <div className="status-row" key={f.id}>
          <h3>{f.route.includes('[') ? f.title : <Link href={f.route}>{f.title}</Link>}</h3>
          <span className="badge" data-state={f.state}>{featureLabels[f.state]}</span>
          <p>{f.reason}</p>
        </div>)}
      </section>;
    })}</div>
  </div>;
}
function StatusPage({ f }: { f: Feature }) {
  return <div className="wrap page">
    <Head eyebrow={featureLabels[f.state]} title={f.title} />
    <StatusLine feature={f} />
    <div className="actions"><button className="btn btn-quiet" disabled>{featureLabels[f.state]}</button><Link className="btn btn-primary" href="/atlas">Explore the admitted evidence</Link></div>
  </div>;
}

export function titleFor(path: string): string | undefined {
  if (path.startsWith('/experiments/')) return catalog.experiments.find((e) => `/experiments/${e.id}` === path)?.title;
  return path === '/' ? undefined : feature(path)?.title;
}

export function RoutePage({ path, searchParams }: { path: string; searchParams: Record<string, string | string[] | undefined> }) {
  if (path.startsWith('/experiments/')) {
    const experiment = catalog.experiments.find((e) => `/experiments/${e.id}` === path);
    if (!experiment) notFound();
    return <Dossier experiment={experiment} />;
  }
  const f = feature(path);
  if (!f) notFound();
  if (f.route.startsWith('/missions/')) return <MissionPage id={f.id} />;
  const pages: Record<string, () => React.ReactNode> = {
    '/': Home, '/atlas': () => <AtlasPage searchParams={searchParams} />, '/dashboard': WorkstationPage, '/ask': AskPage, '/gaps': GapsPage,
    '/compare': ComparePage, '/sources': SourcesPage, '/methodology': MethodologyPage, '/passport': PassportPage, '/missions': MissionsPage,
    '/lab': LabPage, '/roadmap': RoadmapPage
  };
  return (pages[path] ?? (() => <StatusPage f={f} />))();
}
