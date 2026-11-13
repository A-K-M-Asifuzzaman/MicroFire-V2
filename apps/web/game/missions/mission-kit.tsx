'use client';
// Shared mission-scene UI. Everything here renders engine output (CampaignSnapshot, feedback, refusals) or emits
// schema-validated CampaignAction intents. No rule is evaluated in the browser: correctness, completion and evidence
// all come from the campaign engine on the server (or, in the fixture gallery, from its recorded output).
import { CampaignActionSchema, type CampaignAction, type Citation } from '@microfire/shared';
import { PixAvatar } from '../../components/pix-avatar';

export type Feedback = { correct: boolean; reasons: string[]; citations: Citation[]; scope: string } | null;
export type Refusal = { code: string; message: string } | null;
export type Objective = { id: string; label: string; done: boolean };
export type Emit = (action: CampaignAction) => void;

/** Validates against the shared campaign schema before anything leaves the component. */
export function emitter(onIntent: (a: CampaignAction) => void): Emit {
  return (action) => onIntent(CampaignActionSchema.parse(action));
}

export function cite(c: Citation, sourceTitle: string) {
  const l = c.locator as { kind: string; page?: number; printedPage?: string; section?: string };
  return `${sourceTitle}${l.section ? ` · ${l.section}` : ''}${l.page ? ` · PDF page ${l.page}${l.printedPage ? ` (printed ${l.printedPage})` : ''}` : ''}`;
}

export function Objectives({ items, title }: { items: Objective[]; title: string }) {
  const next = items.find((o) => !o.done);
  return <section className="mf-objectives" aria-label={title}>
    <h2>{title}</h2>
    <ol>{items.map((o) => <li key={o.id} data-done={o.done} aria-current={o === next ? 'step' : undefined}>
      <span className="mf-tick" aria-hidden="true">{o.done ? '✓' : ''}</span>{o.label}<span className="sr-only">{o.done ? ' (done)' : o === next ? ' (current)' : ''}</span>
    </li>)}</ol>
  </section>;
}

export function PixLine({ text, mood = 'look' }: { text: string; mood?: 'greet' | 'look' | 'cite' | 'gap' }) {
  return <div className="mf-pix"><div className="mf-pix-face" aria-hidden="true"><PixAvatar mood={mood} state={mood === 'gap' ? 'abstained' : 'idle'} /></div>
    <p aria-live="polite"><b>PIX:</b> {text}</p></div>;
}

export function Verdict({ feedback, refusal, sourceTitle }: { feedback: Feedback; refusal: Refusal; sourceTitle: string }) {
  if (refusal) return <div className="mf-verdict" data-kind="refused" role="status"><b>Not accepted.</b> {refusal.message}</div>;
  if (!feedback) return null;
  return <div className="mf-verdict" data-kind={feedback.correct ? 'correct' : 'wrong'} role="status">
    <b>{feedback.correct ? 'Accepted.' : 'Not yet. Here is why:'}</b>
    {feedback.reasons.length > 0 && <ul>{feedback.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
    {feedback.citations.length > 0 && <p className="mf-cite">Source: {feedback.citations.map((c) => cite(c, sourceTitle)).join('; ')}</p>}
    <p className="mf-fine">Educational criteria, not a semantic check of your words.</p>
  </div>;
}

const ENTRY_LABELS: Record<string, { title: string; action: string }> = {
  'station-arrival': { title: '01 · Station Arrival', action: 'Investigated and separated source evidence from fiction' },
  'bass-assembly': { title: '02 · BASS-II Training', action: 'Diagnosed and qualified an educational apparatus' },
  'flame-detective': { title: '03 · Flame Detective', action: 'Predicted, observed and evaluated the experiment result' },
  'claim-trial': { title: '04 · Claim Trial', action: 'Appraised claims against the available evidence' },
  'lunar-habitat': { title: '05 · Lunar Habitat', action: 'Assessed a hypothetical habitat and documented its evidence gaps' }
};
type Entry = { id: string; missionId?: string; conclusion: string; observationType: string; evidenceLevel: string; citations: Citation[]; limitations: string[]; scenario: string };
export function PassportList({ entries, sourceTitle }: { entries: Entry[]; sourceTitle: string }) {
  return <section className="mf-passport" aria-label="Evidence Passport">
    <h2>Evidence Passport</h2>
    {entries.length === 0 ? <p className="mf-fine">Nothing recorded yet. Entries appear only when the campaign engine accepts them.</p>
      : <ul>{entries.map((e) => <li key={e.id} data-scenario={e.scenario}>
        {e.missionId && ENTRY_LABELS[e.missionId] && <><h3>{ENTRY_LABELS[e.missionId]!.title}</h3><p><b>Mission task:</b> {ENTRY_LABELS[e.missionId]!.action}</p></>}
        <span className="mf-kind">{e.scenario === 'research' ? `NASA source · ${e.observationType}` : 'Fictional scenario'}</span>
        <p>{e.conclusion}</p>
        <p className="mf-cite">{e.citations.map((c) => cite(c, sourceTitle)).join('; ')}</p>
        <details><summary>Limits of this evidence</summary><ul>{e.limitations.map((l) => <li key={l}>{l}</li>)}</ul></details>
      </li>)}</ul>}
  </section>;
}
