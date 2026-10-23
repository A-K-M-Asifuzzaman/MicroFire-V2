'use client';
import { useEffect, useRef, useState } from 'react';
import type { LocalSaveResult, Snapshot } from '../contract';
import { isBusy, type Link } from '../controller';
import { JOURNEY, journeyIndex } from '../view-model';
import { useGame } from './context';

/** Ten-stage journey rail. Stage comes from the server step; nothing is unlocked locally. */
export function JourneyRail({ s }: { s: Snapshot }) {
  const at = journeyIndex(s);
  return <ol className="m2-rail" aria-label="Mission journey">
    {JOURNEY.map((j, i) => <li key={j.id} data-state={i < at ? 'done' : i === at ? 'now' : 'next'} aria-current={i === at ? 'step' : undefined}>
      <span className="m2-rail-dot" aria-hidden="true">{i < at ? '✓' : i + 1}</span><span className="m2-rail-label">{j.label}</span>
    </li>)}
  </ol>;
}

/** The five named learning checks, exactly as the server derived them. Never a score. */
export function Checks({ s }: { s: Snapshot }) {
  const { checks, completedChecks, totalChecks } = s.progress;
  return <section className="m2-checks" aria-labelledby="m2-checks-h">
    <h2 id="m2-checks-h" className="m2-h">Learning checks <span className="m2-count">{completedChecks} of {totalChecks}</span></h2>
    <ul>{checks.map((c) => <li key={c.id} data-done={c.done}><span aria-hidden="true">{c.done ? '◆' : '◇'}</span> {c.label}<span className="sr-only">{c.done ? ' — done' : ' — not yet'}</span></li>)}</ul>
    <p className="m2-fine">Learning checks show progress through the training episode. They are not a grade, a safety rating or a scientific score.</p>
  </section>;
}

const saveText = (r: LocalSaveResult): string => {
  if (r.ok) return 'Saved on this device.';
  switch (r.code) {
    case 'LOCAL_READ_ONLY': return 'Read-only on this browser. Writable saves are enabled per browser engine only after its storage-consistency gate passes. Download your checkpoint to keep it.';
    case 'LOCAL_LOCK_BUSY': return 'Another tab is saving right now. Nothing was written; your previous save is intact. Try again in a moment.';
    case 'LOCAL_WRITE_FAILED': return r.writeOutcome === 'unknown'
      ? `The save could not be verified (${r.cause.replaceAll('-', ' ')}). It is not counted as saved; download your checkpoint.`
      : `The save was not written (${r.cause}). Your previous save is intact; download your checkpoint.`;
    case 'LOCAL_STORAGE_UNAVAILABLE': return 'Browser storage is unavailable. Download your checkpoint to keep it.';
    case 'LOCAL_NEWER': return 'This device already holds a newer save of this case. Nothing was overwritten.';
    case 'LOCAL_GENERATION_CHANGED': return 'Another tab changed the saved case. Review it before saving again.';
    case 'LOCAL_SAME_REVISION_CONFLICT': return 'A different save exists for the same revision. Both are kept for review.';
    case 'LOCAL_DIFFERENT_CASE': return 'This device holds a different case. Back it up before replacing it.';
    case 'LOCAL_NEEDS_REVIEW': return 'The saved data on this device needs review before anything is written.';
  }
};

