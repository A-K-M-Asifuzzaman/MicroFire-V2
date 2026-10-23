'use client';
import { useState } from 'react';
import { CompareResponseSchema } from '@microfire/shared';
import { callApi, Failure, useLatestRequest } from './client-api';
import type { Pending } from './tool-kit';

// ---------- Comparison probe ----------
export function CompareProbe({ admittedId }: { admittedId: string }) {
  const [state, setState] = useState<Pending<string>>({ status: 'idle' });
  const [other, setOther] = useState('bass2-b19');
  const begin = useLatestRequest();
  const run = async () => {
    const r = begin();
    setState({ status: 'loading' });
    const result = await callApi('/api/evidence/compare', CompareResponseSchema, { experimentIds: [admittedId, other] }, r.signal);
    if (!r.isCurrent()) return;
    // A successful comparison is impossible with one admitted record; render it plainly if the corpus ever grows.
    setState(result.ok ? { status: 'done', data: `Comparability: ${result.data.comparability}. ${result.data.limitations.join(' ')}` } : { status: 'failed', failure: result });
  };
  return <div className="panel stack">
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="cmp-other">Second record</label>
      <select id="cmp-other" value={other} onChange={(e) => setOther(e.target.value)}>
        <option value="bass2-b19">bass2-b19 — legacy candidate (quarantined)</option>
        <option value="bass2-b16">bass2-b16 — legacy candidate (quarantined)</option>
        <option value="bass2-b21">bass2-b21 — legacy candidate (quarantined)</option>
      </select>
    </div>
    <button className="btn btn-primary btn-sm" type="button" onClick={() => void run()} disabled={state.status === 'loading'}>Request comparison with {admittedId}</button>
    <div aria-live="polite">
      {state.status === 'failed' && (state.failure.status === 404
        ? <div className="notice" role="status"><p><strong>Comparison refused by the evidence service.</strong> {state.failure.message}</p><p>No comparison table is shown, because none can be supported.</p></div>
        : <Failure failure={state.failure} onRetry={() => void run()} />)}
      {state.status === 'done' && <div className="notice" data-tone="info"><p>{state.data}</p></div>}
    </div>
  </div>;
}
