'use client';
import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AskResponseSchema, IntelligenceResponseSchema, type TargetConditions } from '@microfire/shared';
import { TransferAnalysis, type IntelligenceData } from './intelligence-ui';
import { callApi, Failure, useLatestRequest, type ApiFailure } from './client-api';
import { CitationList, Kind, Limitations, type SourceRef } from './evidence-ui';
import type { PixState } from './pix-avatar';
import { PixStage } from './pix-stage';

type AskData = ReturnType<typeof AskResponseSchema.parse>['data'];
/** The submitted request is frozen: its echo, response, failure and retry all refer to this exact snapshot. */
type AskRequest = Readonly<{ question: string; targetConditions: Readonly<TargetConditions> }>;
/** `intel` is the scientific-intelligence-v1 result when that endpoint answered; null means the labelled /api/ask fallback ran. */
type State = { status: 'idle' } | { status: 'loading'; request: AskRequest } | { status: 'done'; request: AskRequest; data: AskData; intel: IntelligenceData | null }
  | { status: 'failed'; request: AskRequest; failure: ApiFailure };
/** Endpoint unavailable (not deployed, unreachable or server fault): fall back. A 400/413/415/429 is a real answer about the request and is shown as-is. */
const unavailable = (f: ApiFailure) => f.status === 0 || f.status === 404 || f.status >= 500;

const abstentionTitles: Record<string, string> = {
  'unsupported-intent': 'Outside what this evidence can support',
  'no-relevant-evidence': 'No admitted record matches',
  'quarantined-record': 'That record is quarantined',
  'citation-verification-failed': 'Citations could not be verified'
};
const categoryOrder = ['direct-observation', 'supported-derivation', 'scientific-interpretation', 'analogous-or-mechanistic', 'unknown-or-gap'];
// The exact prompts the deterministic guide supports today, grouped by what each one shows in plain words.
const suggestions: [string, string[]][] = [
  ['What was observed?', ['What does B20 establish about airflow?']],
  ['What is not known?', ['What is the flame temperature in B20?']],
  ['Where PIX stops', ['What happened in B19?', 'Can this certify a lunar habitat?']]
];
const pixStatus: Record<PixState, string> = {
  idle: 'Ready', searching: 'Checking the admitted catalog…', cited: 'Found cited statements',
  abstained: 'Withholding an answer', error: 'Could not reach the evidence service'
};
const echo = (q: string) => (q.length > 280 ? `${q.slice(0, 280)}… (${q.length} characters)` : q);
const describeConditions = (t: TargetConditions) => {
  const parts = [t.material && `material ${t.material}`, t.oxygenPct !== undefined && `oxygen ${t.oxygenPct} vol%`].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'none';
};

