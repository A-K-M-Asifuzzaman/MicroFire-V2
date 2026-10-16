'use client';
import type { PartId, Snapshot } from '../contract';
import { isBusy } from '../controller';
import { allowsCore, install, orientationLabels, remove, rig, type RigPart } from '../view-model';
import { anchorLabel, partLabel, useGame } from './context';

// Schematic placement of the ten named mounts (viewBox 1000×560). Only the duct's 17 : 7.6 proportion is sourced;
// every other position is a schematic training layout.
export const ANCHORS: Record<string, [number, number]> = {
  'msg-work-volume-mount': [500, 472], 'duct-inlet': [205, 266], 'duct-honeycomb-slot': [300, 266], 'test-section-n2-port': [430, 383],
  'top-mounting-rail': [500, 150], 'front-window-igniter-lever': [578, 334], 'top-window': [640, 86], 'front-window-mirror': [702, 472],
  'downstream-top-back-corner': [728, 182], 'duct-exit': [795, 266]
};
const W = 1000, H = 560, DUCT = { x: 240, y: 150, w: 520, h: 520 * 7.6 / 17 };

/** Pending install target from the in-flight request, shown as a ghost until the server answers. */
function pendingInstall(link: ReturnType<typeof useGame>['s']['link']) {
  if (link.status !== 'awaiting' && link.status !== 'paced' && link.status !== 'submitting') return null;
  const p = link.pending;
  if (p.endpoint !== 'action' || p.request.action.type !== 'GAME' || p.request.action.action.type !== 'INSTALL_PART') return null;
  return p.request.action.action;
}

function Glyph({ part, at, faulty }: { part: RigPart; at: [number, number]; faulty: boolean }) {
  const [x, y] = at, rev = part.installed?.orientation === 'reversed', d = rev ? -1 : 1;
  const stroke = faulty ? 'var(--m2-amber)' : 'var(--m2-metal)';
  switch (part.spec.id) {
    case 'flow-duct': return null; // drawn as the duct body
    case 'fan': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <rect x={-22} y={-58} width={44} height={116} rx={10} fill="var(--m2-panel)" stroke={stroke} strokeWidth={3} />
      {[-30, 0, 30].map((o) => <ellipse key={o} cx={0} cy={o} rx={7} ry={14} fill="var(--m2-metal-2)" transform={`rotate(${25 * d} 0 ${o})`} />)}
      <path d={`M${-14 * d} 0 H${44 * d}`} stroke={faulty ? 'var(--m2-amber)' : 'var(--m2-cyan)'} strokeWidth={5} markerEnd={`url(#m2-arrow${faulty ? '-amber' : ''})`} />
    </g>;
    case 'flow-straightener': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <rect x={-12} y={-100} width={24} height={200} rx={4} fill="url(#m2-hex)" stroke={stroke} strokeWidth={2} />
    </g>;
    case 'nitrogen-nozzle': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <path d={`M-14 18 L14 18 L6 ${-26 * (rev ? -1 : 1)} L-6 ${-26 * (rev ? -1 : 1)} Z`} fill="var(--m2-metal-2)" stroke={stroke} strokeWidth={2} />
    </g>;
    case 'sample-holder': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <rect x={-110} y={-8} width={220} height={12} rx={4} fill="var(--m2-metal)" />
      <rect x={-4} y={4} width={8} height={104} fill="var(--m2-sample)" stroke={stroke} strokeWidth={1.5} />
      <path d={`M${18 * d} 60 L${-26 * d} 60`} stroke={faulty ? 'var(--m2-amber)' : 'var(--m2-cyan)'} strokeWidth={3} markerEnd={`url(#m2-arrow${faulty ? '-amber' : ''})`} />
    </g>;
    case 'igniter': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <path d="M0 40 L-30 -24" stroke="var(--m2-metal)" strokeWidth={6} strokeLinecap="round" />
      <path d="M-34 -28 q6 -8 12 0 q6 8 12 0" stroke="var(--m2-flame)" strokeWidth={3} fill="none" />
    </g>;
    case 'still-camera': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <path d={rev ? 'M0 -26 L-40 -110 L40 -110 Z' : 'M0 26 L-46 110 L46 110 Z'} className="m2-cone" data-faulty={faulty} />
      <rect x={-26} y={-20} width={52} height={36} rx={6} fill="var(--m2-panel)" stroke={stroke} strokeWidth={3} />
      <rect x={-10} y={rev ? -34 : 14} width={20} height={16} rx={4} fill="var(--m2-metal-2)" />
    </g>;
    case 'video-camera': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <path d={rev ? 'M24 10 L120 60 L120 -30 Z' : 'M-18 -18 L-110 -120 L-40 -140 Z'} className="m2-cone" data-faulty={faulty} />
      <rect x={-30} y={-18} width={60} height={34} rx={6} fill="var(--m2-panel)" stroke={stroke} strokeWidth={3} />
      <path d="M-70 -78 l26 -26" stroke="var(--m2-cyan)" strokeWidth={4} opacity={0.6} />
    </g>;
    case 'radiometer': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <path d={rev ? 'M14 0 L90 -30 L90 30 Z' : 'M-14 0 L-120 -40 L-120 40 Z'} className="m2-cone" data-faulty={faulty} />
      <rect x={-14} y={-12} width={28} height={24} rx={8} fill="var(--m2-panel)" stroke={stroke} strokeWidth={3} />
    </g>;
    case 'exit-plate': return <g transform={`translate(${x} ${y})`} className="m2-glyph">
      <rect x={-10} y={-110} width={20} height={220} rx={3} fill="url(#m2-perf)" stroke={stroke} strokeWidth={2} />
    </g>;
  }
}

