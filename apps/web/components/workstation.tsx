'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IntelligenceResponseSchema, RankResponseSchema, type Coverage, type TargetConditions } from '@microfire/shared';
import { Method, SummaryBlock, TransferAnalysis, type IntelligenceData } from './intelligence-ui';
import { callApi, Failure, useLatestRequest } from './client-api';
import { CitationList, CoverageNote, Kind, Limitations, type SourceRef } from './evidence-ui';
import { ConditionFields, fieldLabel, targetsFrom, withUnit, type Pending } from './tool-kit';

// ---------- Evidence Workstation (Evidence Loom) ----------
type RankItem = ReturnType<typeof RankResponseSchema.parse>['data']['items'][number];
/** Question → Conditions → Evidence → Support → Limitations → Source, lit only where the chain actually holds. Each stage links to its section. */
function ChainRail({ question, item }: { question: string; item: RankItem | undefined }) {
  const supported = !!item && item.support.kind !== 'unsupported';
  const stages: [string, string, 'lit' | 'warn' | 'idle', string][] = [
    ['Question', question.length > 40 ? `${question.slice(0, 40)}…` : question, 'lit', 'ws-request'],
    ['Conditions', !item ? '—' : `${item.matchedFields.length} match · ${item.mismatches.length} differ · ${item.missingFields.length} unrecorded`, !item ? 'idle' : item.mismatches.length || item.missingFields.length ? 'warn' : 'lit', 'ws-match'],
    ['Evidence', item ? item.experimentId : 'No admitted record', item ? 'lit' : 'warn', 'ws-verdict'],
    ['Support', supported ? `${item!.support.kind} · ${item!.evidenceLevel}` : 'Not established', supported ? 'lit' : 'warn', 'ws-verdict'],
    ['Limitations', item ? `${item.limitations.length} attached` : '—', item ? 'lit' : 'idle', 'ws-limits'],
    ['Source', supported && item!.support.citations.length ? `${item!.support.citations.length} citation${item!.support.citations.length === 1 ? '' : 's'}` : 'None for this outcome', supported && item!.support.citations.length ? 'lit' : 'warn', 'ws-verdict']
  ];
  return <ol className="chain-rail compact" aria-label="Evidence chain for the top result" data-testid="chain-rail">
    {stages.map(([label, text, state, target]) => <li key={label} data-state={state}><a href={`#${target}`}><b>{label}</b><span>{text}</span></a></li>)}
  </ol>;
}
const describe = (t: TargetConditions) => Object.entries(t).map(([k, v]) => `${fieldLabel(k)} ${withUnit(k, v)}`).join(' · ') || 'none';

