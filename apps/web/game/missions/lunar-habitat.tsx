'use client';
// Mission 05 · Lunar Habitat (FICTIONAL scenario). Renders a CampaignSnapshot and emits ASSESS_HABITAT,
// RECORD_DECISION, PROPOSE_NEXT_TEST and COMPLETE_MISSION intents (evidence-campaign-v1). Scenario values are the
// learner's inputs, never NASA measurements; the engine judges the assessment and refuses safety verdicts.
import { useState } from 'react';
import type { CampaignAction, Citation } from '@microfire/shared';
import { Objectives, PassportList, PixLine, Verdict, cite, emitter, type Feedback, type Objective, type Refusal } from './mission-kit';
import { SceneViewport } from './scene-viewport';
import type { Claim } from './station-arrival';

type Station = 'evidence' | 'conditions' | 'assess' | 'decide' | 'report';
type Dim = 'gravity' | 'oxygen' | 'pressure' | 'ventilation' | 'material';
export type HabitatSnapshot = { habitat: { correct: boolean; reasons: string[] } | null; state: { completedMissions: string[]; decision: { verdict: string } | null; proposals: unknown[];
  passport: { entries: { id: string; missionId: string; claimIds: string[]; conclusion: string; observationType: string; evidenceLevel: string; citations: Citation[]; limitations: string[]; scenario: string }[] } } };
export type RecordedCondition = { label: string; value: string };

const SPOTS: Record<Station, { label: string; what: string }> = {
  evidence: { label: 'Evidence terminal', what: 'What NASA actually recorded for B20' },
  conditions: { label: 'Habitat console', what: 'Set your fictional habitat conditions' },
  assess: { label: 'Life-support bay', what: 'Assess what the evidence can and cannot say' },
  decide: { label: 'Decision station', what: 'Record a provisional decision' },
  report: { label: 'Airlock log', what: 'Propose the next test and file the report' },
};
const ORDER: Station[] = ['evidence', 'conditions', 'assess', 'decide', 'report'];
const DIMS: [Dim, string][] = [['gravity', 'Gravity'], ['oxygen', 'Oxygen'], ['pressure', 'Pressure'], ['ventilation', 'Ventilation'], ['material', 'Material']];
const VERDICTS: [string, string][] = [['insufficient-evidence', 'Insufficient evidence to decide'], ['safe', 'The habitat is fire safe'], ['unsafe', 'The habitat is unsafe']];

