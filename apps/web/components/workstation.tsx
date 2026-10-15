'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { RankResponseSchema, type Coverage, type TargetConditions } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import { CitationList, CoverageNote, Kind, Limitations, type SourceRef } from './evidence-ui';
import { ConditionFields, targetsFrom, type Pending } from './tool-kit';

// ---------- Evidence Workstation (Evidence Loom) ----------
type RankItem = ReturnType<typeof RankResponseSchema.parse>['data']['items'][number];
/** Question → Conditions → Evidence → Support → Limitations → Source, lit only where the chain actually holds. */
function ChainRail({ question, item }: { question: string; item: RankItem | undefined }) {
  const supported = !!item && item.support.kind !== 'unsupported';
  const stages: [string, string, 'lit' | 'warn' | 'idle'][] = [
    ['Question', question.length > 40 ? `${question.slice(0, 40)}…` : question, 'lit'],
    ['Conditions', !item ? '—' : `${item.matchedFields.length} match · ${item.mismatches.length} differ · ${item.missingFields.length} unrecorded`, !item ? 'idle' : item.mismatches.length || item.missingFields.length ? 'warn' : 'lit'],
    ['Evidence', item ? item.experimentId : 'No admitted record', item ? 'lit' : 'warn'],
    ['Support', supported ? `${item!.support.kind} · ${item!.evidenceLevel}` : 'Not established', supported ? 'lit' : 'warn'],
    ['Limitations', item ? `${item.limitations.length} attached` : '—', item ? 'lit' : 'idle'],
    ['Source', supported && item!.support.citations.length ? `${item!.support.citations.length} citation${item!.support.citations.length === 1 ? '' : 's'}` : 'None for this outcome', supported && item!.support.citations.length ? 'lit' : 'warn']
  ];
  return <ol className="chain-rail" aria-label="Evidence chain for the top result" data-testid="chain-rail">
    {stages.map(([label, text, state]) => <li key={label} data-state={state}><b>{label}</b><span>{text}</span></li>)}
  </ol>;
}

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
      {state.status === 'done' && request && <ChainRail question={request.question} item={state.data.items[0]} />}
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

