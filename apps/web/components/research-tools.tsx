'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  CompareResponseSchema, ExperimentsResponseSchema, ExportResponseSchema, GapsResponseSchema, RankResponseSchema,
  type Coverage, type Experiment, type TargetConditions
} from '@microfire/shared';
import { callApi, Failure, useLatestRequest, type ApiFailure } from './client-api';
import { CitationList, CoverageNote, Kind, Limitations, type SourceRef } from './evidence-ui';

type Pending<T> = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: T } | { status: 'failed'; failure: ApiFailure };

// ---------- shared pieces ----------
export function FilmGlyph() {
  return <svg viewBox="0 0 200 125" width="100%" aria-hidden="true">
    <rect x="30" y="58" width="140" height="8" rx="2" fill="#2a3d52" />
    <rect x="96" y="58" width="74" height="8" rx="2" fill="#c9d4dd" />
    <path d="M96 62c-10-3-20-10-22-24 9 6 15 8 22 6z" fill="#ff8738" opacity=".9" />
    <path d="M96 62c-10 3-20 10-22 24 9-6 15-8 22-6z" fill="#ff8738" opacity=".55" />
    <g stroke="#73bbd9" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M182 30h-40m6-5-6 5 6 5" /><path d="M182 94h-40m6-5-6 5 6 5" /></g>
    <text x="100" y="116" textAnchor="middle" fill="#a9b8c6" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="1">SCHEMATIC · OPPOSED FLOW</text>
  </svg>;
}
const known = (e: Experiment, field: keyof Experiment['conditions']) => {
  const c = e.conditions[field];
  return c.status === 'known' ? `${c.value}${'unit' in c ? ` ${c.unit}` : ''}` : 'Unknown';
};
export function RecordCard({ experiment, sources }: { experiment: Experiment; sources: readonly SourceRef[] }) {
  const claim = experiment.claims[0];
  return <article className="record-card">
    <div className="thumb"><FilmGlyph /></div>
    <div>
      <p className="eyebrow" style={{ marginBottom: 6, color: 'var(--accent-text)' }}>{experiment.program} · test {experiment.testId}</p>
      <h2><Link href={`/experiments/${experiment.id}`}>{experiment.title}</Link></h2>
      {claim && <p style={{ margin: '0 0 6px' }}><Kind kind={claim.kind} /> {claim.text}</p>}
      <dl className="facts">
        <div><dt>Material</dt><dd>{known(experiment, 'material')}</dd></div>
        <div><dt>Calibrated O₂</dt><dd>{known(experiment, 'oxygenPct')}</dd></div>
        <div><dt>Initial airflow</dt><dd>{known(experiment, 'flowCmS')}</dd></div>
        <div><dt>Pressure</dt><dd>{known(experiment, 'pressureKpa')}</dd></div>
        <div><dt>Source</dt><dd>{sources.find((s) => experiment.sourceIds.includes(s.id))?.title.split('(')[0]?.trim() ?? experiment.sourceIds[0]}</dd></div>
      </dl>
    </div>
    <span className="arrow" aria-hidden="true">→</span>
  </article>;
}
const num = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);
const text = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
function targetsFrom(form: FormData): TargetConditions {
  const t: TargetConditions = { gravity: text(form.get('gravity')), material: text(form.get('material')), geometry: text(form.get('geometry')),
    oxygenPct: num(form.get('oxygenPct')), pressureKpa: num(form.get('pressureKpa')), flowCmS: num(form.get('flowCmS')) };
  return Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined)) as TargetConditions;
}
function ConditionFields({ prefix, values = {} }: { prefix: string; values?: Partial<Record<string, string>> | undefined }) {
  const fields: [string, string, string, string?][] = [
    ['material', 'Material', 'text', 'e.g. PMMA'], ['gravity', 'Gravity', 'text', 'e.g. microgravity'], ['geometry', 'Geometry', 'text', 'e.g. thin film'],
    ['oxygenPct', 'Oxygen (vol%)', 'number'], ['flowCmS', 'Airflow (cm/s)', 'number'], ['pressureKpa', 'Pressure (kPa)', 'number']
  ];
  return <div className="fieldset-grid">{fields.map(([name, label, type, hint]) => <div className="field" key={name}>
    <label htmlFor={`${prefix}-${name}`}>{label}</label>
    <input id={`${prefix}-${name}`} name={name} type={type} placeholder={hint} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? 0 : undefined}
      max={name === 'oxygenPct' ? 100 : undefined} defaultValue={values[name]} key={values[name] ?? ''} maxLength={type === 'text' ? 200 : undefined} />
  </div>)}</div>;
}

