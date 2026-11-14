'use client';
// Mission-complete moment: when the SERVER adds a mission to completedMissions during this visit, a badge and a
// Passport stamp appear for a few seconds. Display only; reloads and resumed cases do not replay it.
import { useEffect, useRef, useState } from 'react';
import { MISSIONS } from './view-adapter';

export function Celebrate({ completed }: { completed: readonly string[] }) {
  const seen = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<{ n: string; title: string; last: boolean } | null>(null);
  useEffect(() => {
    if (seen.current === null) { seen.current = new Set(completed); return; } // first view: already-earned missions do not celebrate
    const fresh = completed.find((id) => !seen.current!.has(id));
    completed.forEach((id) => seen.current!.add(id));
    if (!fresh) return;
    const m = MISSIONS.find((x) => x.id === fresh);
    if (!m) return;
    setShow({ n: m.n, title: m.title, last: completed.length === MISSIONS.length });
    const t = window.setTimeout(() => setShow(null), 4200);
    return () => clearTimeout(t);
  }, [completed]);
  if (!show) return null;
  return <div className="mf-celebrate" role="status" aria-live="polite">
    <div className="mf-celebrate-card">
      <svg viewBox="0 0 120 120" aria-hidden="true" className="mf-badge">
        <circle cx="60" cy="60" r="54" className="mf-badge-ring" /><circle cx="60" cy="60" r="42" className="mf-badge-core" />
        <path d="M60 30c11 11 16 19 16 27a16 16 0 0 1-32 0c0-8 5-16 16-27z" fill="#ffb020" stroke="#15153d" strokeWidth="3" />
        <path d="M60 50c5 5 7 8 7 11a7 7 0 0 1-14 0c0-3 2-6 7-11z" fill="#ff5a5f" />
        <text x="60" y="100" textAnchor="middle" className="mf-badge-n">{show.n}</text>
      </svg>
      <div>
        <p className="mf-celebrate-k">Mission {show.n} complete</p>
        <p className="mf-celebrate-t">{show.title}</p>
        <p className="mf-celebrate-stamp"><span aria-hidden="true">✓</span> Passport entry stamped by the server</p>
        {show.last && <p className="mf-celebrate-all">All five missions done. Your Evidence Passport is ready to download.</p>}
      </div>
      <button type="button" className="mf-celebrate-x" onClick={() => setShow(null)}>Close<span className="sr-only"> mission complete message</span></button>
    </div>
  </div>;
}
