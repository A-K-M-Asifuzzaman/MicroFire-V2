'use client';
// Mission 03 · Flame Detective. Renders a CampaignSnapshot and emits CampaignAction intents (evidence-campaign-v1):
// select the admitted test at recorded conditions, lock a prediction, reveal the documented result, explain it with
// its source and limits. Hypothetical conditions are refused by the engine, never turned into a NASA outcome here.
import { useState } from 'react';
import type { CampaignAction, Citation } from '@microfire/shared';
import { Objectives, PassportList, PixLine, Verdict, cite, emitter, type Feedback, type Objective, type Refusal } from './mission-kit';
import { SceneViewport } from './scene-viewport';
import type { Claim } from './station-arrival';

type Station = 'select' | 'predict' | 'reveal' | 'explain' | 'report';
export type DetectiveSnapshot = { selectedExperimentId: string | null; explanation: { correct: boolean } | null;
  state: { completedMissions: string[]; predictions: { experimentId: string; prediction: string }[];
    passport: { entries: { id: string; missionId: string; claimIds: string[]; conclusion: string; observationType: string; evidenceLevel: string; citations: Citation[]; limitations: string[]; scenario: string }[] } } };

const SPOTS: Record<Station, { label: string; what: string }> = {
  select: { label: 'Test selector', what: 'Choose the admitted test and its conditions' },
  predict: { label: 'Prediction panel', what: 'Lock your prediction before the reveal' },
  reveal: { label: 'Observation window', what: 'Reveal what NASA documented' },
  explain: { label: 'Analysis bench', what: 'Explain it with the source and its limits' },
  report: { label: 'Case report', what: 'File the investigation' },
};
const ORDER: Station[] = ['select', 'predict', 'reveal', 'explain', 'report'];
const PIX: Record<Station | 'done', string> = {
  select: 'Detectives start from what was actually tested. Pick B20 and ask only for conditions NASA recorded.',
  predict: 'Write your prediction now and lock it. The engine stores it before anyone sees the result.',
  reveal: 'Time to compare. The window shows the documented observation, with its page.',
  explain: 'Explain what the source shows, and say what one run cannot tell us.',
  report: 'Good reasoning is on file. Close the case to record it.',
  done: 'Case closed. The engine recorded your prediction, the documented result and your explanation.',
};
const LIMITS: [string, string][] = [['single-run-no-causality', 'One run cannot show what caused the outcome'], ['pressure-unknown', 'Pressure for this run is unknown'], ['not-lunar-evidence', 'This is not evidence about a lunar habitat']];
const RELATIONS: [string, string][] = [['source-observation', 'The source documents this observation'], ['flow-caused-outcome', 'The airflow caused this outcome'], ['lunar-proof', 'This proves a lunar habitat is fire safe']];

