'use client';
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PassportValidationResponseSchema, type Citation, type PassportEntry } from '@microfire/shared';
import { exportPassport, loadProgress, readRawSave, type LoadResult } from '@microfire/game-core';
import { callApi, useLatestRequest, type ApiFailure } from './client-api';
import { CitationList, Kind, Limitations, type SourceRef } from './evidence-ui';

/** Catalog data rendered by the server. The only source of anything shown as canonical. */
export type TrustedCatalog = {
  experiments: Record<string, { title: string; limitations: string[] }>;
  claims: Record<string, { experimentId: string; text: string; kind: string; citations: Citation[] }>;
};
/**
 * Own-key lookups only. Saved IDs are untrusted and the schema permits names such as `constructor` or `toString`,
 * which a plain object would "find" through its prototype. Object.entries copies own properties into a Map.
 */
type TrustedIndex = { experiments: Map<string, TrustedCatalog['experiments'][string]>; claims: Map<string, TrustedCatalog['claims'][string]> };
const indexCatalog = (t: TrustedCatalog): TrustedIndex => ({ experiments: new Map(Object.entries(t.experiments)), claims: new Map(Object.entries(t.claims)) });
const savedTextOutsideRecord = (entry: PassportEntry, index: TrustedIndex) => {
  const canonical = new Set(entry.experimentIds.flatMap((id) => index.experiments.get(id)?.limitations ?? []));
  return entry.limitations.filter((l) => !canonical.has(l));
};

/** Contains any unexpected render failure to one entry, so validation state and raw-save recovery stay usable. */
class EntryBoundary extends Component<{ entry: PassportEntry; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <article className="notebook" data-testid="passport-entry-unrenderable">
      <p><strong>This saved entry could not be displayed safely.</strong> It is unverified and was not changed. References: {this.props.entry.experimentIds.join(', ')}.</p>
    </article>;
  }
}

type Check = { status: 'not-validated' } | { status: 'checking' } | { status: 'validated' } | { status: 'rejected'; message: string } | { status: 'unavailable'; failure: ApiFailure };
const recovery: Record<string, string> = {
  corrupt: 'The saved investigation on this device could not be read safely.',
  'unsupported-version': 'The saved investigation uses a format this version does not support.',
  'dataset-mismatch': 'The saved investigation was made against a different evidence dataset.',
  'storage-unavailable': 'This browser blocks local storage, so no saved investigation can be read.'
};

function ValidationNotice({ check, untrustedCount, onRetry }: { check: Check; untrustedCount: number; onRetry: () => void }) {
  const extra = untrustedCount ? ` ${untrustedCount} saved statement${untrustedCount === 1 ? ' is' : 's are'} not part of the source record and ${untrustedCount === 1 ? 'is' : 'are'} shown below as unverified learner text.` : '';
  switch (check.status) {
    case 'not-validated': case 'checking':
      return <div className="notice" role="status" data-testid="passport-pending"><p><strong>Not yet validated.</strong> Loading this save only proves its structure; source lineage is being checked separately.</p></div>;
    case 'validated':
      return <div className="notice" data-tone="info" data-testid="passport-valid"><p><strong>Validated: source lineage only.</strong> Entry structure and citations match the catalog. This does not verify conclusions, notes or any text outside the source record, and it is not a certificate.{extra}</p></div>;
    case 'rejected':
      return <div className="notice" data-tone="error" role="alert" data-testid="passport-invalid">
        <p><strong>Scientific validation failed.</strong> The evidence service rejected this passport: {check.message} Entries are shown for inspection only, not as evidence. The save itself is unchanged.{extra}</p>
        <button className="btn btn-quiet btn-sm" type="button" onClick={onRetry}>Check again</button>
      </div>;
    case 'unavailable':
      return <div className="notice" role="alert" data-testid="passport-unvalidated">
        <p><strong>Could not validate.</strong> The check did not run, so this passport is neither accepted nor rejected. {check.failure.status === 413 ? 'The saved passport is larger than the validation service accepts. ' : ''}{check.failure.message}{check.failure.retryAfter ? ` Retry in about ${check.failure.retryAfter} s.` : ''}</p>
        <button className="btn btn-quiet btn-sm" type="button" onClick={onRetry}>Retry validation</button>
      </div>;
  }
}

