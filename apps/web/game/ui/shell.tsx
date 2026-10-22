'use client';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import type { Snapshot } from '../contract';
import { faultIntroduced, journeyStage } from '../view-model';
import { AuthPanel, StartPanel } from './auth';
import { useGame } from './context';
import { DiagnosticBoard } from './diagnostics';
import { B20Dossier, ObservationGate } from './evidence';
import { AccessTimer, Checks, JourneyRail, LinkBanner, SaveStatus } from './hud';
import { PassportPanel } from './passport';
import { PixGuide, reaction } from './pix';
import { useSoundCues } from './sound';
import { QualificationPanel, RepairPanel } from './repair';
import { AssemblyStatus, PartsTray, PlacementPanel, Schematic } from './schematic';
import { ArrivalCinematic, SourceTerminal } from './station';
import { m2Fonts } from './fonts';
import './game.css';

// The 3D bench is code-split and loads only when the learner asks for it (N8).
const Bench3D = dynamic(() => import('./bench').then((m) => m.Bench3D), { ssr: false, loading: () => <div className="m2-bench-loading">Loading the 3D bench…</div> });


/** Mission shell. Both views read one confirmed snapshot and send through one controller. */
export function MissionShell({ banner, intro = false }: { banner?: React.ReactNode; intro?: boolean }) {
  const { s: st } = useGame();
  const s = st.snapshot;
  const link = st.link.status;
  return <div className={`m2 ${m2Fonts}`} data-mode={st.mode}>
    {banner}
    <header className="m2-top">
      <div className="m2-top-title">
        <p className="eyebrow">Local training preview · not a public mission</p>
        <h1 className="m2-h1">BASS-II training episode <span>· B20</span></h1>
      </div>
      <div className="m2-top-meta"><AccessTimer />{s && <SaveStatus s={s} />}</div>
    </header>
    <LinkBanner />
    {(link === 'authorization-required' || link === 'authorizing') && <AuthPanel />}
    {!s && link === 'ready' && <StartPanel />}
    {!s && link === 'unavailable' && <Unavailable />}
    {s && <Mission s={s} intro={intro} />}
  </div>;
}

function Unavailable() {
  const { s } = useGame();
  const reason = s.link.status === 'unavailable' ? s.link.reason : 'disabled';
  return <div className="m2-card"><h2 className="m2-h2">Training preview not available here</h2>
    <p>{reason === 'runtime-missing'
      ? 'This build contains the M2 gameplay interface only. The local preview API and shared contract runtime are not integrated yet, so no case can be started.'
      : reason === 'disabled' ? 'The local training preview is not enabled on this server. Public missions remain locked.' : 'The local preview server could not be reached.'}</p>
    <p className="m2-fine">No gameplay is simulated in the browser. Missions only progress through the local server’s confirmed state.</p></div>;
}