export function LunarHabitat({ snapshot, claim, recorded, sourceTitle, feedback, refusal, onIntent }: {
  snapshot: HabitatSnapshot; claim: Claim; recorded: RecordedCondition[]; sourceTitle: string; feedback: Feedback; refusal: Refusal; onIntent: (a: CampaignAction) => void;
}) {
  const s = snapshot.state, emit = emitter(onIntent);
  const objectives: Objective[] = [
    { id: 'assess', label: 'Assessment accepted: evidence, gaps and next measurements', done: snapshot.habitat?.correct === true },
    { id: 'decide', label: 'Provisional decision recorded', done: !!s.decision },
    { id: 'report', label: 'Next test proposed', done: s.proposals.length > 0 },
    { id: 'file', label: 'Case report filed', done: s.completedMissions.includes('lunar-habitat') },
  ];
  const nextObj = objectives.find((o) => !o.done)?.id;
  const next: Station | undefined = !nextObj ? undefined : nextObj === 'assess' ? (snapshot.habitat ? 'assess' : 'evidence') : nextObj === 'decide' ? 'decide' : 'report';
  const [open, setOpen] = useState<Station | null>(null);
  const [sc, setSc] = useState({ oxygen: '26', pressure: '55', ventilation: 'Forced ventilation (fictional)', material: 'PMMA panel' });
  const [verdict, setVerdict] = useState<string | null>(null);
  const [gaps, setGaps] = useState<Dim[]>([]), [nextM, setNextM] = useState<Dim[]>([]);
  const [why, setWhy] = useState(''), [decision, setDecision] = useState<string | null>(null), [question, setQuestion] = useState('');
  const toggle = (list: Dim[], set: (v: Dim[]) => void, v: Dim, on: boolean) => set(on ? [...list, v] : list.filter((x) => x !== v));
  const num = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  return <div className="mf-mission" data-mission="lunar-habitat">
    <div className="mf-main">
      <p className="mf-fiction" role="note"><b>Fictional scenario.</b> This habitat and its conditions are invented for practice. Only the B20 record is NASA evidence, and it was not a lunar test.</p>
      <SceneViewport layout="habitat" loading="Loading the habitat module…" next={next} open={open} onToggle={(id) => setOpen(open === id ? null : id as Station)}
        spots={ORDER.map((id) => ({ id, ...SPOTS[id] }))} />
      <PixLine mood={next === 'assess' ? 'gap' : next ? 'look' : 'greet'} text={!next ? 'Report filed. Your recommendation is provisional, and the gaps are on record.'
        : next === 'evidence' ? 'Start with what NASA recorded. Then compare it with your habitat, condition by condition.'
          : next === 'assess' ? 'Name what B20 cannot tell us here, and which measurements would close the gaps.'
            : next === 'decide' ? 'Record a provisional decision that matches the strength of the evidence.'
              : 'Propose the next test, then file the report.'} />
      <Verdict feedback={feedback} refusal={refusal} sourceTitle={sourceTitle} />
      <div id="mf-panel" className="mf-panel" hidden={!open} aria-live="polite">
        {open === 'evidence' && <><h3>Evidence terminal · BASS-II B20</h3>
          <blockquote>{claim.text}</blockquote><p className="mf-cite">{claim.citations.map((c) => cite(c, sourceTitle)).join('; ')}</p>
          <dl className="mf-recorded">{recorded.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl>
          <p className="mf-fine">Recorded on an orbital test, not on the Moon. Unrecorded values stay unknown.</p></>}
        {open === 'conditions' && <><h3>Habitat console · your fictional scenario</h3>
          <div className="fieldset-grid">
            <div className="field"><label htmlFor="lh-o2">Oxygen (vol%)</label><input id="lh-o2" type="number" min={0} max={100} step="any" value={sc.oxygen} onChange={(e) => setSc({ ...sc, oxygen: e.target.value })} /></div>
            <div className="field"><label htmlFor="lh-p">Pressure (kPa)</label><input id="lh-p" type="number" min={0} step="any" value={sc.pressure} onChange={(e) => setSc({ ...sc, pressure: e.target.value })} /></div>
            <div className="field"><label htmlFor="lh-v">Ventilation</label><input id="lh-v" type="text" maxLength={200} value={sc.ventilation} onChange={(e) => setSc({ ...sc, ventilation: e.target.value })} /></div>
            <div className="field"><label htmlFor="lh-m">Material</label><input id="lh-m" type="text" maxLength={200} value={sc.material} onChange={(e) => setSc({ ...sc, material: e.target.value })} /></div>
          </div><p className="mf-fine">Gravity: lunar. These values are yours; they are compared with B20, not measured.</p></>}
        {open === 'assess' && <form onSubmit={(e) => { e.preventDefault(); if (!verdict || nextM.length === 0) return;
          emit({ type: 'ASSESS_HABITAT', scenario: { gravity: 'lunar', oxygenPct: num(sc.oxygen), pressureKpa: num(sc.pressure) === 0 ? null : num(sc.pressure), ventilation: sc.ventilation.trim() || 'Not specified', material: sc.material.trim() || 'Not specified' },
            verdict: verdict as 'insufficient-evidence', citations: claim.citations, gaps, nextMeasurements: nextM, learnerExplanation: why.trim() || 'No written reasoning.' }); }}>
          <h3>Life-support bay · assessment</h3>
          <fieldset><legend>What can the evidence conclude about this habitat?</legend>{VERDICTS.map(([v, l]) => <label key={v}><input type="radio" name="lh-verdict" checked={verdict === v} onChange={() => setVerdict(v)} /> {l}</label>)}</fieldset>
          <fieldset><legend>Where does B20 not apply? (applicability gaps)</legend>{DIMS.map(([v, l]) => <label key={v}><input type="checkbox" checked={gaps.includes(v)} onChange={(e) => toggle(gaps, setGaps, v, e.target.checked)} /> {l}</label>)}</fieldset>
          <fieldset><legend>Which measurements should come next? (at least one)</legend>{DIMS.map(([v, l]) => <label key={v}><input type="checkbox" checked={nextM.includes(v)} onChange={(e) => toggle(nextM, setNextM, v, e.target.checked)} /> {l}</label>)}</fieldset>
          <div className="field"><label htmlFor="lh-why">Your reasoning (kept, not graded)</label><textarea id="lh-why" rows={2} maxLength={500} value={why} onChange={(e) => setWhy(e.target.value)} /></div>
          <button type="submit" className="btn btn-primary" disabled={!verdict || nextM.length === 0}>Submit assessment</button>
        </form>}
        {open === 'decide' && <form onSubmit={(e) => { e.preventDefault(); if (decision) emit({ type: 'CORE', action: { type: 'RECORD_DECISION', verdict: decision as 'insufficient-evidence' } }); }}>
          <h3>Decision station</h3>
          {s.decision ? <p>Recorded decision: <b>{VERDICTS.find(([v]) => v === s.decision!.verdict)?.[1] ?? s.decision.verdict}</b> (provisional).</p> : <>
            <fieldset><legend>Provisional decision</legend>{VERDICTS.map(([v, l]) => <label key={v}><input type="radio" name="lh-decision" checked={decision === v} onChange={() => setDecision(v)} /> {l}</label>)}</fieldset>
            <button type="submit" className="btn btn-primary" disabled={!decision}>Record decision</button></>}
        </form>}
        {open === 'report' && <form onSubmit={(e) => { e.preventDefault(); if (question.trim()) emit({ type: 'CORE', action: { type: 'PROPOSE_NEXT_TEST', question: question.trim(), limitations: ['B20 is an orbital test, not a lunar test.'] } }); }}>
          <h3>Airlock log</h3>
          <div className="field"><label htmlFor="lh-q">Proposed next test</label><textarea id="lh-q" rows={2} maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Test PMMA flame spread at lunar gravity and the habitat pressure." /></div>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={!question.trim()}>Propose this test</button>
            <button type="button" className="btn" onClick={() => emit({ type: 'CORE', action: { type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' } })}>File the case report</button>
          </div>
        </form>}
      </div>
    </div>
    <aside className="mf-side">
      <Objectives title="Lunar Habitat objectives" items={objectives} />
      <PassportList entries={s.passport.entries.filter((e) => e.missionId === 'lunar-habitat')} sourceTitle={sourceTitle} />
    </aside>
  </div>;
}
