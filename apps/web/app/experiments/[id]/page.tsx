import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Experiment } from '@microfire/shared';
import { catalog, verifyCitations } from '@microfire/science';
import { BASS_HARDWARE_CITATION, partDefinitions } from '@microfire/game-core';
import { Apparatus, type ApparatusItem } from '../../../components/apparatus';
import { CitationList, Kind, Limitations } from '../../../components/evidence-ui';
import { Specimen } from '../../../components/exhibits';
import { ExportButton } from '../../../components/export-button';
import { conditionLabels, feature, PageHero, Sheet, sources } from '../../../components/page-kit';

export const dynamicParams = false; // unknown and quarantined IDs get a real 404
export function generateStaticParams() { return catalog.experiments.map((e) => ({ id: e.id })); }
type Props = { params: Promise<{ id: string }> };
const find = async (params: Props['params']) => { const { id } = await params; return catalog.experiments.find((e) => e.id === id); };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const e = await find(params); return e ? { title: e.title } : {}; }

const partLabels: Record<string, string> = {
  'flow-duct': 'Flow duct', fan: 'Variable-speed fan', 'flow-straightener': 'Honeycomb flow straightener', 'nitrogen-nozzle': 'N₂ nozzle',
  'sample-holder': 'Sample mounting rail', igniter: 'Hot-wire igniter', 'still-camera': 'Still camera · top window',
  'video-camera': 'Video camera · front window via mirror', radiometer: 'Radiometer · uncalibrated', 'exit-plate': 'Exit plate and screen'
};
function apparatusItems(e: Experiment): ApparatusItem[] {
  const parts: ApparatusItem[] = partDefinitions.map((p, i) => ({ id: p.id, n: String(i + 1), label: partLabels[p.id] ?? p.id, note: p.sourceNote, basis: 'sourced', citation: BASS_HARDWARE_CITATION }));
  const condition = (key: keyof Experiment['conditions'], n: string, extra = ''): ApparatusItem => {
    const c = e.conditions[key];
    return c.status === 'known'
      ? { id: key, n, label: `${conditionLabels[key]}: ${c.value}${'unit' in c ? ` ${c.unit}` : ''}`, note: `${c.note}${extra}`, basis: 'recorded', citation: c.citation, condition: key }
      : { id: key, n, label: `${conditionLabels[key]}: not recorded`, note: c.reason, basis: 'unknown', citation: null, condition: key };
  };
  return [...parts, condition('oxygenPct', 'A'), condition('flowCmS', 'B', ` Original notation: ${e.rawFlow}.`), condition('pressureKpa', 'C'), condition('gravity', 'D')];
}

export default async function Page({ params }: Props) {
  const e = await find(params);
  if (!e) notFound();
  const oxygen = e.conditions.oxygenPct;
  const source = catalog.sources.filter((s) => e.sourceIds.includes(s.id));
  const lineage = e.claims.map((c) => ({ claim: c, verdict: verifyCitations({ subject: { type: 'claim', claimId: c.id }, citations: c.citations }).verdict }));
  return <>
    <PageHero crumbs={<><Link href="/atlas">Experiments</Link> / {e.program} / {e.testId}</>} eyebrow={`Experiment dossier · ${e.id}`} title={e.title}
      status={{ feature: feature('/experiments/[id]')! }} visual={<Specimen experiment={e} />}
      lede={`A flame-spread test documented in a NASA summary report. Everything below is traced to its page, and what the report does not record is marked unknown.`} />
    <Sheet>
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
            <div className="correction frame">
              <span className="big">{oxygen.value} {oxygen.unit}</span>
              <strong>Verified oxygen value, checked against the source table</strong>
              <p>{oxygen.note}</p>
            </div>
          </section>}
          <section aria-labelledby="app">
            <h2 id="app">The instrument, part by part</h2>
            <p className="meta">Select a part or a run condition. Hardware notes come from the report&apos;s hardware description; run conditions come from this record.</p>
            <Apparatus items={apparatusItems(e)} sources={sources} />
          </section>
          <section aria-labelledby="cond">
            <h2 id="cond">Conditions and missing values</h2>
            <div className="table-scroll" role="region" aria-label="Conditions table (scrolls horizontally on narrow screens)" tabIndex={0}><table className="conditions">
              <thead><tr><th scope="col">Condition</th><th scope="col">Value</th><th scope="col">Status</th><th scope="col">Source note</th></tr></thead>
              <tbody>{Object.entries(e.conditions).map(([name, c]) => <tr key={name} data-cond={name}>
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
          <nav className="panel" aria-label="On this page">
            <p className="eyebrow">On this page</p>
            <ol className="meta" style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 4 }}>
              <li><a href="#obs">Observation</a></li><li><a href="#app">Instrument</a></li><li><a href="#cond">Conditions</a></li>
              <li><a href="#bounds">Boundaries</a></li><li><a href="#corr">Corrections</a></li><li><a href="#prov">Provenance</a></li>
            </ol>
          </nav>
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
    </Sheet>
  </>;
}
