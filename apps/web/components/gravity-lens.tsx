'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { FlameRenderer } from './flame-gl';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const f = (n: number) => n.toFixed(1);

/** Illustrative outline: a near-sphere at 0 g stretching to a buoyant teardrop at 1 g. Shape is art direction, not computed. */
function flamePath(g: number, scale = 1, lift = 0) {
  const cx = 200, r = lerp(62, 42, g) * scale;
  const mid = lerp(215, 245, g) - lift, tip = lerp(215 - 62 * scale, 70 + (1 - scale) * 120, g) - lift, base = lerp(215 + 62 * scale, 285 - (1 - scale) * 30, g) - lift;
  const k = lerp(0.55, 0.08, g), up = (mid - tip) * 0.38, down = (base - mid) * 0.55;
  return `M${cx} ${f(tip)} C${f(cx + r * k)} ${f(tip + up * 0.2)} ${f(cx + r)} ${f(mid - up)} ${f(cx + r)} ${f(mid)} C${f(cx + r)} ${f(mid + down)} ${f(cx + r * 0.55)} ${f(base)} ${cx} ${f(base)} C${f(cx - r * 0.55)} ${f(base)} ${f(cx - r)} ${f(mid + down)} ${f(cx - r)} ${f(mid)} C${f(cx - r)} ${f(mid - up)} ${f(cx - r * k)} ${f(tip + up * 0.2)} ${cx} ${f(tip)}Z`;
}

const explanations = {
  earth: { title: 'Earth illustration (1 g)', text: 'Hot combustion gases are lighter than the surrounding air, so buoyancy lifts them. The rising flow draws fresh air in from below and stretches the flame into a tall teardrop; its bright yellow light comes from glowing soot.' },
  partial: { title: 'Partial gravity (illustrative blend)', text: 'This intermediate shape is interpolated between the two illustrations for teaching. It is not computed and does not represent any measured environment.' },
  micro: { title: 'Microgravity illustration', text: 'With almost no buoyancy, hot gases do not rise away. Without a fan, oxygen reaches the flame mainly by slow diffusion, so a still-air flame tends to be rounder, dimmer and bluer.' }
};

export type LensRecord = { href: string; title: string; flowDirection: string | null; initialFlow: string | null; locator: string };

export function GravityLens({ record }: { record: LensRecord }) {
  const [g, setG] = useState(0);
  const [renderer, setRenderer] = useState<'svg' | 'webgl' | 'unavailable'>('svg');
  const [animated, setAnimated] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gl = useRef<FlameRenderer | null>(null);
  const id = useId();
  const mode = g >= 0.85 ? 'earth' : g <= 0.15 ? 'micro' : 'partial';

  // Defer WebGL until after first paint; reduced-motion users get a still frame that follows the controls.
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    const handle = setTimeout(() => {
      setAnimated(!reduced);
      import('./flame-gl').then(({ startFlame }) => {
        if (cancelled || !canvas.current) return;
        gl.current = startFlame(canvas.current, 0, !reduced);
        setRenderer(gl.current ? 'webgl' : 'unavailable');
      }).catch(() => setRenderer('unavailable'));
    }, 120);
    return () => { cancelled = true; clearTimeout(handle); gl.current?.stop(); gl.current = null; };
  }, []);
  useEffect(() => { gl.current?.draw(g); }, [g]);
  useEffect(() => { gl.current?.setAnimated(animated); }, [animated]);

  const buoyant = g, diffusive = 1 - g;
  return <figure className="lens" data-renderer={renderer === 'webgl' ? 'webgl' : 'svg'} data-gravity={mode} aria-labelledby={`${id}-cap`} style={{ margin: 0 }}>
    <div className="lens-stage">
      <canvas ref={canvas} aria-hidden="true" />
      <svg viewBox="0 0 400 400" role="img" aria-label={`${explanations[mode].title}: ${mode === 'earth' ? 'a tall teardrop flame' : mode === 'micro' ? 'a rounded, dim blue flame' : 'an intermediate flame shape'}.`}>
        <defs>
          <radialGradient id={`${id}-env`} cx="50%" cy="62%" r="60%"><stop offset="0" stopColor="#2a5fbf" stopOpacity=".18" /><stop offset=".72" stopColor="#5d9bf5" stopOpacity=".5" /><stop offset=".9" stopColor="#a8d4ff" stopOpacity=".95" /><stop offset="1" stopColor="#2a5fbf" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${id}-core`} cx="50%" cy="65%" r="60%"><stop offset="0" stopColor="#fff2cf" /><stop offset=".55" stopColor="#ffb257" /><stop offset="1" stopColor="#ff7a2a" stopOpacity=".2" /></radialGradient>
          <radialGradient id={`${id}-glow`}><stop offset="0" stopColor="#ff8738" stopOpacity=".35" /><stop offset="1" stopColor="#ff8738" stopOpacity="0" /></radialGradient>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#73bbd9" /></marker>
        </defs>
        <g fill="none" stroke="#73bbd9">
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
        <g stroke="#73bbd9" strokeWidth="2" markerEnd={`url(#${id}-arrow)`} fill="none">
          <g opacity={buoyant * 0.9}><path d="M120 300 C110 230 118 160 132 100" /><path d="M280 300 C290 230 282 160 268 100" /></g>
          <g opacity={diffusive * 0.8}><path d="M70 215 H118" /><path d="M330 215 H282" /><path d="M200 70 V128" /><path d="M110 125 L148 160" /><path d="M290 125 L252 160" /></g>
        </g>
        <rect x="186" y={lerp(240, 278, g)} width="28" height="5" rx="2" fill="#c9d4dd" opacity=".75" />
        <text x="200" y="372" textAnchor="middle" fill="#a9b8c6" fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="1.5">
          {mode === 'earth' ? 'BUOYANT PLUME ↑' : mode === 'micro' ? 'DIFFUSION → FLAME ←' : 'INTERPOLATED'}
        </text>
      </svg>
    </div>
    <figcaption id={`${id}-cap`} className="lens-caption">Gravity Lens · educational illustration · not a simulation, footage or measurement</figcaption>
    <div className="lens-controls">
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="sr-only">Gravity setting for the illustration</legend>
        <div className="segmented">
          {([['micro', 'Microgravity', 0], ['earth', 'Earth 1 g', 1]] as const).map(([value, label, target]) => (
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
      <div className="lens-explain" aria-live="polite">
        <h2>{explanations[mode].title}</h2>
        <p>{explanations[mode].text}</p>
      </div>
      <div className="lens-tools">
        <span data-testid="lens-renderer">{renderer === 'webgl' ? 'Rendered with WebGL' : renderer === 'unavailable' ? 'WebGL unavailable · static illustration shown' : 'Static illustration'}</span>
        {renderer === 'webgl' && <button type="button" className="btn btn-quiet btn-sm" aria-pressed={animated} onClick={() => setAnimated((a) => !a)}>{animated ? 'Pause flicker' : 'Play flicker'}</button>}
      </div>
      <p className="meta" style={{ margin: 0 }}>
        General physics explanation, not drawn from the admitted record. For real evidence, <a href={record.href}>{record.title}</a> recorded{' '}
        {record.flowDirection ?? 'unspecified'} airflow{record.initialFlow ? ` with an initial air display entry of ${record.initialFlow}` : ''} ({record.locator}).
      </p>
    </div>
  </figure>;
}
