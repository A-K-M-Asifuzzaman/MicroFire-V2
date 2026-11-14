'use client';
// The Flame Lab chamber: a stylised BASS-style flow duct in 3D (three.js, loaded only here) with the illustrated SVG
// flame as the fallback without WebGL. The flame is the TOY model, never footage or a simulation.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FlameScene, SceneState } from '../three/FlameScene';
import { GRAVITY, regime, toyFlame, type Phase, type Settings } from '../../lib/lab-engine';

const never = () => () => {};
const hasGl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

function sceneState(s: Settings, phase: Phase, focus: boolean): SceneState {
  const lit = phase === 'observe' || phase === 'record', r = regime(s).id;
  return { view: 'duct', gravity: s.gravity, o2: s.o2, flow: s.flow, material: 'PMMA', focus: true, ...(focus ? { zoom: 'flame' as const } : {}),
    outcome: !lit ? 'none' : r === 'starved' || r === 'pushed' ? 'dim' : 'burning', igniter: phase === 'ignite' ? 1 : 0 };
}

export function LabChamber({ s, phase, flat = false }: { s: Settings; phase: Phase; flat?: boolean }) {
  const gl = useSyncExternalStore(never, hasGl, () => true) && !flat;
  const canvas = useRef<HTMLCanvasElement>(null), scene = useRef<FlameScene | null>(null);
  const [focus, setFocus] = useState(true), [ready, setReady] = useState(false);
  const state = sceneState(s, phase, focus), stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });
  useEffect(() => {
    if (!gl || !canvas.current) return;
    let live = true;
    import('../three/FlameScene').then(({ FlameScene }) => {
      if (!live || !canvas.current) return;
      try { scene.current = new FlameScene(canvas.current, stateRef.current, { fit: true, models: false }); setReady(true); } catch { /* the SVG below stays */ }
      scene.current?.setGentle(matchMedia('(prefers-reduced-motion: reduce)').matches);
    });
    const io = new IntersectionObserver(([e]) => scene.current?.setRunning(!!e?.isIntersecting && !document.hidden));
    io.observe(canvas.current);
    return () => { live = false; io.disconnect(); scene.current?.dispose(); scene.current = null; };
  }, [gl]);
  useEffect(() => { scene.current?.setState(state); });
  useEffect(() => { if (phase === 'observe') scene.current?.ignite(); }, [phase]);

  const label = `Illustrated BASS-style flow duct with a PMMA sample: ${GRAVITY[s.gravity].label}, ${s.o2} vol% oxygen, ${s.flow} cm/s opposed airflow. ${phase === 'observe' || phase === 'record' ? `Toy flame: ${regime(s).label.toLowerCase()}.` : 'Not lit yet.'} Authored toy model, not a measurement.`;
  return <div className="lab-chamber" data-env={s.gravity} data-phase={phase}>
    {gl ? <canvas ref={canvas} className="lab-canvas" role="img" aria-label={label} data-ready={ready} /> : <SvgFlame s={s} lit={phase === 'observe' || phase === 'record'} label={label} />}
    {gl && !ready && <SvgFlame s={s} lit={phase === 'observe' || phase === 'record'} label={label} overlay />}
    <div className="lab-chamber-bar">
      {gl && <div role="group" aria-label="Camera"><button type="button" aria-pressed={focus} onClick={() => setFocus(true)}>Close-up</button><button type="button" aria-pressed={!focus} onClick={() => setFocus(false)}>Full duct</button></div>}
      <span className="lab-chamber-tag">Authored toy model · qualitative · not a measurement or simulation</span>
    </div>
  </div>;
}

/** The illustrated flame (also the no-WebGL view). */
function SvgFlame({ s, lit, label, overlay }: { s: Settings; lit: boolean; label: string; overlay?: boolean }) {
  const t = toyFlame({ g: GRAVITY[s.gravity].g, flow: s.flow, o2: s.o2, pressure: s.pressure }), rx = 46 * t.size, ry = 46 * t.size * t.stretch * 0.62;
  const hot = `rgb(${Math.round(255 - t.blue * 175)}, ${Math.round(150 + t.blue * 40)}, ${Math.round(40 + t.blue * 215)})`;
  const core = `rgb(${Math.round(255 - t.blue * 120)}, ${Math.round(210 - t.blue * 40)}, ${Math.round(120 + t.blue * 135)})`;
  return <svg className="lab-svgflame" data-overlay={overlay || undefined} viewBox="0 0 400 260" role={overlay ? undefined : 'img'} aria-label={overlay ? undefined : label} aria-hidden={overlay || undefined}>
    <defs><radialGradient id="lab2-glow" cx="50%" cy="60%" r="60%"><stop offset="0%" stopColor={core} stopOpacity={t.brightness} /><stop offset="55%" stopColor={hot} stopOpacity={t.brightness * 0.85} /><stop offset="100%" stopColor={hot} stopOpacity="0" /></radialGradient>
      <linearGradient id="lab2-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#070829" /><stop offset="100%" stopColor="#12146a" /></linearGradient></defs>
    <rect width="400" height="260" fill="url(#lab2-bg)" />
    <rect x="20" y="40" width="360" height="190" rx="10" fill="none" stroke="#3d47b8" strokeWidth="2" strokeDasharray="6 6" />
    {s.flow > 0 && [80, 120, 160, 200].map((y) => <g key={y} opacity={0.25 + s.flow / 40}><path d={`M30 ${y} H120`} stroke="#9fc0ff" strokeWidth="2" strokeDasharray="6 8" /><path d={`M120 ${y} l-8 -5 v10 z`} fill="#9fc0ff" /></g>)}
    <rect x="90" y="186" width="160" height="8" rx="3" fill="#d9dde8" />
    {lit && <g transform={`translate(240 190) skewX(${t.lean * 35})`}><ellipse cx="0" cy={-ry * 0.55} rx={rx} ry={ry} fill="url(#lab2-glow)" /><ellipse cx="0" cy={-ry * 0.35} rx={rx * 0.45} ry={ry * 0.5} fill={core} opacity={t.brightness * 0.55} /></g>}
    {!lit && <text x="200" y="130" textAnchor="middle" fill="#c9cdff" fontSize="14">Press “Run experiment” to ignite the sample</text>}
  </svg>;
}
