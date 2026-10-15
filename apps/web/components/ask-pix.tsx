'use client';
import { useRef, useState, type FormEvent } from 'react';
import { AskResponseSchema, type TargetConditions } from '@microfire/shared';
import { callApi, Failure, useLatestRequest, type ApiFailure } from './client-api';
import { CitationList, Kind, Limitations, type SourceRef } from './evidence-ui';

type AskData = ReturnType<typeof AskResponseSchema.parse>['data'];
/** The submitted request is frozen: its echo, response, failure and retry all refer to this exact snapshot. */
type AskRequest = Readonly<{ question: string; targetConditions: Readonly<TargetConditions> }>;
type State = { status: 'idle' } | { status: 'loading'; request: AskRequest } | { status: 'done'; request: AskRequest; data: AskData } | { status: 'failed'; request: AskRequest; failure: ApiFailure };

const abstentionTitles: Record<string, string> = {
  'unsupported-intent': 'Outside what this evidence can support',
  'no-relevant-evidence': 'No admitted record matches',
  'quarantined-record': 'That record is quarantined',
  'citation-verification-failed': 'Citations could not be verified'
};
const categoryOrder = ['direct-observation', 'supported-derivation', 'scientific-interpretation', 'analogous-or-mechanistic', 'unknown-or-gap'];
const suggestions = ['What does B20 establish about airflow?', 'What is the flame temperature in B20?', 'What happened in B19?', 'Can this certify a lunar habitat?'];
const echo = (q: string) => (q.length > 280 ? `${q.slice(0, 280)}… (${q.length} characters)` : q);
const describeConditions = (t: TargetConditions) => {
  const parts = [t.material && `material ${t.material}`, t.oxygenPct !== undefined && `oxygen ${t.oxygenPct} vol%`].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'none';
};

export function PixMark() {
  return <svg viewBox="0 0 56 56" aria-hidden="true">
    <line x1="28" y1="4" x2="28" y2="12" stroke="#73bbd9" strokeWidth="2" /><circle cx="28" cy="4" r="3" fill="#ff8738" />
    <rect x="8" y="12" width="40" height="32" rx="12" fill="#182431" stroke="#73bbd9" strokeWidth="2" />
    <rect x="14" y="20" width="28" height="14" rx="7" fill="#0b111a" />
    <circle cx="22" cy="27" r="3" fill="#9fe3e3" /><circle cx="34" cy="27" r="3" fill="#9fe3e3" />
    <path d="M20 50h16" stroke="#73bbd9" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

export function AskPix({ sources }: { sources: SourceRef[] }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const begin = useLatestRequest();

  const ask = async (request: AskRequest) => {
    const r = begin();
    setState({ status: 'loading', request });
    const result = await callApi('/api/ask', AskResponseSchema, request, r.signal);
    if (!r.isCurrent()) return; // superseded or unmounted: never let an older response replace a newer one
    setState(result.ok ? { status: 'done', request, data: result.data } : { status: 'failed', request, failure: result });
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
  // Suggestions submit through the form, so they carry the visible target conditions rather than silently dropping them.
  const suggest = (q: string) => { if (input.current) input.current.value = q; form.current?.requestSubmit(); };

  return <div className="pix-console">
    <div>
      <div className="pix-id"><PixMark /><div><strong>PIX</strong><p>Deterministic evidence guide · fixed templates over the admitted catalog · no AI model</p></div></div>
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
      <p className="meta" style={{ marginTop: 18, marginBottom: 0 }}>Questions that show each behaviour (sent with any target conditions above):</p>
      <ul className="suggest">{suggestions.map((q) => <li key={q}><button type="button" onClick={() => suggest(q)}>{q}</button></li>)}</ul>
    </div>
    <section aria-labelledby="pix-answer-title" aria-live="polite" aria-busy={state.status === 'loading'}>
      <h2 id="pix-answer-title" className="sr-only">PIX response</h2>
      {state.status === 'idle' && <div className="panel"><p className="eyebrow">How PIX answers</p>
        <p>Each statement is labelled as a direct observation, supported derivation, interpretation, analogy or gap, and carries its source page. If the catalog cannot support an answer, PIX says so and explains why. That is a correct result, not a failure.</p></div>}
      {state.status !== 'idle' && <dl className="facts request-echo" data-testid="pix-request">
        <div><dt>{state.status === 'loading' ? 'Checking' : 'You asked'}</dt><dd>“{echo(state.request.question)}”</dd></div>
        <div><dt>Target conditions</dt><dd data-testid="pix-request-conditions">{describeConditions(state.request.targetConditions)}</dd></div>
      </dl>}
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={() => void ask(state.request)} />}
      {state.status === 'done' && (state.data.abstained
        ? <div className="panel answer" data-abstained="" data-testid="pix-abstention">
          <p className="eyebrow" style={{ color: 'var(--amber-ink)' }}>PIX withheld an answer · {state.data.code}</p>
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
      {state.status === 'done' && <p className="meta" style={{ marginTop: 14 }}>
        Retrieval {state.data.retrievalVersion} · dataset {state.data.datasetVersion}. Assembled from catalog statements by a fixed template; no AI model was used. Citation checks confirm source lineage, not scientific truth.
      </p>}
    </section>
  </div>;
}
