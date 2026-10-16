'use client';
import type { Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allowsCore, core } from '../view-model';
import { anchorLabel, useGame } from './context';

const time = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

/** Repair provenance straight from the server's receipts: what is faulty, what diagnosed it, what is pending, what is done. */
export function RepairPanel({ s }: { s: Snapshot }) {
  const { data } = useGame();
  const t = s.training;
  const fan = data.parts.find((p) => p.id === 'fan')!;
  const fitted = s.state.setup.installedParts.find((p) => p.partId === 'fan');
  const steps = [
    { label: 'Identify the faulty component', done: !!t.diagnosis },
    { label: `Remove the ${fan.label.toLowerCase()}`, done: !!t.pendingRepair || !!t.repair },
    { label: 'Inspect the pending-repair receipt', done: !!t.pendingRepair || !!t.repair },
    { label: `Reinstall it at the ${anchorLabel(data, fan.anchorId).toLowerCase()}, standard orientation`, done: !!t.repair },
    { label: 'Request training qualification', done: s.state.setup.qualifiedRevision === s.state.setup.revision && !!t.repair }
  ];
  return <section className="m2-repair" aria-labelledby="m2-repair-h">
    <p className="eyebrow">Repair bay</p>
    <h3 id="m2-repair-h" className="m2-h3">Repair the authored training fault</h3>
    <ol className="m2-steps">{steps.map((x) => <li key={x.label} data-done={x.done}><span aria-hidden="true">{x.done ? '✓' : '○'}</span> {x.label}<span className="sr-only">{x.done ? ' — done' : ''}</span></li>)}</ol>
    {fan.reversedRepair && !t.repair && <p className="m2-fine"><b>Repair instruction:</b> {fan.reversedRepair}</p>}
    {t.diagnosis && !t.pendingRepair && !t.repair && fitted && <p className="m2-receipt" data-kind="waiting">The fan is still fitted ({fitted.orientation === 'reversed' ? 'rotated 180°' : 'standard orientation'}). Remove it to begin the repair.</p>}
    {t.pendingRepair && <div className="m2-receipt" data-kind="pending" role="status">
      <p className="m2-receipt-title">Repair pending</p>
      <p>{fan.label} removed at setup revision <b>{t.pendingRepair.removedAtRevision}</b> ({time(t.pendingRepair.removedAt)}). Reinstall it at the {anchorLabel(data, fan.anchorId).toLowerCase()}.</p>
      <p className="m2-fine">Cause: authored training fault <code>{t.pendingRepair.faultId}</code>, diagnosed at setup revision {t.diagnosis?.faultyRevision}. Other edits keep this receipt; reloading keeps it too.</p>
    </div>}
    {t.repair && <div className="m2-receipt" data-kind="done">
      <p className="m2-receipt-title">Repair receipt</p>
      <p>Removed at setup revision <b>{t.repair.removedAtRevision}</b>, reinstalled correctly at setup revision <b>{t.repair.reinstalledAtRevision}</b> ({time(t.repair.at)}).</p>
      <p className="m2-fine">A historical training receipt. It does not certify the current apparatus; qualification does that for the current setup only.</p>
    </div>}
  </section>;
}

/** Qualification is a training configuration check, never NASA certification. */
export function QualificationPanel({ s }: { s: Snapshot }) {
  const { c, s: st } = useGame();
  const qualified = s.state.setup.qualifiedRevision !== null && s.state.setup.qualifiedRevision === s.state.setup.revision;
  const refusal = st.event?.kind === 'refused' && st.event.action?.type === 'GAME' && st.event.action.action.type === 'QUALIFY_INSTRUMENT' ? st.event : null;
  const can = allowsCore(s, 'QUALIFY_INSTRUMENT') && st.link.status === 'confirmed' && !isBusy(st.link);
  return <section className="m2-qualify" aria-labelledby="m2-qual-h" data-qualified={qualified}>
    <p className="eyebrow">Qualification</p>
    <h3 id="m2-qual-h" className="m2-h3">Training qualification</h3>
    {qualified
      ? <div className="m2-stamp" role="status"><b>Training configuration check passed</b><span>Setup revision {s.state.setup.qualifiedRevision}. A training result for this schematic apparatus — not a NASA certification and not a combustion result.</span></div>
      : <p>When the repair is complete, ask the server to check the whole training configuration at its current setup revision.</p>}
    {!qualified && <button className="btn btn-primary" disabled={!can} onClick={() => void c.send(core({ type: 'QUALIFY_INSTRUMENT' }), 'Request training qualification')}>Request training qualification</button>}
    {refusal && <div className="m2-feedback" data-kind="refused" role="alert"><p><b>Not qualified.</b> {refusal.message}</p>
      {refusal.faults.length > 0 && <ul>{refusal.faults.map((f) => <li key={`${f.partId}:${f.code}`}>{f.message} <span className="m2-fine">{f.repair}</span></li>)}</ul>}
    </div>}
  </section>;
}
