// Renders Codex's scientific-intelligence-v1 output (IntelligenceResponseSchema / TransferResponseSchema) as text.
// Nothing here computes science: statuses, conclusions, reasons and citations all come from the server. A null
// transfer is shown with the server's own note, never filled in.
import Link from 'next/link';
import type { IntelligenceResponseSchema } from '@microfire/shared';
import { CitationList, Kind, Limitations, type SourceRef } from './evidence-ui';
import { fieldLabel, fieldLabels } from './tool-kit';

export type IntelligenceData = ReturnType<typeof IntelligenceResponseSchema.parse>['data'];
type Transfer = NonNullable<IntelligenceData['transfer']>;
type Dimension = Transfer['records'][number]['dimensions'][number];

/** Plain-language names for the six server statuses; the raw status stays visible as data for reviewers. */
export const STATUS: Record<Dimension['status'], { label: string; kind: 'match' | 'near' | 'differ' | 'unknown' | 'context' | 'unset' }> = {
  'exact-recorded': { label: 'Matches the recorded value', kind: 'match' },
  'non-exact-retrieval-match': { label: 'Close, not exact (retrieval match only)', kind: 'near' },
  'conditions-differ': { label: 'Differs from the NASA test', kind: 'differ' },
  'source-not-recorded': { label: 'Not recorded by the source', kind: 'unknown' },
  'context-only': { label: 'Series context only, not this run', kind: 'context' },
  'target-unspecified': { label: 'You did not specify this', kind: 'unset' },
};
const CONCLUSION: Record<Transfer['records'][number]['conclusion'], { title: string; body: string; tone: string }> = {
  'recorded-conditions-match': { title: 'Your conditions match the recorded NASA test', tone: 'mint',
    body: 'All six conditions equal the recorded values. This describes the match; it is not a fire-safety verdict.' },
  'conditions-differ': { title: 'Your conditions differ from the NASA test', tone: 'sun',
    body: 'The recorded observation does not automatically carry over. Treat any transfer as an untested extrapolation.' },
  'insufficient-evidence': { title: 'Not enough recorded evidence to transfer', tone: 'coral',
    body: 'At least one condition is unspecified, unrecorded or only known from series context, so transfer cannot be judged.' },
};
const ENV: Record<string, string> = { moon: 'Moon (your scenario)', mars: 'Mars (your scenario)', spacecraft: 'Spacecraft (your scenario)', earth: 'Earth (your scenario)', custom: 'Custom scenario' };
const show = (field: string, v: string | number | null, unit: string | null) =>
  v === null ? '—' : `${v}${typeof v === 'number' ? ` ${unit ?? fieldLabels[field]?.[1] ?? ''}`.trimEnd() : ''}`;

