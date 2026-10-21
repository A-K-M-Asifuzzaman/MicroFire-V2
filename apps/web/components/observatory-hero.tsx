'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { soundscape } from '../game/ui/soundscape';
import { GravityLens, type LensRecord } from './gravity-lens';
import { PixAvatar, type PixState } from './pix-avatar';
import type { Anchor, ObservatoryApi, PixGesture, PixTarget } from './observatory-scene';
import { BAY_TOUR } from './routes';

/** `pix` is what PIX says when the station is focused (deterministic copy; counts come from the catalog). */
export type Station = { title: string; short: string; href: string; description: string; pix: string; mood: 'guide' | 'cite' | 'gap' };
type SceneState = 'loading' | 'active' | 'static' | 'unavailable' | 'lost';
type Mood = 'greet' | 'coach' | 'guide' | 'cite' | 'gap' | 'bay';
const INTRO_KEY = 'microfire.home.intro';
const BAY_LINE = 'Through this door is the training bay: a schematic model of the BASS-II flow duct. Come and look around.';
const gestures: Record<Mood, PixGesture> = { greet: 'wave', coach: 'nod', guide: 'hop', cite: 'nod', gap: 'shake', bay: 'spin' };
const faces: Record<Mood, PixState> = { greet: 'idle', coach: 'searching', guide: 'idle', cite: 'cited', gap: 'abstained', bay: 'searching' };

type Hero = { peek(on: boolean): void; enter(go: () => void): boolean };
const HeroContext = createContext<Hero | null>(null);

/**
 * Home hero: the HTML Gravity Lens (flame, controls, explanation) sits in front of an optional three.js observatory.
 * The 3D layer is progressive enhancement: loaded after first paint, paused when offscreen/hidden or under reduced
 * motion, and replaced by the CSS backdrop if WebGL is unavailable or lost. Research routes never load it.
 * A directed opening flight plays once per session (never under reduced motion; any input fast-forwards it).
 */
