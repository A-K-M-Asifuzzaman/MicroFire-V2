'use client';
// Mission 02 · BASS-II Training Bay on the public campaign. The public DTO carries the server's training step,
// installed part ids and Training check result, so this is a reduced bench: the learner chooses mounts, orientation,
// diagnosis and repair; the server introduces the authored fault, judges every step and qualifies the training rig.
import { useState } from 'react';
import { FaultCodeSchema, equipmentDefinitions, type CampaignAction } from '@microfire/shared';
import { Objectives, PassportList, PixLine, Verdict, cite, emitter, type Feedback, type Objective, type Refusal } from '../missions/mission-kit';
import type { PublicView } from './public-transport';
import type { PartSpec } from '../contract';
import { CampaignBench } from './campaign-bench';

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

const PHASES = ['Enter', 'Build', 'Check', 'Diagnose', 'Repair', 'Qualify', 'B20 result', 'Finish'];
const PHASE_OF: Record<string, number> = { 'source-orientation': 0, assembly: 1, 'diagnostic-required': 2, 'diagnosis-required': 3, 'repair-required': 4, 'qualification-required': 5, 'b20-inspection-required': 6, 'passport-review': 7, complete: 8 };
const byLabel = (label?: string) => equipmentDefinitions.find((p) => p.label === label);
const labelOf = (id: string) => equipmentDefinitions.find((p) => p.id === id)?.label ?? id;

/** "Do this now": one plain instruction per server step, the stage strip, and a Show me shortcut. Guidance only; the server still judges. */
function Coach({ phase, title, steps, after, show }: { phase: number; title: string; steps: string[]; after?: string | undefined; show?: { label: string; run: () => void } | undefined }) {
  return <section className="mf-coach" aria-labelledby="mf-coach-h" data-testid="m2-coach">
    <ol className="mf-coach-phases" aria-label={`Stage ${Math.min(phase + 1, PHASES.length)} of ${PHASES.length}`}>
      {PHASES.map((p, i) => <li key={p} data-state={i < phase ? 'done' : i === phase ? 'now' : 'later'}><span aria-hidden="true">{i < phase ? '✓' : i + 1}</span>{p}</li>)}
    </ol>
    <h3 id="mf-coach-h"><span className="mf-coach-tag">Do this now</span> {title}</h3>
    <ol className="mf-coach-steps">{steps.map((t) => <li key={t}>{t}</li>)}</ol>
    {show && <button type="button" className="btn btn-sm btn-primary" onClick={show.run}>{show.label}</button>}
    {after && <p className="mf-coach-after"><b>Then:</b> {after}</p>}
  </section>;
}

