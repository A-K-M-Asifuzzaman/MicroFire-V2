'use client';
import { useState } from 'react';
import { GapsResponseSchema, type Coverage, type TargetConditions } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import { CoverageNote, Limitations } from './evidence-ui';
import { ConditionFields, fieldLabel, targetsFrom, withUnit, type Pending } from './tool-kit';

// ---------- Research Frontier ----------
type GapsData = ReturnType<typeof GapsResponseSchema.parse>['data'];
const gapColumns = [['covered', 'Covered'], ['conditions-differ', 'Conditions differ'], ['not-recorded', 'Not recorded'], ['not-in-catalog', 'Not in catalog']] as const;
const statusLabel = Object.fromEntries(gapColumns) as Record<string, string>;
const label = fieldLabel;
const requested = (field: string, t: TargetConditions | null) => {
  const v = t?.[field as keyof TargetConditions];
  return v === undefined ? '—' : withUnit(field, v);
};

/** `records` holds each admitted record's displayed values (or "Not recorded"), prepared on the server from the catalog. */
export function Frontier({ coverage, records }: { coverage: Coverage; records: Record<string, Record<string, string>> }) {
  const [state, setState] = useState<Pending<GapsData>>({ status: 'idle' });
  const [example, setExample] = useState<Record<string, string> | undefined>();
  const [last, setLast] = useState<TargetConditions | null>(null);
  const begin = useLatestRequest();
  const run = async (targetConditions: TargetConditions) => {
    const r = begin();
    if (!Object.keys(targetConditions).length) return setState({ status: 'failed', failure: { ok: false, status: 400, message: 'Name at least one target condition.', retryAfter: null } });
    setLast(targetConditions);
    setState({ status: 'loading' });
    const result = await callApi('/api/gaps', GapsResponseSchema, { targetConditions }, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', data: result.data } : { status: 'failed', failure: result });
  };
  /** The API note repeats the field key and status the row already shows; display only its detail, with the key as a field id. */
  const noteDetail = (f: GapsData['fields'][number]) => {
    const m = f.note.match(new RegExp(`^${f.field}:\\s*(?:not recorded\\s*)?(?:\\((.*)\\)|(.*))$`, 's'));
    return m ? (m[1] ?? m[2] ?? '').trim() || f.note : f.note;
  };
  const documented = (f: GapsData['fields'][number]) => {
    if (!f.experimentIds.length) return '—';
    return f.experimentIds.map((id) => records[id]?.[f.field] ?? 'Not recorded').join(' · ');
  };
  return <div className="split frontier">
    <form className="panel" aria-label="Target conditions" onSubmit={(e) => { e.preventDefault(); void run(targetsFrom(new FormData(e.currentTarget))); }}>
      <p className="eyebrow">Your target conditions</p>
      <ConditionFields prefix="gap" values={example} />
      <div className="actions">
        <button className="btn btn-primary btn-sm" type="submit">Map coverage</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { const v = { material: 'PMMA', gravity: 'microgravity', oxygenPct: '21', pressureKpa: '70' }; setExample(v); void run({ material: 'PMMA', gravity: 'microgravity', oxygenPct: 21, pressureKpa: 70 }); }}>Load example</button>
      </div>
    </form>
    <section aria-labelledby="gap-results" aria-busy={state.status === 'loading'} aria-live="polite">
      <h2 id="gap-results" className="sr-only">Coverage comparison</h2>
      {state.status === 'idle' && <div className="notice" data-tone="info"><p>Name the conditions you care about, or load the example. Each one is compared with the admitted record: covered within retrieval tolerance, recorded at a different value, not recorded, or absent from the catalog.</p></div>}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={last ? () => void run(last) : undefined} />}
      {state.status === 'done' && <div className="stack">
        <div data-testid="coverage-summary">
          <p className="eyebrow" style={{ marginBottom: 4 }}>Coverage of your {state.data.fields.length} condition{state.data.fields.length === 1 ? '' : 's'}</p>
          <div className="coverage-bar" aria-hidden="true">{gapColumns.map(([k]) => { const n = state.data.fields.filter((f) => f.status === k).length; return n ? <span key={k} data-s={k} style={{ flex: n }} /> : null; })}</div>
          <ul className="coverage-key">{gapColumns.map(([k, l]) => <li key={k}><i data-s={k} aria-hidden="true" />{l}: <strong>{state.data.fields.filter((f) => f.status === k).length}</strong></li>)}</ul>
        </div>
        {/* Rows on desktop, one card per condition on phones (explicit roles keep the table semantics when reflowed). */}
        <div className="table-scroll" role="region" aria-label="Coverage matrix (scrolls horizontally on narrow screens)" tabIndex={0}>
          <table className="gap-table" role="table">
            <caption className="sr-only">Each target condition compared with the admitted catalog</caption>
            <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Condition</th><th role="columnheader" scope="col">You asked</th><th role="columnheader" scope="col">Documented</th><th role="columnheader" scope="col">Status</th><th role="columnheader" scope="col">Source note</th></tr></thead>
            <tbody role="rowgroup">{state.data.fields.map((f) => <tr role="row" key={f.field} data-s={f.status}>
              <th role="rowheader" scope="row">{label(f.field)}</th>
              <td role="cell" data-label="You asked">{requested(f.field, last)}</td>
              <td role="cell" data-label="Documented" data-unknown={f.status === 'not-recorded' ? '' : undefined}>{f.status === 'not-recorded' ? 'No value documented' : documented(f)}</td>
              <td role="cell" data-label="Status"><span className="gap-status" data-s={f.status}><i aria-hidden="true" />{statusLabel[f.status]}</span></td>
              <td role="cell" data-label="Source note" className="gap-note"><code className="field-id">{f.field}</code> {noteDetail(f)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <details className="disclose">
          <summary>Show as a matrix</summary>
          <div className="table-scroll" role="region" aria-label="Coverage matrix view" tabIndex={0}><table className="matrix">
            <caption className="sr-only">Coverage matrix of each target condition</caption>
            <thead><tr><th scope="col">Condition</th>{gapColumns.map(([k, l]) => <th key={k} scope="col">{l}</th>)}</tr></thead>
            <tbody>{state.data.fields.map((f) => <tr key={f.field}>
              <th scope="row">{label(f.field)}</th>
              {gapColumns.map(([k, l]) => <td key={k} data-hit={f.status === k ? '' : undefined}>{f.status === k ? <><span aria-hidden="true">● </span>{l}</> : <span className="sr-only">no</span>}</td>)}
            </tr>)}</tbody>
          </table></div>
        </details>
        <Limitations items={state.data.statements} title="How to read this" />
        <CoverageNote coverage={state.data.coverage} />
      </div>}
      {state.status !== 'done' && <div style={{ marginTop: 20 }}><CoverageNote coverage={coverage} /></div>}
    </section>
  </div>;
}
