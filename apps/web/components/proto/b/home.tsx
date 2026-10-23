'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ProtoStation } from '../data';
import type { JarApi } from './jar';
import { BBar, Sky } from './parts';
import { PixFigure, type PixMood } from './pix';
import './b.css';

type Step = { n: number; title: string; what: string; href: string; pix: string; mood: PixMood; locked?: string };

/** Design B home: an illustrated adventure on real content. The 3D flame lives in the module's window. */
export function BHome({ stations, testId, admitted, quarantined }: { stations: ProtoStation[]; testId: string; admitted: number; quarantined: number }) {
  const win = useRef<HTMLDivElement>(null), jar = useRef<JarApi | null>(null);
  const [g, setG] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [off, setOff] = useState(false);
  useEffect(() => {
    const host = win.current; if (!host) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
    let cancelled = false;
    import('./jar').then(({ startJar }) => { if (cancelled) return; const a = startJar(canvas, host, !reduce.matches); if (!a) setOff(true); jar.current = a; }).catch(() => setOff(true));
    const sync = () => jar.current?.setMotion(!reduce.matches && !document.hidden), resize = () => jar.current?.resize();
    reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); window.addEventListener('resize', resize);
    return () => { cancelled = true; reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', resize); jar.current?.stop(); jar.current = null; canvas.remove(); };
  }, []);
  useEffect(() => { jar.current?.setGravity(g); }, [g]);

  const steps: Step[] = [
    { n: 1, title: 'Discover', what: 'See gravity reshape a flame', href: '#gravity', mood: 'look', pix: 'Start here. Slide between space and Earth and watch what buoyancy does to this illustrated flame.' },
    { n: 2, title: 'Explore the evidence', what: 'The Experiment Atlas', href: '/atlas', mood: 'cite', pix: `Only checked records count. Right now that is ${admitted} admitted test, with ${quarantined} more waiting in quarantine.` },
    { n: 3, title: 'Check a real test', what: `${testId}, from NASA's BASS-II report`, href: '/design/b/b20', mood: 'cite', pix: `${testId} is a real NASA test. Every value links to the page it came from, and the gaps are marked.` },
    { n: 4, title: 'Enter the laboratory', what: 'Tour the BASS-II training bay', href: '/design/b/lab', mood: 'bay', pix: 'The training bay has a schematic model of the BASS-II flow duct. I can walk you through all ten parts.' },
    { n: 5, title: 'Prepare for the mission', what: 'Five missions on the map', href: '/missions', mood: 'gap', locked: 'Not playable yet', pix: 'The missions are not playable yet. Their rules are tested; the gameplay is still being connected.' }
  ];
  const step = hover !== null ? steps[hover]! : null;
  const say = step ? { mood: step.mood, text: step.pix }
    : g > 0.85 ? { mood: 'look' as const, text: 'Gravity on! Hot gas rises and pulls fresh air in from below, so the flame stretches up and turns yellow.' }
      : g > 0.15 ? { mood: 'look' as const, text: 'Halfway. This blend is for learning; it is not a measurement.' }
        : { mood: 'greet' as const, text: 'Hi, I’m PIX! In space there is almost no buoyancy, so a still-air flame can turn round and blue. Want to try?' };

  return <div className="db db-home">
    <section className="db-hero">
      <Sky />
      <BBar current="home" />
      <div className="db-hero-grid">
        <div className="db-copy">
          <h1>Fire, without the weight of gravity.</h1>
          <p className="db-lede">Flames behave differently in space. Play with gravity, then follow real NASA evidence into the lab.</p>
          <div className="db-gravity" id="gravity" role="group" aria-label="Gravity, illustration">
            <div className="db-toggle">
              <button type="button" aria-pressed={g <= 0.15} onClick={() => setG(0)}><SpaceIcon />Space</button>
              <button type="button" aria-pressed={g >= 0.85} onClick={() => setG(1)}><EarthIcon />Earth</button>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={g} onChange={(e) => setG(Number(e.target.value))} aria-label="Gravity from 0 g to 1 g" aria-valuetext={`${g.toFixed(2)} g`} style={{ ['--v' as string]: g }} />
            <p className="db-note">This flame is an illustration, not NASA footage or data.</p>
          </div>
          <div className="db-actions">
            <Link className="db-btn db-btn-sun" href="/design/b/lab">Enter the training bay</Link>
            <Link className="db-btn" href="/design/b/b20">Open the {testId} record</Link>
          </div>
        </div>
        <div className="db-scene">
          <div className="db-module" aria-hidden="true">
            <span className="db-wing db-wing-l" /><span className="db-wing db-wing-r" />
            <span className="db-hull" />
          </div>
          <div className="db-window" ref={win}>
            {off && <div className="db-window-still" />}
            <span className="db-window-tag">Illustration</span>
          </div>
          <div className="db-pix-wrap">
            <PixFigure mood={say.mood} />
          </div>
          <p className="db-balloon" aria-live="polite" key={say.text}>{say.text}</p>
        </div>
      </div>
    </section>
    <nav className="db-trail" aria-label="Your journey">
      <h2>Your route through MicroFire</h2>
      <ol>{steps.map((s, i) => <li key={s.n}>
        <Link href={s.href} className="db-sticker" data-locked={!!s.locked} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
          <span className="db-num" aria-hidden="true">{s.n}</span>
          <b>{s.title}</b><span>{s.what}</span>
          {s.locked && <em>{s.locked}</em>}
        </Link>
      </li>)}</ol>
    </nav>
    <section className="db-stations" aria-labelledby="db-st-h">
      <h2 id="db-st-h">Research stations</h2>
      <ul>{stations.map((s) => <li key={s.href}><a href={s.href} className="db-chip" data-tone={s.tone}><b>{s.title}</b><span>{s.what}</span></a></li>)}</ul>
    </section>
  </div>;
}

const SpaceIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" strokeWidth="2" transform="rotate(-20 12 12)" /></svg>;
const EarthIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v14M6 11l6 6 6-6" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 21h18" strokeWidth="2.6" strokeLinecap="round" /></svg>;
