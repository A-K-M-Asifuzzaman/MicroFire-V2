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
    // Tie the drawing to the evidence: highlight the matching row in the conditions table.
    const condition = items.find((i) => i.id === id)?.condition;
    document.querySelectorAll('tr[data-cond]').forEach((row) => row.setAttribute('data-highlight', String(row.getAttribute('data-cond') === condition)));
  };
  const is = (id: string) => (active === id ? 'true' : 'false');
  return <div className="apparatus">
    <figure className="apparatus-figure">
      <svg viewBox="0 0 680 310" role="img" aria-label="Schematic side view of the BASS-II flow duct with numbered parts; only the duct's outer proportions are sourced.">
        <defs>
          <marker id="app-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#73bbd9" /></marker>
          <pattern id="app-honey" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 4h8M4 0v8" stroke="#73bbd9" strokeWidth=".8" opacity=".6" /></pattern>
        </defs>
        {/* Duct: 17 cm × 7.6 cm side proportion (510 × 228 units). */}
        <g className="part" data-active={is('flow-duct')} onClick={() => select('flow-duct')}>
          <rect x="85" y="36" width="510" height="228" rx="4" fill="rgb(115 187 217 / .05)" stroke="#5d7f97" strokeWidth="2" />
        </g>
        <g stroke="#6f8293" strokeWidth="1" fill="#6f8293" fontFamily="ui-monospace, monospace" fontSize="10">
          <path d="M85 280h510M85 274v12M595 274v12" fill="none" /><text x="470" y="298" textAnchor="middle" stroke="none">17 cm · sourced</text>
          <path d="M650 36v228M644 36h12M644 264h12" fill="none" /><text x="664" y="154" stroke="none" transform="rotate(90 664 154)" textAnchor="middle">7.6 cm · sourced</text>
        </g>
        <g stroke="#73bbd9" strokeWidth="1.6" fill="none" markerEnd="url(#app-arrow)" opacity=".7">
          <path className="flow-dash" d="M140 90H240" /><path className="flow-dash" d="M140 210H240" /><path className="flow-dash" d="M490 90H580" /><path className="flow-dash" d="M490 210H580" />
        </g>
        <g className="part" data-active={is('fan')} onClick={() => select('fan')}>
          <circle cx="58" cy="150" r="26" fill="#0e1a26" stroke="#5d7f97" strokeWidth="2" />
          <path d="M58 150l14-12M58 150l-14 12M58 150l12 14M58 150l-12-14" stroke="#9fb6c8" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="part" data-active={is('flow-straightener')} onClick={() => select('flow-straightener')}>
          <rect x="104" y="48" width="22" height="204" fill="url(#app-honey)" stroke="#5d7f97" />
        </g>
        <g className="part" data-active={is('sample-holder')} onClick={() => select('sample-holder')}>
          <rect x="250" y="44" width="240" height="8" fill="#34495c" stroke="#5d7f97" />
          <path d="M268 52v92M472 52v92" stroke="#5d7f97" strokeWidth="2" />
          <rect x="262" y="144" width="216" height="10" rx="2" fill="#c9d4dd" />
          <rect x="380" y="144" width="98" height="10" rx="2" fill="#2b2420" />
          <ellipse cx="384" cy="149" rx="16" ry="20" fill="#ff8738" opacity=".75" />
        </g>
        <g className="part" data-active={is('igniter')} onClick={() => select('igniter')}>
          <path d="M470 168c4-6 8 6 12 0s8 6 12 0" stroke="#ffb057" strokeWidth="2" fill="none" /><path d="M494 168l20 40" stroke="#5d7f97" strokeWidth="2" />
        </g>
        <g className="part" data-active={is('nitrogen-nozzle')} onClick={() => select('nitrogen-nozzle')}>
          <polygon points="520,70 540,70 534,92 526,92" fill="#22344a" stroke="#5d7f97" />
        </g>
        <g className="part" data-active={is('still-camera')} onClick={() => select('still-camera')}>
          <rect x="352" y="0" width="34" height="22" rx="3" fill="#22344a" stroke="#5d7f97" /><circle cx="369" cy="24" r="6" fill="#0e1a26" stroke="#5d7f97" />
        </g>
        <g className="part" data-active={is('radiometer')} onClick={() => select('radiometer')}>
          <rect x="566" y="42" width="20" height="16" rx="2" fill="#22344a" stroke="#5d7f97" />
        </g>
        <g className="part" data-active={is('exit-plate')} onClick={() => select('exit-plate')}>
          <rect x="590" y="40" width="10" height="220" fill="none" stroke="#b07a4a" strokeWidth="2" strokeDasharray="3 4" />
        </g>
        <g className="part" data-active={is('video-camera')} onClick={() => select('video-camera')}>
          <rect x="284" y="270" width="34" height="18" rx="3" fill="#22344a" stroke="#5d7f97" />
        </g>
        {items.map((item) => { const p = spots[item.id]; return p ? <g key={item.id} className="hotspot" data-active={is(item.id)} onClick={() => select(item.id)} style={{ cursor: 'pointer' }} aria-hidden="true">
          <circle cx={p[0]} cy={p[1]} r="11" /><text x={p[0]} y={p[1] + 4} textAnchor="middle">{item.n}</text>
        </g> : null; })}
      </svg>
      <figcaption>Schematic · only the duct&apos;s 7.6 × 17 cm side proportion is sourced (Section 1.2, PDF p. 12). Part placement is illustrative, not a NASA drawing.</figcaption>
    </figure>
    <div className="apparatus-panel">
      <ol className="part-list" aria-label="Apparatus parts and run conditions">
        {items.map((item) => <li key={item.id}><button type="button" aria-pressed={active === item.id} onClick={() => select(item.id)}>
          <span className="num" aria-hidden="true">{item.n}</span><span>{item.label}</span><span className="basis" data-basis={item.basis}>{item.basis}</span>
        </button></li>)}
      </ol>
      {current && <div className="part-detail" aria-live="polite" data-testid="apparatus-detail">
        <h3>{current.label}</h3>
        <p><span className="basis" data-basis={current.basis}>{basisText[current.basis]}</span></p>
        <p>{current.note}</p>
        {current.citation && <CitationChip citation={current.citation} sources={sources} />}
      </div>}
    </div>
  </div>;
}
