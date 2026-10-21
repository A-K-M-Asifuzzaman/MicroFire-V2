'use client';
import { useSyncExternalStore } from 'react';
import type { PartSpec } from '../../../game/contract';
import { onFullscreen } from '../../../game/ui/bench';
import { LAB_ENVIRONMENT } from '../../../game/ui/lab-assets';
import { useBay } from '../../../game/ui/use-bay';
import { ABar } from './parts';
import './a.css';

// The re-textured suit (navy panels, orange accents) on the same rigged, animated astronaut; no cool-grey tint.
const ENV = LAB_ENVIRONMENT && { ...LAB_ENVIRONMENT, astronaut: LAB_ENVIRONMENT.astronaut && { ...LAB_ENVIRONMENT.astronaut, url: '/models/astronaut-suit/astronaut.gltf', tint: '#ffffff' } };

/** Design A laboratory: the bay fills the screen; the interface is an instrument deck around it. */
export function ALab({ parts }: { parts: PartSpec[] }) {
  const bay = useBay(parts, { environment: ENV, opening: 'hero' });
  const { host, ready, frame, off, env, sceneryReady, lab, part, pick, guide, setGuide, reaction, views, view } = bay;
  const full = useSyncExternalStore(onFullscreen, () => !!document.fullscreenElement, () => false);
  const order = (p: PartSpec) => p.requires.map((id) => parts.find((x) => x.id === id)?.label ?? id).join(', ');
  return <div className="da da-lab" data-ready={ready}>
    <ABar current="lab" />
    <div className="da-lab-stage" ref={host} data-frame={frame} data-env={env ? (sceneryReady ? 'ready' : 'loading') : 'none'}>
      {!frame && !off && <p className="da-loading">{ready ? 'Preparing materials and lights' : 'Loading the 3D engine'}</p>}
      {env && !sceneryReady && <p className="da-loading da-loading-low">Loading bay scenery {env.loaded} of {env.total}</p>}
      {off && <div className="da-poster" role="img" aria-label="3D is not available on this device" />}
    </div>
    <header className="da-lab-title">
      <h1>BASS-II training bay</h1>
      <p>A schematic training model of the flow duct, shown in its reference configuration. Illustrative: nothing here is a mission result and nothing is recorded.</p>
    </header>
    <nav className="da-rack" aria-label="Apparatus parts">
      <p className="da-rack-head">Apparatus <span className="da-mono">{parts.length}</span></p>
      <ul>{parts.map((p, i) => <li key={p.id}>
        <button type="button" aria-pressed={part?.id === p.id} onClick={() => pick(p.id)}>
          <span className="da-led" data-on={part?.id === p.id} aria-hidden="true" />
          <span className="da-mono da-rack-n">{String(i + 1).padStart(2, '0')}</span>
          <b>{p.label}</b>
        </button>
      </li>)}</ul>
    </nav>
    <aside className="da-plate" aria-live="polite">
      <p className="da-pix-name">PIX</p>
      <p className="da-plate-line">{reaction.line}</p>
      {part && <dl>
        <div><dt>Mounts at</dt><dd>{part.anchorLabel}</dd></div>
        {part.requires.length > 0 && <div><dt>Mounting order (educational model)</dt><dd>Fits after {order(part)}</dd></div>}
        <div><dt>NASA hardware description</dt><dd>{part.sourceNote}</dd></div>
      </dl>}
    </aside>
    <div className="da-deck" role="group" aria-label="Bay controls">
      <button type="button" className="da-key" aria-pressed={guide !== null} onClick={() => setGuide(guide === null ? 0 : null)} disabled={!frame}>
        <span className="da-led" data-on={guide !== null} aria-hidden="true" />{guide === null ? 'Guided tour' : `Stop tour ${guide + 1} of ${parts.length}`}
      </button>
      <div className="da-seg" role="group" aria-label="Camera">
        {views.map(([v, name]) => <button key={v} type="button" onClick={() => view(v)} disabled={!frame}>{name}</button>)}
      </div>
      <button type="button" className="da-key da-key-quiet" onClick={() => { if (full) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => undefined); }}>{full ? 'Exit full screen' : 'Full screen'}</button>
      <p className="da-fine da-deck-note">{lab ? 'Duct proportions sourced; other geometry schematic. The bay, astronaut, arm and Earth view are illustrative.' : 'Apparatus only on this device.'}</p>
    </div>
  </div>;
}