export function FlameDetective({ snapshot, claim, sourceTitle, feedback, refusal, onIntent, recorded }: {
  snapshot: DetectiveSnapshot; claim: Claim; sourceTitle: string; feedback: Feedback; refusal: Refusal; recorded?: { label: string; value: string }[] | undefined; onIntent: (a: CampaignAction) => void;
}) {
  const s = snapshot.state, emit = emitter(onIntent);
  const prediction = s.predictions.find((p) => p.experimentId === 'bass2-b20');
  const revealed = s.passport.entries.some((e) => e.missionId === 'flame-detective');
  const objectives: Objective[] = [
    { id: 'select', label: 'Choose the admitted test at its recorded conditions', done: snapshot.selectedExperimentId === 'bass2-b20' },
    { id: 'predict', label: 'Lock a prediction before the reveal', done: !!prediction },
    { id: 'reveal', label: 'Reveal the documented NASA result', done: revealed },
    { id: 'explain', label: 'Explain it with the source and its limits', done: snapshot.explanation?.correct === true },
    { id: 'report', label: 'Complete Flame Detective', done: s.completedMissions.includes('flame-detective') },
  ];
  const next = objectives.find((o) => !o.done)?.id as Station | undefined;
  const [open, setOpen] = useState<Station | null>(null);
  const [oxygen, setOxygen] = useState('17.4');
  const [guess, setGuess] = useState('');
  const [relation, setRelation] = useState<string | null>(null);
  const [limits, setLimits] = useState<string[]>([]);
  const [words, setWords] = useState('');
  return <div className="mf-mission" data-mission="flame-detective">
    <div className="mf-main">
      <SceneViewport layout="detective" loading="Loading the observation lab…" next={next} open={open} onToggle={(id) => setOpen(open === id ? null : id as Station)}
        spots={ORDER.map((id) => ({ id, ...SPOTS[id] }))} />
      <PixLine text={PIX[next ?? 'done']} mood={next === 'explain' ? 'cite' : next ? 'look' : 'greet'} />
      <Verdict feedback={feedback} refusal={refusal} sourceTitle={sourceTitle} />
      <div id="mf-panel" className="mf-panel" hidden={!open} aria-live="polite">
        {open === 'select' && <form onSubmit={(e) => { e.preventDefault(); emit({ type: 'SELECT_EXPERIMENT', experimentId: 'bass2-b20', targetConditions: { material: 'PMMA', oxygenPct: Number(oxygen) } }); }}>
          <h3>Test selector · BASS-II B20</h3>
          <p>Material: PMMA. Ask for the oxygen level you want to investigate. NASA recorded 17.4 vol% calibrated for this run; anything else is a hypothetical the engine will refuse.</p>
          <div className="field"><label htmlFor="fd-oxygen">Oxygen (vol%)</label><input id="fd-oxygen" type="number" min={0} max={100} step="any" value={oxygen} onChange={(e) => setOxygen(e.target.value)} /></div>
          <button type="submit" className="btn btn-primary" disabled={!(Number(oxygen) >= 0 && oxygen !== '')}>Select this test</button>
        </form>}
        {open === 'predict' && <form onSubmit={(e) => { e.preventDefault(); if (guess.trim()) emit({ type: 'CORE', action: { type: 'PREDICT_OUTCOME', experimentId: 'bass2-b20', prediction: guess.trim() } }); }}>
          <h3>Prediction panel</h3>
          {prediction ? <p>Locked prediction: “{prediction.prediction}”. It cannot be changed after the reveal.</p> : <>
            <div className="field"><label htmlFor="fd-guess">What do you predict happened to the sample?</label><textarea id="fd-guess" rows={3} maxLength={500} value={guess} onChange={(e) => setGuess(e.target.value)} /></div>
            <button type="submit" className="btn btn-primary" disabled={!guess.trim()}>Lock my prediction</button></>}
        </form>}
        {open === 'reveal' && <>
          <h3>Observation window</h3>
          {revealed ? <><div className="mf-compare">
              <div className="mf-compare-col" data-kind="prediction"><span className="mf-compare-h">Your locked prediction</span><p>{prediction ? `“${prediction.prediction}”` : 'No prediction recorded.'}</p><span className="mf-fine">Stored by the server before the reveal.</span></div>
              <div className="mf-compare-col" data-kind="record"><span className="mf-compare-h">NASA documented result</span><blockquote>{claim.text}</blockquote><p className="mf-cite">{claim.citations.map((c) => cite(c, sourceTitle)).join('; ')}</p></div>
            </div>
            {recorded && <ul className="mf-conditions" aria-label="B20 recorded conditions">{recorded.map((r) => <li key={r.label} data-known={r.value !== 'Not recorded'}><b>{r.label}</b> {r.value === 'Not recorded' ? 'unknown' : r.value}</li>)}</ul>}
            <p className="mf-fine">One run documents one outcome. It cannot show what caused it, and missing conditions stay unknown.</p></>
            : <><p>The documented result appears once the engine accepts the reveal.</p>
              <button type="button" className="btn btn-primary" onClick={() => emit({ type: 'CORE', action: { type: 'OBSERVE_DOCUMENTED_RESULT', experimentId: 'bass2-b20' } })}>Reveal the documented result</button></>}
        </>}
        {open === 'explain' && <form onSubmit={(e) => { e.preventDefault(); if (relation) emit({ type: 'EXPLAIN_OBSERVATION', claimId: claim.id, citations: claim.citations, relation: relation as 'source-observation', limitations: limits as ['single-run-no-causality'], learnerExplanation: words.trim() || 'No written explanation.' }); }}>
          <h3>Analysis bench</h3>
          <fieldset><legend>What does the source show?</legend>
            {RELATIONS.map(([v, l]) => <label key={v}><input type="radio" name="fd-relation" checked={relation === v} onChange={() => setRelation(v)} /> {l}</label>)}</fieldset>
          <fieldset><legend>Which limits apply? (choose all that do)</legend>
            {LIMITS.map(([v, l]) => <label key={v}><input type="checkbox" checked={limits.includes(v)} onChange={(e) => setLimits(e.target.checked ? [...limits, v] : limits.filter((x) => x !== v))} /> {l}</label>)}</fieldset>
          <div className="field"><label htmlFor="fd-words">In your own words (kept, not graded)</label><textarea id="fd-words" rows={2} maxLength={500} value={words} onChange={(e) => setWords(e.target.value)} /></div>
          <button type="submit" className="btn btn-primary" disabled={!relation}>Submit my explanation</button>
        </form>}
        {open === 'report' && <>
          <h3>Case report</h3>
          <p>The engine closes the case only after a correct structured explanation.</p>
          <button type="button" className="btn btn-primary" onClick={() => emit({ type: 'CORE', action: { type: 'COMPLETE_MISSION', missionId: 'flame-detective' } })}>Complete Flame Detective</button>
        </>}
      </div>
    </div>
    <aside className="mf-side">
      <Objectives title="Flame Detective objectives" items={objectives} />
      <PassportList entries={s.passport.entries.filter((e) => e.missionId === 'flame-detective')} sourceTitle={sourceTitle} />
    </aside>
  </div>;
}