function EntryView({ entry, index, sources }: { entry: PassportEntry; index: TrustedIndex; sources: SourceRef[] }) {
  const known = entry.experimentIds.flatMap((id) => { const e = index.experiments.get(id); return e ? [{ id, ...e }] : []; });
  const unknown = entry.experimentIds.filter((id) => !index.experiments.has(id));
  const canonical = [...new Set(known.flatMap((e) => e.limitations))];
  const claims = entry.claimIds.flatMap((id) => { const c = index.claims.get(id); return c && known.some((e) => e.id === c.experimentId) ? [{ id, ...c }] : []; });
  const unknownClaims = entry.claimIds.filter((id) => !claims.some((c) => c.id === id));
  const untrusted = savedTextOutsideRecord(entry, index);
  const missing = canonical.filter((l) => !entry.limitations.includes(l));
  return <article className="notebook stack" data-testid="passport-entry">
    <p className="eyebrow">{entry.missionId} · {entry.status}{entry.scenario === 'fictional-scenario' ? ' · fictional scenario' : ''}</p>
    <section className="trust-section" aria-label="Source record from the catalog">
      <h3>Source record · from the admitted catalog</h3>
      {known.map((e) => <p key={e.id}><a href={`/experiments/${e.id}`}>{e.title}</a></p>)}
      {claims.map((c) => <div key={c.id} className="stack"><p><Kind kind={c.kind} /> {c.text}</p><CitationList citations={c.citations} sources={sources} /></div>)}
      {known.length === 0 && <p className="meta">None of this entry&apos;s experiment references is in the admitted catalog, so no canonical source content is shown.</p>}
      {(unknown.length > 0 || unknownClaims.length > 0) && <p className="meta" data-testid="unknown-references">Unverified references not in the admitted catalog: {[...unknown, ...unknownClaims].map((id) => <code key={id} style={{ marginRight: 8 }}>{id}</code>)}No source content is shown for these.</p>}
      {canonical.length > 0 && <div data-testid="canonical-limitations"><Limitations items={canonical} title="Source limitations (canonical, from the catalog)" /></div>}
      {missing.length > 0 && <p className="meta" data-testid="missing-caveats">This save omits {missing.length} of these canonical caveat{missing.length === 1 ? '' : 's'}; they are shown above from the catalog.</p>}
    </section>
    <section className="trust-section untrusted" aria-label="Learner-authored content" data-testid="untrusted-content">
      <h3>Learner-authored · not verified, not NASA evidence</h3>
      <p><span className="stamp" style={{ color: 'var(--ink-muted)' }}>{entry.observationType}</span> <span className="meta">Saved classification · evidence level {entry.evidenceLevel}</span></p>
      <p><strong>Saved conclusion:</strong> {entry.conclusion}</p>
      {untrusted.length > 0 && <div data-testid="untrusted-limitations"><p className="meta" style={{ marginBottom: 4 }}>Saved text not confirmed by this entry's catalog references:</p><ul>{untrusted.map((l) => <li key={l}>{l}</li>)}</ul></div>}
      {entry.learnerNotes.length > 0 && <div><p className="meta" style={{ marginBottom: 4 }}>Your notes · not verified</p><ul>{entry.learnerNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
    </section>
  </article>;
}

/** Read-only preview: surfaces a restored save and its separate lineage check. Full save/recovery UI belongs to the gameplay milestone. */
export function PassportPreview({ datasetVersion, sources, trusted }: { datasetVersion: string; sources: SourceRef[]; trusted: TrustedCatalog }) {
  const index = useMemo(() => indexCatalog(trusted), [trusted]);
  const [load, setLoad] = useState<LoadResult | null>(null);
  const [check, setCheck] = useState<Check>({ status: 'not-validated' });
  const begin = useLatestRequest();
  const validate = async (state: Extract<LoadResult, { status: 'loaded' }>['state']) => {
    const r = begin();
    setCheck({ status: 'checking' });
    const result = await callApi('/api/passport/validate', PassportValidationResponseSchema, exportPassport(state), r.signal);
    if (!r.isCurrent()) return;
    // Only an explicit 400 from the validator is a scientific rejection; transport, budget, size and contract failures mean "not checked".
    setCheck(result.ok ? { status: 'validated' } : result.status === 400 ? { status: 'rejected', message: result.message } : { status: 'unavailable', failure: result });
  };
  // Storage is read after hydration (deferred), so server and first client render agree.
  useEffect(() => {
    const handle = setTimeout(() => {
      let storage: Storage;
      try { storage = window.localStorage; } catch { setLoad({ status: 'storage-unavailable' }); return; }
      const result = loadProgress(storage, 'normal', datasetVersion);
      setLoad(result);
      if (result.status === 'loaded' && result.state.passport.entries.length) void validate(result.state);
    }, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validate is stable in behaviour; run once per dataset
  }, [datasetVersion]);

  const download = () => {
    let raw: string | null = null;
    try { const r = readRawSave(window.localStorage, 'normal'); raw = r.ok ? r.raw : null; } catch { /* storage blocked */ }
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'microfire-save-backup.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!load) return <p role="status" className="meta">Checking this device for a saved investigation…</p>;
  if (load.status === 'empty') return <div className="notebook" data-testid="passport-empty">
    <p className="eyebrow">No entries yet</p>
    <p>Nothing is saved on this device. Passport entries are earned by completing missions, and no mission is playable yet. This page will never invent an entry.</p>
  </div>;
  if (load.status !== 'loaded') return <div className="notice" data-tone="error" role="alert" data-testid="passport-recovery">
    <p><strong>Saved investigation needs review.</strong> {recovery[load.status]} It has not been changed or deleted.</p>
    {load.status !== 'storage-unavailable' && <button className="btn btn-quiet btn-sm" type="button" onClick={download}>Download the raw save</button>}
  </div>;

  const state = load.state;
  const entries = state.passport.entries;
  const untrustedCount = entries.reduce((n, e) => n + savedTextOutsideRecord(e, index).length, 0);
  return <div className="stack" data-testid="passport-loaded">
    {load.migratedFrom === 1 && <div className="notice" data-tone="info"><p>This save was migrated from format 1. Setup-dependent proof was invalidated and must be re-earned.</p></div>}
    {!entries.length && <div className="notebook"><p>The save loaded, but it holds no passport entries yet.</p></div>}
    {entries.length > 0 && <ValidationNotice check={check} untrustedCount={untrustedCount} onRetry={() => void validate(state)} />}
    {entries.map((entry) => <EntryBoundary key={entry.id} entry={entry}><EntryView entry={entry} index={index} sources={sources} /></EntryBoundary>)}
    <p className="meta">Raw save recovery: <button className="btn btn-quiet btn-sm" type="button" onClick={download}>Download the raw save</button></p>
  </div>;
}
