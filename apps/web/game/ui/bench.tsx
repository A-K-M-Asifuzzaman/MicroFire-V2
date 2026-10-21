'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PartId, Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allowsCore, astronautCue, install, journeyStage, qualifiedNow, rig } from '../view-model';
import type { BenchApi, BenchState, BenchView } from './bench-scene';
import { LAB_ENVIRONMENT } from './lab-assets';
import { anchorLabel, useGame } from './context';

/** 3D view of the same confirmed state as the schematic; drops and clicks become the same intents as in 2D. */
export function Bench3D({ s, faultMoment, onUnavailable }: { s: Snapshot; faultMoment: number | null; onUnavailable: () => void }) {
  const { c, s: st, data, selection, select } = useGame();
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<BenchApi | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(false);
  const [env, setEnv] = useState<{ loaded: number; total: number; lite: boolean } | null>(null);
  const [envOff, setEnvOff] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  // Full-screen view (native Fullscreen API; Esc leaves it). The 2D panels stay on the page underneath.
  const full = useSyncExternalStore(onFullscreen, () => !!stage.current && document.fullscreenElement === stage.current, () => false);
  const canFull = useSyncExternalStore(onFullscreen, () => document.fullscreenEnabled, () => false);
  const toggleFull = () => { if (full) void document.exitFullscreen(); else void stage.current?.requestFullscreen().catch(() => undefined); };
  const latest = useRef({ s, selection, st });
  useEffect(() => { latest.current = { s, selection, st }; });

  const benchState = (): BenchState => {
    const parts = rig(s, data.parts);
    const sel = parts.find((p) => p.spec.id === selection.partId);
    const link = st.link;
    const pending = (link.status === 'awaiting' || link.status === 'paced') && link.pending.endpoint === 'action' && link.pending.request.action.type === 'GAME'
      && link.pending.request.action.action.type === 'INSTALL_PART' ? link.pending.request.action.action.anchorId : null;
    const stage = journeyStage(s);
    return {
      installed: Object.fromEntries(parts.filter((p) => p.installed).map((p) => [p.spec.id, p.installed!])),
      flagged: parts.filter((p) => p.authoredFault || p.findings.length > 0).map((p) => p.spec.id),
      pendingRepair: s.training.pendingRepair?.partId ?? null,
      qualified: qualifiedNow(s),
      selectedPart: selection.partId, selectedAnchor: selection.anchorId, orientation: selection.orientation,
      choosing: !!sel && !sel.installed, pendingTarget: pending,
      focus: ['fault', 'investigation', 'diagnosis', 'repair'].includes(stage) ? 'fan' : ['qualification', 'observation'].includes(stage) && qualifiedNow(s) ? 'wide' : 'overview'
    };
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false, visible = true;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D training bench. Drag to orbit, arrow keys to rotate, plus and minus to zoom. Use the parts tray and controls below for every action.');
    el.prepend(canvas);
    const motion = () => visible && !reduce.matches && !document.hidden;
    import('./bench-scene').then(async ({ startBench }) => {
      if (cancelled) return;
      const a = await startBench(canvas, el, data.parts, {
        onSelectPart: (id) => select({ partId: id as PartId, anchorId: null }),
        onSelectAnchor: (anchorId) => select({ anchorId }),
        onDrop: (id, anchorId) => {
          const { s: cur, selection: sel, st: state } = latest.current;
          select({ anchorId });
          if (state.link.status !== 'confirmed' || !allowsCore(cur, 'INSTALL_PART') || isBusy(state.link)) return;
          const part = data.parts.find((p) => p.id === id)!;
          void c.send(install(part.id, anchorId, sel.orientation), `Install ${part.label} at ${anchorLabel(data, anchorId)}`);
        },
        onHover: setTip,
        onLost: () => { if (!cancelled) onUnavailable(); },
        onFirstFrame: () => { if (!cancelled) setFrame(true); },
        onEnvProgress: (p, lite) => { if (!cancelled) setEnv({ ...p, lite }); },
        onEnvOff: () => { if (!cancelled) setEnvOff(true); }
      }, motion(), LAB_ENVIRONMENT && { ...LAB_ENVIRONMENT, lite: matchMedia('(max-width: 760px), (pointer: coarse)').matches });
      if (cancelled) { a?.stop(); return; }
      if (!a) { onUnavailable(); return; }
      api.current = a; setReady(true);
    }).catch(() => onUnavailable());
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; api.current?.setMotion(motion()); });
    io.observe(el);
    const sync = () => api.current?.setMotion(motion());
    const onResize = () => api.current?.resize();
    reduce.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); window.addEventListener('resize', onResize);
    return () => {
      cancelled = true; io.disconnect();
      reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize);
      api.current?.stop(); api.current = null; canvas.remove();
    };
    // The scene is created once; state flows in through update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (ready) api.current?.update(benchState()); });
  useEffect(() => { if (ready && faultMoment !== null) { api.current?.faultMoment(); api.current?.react('look'); } }, [faultMoment, ready]);
  // The astronaut acknowledges outcomes the confirmed snapshots already show (presentation; never an outcome of its own).
  const cue = astronautCue(st.event);
  useEffect(() => { if (ready && cue) api.current?.react(cue); }, [st.event, cue, ready]);

  const scenery = env && env.loaded < env.total;
  const lab = !!LAB_ENVIRONMENT && !envOff;
  const views: [BenchView, string][] = [...(lab ? [['establish', 'Bay'] as [BenchView, string]] : []), ['work', 'Work view'], ['inspect', 'Inspect'], ...(lab && qualifiedNow(s) ? [['wide', 'Wide'] as [BenchView, string]] : [])];
  return <div className="m2-stage3d" ref={stage}>
    <div className="m2-bench" ref={host} data-ready={ready} data-frame={frame} data-env={envOff ? 'off' : env ? (scenery ? 'loading' : 'ready') : 'none'} data-env-tier={env?.lite ? 'lite' : 'full'} data-cue={cue ?? ''}>
      {!frame && <ol className="m2-bench-loading m2-load-steps" aria-label="Loading the 3D bench">
        <li data-state={ready ? 'done' : 'now'}>Loading the 3D engine</li>
        <li data-state={ready ? 'now' : 'next'}>Preparing materials and lights</li>
        <li data-state="next">First frame</li>
      </ol>}
      {scenery && <p className="m2-bench-env m2-fine">Loading lab scenery · {env.loaded} of {env.total} models</p>}
      {tip && <span className="m2-bench-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</span>}
    </div>
    {/* Captions and camera controls sit below the view, never over the apparatus. */}
    <div className="m2-bench-bar">
      <div className="m2-views" role="group" aria-label="Camera view">
        {views.map(([v, name]) => <button key={v} type="button" className="m2-view" onClick={() => api.current?.view(v)} disabled={!frame}>{name}</button>)}
        {canFull && <button type="button" className="m2-view" aria-pressed={full} onClick={toggleFull}>{full ? 'Exit full screen' : 'Full screen'}</button>}
      </div>
      <details className="m2-bench-help">
        <summary>How to use the 3D bench</summary>
        <p className="m2-fine">Select a part in the tray, then drag its preview onto a glowing mount — or click a mount. The server decides whether it fits. Drag empty space or use the arrow keys to orbit; plus and minus zoom.</p>
      </details>
      <p className="m2-bench-label">Schematic training model — not a NASA engineering CAD reconstruction. Duct proportions sourced; other geometry schematic.{lab && env && ' The bay, astronaut, inspection arm and Earth view are illustrative.'}{envOff && ' Lab scenery is off on this device (software graphics) so the bench stays responsive.'}</p>
    </div>
  </div>;
}

const onFullscreen = (fn: () => void) => { document.addEventListener('fullscreenchange', fn); return () => document.removeEventListener('fullscreenchange', fn); };
