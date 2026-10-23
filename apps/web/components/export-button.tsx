'use client';
import { useState } from 'react';
import { ExportResponseSchema } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import type { Pending } from './tool-kit';

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

