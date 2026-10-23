'use client';
import { useState, type FormEvent } from 'react';
import { CitationList, Limitations } from '../../components/evidence-ui';
import { contractRuntime, type NoteIssue, type Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allows, allowsCore, budgetLevel, core } from '../view-model';
import { useGame } from './context';

const issueText: Record<NoteIssue, string> = {
  blank: 'Write something before adding the note.',
  'outer-whitespace': 'Remove spaces or line breaks at the beginning and end.',
  'lone-surrogate': 'The note contains a broken character. Retype the last symbol you added.',
  'control-character': 'Remove hidden control characters (tabs and line breaks are fine).',
  'too-long': 'Shorten the note to 500 characters or fewer.',
  'too-many-bytes': 'The note is too large to store. Shorten it.'
};
const MAX_NOTES = 4;

/** Three visibly separate kinds of record. Training history never carries a direct-evidence stamp. */
export function PassportPanel({ s }: { s: Snapshot }) {
  const { data } = useGame();
  const pp = s.passportPresentation;
  const entries = pp.sourceEvidence.passportEntryIds.map((id) => s.state.passport.entries.find((e) => e.id === id)).filter((e) => !!e);
  const review = (id: string) => s.evidenceReview.entries.find((e) => e.entryId === id)?.status ?? 'not-validated';
  return <section className="m2-passport" aria-labelledby="m2-pp-h">
    <div className="m2-pp-head">
      <div><p className="eyebrow">Evidence Passport · training episode</p><h2 id="m2-pp-h" className="m2-h2">Your evidence notebook</h2></div>
      <p className="m2-budget" data-level={budgetLevel(s)}>Case size {(s.checkpointBudget.payloadBytes / 1024).toFixed(1)} KB of {(s.checkpointBudget.limitBytes / 1024).toFixed(0)} KB</p>
    </div>

    <article className="m2-pp-section" data-origin="research" aria-labelledby="m2-pp-src">
      <h3 id="m2-pp-src" className="m2-h4"><span className="m2-prov" data-prov="source">1 · Verified source observations</span></h3>
      <p className="m2-fine">From NASA’s B20 record. Citation lineage checked (structure and citations only) — not a scientific approval.</p>
      {entries.map((e) => <div key={e.id} className="m2-pp-entry">
        <p className="m2-fine">{e.missionId === 'station-arrival' ? 'Collected at Station Arrival' : 'Reviewed after training qualification'} · lineage: {review(e.id).replace('-', ' ')}</p>
        <blockquote className="m2-claim">{e.conclusion}</blockquote>
        <CitationList citations={e.citations} sources={data.b20.sources} />
        <Limitations items={e.limitations} />
      </div>)}
      {entries.length === 0 && <p className="m2-fine">No source observation collected yet.</p>}
    </article>

    <article className="m2-pp-section" data-origin="training" aria-labelledby="m2-pp-train">
      <h3 id="m2-pp-train" className="m2-h4"><span className="m2-prov" data-prov="training">2 · Authored training history</span></h3>
      <p className="m2-fine">Training simulation · evidence level: not applicable · not a historical NASA event.</p>
      {pp.trainingHistory.corrections.map((t) => <div key={t.id} className="m2-pp-entry">
        <p><s className="m2-prev">{t.previous}</s></p>
        <p>{t.revised}</p>
        <p className="m2-fine">{t.reason}</p>
      </div>)}
      {pp.trainingHistory.corrections.length === 0 && <p className="m2-fine">The training record appears after the documented B20 result is reviewed.</p>}
    </article>

    <article className="m2-pp-section" data-origin="learner" aria-labelledby="m2-pp-notes">
      <h3 id="m2-pp-notes" className="m2-h4"><span className="m2-prov" data-prov="learner">3 · Learner interpretations</span></h3>
      <p className="m2-fine">Your own words · not scientifically assessed · never shown as source evidence.</p>
      {pp.learnerConclusions.notes.length > 0 && <ol className="m2-notes">{pp.learnerConclusions.notes.map((n) => <li key={`${n.entryId}:${n.noteIndex}`}>{n.text}</li>)}</ol>}
      <NoteEditor s={s} used={pp.learnerConclusions.notes.length} />
    </article>
    <Completion s={s} />
  </section>;
}

function NoteEditor({ s, used }: { s: Snapshot; used: number }) {
  const { c, s: st } = useGame();
  const [draft, setDraft] = useState('');
  const rejected = st.link.status === 'request-rejected' && st.link.noteIssue ? st.link : null;
  const allowed = allows(s, 'ADD_LEARNER_NOTE');
  if (!allowed) return null;
  if (used >= MAX_NOTES) return <p className="m2-fine">You have added the maximum of {MAX_NOTES} notes.</p>;
  const preflight = contractRuntime?.noteIssue(draft) ?? null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (preflight) return; // N7: Sol's shared preflight avoids spending a request on a note the server would reject
    // Draft is kept until the server accepts it; an invalid note leaves the exact text in place.
    void c.send({ type: 'ADD_LEARNER_NOTE', text: draft }, 'Add a learner note').then(() => {
      const ev = c.getState().event;
      if (ev?.kind === 'accepted' && ev.action?.type === 'ADD_LEARNER_NOTE') setDraft('');
    });
  };
  return <form className="m2-note-form" onSubmit={submit}>
    <label className="m2-field"><span>Your interpretation ({used} of {MAX_NOTES} notes used)</span>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} rows={3} aria-describedby="m2-note-help" />
    </label>
    <p id="m2-note-help" className="m2-fine">{draft.length}/500 · What do you think the B20 record shows, and what can it not tell you?</p>
    {preflight && draft && <p className="m2-feedback" data-kind="coach" role="status">{issueText[preflight]}</p>}
    {rejected && <p className="m2-feedback" data-kind="refused" role="alert"><b>Note not added.</b> {issueText[rejected.noteIssue!]} Your text is still here.</p>}
    <button className="btn btn-quiet" type="submit" disabled={!draft || isBusy(st.link) || st.link.status !== 'confirmed'}>Add note</button>
  </form>;
}

function Completion({ s }: { s: Snapshot }) {
  const { c, s: st } = useGame();
  if (s.progress.step === 'complete') return <div className="m2-stamp" data-tone="complete" role="status"><b>Training episode complete</b><span>All five learning checks are done. Download your checkpoint to keep this case.</span></div>;
  if (!allowsCore(s, 'COMPLETE_MISSION')) return null;
  return <div className="m2-complete-row">
    <button className="btn btn-primary" disabled={st.link.status !== 'confirmed'} onClick={() => void c.send(core({ type: 'COMPLETE_MISSION', missionId: 'bass-assembly' }), 'Complete the training episode')}>Complete the training episode</button>
    <p className="m2-fine">Notes can only be added before completion.</p>
  </div>;
}
