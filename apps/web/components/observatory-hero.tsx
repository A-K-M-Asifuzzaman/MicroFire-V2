'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GravityLens, type LensRecord } from './gravity-lens';
import { PixAvatar } from './pix-avatar';
import type { Anchor, ObservatoryApi } from './observatory-scene';

export type Station = { title: string; short: string; href: string; description: string };
type SceneState = 'loading' | 'active' | 'static' | 'unavailable' | 'lost';

/**
 * Home hero: the HTML Gravity Lens (flame, controls, explanation) sits in front of an optional three.js observatory.
 * The 3D layer is progressive enhancement: loaded after first paint, paused when offscreen/hidden or under reduced
 * motion, and replaced by the CSS backdrop if WebGL is unavailable or lost. Research routes never load it.
 */
export function ObservatoryHero({ record, stations, children }: { record: LensRecord; stations: Station[]; children: React.ReactNode }) {
  const hero = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLAnchorElement | null)[]>([]);
  const api = useRef<ObservatoryApi | null>(null);
  const gravity = useRef(0);
  const [scene, setScene] = useState<SceneState>('loading');
  const [focus, setFocus] = useState<number | null>(null);
  const pan = useRef(true);
  // PIX coaches the gravity control until the visitor has tried it, then narrates what changed.
  const [g, setG] = useState(0);
  const [touched, setTouched] = useState(false);

  const onGravityChange = useCallback((next: number) => { gravity.current = next; api.current?.setGravity(next); setG(next); if (next !== 0) setTouched(true); }, []);

  useEffect(() => {
    const root = hero.current, mount = host.current;
    if (!root || !mount) return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = matchMedia('(max-width: 900px)');
    let visible = false, cancelled = false;
    const motion = () => !query.matches && visible && !document.hidden;
    const sync = () => { api.current?.setMotion(motion()); setScene((s) => (s === 'active' || s === 'static' ? (query.matches ? 'static' : 'active') : s)); };
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; sync(); });
    io.observe(root);
    const onResize = () => api.current?.resize();
    let scrollRaf = 0;
    const onScroll = () => { if (scrollRaf) return; scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; const r = root.getBoundingClientRect(); api.current?.setScroll(-r.top / Math.max(1, r.height)); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    query.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', onResize);
    const onAnchors = (anchors: Anchor[]) => {
      const show = !mobileQuery.matches;
      // Labels never sit on top of the headline column.
      const copy = root.querySelector('.obs-head')?.getBoundingClientRect(), base = root.getBoundingClientRect();
      const copyRight = copy ? copy.right - base.left + 24 : 0, copyBottom = copy ? copy.bottom - base.top + 140 : 0;
      anchors.forEach((a, i) => {
        const el = markers.current[i];
        if (!el) return;
        const x = Math.min(Math.max(a.x, 70), root.clientWidth - 70); // keep chips fully on screen
        el.style.transform = `translate(${x.toFixed(1)}px, ${(a.y - 6).toFixed(1)}px) translate(-50%, -100%)`;
        el.dataset.on = String(show && a.visible && !(a.x < copyRight && a.y < copyBottom) && a.y > 96);
      });
    };
    // Deferred so the static first frame (text + SVG lens) paints before any 3D code downloads.
    const start = () => import('./observatory-scene').then(({ startObservatory }) => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      mount.appendChild(canvas);
      api.current = startObservatory({
        canvas, host: root, stations: stations.map((s) => s.short.toUpperCase()), mobile: mobileQuery.matches, motion: motion(), gravity: gravity.current,
        stage: () => root.querySelector('.lens-stage')?.getBoundingClientRect() ?? null, onAnchors,
        onLost: () => { setScene('lost'); markers.current.forEach((m) => m && (m.dataset.on = 'false')); },
        onRestored: () => setScene(query.matches ? 'static' : 'active')
      });
      if (!api.current) { canvas.remove(); setScene('unavailable'); return; }
      setScene(query.matches ? 'static' : 'active');
    }).catch(() => setScene('unavailable'));
    const ric = typeof window.requestIdleCallback === 'function'; // Safari lacks it
    const idle = ric ? window.requestIdleCallback(() => void start(), { timeout: 900 }) : setTimeout(() => void start(), 250);
    return () => {
      cancelled = true;
      if (ric) window.cancelIdleCallback(idle as number); else clearTimeout(idle as ReturnType<typeof setTimeout>);
      io.disconnect(); cancelAnimationFrame(scrollRaf); window.removeEventListener('scroll', onScroll); query.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize);
      api.current?.stop(); api.current = null; mount.replaceChildren();
    };
  }, [stations]);
  useEffect(() => { api.current?.focusStation(focus, pan.current); }, [focus]);

  return <>
    <section ref={hero} className="obs-hero" data-scene={scene} data-coach={touched ? 'done' : 'on'} data-testid="observatory" aria-labelledby="home-title">
      <div className="obs-backdrop" aria-hidden="true" />
      <div className="wrap obs-grid">
        {children}
        <div className="obs-stage"><GravityLens record={record} onGravityChange={onGravityChange} /></div>
        <div className="pix-greeter" data-touched={touched}>
          <PixAvatar state={!touched ? 'idle' : g > 0.15 && g < 0.85 ? 'searching' : 'cited'} />
          <p>{!touched ? <><b>Hi, I&apos;m PIX!</b> Try the gravity controls <span className="coach-arrow" aria-hidden="true">→</span> and watch the flame change shape.</>
            : g >= 0.85 ? <><b>Gravity on!</b> Hot gas rises, so the flame stretches into a tall teardrop.</>
              : g <= 0.15 ? <><b>Back in orbit.</b> Nothing rises, so the flame curls into a quiet blue ball.</>
                : <><b>In between…</b> This blend is for teaching, not a measurement.</>}
            {' '}<Link href="/ask">Ask me more</Link></p>
        </div>
      </div>
      {/* After the content in DOM order (stacking is by z-index), so the lens canvas stays the page's first canvas. */}
      <div className="obs-scene" ref={host} aria-hidden="true" />
      <div className="obs-scroll" aria-hidden="true"><i /></div>
      <div className="stations-markers" aria-hidden="true">
        {stations.map((s, i) => <a key={s.href} ref={(el) => { markers.current[i] = el; }} className="station-marker" href={s.href} tabIndex={-1}
          data-focus={focus === i} onMouseEnter={() => { pan.current = false; setFocus(i); }} onMouseLeave={() => setFocus(null)}>{s.short}</a>)}
      </div>
    </section>
    <nav className="stations" aria-label="Observatory stations">
      <div className="wrap">
        <p className="eyebrow">Six stations · each opens a working research tool</p>
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
  </>;
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
