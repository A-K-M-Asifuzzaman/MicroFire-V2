'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PartSpec } from '../contract';
import { onFullscreen } from './bench';
import { PixGuide } from './pix';
import { ArrivalCinematic } from './station';
import { useBay } from './use-bay';
import './game.css';

const INTRO_KEY = 'microfire.bay.intro';

/** The public, illustrative Training Bay tour (see useBay: no session, no server state, nothing recorded). */
export function BayTour({ parts }: { parts: PartSpec[] }) {
  const stage = useRef<HTMLDivElement>(null);
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
  const { host, ready, frame, off, env, envOff, sceneryReady, lab, tip, sel, part, pick, guide, setGuide, reaction: r, views, view } = useBay(parts, { greet: !intro });

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
            <button type="button" className="m2-view m2-guide-btn" aria-pressed={guide !== null} onClick={() => setGuide(guide === null ? 0 : null)} disabled={!frame}>{guide === null ? 'Guided tour' : `Stop tour · ${guide + 1}/${parts.length}`}</button>
            {views.map(([v, name]) => <button key={v} type="button" className="m2-view" onClick={() => view(v)} disabled={!frame}>{name}</button>)}
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
