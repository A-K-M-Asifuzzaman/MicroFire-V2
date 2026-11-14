'use client';
// One click plays the six proof steps in order (about 8 s each); Back/Next step by hand. Without JavaScript, or after
// "Show all", every step is simply visible. Reduced motion: no auto-advance, no smooth scroll.
import { useEffect, useRef, useState } from 'react';

const STEP_MS = 8000;
export function ProofPlayer({ total, children }: { total: number; children: React.ReactNode }) {
  const [active, setActive] = useState<number | null>(null), [playing, setPlaying] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const go = (i: number) => {
    const n = Math.max(1, Math.min(total, i)); setActive(n);
    const el = list.current?.querySelector<HTMLElement>(`[data-step="${n}"]`);
    if (el) { el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); el.focus({ preventScroll: true }); }
  };
  useEffect(() => {
    if (!playing || active === null) return;
    if (active >= total) { const t = setTimeout(() => setPlaying(false), 0); return () => clearTimeout(t); }
    const t = setTimeout(() => go(active + 1), STEP_MS); return () => clearTimeout(t);
  });
  const play = () => { const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; setPlaying(!reduce); go(1); };
  return <div className="proof" data-mode={active === null ? 'all' : 'step'}>
    <div className="proof-bar" role="group" aria-label="Proof controls">
      {active === null || !playing ? <button type="button" className="btn btn-primary" onClick={play}>{active === null ? 'Play the proof' : 'Play again'}</button>
        : <button type="button" className="btn" onClick={() => setPlaying(false)}>Pause</button>}
      <button type="button" className="btn" onClick={() => { setPlaying(false); go((active ?? 1) - 1); }} disabled={active === null || active <= 1}>Back</button>
      <button type="button" className="btn" onClick={() => { setPlaying(false); go((active ?? 0) + 1); }} disabled={active === total}>Next</button>
      {active !== null && <button type="button" className="btn" onClick={() => { setPlaying(false); setActive(null); }}>Show all</button>}
      <p className="proof-pos" aria-live="polite">{active === null ? `${total} steps` : `Step ${active} of ${total}${playing ? ' · playing' : ''}`}</p>
    </div>
    <ol ref={list} className="proof-steps" data-active={active ?? undefined}>{children}</ol>
  </div>;
}
