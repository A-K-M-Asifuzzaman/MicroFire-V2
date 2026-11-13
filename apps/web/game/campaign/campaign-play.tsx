'use client';
// Public campaign shell: bootstraps the visitor's durable case, renders the server's projected view through the
// existing mission scenes, and routes every learner intent through the controller. No rule runs here.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { CampaignAction } from '@microfire/shared';
import { ClaimTrial, type EvidenceOption } from '../missions/claim-trial';
import { FlameDetective } from '../missions/flame-detective';
import { LunarHabitat, type RecordedCondition } from '../missions/lunar-habitat';
import { StationArrival, type Claim } from '../missions/station-arrival';
import { PassportList } from '../missions/mission-kit';
import { BassTraining } from './bass-training';
import type { PartSpec } from '../contract';
import { createPublicController, type PublicController } from './public-controller';
import { createPublicTransport } from './public-transport';
import { MissionGuide } from './mission-guide';
import { MISSIONS, currentMission, needsStart, sceneSnapshot } from './view-adapter';
import '../missions/missions.css';
import './campaign.css';

const time = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function CampaignPlay({ claim, sourceTitle, evidence, recorded, parts, controller: injected }: { claim: Claim; sourceTitle: string; evidence: EvidenceOption[]; recorded: RecordedCondition[]; parts?: PartSpec[] | undefined; controller?: PublicController }) {
  const controller = useMemo(() => injected ?? createPublicController(createPublicTransport()), [injected]);
  const s = useSyncExternalStore(controller.subscribe, controller.get, controller.get);
  const [confirmRestart, setConfirmRestart] = useState(false), [waitS, setWaitS] = useState(0);
  useEffect(() => { void controller.boot(); }, [controller]);
  useEffect(() => {
    if (s.phase !== 'rate-limited' || !s.retryAt) return;
    const at = s.retryAt, left = () => setWaitS(Math.max(0, Math.ceil((at - Date.now()) / 1000)));
    left(); const t = setInterval(left, 1000); return () => clearInterval(t);
  }, [s.phase, s.retryAt]);
  const act = (a: CampaignAction) => { void controller.act(a); };
  const view = s.view, mission = view ? currentMission(view) : null;
  const last = s.last?.result;
  const feedback = last?.ok ? (last.feedback ?? null) : null, refusal = last && !last.ok ? { code: last.code, message: last.message } : null;
  const snap = view ? sceneSnapshot(view) : null;

  const download = async () => {
    const data = await controller.exportPassport(); if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `microfire-passport-${data.sessionId.slice(0, 8)}.json`; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="wrap page mf-play" aria-busy={s.phase === 'booting' || s.phase === 'sending'} data-phase={s.phase} data-revision={view?.revision}>
    <header className="mf-play-head">
      <h1>Flame in Freefall missions</h1>
      <p className="mf-guide-intro">New here? Follow the highlighted next action and read each mission briefing. <Link href="/judge-guide">Open the full guided tour</Link> of the science tools and games.</p>
      {view && <ol className="mf-rail" aria-label="Mission progress (saved on the server)">{MISSIONS.map((m) => {
        const done = view.completedMissions.includes(m.id), here = m.id === mission;
        return <li key={m.id} data-state={done ? 'done' : here ? 'current' : 'upcoming'} aria-current={here ? 'step' : undefined}>
          <span className="mf-rail-n" aria-hidden="true">{done ? '✓' : m.n}</span>{m.title}<span className="sr-only">{done ? ' (complete)' : here ? ' (current)' : ''}</span></li>;
      })}</ol>}
      {view && s.expiresAt && <p className="mf-fine mf-case">Case saved on the MicroFire server until {time(s.expiresAt)}. There is no account: clearing cookies or waiting past that time ends this case for good.</p>}
    </header>

    <div className="mf-status" role="status" aria-live="polite">
      {s.phase === 'booting' && <p>Opening your case…</p>}
      {s.phase === 'sending' && <p>Sending your step to the server…</p>}
      {s.notice && <p className="mf-notice">{s.notice}</p>}
    </div>
    {s.phase === 'disabled' && <div className="mf-alert" role="alert"><b>Missions are not open yet.</b> The public campaign is switched off on this server. The research tools stay available.</div>}
    {s.phase === 'unavailable' && <div className="mf-alert" role="alert"><b>The case store did not answer.</b> {view ? 'Your last step may or may not have been saved. Retry sends exactly the same step; the server will never apply it twice.' : 'Your case could not be opened.'}
      <button type="button" className="btn btn-primary" onClick={() => void controller.retry()}>Retry</button></div>}
    {s.phase === 'rate-limited' && <div className="mf-alert" role="alert"><b>Too many requests right now.</b> {waitS > 0 ? `You can retry in ${waitS} s.` : 'You can retry now.'}
      <button type="button" className="btn btn-primary" disabled={waitS > 0} onClick={() => void controller.retry()}>Retry</button></div>}
    {(s.phase === 'expired' || s.phase === 'missing') && <div className="mf-alert" role="alert">
      <b>{s.phase === 'expired' ? 'This case has ended.' : 'This case no longer exists.'}</b> Cases last 24 hours and live only in this browser&apos;s cookie, so it cannot be recovered.
      {view && view.passport.entries.length > 0 && ' Your Passport entries are shown below for reference.'}
      <button type="button" className="btn btn-primary" onClick={() => void controller.restart()}>Start a new case</button></div>}

    {view && snap && mission && s.phase !== 'expired' && s.phase !== 'missing' && <section className="mf-stage" data-mission={mission} aria-label={MISSIONS.find((m) => m.id === mission)!.title}>
      <MissionGuide mission={mission} completed={view.completedMissions.length} passportCount={view.passport.entries.length} />
      {needsStart(view, mission) && mission !== 'bass-assembly'
        ? <div className="mf-start"><h2>Mission {MISSIONS.find((m) => m.id === mission)!.n}: {MISSIONS.find((m) => m.id === mission)!.title}</h2>
            <button type="button" className="btn btn-primary" onClick={() => act({ type: 'CORE', action: { type: 'START_MISSION', missionId: mission } })}>Start {MISSIONS.find((m) => m.id === mission)!.title}</button>
            {refusal && <p className="mf-verdict" data-kind="refused" role="status"><b>Not accepted.</b> {refusal.message}</p>}</div>
        : <>
          {mission === 'station-arrival' && <StationArrival snapshot={snap} claim={claim} sourceTitle={sourceTitle} feedback={feedback} refusal={refusal} onIntent={act} />}
          {mission === 'bass-assembly' && <BassTraining view={view} parts={parts} sourceTitle={sourceTitle} feedback={feedback} refusal={refusal} onIntent={act} />}
          {mission === 'flame-detective' && <FlameDetective snapshot={snap} claim={claim} recorded={recorded} sourceTitle={sourceTitle} feedback={feedback} refusal={refusal} onIntent={act} />}
          {mission === 'claim-trial' && <ClaimTrial snapshot={snap} statements={view.trialStatements} evidence={evidence} sourceTitle={sourceTitle} feedback={feedback} refusal={refusal} onIntent={act} />}
          {mission === 'lunar-habitat' && <LunarHabitat snapshot={snap} claim={claim} recorded={recorded} sourceTitle={sourceTitle} feedback={feedback} refusal={refusal} onIntent={act} />}
        </>}
      <p className="mf-fine">Your inspections, prediction, feedback, decisions and mission progress are saved on the server and restored when you reload this case.</p>
    </section>}

    {view && !mission && <section className="mf-done" aria-label="Campaign complete"><h2>All five missions complete</h2>
      <p>The server recorded every mission and Passport entry. This is educational progress, not scientific certification.</p></section>}
    {view && (!mission || s.phase === 'expired' || s.phase === 'missing') && <PassportList entries={view.passport.entries} sourceTitle={sourceTitle} />}

    {view && s.phase !== 'expired' && s.phase !== 'missing' && <footer className="mf-play-foot">
      <button type="button" className="btn" onClick={() => void download()} disabled={view.passport.entries.length === 0}>Download Passport (JSON)</button>
      {!confirmRestart ? <button type="button" className="btn" onClick={() => setConfirmRestart(true)}>Start over…</button>
        : <div className="mf-confirm" role="alertdialog" aria-label="Start over">
          <p>Starting over permanently ends this case on the server. There is no account, so it cannot be brought back.</p>
          <button type="button" className="btn btn-primary" onClick={() => { setConfirmRestart(false); void controller.restart(); }}>End this case and start over</button>
          <button type="button" className="btn" onClick={() => setConfirmRestart(false)}>Keep my case</button></div>}
    </footer>}
  </div>;
}
