'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GravityLens, type LensRecord } from './gravity-lens';
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

  const onGravityChange = useCallback((g: number) => { gravity.current = g; api.current?.setGravity(g); }, []);

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
    query.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', onResize);
    const onAnchors = (anchors: Anchor[]) => {
      const show = !mobileQuery.matches;
      anchors.forEach((a, i) => {
        const el = markers.current[i];
        if (!el) return;
        const x = Math.min(Math.max(a.x, 70), root.clientWidth - 70); // keep chips fully on screen
        el.style.transform = `translate(${x.toFixed(1)}px, ${(a.y - 6).toFixed(1)}px) translate(-50%, -100%)`;
        el.dataset.on = String(show && a.visible);
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
      io.disconnect(); query.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize);
      api.current?.stop(); api.current = null; mount.replaceChildren();
    };
  }, [stations]);
  useEffect(() => { api.current?.focusStation(focus); }, [focus]);

  return <>
    <section ref={hero} className="obs-hero" data-scene={scene} data-testid="observatory" aria-labelledby="home-title">
      <div className="obs-backdrop" aria-hidden="true" />
      <div className="wrap obs-grid">
        {children}
        <div className="obs-stage"><GravityLens record={record} onGravityChange={onGravityChange} /></div>
      </div>
      {/* After the content in DOM order (stacking is by z-index), so the lens canvas stays the page's first canvas. */}
      <div className="obs-scene" ref={host} aria-hidden="true" />
      <div className="stations-markers" aria-hidden="true">
        {stations.map((s, i) => <a key={s.href} ref={(el) => { markers.current[i] = el; }} className="station-marker" href={s.href} tabIndex={-1}
          data-focus={focus === i} onMouseEnter={() => setFocus(i)} onMouseLeave={() => setFocus(null)}>{s.short}</a>)}
      </div>
    </section>
    <nav className="stations" aria-label="Observatory stations">
      <div className="wrap">
        <p className="eyebrow">Observatory stations · each opens a working research tool</p>
        <ol>{stations.map((s, i) => <li key={s.href}>
          <Link className="station-link" href={s.href} data-focus={focus === i}
            onFocus={() => setFocus(i)} onBlur={() => setFocus(null)} onMouseEnter={() => setFocus(i)} onMouseLeave={() => setFocus(null)}>
            <span className="n">0{i + 1} · {s.short}</span><b>{s.title}</b><span>{s.description}</span>
          </Link>
        </li>)}</ol>
        <p className="obs-caption" style={{ marginTop: 14 }} data-testid="scene-status">
          {scene === 'active' || scene === 'static' ? 'Observatory: artistic interpretation in 3D, not a NASA apparatus reconstruction. Drag to look around.'
            : scene === 'loading' ? 'Observatory loading · the research tools below work without it.'
              : scene === 'lost' ? 'Observatory paused: the graphics context was interrupted. Every station still works from this list.'
                : 'Observatory 3D view unavailable on this device · every station works from this list.'}
        </p>
      </div>
    </nav>
  </>;
}
