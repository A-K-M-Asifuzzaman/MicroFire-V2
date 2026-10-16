'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useGame } from './context';

const reasons = {
  initial: 'This local training preview is restricted to the operator running it. Enter the operator access token to continue.',
  expired: 'Preview access expired. Your confirmed progress is kept; re-enter the operator token to continue.',
  denied: 'The server needs a fresh authorization. Your confirmed progress and any held action are kept.',
  'token-rejected': 'That token was not accepted. Check it and try again.',
  capacity: 'The local server has no free authorization slots right now. Try again shortly.',
  unreachable: 'The local server could not be reached. Try again.'
} as const;

/** The token is typed by the operator, sent once to this local server and cleared. It is never stored or logged here. */
export function AuthPanel() {
  const { c, s } = useGame();
  const input = useRef<HTMLInputElement>(null);
  const reason = s.link.status === 'authorization-required' ? s.link.reason : 'initial';
  const busy = s.link.status === 'authorizing';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const token = input.current?.value ?? '';
    if (input.current) input.current.value = '';
    if (token) void c.authorize(token);
  };
  return <form className="m2-card m2-auth" onSubmit={submit} aria-labelledby="m2-auth-h">
    <p className="eyebrow">Local training preview · operator access</p>
    <h2 id="m2-auth-h" className="m2-h2">Authorize this local preview</h2>
    <p>{reasons[reason]}</p>
    <label className="m2-field"><span>Operator access token</span>
      <input ref={input} type="password" name="m2-operator-token" autoComplete="off" spellCheck={false} required maxLength={100} disabled={busy} data-private="true" />
    </label>
    <div className="m2-row"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Authorizing…' : 'Authorize'}</button></div>
    <p className="m2-fine">The server sets a private session cookie that this page cannot read. Public missions stay locked; this does not change availability or approve any science.</p>
  </form>;
}

/** Deliberate new case, or explicit resume of a downloaded checkpoint file. */
export function StartPanel() {
  const { c, s } = useGame();
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = s.link.status !== 'ready';
  const onFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > 28_000) { setFileError('That file is larger than any valid checkpoint, so it was not sent.'); return; }
    await c.resume(await file.text());
  };
  return <div className="m2-card m2-start">
    <p className="eyebrow">BASS-II training episode · B20</p>
    <h2 className="m2-h2">Begin in the training bay</h2>
    <p>Read NASA’s B20 record, assemble a schematic training apparatus, find and repair an authored training fault, then review the documented B20 observation in your Evidence Passport.</p>
    <div className="m2-row">
      <button className="btn btn-primary" onClick={() => void c.start()} disabled={busy}>Start a new training case</button>
      <label className="btn btn-quiet m2-file">Resume from a checkpoint file
        <input type="file" accept=".txt,text/plain" onChange={(e) => void onFile(e.currentTarget.files?.[0])} disabled={busy} />
      </label>
    </div>
    {fileError && <p className="m2-notice" data-tone="warn" role="alert">{fileError}</p>}
    <p className="m2-fine">Starting a case never overwrites a saved or downloaded one. Resuming sends the signed checkpoint to the local server, which verifies it before continuing.</p>
  </div>;
}
