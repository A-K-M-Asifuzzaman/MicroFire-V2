'use client';
import type { PartSpec } from '../../../game/contract';
import { LAB_ENVIRONMENT } from '../../../game/ui/lab-assets';
import { useBay } from '../../../game/ui/use-bay';
import { BBar } from './parts';
import { PixFigure } from './pix';
import './b.css';

const ENV = LAB_ENVIRONMENT && { ...LAB_ENVIRONMENT, astronaut: LAB_ENVIRONMENT.astronaut && { ...LAB_ENVIRONMENT.astronaut, url: '/models/astronaut-suit/astronaut.gltf', tint: '#ffffff' } };

/** Design B laboratory: the bay seen through a big porthole; PIX narrates beside it; parts are stickers. */
export function BLab({ parts }: { parts: PartSpec[] }) {
  const { host, ready, frame, off, env, sceneryReady, part, pick, guide, setGuide, reaction, views, view } = useBay(parts, { environment: ENV, opening: 'hero' });
  const order = (p: PartSpec) => p.requires.map((id) => parts.find((x) => x.id === id)?.label ?? id).join(', ');
  const mood = guide !== null ? 'cite' : part ? 'look' : 'greet';
  return <div className="db db-lab">
    <div className="db-band"><BBar current="lab" /></div>
    <main className="db-lab-main">
      <header className="db-lab-head">
        <h1>The training bay</h1>
        <p className="db-tag">Illustrative tour: nothing here is recorded</p>
      </header>
      <div className="db-lab-grid">
        <div className="db-porthole">
          <div className="db-porthole-view" ref={host} data-frame={frame} data-env={env ? (sceneryReady ? 'ready' : 'loading') : 'none'}>
            {!frame && !off && <p className="db-loading">{ready ? 'Switching on the lights…' : 'Loading the 3D bay…'}</p>}
            {off && <p className="db-loading">3D isn’t available here, but every part below still works.</p>}
          </div>
          <div className="db-cams" role="group" aria-label="Camera">
            {views.map(([v, name]) => <button key={v} type="button" onClick={() => view(v)} disabled={!frame}>{name}</button>)}
          </div>
        </div>
        <aside className="db-narrator">
          <PixFigure mood={mood} className="db-narrator-pix" />
          <p className="db-panel" aria-live="polite" key={reaction.line}>{reaction.line}</p>
          <button type="button" className="db-btn db-btn-sun" aria-pressed={guide !== null} onClick={() => setGuide(guide === null ? 0 : null)} disabled={!frame}>
            {guide === null ? `Take the guided tour (${parts.length} stops)` : 'Stop the tour'}
          </button>
          <ol className="db-pips" aria-label={guide === null ? 'Tour not started' : `Stop ${guide + 1} of ${parts.length}`}>
            {parts.map((p, i) => <li key={p.id} data-state={guide === null ? 'idle' : i < guide ? 'done' : i === guide ? 'now' : 'next'} />)}
          </ol>
        </aside>
      </div>
      <section className="db-parts" aria-labelledby="db-parts-h">
        <h2 id="db-parts-h">Meet the apparatus</h2>
        <ul>{parts.map((p, i) => <li key={p.id}>
          <button type="button" className="db-part" aria-pressed={part?.id === p.id} onClick={() => pick(p.id)}>
            <span className="db-num" aria-hidden="true">{i + 1}</span><b>{p.label}</b><span>{p.anchorLabel}</span>
          </button>
        </li>)}</ul>
        {part && <dl className="db-note-card" aria-live="polite">
          <div><dt>Part</dt><dd>{part.label}</dd></div>
          <div><dt>Mounts at</dt><dd>{part.anchorLabel}</dd></div>
          {part.requires.length > 0 && <div><dt>Mounting order (educational model)</dt><dd>Fits after {order(part)}</dd></div>}
          <div className="wide"><dt>NASA hardware description</dt><dd>{part.sourceNote}</dd></div>
        </dl>}
        <p className="db-note">A schematic training model, not a NASA engineering CAD reconstruction: duct proportions are sourced, other geometry is schematic. The bay, astronaut, arm and Earth view are illustrative.</p>
      </section>
    </main>
  </div>;
}