export function TransferAnalysis({ transfer, note, sources }: { transfer: Transfer | null; note: string; sources: SourceRef[] }) {
  if (!transfer) return <div className="notice" data-tone="info" data-testid="transfer-null"><p className="eyebrow" style={{ margin: 0 }}>Applicability analysis</p><p>{note}</p></div>;
  return <section className="xfer" aria-label="Applicability analysis" data-testid="transfer-analysis">
    <p className="eyebrow" style={{ margin: 0 }}>Applicability analysis · {ENV[transfer.environment] ?? transfer.environment}</p>
    {transfer.records.map((r) => {
      const c = CONCLUSION[r.conclusion];
      return <article key={r.experimentId} className="xfer-record">
        <div className="xfer-verdict" data-tone={c.tone} data-conclusion={r.conclusion}>
          <h3>{c.title}</h3><p>{c.body} Compared with <Link href={`/experiments/${r.experimentId}`}>{r.experimentId}</Link>.</p>
        </div>
        <div className="table-scroll" role="region" aria-label={`Six-condition comparison with ${r.experimentId}`} tabIndex={0}>
          <table className="xfer-table">
            <thead><tr><th scope="col">Condition</th><th scope="col">Your scenario</th><th scope="col">NASA recorded</th><th scope="col">Evaluation</th></tr></thead>
            <tbody>{r.dimensions.map((d) => <tr key={d.field} data-kind={STATUS[d.status].kind} data-status={d.status}>
              <th scope="row">{fieldLabel(d.field)}</th>
              <td>{show(d.field, d.target, d.unit)}</td>
              <td>{d.basis === 'unknown' ? <em>Not recorded</em> : show(d.field, d.source, d.unit)}{d.basis === 'series' || d.basis === 'derived' ? <span className="meta"> ({d.basis})</span> : null}</td>
              <td><span className="xfer-pill" data-kind={STATUS[d.status].kind}>{STATUS[d.status].label}</span>
                <p className="meta">{d.reason}</p>
                {d.citations.length > 0 && <CitationList citations={d.citations} sources={sources} />}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {r.confounders.length > 0 && <Limitations items={r.confounders} title="Confounders to keep in mind" />}
        <Limitations items={r.limitations} title="Limits of this comparison" />
      </article>;
    })}
    <p className="meta">A condition comparison, not a safety prediction. Scenario values are your inputs, not NASA measurements.</p>
  </section>;
}

export function SummaryBlock({ summary, sources }: { summary: IntelligenceData['summary']; sources: SourceRef[] }) {
  if (summary.abstained) return <div className="panel answer" data-abstained="" data-testid="intel-abstention">
    <p className="eyebrow" style={{ color: 'var(--k-gap)' }}>No supported answer · {summary.code}</p>
    <p style={{ overflowWrap: 'anywhere' }}>{summary.reason}</p>
    {summary.citations.length > 0 && <CitationList citations={summary.citations} sources={sources} />}
    <p className="meta">Nothing was generated in its place: extrapolating beyond the cited evidence is not supported.</p>
  </div>;
  return <div className="panel answer" data-testid="intel-summary">
    <p className="eyebrow">Source-linked summary · {summary.statements.length} statement{summary.statements.length === 1 ? '' : 's'}</p>
    {summary.statements.map((s, i) => <div className="statement" key={`${s.category}-${i}`}><Kind kind={s.category} /><p>{s.text}</p>
      {s.citations.length > 0 && <CitationList citations={s.citations} sources={sources} />}</div>)}
    <Limitations items={summary.limitations} />
  </div>;
}

/** Method line: always names what actually produced the result. */
export function Method({ data }: { data: IntelligenceData }) {
  return <p className="meta">Produced by {data.producer === 'deterministic-source-templates-no-model' ? 'deterministic source templates (no AI model)' : data.producer} · {data.intelligenceVersion} · ranking {data.ranking.rankingVersion} · dataset {data.ranking.datasetVersion}. Research support, not operational fire-safety advice. Citation checks confirm source lineage, not scientific truth.</p>;
}

/** The judge's first look: one card built only from fields the server returned. Neutral tones; never a safety colour. */
export function AtAGlance({ data, sources }: { data: IntelligenceData; sources: SourceRef[] }) {
  const top = data.ranking.items[0], s = data.summary, rec = data.transfer?.records[0];
  const answer = s.abstained ? { title: 'No supported answer', text: s.reason }
    : top && top.support.kind !== 'unsupported' ? { title: `Supported by ${/^[aeiou]/.test(top.support.kind) ? 'an' : 'a'} ${top.support.kind} NASA statement`, text: 'A cited statement in an admitted record speaks to your question.' }
      : { title: 'Related evidence only', text: 'Records relate to your question, but no cited statement establishes the outcome.' };
  const by = (k: string[]) => rec ? rec.dimensions.filter((d) => k.includes(d.status)).map((d) => fieldLabel(d.field)) : [];
  const groups: [string, string[], string][] = rec ? [['Match', by(['exact-recorded']), 'match'], ['Close (retrieval only)', by(['non-exact-retrieval-match']), 'near'], ['Differ', by(['conditions-differ']), 'differ'],
    ['Unknown / not recorded', by(['source-not-recorded', 'context-only']), 'unknown'], ['Not specified by you', by(['target-unspecified']), 'unset']]
    : top ? [['Match', top.matchedFields.map((f) => fieldLabel(f.split(':')[0]!)), 'match'], ['Differ', top.mismatches.map((f) => fieldLabel(f.split(':')[0]!)), 'differ'], ['Unknown / not recorded', top.missingFields.map((f) => fieldLabel(f.split(':')[0]!)), 'unknown']] : [];
  const citation = (s.abstained ? s.citations[0] : s.citations[0]) ?? top?.support.citations[0];
  const limit = s.abstained ? null : rec?.limitations[0] ?? s.limitations[0] ?? top?.limitations[0];
  return <section className="glance" aria-labelledby="glance-title" data-testid="at-a-glance">
    <h3 id="glance-title" className="sr-only">At a glance</h3>
    <div className="glance-grid">
      <div><p className="glance-k">Answer</p><p className="glance-v" data-testid="glance-answer">{answer.title}</p><p className="meta">{answer.text}</p></div>
      <div><p className="glance-k">Applies to your scenario?</p>
        <p className="glance-v" data-testid="glance-transfer">{rec ? CONCLUSION[rec.conclusion].title : 'Not assessed'}</p>
        <p className="meta">{rec ? 'A condition comparison, not a safety prediction.' : data.transferNote}</p></div>
      <div><p className="glance-k">Most relevant NASA evidence</p>
        <p className="glance-v">{top ? <Link href={`/experiments/${top.experimentId}`}>{top.experimentId}</Link> : 'No admitted record matched'}</p>
        {top && <p className="meta">{top.support.kind === 'unsupported' ? 'related record' : `${top.support.kind} · ${top.evidenceLevel}`}</p>}</div>
    </div>
    {groups.some(([, f]) => f.length) && <ul className="glance-conds" aria-label="Your conditions against the record">
      {groups.filter(([, f]) => f.length).map(([label, f, kind]) => <li key={label} data-kind={kind}><b>{label}:</b> {f.join(', ')}</li>)}</ul>}
    <div className="glance-foot">
      {citation && <div><p className="glance-k">Primary source</p><CitationList citations={[citation]} sources={sources} /></div>}
      <div><p className="glance-k">{s.abstained ? 'Why PIX withheld an answer' : 'Key limitation'}</p><p>{s.abstained ? s.reason : limit}</p></div>
    </div>
  </section>;
}
