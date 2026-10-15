'use client';
import { useEffect, useState } from 'react';
import { PassportValidationResponseSchema, type PassportEntry } from '@microfire/shared';
import { exportPassport, loadProgress, readRawSave, type LoadResult } from '@microfire/game-core';
import { callApi } from './client-api';
import { CitationList, Kind, Limitations, type SourceRef } from './evidence-ui';

type Check = { status: 'checking' } | { status: 'valid' } | { status: 'invalid'; message: string };
const recovery: Record<string, string> = {
  corrupt: 'The saved investigation on this device could not be read safely.',
  'unsupported-version': 'The saved investigation uses a format this version does not support.',
  'dataset-mismatch': 'The saved investigation was made against a different evidence dataset.',
  'storage-unavailable': 'This browser blocks local storage, so no saved investigation can be read.'
};

/** Read-only preview: surfaces a restored save and its scientific check. Full save/recovery UI belongs to the gameplay milestone. */
export function PassportPreview({ datasetVersion, sources }: { datasetVersion: string; sources: SourceRef[] }) {
  const [load, setLoad] = useState<LoadResult | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  // Storage is read after hydration (deferred), so server and first client render agree.
  useEffect(() => {
    const handle = setTimeout(() => {
      let storage: Storage;
      try { storage = window.localStorage; } catch { setLoad({ status: 'storage-unavailable' }); return; }
      const result = loadProgress(storage, 'normal', datasetVersion);
      setLoad(result);
      if (result.status !== 'loaded' || !result.state.passport.entries.length) return;
      // Loading proves structure only. Scientific lineage is checked separately and never assumed.
      setCheck({ status: 'checking' });
      void callApi('/api/passport/validate', PassportValidationResponseSchema, exportPassport(result.state)).then((r) =>
        setCheck(r.ok ? { status: 'valid' } : { status: 'invalid', message: r.message }));
    }, 0);
    return () => clearTimeout(handle);
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

  const entries = load.state.passport.entries;
  return <div className="stack" data-testid="passport-loaded">
    {load.migratedFrom === 1 && <div className="notice" data-tone="info"><p>This save was migrated from format 1. Setup-dependent proof was invalidated and must be re-earned.</p></div>}
    {!entries.length && <div className="notebook"><p>The save loaded, but it holds no passport entries yet.</p></div>}
    {check?.status === 'checking' && <p role="status" className="meta">Checking source lineage for {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}…</p>}
    {check?.status === 'invalid' && <div className="notice" data-tone="error" role="alert" data-testid="passport-invalid">
      <p><strong>Scientific record check failed.</strong> The save loaded, but its passport does not match the catalog: {check.message} The entries below are shown for inspection only and are not accepted as evidence.</p>
    </div>}
    {check?.status === 'valid' && <div className="notice" data-tone="info" data-testid="passport-valid"><p><strong>Source lineage checked.</strong> Structure and citations match the catalog. This checks lineage only; it does not certify conclusions or competence.</p></div>}
    {entries.map((entry: PassportEntry) => <article key={entry.id} className="notebook stack">
      <p className="eyebrow">{entry.missionId} · {entry.status}{entry.scenario === 'fictional-scenario' ? ' · fictional scenario' : ''}</p>
      <p><span className="stamp" style={{ color: 'var(--teal-ink)' }}>{entry.observationType}</span> <Kind kind={entry.observationType} /> · evidence level {entry.evidenceLevel}</p>
      <p><strong>Learner conclusion:</strong> {entry.conclusion}</p>
      <CitationList citations={entry.citations} sources={sources} />
      <Limitations items={entry.limitations} title="Source limitations (canonical)" />
      {entry.learnerNotes.length > 0 && <div><h3 className="eyebrow">Your notes · not verified</h3><ul>{entry.learnerNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
    </article>)}
  </div>;
}
