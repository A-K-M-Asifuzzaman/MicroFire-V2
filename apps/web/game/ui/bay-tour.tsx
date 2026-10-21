'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PartSpec } from '../contract';
import type { BenchApi, BenchState, BenchView } from './bench-scene';
import { onFullscreen } from './bench';
import { LAB_ENVIRONMENT } from './lab-assets';
import { PixGuide, type Reaction } from './pix';
import { soundscape } from './soundscape';
import { ArrivalCinematic } from './station';
import './game.css';

/**
 * Visitor tour of the training bay: the same 3D bench, showing the apparatus in its reference configuration from
 * the frozen equipment specification. No session, no server state, no fixtures: nothing is fitted, flagged,
 * qualified or recorded here. The mission itself stays gated until its server integration is approved.
 */
const reference = (parts: PartSpec[], selectedPart: string | null): BenchState => ({
  installed: Object.fromEntries(parts.map((p) => [p.id, { anchorId: p.anchorId, orientation: 'correct' as const }])),
  flagged: [], pendingRepair: null, qualified: false, selectedPart, selectedAnchor: null, orientation: 'correct', choosing: false, pendingTarget: null, focus: 'overview'
});
const INTRO_KEY = 'microfire.bay.intro';

export function BayTour({ parts }: { parts: PartSpec[] }) {
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), api = useRef<BenchApi | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ready, setReady] = useState(false), [frame, setFrame] = useState(false), [off, setOff] = useState(false);
  const [env, setEnv] = useState<{ loaded: number; total: number; lite: boolean } | null>(null), [envOff, setEnvOff] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  // The arrival plays once per browser session (skippable; absent under reduced motion); "Replay intro" brings it back.
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* storage unavailable: play it */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session storage is only readable after hydration
    if (!seen) setIntro(true);
  }, []);
  const full = useSyncExternalStore(onFullscreen, () => !!stage.current && document.fullscreenElement === stage.current, () => false);
  const canFull = useSyncExternalStore(onFullscreen, () => document.fullscreenEnabled, () => false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false, visible = true;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D training bay. Drag to orbit, arrow keys to rotate, plus and minus to zoom. Select parts with the list below.');
    el.prepend(canvas);
    const motion = () => visible && !reduce.matches && !document.hidden;
    const none = () => undefined;
    import('./bench-scene').then(async ({ startBench }) => {
      if (cancelled) return;
      const a = await startBench(canvas, el, parts, {
        onSelectPart: (id) => setSel(id), onSelectAnchor: none, onDrop: none, onHover: setTip,
        onLost: () => { if (!cancelled) setOff(true); },
        onFirstFrame: () => { if (!cancelled) setFrame(true); },
        onEnvProgress: (p, lite) => { if (!cancelled) setEnv({ ...p, lite }); },
        onEnvOff: () => { if (!cancelled) setEnvOff(true); }
      }, motion(), LAB_ENVIRONMENT && { ...LAB_ENVIRONMENT, lite: matchMedia('(max-width: 760px), (pointer: coarse)').matches });
      if (cancelled) { a?.stop(); return; }
      if (!a) { setOff(true); return; }
      api.current = a; setReady(true);
    }).catch(() => setOff(true));
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
  }, [parts]);

  useEffect(() => { if (ready) api.current?.update(reference(parts, sel)); }, [ready, sel, parts]);
  // The astronaut greets the visitor once the scenery has loaded and the intro is out of the way (presentation only).
  const waved = useRef(false);
  const sceneryReady = !!env && env.loaded >= env.total;
  useEffect(() => { if (ready && sceneryReady && !intro && !waved.current) { waved.current = true; api.current?.react('wave'); } }, [ready, sceneryReady, intro]);

  const part = parts.find((p) => p.id === sel) ?? null;
  const r: Reaction = part
    ? { pose: 'look', pix: 'searching', line: `That’s the ${part.label.toLowerCase()}. It mounts at the ${part.anchorLabel.toLowerCase()}.` }
    : { pose: 'welcome', pix: 'idle', line: 'Welcome to the training bay. Pick any part to see what it is and where it mounts. This tour records nothing.' };
  useEffect(() => { soundscape.say(r.line); }, [r.line]);
  const pick = (id: string) => { setSel((cur) => (cur === id ? null : id)); };
  const lab = !!LAB_ENVIRONMENT && !envOff;
  const views: [BenchView, string][] = [...(lab ? [['establish', 'Bay'] as [BenchView, string]] : []), ['work', 'Work view'], ['inspect', part ? `Inspect ${part.label.toLowerCase()}` : 'Inspect']];

  return <div className="m2 m2-tour">
    {intro && <ArrivalCinematic onDone={() => setIntro(false)} title="The BASS-II training bay" sub="Illustrative tour · schematic training model" />}
    <div className="m2-tour-grid">
      {off ? <figure className="m2-tour-still">
        <div className="m2-tour-still-img" role="img" aria-label="Rendered still of the training bay: the flow duct on its bench, the chamber gantry and the observation window" />
        <figcaption className="m2-fine">3D isn’t available on this device, so this is a still rendered from the same bay. Everything below still works.</figcaption>
      </figure> : <div className="m2-stage3d" ref={stage}>
        <div className="m2-bench" ref={host} data-ready={ready} data-frame={frame} data-env={envOff ? 'off' : env ? (sceneryReady ? 'ready' : 'loading') : 'none'} data-env-tier={env?.lite ? 'lite' : 'full'}>
          {!frame && <ol className="m2-bench-loading m2-load-steps" aria-label="Loading the 3D training bay">
            <li data-state={ready ? 'done' : 'now'}>Loading the 3D engine</li>
            <li data-state={ready ? 'now' : 'next'}>Preparing materials and lights</li>
            <li data-state="next">First frame</li>
          </ol>}
          {env && !sceneryReady && <p className="m2-bench-env m2-fine">Loading lab scenery · {env.loaded} of {env.total} models</p>}
          {tip && <span className="m2-bench-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</span>}
        </div>
        <div className="m2-bench-bar">
          <div className="m2-views" role="group" aria-label="Camera view">
            {views.map(([v, name]) => <button key={v} type="button" className="m2-view" onClick={() => api.current?.view(v)} disabled={!frame}>{name}</button>)}
            {canFull && <button type="button" className="m2-view" aria-pressed={full} onClick={() => { if (full) void document.exitFullscreen(); else void stage.current?.requestFullscreen().catch(() => undefined); }}>{full ? 'Exit full screen' : 'Full screen'}</button>}
            <button type="button" className="m2-view" onClick={() => setIntro(true)}>Replay intro</button>
          </div>
          <p className="m2-bench-label">Illustrative tour. The apparatus is shown in its reference configuration from the equipment specification: a schematic training model, not a NASA engineering CAD reconstruction (duct proportions sourced, other geometry schematic).{lab && ' The bay, astronaut, inspection arm and Earth view are illustrative.'}{envOff && ' Lab scenery is off on this device (software graphics) so the page stays responsive.'}</p>
        </div>
      </div>}
      <div className="m2-tour-side">
        <PixGuide r={r} />
        <section className="m2-tour-parts" aria-labelledby="m2-tour-parts-h">
          <h2 id="m2-tour-parts-h" className="eyebrow">Apparatus parts · select to inspect</h2>
          <ul>{parts.map((p) => <li key={p.id}><button type="button" aria-pressed={sel === p.id} onClick={() => pick(p.id)}>{p.label}</button></li>)}</ul>
          {part && <dl className="m2-tour-card" aria-live="polite">
            <div><dt>Part</dt><dd>{part.label}</dd></div>
            <div><dt>Mounts at</dt><dd>{part.anchorLabel}</dd></div>
            {part.requires.length > 0 && <div><dt>Mounting order (educational model)</dt><dd>Fits after {part.requires.map((id) => parts.find((x) => x.id === id)?.label ?? id).join(', ')}</dd></div>}
            <div><dt>NASA hardware description</dt><dd>{part.sourceNote}</dd></div>
          </dl>}
        </section>
      </div>
    </div>
  </div>;
}
