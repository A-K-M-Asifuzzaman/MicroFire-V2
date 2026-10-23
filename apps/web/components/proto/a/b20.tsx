'use client';
import { useState } from 'react';
import type { ProtoB20 } from '../data';
import { flowEntries, uncalibrated } from '../flow-entries';
import { ABar } from './parts';
import './a.css';

const basisName = { recorded: 'Recorded', derived: 'Derived', unknown: 'Not recorded' } as const;

/** Design A research sample: B20 as an instrument readout. Every value is from the admitted record. */
export function AB20({ b }: { b: ProtoB20 }) {
  const entries = flowEntries(b.rawFlow);
  const [entry, setEntry] = useState(0);
  const [open, setOpen] = useState<string | null>('oxygenPct');
  const [raw, setRaw] = useState(false);
  const e = entries[entry]!;
  const o2 = b.conditions.find((c) => c.key === 'oxygenPct');
  const unc = o2 ? uncalibrated(o2.note) : null;
  return <div className="da da-page">
    <ABar current="b20" />
    <main className="da-b20">
      <header className="da-b20-head">
        <p className="da-b20-num" aria-hidden="true">{b.testId}</p>
        <div>
          <h1>{b.title}</h1>
          <p className="da-b20-src">{b.source}<br /><span>{b.where}</span></p>
          {b.claimHref && <a className="da-key da-key-quiet da-ext" href={b.claimHref} target="_blank" rel="noopener noreferrer">Open the NASA page<Ext /><span className="sr-only"> (opens the NASA document)</span></a>}
        </div>
      </header>
      <blockquote className="da-claim"><p>{b.claim}</p><footer>Documented observation, from the NASA observation log</footer></blockquote>

      <section className="da-flow" aria-labelledby="da-flow-h">
        <div className="da-flow-head">
          <h2 id="da-flow-h">Airflow, entry by entry</h2>
          <p>Opposed flow: the flame spreads into the oncoming air. Step through the Air display log as the report records it.</p>
        </div>
        <FlowDuct speed={e.speed} />
        <div className="da-flow-ctl">
          <div className="da-seg" role="radiogroup" aria-label="Air display entry">
            {entries.map((x, i) => <button key={x.raw} type="button" role="radio" aria-checked={i === entry} onClick={() => setEntry(i)}>{x.raw}</button>)}
          </div>
          <div className="da-flow-read" aria-live="polite">
            <output className="da-mono" data-unknown={e.speed === null}>{e.title}</output>
            <p>{e.detail}</p>
          </div>
        </div>
        <p className="da-fine">Illustration of opposed flow, not to scale. Particle speed is relative between entries; no spread rate is recorded here.</p>
      </section>

      <section className="da-channels" aria-labelledby="da-ch-h">
        <h2 id="da-ch-h">Conditions</h2>
        <ul>{b.conditions.map((c) => {
          const isO2 = c.key === 'oxygenPct', expanded = open === c.key;
          return <li key={c.key} data-basis={c.basis} data-open={expanded}>
            <button type="button" className="da-ch-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : c.key)}>
              <span className="da-ch-label">{c.label}</span>
              <span className="da-ch-value da-mono">{c.value === null ? 'Not recorded' : isO2 && raw && unc ? `${unc} vol%` : c.value}</span>
              <span className="da-basis"><i aria-hidden="true" />{isO2 && raw ? 'Uncalibrated reading' : basisName[c.basis]}</span>
            </button>
            {expanded && <div className="da-ch-detail">
              <p>{c.note}</p>
              {isO2 && unc && <label className="da-switch"><input type="checkbox" checked={raw} onChange={(ev) => setRaw(ev.target.checked)} /><span aria-hidden="true" />Show the adjacent uncalibrated reading ({unc} vol%, not used)</label>}
              {c.href && <a className="da-link" href={c.href} target="_blank" rel="noopener noreferrer">Source: {c.where}<Ext /><span className="sr-only"> (opens the NASA document)</span></a>}
            </div>}
          </li>;
        })}</ul>
      </section>

      <section className="da-limits" aria-labelledby="da-lim-h">
        <h2 id="da-lim-h">What this record cannot tell you</h2>
        <ul>{b.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="da-fine">{b.admitted} admitted record in this catalog. {b.quarantined} legacy records stay in quarantine and are never shown as evidence.</p>
      </section>
    </main>
  </div>;
}

function Ext() { return <svg className="da-ext-i" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 6 10M11 13H3V5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>; }

/** Side view of the duct: air enters from the right; the flame front on the film faces it. Illustrative. */
function FlowDuct({ speed }: { speed: number | null }) {
  const dur = speed ? 10 / speed : 0;
  return <figure className="da-duct" data-still={speed === null}>
    <svg viewBox="0 0 800 220" role="img" aria-label={speed === null ? 'Duct illustration: no airflow speed is drawn for a potentiometer setting' : `Duct illustration: air flows from right to left, opposed to the flame spreading right`}>
      <defs>
        <linearGradient id="da-flame" x1="0" x2="1"><stop offset="0" stopColor="#ff6a1f" stopOpacity="0" /><stop offset=".7" stopColor="#ff8a3d" /><stop offset="1" stopColor="#ffe2b8" /></linearGradient>
        <pattern id="da-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#d9a441" strokeWidth="1.5" strokeOpacity=".5" /></pattern>
      </defs>
      <rect x="20" y="30" width="760" height="160" rx="4" className="duct" />
      <line x1="40" y1="110" x2="760" y2="110" className="film" />
      <rect x="40" y="106" width="372" height="8" className="burnt" />
      <path d="M414 110 C 402 86, 360 78, 296 92 C 330 100, 352 106, 358 110 C 352 114, 330 120, 296 128 C 360 142, 402 134, 414 110 Z" fill="url(#da-flame)" />
      <circle cx="414" cy="110" r="5" className="front" />
      {speed !== null && Array.from({ length: 14 }, (_, i) => <g key={i} className="air" style={{ animationDuration: `${dur}s`, animationDelay: `${-(i * dur) / 14}s` }}>
        <line x1="0" y1={52 + (i % 7) * 20} x2="26" y2={52 + (i % 7) * 20} /><path d={`M0 ${52 + (i % 7) * 20} l7 -4 v8 z`} />
      </g>)}
      {speed === null && <rect x="420" y="34" width="356" height="152" fill="url(#da-hatch)" />}
      <text x="770" y="22" textAnchor="end" className="lab">Air in</text>
      <text x="420" y="206" className="lab">Flame front spreads toward the air</text>
    </svg>
  </figure>;
}
