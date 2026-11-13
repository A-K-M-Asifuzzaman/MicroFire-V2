'use client';
// Mission 02 · BASS-II Training Bay on the public campaign. The public DTO carries the server's training step,
// installed part ids and Training check result, so this is a reduced bench: the learner chooses mounts, orientation,
// diagnosis and repair; the server introduces the authored fault, judges every step and qualifies the training rig.
import { useState } from 'react';
import { FaultCodeSchema, equipmentDefinitions, type CampaignAction } from '@microfire/shared';
import { Objectives, PassportList, PixLine, Verdict, cite, emitter, type Feedback, type Objective, type Refusal } from '../missions/mission-kit';
import type { PublicView } from './public-transport';

type Game = Extract<Extract<CampaignAction, { type: 'TRAINING' }>['action'], { type: 'GAME' }>['action'];
const game = (action: Game): CampaignAction => ({ type: 'TRAINING', action: { type: 'GAME', action } });
const ANCHORS = [...new Map(equipmentDefinitions.map((p) => [p.anchorId, p.anchorLabel])).entries()];
const FAULT: Record<string, string> = { MISSING: 'Missing', WRONG_ANCHOR: 'Wrong mount', MISSING_PREREQUISITE: 'Missing supporting part', REVERSED: 'Reversed orientation' };
const STEP: Record<string, [string, number]> = {
  'source-orientation': ['Start the training bay once Station Arrival is complete.', 0], assembly: ['Fit each part at the mount you choose. Mounting order is an educational model.', 1],
  'diagnostic-required': ['Something is off. Run a Training check.', 2], 'diagnosis-required': ['Name the part and the fault the Training check shows.', 2],
  'repair-required': ['Remove and refit the faulty equipment.', 3], 'qualification-required': ['Qualify the repaired training rig. This is not NASA certification.', 4],
  'b20-inspection-required': ['Open the historical B20 result. The training rig does not measure it.', 5], 'passport-review': ['Review your Passport and complete the mission.', 6], complete: ['Training complete.', 7]
};