// ---------- Experiment Atlas ----------
export type AtlasQuery = { q?: string | undefined; program?: string | undefined; material?: string | undefined; flowDirection?: string | undefined };
export function Atlas({ initial, query, facets, sources }: {
  initial: { items: Experiment[]; total: number; coverage: Coverage }; query: AtlasQuery;
  facets: { program: string[]; material: string[]; flowDirection: string[] }; sources: SourceRef[];
}) {
  const [state, setState] = useState<Pending<{ items: Experiment[]; total: number; coverage: Coverage }>>({ status: 'done', data: initial });
  const [last, setLast] = useState<URLSearchParams | null>(null);
  const begin = useLatestRequest();
  const run = async (params: URLSearchParams) => {
    const r = begin();
    setLast(params);
    setState({ status: 'loading' });
    const result = await callApi(`/api/experiments?${params}`, ExperimentsResponseSchema, undefined, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', data: result.data } : { status: 'failed', failure: result });
    if (result.ok) history.replaceState(null, '', params.size ? `/atlas?${params}` : '/atlas');
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(event.currentTarget)) if (typeof v === 'string' && v.trim()) params.set(k, v.trim());
    void run(params);
  };
  const facet = (name: keyof typeof facets, label: string) => <div className="field">
    <label htmlFor={`atlas-${name}`}>{label}</label>
    <select id={`atlas-${name}`} name={name} defaultValue={query[name] ?? ''}>
      <option value="">Any {label.toLowerCase()}</option>
      {facets[name].map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
    <small>{facets[name].length} value{facets[name].length === 1 ? '' : 's'} in the admitted corpus</small>
  </div>;
  const data = state.status === 'done' ? state.data : null;
  return <div className="split">
    <form className="panel" role="search" aria-label="Search experiments" action="/atlas" method="get" onSubmit={submit}>
      <p className="eyebrow">Filter by</p>
      <div className="field">
        <label htmlFor="atlas-q">Search terms</label>
        <input id="atlas-q" name="q" type="search" defaultValue={query.q} maxLength={200} placeholder="e.g. PMMA opposed" />
        <small>All terms must match an admitted record.</small>
      </div>
      {facet('program', 'Program')}{facet('material', 'Material')}{facet('flowDirection', 'Flow direction')}
      <div className="actions">
        <button className="btn btn-primary btn-sm" type="submit" disabled={state.status === 'loading'}>Search</button>
        <a className="btn btn-quiet btn-sm" href="/atlas">Reset</a>
      </div>
    </form>
    <section aria-labelledby="atlas-results" aria-busy={state.status === 'loading'}>
      <h2 id="atlas-results" className="sr-only">Results</h2>
      <div className="results-meta" aria-live="polite">
        {state.status === 'loading' ? <span>Searching the admitted catalog…</span> : data && <span>{data.total} admitted record{data.total === 1 ? '' : 's'} match</span>}
        <span>Evidence status: source-checked, not independently peer-reviewed</span>
      </div>
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={last ? () => void run(last) : undefined} />}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {data && (data.items.length
        ? data.items.map((e) => <RecordCard key={e.id} experiment={e} sources={sources} />)
        : <div className="notice" data-tone="info"><p><strong>No admitted record matches.</strong> Only one experiment is admitted today. Quarantined legacy candidates (for example other BASS-II runs) are never returned as results, and absence here does not mean a condition was never studied.</p><p><a href="/atlas">Clear the filters</a></p></div>)}
      <div style={{ marginTop: 24 }}><CoverageNote coverage={(data ?? initial).coverage} /></div>
    </section>
  </div>;
}

