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
