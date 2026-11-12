'use client';
// Shared mission viewport: an optional 3D room (Meshy props) with real <button> hotspots projected over it, or a 2D
// plan of the same buttons without WebGL. Purely presentational; the parent decides which station is next from
// engine snapshot facts and what each station does.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  const flat = useSyncExternalStore(never, noWebgl, () => false);
  const canvas = useRef<HTMLCanvasElement>(null), sceneRef = useRef<StationScene | null>(null);
  const [pos, setPos] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    if (flat || !canvas.current) return;
    let live = true, scene: StationScene | null = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    void import('./station-scene').then((m) => {
      if (!live || !canvas.current) return;
      const props: Prop[] = ({ station: m.STATION_PROPS, detective: m.DETECTIVE_PROPS, trial: m.TRIAL_PROPS, habitat: m.HABITAT_PROPS })[layout];
      scene = m.mountStationScene(canvas.current, { props, reducedMotion, onReady: () => live && setReady(true),
        onPositions: (p) => { if (live) setPos((old) => Object.keys(p).every((k) => Math.abs((old[k]?.x ?? -1) - (p[k]?.x ?? -1)) < 0.5 && Math.abs((old[k]?.y ?? -1) - (p[k]?.y ?? -1)) < 0.5) ? old : p as typeof old); } });
      if (!scene) setFailed(true); sceneRef.current = scene;
    }, () => live && setFailed(true));
    return () => { live = false; scene?.dispose(); sceneRef.current = null; };
  }, [flat, layout]);
  useEffect(() => { sceneRef.current?.setActive(next ?? null); }, [next, ready]);
  const twoD = flat || failed;
  return <div className="mf-viewport" data-mode={twoD ? '2d' : '3d'} data-ready={ready}>
    {!twoD && <canvas ref={canvas} aria-hidden="true" />}
    {twoD && <p className="mf-fallback-note">{flat ? 'The 3D room is not available on this device. Every station still works below.' : 'The 3D room could not start. Every station still works below.'}</p>}
    {!twoD && !ready && <p className="mf-loading" role="status">{loading}</p>}
    <div className={twoD ? 'mf-plan' : 'mf-spots'} role="group" aria-label="Station hotspots">{spots.map((sp) => <button key={sp.id} type="button" className="mf-spot" data-next={sp.id === next} aria-expanded={open === sp.id} aria-controls="mf-panel"
      style={!twoD && pos[sp.id] ? { left: pos[sp.id]!.x, top: pos[sp.id]!.y, visibility: pos[sp.id]!.visible ? undefined : 'hidden' } : undefined}
      onClick={() => onToggle(sp.id)}><span className="mf-spot-dot" aria-hidden="true" /><b>{sp.label}</b><span>{sp.what}</span></button>)}</div>
    <span className="mf-tag">Illustration · fixture states</span>
  </div>;
}
