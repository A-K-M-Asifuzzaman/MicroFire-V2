'use client';
import { useState } from 'react';
import type { Citation } from '@microfire/shared';
import { CitationChip, type SourceRef } from './evidence-ui';

export type ApparatusItem = {
  id: string; n: string; label: string; note: string;
  /** sourced: hardware described in the report; recorded/unknown: a run condition from the record. */
  basis: 'sourced' | 'recorded' | 'unknown';
  citation: Citation | null; condition?: string;
};
const basisText = { sourced: 'Described in the source', recorded: 'Recorded for this run', unknown: 'Not recorded' };
const basisWhy = {
  sourced: 'Hardware described in the report\'s apparatus section. Its position in this drawing is schematic, not a NASA drawing.',
  recorded: 'A run condition recorded for this test, with the exact table cell it comes from.',
  unknown: 'Not recorded in this source. No value is shown or estimated.'
};

// Schematic positions only. The duct outline uses the sourced 7.6 × 17 cm side proportion; nothing inside is to scale.
const spots: Record<string, [number, number]> = {
  'flow-duct': [95, 36], fan: [46, 150], 'flow-straightener': [122, 110], 'sample-holder': [300, 64], igniter: [478, 170],
  'nitrogen-nozzle': [530, 96], 'still-camera': [368, 14], 'video-camera': [300, 290], radiometer: [582, 52], 'exit-plate': [612, 150],
  oxygenPct: [190, 222], flowCmS: [200, 150], pressureKpa: [420, 222], gravity: [520, 222]
};