export function ObservatoryHero({ record, stations, children }: { record: LensRecord; stations: Station[]; children: React.ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLAnchorElement | null)[]>([]);
  const bubble = useRef<HTMLDivElement>(null);
  const api = useRef<ObservatoryApi | null>(null);
  const gravity = useRef(0);
  const userMotion = useRef(true); // the visitor's pause switch (shared with the lens flicker)
  const syncMotion = useRef<() => void>(() => undefined);
  const [scene, setScene] = useState<SceneState>('loading');
  const [intro, setIntro] = useState<'pending' | 'play' | 'done'>('pending');
  const [entering, setEntering] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [bayFocus, setBayFocus] = useState(false);
  const pan = useRef(true);
  // PIX coaches the gravity control until the visitor has tried it, then narrates what changed.
  const [g, setG] = useState(0);
  const [touched, setTouched] = useState(false);

  const onMotionChange = useCallback((on: boolean) => { userMotion.current = on; syncMotion.current(); }, []);
  const onGravityChange = useCallback((next: number) => { gravity.current = next; api.current?.setGravity(next); setG(next); if (next !== 0) setTouched(true); }, []);

  useEffect(() => {
    const root = hero.current, mount = host.current;
    if (!root || !mount) return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = matchMedia('(max-width: 900px)');
    let visible = false, cancelled = false;
    const motion = () => !query.matches && visible && !document.hidden && userMotion.current;
    const sync = () => { api.current?.setMotion(motion()); setScene((s) => (s === 'active' || s === 'static' ? (query.matches ? 'static' : 'active') : s)); };
    syncMotion.current = sync;
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; sync(); });
    io.observe(root);
    const onResize = () => api.current?.resize();
    let scrollRaf = 0;
    const onScroll = () => { if (scrollRaf) return; scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; const r = root.getBoundingClientRect(); api.current?.setScroll(-r.top / Math.max(1, r.height)); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    query.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', onResize);
    // Any visitor input fast-forwards the opening flight; nothing waits for it.
    const skip = () => api.current?.skipIntro();
    const inputs = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;
    inputs.forEach((ev) => window.addEventListener(ev, skip, { passive: true }));
    const onAnchors = (anchors: Anchor[]) => {
      const show = !mobileQuery.matches;
      // Labels never sit on top of the headline column.
      const copy = root.querySelector('.obs-head')?.getBoundingClientRect(), base = root.getBoundingClientRect();
      const copyRight = copy ? copy.right - base.left + 24 : 0, copyBottom = copy ? copy.bottom - base.top + 140 : 0;
      // Labels stay off the headline, the header and the chamber, and never stack on each other.
      const st = root.querySelector('.lens-stage')?.getBoundingClientRect();
      const chamber = st ? { l: st.left - base.left + st.width * 0.15, r: st.right - base.left - st.width * 0.15, t: st.top - base.top, b: st.bottom - base.top } : null;
      const placed: { x: number; y: number }[] = [];
      anchors.forEach((a, i) => {
        const el = markers.current[i];
        if (!el) return;
        const x = Math.min(Math.max(a.x, 70), root.clientWidth - 70); // keep chips fully on screen
        el.style.transform = `translate(${x.toFixed(1)}px, ${(a.y - 6).toFixed(1)}px) translate(-50%, -100%)`;
        const overChamber = !!chamber && x > chamber.l && x < chamber.r && a.y > chamber.t && a.y < chamber.b;
        const crowded = placed.some((p) => Math.abs(p.x - x) < 112 && Math.abs(p.y - a.y) < 34);
        const on = show && a.visible && !(a.x < copyRight && a.y < copyBottom) && a.y > 96 && !overChamber && !crowded;
        if (on) placed.push({ x, y: a.y });
        el.dataset.on = String(on);
      });
    };
    // PIX's speech bubble follows the 3D PIX on wide screens; elsewhere it stays a card in the layout.
    const onPix = (a: Anchor) => {
      const el = bubble.current;
      if (!el) return;
      const on = !mobileQuery.matches && a.visible && a.y > 110;
      el.dataset.anchored = String(on);
      if (!on) { el.style.transform = ''; return; }
      // Speak from above PIX, leaning toward the open side; the whole bubble always stays inside the hero.
      const w = el.offsetWidth, W = root.clientWidth, lean = a.x > W * 0.42 ? 0.88 : 0.12;
      const left = Math.min(Math.max(a.x - w * lean, 16), W - w - 16);
      el.dataset.side = lean > 0.5 ? 'left' : 'right';
      el.style.setProperty('--tail', `${Math.min(Math.max(a.x - left, 18), w - 18).toFixed(0)}px`);
      el.style.transform = `translate(${left.toFixed(1)}px, ${(a.y - el.offsetHeight - 10).toFixed(1)}px)`;
    };
    // Deferred so the static first frame (text + SVG lens) paints before any 3D code downloads.
    const start = () => import('./observatory-scene').then(({ startObservatory }) => {
      if (cancelled) return;
      let seen = true;
      try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch { /* storage unavailable: no intro */ }
      const onScreen = root.getBoundingClientRect().top < innerHeight * 0.5;
      // Not gated on the lens pause switch: it reads 'off' until the lens starts, and pressing it is input, which skips.
      const playIntro = !seen && onScreen && !query.matches && !document.hidden;
      if (playIntro) try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* best effort */ }
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      mount.appendChild(canvas);
      api.current = startObservatory({
        canvas, host: root, stations: stations.map((s) => s.short.toUpperCase()), mobile: mobileQuery.matches, motion: motion() || playIntro, gravity: gravity.current,
        intro: playIntro, onIntroDone: () => { if (!cancelled) setIntro('done'); },
        stage: () => root.querySelector('.lens-stage')?.getBoundingClientRect() ?? null, onAnchors, onPix,
        onLost: () => { setScene('lost'); markers.current.forEach((m) => m && (m.dataset.on = 'false')); },
        onRestored: () => setScene(query.matches ? 'static' : 'active')
      });
      if (!api.current) { canvas.remove(); setScene('unavailable'); setIntro('done'); return; }
      setScene(query.matches ? 'static' : 'active');
      setIntro(playIntro ? 'play' : 'done');
      sync();
    }).catch(() => { setScene('unavailable'); setIntro('done'); });
    const ric = typeof window.requestIdleCallback === 'function'; // Safari lacks it
    const idle = ric ? window.requestIdleCallback(() => void start(), { timeout: 900 }) : setTimeout(() => void start(), 250);
    return () => {
      cancelled = true;
      if (ric) window.cancelIdleCallback(idle as number); else clearTimeout(idle as ReturnType<typeof setTimeout>);
      io.disconnect(); cancelAnimationFrame(scrollRaf); window.removeEventListener('scroll', onScroll); query.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize);
      inputs.forEach((ev) => window.removeEventListener(ev, skip));
      api.current?.stop(); api.current = null; mount.replaceChildren();
    };
  }, [stations]);
  useEffect(() => { api.current?.focusStation(focus, pan.current); }, [focus]);

  // What PIX says, and where it flies: the Training Bay door, the focused station, the gravity coaching, or a greeting.
  const st = focus !== null ? stations[focus] : undefined;
  const say: { mood: Mood; text: string; node: React.ReactNode } = bayFocus ? { mood: 'bay', text: BAY_LINE, node: BAY_LINE }
    : st ? { mood: st.mood, text: st.pix, node: <><b>{st.title}.</b> {st.pix}</> }
      : !touched ? { mood: 'greet', text: 'Hi, I’m PIX! Try the gravity controls and watch the flame change shape. It is an illustration, not NASA data.', node: <><b>Hi, I&apos;m PIX!</b> Try the gravity controls <span className="coach-arrow" aria-hidden="true">→</span> and watch the flame change shape.</> }
        : g >= 0.85 ? { mood: 'coach', text: 'Gravity on! Buoyancy lifts hot gas, so this still-air flame stretches upward.', node: <><b>Gravity on!</b> Buoyancy lifts hot gas, so this still-air flame stretches upward.</> }
          : g <= 0.15 ? { mood: 'coach', text: 'Still-air microgravity. With almost no buoyancy, this illustrated flame can turn rounder and bluer.', node: <><b>Still-air microgravity.</b> With almost no buoyancy, this illustrated flame can turn rounder and bluer.</> }
            : { mood: 'coach', text: 'In between. This blend is for teaching, not a measurement.', node: <><b>In between…</b> This blend is for teaching, not a measurement.</> };
  const target: PixTarget = bayFocus ? 'bay' : focus ?? 'home';
  const ready = intro === 'done' && (scene === 'active' || scene === 'static');
  useEffect(() => { if (ready) api.current?.setPix(target, gestures[say.mood]); }, [ready, target, say.mood]);
  useEffect(() => { if (intro === 'done') soundscape.say(say.text); }, [intro, say.text]);

  const live = useRef(scene);
  useEffect(() => { live.current = scene; }, [scene]);
  const [ctx] = useState<Hero>(() => ({
    peek: (on) => { setBayFocus(on); api.current?.peekBay(on); },
    enter: (go) => {
      const a = api.current;
      if (!a || live.current !== 'active' || !userMotion.current) return false;
      setEntering(true); setBayFocus(true); soundscape.cue('reveal');
      const fallback = setTimeout(go, 2600); // never strand the visitor if a frame is dropped
      void a.enterBay().then(() => { clearTimeout(fallback); go(); });
      return true;
    }
  }));

  return <HeroContext.Provider value={ctx}>
    <section ref={hero} className="obs-hero" data-scene={scene} data-intro={intro} data-entering={entering || undefined} data-coach={touched ? 'done' : 'on'} data-testid="observatory" aria-labelledby="home-title">
      <div className="obs-backdrop" aria-hidden="true" />
      <div className="wrap obs-grid">
        {children}
        <div className="obs-stage" id="gravity-lens"><GravityLens record={record} onGravityChange={onGravityChange} onMotionChange={onMotionChange} /></div>
        <div className="pix-greeter" ref={bubble} data-touched={touched} data-mood={say.mood}>
          <PixAvatar state={faces[say.mood]} />
          <p aria-live="polite">{say.node}{' '}{say.mood === 'bay' ? <Link href={BAY_TOUR}>Take the tour</Link> : <Link href="/ask">Ask me more</Link>}</p>
        </div>
      </div>
      {/* After the content in DOM order (stacking is by z-index), so the lens canvas stays the page's first canvas. */}
      <div className="obs-scene" ref={host} aria-hidden="true" />
      <div className="obs-scroll" aria-hidden="true"><i /></div>
      <div className="obs-letterbox" aria-hidden="true"><span>Approaching the MicroFire Observatory · artistic illustration</span></div>
      <div className="stations-markers" aria-hidden="true">
        {stations.map((s, i) => <a key={s.href} ref={(el) => { markers.current[i] = el; }} className="station-marker" href={s.href} tabIndex={-1}
          data-focus={focus === i} onMouseEnter={() => { pan.current = false; setFocus(i); }} onMouseLeave={() => setFocus(null)}>{s.short}</a>)}
      </div>
      <div className="obs-corner">
        {intro === 'play' && <button type="button" className="obs-skip" onClick={() => api.current?.skipIntro()}>Skip intro</button>}
        <HeroSound />
      </div>
    </section>
    <nav className="stations" aria-label="Observatory stations">
      <div className="wrap">
        <p className="eyebrow">Six stations · research tools and mission previews <span className="swipe-cue" aria-hidden="true">· swipe for all six →</span></p>
        <ol>{stations.map((s, i) => <li key={s.href}>
          <Link className="station-link" href={s.href} data-focus={focus === i}
            onFocus={() => { pan.current = true; setFocus(i); }} onBlur={() => setFocus(null)} onMouseEnter={() => { pan.current = true; setFocus(i); }} onMouseLeave={() => setFocus(null)}>
            <StationIcon href={s.href} /><span className="n">0{i + 1} · {s.short}</span><b>{s.title}</b><span>{s.description}</span>
          </Link>
        </li>)}</ol>
        <p className="obs-caption" style={{ marginTop: 14 }} data-testid="scene-status">
          {scene === 'active' || scene === 'static' ? 'The observatory is an artistic interpretation in 3D, not a NASA apparatus reconstruction. Drag to look around.'
            : scene === 'loading' ? 'Observatory loading · the research tools below work without it.'
              : scene === 'lost' ? 'Observatory paused: the graphics context was interrupted. Every station still works from this list.'
                : 'Observatory 3D view unavailable on this device · every station works from this list.'}
        </p>
      </div>
    </nav>
  </HeroContext.Provider>;
}

