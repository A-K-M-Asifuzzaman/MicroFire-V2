'use client';
// Evidence Transferability Analyzer: renders the verified POST /api/evidence/frontier result (Codex, ranking v3).
// The server classifies; this component only explains it. Relevance is retrieval relevance, never fire risk or safety.
import Link from 'next/link';
import { useState } from 'react';
import { FrontierResponseSchema, type TargetConditions } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import { ConditionFields, targetsFrom, type Pending } from './tool-kit';

type Data = ReturnType<typeof FrontierResponseSchema.parse>['data'];
const VERDICT: Record<Data['classification'], { title: string; body: string; tone: string }> = {
  'evidence-present': { title: 'A NASA observation speaks to this', tone: 'mint',
    body: 'An admitted record holds a direct, cited observation relevant to your question. It still applies only to the conditions that record documents.' },
  'conditions-differ': { title: 'Evidence exists, under different conditions', tone: 'sun',
    body: 'The catalog documents related tests, but at least one condition you named was recorded at a different value. Transfer to your case is not established.' },
  'measurement-missing': { title: 'The record does not measure what you asked', tone: 'sun',
    body: 'A condition you named was not recorded for the related test, so its effect cannot be judged from this evidence.' },
  'related-evidence-only': { title: 'Related evidence only', tone: 'lav',
    body: 'Records relate to your question, but none directly supports the outcome you asked about.' },
  'not-in-audited-catalog': { title: 'Not in the audited catalog', tone: 'coral',
    body: 'Nothing admitted matches. That is a limit of this catalog, not proof that NASA never studied it.' },
};
const EXAMPLES = [
  { label: 'The recorded B20 observation', question: 'The B20 observation log reports that the flame burned the entire sample.', values: { oxygenPct: '17.4' } },
  { label: 'A lunar habitat question', question: 'Would a PMMA panel burn completely in a lunar habitat?', values: { material: 'PMMA', gravity: 'lunar', oxygenPct: '26', pressureKpa: '55' } },
] as const;
const chip = (kind: 'match' | 'differ' | 'missing', text: string) => <li key={kind + text} data-kind={kind}><span aria-hidden="true">{kind === 'match' ? '✓' : kind === 'differ' ? '≠' : '?'}</span> {text}<span className="sr-only">{kind === 'match' ? ' (matches)' : kind === 'differ' ? ' (recorded at a different value)' : ' (not recorded)'}</span></li>;

export function TransferabilityAnalyzer({ sourceTitles }: { sourceTitles: Record<string, string> }) {
  const [state, setState] = useState<Pending<Data>>({ status: 'idle' });
  const [example, setExample] = useState<(typeof EXAMPLES)[number] | null>(null);
  const begin = useLatestRequest();
  const run = async (question: string, targetConditions: TargetConditions) => {
    const r = begin();
    if (!question.trim()) return setState({ status: 'failed', failure: { ok: false, status: 400, message: 'Ask a question to analyse.', retryAfter: null } });
    setState({ status: 'loading' });
    const result = await callApi('/api/evidence/frontier', FrontierResponseSchema, { question: question.trim(), targetConditions, limit: 5 }, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', data: result.data } : { status: 'failed', failure: result });
  };
  return <section className="transfer" aria-labelledby="transfer-title" data-testid="transferability">
    <div className="transfer-head">
      <p className="eyebrow">Evidence Transferability Analyzer</p>
      <h2 id="transfer-title">Does this NASA evidence transfer to your case?</h2>
      <p className="lede">Describe your question and conditions. MicroFire checks each admitted record: what matches, what differs, what was never recorded, and whether a cited observation actually supports your outcome.</p>
    </div>
    <div className="split">
      <form className="panel" aria-label="Question and conditions to analyse" key={example?.label ?? 'blank'}
        onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(String(f.get('question') ?? ''), targetsFrom(f)); }}>
        <div className="field"><label htmlFor="tr-question">Your question</label><textarea id="tr-question" name="question" rows={3} required maxLength={500} defaultValue={example?.question ?? ''} placeholder="e.g. Would this material burn completely in my habitat?" /></div>
        <ConditionFields prefix="tr" values={example?.values} />
        <div className="actions">
          <button className="btn btn-primary btn-sm" type="submit">Analyse transfer</button>
          {EXAMPLES.map((x) => <button key={x.label} className="btn btn-quiet btn-sm" type="button" onClick={() => {
            setExample(x); const v = x.values as Partial<Record<string, string>>;
            void run(x.question, { ...(v.material ? { material: v.material } : {}), ...(v.gravity ? { gravity: v.gravity } : {}), ...(v.oxygenPct ? { oxygenPct: Number(v.oxygenPct) } : {}), ...(v.pressureKpa ? { pressureKpa: Number(v.pressureKpa) } : {}) });
          }}>{x.label}</button>)}
        </div>
      </form>
      <div aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <div className="notice" data-tone="info"><p>Try “A lunar habitat question”: it shows why a real NASA observation does not automatically transfer to a different gravity, oxygen level and pressure.</p></div>}
        {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
        {state.status === 'failed' && <Failure failure={state.failure} />}
        {state.status === 'done' && <Result data={state.data} sourceTitles={sourceTitles} />}
      </div>
    </div>
  </section>;
}

function Result({ data, sourceTitles }: { data: Data; sourceTitles: Record<string, string> }) {
  const v = VERDICT[data.classification];
  return <div className="stack">
    <div className="transfer-verdict" data-tone={v.tone} data-classification={data.classification} role="status">
      <p className="eyebrow" style={{ margin: 0 }}>Verdict for the audited catalog</p>
      <h3>{v.title}</h3><p>{v.body}</p>
    </div>
    {data.items.map((item) => <article key={item.experimentId} className="panel transfer-item">
      <p className="eyebrow" style={{ margin: 0 }}>Admitted record · <Link href={`/experiments/${item.experimentId}`}>{item.experimentId}</Link></p>
      <p className="transfer-support"><b>{item.support.kind === 'unsupported' ? 'No cited observation supports this outcome.' : `Supported by a ${item.support.kind} statement`}</b>{item.support.kind !== 'unsupported' && ` · evidence level: ${item.evidenceLevel}`}</p>
      <ul className="transfer-chips" aria-label="How your conditions compare">
        {item.matchedFields.map((t) => chip('match', t))}{item.mismatches.map((t) => chip('differ', t))}{item.missingFields.map((t) => chip('missing', t))}
      </ul>
      <details className="disclose" open><summary>Why it ranks here</summary><ul>{item.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="meta">Retrieval relevance {item.relevanceScore.toFixed(2)}: how well the record matches your words and conditions. Not fire risk, safety or scientific confidence.</p></details>
      <p className="meta">Source{item.sourceIds.length > 1 ? 's' : ''}: {item.sourceIds.map((id, i) => <span key={id}>{i ? '; ' : ''}<Link href="/sources">{sourceTitles[id] ?? id}</Link></span>)}</p>
    </article>)}
    <div className="notice" data-tone="caution"><p className="eyebrow" style={{ margin: 0 }}>Limits of this analysis</p><ul>{data.limitations.map((l) => <li key={l}>{l}</li>)}</ul></div>
  </div>;
}