export function Apparatus({ items, sources }: { items: ApparatusItem[]; sources: SourceRef[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const current = items.find((i) => i.id === active);
  const select = (id: string) => {
    setActive(id);
    // Tie the drawing to the evidence: highlight the matching table row and readout (brief pulse via CSS).
    const condition = items.find((i) => i.id === id)?.condition;
    document.querySelectorAll('[data-cond]').forEach((el) => el.setAttribute('data-highlight', String(el.getAttribute('data-cond') === condition)));
  };
  const is = (id: string) => (active === id ? 'true' : 'false');
  return <div className="apparatus">
    <figure className="apparatus-figure">
      <svg viewBox="0 0 680 310" role="img" aria-label="Schematic side view of the BASS-II flow duct with numbered parts; only the duct's outer proportions are sourced.">
        <defs>
          <marker id="app-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#2ee6a6" /></marker>
          <pattern id="app-honey" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 4h8M4 0v8" stroke="#2ee6a6" strokeWidth=".8" opacity=".6" /></pattern>
        </defs>
        {/* Duct: 17 cm × 7.6 cm side proportion (510 × 228 units). */}
        <g className="part" data-active={is('flow-duct')} onClick={() => select('flow-duct')}>
          <rect x="85" y="36" width="510" height="228" rx="4" fill="rgb(201 205 255 / .07)" stroke="#c9cdff" strokeWidth="2" />
        </g>
        <g stroke="#c9cdff" strokeWidth="1" fill="#c9cdff" fontFamily="var(--f-atkinson), sans-serif" fontSize="10">
          <path d="M85 280h510M85 274v12M595 274v12" fill="none" /><text x="470" y="298" textAnchor="middle" stroke="none">17 cm · sourced</text>
          <path d="M650 36v228M644 36h12M644 264h12" fill="none" /><text x="664" y="154" stroke="none" transform="rotate(90 664 154)" textAnchor="middle">7.6 cm · sourced</text>
        </g>
        <g stroke="#2ee6a6" strokeWidth="1.6" fill="none" markerEnd="url(#app-arrow)" opacity=".7">
          <path className="flow-dash" d="M140 90H240" /><path className="flow-dash" d="M140 210H240" /><path className="flow-dash" d="M490 90H580" /><path className="flow-dash" d="M490 210H580" />
        </g>
        <g className="part" data-active={is('fan')} onClick={() => select('fan')}>
          <circle cx="58" cy="150" r="26" fill="#1b1c9e" stroke="#c9cdff" strokeWidth="2" />
          <path d="M58 150l14-12M58 150l-14 12M58 150l12 14M58 150l-12-14" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="part" data-active={is('flow-straightener')} onClick={() => select('flow-straightener')}>
          <rect x="104" y="48" width="22" height="204" fill="url(#app-honey)" stroke="#c9cdff" />
        </g>
        <g className="part" data-active={is('sample-holder')} onClick={() => select('sample-holder')}>
          <rect x="250" y="44" width="240" height="8" fill="#2a2bd6" stroke="#c9cdff" />
          <path d="M268 52v92M472 52v92" stroke="#c9cdff" strokeWidth="2" />
          <rect x="262" y="144" width="216" height="10" rx="2" fill="#ffffff" />
          <rect x="380" y="144" width="98" height="10" rx="2" fill="#4a4a7a" />
          <ellipse cx="384" cy="149" rx="16" ry="20" fill="#ffb020" opacity=".75" />
        </g>
        <g className="part" data-active={is('igniter')} onClick={() => select('igniter')}>
          <path d="M470 168c4-6 8 6 12 0s8 6 12 0" stroke="#ff5a5f" strokeWidth="2" fill="none" /><path d="M494 168l20 40" stroke="#c9cdff" strokeWidth="2" />
        </g>
        <g className="part" data-active={is('nitrogen-nozzle')} onClick={() => select('nitrogen-nozzle')}>
          <polygon points="520,70 540,70 534,92 526,92" fill="#2a2bd6" stroke="#c9cdff" />
        </g>
        <g className="part" data-active={is('still-camera')} onClick={() => select('still-camera')}>
          <rect x="352" y="0" width="34" height="22" rx="3" fill="#2a2bd6" stroke="#c9cdff" /><circle cx="369" cy="24" r="6" fill="#1b1c9e" stroke="#c9cdff" />
        </g>
        <g className="part" data-active={is('radiometer')} onClick={() => select('radiometer')}>
          <rect x="566" y="42" width="20" height="16" rx="2" fill="#2a2bd6" stroke="#c9cdff" />
        </g>
        <g className="part" data-active={is('exit-plate')} onClick={() => select('exit-plate')}>
          <rect x="590" y="40" width="10" height="220" fill="none" stroke="#ffb020" strokeWidth="2" strokeDasharray="3 4" />
        </g>
        <g className="part" data-active={is('video-camera')} onClick={() => select('video-camera')}>
          <rect x="284" y="270" width="34" height="18" rx="3" fill="#2a2bd6" stroke="#c9cdff" />
        </g>
        {items.map((item) => { const p = spots[item.id]; return p ? <g key={item.id} className="hotspot" data-active={is(item.id)} onClick={() => select(item.id)} style={{ cursor: 'pointer' }} aria-hidden="true">
          <circle cx={p[0]} cy={p[1]} r="11" /><text x={p[0]} y={p[1] + 4} textAnchor="middle">{item.n}</text>
        </g> : null; })}
      </svg>
      <figcaption>Schematic · only the duct&apos;s 7.6 × 17 cm side proportion is sourced (Section 1.2, PDF p. 12). Part placement is illustrative, not a NASA drawing.</figcaption>
    </figure>
    <div className="apparatus-inspector">
      {current && <div className="part-detail" aria-live="polite" data-testid="apparatus-detail" data-basis={current.basis}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Selected · {current.n}</p>
        <h3>{current.label}</h3>
        <p><span className="basis" data-basis={current.basis}>{basisText[current.basis]}</span></p>
        <p className="why">{basisWhy[current.basis]}</p>
        <p>{current.note}</p>
        {current.citation ? <CitationChip citation={current.citation} sources={sources} /> : <p className="meta">No source citation: this source does not record it.</p>}
        {current.condition && <p className="meta" style={{ marginTop: 10 }}><a href={`#cond-${current.condition}`}>Show in the conditions table ↓</a></p>}
      </div>}
      <ol className="part-list" aria-label="Apparatus parts and run conditions">
        {([['Hardware', items.filter((i) => !i.condition)], ['Run conditions', items.filter((i) => i.condition)]] as const).map(([group, list]) => <li key={group} className="part-group">
          <p className="part-group-label">{group}</p>
          <ul>{list.map((item) => <li key={item.id}><button type="button" aria-pressed={active === item.id} onClick={() => select(item.id)}>
            <span className="num" aria-hidden="true">{item.n}</span><span>{item.label}</span><span className="basis" data-basis={item.basis}>{item.basis}</span>
          </button></li>)}</ul>
        </li>)}
      </ol>
    </div>
  </div>;
}