/** Accessible 2D apparatus: SVG art plus real buttons for every mount. Complete gameplay never needs WebGL. */
export function Schematic({ s }: { s: Snapshot }) {
  const { s: st, data, selection, select } = useGame();
  const parts = rig(s, data.parts);
  const duct = parts.find((p) => p.spec.id === 'flow-duct')!;
  const fan = parts.find((p) => p.spec.id === 'fan')!;
  const ghost = pendingInstall(st.link);
  const selectedPart = parts.find((p) => p.spec.id === selection.partId);
  const choosing = !!selectedPart && !selectedPart.installed;
  const flowDir = fan.installed ? (fan.installed.orientation === 'correct' ? 1 : -1) : 0;
  return <figure className="m2-schematic" aria-labelledby="m2-schem-cap">
    <div className="m2-schematic-art">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic side view of the training apparatus: duct, mounts and fitted parts">
        <defs>
          <marker id="m2-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--m2-cyan)" /></marker>
          <marker id="m2-arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--m2-amber)" /></marker>
          <pattern id="m2-hex" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M3 0h6l3 5-3 5H3L0 5z" fill="none" stroke="var(--m2-metal)" strokeWidth="1" /></pattern>
          <pattern id="m2-perf" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#b9733f" /><circle cx="4" cy="4" r="2" fill="#09111b" /></pattern>
          <linearGradient id="m2-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fd8ef" stopOpacity=".18" /><stop offset="1" stopColor="#9fd8ef" stopOpacity=".05" /></linearGradient>
        </defs>
        <rect x={40} y={34} width={920} height={492} rx={22} className="m2-glovebox" />
        <text x={64} y={64} className="m2-svg-label">Glovebox work volume · schematic</text>
        <rect x={DUCT.x} y={DUCT.y} width={DUCT.w} height={DUCT.h} rx={10} className="m2-duct" data-installed={!!duct.installed} />
        {duct.installed && <>
          <rect x={520} y={190} width={150} height={150} rx={8} className="m2-window" />
          <text x={64} y={88} className="m2-svg-label">Flow duct · 7.6 × 7.6 × 17 cm (sourced proportions)</text>
        </>}
        {!duct.installed && <text x={500} y={270} textAnchor="middle" className="m2-svg-label">Fit the flow duct first</text>}
        {flowDir !== 0 && <g className="m2-flow" data-dir={flowDir} aria-hidden="true">
          {[340, 410, 480, 550, 620, 690].map((x) => <path key={x} d={flowDir > 0 ? `M${x} 248 l16 18 l-16 18` : `M${x + 16} 248 l-16 18 l16 18`} />)}
          <text x={936} y={64} textAnchor="end" className="m2-svg-label">Chevrons: schematic direction · not a measured flow</text>
        </g>}
        {parts.map((p) => p.installed && <Glyph key={p.spec.id} part={p} at={ANCHORS[p.installed.anchorId] ?? [500, 280]} faulty={p.authoredFault || p.findings.length > 0} />)}
        {ghost && ANCHORS[ghost.anchorId] && <circle cx={ANCHORS[ghost.anchorId]![0]} cy={ANCHORS[ghost.anchorId]![1]} r={34} className="m2-ghost" />}
      </svg>
      {Object.entries(ANCHORS).map(([anchorId, [x, y]]) => {
        const occupant = parts.find((p) => p.installed?.anchorId === anchorId);
        const flagged = occupant && (occupant.authoredFault || occupant.findings.length > 0);
        const pending = parts.some((p) => p.pendingRepair && p.spec.anchorId === anchorId);
        const target = choosing && selection.anchorId === anchorId;
        const name = anchorLabel(data, anchorId);
        return <button key={anchorId} type="button" className="m2-hotspot" style={{ left: `${x / W * 100}%`, top: `${y / H * 100}%` }}
          data-occupied={!!occupant} data-flagged={!!flagged} data-pending={pending} data-target={target} data-choosing={choosing}
          aria-pressed={choosing ? target : undefined}
          aria-label={`${name}: ${occupant ? `${occupant.spec.label} fitted, ${orientationLabels[occupant.installed!.orientation].toLowerCase()}` : pending ? 'empty, repair pending' : 'empty mount'}${choosing ? `. Choose as the mount for ${selectedPart!.spec.label}` : ''}`}
          onClick={() => (choosing ? select({ anchorId }) : occupant ? select({ partId: occupant.spec.id, anchorId: null }) : undefined)}>
          <span className="m2-hotspot-label">{name}</span>
        </button>;
      })}
    </div>
    <figcaption id="m2-schem-cap" className="m2-fine">Schematic training model — not a NASA engineering CAD reconstruction. Mount positions and mounting order are educational; only the duct proportions come from the NASA report.</figcaption>
  </figure>;
}

