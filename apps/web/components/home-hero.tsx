'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { soundscape } from '../game/ui/soundscape';
import { GravityLens, type LensRecord } from './gravity-lens';
import { PixAvatar, type PixMood } from './pix-avatar';
import { ReplayIntro } from './ignition/ignition';
import { BAY_TOUR } from './routes';

/** `pix` is what PIX says when the station is focused (deterministic copy; counts come from the catalog). */
export type Station = { title: string; href: string; description: string; pix: string; mood: 'guide' | 'cite' | 'gap' };
const BAY_LINE = 'The training bay has a schematic model of the BASS-II flow duct. I can walk you through all ten parts.';

/**
 * Design B home: an illustrated sky and Earth, a module whose porthole holds the Gravity Lens flame, and PIX speaking
 * from beside it. Only the lens flame uses WebGL (deferred, paused offscreen and under reduced motion; SVG otherwise).
 * PIX coaches the gravity control until the visitor tries it, then narrates; focusing a station gives its line.
 */
export function HomeHero({ record, testId, stations, trail, children }: { record: LensRecord; testId: string; stations: Station[]; trail: React.ReactNode; children: React.ReactNode }) {
  const [g, setG] = useState(0);
  const [touched, setTouched] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [bay, setBay] = useState(false);
  const onGravityChange = useCallback((next: number) => { setG(next); if (next !== 0) setTouched(true); }, []);

  const st = focus !== null ? stations[focus] : undefined;
  const say: { mood: PixMood; tone: string; text: string; node: React.ReactNode } = bay ? { mood: 'bay', tone: 'guide', text: BAY_LINE, node: BAY_LINE }
    : st ? { mood: st.mood === 'guide' ? 'bay' : st.mood, tone: st.mood, text: st.pix, node: <><b>{st.title}.</b> {st.pix}</> }
      : !touched ? { mood: 'greet', tone: 'guide', text: 'Hi, I’m PIX! In space there is almost no buoyancy, so a still-air flame can turn round and blue. Try the gravity controls.',
        node: <><b>Hi, I&apos;m PIX!</b> In space there is almost no buoyancy, so a still-air flame can turn round and blue. Try the gravity controls <span className="coach-arrow" aria-hidden="true">→</span></> }
        : g >= 0.85 ? { mood: 'look', tone: 'guide', text: 'Gravity on! Buoyancy lifts hot gas, so this still-air flame stretches upward and turns yellow.', node: <><b>Gravity on!</b> Buoyancy lifts hot gas, so this still-air flame stretches upward and turns yellow.</> }
          : g <= 0.15 ? { mood: 'look', tone: 'guide', text: 'Still-air microgravity. With almost no buoyancy, this illustrated flame can turn rounder and bluer.', node: <><b>Still-air microgravity.</b> With almost no buoyancy, this illustrated flame can turn rounder and bluer.</> }
            : { mood: 'look', tone: 'guide', text: 'In between. This blend is for teaching, not a measurement.', node: <><b>In between.</b> This blend is for teaching, not a measurement.</> };
  useEffect(() => { soundscape.say(say.text); }, [say.text]);

  const peek = (on: boolean) => () => setBay(on);
  return <div className="home" data-coach={touched ? 'done' : 'on'}>
    <section className="home-hero" data-testid="home-hero" aria-labelledby="home-title">
      <Sky />
      <div className="wrap home-grid">
        <div className="home-copy">
          {children}
          <div className="actions">
            <Link className="btn btn-primary" href="/judge-guide">Start the guided tour</Link>
            <Link className="btn btn-primary" href="/adventure">Play the 3D ISS Adventure</Link>
            <Link className="btn" href="/lab">Run the Flame Lab</Link>
            <Link className="btn" href="/fire-safety">Fire-safety atlas</Link>
            <Link className="btn" href="/proof">See the 60-second proof</Link>
            <Link className="btn" href={BAY_TOUR} prefetch={false} onMouseEnter={peek(true)} onMouseLeave={peek(false)} onFocus={peek(true)} onBlur={peek(false)}>Enter the training bay</Link>
            <Link className="btn" href={record.href}>Open the {testId} record</Link>
            <Link className="text-link" href="/atlas">Explore the Experiment Atlas</Link>
          </div>
          <div className="home-guide">
            <div className="home-pix" aria-hidden="true"><PixAvatar mood={say.mood} state={say.mood === 'gap' ? 'abstained' : 'idle'} /></div>
            <div className="home-balloon" data-mood={say.tone}>
              <p aria-live="polite" key={say.text}>{say.node}{' '}{say.mood === 'bay' && bay ? <Link href={BAY_TOUR} prefetch={false}>Take the tour</Link> : <Link href="/ask">Ask me more</Link>}</p>
            </div>
          </div>
        </div>
        <div className="home-stage" id="gravity-lens">
          <GravityLens record={record} onGravityChange={onGravityChange} decor={<>
            <span className="home-wing home-wing-l" aria-hidden="true" /><span className="home-wing home-wing-r" aria-hidden="true" />
            <span className="home-hull" aria-hidden="true" />
            <span className="home-window-tag" aria-hidden="true">Illustration</span>
          </>} />
        </div>
      </div>
      <div className="home-corner"><HeroSound /><ReplayIntro /></div>
    </section>
    {trail}
    <nav className="wrap home-stations" aria-label="Research stations">
      <h2>Research stations</h2>
      <ol>{stations.map((s, i) => <li key={s.href}>
        <Link className="station-chip" href={s.href} data-tone={s.mood} data-focus={focus === i}
          onFocus={() => setFocus(i)} onBlur={() => setFocus(null)} onMouseEnter={() => setFocus(i)} onMouseLeave={() => setFocus(null)}>
          <b>{s.title}</b><span>{s.description}</span>
        </Link>
      </li>)}</ol>
      <p className="home-status">The flame above is for teaching, not a measurement. Every station works without 3D graphics.</p>
    </nav>
  </div>;
}

