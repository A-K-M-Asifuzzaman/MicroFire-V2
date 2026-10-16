'use client';
import { useState, type FormEvent } from 'react';
import { CitationList } from '../../components/evidence-ui';
import type { FaultCode, PartId, Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allows, faultCategoryLabels } from '../view-model';
import { useGame } from './context';

/** Training check results exactly as the server typed them. Stale results are never shown as current. */
export function DiagnosticBoard({ s }: { s: Snapshot }) {
  const { c, s: st, data } = useGame();
  const d = s.diagnostic;
  const canRun = allows(s, 'RUN_DIAGNOSTIC') && st.link.status === 'confirmed';
  return <section className="m2-board" aria-labelledby="m2-board-h">
    <div className="m2-board-head">
      <div>
        <p className="eyebrow">Diagnostic console</p>
        <h3 id="m2-board-h" className="m2-h3">Training check</h3>
        <p className="m2-fine">A check of the schematic training configuration, not a sensor measurement or a NASA test.</p>
      </div>
      <button className="btn btn-primary" onClick={() => void c.send({ type: 'RUN_DIAGNOSTIC' }, 'Run the Training check')} disabled={!canRun || isBusy(st.link)}
        data-fresh={d.status === 'current'}>{d.status === 'current' ? 'Run it again' : 'Run Training check'}</button>
    </div>
    {d.status === 'not-run' && <p className="m2-state" data-state="not-run" role="status">No check has been run for this setup (setup revision {d.currentSetupRevision}). Run the Training check to see what it finds.</p>}
    {d.status === 'stale' && <p className="m2-state" data-state="stale" role="status">The last check was for setup revision {d.checkedSetupRevision}; the apparatus is now at revision {d.currentSetupRevision}. Its findings are out of date and are hidden — run the check again.</p>}
    {d.status === 'current' && <>
      <p className="m2-state" data-state="current" role="status">Current check · setup revision {d.checkedSetupRevision} · {d.qualified ? 'no faults found in the training configuration.' : `${d.findings.length} finding${d.findings.length === 1 ? '' : 's'}.`}</p>
      <ol className="m2-findings">{d.findings.map((f) => <li key={f.id} className="m2-finding">
        <p className="m2-finding-title"><b>{f.partLabel}</b> <span className="m2-fine">at {f.anchorLabel}</span> <span className="m2-tag" data-tone="amber">{faultCategoryLabels[f.faultCode]}</span></p>
        <dl>
          <div data-cat="symptom"><dt>Training observation</dt><dd>{f.symptom.text}</dd></div>
          <div data-cat="interpretation"><dt>Model explanation</dt><dd>{f.interpretation.text}</dd></div>
          <div data-cat="purpose"><dt>What NASA documented about this part</dt><dd>{f.purpose.text}<CitationList citations={f.purpose.citations} sources={data.b20.sources} /></dd></div>
          <div data-cat="repair"><dt>Repair (guided)</dt><dd>{f.repair.text}</dd></div>
        </dl>
      </li>)}</ol>
    </>}
    {s.training.fault && <p className="m2-flag">Authored training fault — not a NASA incident. It was introduced at setup revision {s.training.fault.introducedRevision} as part of this training exercise.</p>}
    {allows(s, 'SUBMIT_DIAGNOSIS') ? <DiagnosisForm s={s} /> : st.event?.kind === 'refused' && (st.event.action?.type === 'SUBMIT_DIAGNOSIS' || st.event.action?.type === 'RUN_DIAGNOSTIC')
      && <p className="m2-feedback" data-kind="refused" role="alert"><b>Not accepted.</b> {st.event.message}</p>}
    {s.training.diagnosis && <p className="m2-receipt" data-kind="diagnosis">Diagnosis recorded for the authored training fault (fan) at setup revision {s.training.diagnosis.faultyRevision}. Repair it by hand next.</p>}
  </section>;
}

function DiagnosisForm({ s }: { s: Snapshot }) {
  const { c, s: st, data } = useGame();
  const [partId, setPart] = useState<PartId | ''>('');
  const [faultCode, setCode] = useState<FaultCode | ''>('');
  const ready = st.link.status === 'confirmed' && s.diagnostic.status === 'current';
  const fb = st.event?.kind === 'accepted' && st.event.action?.type === 'SUBMIT_DIAGNOSIS' ? st.event.feedback : null;
  const refusal = st.event?.kind === 'refused' && st.event.action?.type === 'SUBMIT_DIAGNOSIS' ? st.event : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!partId || !faultCode) return;
    void c.send({ type: 'SUBMIT_DIAGNOSIS', partId, faultCode }, `Diagnose: ${data.parts.find((p) => p.id === partId)?.label} · ${faultCategoryLabels[faultCode]}`);
  };
  return <form className="m2-diagnose" onSubmit={submit} aria-labelledby="m2-dx-h">
    <h4 id="m2-dx-h" className="m2-h4">Your diagnosis</h4>
    <p className="m2-fine">Use the current check and the bench. Wrong answers are coaching, not a penalty; you can try again.</p>
    <div className="m2-dx-grid">
      <label className="m2-field"><span>Component</span>
        <select value={partId} onChange={(e) => setPart(e.target.value as PartId)} required>
          <option value="">Choose a component…</option>
          {data.parts.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <fieldset className="m2-choices"><legend>Fault category</legend>
        {(Object.keys(faultCategoryLabels) as FaultCode[]).map((k) => <label key={k}>
          <input type="radio" name="m2-fault" value={k} checked={faultCode === k} onChange={() => setCode(k)} required />{faultCategoryLabels[k]}
        </label>)}
      </fieldset>
    </div>
    <button className="btn btn-primary" type="submit" disabled={!ready || !partId || !faultCode || isBusy(st.link)}>Submit diagnosis</button>
    {s.diagnostic.status !== 'current' && <p className="m2-fine">Run a current Training check before submitting.</p>}
    {fb && <p className="m2-feedback" data-kind={fb.correct ? 'accepted' : 'coach'} role="status">{fb.correct ? <b>Diagnosis recorded.</b> : <b>Not this one.</b>} {fb.hint}</p>}
    {refusal && <p className="m2-feedback" data-kind="refused" role="alert"><b>Not accepted.</b> {refusal.message}</p>}
  </form>;
}