/** Parts tray: every part is a button; status text never relies on colour. */
export function PartsTray({ s }: { s: Snapshot }) {
  const { data, selection, select } = useGame();
  return <div className="m2-tray" role="group" aria-label="Parts tray">
    {rig(s, data.parts).map((p) => {
      const status = p.installed ? (p.authoredFault || p.findings.length ? 'Fitted · flagged' : 'Fitted') : p.pendingRepair ? 'Removed for repair' : 'Not fitted';
      return <button key={p.spec.id} type="button" className="m2-part" aria-pressed={selection.partId === p.spec.id}
        data-state={p.installed ? 'fitted' : p.pendingRepair ? 'pending' : 'loose'} data-flagged={p.authoredFault || p.findings.length > 0}
        onClick={() => select({ partId: selection.partId === p.spec.id ? null : p.spec.id, anchorId: null, orientation: 'correct' })}>
        <span className="m2-part-name">{p.spec.label}</span><span className="m2-part-state">{status}</span>
      </button>;
    })}
  </div>;
}

/** Select part → mount → orientation → Install (or Remove). The intent is sent; the result is the server's. */
export function PlacementPanel({ s }: { s: Snapshot }) {
  const { c, s: st, data, selection, select } = useGame();
  const part = rig(s, data.parts).find((p) => p.spec.id === selection.partId);
  const ready = st.link.status === 'confirmed';
  const last = st.event?.action?.type === 'GAME' && (st.event.action.action.type === 'INSTALL_PART' || st.event.action.action.type === 'REMOVE_PART') ? st.event : null;
  const lastFor = (id: PartId) => last && last.action?.type === 'GAME' && 'partId' in last.action.action && last.action.action.partId === id;
  if (!part) return <div className="m2-panel-hint"><p className="m2-fine">Choose a part from the tray, or a fitted part on the schematic, to see its source note and controls.</p>
    {last && <PlacementFeedback event={last} />}</div>;
  const requires = part.spec.requires.map((r) => partLabel(data, r));
  return <section className="m2-placement" aria-labelledby="m2-place-h" data-sheet="true">
    <div className="m2-placement-head">
      <h3 id="m2-place-h" className="m2-h3">{part.spec.label}</h3>
      <button type="button" className="m2-close" onClick={() => select({ partId: null, anchorId: null })} aria-label="Close part details">×</button>
    </div>
    <p className="m2-source-note"><span className="m2-tag">NASA hardware description</span> {part.spec.sourceNote}</p>
    {requires.length > 0 && <p className="m2-fine">Mounting order (educational model): fits after {requires.join(', ')}.</p>}
    {part.installed ? <>
      <p>Fitted at <b>{anchorLabel(data, part.installed.anchorId)}</b> · {orientationLabels[part.installed.orientation]}.</p>
      {part.authoredFault && <p className="m2-flag">Authored training fault — not a NASA incident.</p>}
      <button className="btn btn-quiet" disabled={!ready || !allowsCore(s, 'REMOVE_PART') || isBusy(st.link)}
        onClick={() => void c.send(remove(part.spec.id), `Remove ${part.spec.label}`)}>Remove {part.spec.label.toLowerCase()}</button>
    </> : <>
      <fieldset className="m2-choices">
        <legend>Mount</legend>
        <div className="m2-mounts">{data.parts.map((p) => <label key={p.anchorId}>
          <input type="radio" name="m2-mount" value={p.anchorId} checked={selection.anchorId === p.anchorId} onChange={() => select({ anchorId: p.anchorId })} />{p.anchorLabel}
        </label>)}</div>
      </fieldset>
      <fieldset className="m2-choices m2-orient">
        <legend>Orientation</legend>
        {(['correct', 'reversed'] as const).map((o) => <label key={o}>
          <input type="radio" name="m2-orient" value={o} checked={selection.orientation === o} onChange={() => select({ orientation: o })} />
          <span aria-hidden="true" className="m2-orient-glyph" data-o={o}>➜</span>{orientationLabels[o]}
        </label>)}
      </fieldset>
      <button className="btn btn-primary" disabled={!ready || !selection.anchorId || !allowsCore(s, 'INSTALL_PART') || isBusy(st.link)}
        onClick={() => selection.anchorId && void c.send(install(part.spec.id, selection.anchorId, selection.orientation), `Install ${part.spec.label} at ${anchorLabel(data, selection.anchorId)}`)}>
        Install {part.spec.label.toLowerCase()}
      </button>
      {!allowsCore(s, 'INSTALL_PART') && <p className="m2-fine">Installing is not part of the current step.</p>}
    </>}
    {lastFor(part.spec.id) && last && <PlacementFeedback event={last} />}
  </section>;
}

function PlacementFeedback({ event }: { event: NonNullable<ReturnType<typeof useGame>['s']['event']> }) {
  return <p className="m2-feedback" data-kind={event.kind} role={event.kind === 'refused' ? 'alert' : 'status'}>
    {event.kind === 'refused' ? <><b>Not accepted.</b> {event.message}</> : <><b>Confirmed by the server:</b> {event.label}.</>}
  </p>;
}