/** The illustrated sky: sparkle stars and Earth's curve (original flat illustration). */
function Sky() {
  const stars = [[6, 18, 1], [14, 62, .7], [22, 30, 1.2], [31, 80, .8], [44, 12, .9], [52, 46, .6], [61, 22, 1.1], [68, 70, .7], [77, 10, .9], [86, 40, 1.3], [93, 66, .8], [39, 90, .7]];
  return <div className="home-sky" aria-hidden="true">
    {stars.map(([x, y, s], i) => <svg key={i} className="home-star" style={{ left: `${x}%`, top: `${y}%`, ['--s' as string]: s, ['--d' as string]: `${(i % 5) * 0.7}s` }} viewBox="0 0 20 20"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" /></svg>)}
    <svg className="home-earth" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice">
      <defs><clipPath id="home-earth-clip"><circle cx="1050" cy="1500" r="1180" /></clipPath></defs>
      <circle cx="1050" cy="1500" r="1196" className="atmo" />
      <g clipPath="url(#home-earth-clip)">
        <circle cx="1050" cy="1500" r="1180" className="ocean" />
        <path d="M380 470 C 470 380, 620 360, 700 410 C 780 460, 900 420, 960 470 C 1010 520, 900 600, 760 600 L 380 600 Z" className="land" />
        <path d="M1150 360 C 1240 330, 1380 350, 1470 400 C 1540 440, 1600 470, 1600 520 L 1600 600 L 1240 600 C 1200 540, 1260 500, 1210 460 C 1170 430, 1100 400, 1150 360 Z" className="land" />
        <g className="clouds"><path d="M300 430 q60 -30 120 0 t120 0 t120 -6" /><path d="M980 330 q70 -24 140 0 t140 4" /><path d="M1240 480 q50 -20 100 0 t100 0" /></g>
      </g>
    </svg>
  </div>;
}

const OFF = { sound: false, voice: false };
const never = () => () => undefined;
/** Opt-in lab sound and PIX's voice (browser speech). Off by default; nothing plays before the visitor asks. */
function HeroSound() {
  const p = useSyncExternalStore(soundscape.subscribe, soundscape.get, () => OFF);
  const audio = useSyncExternalStore(never, soundscape.available, () => false);
  const voice = useSyncExternalStore(never, soundscape.voiceAvailable, () => false);
  useEffect(() => {
    const on = () => soundscape.resume();
    document.addEventListener('pointerdown', on, { once: true });
    return () => document.removeEventListener('pointerdown', on);
  }, []);
  return <div className="home-sound" role="group" aria-label="Sound">
    <button type="button" aria-pressed={p.sound} disabled={!audio} onClick={() => soundscape.set({ sound: !p.sound })}><SoundGlyph on={p.sound} />Lab sound</button>
    <button type="button" aria-pressed={p.voice} disabled={!voice} onClick={() => soundscape.set({ voice: !p.voice })}>PIX voice</button>
  </div>;
}
function SoundGlyph({ on }: { on: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />{on ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}</svg>;
}