// ---------- JSON export ----------
export function ExportButton({ id }: { id: string }) {
  const [state, setState] = useState<Pending<string>>({ status: 'idle' });
  const begin = useLatestRequest();
  const run = async () => {
    const r = begin();
    setState({ status: 'loading' });
    const result = await callApi(`/api/export?ids=${encodeURIComponent(id)}`, ExportResponseSchema, undefined, r.signal);
    if (!r.isCurrent()) return;
    if (!result.ok) return setState({ status: 'failed', failure: result });
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `microfire-${id}-evidence.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setState({ status: 'done', data: result.data.catalogSha256 });
  };
  return <div>
    <button className="btn btn-primary" type="button" onClick={() => void run()} disabled={state.status === 'loading'}>
      {state.status === 'loading' ? 'Preparing export…' : 'Export evidence JSON'}
    </button>
    <noscript><p><a href={`/api/export?ids=${id}`}>Open the JSON export</a></p></noscript>
    <div aria-live="polite">
      {state.status === 'done' && <p className="meta" style={{ marginTop: 10 }}>Downloaded. Pinned to catalog SHA-256 <span className="mono">{state.data.slice(0, 16)}…</span></p>}
      {state.status === 'failed' && <div style={{ marginTop: 10 }}><Failure failure={state.failure} onRetry={() => void run()} /></div>}
    </div>
  </div>;
}

// ---------- Evidence Workstation (Evidence Loom) ----------
type RankData = ReturnType<typeof RankResponseSchema.parse>['data'];
export function Workstation({ sources, claims, coverage }: { sources: SourceRef[]; claims: Record<string, string>; coverage: Coverage }) {
  const [state, setState] = useState<Pending<RankData>>({ status: 'idle' });
  const [preset, setPreset] = useState<{ question: string; values: Record<string, string> } | null>(null);
  // The submitted snapshot travels with its result, so the chain shown always names the question that produced it.
  const [request, setRequest] = useState<Readonly<{ question: string; targetConditions: TargetConditions }> | null>(null);
  const begin = useLatestRequest();
  const run = async (question: string, targetConditions: TargetConditions) => {
    const r = begin();
    const snapshot = Object.freeze({ question, targetConditions: Object.freeze({ ...targetConditions }) });
    setRequest(snapshot);
    setState({ status: 'loading' });
    const result = await callApi('/api/evidence/rank', RankResponseSchema, { ...snapshot, limit: 5 }, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', data: result.data } : { status: 'failed', failure: result });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(String(form.get('question') ?? '').trim(), targetsFrom(form));
  };
  const firstClaim = Object.values(claims)[0];
  const examples = [
    { label: 'What does airflow change? (PMMA)', question: 'What does airflow change?', values: { material: 'PMMA' } },
    ...(firstClaim ? [{ label: 'The recorded B20 observation at 17.4 vol%', question: firstClaim, values: { oxygenPct: '17.4' } }] : [])
  ];
  return <div className="split-3">
    <form className="panel" onSubmit={submit} aria-label="Evidence question">
      <p className="eyebrow">01 · Question and conditions</p>
      <div className="field">
        <label htmlFor="ws-question">Research question</label>
        <textarea id="ws-question" name="question" required maxLength={4000} defaultValue={preset?.question} key={preset?.question ?? ''} placeholder="What does airflow change?" />
      </div>
      <ConditionFields prefix="ws" values={preset?.values} />
      <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{state.status === 'loading' ? 'Trace again (replaces pending)' : 'Trace the evidence'}</button>
      <p className="meta" style={{ marginTop: 14 }}>Try an example:</p>
      <ul className="suggest">{examples.map((ex) => <li key={ex.label}><button type="button" onClick={() => { setPreset(ex); void run(ex.question, Object.fromEntries(Object.entries(ex.values).map(([k, v]) => [k, k === 'material' ? v : Number(v)]))); }}>{ex.label}</button></li>)}</ul>
    </form>
    <section aria-labelledby="ws-results" aria-busy={state.status === 'loading'} aria-live="polite">
      <h2 id="ws-results" className="sr-only">Evidence chain</h2>
      {state.status === 'idle' && <div className="loom" aria-label="How the evidence chain reads">
        <div><p className="step">01 · Conditions</p><h3>What was controlled</h3><p className="meta">Which of your target conditions the record matches, differs on, or never recorded.</p></div>
        <div><p className="step">02 · Observation</p><h3>What was recorded</h3><p className="meta">Only a cited source claim can support an outcome. A matching field is not proof.</p></div>
        <div><p className="step">03 · Limits</p><h3>Where confidence ends</h3><p className="meta">Every answer carries the record&apos;s canonical limitations.</p></div>
      </div>}
      {state.status !== 'idle' && request && <dl className="facts request-echo" data-testid="ws-request">
        <div><dt>{state.status === 'loading' ? 'Tracing' : 'Question'}</dt><dd>“{request.question.length > 280 ? `${request.question.slice(0, 280)}…` : request.question}”</dd></div>
        <div><dt>Target conditions</dt><dd>{Object.entries(request.targetConditions).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'}</dd></div>
      </dl>}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={request ? () => void run(request.question, request.targetConditions) : undefined} />}
      {state.status === 'done' && <div className="stack">
        <p className="meta">Ranking {state.data.rankingVersion} · scores are retrieval relevance, not fire risk, safety or scientific confidence.</p>
        {state.data.items.length === 0 && <div className="notice" data-tone="info"><p>No admitted record matched. Absence from this catalog is not evidence that a condition was never studied.</p></div>}
        {state.data.items.map((item) => <article key={item.experimentId} className="stack">
          <div className="results-meta" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}><Link href={`/experiments/${item.experimentId}`}>{item.experimentId}</Link></h3>
            <span className="score"><span aria-hidden="true">Retrieval relevance</span> <meter min={0} max={1} value={item.relevanceScore} aria-label={`Retrieval relevance ${item.relevanceScore.toFixed(2)} of 1, a word-and-condition match score, not evidence strength`}>{item.relevanceScore}</meter> <span aria-hidden="true">{item.relevanceScore.toFixed(2)}</span></span>
          </div>
          <div className="loom">
            <div><p className="step">01 · Conditions</p><ul>
              {item.matchedFields.map((f) => <li key={`m-${f}`}>✓ matches {f}</li>)}
              {item.mismatches.map((f) => <li key={`x-${f}`}>≠ {f}</li>)}
              {item.missingFields.map((f) => <li key={`u-${f}`}>? {f} not recorded</li>)}
              {!item.matchedFields.length && !item.mismatches.length && !item.missingFields.length && <li>No target conditions given</li>}
            </ul></div>
            <div><p className="step">02 · Observation</p>
              <p><Kind kind={item.support.kind} /> <span className="meta">evidence level: {item.evidenceLevel}</span></p>
              {item.support.claimId ? <p>{Object.hasOwn(claims, item.support.claimId) ? claims[item.support.claimId] : item.support.claimId}</p>
                : <p className="meta">No exact cited observation supports this question. A high relevance score does not show the outcome was measured.</p>}
              {item.support.citations.length > 0 && <CitationList citations={item.support.citations} sources={sources} />}
            </div>
            <div><p className="step">03 · Limits</p><Limitations items={item.limitations} title="Limitations" /></div>
          </div>
          <details className="disclose"><summary>Why this score</summary><ul>{item.reasons.map((r) => <li key={r}>{r}</li>)}</ul></details>
        </article>)}
      </div>}
    </section>
    <aside className="panel legend" aria-label="Evidence status key">
      <p className="eyebrow">Evidence status</p>
      <div><Kind kind="observed" /><p>Recorded in a cited source.</p></div>
      <div><Kind kind="derived" /><p>Computed from recorded values (e.g. unit conversion).</p></div>
      <div><Kind kind="interpretation" /><p>A reading of the evidence; needs its own citation.</p></div>
      <div><Kind kind="unsupported" /><p>Not established by an exact cited claim.</p></div>
      <CoverageNote coverage={state.status === 'done' ? state.data.coverage : coverage} />
    </aside>
  </div>;
}

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

// ---------- Comparison probe ----------
export function CompareProbe({ admittedId }: { admittedId: string }) {
  const [state, setState] = useState<Pending<string>>({ status: 'idle' });
  const [other, setOther] = useState('bass2-b19');
  const begin = useLatestRequest();
  const run = async () => {
    const r = begin();
    setState({ status: 'loading' });
    const result = await callApi('/api/evidence/compare', CompareResponseSchema, { experimentIds: [admittedId, other] }, r.signal);
    if (!r.isCurrent()) return;
    // A successful comparison is impossible with one admitted record; render it plainly if the corpus ever grows.
    setState(result.ok ? { status: 'done', data: `Comparability: ${result.data.comparability}. ${result.data.limitations.join(' ')}` } : { status: 'failed', failure: result });
  };
  return <div className="panel stack">
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="cmp-other">Second record</label>
      <select id="cmp-other" value={other} onChange={(e) => setOther(e.target.value)}>
        <option value="bass2-b19">bass2-b19 — legacy candidate (quarantined)</option>
        <option value="bass2-b16">bass2-b16 — legacy candidate (quarantined)</option>
        <option value="bass2-b21">bass2-b21 — legacy candidate (quarantined)</option>
      </select>
    </div>
    <button className="btn btn-primary btn-sm" type="button" onClick={() => void run()} disabled={state.status === 'loading'}>Request comparison with {admittedId}</button>
    <div aria-live="polite">
      {state.status === 'failed' && (state.failure.status === 404
        ? <div className="notice" role="status"><p><strong>Comparison refused by the evidence service.</strong> {state.failure.message}</p><p>No comparison table is shown, because none can be supported.</p></div>
        : <Failure failure={state.failure} onRetry={() => void run()} />)}
      {state.status === 'done' && <div className="notice" data-tone="info"><p>{state.data}</p></div>}
    </div>
  </div>;
}
