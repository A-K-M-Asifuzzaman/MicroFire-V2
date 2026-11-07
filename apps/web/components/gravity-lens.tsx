'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { FlameRenderer } from './flame-gl';

import { flamePath, lerp } from './flame-shape';

const explanations = {
  earth: { title: 'Earth illustration (1 g)', text: 'Buoyancy lifts hot gas, drawing fresh air in from below and stretching a still-air flame into a tall teardrop that glows yellow from soot.' },
  partial: { title: 'Partial gravity (illustrative blend)', text: 'An interpolated teaching blend between the two illustrations. It is not computed and does not represent any measured environment.' },
  micro: { title: 'Still-air microgravity illustration', text: 'Without a fan and with almost no buoyancy, oxygen arrives mainly by slow diffusion, so a still-air flame tends to be rounder, dimmer and bluer.' }
};

export type LensRecord = { href: string; title: string; flowDirection: string | null; initialFlow: string | null; locator: string };

/** `onMotionChange` lets a host scene follow the same pause control; `decor` is drawn inside the stage behind the flame. */
export function GravityLens({ record, onGravityChange, onMotionChange, decor }: { record: LensRecord; onGravityChange?: (g: number) => void; onMotionChange?: (on: boolean) => void; decor?: React.ReactNode }) {
  const [g, setG] = useState(0);
  const [renderer, setRenderer] = useState<'svg' | 'webgl' | 'unavailable' | 'lost'>('svg');
  const [animated, setAnimated] = useState(false);
  // Not visible until the observer says so: an offscreen lens must never start continuous rendering.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const canvas = useRef<HTMLCanvasElement>(null);
  const figure = useRef<HTMLElement>(null);
  const gl = useRef<FlameRenderer | null>(null);
  const current = useRef({ g: 0, motion: false });
  const id = useId();
  const mode = g >= 0.85 ? 'earth' : g <= 0.15 ? 'micro' : 'partial';
  const motion = animated && visible;
  useEffect(() => { current.current = { g, motion }; }, [g, motion]);

  // Defer WebGL until after first paint. Follows live reduced-motion changes; context loss falls back to the SVG.
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => setAnimated(!query.matches);
    query.addEventListener('change', onPreference);
    let cancelled = false;
    const handle = setTimeout(() => {
      onPreference();
      import('./flame-gl').then(({ startFlame }) => {
        if (cancelled || !canvas.current) return;
        gl.current = startFlame(canvas.current, current.current.g, false, {
          onLost: () => setRenderer('lost'),
          onRestored: () => { gl.current?.draw(current.current.g); gl.current?.setAnimated(current.current.motion); setRenderer('webgl'); }
        });
        gl.current?.setAnimated(current.current.motion); // sync with the effective (visibility × preference) state now
        setRenderer(gl.current ? 'webgl' : 'unavailable');
      }).catch(() => setRenderer('unavailable'));
    }, 120);
    return () => { cancelled = true; clearTimeout(handle); query.removeEventListener('change', onPreference); gl.current?.stop(); gl.current = null; };
  }, []);
  // No continuous rendering while the lens is offscreen or the tab is hidden.
  useEffect(() => {
    const el = figure.current;
    const update = (inView: boolean) => setVisible(inView && !document.hidden);
    let inView = true;
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => { inView = !!e?.isIntersecting; update(inView); });
    if (el && io) io.observe(el);
    const onVisibility = () => update(inView);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  useEffect(() => { gl.current?.draw(g); onGravityChange?.(g); }, [g, onGravityChange]);
  useEffect(() => { gl.current?.setAnimated(motion); }, [motion]);
  useEffect(() => { onMotionChange?.(animated); }, [animated, onMotionChange]);

  const buoyant = g, diffusive = 1 - g;
  return <figure ref={figure} className="lens" data-renderer={renderer === 'webgl' ? 'webgl' : 'svg'} data-gravity={mode} aria-labelledby={`${id}-cap`} style={{ margin: 0 }}>
    <div className="lens-stage">
      {decor}
      <canvas ref={canvas} aria-hidden="true" />
      <svg viewBox="0 0 400 400" role="img" aria-label={`${explanations[mode].title}: ${mode === 'earth' ? 'a tall teardrop flame' : mode === 'micro' ? 'a rounded, dim blue flame' : 'an intermediate flame shape'}.`}>
        <defs>
          <radialGradient id={`${id}-env`} cx="50%" cy="62%" r="60%"><stop offset="0" stopColor="#2a5fbf" stopOpacity=".18" /><stop offset=".72" stopColor="#5d9bf5" stopOpacity=".5" /><stop offset=".9" stopColor="#a8d4ff" stopOpacity=".95" /><stop offset="1" stopColor="#2a5fbf" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${id}-core`} cx="50%" cy="65%" r="60%"><stop offset="0" stopColor="#fff2cf" /><stop offset=".55" stopColor="#ffb257" /><stop offset="1" stopColor="#ff7a2a" stopOpacity=".2" /></radialGradient>
          <radialGradient id={`${id}-glow`}><stop offset="0" stopColor="#ff8738" stopOpacity=".35" /><stop offset="1" stopColor="#ff8738" stopOpacity="0" /></radialGradient>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#73bbd9" /></marker>
        </defs>
        <g className="lens-hud" fill="none" stroke="#73bbd9">
          <circle cx="200" cy="200" r="190" strokeOpacity=".14" />
          <circle cx="200" cy="200" r="160" strokeOpacity=".22" strokeDasharray="2 6" />
          <circle cx="200" cy="200" r="128" strokeWidth="6" strokeOpacity=".5" strokeDasharray="300 504" strokeLinecap="round" transform="rotate(-128 200 200)" />
          <line x1="200" y1="8" x2="200" y2="392" strokeOpacity=".12" />
        </g>
        <g className="lens-flame">
          <circle cx="200" cy={lerp(215, 220, g)} r={lerp(120, 150, g)} fill={`url(#${id}-glow)`} opacity={lerp(0.35, 0.9, g)} />
          <path d={flamePath(g)} fill={`url(#${id}-env)`} />
          <path d={flamePath(g, 0.72, lerp(4, 18, g))} fill={`url(#${id}-core)`} opacity={lerp(0.16, 0.95, g)} />
        </g>
        <g className="lens-arrows" stroke="#73bbd9" strokeWidth="2" markerEnd={`url(#${id}-arrow)`} fill="none">
          <g opacity={buoyant * 0.9}><path d="M120 300 C110 230 118 160 132 100" /><path d="M280 300 C290 230 282 160 268 100" /></g>
          <g opacity={diffusive * 0.8}><path d="M70 215 H118" /><path d="M330 215 H282" /><path d="M200 70 V128" /><path d="M110 125 L148 160" /><path d="M290 125 L252 160" /></g>
        </g>
        <rect x="186" y={lerp(240, 278, g)} width="28" height="5" rx="2" fill="#c9d4dd" opacity=".75" />
        <text x="200" y="372" textAnchor="middle" fill="#a9b8c6" fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="1.5">
          {mode === 'earth' ? 'BUOYANT PLUME ↑' : mode === 'micro' ? 'DIFFUSION → FLAME ←' : 'INTERPOLATED'}
        </text>
      </svg>
    </div>
    <figcaption id={`${id}-cap`} className="lens-caption">Gravity Lens · educational illustration, not NASA footage or data</figcaption>
    <div className="lens-controls">
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="sr-only">Gravity setting for the illustration</legend>
        <div className="segmented">
          {([['micro', 'Microgravity, still air', 0], ['earth', 'Earth 1 g', 1]] as const).map(([value, label, target]) => (
            <label key={value}><input type="radio" name={`${id}-g`} value={value} checked={mode === value} onChange={() => setG(target)} /><span>{label}</span></label>
          ))}
        </div>
      </fieldset>
      <div className="range-row">
        <label htmlFor={`${id}-range`} style={{ margin: 0 }}>0 g</label>
        <input id={`${id}-range`} type="range" min={0} max={100} step={1} value={Math.round(g * 100)} onChange={(e) => setG(Number(e.target.value) / 100)}
          aria-label="Illustrative gravity, percent of Earth gravity" aria-valuetext={`${Math.round(g * 100)} percent of Earth gravity, illustrative`} />
        <span aria-hidden="true">1 g</span>
      </div>
      <p className="lens-hint">Drag the slider or pick a gravity setting to change the flame.</p>
      <div className="lens-explain" aria-live="polite">
        <h2>{explanations[mode].title}</h2>
        <p>{explanations[mode].text}</p>
      </div>
      <div className="lens-foot">
        <details className="lens-about">
          <summary>About this illustration</summary>
          <p data-testid="lens-renderer">{renderer === 'webgl' ? 'Rendered with WebGL' : renderer === 'unavailable' ? 'WebGL unavailable · static illustration shown' : renderer === 'lost' ? 'WebGL interrupted · static illustration shown' : 'Static illustration'}</p>
          <p className="meta" style={{ margin: 0 }}>
            General physics explanation of still air, not drawn from the admitted record. For real evidence, <a href={record.href}>{record.title}</a> recorded{' '}
            {record.flowDirection ?? 'unspecified'} airflow{record.initialFlow ? ` with an initial air display entry of ${record.initialFlow}` : ''} ({record.locator}).
          </p>
        </details>
        {renderer === 'webgl' && <button type="button" className="btn btn-quiet btn-sm" aria-pressed={animated} onClick={() => setAnimated((a) => !a)}>
          {animated ? 'Pause flicker' : 'Play flicker'}{onMotionChange ? ' & scene motion' : ''}</button>}
      </div>
    </div>
  </figure>;
}
