'use client';
import { useState } from 'react';
import type { ProtoB20 } from '../data';
import { flowEntries, uncalibrated } from '../flow-entries';
import { BBar } from './parts';
import { PixFigure } from './pix';
import './b.css';

/** Design B research sample: B20 as an explorer's field card. Every value is from the admitted record. */
export function BB20({ b }: { b: ProtoB20 }) {
  const entries = flowEntries(b.rawFlow);
  const [entry, setEntry] = useState(0);
  const [pick, setPick] = useState<string>('oxygenPct');
  const [raw, setRaw] = useState(false);
  const e = entries[entry]!;
  const c = b.conditions.find((x) => x.key === pick)!;
  const unc = uncalibrated(b.conditions.find((x) => x.key === 'oxygenPct')?.note ?? '');
  const pixSays = c.basis === 'unknown' ? `NASA's table doesn't give this for ${b.testId}. ${c.note}` : c.basis === 'derived' ? `Worked out from the record, not read straight off it. ${c.note}` : `Straight from the table. ${c.note}`;
  return <div className="db db-page">
    <div className="db-band"><BBar current="b20" /></div>
    <main className="db-b20">
      <article className="db-card">
        <header className="db-card-head">
          <span className="db-stamp">Real NASA test</span>
          <p className="db-card-num" aria-hidden="true">{b.testId}</p>
          <div>
            <h1>{b.title}</h1>
            <p className="db-card-src">From the {b.source}. {b.where}.</p>
            {b.claimHref && <a className="db-btn db-btn-sun" href={b.claimHref} target="_blank" rel="noopener noreferrer">See the NASA page<span className="sr-only"> (opens the NASA document)</span></a>}
          </div>
        </header>
        <div className="db-quote">
          <PixFigure mood="cite" className="db-quote-pix" />
          <blockquote><p>“{b.claim}”</p><footer>What NASA wrote down for {b.testId}</footer></blockquote>
        </div>
      </article>

      <section className="db-card db-flowcard" aria-labelledby="db-flow-h">
        <h2 id="db-flow-h">How the air moved</h2>
        <p className="db-sub">In {b.testId} the air blew against the direction the flame was spreading. Tap each entry from the Air display log.</p>
        <BDuct speed={e.speed} />
        <div className="db-entries" role="radiogroup" aria-label="Air display entry">
          {entries.map((x, i) => <button key={x.raw} type="button" role="radio" aria-checked={i === entry} className="db-btn" onClick={() => setEntry(i)}>{x.raw}</button>)}
        </div>
        <p className="db-readout" aria-live="polite" data-unknown={e.speed === null}><b>{e.title}</b> {e.detail}</p>
        <p className="db-note">A drawing of opposed flow, not to scale. Arrow speed only compares the entries; no spread rate is recorded here.</p>
      </section>

      <section className="db-card" aria-labelledby="db-facts-h">
        <h2 id="db-facts-h">The conditions</h2>
        <p className="db-sub">Tap a sticker to see where it comes from. Dashed ones are things NASA didn’t record for this test.</p>
        <ul className="db-facts">{b.conditions.map((x) => <li key={x.key}>
          <button type="button" className="db-fact" data-basis={x.basis} aria-pressed={pick === x.key} onClick={() => setPick(x.key)}>
            <span className="db-fact-tab">{x.basis === 'recorded' ? 'Recorded' : x.basis === 'derived' ? 'Worked out' : 'Not recorded'}</span>
            <b>{x.value === null ? '?' : x.key === 'oxygenPct' && raw && unc ? `${unc} vol%` : x.value}</b>
            <span>{x.label}</span>
          </button>
        </li>)}</ul>
        <div className="db-explain" aria-live="polite">
          <PixFigure mood={c.basis === 'unknown' ? 'gap' : 'cite'} className="db-explain-pix" />
          <div>
            <p>{pixSays}</p>
            {c.key === 'oxygenPct' && unc && <label className="db-check"><input type="checkbox" checked={raw} onChange={(ev) => setRaw(ev.target.checked)} />Show the uncalibrated reading ({unc} vol%, not used)</label>}
            {c.href && <a className="db-link" href={c.href} target="_blank" rel="noopener noreferrer">Where this comes from: {c.where}<span className="sr-only"> (opens the NASA document)</span></a>}
          </div>
        </div>
      </section>

      <section className="db-card db-limits" aria-labelledby="db-lim-h">
        <h2 id="db-lim-h">What this test can’t tell us</h2>
        <ul>{b.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="db-note">{b.admitted} test is admitted in this catalog so far. {b.quarantined} older records wait in quarantine until they are checked.</p>
      </section>
    </main>
  </div>;
}

/** Bright illustrated duct: air in from the right, the flame front leaning back from it along the film. */
function BDuct({ speed }: { speed: number | null }) {
  const dur = speed ? 10 / speed : 0;
  return <figure className="db-duct">
    <svg viewBox="0 0 800 240" role="img" aria-label={speed === null ? 'Duct drawing: no air speed is drawn for a knob setting' : 'Duct drawing: air flows right to left, against the flame spreading right'}>
      <rect x="16" y="26" width="768" height="176" rx="26" className="tube" />
      <rect x="40" y="110" width="720" height="10" rx="5" className="film" />
      <rect x="40" y="110" width="380" height="10" rx="5" className="ash" />
      {/* the flame: a leaf lying back along the film from its leading edge (opposed flow pushes it downstream) */}
      <path d="M426 115 C 414 90, 368 80, 300 96 C 336 104, 360 110, 366 115 C 360 120, 336 126, 300 134 C 368 150, 414 140, 426 115 Z" className="fl-o" />
      <path d="M424 115 C 414 102, 392 98, 360 104 C 380 110, 388 113, 390 115 C 388 117, 380 120, 360 126 C 392 132, 414 128, 424 115 Z" className="fl-y" />
      {speed !== null && Array.from({ length: 10 }, (_, i) => <g key={i} className="gust" style={{ animationDuration: `${dur}s`, animationDelay: `${-(i * dur) / 10}s` }}>
        <path d={`M0 ${50 + (i % 5) * 34} h40`} /><path d={`M-2 ${50 + (i % 5) * 34} l12 -9 M-2 ${50 + (i % 5) * 34} l12 9`} />
      </g>)}
      {speed === null && <g className="nospeed"><rect x="440" y="40" width="320" height="148" rx="18" /><text x="600" y="122" textAnchor="middle">Not a speed</text></g>}
      <text x="760" y="20" textAnchor="end" className="lab">Air comes in here</text>
    </svg>
  </figure>;
}