export function BassTraining({ view, sourceTitle, feedback, refusal, onIntent }: { view: PublicView; sourceTitle: string; feedback: Feedback; refusal: Refusal; onIntent: (a: CampaignAction) => void }) {
  const emit = emitter(onIntent), step = view.trainingStep, at = STEP[step]?.[1] ?? 0, d = view.diagnostic;
  const [mount, setMount] = useState<Record<string, string>>({}), [turn, setTurn] = useState<Record<string, 'correct' | 'reversed'>>({});
  const [dx, setDx] = useState<{ partId: string; faultCode: string }>({ partId: '', faultCode: '' });
  const objectives: Objective[] = ['Assemble the apparatus', 'Run the Training check and diagnose', 'Repair the fault', 'Qualify the training rig', 'Open the B20 result', 'Complete the mission']
    .map((label, i) => ({ id: String(i), label, done: view.completedMissions.includes('bass-assembly') || at > i + 1 }));
  const bench = ['assembly', 'diagnostic-required', 'repair-required', 'qualification-required'].includes(step);
  return <div className="mf-mission" data-mission="bass-assembly">
    <div className="mf-main">
      <PixLine text={STEP[step]?.[0] ?? step} mood={step === 'diagnosis-required' ? 'cite' : 'look'} />
      <p className="mf-fiction" role="note"><b>Authored training.</b> The fault in this bay is a training exercise, not a historical NASA event.</p>
      <Verdict feedback={feedback} refusal={refusal} sourceTitle={sourceTitle} />
      <div className="mf-panel" aria-live="polite">
        {step === 'source-orientation' && <button type="button" className="btn btn-primary" onClick={() => emit(game({ type: 'START_MISSION', missionId: 'bass-assembly' }))}>Enter the training bay</button>}
        {bench && <table className="mf-bench"><caption>Apparatus parts</caption><thead><tr><th scope="col">Part</th><th scope="col">Mount</th><th scope="col">Orientation</th><th scope="col">Status</th></tr></thead>
          <tbody>{equipmentDefinitions.map((p) => {
            const fitted = view.installedPartIds.includes(p.id);
            return <tr key={p.id} data-part={p.id} data-installed={fitted}>
              <th scope="row">{p.label}</th>
              <td><select aria-label={`Mount for ${p.label}`} value={mount[p.id] ?? ''} disabled={fitted} onChange={(e) => setMount({ ...mount, [p.id]: e.target.value })}>
                <option value="">Choose a mount…</option>{ANCHORS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></td>
              <td><select aria-label={`Orientation for ${p.label}`} value={turn[p.id] ?? 'correct'} disabled={fitted} onChange={(e) => setTurn({ ...turn, [p.id]: e.target.value as 'correct' })}>
                <option value="correct">Standard orientation</option><option value="reversed">Rotated 180°</option></select></td>
              <td>{fitted ? <button type="button" className="btn" onClick={() => emit(game({ type: 'REMOVE_PART', partId: p.id }))}>Remove</button>
                : <button type="button" className="btn btn-primary" disabled={!mount[p.id]} onClick={() => emit(game({ type: 'INSTALL_PART', partId: p.id, anchorId: mount[p.id]!, orientation: turn[p.id] ?? 'correct' }))}>Fit</button>}</td>
            </tr>;
          })}</tbody></table>}
        {['diagnostic-required', 'diagnosis-required', 'repair-required', 'qualification-required'].includes(step) &&
          <button type="button" className="btn" onClick={() => onIntent({ type: 'TRAINING', action: { type: 'RUN_DIAGNOSTIC' } })}>Run a Training check</button>}
        {d && d.status === 'current' && <section className="mf-findings" aria-label="Training check result">
          <h3>Training check {d.qualified ? 'passed' : `found ${d.findings.length} issue${d.findings.length === 1 ? '' : 's'}`}</h3>
          <ul>{d.findings.map((f) => <li key={f.id}><b>{f.partLabel} at {f.anchorLabel}</b>
            <p><span className="mf-kind">Training observation</span> {f.symptom.text}</p>
            <p><span className="mf-kind">Model inference</span> {f.interpretation.text}</p>
            <p className="mf-cite">Why the part exists: {f.purpose.text} ({f.purpose.citations.map((c) => cite(c, sourceTitle)).join('; ')})</p></li>)}</ul></section>}
        {d && d.status === 'stale' && <p className="mf-fine">The setup changed after the last Training check. Run it again to see the current result.</p>}
        {step === 'diagnosis-required' && <form onSubmit={(e) => { e.preventDefault(); if (dx.partId && dx.faultCode) onIntent({ type: 'TRAINING', action: { type: 'SUBMIT_DIAGNOSIS', partId: dx.partId as 'fan', faultCode: dx.faultCode as 'REVERSED' } }); }}>
          <h3>Your diagnosis</h3>
          <label>Part <select value={dx.partId} onChange={(e) => setDx({ ...dx, partId: e.target.value })}><option value="">Choose…</option>{equipmentDefinitions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          <label>Fault <select value={dx.faultCode} onChange={(e) => setDx({ ...dx, faultCode: e.target.value })}><option value="">Choose…</option>{FaultCodeSchema.options.map((c) => <option key={c} value={c}>{FAULT[c]}</option>)}</select></label>
          <button type="submit" className="btn btn-primary" disabled={!dx.partId || !dx.faultCode}>Submit diagnosis</button></form>}
        {step === 'qualification-required' && <button type="button" className="btn btn-primary" onClick={() => emit(game({ type: 'QUALIFY_INSTRUMENT' }))}>Qualify the training rig</button>}
        {step === 'b20-inspection-required' && <button type="button" className="btn btn-primary" onClick={() => emit(game({ type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }))}>Open the B20 result</button>}
        {step === 'passport-review' && <button type="button" className="btn btn-primary" onClick={() => emit(game({ type: 'COMPLETE_MISSION', missionId: 'bass-assembly' }))}>Complete the training bay</button>}
      </div>
    </div>
    <aside className="mf-side">
      <Objectives title="Training Bay objectives" items={objectives} />
      <PassportList entries={view.passport.entries.filter((e) => e.missionId === 'bass-assembly')} sourceTitle={sourceTitle} />
    </aside>
  </div>;
}
