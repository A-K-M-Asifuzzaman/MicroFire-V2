'use client';
// Citation Checker: asks the backend verifier (POST /api/investigations/verify, Codex investigation-library-v1) whether
// a locator matches what the investigation's source declares. The verdict and issues are the server's; the scope is
// lineage only, never scientific truth. Editing a field lets a reader test a wrong page or section honestly.
import { useState } from 'react';
import { InvestigationCitationResponseSchema, type Citation } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import { CitationList, type SourceRef } from './evidence-ui';
import type { Pending } from './tool-kit';

type Result = ReturnType<typeof InvestigationCitationResponseSchema.parse>['data'];
type Locator = { kind: string; page?: number; printedPage?: string; section?: string };

export function CitationChecker({ investigationId, declared, sources }: { investigationId: string; declared: { label: string; citation: Citation }[]; sources: SourceRef[] }) {
  const [pick, setPick] = useState(0);
  const base = declared[pick]!.citation, loc = base.locator as Locator;
  const [page, setPage] = useState<string>(loc.page !== undefined ? String(loc.page) : '');
  const [section, setSection] = useState<string>(loc.section ?? '');
  const [state, setState] = useState<Pending<Result>>({ status: 'idle' });
  const [checked, setChecked] = useState<Citation | null>(null);
  const begin = useLatestRequest();
  const choose = (n: number) => { const l = declared[n]!.citation.locator as Locator; setPick(n); setPage(l.page !== undefined ? String(l.page) : ''); setSection(l.section ?? ''); setState({ status: 'idle' }); };
  const verify = async () => {
    const r = begin();
    const locator: Locator = { ...loc, ...(loc.page !== undefined ? { page: Number(page) } : {}), ...(loc.section !== undefined ? { section } : {}) };
    const citation = { ...base, locator } as Citation;
    setChecked(citation); setState({ status: 'loading' });
    const result = await callApi('/api/investigations/verify', InvestigationCitationResponseSchema, { investigationId, citations: [citation] }, r.signal);
    if (!r.isCurrent()) return;
    setState(result.ok ? { status: 'done', data: result.data } : { status: 'failed', failure: result });
  };
  return <section className="panel checker" aria-labelledby="checker-title" data-testid="citation-checker">
    <h2 id="checker-title">Citation Checker</h2>
    <p className="meta">Check whether a reference points exactly where this investigation&apos;s source says. Edit the page or section to test another reference.</p>
    <fieldset className="checker-pick"><legend>Reference to check</legend>
      {declared.map((d, n) => <label key={d.label}><input type="radio" name="checker-pick" checked={pick === n} onChange={() => choose(n)} /> {d.label}</label>)}
    </fieldset>
    {loc.page !== undefined && <div className="field"><label htmlFor="checker-page">PDF page</label><input id="checker-page" type="number" min={1} value={page} onChange={(e) => setPage(e.target.value)} /></div>}
    {loc.section !== undefined && <div className="field"><label htmlFor="checker-section">Section</label><input id="checker-section" type="text" maxLength={300} value={section} onChange={(e) => setSection(e.target.value)} /></div>}
    <button className="btn btn-primary" type="button" onClick={() => void verify()} disabled={loc.page !== undefined && !(Number(page) >= 1)}>Check this reference</button>
    <div aria-live="polite">
      {state.status === 'loading' && <div className="loading-bar" aria-hidden="true" />}
      {state.status === 'failed' && <Failure failure={state.failure} onRetry={() => void verify()} />}
      {state.status === 'done' && checked && <div className="checker-result" data-valid={state.data.valid} data-testid="checker-result" role="status">
        <p className="checker-verdict">{state.data.valid ? '✓ Matches the declared source locator' : '✗ Does not match the declared source locator'}</p>
        <CitationList citations={[checked]} sources={sources} />
        {state.data.issues.length > 0 && <ul>{state.data.issues.map((x) => <li key={x}>{x}</li>)}</ul>}
        <p className="meta">Scope: {state.data.scope.replaceAll('-', ' ')}. A matching locator shows where a statement comes from; it does not prove the statement is scientifically true.</p>
      </div>}
    </div>
  </section>;
}