function Mission({ s, intro: replay }: { s: Snapshot; intro: boolean }) {
  const { s: st, data, selection } = useGame();
  const stage = journeyStage(s);
  const [intro, setIntro] = useState(stage === 'arrival' && (st.mode === 'live' || replay));
  const endIntro = useCallback(() => setIntro(false), []);
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [webglLost, setWebglLost] = useState(false);
  const choose = (v: '2d' | '3d') => { setView(v); setWebglLost(false); };
  const ev = st.event;
  const faultMoment = ev?.kind === 'accepted' && faultIntroduced(ev.before, ev.after) ? ev.id : null;
  const revealMoment = ev?.kind === 'accepted' && ev.action?.type === 'GAME' && ev.action.action.type === 'OBSERVE_DOCUMENTED_RESULT';
  const selectedLabel = data.parts.find((p) => p.id === selection.partId)?.label ?? null;
  const bench = !['arrival', 'passport', 'complete'].includes(stage);
  const pix = reaction(st, s, selectedLabel);
  useSoundCues(ev, pix.line);
  // Phones: while part details are open, the view docks at the top so bench and controls are visible together.
  const placing = bench && !!selection.partId;
  return <div className="m2-stage" data-stage={stage} data-fault={!!s.training.fault && !s.training.repair} data-placing={placing}>
    {intro && <ArrivalCinematic onDone={endIntro} />}
    {faultMoment !== null && <FaultFlash key={faultMoment} />}
    <JourneyRail s={s} />
    {stage === 'arrival' && <SourceTerminal s={s} />}
    {/* The scientific viewport leads at full width; every panel sits below it, never over the apparatus. */}
    {bench && <section className="m2-viewport" aria-labelledby="m2-bench-h">
      <h2 id="m2-bench-h" className="sr-only">Training bench</h2>
      <div className="m2-viewbar" role="group" aria-label="Apparatus view">
        <button type="button" aria-pressed={view === '2d' || webglLost} onClick={() => choose('2d')}>Schematic (2D)</button>
        <button type="button" aria-pressed={view === '3d' && !webglLost} onClick={() => choose('3d')}>3D bench</button>
        <span className="m2-fine">Both views show the same server-confirmed apparatus.</span>
      </div>
      {s.training.fault && !s.training.repair && <p className="m2-fault-banner" role="status"><span aria-hidden="true">▲</span> Authored training fault — not a NASA incident.</p>}
      <div className="m2-view-host">
        {view === '3d' && !webglLost
          ? <Bench3D s={s} faultMoment={faultMoment} onUnavailable={() => setWebglLost(true)} />
          : <Schematic s={s} />}
      </div>
      {webglLost && view === '3d' && <p className="m2-notice" data-tone="info" role="status">The 3D bench is not available on this device (WebGL unavailable or lost). The schematic shows the same state; nothing was reset.</p>}
    </section>}
    <div className="m2-grid">
      <div className="m2-main" id="m2-main">
        {bench && <>
          <AssemblyStatus s={s} />
          <div className="m2-workbench">
            <PartsTray s={s} />
            <PlacementPanel s={s} />
          </div>
          {['fault', 'investigation', 'diagnosis'].includes(stage) && <DiagnosticBoard s={s} />}
          {stage === 'repair' && <><RepairPanel s={s} /><DiagnosticBoard s={s} /></>}
          {stage === 'qualification' && <><RepairPanel s={s} /><QualificationPanel s={s} /></>}
          {stage === 'fault' && <QualificationPanel s={s} />}
          {stage === 'observation' && <><QualificationPanel s={s} /><ObservationGate s={s} /></>}
        </>}
        {(stage === 'passport' || stage === 'complete') && <>
          <B20Dossier s={s} reveal={!!revealMoment} />
          <PassportPanel s={s} />
        </>}
      </div>
      <aside className="m2-side" aria-label="Mission status">
        <PixGuide r={pix} />
        {!bench && <section className="m2-next" aria-labelledby="m2-next-h"><h2 id="m2-next-h" className="m2-h">Next</h2><p>{s.progress.nextInstruction}</p></section>}
        <Checks s={s} />
        {st.mode === 'fixture' && <IntentLog />}
      </aside>
    </div>
  </div>;
}

/** Controlled amber pulse when the server introduces the authored fault. No flashing under reduced motion. */
function FaultFlash() {
  return <div className="m2-fault-flash" aria-hidden="true" />;
}

function IntentLog() {
  const { s } = useGame();
  return <section className="m2-intents" aria-labelledby="m2-intents-h">
    <h2 id="m2-intents-h" className="m2-h">Intent log (fixture gallery)</h2>
    {s.intents.length === 0 ? <p className="m2-fine">Interact with the bench: each request the UI would send appears here. Nothing is sent.</p>
      : <ol>{s.intents.map((i) => <li key={i.n}><b>{i.endpoint}</b> {i.label}<pre>{JSON.stringify(i.body, null, 1)}</pre></li>)}</ol>}
  </section>;
}