export function BassTraining({ view, parts, sourceTitle, feedback, refusal, onIntent }: { view: PublicView; parts?: PartSpec[] | undefined; sourceTitle: string; feedback: Feedback; refusal: Refusal; onIntent: (a: CampaignAction) => void }) {
  const emit = emitter(onIntent), step = view.trainingStep, at = STEP[step]?.[1] ?? 0, d = view.diagnostic;
  const [mount, setMount] = useState<Record<string, string>>({}), [turn, setTurn] = useState<Record<string, 'correct' | 'reversed'>>({});
  const [dx, setDx] = useState<{ partId: string; faultCode: string }>({ partId: '', faultCode: '' });
  const [selected, setSelected] = useState<string | null>(null);
  const pickPart = (id: string) => { setSelected(id); document.querySelector(`tr[data-part="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const install = (partId: string, anchorId: string) => { setMount((m) => ({ ...m, [partId]: anchorId })); emit(game({ type: 'INSTALL_PART', partId: partId as 'fan', anchorId: anchorId as 'duct-inlet', orientation: turn[partId] ?? 'correct' })); };
  const objectives: Objective[] = ['Assemble the apparatus', 'Run the Training check and diagnose', 'Repair the fault', 'Qualify the training rig', 'Open the B20 result', 'Complete the mission']
    .map((label, i) => ({ id: String(i), label, done: view.completedMissions.includes('bass-assembly') || at > i + 1 }));
  const bench = ['assembly', 'diagnostic-required', 'repair-required', 'qualification-required'].includes(step);
  const installed = view.installedPartIds as readonly string[];
  const findings = d?.status === 'current' ? d.findings : [];
  const nextPart = equipmentDefinitions.find((p) => !installed.includes(p.id) && p.requires.every((r) => installed.includes(r)));
  const faulty = byLabel(findings[0]?.partLabel) ?? (step === 'repair-required' ? equipmentDefinitions.find((p) => p.id === 'fan') : undefined);
  const prepare = (id: string, anchorId: string) => {
    setSelected(id); setMount((m) => ({ ...m, [id]: anchorId })); setTurn((t) => ({ ...t, [id]: 'correct' }));
    requestAnimationFrame(() => { const row = document.querySelector<HTMLElement>(`tr[data-part="${id}"]`); row?.scrollIntoView({ block: 'center', behavior: 'smooth' }); row?.querySelector<HTMLButtonElement>('button.btn-primary')?.focus({ preventScroll: true }); });
  };
  const allIn = installed.length >= equipmentDefinitions.length;
  const nextAfter = nextPart && equipmentDefinitions.find((p) => p.id !== nextPart.id && !installed.includes(p.id) && p.requires.every((r) => installed.includes(r) || r === nextPart.id));
  // Which control the learner should press now: it pulses.
  const target = step === 'source-orientation' ? 'start' : step === 'assembly' ? (allIn ? 'check' : nextPart ? `fit:${nextPart.id}` : '')
    : step === 'diagnostic-required' ? 'check' : step === 'diagnosis-required' ? 'diagnose'
    : step === 'repair-required' && faulty ? (installed.includes(faulty.id) ? `remove:${faulty.id}` : `fit:${faulty.id}`)
    : step === 'qualification-required' ? 'qualify' : step === 'b20-inspection-required' ? 'b20' : step === 'passport-review' ? 'complete' : '';
  const nx = (k: string) => (target === k ? { 'data-next': 'true' } : {});
  const phase = view.completedMissions.includes('bass-assembly') ? 8 : PHASE_OF[step] ?? 0;
  const coach: Parameters<typeof Coach>[0] =
    step === 'source-orientation' ? { phase, title: 'Enter the training bay', steps: ['Press the glowing “Enter the training bay” button below.', 'If it refuses, finish Mission 01 (Station Arrival) first: it collects the B20 source this bay needs.'], after: 'You build the BASS-II flow duct, one part at a time.' }
    : step === 'assembly' && allIn ? { phase, title: 'One part is not right yet', steps: ['All 10 parts are fitted, but one is at the wrong mount or turned around.', 'Press “Run a Training check” below. It names the part that is wrong.', 'Press “Remove” on that part’s row, choose the mount its hint shows, keep “Standard orientation”, and press “Fit”.'], after: 'When every part is right, the bay moves on by itself.' }
    : step === 'assembly' && nextPart ? { phase, title: `Fit the ${nextPart.label} (${installed.length} of ${equipmentDefinitions.length} fitted)`,
        steps: [`In the parts table, find the row “${nextPart.label}”.`, `Choose the mount “${nextPart.anchorLabel}”.`, 'Keep “Standard orientation”.', 'Press the glowing “Fit” button. (In the 3D bay you can also click the part, then its glowing mount.)'],
        after: nextAfter ? `fit the ${nextAfter.label}.` : 'the bay checks your build.', show: { label: `Show me: fill in the ${nextPart.label}`, run: () => prepare(nextPart.id, nextPart.anchorId) } }
    : step === 'diagnostic-required' ? { phase, title: 'Run a Training check', steps: ['Your build was complete, so the bay introduced a practice fault (a training exercise, not a NASA event).', 'Press the glowing “Run a Training check” button.'], after: 'Read the result and name the fault.' }
    : step === 'diagnosis-required' ? { phase, title: 'Name the fault the check found', steps: [faulty ? `The Training check result names the “${faulty.label}”. Choose Part: “${faulty.label}”.` : 'Read the Training check result. Choose the part it names in bold.',
        'Choose Fault by matching the words in the result: “reversed” or “faces away” → Reversed orientation; “wrong place” → Wrong mount; “not fitted” → Missing; “needs another part first” → Missing supporting part.', 'Press “Submit diagnosis”.'], after: 'Repair the part.' }
    : step === 'repair-required' && faulty ? (installed.includes(faulty.id)
        ? { phase, title: `Repair the ${faulty.label}: take it out`, steps: [`Press “Remove” on the “${faulty.label}” row.`], after: `fit it again at “${faulty.anchorLabel}” in Standard orientation.` }
        : { phase, title: `Repair the ${faulty.label}: fit it again`, steps: [`On the “${faulty.label}” row choose the mount “${faulty.anchorLabel}”.`, 'Keep “Standard orientation”.', 'Press the glowing “Fit”.'], after: 'Qualify the training rig.', show: { label: `Show me: fill in the ${faulty.label}`, run: () => prepare(faulty.id, faulty.anchorId) } })
    : step === 'repair-required' ? { phase, title: 'Repair the faulty part', steps: ['Run a Training check to see which part is still wrong, then Remove and Fit it again.'] }
    : step === 'qualification-required' ? { phase, title: 'Qualify the training rig', steps: ['Press the glowing “Qualify the training rig” button. (This is a training step, not NASA certification.)'], after: 'Open the real B20 result.' }
    : step === 'b20-inspection-required' ? { phase, title: 'Open the real B20 result', steps: ['Press the glowing “Open the B20 result” button. The result comes from the NASA report; the training rig does not measure it.'], after: 'Finish the mission.' }
    : step === 'passport-review' ? { phase, title: 'Finish the mission', steps: ['Look at your Passport entries (they cite the NASA report).', 'Press the glowing “Complete the training bay” button.'], after: 'Mission 03 opens on the mission map.' }
    : { phase: 8, title: 'Training complete', steps: ['Well done. Go back to the mission map and start Mission 03.'] };
  return <div className="mf-mission" data-mission="bass-assembly">
    <div className="mf-main">
      <PixLine text={STEP[step]?.[0] ?? step} mood={step === 'diagnosis-required' ? 'cite' : 'look'} />
      <p className="mf-fiction" role="note"><b>Authored training.</b> The fault in this bay is a training exercise, not a historical NASA event.</p>
      <Verdict feedback={feedback} refusal={refusal} sourceTitle={sourceTitle} />
      <Coach {...coach} />
      <div className="mf-panel" aria-live="polite">
        {step === 'source-orientation' && <button type="button" {...nx('start')} className="btn btn-primary" onClick={() => emit(game({ type: 'START_MISSION', missionId: 'bass-assembly' }))}>Enter the training bay</button>}
        {parts && step !== 'source-orientation' && <CampaignBench view={view} parts={parts} selected={selected} chosenMount={mount} orientation={(selected && turn[selected]) || 'correct'}
          onSelectPart={pickPart} onSelectAnchor={(a) => { if (selected && !(view.installedPartIds as readonly string[]).includes(selected)) install(selected, a); }} onDrop={(id, a) => { if (!(view.installedPartIds as readonly string[]).includes(id)) install(id, a); }} />}
        {bench && <table className="mf-bench"><caption>Apparatus parts</caption><thead><tr><th scope="col">Part</th><th scope="col">Mount</th><th scope="col">Orientation</th><th scope="col">Status</th></tr></thead>
          <tbody>{equipmentDefinitions.map((p) => {
            const fitted = view.installedPartIds.includes(p.id);
            return <tr key={p.id} {...(target.endsWith(`:${p.id}`) ? { 'data-next': 'true' } : {})} data-part={p.id} data-installed={fitted} data-selected={selected === p.id} onFocus={() => setSelected(p.id)}>
              <th scope="row"><button type="button" className="mf-partname" aria-pressed={selected === p.id} onClick={() => setSelected(p.id)}>{p.label}</button>
                {!fitted && <span className="mf-parthint">{p.requires.some((r) => !installed.includes(r)) ? `Fit ${p.requires.filter((r) => !installed.includes(r)).map(labelOf).join(' and ')} first` : `Goes at: ${p.anchorLabel}`}</span>}</th>
              <td><select aria-label={`Mount for ${p.label}`} value={mount[p.id] ?? ''} disabled={fitted} onChange={(e) => setMount({ ...mount, [p.id]: e.target.value })}>
                <option value="">Choose a mount…</option>{ANCHORS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></td>
              <td><select aria-label={`Orientation for ${p.label}`} value={turn[p.id] ?? 'correct'} disabled={fitted} onChange={(e) => setTurn({ ...turn, [p.id]: e.target.value as 'correct' })}>
                <option value="correct">Standard orientation</option><option value="reversed">Rotated 180°</option></select></td>
              <td>{fitted ? <button type="button" {...nx(`remove:${p.id}`)} className="btn" onClick={() => emit(game({ type: 'REMOVE_PART', partId: p.id }))}>Remove</button>
                : <button type="button" {...nx(`fit:${p.id}`)} className="btn btn-primary" disabled={!mount[p.id]} onClick={() => install(p.id, mount[p.id]!)}>Fit</button>}</td>
            </tr>;
          })}</tbody></table>}
        {(['diagnostic-required', 'diagnosis-required', 'repair-required', 'qualification-required'].includes(step) || (step === 'assembly' && allIn)) &&
          <button type="button" {...nx('check')} className="btn" onClick={() => onIntent({ type: 'TRAINING', action: { type: 'RUN_DIAGNOSTIC' } })}>Run a Training check</button>}
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
          <button type="submit" {...nx('diagnose')} className="btn btn-primary" disabled={!dx.partId || !dx.faultCode}>Submit diagnosis</button></form>}
        {step === 'qualification-required' && <button type="button" {...nx('qualify')} className="btn btn-primary" onClick={() => emit(game({ type: 'QUALIFY_INSTRUMENT' }))}>Qualify the training rig</button>}
        {step === 'b20-inspection-required' && <button type="button" {...nx('b20')} className="btn btn-primary" onClick={() => emit(game({ type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' }))}>Open the B20 result</button>}
        {step === 'passport-review' && <button type="button" {...nx('complete')} className="btn btn-primary" onClick={() => emit(game({ type: 'COMPLETE_MISSION', missionId: 'bass-assembly' }))}>Complete the training bay</button>}
      </div>
    </div>
    <aside className="mf-side">
      <Objectives title="Training Bay objectives" items={objectives} />
      <PassportList entries={view.passport.entries.filter((e) => e.missionId === 'bass-assembly')} sourceTitle={sourceTitle} />
    </aside>
  </div>;
}
