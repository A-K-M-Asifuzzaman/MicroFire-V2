'use client';
// Shared mission viewport: an optional 3D room (Meshy props) with real <button> hotspots projected over it, or a 2D
// plan of the same buttons without WebGL. Purely presentational; the parent decides which station is next from
// engine snapshot facts and what each station does.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLite } from '../lite-mode';
import type { Prop, StationScene } from './station-scene';

export type Spot = { id: string; label: string; what: string };
// Probe once and release the probe context at once: useSyncExternalStore calls this on every render, and an
// uncached probe leaked a WebGL context per render until the browser dropped the scene's own context.
let probed: boolean | null = null;
const noWebgl = () => {
  if (probed !== null) return probed;
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    (gl?.getExtension('WEBGL_lose_context') as { loseContext(): void } | null | undefined)?.loseContext();
    probed = !gl;
  } catch { probed = true; }
  return probed;
};
const never = () => () => undefined;

export function SceneViewport({ layout, spots, next, open, onToggle, loading }: {
  layout: 'station' | 'detective' | 'trial' | 'habitat'; spots: Spot[]; next: string | undefined; open: string | null; onToggle: (id: string) => void; loading: string;
}) {
  const lite = useLite(), flat = useSyncExternalStore(never, noWebgl, () => false) || lite;
  const canvas = useRef<HTMLCanvasElement>(null), sceneRef = useRef<StationScene | null>(null);
  const [pos, setPos] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  // Projected labels can collide as the camera drifts or the viewport narrows: measure the real boxes and push any
  // overlapping label below the ones above it, so every hotspot stays a separate, clickable button.
  const btn = useRef<Record<string, HTMLButtonElement | null>>({});
  useLayoutEffect(() => {
    const boxes = spots.flatMap((sp) => { const el = btn.current[sp.id], p = pos[sp.id];
      return el && p?.visible ? [{ id: sp.id, l: p.x - el.offsetWidth / 2, r: p.x + el.offsetWidth / 2, t: p.y - el.offsetHeight, h: el.offsetHeight }] : []; }).sort((a, b) => a.t - b.t);
    const placed: { l: number; r: number; t: number; b: number }[] = [], out: Record<string, number> = {};
    for (const bx of boxes) {
      let t = bx.t;
      for (let guard = 0; guard < 12; guard++) { const hit = placed.find((q) => bx.l < q.r && q.l < bx.r && t < q.b && q.t < t + bx.h); if (!hit) break; t = hit.b + 4; }
      placed.push({ l: bx.l, r: bx.r, t, b: t + bx.h }); out[bx.id] = Math.round(t - bx.t);
    }
    // Written straight to the element (no re-render); CSS applies it with `translate`.
    for (const sp of spots) btn.current[sp.id]?.style.setProperty('--dy', `${out[sp.id] ?? 0}px`);
  }, [pos, spots, open, next]);
  useEffect(() => {
    if (flat || !canvas.current) return;
    let live = true, scene: StationScene | null = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    void import('./station-scene').then((m) => {
      if (!live || !canvas.current) return;
      const props: Prop[] = ({ station: m.STATION_PROPS, detective: m.DETECTIVE_PROPS, trial: m.TRIAL_PROPS, habitat: m.HABITAT_PROPS })[layout];
      const environment = ({ station: 'station', detective: 'lab', trial: 'court', habitat: 'lunar' } as const)[layout];
      scene = m.mountStationScene(canvas.current, { props, environment, reducedMotion, onReady: () => live && setReady(true),
        onPositions: (p) => { if (live) setPos((old) => Object.keys(p).every((k) => Math.abs((old[k]?.x ?? -1) - (p[k]?.x ?? -1)) < 0.5 && Math.abs((old[k]?.y ?? -1) - (p[k]?.y ?? -1)) < 0.5) ? old : p as typeof old); } });
      if (!scene) setFailed(true); sceneRef.current = scene;
    }, () => live && setFailed(true));
    return () => { live = false; scene?.dispose(); sceneRef.current = null; };
  }, [flat, layout]);
  useEffect(() => { sceneRef.current?.setActive(next ?? null); }, [next, ready]);
  const twoD = flat || failed;
  return <div className="mf-viewport" data-layout={layout} data-mode={twoD ? '2d' : '3d'} data-ready={ready}>
    {!twoD && <canvas ref={canvas} aria-hidden="true" />}
    {twoD && <p className="mf-fallback-note">{lite ? 'Lightweight mode: the 3D room is off to save data. Every station still works below.' : flat ? 'The 3D room is not available on this device. Every station still works below.' : 'The 3D room could not start. Every station still works below.'}</p>}
    {!twoD && !ready && <p className="mf-loading" role="status">{loading}</p>}
    <div className={twoD ? 'mf-plan' : 'mf-spots'} role="group" aria-label="Station hotspots">{spots.map((sp) => <button key={sp.id} ref={(el) => { btn.current[sp.id] = el; }} type="button" className="mf-spot" data-next={sp.id === next} aria-expanded={open === sp.id} aria-controls="mf-panel"
      style={!twoD && pos[sp.id] ? { left: `clamp(84px, ${pos[sp.id]!.x}px, calc(100% - 84px))`, top: pos[sp.id]!.y, visibility: pos[sp.id]!.visible ? undefined : 'hidden' } : undefined}
      onClick={() => onToggle(sp.id)}><span className="mf-spot-dot" aria-hidden="true" /><b>{sp.label}</b><span>{sp.what}</span></button>)}</div>
    <span className="mf-tag">Original 3D illustration · AI-generated models (Meshy) · not NASA imagery</span>
  </div>;
}
