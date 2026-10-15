'use client';
import { useState } from 'react';
import { GapsResponseSchema, type Coverage, type TargetConditions } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import { CoverageNote, Limitations } from './evidence-ui';
import { ConditionFields, targetsFrom, type Pending } from './tool-kit';

// ---------- Research Frontier ----------
type GapsData = ReturnType<typeof GapsResponseSchema.parse>['data'];
const gapColumns = [['covered', 'Covered'], ['conditions-differ', 'Conditions differ'], ['not-recorded', 'Not recorded'], ['not-in-catalog', 'Not in catalog']] as const;
export function Frontier({ coverage }: { coverage: Coverage }) {
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
  return <div className="split">
    <form className="panel" aria-label="Target conditions" onSubmit={(e) => { e.preventDefault(); void run(targetsFrom(new FormData(e.currentTarget))); }}>
      <p className="eyebrow">Target conditions</p>
      <ConditionFields prefix="gap" values={example} />
      <div className="actions">
        <button className="btn btn-primary btn-sm" type="submit">Map coverage</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { const v = { material: 'PMMA', gravity: 'microgravity', oxygenPct: '21', pressureKpa: '70' }; setExample(v); void run({ material: 'PMMA', gravity: 'microgravity', oxygenPct: 21, pressureKpa: 70 }); }}>Load example</button>
      </div>
    </form>
    <section aria-labelledby="gap-results" aria-busy={state.status === 'loading'} aria-live="polite">
      <h2 id="gap-results" className="sr-only">Coverage matrix</h2>
      {state.status === 'idle' && <div className="notice" data-tone="info"><p>Name the conditions you care about. Each one is checked against the admitted record: covered within retrieval tolerance, recorded at a different value, not recorded, or absent from the catalog.</p></div>}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={last ? () => void run(last) : undefined} />}
      {state.status === 'done' && <div className="stack">
        <div data-testid="coverage-summary">
          <p className="eyebrow" style={{ marginBottom: 4 }}>Coverage of your {state.data.fields.length} condition{state.data.fields.length === 1 ? '' : 's'}</p>
          <div className="coverage-bar" aria-hidden="true">{gapColumns.map(([k]) => { const n = state.data.fields.filter((f) => f.status === k).length; return n ? <span key={k} data-s={k} style={{ flex: n }} /> : null; })}</div>
          <ul className="coverage-key">{gapColumns.map(([k, l]) => <li key={k}><i data-s={k} aria-hidden="true" />{l}: <strong>{state.data.fields.filter((f) => f.status === k).length}</strong></li>)}</ul>
        </div>
        {/* Local, keyboard-focusable scroll region: the matrix may scroll; the page never does. */}
        <div className="table-scroll" role="region" aria-label="Coverage matrix (scrolls horizontally on narrow screens)" tabIndex={0}><table className="matrix">
          <caption className="sr-only">Coverage of each target condition in the admitted catalog</caption>
          <thead><tr><th scope="col">Condition</th>{gapColumns.map(([k, l]) => <th key={k} scope="col">{l}</th>)}</tr></thead>
          <tbody>{state.data.fields.map((f) => <tr key={f.field}>
            <th scope="row">{f.field}</th>
            {gapColumns.map(([k, l]) => <td key={k} data-hit={f.status === k ? '' : undefined}>{f.status === k ? <><span aria-hidden="true">● </span>{l}</> : <span className="sr-only">no</span>}</td>)}
          </tr>)}</tbody>
        </table></div>
        <ul className="matrix-note">{state.data.fields.map((f) => <li key={f.field}>{f.note}</li>)}</ul>
        <Limitations items={state.data.statements} title="How to read this" />
        <CoverageNote coverage={state.data.coverage} />
      </div>}
      {state.status !== 'done' && <div style={{ marginTop: 20 }}><CoverageNote coverage={coverage} /></div>}
    </section>
  </div>;
}

