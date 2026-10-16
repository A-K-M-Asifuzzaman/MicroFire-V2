'use client';
import Link from 'next/link';
import { CitationList, Limitations } from '../../components/evidence-ui';
import type { Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allowsCore, core } from '../view-model';
import { useGame } from './context';

/** b20-inspection-required: the learner deliberately leaves the simulation to open NASA's documented result. */
export function ObservationGate({ s }: { s: Snapshot }) {
  const { c, s: st, data } = useGame();
  const can = allowsCore(s, 'OBSERVE_DOCUMENTED_RESULT') && st.link.status === 'confirmed' && !isBusy(st.link);
  return <section className="m2-gate" aria-labelledby="m2-gate-h">
    <p className="eyebrow">Leaving the training simulation</p>
    <h3 id="m2-gate-h" className="m2-h3">Open the documented B20 result</h3>
    <p>Your bench passed its training check. What comes next is not produced by the bench: it is NASA’s documented record of test {data.b20.testId}. Nothing in this game simulates or reproduces that result.</p>
    <button className="btn btn-primary" disabled={!can} onClick={() => void c.send(core({ type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: data.b20.id }), 'Open the documented B20 result')}>Open NASA’s B20 record</button>
  </section>;
}

/** The authentic evidence: canonical observation, calibrated conditions, unknowns kept unknown, exact limitations. */
export function B20Dossier({ s, reveal }: { s: Snapshot; reveal: boolean }) {
  const { data } = useGame();
  const b = data.b20;
  const entry = s.state.passport.entries.find((e) => e.missionId === 'bass-assembly' && s.passportPresentation.sourceEvidence.passportEntryIds.includes(e.id));
  return <section className="m2-dossier" aria-labelledby="m2-dossier-h" data-reveal={reveal}>
    {reveal && <div className="m2-crossing" aria-hidden="true"><span>Training bench</span><span className="m2-crossing-line" /><span>NASA record</span></div>}
    <p className="eyebrow">Admitted record · NASA BASS-II · {b.testId}</p>
    <h2 id="m2-dossier-h" className="m2-h2">Documented observation</h2>
    <blockquote className="m2-claim">{entry?.conclusion ?? b.claim.text}</blockquote>
    <p className="m2-badge-row"><span className="m2-prov" data-prov="source">Source observation · direct evidence for this record</span></p>
    <CitationList citations={entry?.citations ?? b.claim.citations} sources={b.sources} />
    <dl className="m2-conditions m2-conditions-compact" aria-label="B20 documented conditions">
      {b.rows.map((r) => <div key={r.key} data-unknown={r.value === null}><dt>{r.label}</dt><dd>{r.value ?? 'Not recorded'}{r.basis === 'derived' && <span className="m2-tag">derived</span>}</dd></div>)}
    </dl>
    <p className="m2-fine">Calibrated oxygen 17.4 vol% (the adjacent 16.5 is an uncalibrated reading). Raw airflow sequence: {b.rawFlow}. Pressure and run acceleration are not recorded for this row and are not estimated here.</p>
    <Limitations items={entry?.limitations ?? b.limitations} />
    <p><Link href={`/experiments/${b.id}`} className="text-link">Open the full B20 dossier</Link></p>
  </section>;
}