export function AskPix({ sources }: { sources: SourceRef[] }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const begin = useLatestRequest();

  const ask = async (request: AskRequest) => {
    const r = begin();
    setState({ status: 'loading', request });
    const intel = await callApi('/api/intelligence', IntelligenceResponseSchema, { ...request, environment: 'custom', limit: 4 }, r.signal);
    if (!r.isCurrent()) return; // superseded or unmounted: never let an older response replace a newer one
    if (intel.ok) return setState({ status: 'done', request, data: intel.data.summary, intel: intel.data });
    if (!unavailable(intel)) return setState({ status: 'failed', request, failure: intel });
    const result = await callApi('/api/ask', AskResponseSchema, request, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', request, data: result.data, intel: null } : { status: 'failed', request, failure: result });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const question = String(data.get('question') ?? '').trim();
    if (!question) return input.current?.focus();
    const material = String(data.get('material') ?? '').trim();
    const oxygen = String(data.get('oxygenPct') ?? '').trim();
    void ask(Object.freeze({ question, targetConditions: Object.freeze({
      ...(material ? { material } : {}), ...(oxygen && Number.isFinite(Number(oxygen)) ? { oxygenPct: Number(oxygen) } : {})
    }) }));
  };
  // Interface state only: what PIX is doing with the deterministic API, not a reasoning ability.
  const pixState: PixState = state.status === 'loading' ? 'searching' : state.status === 'failed' ? 'error'
    : state.status === 'done' ? (state.data.abstained ? 'abstained' : 'cited') : 'idle';
  // Suggestions submit through the form, so they carry the visible target conditions rather than silently dropping them.
  const suggest = (q: string) => { if (input.current) input.current.value = q; form.current?.requestSubmit(); };

  return <div className="pix-console">
    <div>
      <div className="pix-panel" data-testid="pix-panel">
        <PixStage state={pixState} />
        <div><strong>PIX</strong><p>Fixed-template catalog guide · no AI model</p>
          <p className="pix-status" aria-hidden="true">{pixStatus[pixState]}</p></div>
      </div>
      <form ref={form} onSubmit={submit} aria-label="Ask PIX">
        <div className="field">
          <label htmlFor="pix-q">Your research question</label>
          <textarea ref={input} id="pix-q" name="question" required maxLength={4000} placeholder="What does B20 establish about airflow?" />
          <small>PIX answers only from cited catalog statements and withholds an answer when the evidence cannot support one.</small>
        </div>
        <details className="disclose">
          <summary>Add target conditions (optional)</summary>
          <div className="fieldset-grid">
            <div className="field"><label htmlFor="pix-material">Material</label><input id="pix-material" name="material" maxLength={200} placeholder="e.g. PMMA" /></div>
            <div className="field"><label htmlFor="pix-o2">Oxygen (vol%)</label><input id="pix-o2" name="oxygenPct" type="number" min={0} max={100} step="any" /></div>
          </div>
        </details>
        <button className="btn btn-primary" type="submit">{state.status === 'loading' ? 'Ask again (replaces the pending question)' : 'Ask PIX'}</button>
      </form>
      <div className="examples">
        <p className="meta">Try a question <span>(uses any target conditions you added)</span></p>
        <ul className="example-groups">{suggestions.map(([label, qs]) => <li key={label}>
          <span className="example-tag">{label}</span>
          <div className="suggest">{qs.map((q) => <button key={q} type="button" onClick={() => suggest(q)}>{q}</button>)}</div>
        </li>)}</ul>
      </div>
    </div>
    <section aria-labelledby="pix-answer-title" aria-live="polite" aria-busy={state.status === 'loading'}>
      <h2 id="pix-answer-title" className="sr-only">PIX response</h2>
      {state.status === 'idle' && <div className="panel answer-placeholder"><p className="eyebrow">Your answer appears here</p>
        <p>Each statement is labelled as a direct observation, supported derivation, interpretation, analogy or gap, and carries its source page. If the catalog cannot support an answer, PIX says so and explains why. That is a correct result, not a failure.</p></div>}
      {state.status !== 'idle' && <dl className="facts request-echo" data-testid="pix-request">
        <div><dt>{state.status === 'loading' ? 'Checking' : 'You asked'}</dt><dd>“{echo(state.request.question)}”</dd></div>
        <div><dt>Target conditions</dt><dd data-testid="pix-request-conditions">{describeConditions(state.request.targetConditions)}</dd></div>
      </dl>}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={() => void ask(state.request)} />}
      {state.status === 'done' && (state.data.abstained
        ? <div className="panel answer" data-abstained="" data-testid="pix-abstention">
          <p className="eyebrow" style={{ color: 'var(--k-gap)' }}>PIX withheld an answer · {state.data.code}</p>
          <h3>{abstentionTitles[state.data.code]}</h3>
          <p style={{ overflowWrap: 'anywhere' }}>{state.data.reason}</p>
          {state.data.citations.length > 0 && <CitationList citations={state.data.citations} sources={sources} />}
          <p className="meta">Withholding is the correct outcome when the admitted evidence cannot support an answer. Nothing was generated in its place.</p>
        </div>
        : <div className="panel answer" data-testid="pix-answer">
          <p className="eyebrow">Grounded answer · {state.data.statements.length} statement{state.data.statements.length === 1 ? '' : 's'}</p>
          {[...state.data.statements].sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)).map((s, i) => <div className="statement" key={`${s.category}-${i}`}>
            <Kind kind={s.category} />
            <p>{s.text}</p>
            {s.citations.length > 0 && <CitationList citations={s.citations} sources={sources} />}
          </div>)}
          <Limitations items={state.data.limitations} />
        </div>)}
      {state.status === 'done' && state.intel && <div className="stack" style={{ marginTop: 14 }}>
        {state.intel.ranking.items[0] && (() => { const top = state.intel.ranking.items[0]; return <div className="panel pix-source" data-testid="pix-source">
          <p className="eyebrow" style={{ margin: 0 }}>Source experiment</p>
          <p style={{ margin: '4px 0' }}><Link href={`/experiments/${top.experimentId}`}>{top.experimentId}</Link> · {top.support.kind === 'unsupported' ? 'related record; no cited observation supports this exact question' : `supported by a ${top.support.kind} statement (${top.evidenceLevel})`}</p>
          <details className="disclose"><summary>Why this record is relevant</summary><ul>{top.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="meta">Retrieval relevance {top.relevanceScore.toFixed(2)}: a word-and-condition match score, not fire risk, safety or scientific confidence.</p></details>
        </div>; })()}
        <TransferAnalysis transfer={state.intel.transfer} note={state.intel.transferNote} sources={sources} />
      </div>}
      {state.status === 'done' && <p className="meta" style={{ marginTop: 14 }} data-testid="pix-method">
        {state.intel ? <>Method: scientific intelligence API ({state.intel.intelligenceVersion}), deterministic source templates; no AI model was used.</> : <>Method: catalog-template fallback (/api/ask) because the intelligence service was unavailable. Deterministic; no AI model was used.</>}{' '}
        Retrieval {state.data.retrievalVersion} · dataset {state.data.datasetVersion}. Citation checks confirm source lineage, not scientific truth.
      </p>}
    </section>
  </div>;
}