/**
 * The Training Bay entrance. Hovering or focusing it turns the camera toward the bay door and sends PIX there;
 * activating it flies through the door, then navigates. Plain link without 3D, under reduced motion, or with modifiers.
 */
export function EnterBayLink() {
  const hero = useContext(HeroContext);
  const router = useRouter();
  const go = () => router.push(BAY_TOUR);
  return <Link className="btn btn-bay" href={BAY_TOUR}
    onMouseEnter={() => hero?.peek(true)} onMouseLeave={() => hero?.peek(false)} onFocus={() => hero?.peek(true)} onBlur={() => hero?.peek(false)}
    onClick={(e) => { if (!hero || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; if (hero.enter(go)) e.preventDefault(); }}>
    <span className="btn-bay-pulse" aria-hidden="true" />Enter the training bay <span aria-hidden="true">→</span>
  </Link>;
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
  return <div className="obs-sound" role="group" aria-label="Sound">
    <button type="button" aria-pressed={p.sound} disabled={!audio} onClick={() => soundscape.set({ sound: !p.sound })}><SoundGlyph on={p.sound} />Lab sound</button>
    <button type="button" aria-pressed={p.voice} disabled={!voice} onClick={() => soundscape.set({ voice: !p.voice })}>PIX voice</button>
  </div>;
}
function SoundGlyph({ on }: { on: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />{on ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}</svg>;
}

/** Small line glyphs for the station cards (decorative). */
function StationIcon({ href }: { href: string }) {
  const d: Record<string, string> = {
    '/atlas': 'M4 6h16v12H4zM4 10h16M9 6v12',
    '/experiments/bass2-b20': 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4',
    '/dashboard': 'M3 12h4l3-7 4 14 3-7h4',
    '/ask': 'M5 8a7 5 0 0 1 14 0v4a7 5 0 0 1-14 0zM9 10h.01M15 10h.01M12 3V1',
    '/gaps': 'M12 3l9 16H3zM12 9v5M12 17h.01',
    '/missions': 'M4 18l5-9 4 5 3-6 4 10M4 18h16'
  };
  return <svg className="station-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d[href] ?? 'M4 4h16v16H4z'} /></svg>;
}
