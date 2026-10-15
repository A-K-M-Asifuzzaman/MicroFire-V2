'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ExperimentsResponseSchema, type Coverage, type Experiment } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import { CoverageNote, Kind, type SourceRef } from './evidence-ui';
import { FilmGlyph } from './film-glyph';
import type { Pending } from './tool-kit';

const known = (e: Experiment, field: keyof Experiment['conditions']) => {
  const c = e.conditions[field];
  return c.status === 'known' ? `${c.value}${'unit' in c ? ` ${c.unit}` : ''}` : 'Unknown';
};
export function RecordCard({ experiment, sources }: { experiment: Experiment; sources: readonly SourceRef[] }) {
  const claim = experiment.claims[0];
  const pressure = known(experiment, 'pressureKpa');
  return <article className="exhibit" data-testid="atlas-exhibit">
    <div className="exhibit-visual" aria-hidden="true"><div style={{ width: '100%', maxWidth: 420 }}><FilmGlyph /></div></div>
    <div className="exhibit-body">
      <p className="eyebrow" style={{ margin: 0, color: 'var(--accent-text)' }}>{experiment.program} · test {experiment.testId} · admitted exhibit</p>
      <h2><Link href={`/experiments/${experiment.id}`}>{experiment.title}</Link></h2>
      <div className="exhibit-actions">
        <Link className="btn btn-primary" href={`/experiments/${experiment.id}`}>Inspect {experiment.testId} <span aria-hidden="true">→</span></Link>
      </div>
      {claim && <p style={{ margin: 0 }}><Kind kind={claim.kind} /> {claim.text}</p>}
      <dl className="readouts">
        <div><dt>Calibrated O₂</dt><dd>{known(experiment, 'oxygenPct')}</dd></div>
        <div><dt>Material</dt><dd>{known(experiment, 'material')}</dd></div>
        <div><dt>Initial airflow</dt><dd>{known(experiment, 'flowCmS')}</dd></div>
        <div><dt>Pressure</dt><dd data-unknown={pressure === 'Unknown' ? '' : undefined}>{pressure === 'Unknown' ? 'Not recorded' : pressure}</dd></div>
      </dl>
      <div>
        <p className="meta" style={{ margin: 0 }}>Source: {sources.find((s) => experiment.sourceIds.includes(s.id))?.title ?? experiment.sourceIds[0]}. Page-level citations are in the dossier.</p>
      </div>
    </div>
  </article>;
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
      <option value="">Any</option>
      {facets[name].map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  </div>;
  const data = state.status === 'done' ? state.data : null;
  return <div className="atlas-main">
    <form className="atlas-search" role="search" aria-label="Search experiments" action="/atlas" method="get" onSubmit={submit}>
      <div className="search-row">
        <div className="field">
          <label htmlFor="atlas-q">Search terms</label>
          <input id="atlas-q" name="q" type="search" defaultValue={query.q} maxLength={200} placeholder="e.g. PMMA opposed" aria-describedby="atlas-q-hint" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={state.status === 'loading'}>Search</button>
        <a className="btn btn-quiet" href="/atlas">Reset</a>
      </div>
      <small id="atlas-q-hint">All terms must match an admitted record.</small>
      {/* While the catalog holds one record the facets are optional, so they sit in one compact row under the search. */}
      <fieldset className="filter-row">
        <legend>Filter this catalog <span>· one value each while one record is admitted</span></legend>
        {facet('program', 'Program')}{facet('material', 'Material')}{facet('flowDirection', 'Flow direction')}
      </fieldset>
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
        : <div className="notice" data-tone="info"><p><strong>No admitted record matches.</strong> Only one experiment is admitted today. Quarantined legacy candidates (for example other BASS-II runs) are never returned as results, and absence here does not mean a condition was never studied.</p><p><a className="btn btn-primary btn-sm" href="/atlas">Reset and show B20</a></p></div>)}
      <div style={{ marginTop: 20 }}><CoverageNote coverage={(data ?? initial).coverage} /></div>
    </section>
  </div>;
}