export function downloadCheckpoint(s: Snapshot) {
  const blob = new Blob([s.checkpoint], { type: 'text/plain' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `microfire-b20-training-r${s.revision}.checkpoint.txt` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Save status: confirmed-on-server and saved-on-device are different things and are never conflated. */
export function SaveStatus({ s }: { s: Snapshot }) {
  const { c, s: st } = useGame();
  const save = st.save;
  const saved = save.saved?.sessionId === s.sessionId && save.saved.revision === s.revision;
  const state = saved ? 'saved' : save.result && !save.result.ok && save.result.code !== 'LOCAL_READ_ONLY' ? 'problem' : save.capability === 'read-only' ? 'read-only' : 'unsaved';
  const label = { saved: `Saved on this device · rev ${s.revision}`, problem: 'Save unsuccessful', 'read-only': 'Read-only browser save', unsaved: `Confirmed by server · not saved on this device` }[state];
  return <div className="m2-save" data-state={state}>
    <p className="m2-save-pill" role="status"><span aria-hidden="true" className="m2-save-dot" />{label}</p>
    {save.result && !save.result.ok && <p className="m2-fine">{saveText(save.result)}</p>}
    {!save.result && state === 'read-only' && <p className="m2-fine">Server-confirmed progress (rev {s.revision}). This browser is in read-only save mode; download the checkpoint to keep it.</p>}
    <div className="m2-row">
      {save.capability === 'writable' && <button className="btn btn-quiet btn-sm" onClick={() => void c.save()} disabled={save.busy}>{save.busy ? 'Saving…' : 'Save'}</button>}
      <button className="btn btn-quiet btn-sm" onClick={() => downloadCheckpoint(s)}>Download checkpoint</button>
    </div>
  </div>;
}

/** Preview access countdown; on expiry the controller asks for re-authorization (progress is kept). */
export function AccessTimer() {
  const { c, s } = useGame();
  const [now, setNow] = useState(() => Date.now());
  const at = s.grantExpiresAt ? Date.parse(s.grantExpiresAt) : null;
  useEffect(() => {
    if (at === null || s.mode === 'fixture') return;
    const t = setInterval(() => { setNow(Date.now()); if (Date.now() >= at) c.expire(); }, 15_000);
    return () => clearInterval(t);
  }, [at, c, s.mode]);
  if (at === null) return null;
  const mins = Math.max(0, Math.round((at - now) / 60_000));
  const fixtureClock = s.mode === 'fixture';
  return <p className="m2-access" data-low={!fixtureClock && mins <= 5}>
    Preview access {fixtureClock ? `until ${new Date(at).toISOString().slice(11, 16)} UTC (fixture clock)` : mins > 0 ? `· ${mins} min left` : 'expired'}
  </p>;
}

function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (until === null) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

const recoveryText: Record<string, string> = {
  CHECKPOINT_UNTRUSTED: 'This checkpoint could not be verified by the local server. Keep your raw backup; trusted continuation is paused.',
  CHECKPOINT_VERSION_UNSUPPORTED: 'This checkpoint was made by an unsupported rules version. Keep your raw backup; it is shown read-only.',
  CHECKPOINT_KEY_UNAVAILABLE: 'This checkpoint uses a signing key the server no longer has. Keep your raw backup; trusted continuation is paused.',
  DATASET_MISMATCH: 'This checkpoint was made against a different science dataset. It cannot be continued here.',
  COMMAND_ID_REUSED: 'A request identity did not match its contents. This is an interface defect, not your mistake. Nothing was retried.'
};

/** Connection, retry and recovery state. Pending user intent is preserved across every recoverable error. */
export function LinkBanner() {
  const { c, s } = useGame();
  const link = s.link;
  const until = link.status === 'paced' ? link.until : null;
  const secs = useCountdown(until);
  const focus = useRef<HTMLDivElement>(null);
  const urgent = ['outcome-unknown', 'conflict', 'runtime-changed', 'session-lost', 'recovery-required', 'request-rejected'].includes(link.status);
  useEffect(() => { if (urgent) focus.current?.focus(); }, [urgent, link.status]);
  const body = bannerBody(link, secs);
  const snap = s.snapshot;
  return <>
    {body && <div ref={focus} tabIndex={-1} className="m2-banner" data-tone={body.tone} role={urgent ? 'alert' : 'status'} data-link={link.status}>
      <p><strong>{body.title}</strong> {body.text}</p>
      <div className="m2-row">
        {link.status === 'outcome-unknown' && <button className="btn btn-primary btn-sm" onClick={() => void c.reconcile()}>Check what happened</button>}
        {link.status === 'conflict' && <button className="btn btn-primary btn-sm" onClick={() => void c.refresh()}>Load the current case</button>}
        {link.status === 'runtime-changed' && snap && (s.runtimeId === snap.runtimeId || s.grantExpiresAt === null)
          ? <button className="btn btn-primary btn-sm" onClick={() => void c.boot()}>Reconnect to the local server</button>
          : (link.status === 'session-lost' || link.status === 'runtime-changed') && snap && <button className="btn btn-primary btn-sm" onClick={() => void c.resume(snap.checkpoint)}>Resume the last confirmed checkpoint</button>}
        {(link.status === 'recovery-required' || link.status === 'session-lost' || link.status === 'runtime-changed') && snap && <button className="btn btn-quiet btn-sm" onClick={() => downloadCheckpoint(snap)}>Download raw checkpoint</button>}
        {link.status === 'request-rejected' && <button className="btn btn-quiet btn-sm" onClick={() => c.acknowledge()}>OK</button>}
      </div>
    </div>}
    {s.held && !isBusy(link) && <div className="m2-banner" data-tone="info" role="status">
      <p><strong>Not applied yet:</strong> {s.held.label}. It can be sent again exactly as it was.</p>
      <div className="m2-row">
        <button className="btn btn-primary btn-sm" onClick={() => void c.retryHeld()} disabled={link.status !== 'confirmed' && link.status !== 'ready'}>Send it again</button>
        <button className="btn btn-quiet btn-sm" onClick={() => c.discardHeld()}>Discard</button>
      </div>
    </div>}
    {s.notice && <p className="m2-notice" data-tone={s.notice.tone} role="status">{s.notice.text}</p>}
  </>;
}

function bannerBody(link: Link, secs: number): { tone: 'info' | 'warn' | 'bad'; title: string; text: string } | null {
  switch (link.status) {
    case 'checking': return { tone: 'info', title: 'Connecting…', text: 'Checking the local training preview.' };
    case 'submitting': case 'awaiting': return { tone: 'info', title: 'Awaiting server confirmation:', text: `${link.pending.label}. The bench shows your intent; only the server's answer changes progress.` };
    case 'reconciling': return { tone: 'info', title: 'Checking:', text: `reading the case to see whether “${link.pending.label}” was applied.` };
    case 'paced': return link.cause === 'local-pacing' ? { tone: 'info', title: 'Sending shortly:', text: `${link.pending.label} (requests are spaced to respect the shared request budget).` }
      : { tone: 'warn', title: link.cause === 'rate-limited' ? 'Request budget reached.' : 'Server at capacity.', text: `Waiting ${secs}s, then “${link.pending.label}” is re-checked and sent unchanged. Your progress is safe; nothing is penalised.` };
    case 'outcome-unknown': return { tone: 'warn', title: 'Result unknown.', text: `“${link.pending.label}” may or may not have been applied (${link.reason.replace('-', ' ')}). Your confirmed progress is safe. Check before sending anything else.` };
    case 'conflict': return { tone: 'warn', title: 'This case changed elsewhere.', text: link.code === 'OUT_OF_ORDER' ? 'An older answer arrived late and was ignored; the newer confirmed state is kept.'
      : link.code === 'CASE_ID_REUSED' ? 'That case identity is already in use with a different start. Load it or start a new case.'
        : `Another tab or request advanced it${link.currentRevision !== null ? ` to revision ${link.currentRevision}` : ''}. Your action was not resent automatically.` };
    case 'runtime-changed': return { tone: 'warn', title: 'The local server restarted.', text: 'Old requests cannot be replayed. Re-enter the operator token, then resume your last confirmed or downloaded checkpoint.' };
    case 'session-lost': return { tone: 'warn', title: 'The server no longer holds this case.', text: 'Resume it from your last confirmed or downloaded checkpoint. Nothing is reset automatically.' };
    case 'recovery-required': return { tone: 'bad', title: 'Recovery required.', text: recoveryText[link.code] ?? `${link.message} Keep a raw backup; nothing was retried or reset.` };
    case 'request-rejected': return { tone: 'warn', title: 'Not accepted.', text: link.message };
    default: return null;
  }
}
