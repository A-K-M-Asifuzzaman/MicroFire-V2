'use client';
// Mission 04 · Claim Trial. Renders a CampaignSnapshot and emits APPRAISE_CLAIM / COMPLETE_MISSION intents
// (evidence-campaign-v1). The browser holds only the statements' text and the citable evidence; it never knows the
// expected answers. Correctness, reasons and the case report all come from the campaign engine.
import { useState } from 'react';
import { EvidenceLevelSchema, StatementTypeSchema, type CampaignAction, type Citation } from '@microfire/shared';
import { Objectives, PassportList, PixLine, Verdict, cite, emitter, type Feedback, type Objective, type Refusal } from './mission-kit';
import { SceneViewport } from './scene-viewport';

type Station = 'statements' | 'archive' | 'appraise' | 'report';
export type Statement = { id: string; text: string; origin: string };
export type EvidenceOption = { id: string; label: string; citation: Citation };
type Fb = { correct: boolean; reasons: string[] };
export type TrialSnapshot = { appraisals: Record<string, Fb>; state: { completedMissions: string[];
  passport: { entries: { id: string; missionId: string; claimIds: string[]; conclusion: string; observationType: string; evidenceLevel: string; citations: Citation[]; limitations: string[]; scenario: string }[] } } };

const SPOTS: Record<Station, { label: string; what: string }> = {
  statements: { label: 'Statement board', what: 'Read the four statements on trial' },
  archive: { label: 'Source archive', what: 'Inspect the citable NASA evidence' },
  appraise: { label: 'Review desk', what: 'Classify a statement and its support' },
  report: { label: 'Case lectern', what: 'File the case report' },
};
const ORDER: Station[] = ['statements', 'archive', 'appraise', 'report'];
const KIND: Record<string, string> = { observed: 'Observed in the source', derived: 'Derived from recorded values', interpretation: 'Interpretation', hypothesis: 'Hypothesis', unknown: 'Unknown / not established' };
const LEVEL: Record<string, string> = { direct: 'Direct evidence', analogous: 'Analogous evidence', mechanistic: 'Mechanistic reasoning', gap: 'Evidence gap' };
const SUPPORT: [string, string][] = [['supports', 'The evidence supports it'], ['contradicts', 'The evidence contradicts it'], ['insufficient', 'The evidence is insufficient']];
const CONFOUNDERS: [string, string][] = [['flow-history', 'Airflow changed during the run'], ['gravity', 'Gravity differs or is unknown'], ['pressure', 'Pressure differs or is unknown']];