type Environment = 'custom' | 'spacecraft' | 'moon' | 'mars' | 'earth';
const ENVIRONMENTS: [Environment, string][] = [['custom', 'Custom'], ['spacecraft', 'Spacecraft'], ['moon', 'Moon'], ['mars', 'Mars'], ['earth', 'Earth']];
export function Workstation({ sources, claims, coverage }: { sources: SourceRef[]; claims: Record<string, string>; coverage: Coverage }) {
  const [state, setState] = useState<Pending<IntelligenceData>>({ status: 'idle' });
  const [preset, setPreset] = useState<{ question: string; values: Record<string, string>; environment?: Environment } | null>(null);
  // The submitted snapshot travels with its result, so the chain shown always names the question that produced it.
  const [request, setRequest] = useState<Readonly<{ question: string; targetConditions: TargetConditions; environment: Environment }> | null>(null);
  const conditions = useRef<HTMLDetailsElement>(null);
  const begin = useLatestRequest();
  // Optional conditions are folded on phones (question first) and open beside the result on wider screens.
  useEffect(() => { if (conditions.current && matchMedia('(min-width: 901px)').matches) conditions.current.open = true; }, []);
  // scientific-intelligence-v1 (Codex): ranking + source-linked summary + nullable transfer, limit 4 per contract.
  const run = async (question: string, targetConditions: TargetConditions, environment: Environment = 'custom') => {
    const r = begin();
    const snapshot = Object.freeze({ question, targetConditions: Object.freeze({ ...targetConditions }), environment });
    setRequest(snapshot);
    setState({ status: 'loading' });
    const result = await callApi('/api/intelligence', IntelligenceResponseSchema, { ...snapshot, limit: 4 }, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', data: result.data } : { status: 'failed', failure: result });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(String(form.get('question') ?? '').trim(), targetsFrom(form), (String(form.get('environment') ?? 'custom') as Environment));
  };
  const firstClaim = Object.values(claims)[0];
  const examples = [
    { label: 'What does airflow change? (PMMA)', question: 'What does airflow change?', values: { material: 'PMMA' } },
    ...(firstClaim ? [{ label: 'The recorded B20 observation at 17.4 vol%', question: firstClaim, values: { oxygenPct: '17.4' } }] : []),
    ...(firstClaim ? [{ label: 'Would B20 transfer to a Moon habitat?', question: firstClaim, values: { material: 'PMMA', oxygenPct: '26', pressureKpa: '55', gravity: 'lunar' }, environment: 'moon' as Environment }] : []),
    { label: 'Is a lunar habitat fire-safe? (should abstain)', question: 'Can this certify a lunar habitat as fire safe?', values: {}, environment: 'moon' as Environment }
  ];
  return <div className="ws">
    <form className="panel ws-composer" onSubmit={submit} aria-label="Evidence question">
      <div className="field">
        <label htmlFor="ws-question">Research question</label>
        <textarea id="ws-question" name="question" required maxLength={4000} defaultValue={preset?.question} key={preset?.question ?? ''} placeholder="What does airflow change?" />
      </div>
      <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{state.status === 'loading' ? 'Trace again (replaces pending)' : 'Trace the evidence'}</button>
      <p className="meta" style={{ margin: '12px 0 0' }}>Try an example:</p>
      <ul className="suggest">{examples.map((ex) => <li key={ex.label}><button type="button" onClick={() => { setPreset(ex); void run(ex.question, Object.fromEntries(Object.entries(ex.values).map(([k, v]) => [k, k === 'material' || k === 'gravity' || k === 'geometry' ? v : Number(v)])), 'environment' in ex ? ex.environment : 'custom'); }}>{ex.label}</button></li>)}</ul>
      <details className="ws-conditions" ref={conditions}>
        <summary>Target conditions <span>(optional)</span></summary>
        <div className="field"><label htmlFor="ws-environment">Scenario environment</label>
          <select id="ws-environment" name="environment" defaultValue={preset?.environment ?? 'custom'} key={preset?.environment ?? 'custom'}>{ENVIRONMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <small>Labels your scenario. MicroFire inserts no hidden Moon or Mars values; enter the conditions you want compared.</small></div>
        <ConditionFields prefix="ws" values={preset?.values} />
        <button className="btn btn-quiet btn-sm" type="submit">Trace with these conditions</button>
      </details>
    </form>
    <section className="ws-result" aria-labelledby="ws-results" aria-busy={state.status === 'loading'} aria-live="polite">
      <h2 id="ws-results" className="sr-only">Evidence chain</h2>
      {state.status === 'idle' && <div className="panel answer-placeholder">
        <p className="eyebrow">Your traced result appears here</p>
        <ol className="loom-steps">
          <li><b>Support first.</b> Only an exact cited observation can support an outcome; a matching condition is not proof.</li>
          <li><b>Conditions.</b> Which of your targets the record matches, differs on, or does not record.</li>
          <li><b>Limits.</b> Every result carries the record&apos;s canonical limitations and its NASA page.</li>
        </ol>
        <CoverageNote coverage={coverage} />
      </div>}
      {state.status !== 'idle' && request && <dl className="facts request-echo" id="ws-request" data-testid="ws-request">
        <div><dt>{state.status === 'loading' ? 'Tracing' : 'Question'}</dt><dd>“{request.question.length > 280 ? `${request.question.slice(0, 280)}…` : request.question}”</dd></div>
        <div><dt>Target conditions</dt><dd>{describe(request.targetConditions)}{request.environment !== 'custom' ? ` · ${request.environment} scenario` : ''}</dd></div>
      </dl>}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={request ? () => void run(request.question, request.targetConditions, request.environment) : undefined} />}
      {state.status === 'done' && request && <ChainRail question={request.question} item={state.data.ranking.items[0]} />}
      {state.status === 'done' && <div className="stack">
        <h3 className="ws-section">1 · Ranked NASA evidence</h3>
        {state.data.ranking.items.length === 0 && <div className="notice" data-tone="info"><p>No admitted record matched. Absence from this catalog is not evidence that a condition was never studied.</p></div>}
        {state.data.ranking.items.map((item, i) => {
          const supported = item.support.kind !== 'unsupported' && !!item.support.claimId;
          return <article key={item.experimentId} className="ws-item" data-supported={supported}>
            <div className="verdict" id={i === 0 ? 'ws-verdict' : undefined}>
              <p className="eyebrow">Admitted record · <Link href={`/experiments/${item.experimentId}`}>{item.experimentId}</Link></p>
              <h3>{supported ? 'Supported by this exact observation' : 'Outcome not established'}</h3>
              <p><Kind kind={item.support.kind} /> <span className="meta">evidence level: {item.evidenceLevel}</span></p>
              {item.support.claimId ? <blockquote>{Object.hasOwn(claims, item.support.claimId) ? claims[item.support.claimId] : item.support.claimId}</blockquote>
                : <p className="meta">No exact cited observation supports this question. A high relevance score does not show the outcome was measured.</p>}
              {item.support.citations.length > 0 && <CitationList citations={item.support.citations} sources={sources} />}
              <details className="disclose"><summary>What the evidence labels mean</summary>
                <ul className="legend-list">
                  <li><Kind kind="observed" /> Recorded in a cited source.</li>
                  <li><Kind kind="derived" /> Computed from recorded values (e.g. unit conversion).</li>
                  <li><Kind kind="interpretation" /> A reading of the evidence; needs its own citation.</li>
                  <li><Kind kind="unsupported" /> Not established by an exact cited claim.</li>
                </ul>
              </details>
            </div>
            <div className="ws-match" id={i === 0 ? 'ws-match' : undefined}>
              <p className="step">Your conditions against this record</p>
              <ul>
                {item.matchedFields.map((f) => <li key={`m-${f}`} data-m="match"><span aria-hidden="true">✓</span> {fieldLabel(f)} matches</li>)}
                {item.mismatches.map((f) => <li key={`x-${f}`} data-m="differ"><span aria-hidden="true">≠</span> {fieldLabel(f)} differs</li>)}
                {item.missingFields.map((f) => <li key={`u-${f}`} data-m="unrecorded"><span aria-hidden="true">?</span> {fieldLabel(f)} not recorded</li>)}
                {!item.matchedFields.length && !item.mismatches.length && !item.missingFields.length && <li>No target conditions given</li>}
              </ul>
            </div>
            <div id={i === 0 ? 'ws-limits' : undefined}><Limitations items={item.limitations} title="Limitations" /></div>
            <div className="results-meta" style={{ alignItems: 'center' }}>
              <span className="score"><span aria-hidden="true">Retrieval relevance</span> <meter min={0} max={1} value={item.relevanceScore} aria-label={`Retrieval relevance ${item.relevanceScore.toFixed(2)} of 1, a word-and-condition match score, not evidence strength`}>{item.relevanceScore}</meter> <span aria-hidden="true">{item.relevanceScore.toFixed(2)}</span></span>
              <span>Ranking {state.data.ranking.rankingVersion} · scores are retrieval relevance, not fire risk, safety or scientific confidence.</span>
            </div>
            <details className="disclose" open><summary>Why it ranks here</summary><ul>{item.reasons.map((r) => <li key={r}>{r}</li>)}</ul></details>
          </article>;
        })}
        <h3 className="ws-section">2 · Source-linked summary</h3>
        <SummaryBlock summary={state.data.summary} sources={sources} />
        <h3 className="ws-section">3 · Does it apply to your scenario?</h3>
        <TransferAnalysis transfer={state.data.transfer} note={state.data.transferNote} sources={sources} />
        <CoverageNote coverage={state.data.ranking.coverage} />
        <Method data={state.data} />
      </div>}
    </section>
  </div>;
}
