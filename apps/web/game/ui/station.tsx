'use client';
import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allowsCore, core, stationStep } from '../view-model';
import { useGame } from './context';
import { CitationList } from '../../components/evidence-ui';

/**
 * Opening sequence: a title card, then the training bay (a still rendered from MicroFire's own 3D bench) pushes in
 * behind the episode title. ~4.7 s, skippable, absent under reduced motion. The image is illustrative, and labelled so.
 */
export function ArrivalCinematic({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { onDone(); return; }
    const t = [setTimeout(() => setPhase(1), 300), setTimeout(() => setPhase(2), 1500), setTimeout(() => setPhase(3), 4000), setTimeout(onDone, 4700)];
    return () => t.forEach(clearTimeout);
  }, [onDone]);
  // A modal dialog sits in the browser's top layer, above the sticky site header whatever the page's stacking contexts.
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = dialog.current; if (d && !d.open) d.showModal(); return () => d?.close(); }, []);
  return <dialog ref={dialog} className="m2-arrival" data-phase={phase} aria-label="Arriving at the training bay" onCancel={(e) => { e.preventDefault(); onDone(); }}>
    <div className="m2-arrival-scene" aria-hidden="true" />
    <p className="m2-arrival-card" aria-hidden="true">MicroFire Observatory</p>
    <div className="m2-arrival-bay" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}</div>
    <div className="m2-arrival-copy">
      <p className="eyebrow">MicroFire Observatory · Training bay</p>
      <p className="m2-arrival-title">BASS-II training episode</p>
      <p className="m2-arrival-sub">Schematic training model · NASA source record B20</p>
    </div>
    <p className="m2-arrival-note">Illustrative training bay, rendered from the 3D bench</p>
    <button className="btn btn-quiet btn-sm m2-skip" onClick={onDone}>Skip intro</button>
  </dialog>;
}

const steps = [
  { id: 'inspect', title: 'Open the source record', body: 'Read B20’s documented conditions and where they come from.' },
  { id: 'collect', title: 'Collect the documented observation', body: 'Add NASA’s recorded observation to your Evidence Passport.' },
  { id: 'complete', title: 'Complete Station Arrival', body: 'Your first Passport entry is a real, cited observation.' },
  { id: 'enter', title: 'Enter the training bay', body: 'Begin assembling the schematic training apparatus.' }
] as const;

/** Guided source reading (no distractor): every step is a real server action on the admitted B20 record. */
export function SourceTerminal({ s }: { s: Snapshot }) {
  const { c, s: st, data } = useGame();
  const b = data.b20;
  const step = stationStep(s);
  const at = steps.findIndex((x) => x.id === step);
  const busy = isBusy(st.link) || st.link.status !== 'confirmed';
  const act = () => {
    if (step === 'inspect') void c.send(core({ type: 'INSPECT_EVIDENCE', experimentId: b.id }), 'Open the B20 source record');
    if (step === 'collect') void c.send(core({ type: 'COLLECT_EVIDENCE', experimentId: b.id, claimId: b.claim.id }), 'Collect the documented observation');
    if (step === 'complete') void c.send(core({ type: 'COMPLETE_MISSION', missionId: 'station-arrival' }), 'Complete Station Arrival');
    if (step === 'enter') void c.send(core({ type: 'START_MISSION', missionId: 'bass-assembly' }), 'Enter the training bay');
  };
  const coreType = ({ inspect: 'INSPECT_EVIDENCE', collect: 'COLLECT_EVIDENCE', complete: 'COMPLETE_MISSION', enter: 'START_MISSION', done: null } as const)[step];
  const permitted = coreType !== null && allowsCore(s, coreType);
  const opened = step !== 'inspect';
  return <section className="m2-terminal" aria-labelledby="m2-terminal-h">
    <div className="m2-terminal-head">
      <p className="eyebrow">Source terminal · admitted record</p>
      <h2 id="m2-terminal-h" className="m2-h2">{b.testId}: {b.title.replace(/^B20 — /, '')}</h2>
      <p className="m2-fine">NASA BASS-II Summary Report (NTRS 20210011385). This is the only admitted experiment in the catalog; 55 legacy rows remain quarantined.</p>
    </div>
    <ol className="m2-guide">
      {steps.map((x, i) => <li key={x.id} data-state={i < at || step === 'done' ? 'done' : i === at ? 'now' : 'next'}>
        <b>{x.title}</b><span>{x.body}</span>
      </li>)}
    </ol>
    <div className="m2-terminal-grid">
      <dl className="m2-conditions" aria-label="B20 documented conditions">
        {b.rows.map((r) => <div key={r.key} data-unknown={r.value === null}>
          <dt>{r.label}</dt>
          <dd>{r.value ?? 'Not recorded'}{r.basis === 'derived' && <span className="m2-tag">derived</span>}
            {r.key === 'flowCmS' && <span className="m2-sub">Raw airflow sequence: {b.rawFlow} (pot 0.5 is a setting, not a speed)</span>}
            {r.value === null && <span className="m2-sub">{r.note}</span>}</dd>
        </div>)}
      </dl>
      <figure className="m2-quote" data-revealed={opened}>
        <figcaption className="eyebrow">Documented observation</figcaption>
        {opened ? <><blockquote>{b.claim.text}</blockquote><CitationList citations={b.claim.citations} sources={b.sources} /></>
          : <p className="m2-fine">Open the source record to read NASA’s documented observation.</p>}
      </figure>
    </div>
    {step !== 'done' && <div className="m2-row m2-terminal-act">
      <button className="btn btn-primary" onClick={act} disabled={busy || !permitted}>{steps[at]?.title}</button>
      {!permitted && !busy && <span className="m2-fine">The server does not permit this step right now.</span>}
    </div>}
  </section>;
}
