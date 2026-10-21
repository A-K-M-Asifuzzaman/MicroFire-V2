'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ProtoStation } from '../data';
import type { AApi } from './scene';
import { ABar, Dial } from './parts';
import './a.css';

/** Design A home: the 3D exhibit is the page; type and controls are engraved plates over it. */
export function AHome({ stations, testId }: { stations: ProtoStation[]; testId: string }) {
  const stage = useRef<HTMLDivElement>(null), api = useRef<AApi | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'off'>('loading');
  const [progress, setProgress] = useState<[number, number]>([0, 3]);
  const [g, setG] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [bay, setBay] = useState(false);

  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)'), mobile = matchMedia('(max-width: 820px)').matches;
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
    let cancelled = false, visible = true;
    const motion = () => visible && !reduce.matches && !document.hidden;
    import('./scene').then(({ startA }) => {
      if (cancelled) return;
      const a = startA({ canvas, host, mobile, motion: motion(), stations: stations.length, onProgress: (l, t) => setProgress([l, t]), onLost: () => setState('off') });
      if (!a) { setState('off'); return; }
      api.current = a; setState('ready');
    }).catch(() => setState('off'));
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; api.current?.setMotion(motion()); }); io.observe(host);
    const sync = () => api.current?.setMotion(motion()), resize = () => api.current?.resize();
    reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); window.addEventListener('resize', resize);
    return () => { cancelled = true; io.disconnect(); reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', resize); api.current?.stop(); api.current = null; canvas.remove(); };
  }, [stations.length]);
  useEffect(() => { api.current?.setGravity(g); }, [g]);
  useEffect(() => { api.current?.setStation(focus); }, [focus]);
  useEffect(() => { api.current?.setBay(bay); }, [bay]);

  const st = focus !== null ? stations[focus] : null;
  const line = bay ? 'Behind the gateway is the training bay: a schematic model of the BASS-II flow duct. Step through and look around.'
    : st ? st.pix
      : g > 0.85 ? 'With gravity, hot gas rises and pulls fresh air in from below, so this illustrated flame stretches up and turns yellow.'
        : g < 0.15 ? 'In still microgravity air there is almost no buoyancy. Oxygen arrives slowly, so the flame can turn round, dim and blue.'
          : 'Somewhere in between. This blend is for teaching; it is not a measurement.';
  const tone = bay ? 'bay' : st?.tone ?? 'guide';

  return <div className="da da-home" data-state={state}>
    <ABar current="home" />
    <section className="da-stage" ref={stage} aria-label="MicroFire observatory, artistic 3D illustration">
      {state === 'loading' && <p className="da-loading">Loading the hall {progress[0]} of {progress[1]}</p>}
      {state === 'off' && <div className="da-poster" aria-hidden="true" />}
    </section>
    <div className="da-plaque">
      <h1>Fire, without the weight of gravity.</h1>
      <p className="da-lede">In still air, with no buoyancy, a flame can turn round and blue. Turn the dial to see the illustration change, then open {testId}, a real NASA test in opposed airflow.</p>
      <div className="da-actions">
        <Link className="da-key da-key-primary" href="/design/a/lab" onMouseEnter={() => setBay(true)} onMouseLeave={() => setBay(false)} onFocus={() => setBay(true)} onBlur={() => setBay(false)}>
          <span className="da-led" data-on="true" aria-hidden="true" />Enter the training bay
        </Link>
        <Link className="da-link" href="/design/a/b20">Open the {testId} record</Link>
      </div>
      <p className="da-fine da-note">The flame, chamber and hall are illustrations, not NASA footage or data.</p>
    </div>
    <aside className="da-pix" data-tone={tone} aria-live="polite">
      <span className="da-pix-name">PIX</span>
      <p key={line}>{line}</p>
    </aside>
    <div className="da-dial-wrap">
      <Dial value={g} onChange={setG} />
    </div>
    <nav className="da-rail" aria-label="Research stations">
      <ol>{stations.map((s, i) => <li key={s.href}>
        <a href={s.href} data-tone={s.tone} onMouseEnter={() => setFocus(i)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(i)} onBlur={() => setFocus(null)} aria-current={focus === i ? 'true' : undefined}>
          <span className="da-led" data-on={focus === i} aria-hidden="true" />
          <b>{s.title}</b><span>{s.what}</span>
        </a>
      </li>)}</ol>
    </nav>
  </div>;
}