export function ClaimTrial({ snapshot, statements, evidence, sourceTitle, feedback, refusal, onIntent }: {
  snapshot: TrialSnapshot; statements: Statement[]; evidence: EvidenceOption[]; sourceTitle: string; feedback: Feedback; refusal: Refusal; onIntent: (a: CampaignAction) => void;
}) {
  const s = snapshot.state, emit = emitter(onIntent);
  const objectives: Objective[] = [...statements.map((st, i) => ({ id: st.id, label: `Statement ${i + 1} appraised correctly`, done: snapshot.appraisals[st.id]?.correct === true })),
    { id: 'report', label: 'File the Claim Trial case report', done: s.completedMissions.includes('claim-trial') }];
  const pending = statements.find((st) => snapshot.appraisals[st.id]?.correct !== true);
  const next: Station | undefined = s.completedMissions.includes('claim-trial') ? undefined : pending ? (Object.keys(snapshot.appraisals).length ? 'appraise' : 'statements') : 'report';
  const [open, setOpen] = useState<Station | null>(null);
  const [target, setTarget] = useState(statements[0]!.id);
  const [kind, setKind] = useState<string | null>(null), [level, setLevel] = useState<string | null>(null), [support, setSupport] = useState<string | null>(null);
  const [cites, setCites] = useState<string[]>([]), [conf, setConf] = useState<string[]>([]);
  const toggle = (list: string[], set: (v: string[]) => void, v: string, on: boolean) => set(on ? [...list, v] : list.filter((x) => x !== v));
  const ready = kind && level && support && cites.length > 0;
  const status = (id: string) => snapshot.appraisals[id] ? (snapshot.appraisals[id]!.correct ? 'correct' : 'wrong') : 'open';
  return <div className="mf-mission" data-mission="claim-trial">
    <div className="mf-main">
      <SceneViewport layout="trial" loading="Loading the evidence hall…" next={next} open={open} onToggle={(id) => setOpen(open === id ? null : id as Station)}
        spots={ORDER.map((id) => ({ id, ...SPOTS[id] }))} />
      <PixLine mood={next === 'appraise' ? 'cite' : next ? 'look' : 'greet'} text={!next ? 'Case filed. The engine recorded every appraisal, including the ones you corrected.'
        : next === 'statements' ? 'Four statements are on trial. Some come from NASA, some are tutorial claims. Read them first.'
          : next === 'report' ? 'Every statement is appraised correctly. File the case report at the lectern.'
            : 'Classify each statement: what kind of claim, how strong, which source, and what could confound it.'} />
      <Verdict feedback={feedback} refusal={refusal} sourceTitle={sourceTitle} />
      <div id="mf-panel" className="mf-panel" hidden={!open} aria-live="polite">
        {open === 'statements' && <><h3>Statement board</h3>
          <ol className="mf-statements">{statements.map((st) => <li key={st.id} data-status={status(st.id)}>
            <p>“{st.text}”</p>
            <span className="mf-kind" data-origin={st.origin}>{st.origin === 'research' ? 'From the NASA record' : 'Tutorial claim'}</span>{' '}
            <span className="mf-fine">{status(st.id) === 'correct' ? '✓ appraised correctly' : status(st.id) === 'wrong' ? '✗ needs correction' : 'not yet appraised'}</span>
            {snapshot.appraisals[st.id] && !snapshot.appraisals[st.id]!.correct && <ul className="mf-fine">{snapshot.appraisals[st.id]!.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          </li>)}</ol></>}
        {open === 'archive' && <><h3>Source archive</h3><p>The only citable evidence: entries from the admitted B20 record.</p>
          <ul>{evidence.map((e) => <li key={e.id}><b>{e.label}</b><br /><span className="mf-cite">{cite(e.citation, sourceTitle)}</span></li>)}</ul></>}
        {open === 'appraise' && <form onSubmit={(e) => { e.preventDefault(); if (!ready) return;
          emit({ type: 'APPRAISE_CLAIM', statementId: target, kind: kind as 'observed', evidenceLevel: level as 'direct', support: support as 'supports',
            citations: evidence.filter((x) => cites.includes(x.id)).map((x) => x.citation), confounders: conf as ['gravity'] }); }}>
          <h3>Review desk</h3>
          <div className="field"><label htmlFor="ct-target">Statement</label>
            <select id="ct-target" value={target} onChange={(e) => setTarget(e.target.value)}>{statements.map((st, i) => <option key={st.id} value={st.id}>{i + 1}. {st.text.slice(0, 70)}{st.text.length > 70 ? '…' : ''}</option>)}</select></div>
          <fieldset><legend>What kind of statement is it?</legend>{StatementTypeSchema.options.map((v) => <label key={v}><input type="radio" name="ct-kind" checked={kind === v} onChange={() => setKind(v)} /> {KIND[v] ?? v}</label>)}</fieldset>
          <fieldset><legend>How strong is the evidence for it?</legend>{EvidenceLevelSchema.options.map((v) => <label key={v}><input type="radio" name="ct-level" checked={level === v} onChange={() => setLevel(v)} /> {LEVEL[v] ?? v}</label>)}</fieldset>
          <fieldset><legend>Which source evidence applies? (at least one)</legend>{evidence.map((x) => <label key={x.id}><input type="checkbox" checked={cites.includes(x.id)} onChange={(e) => toggle(cites, setCites, x.id, e.target.checked)} /> {x.label}</label>)}</fieldset>
          <fieldset><legend>Does that evidence support the statement?</legend>{SUPPORT.map(([v, l]) => <label key={v}><input type="radio" name="ct-support" checked={support === v} onChange={() => setSupport(v)} /> {l}</label>)}</fieldset>
          <fieldset><legend>Confounders to name (any that apply)</legend>{CONFOUNDERS.map(([v, l]) => <label key={v}><input type="checkbox" checked={conf.includes(v)} onChange={(e) => toggle(conf, setConf, v, e.target.checked)} /> {l}</label>)}</fieldset>
          <button type="submit" className="btn btn-primary" disabled={!ready}>Submit appraisal</button>
        </form>}
        {open === 'report' && <><h3>Case lectern</h3><p>The engine files the case only when every statement is appraised correctly.</p>
          <button type="button" className="btn btn-primary" onClick={() => emit({ type: 'CORE', action: { type: 'COMPLETE_MISSION', missionId: 'claim-trial' } })}>File the case report</button></>}
      </div>
    </div>
    <aside className="mf-side">
      <Objectives title="Claim Trial objectives" items={objectives} />
      <PassportList entries={s.passport.entries.filter((e) => e.missionId === 'claim-trial')} sourceTitle={sourceTitle} />
    </aside>
  </div>;
}
