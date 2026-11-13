'use client';
// Flame Lab: an AUTHORED, QUALITATIVE toy model. It shows the direction of well-known effects (buoyancy stretches and
// lifts a flame; a stronger opposed airflow leans it; more oxygen brightens and enlarges it). It computes nothing,
// predicts nothing and is never a NASA measurement. The B20 panel shows only catalog values, with unknowns as unknown.
import { useMemo, useState } from 'react';

export type B20Facts = { observation: string; citation: string; href: string; conditions: { label: string; value: string; known: boolean }[] };
type Settings = { g: number; flow: number; o2: number };
const GRAVITY: [string, number][] = [['Microgravity (orbit)', 0], ['Moon (0.17 g)', 0.17], ['Mars (0.38 g)', 0.38], ['Earth (1 g)', 1]];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Toy-model outline: pure art direction from the three settings (exported for the unit test). */
export function toyFlame({ g, flow, o2 }: Settings) {
  const size = clamp(0.75 + (o2 - 15) * 0.045, 0.6, 1.25);           // more oxygen → bigger, brighter (qualitative)
  const stretch = 1 + g * 1.6;                                          // buoyancy stretches the flame upward
  const lean = clamp(flow / 20, 0, 1) * 0.55;                           // opposed flow leans the flame downstream
  const blue = clamp(1 - g * 1.3 + (flow > 0 ? 0.05 : 0), 0, 1);       // weak buoyancy → dimmer, bluer (soot-free look)
  return { size, stretch, lean, blue, brightness: clamp(0.55 + (o2 - 15) * 0.05, 0.4, 1) };
}

export function FlameLab({ b20 }: { b20: B20Facts }) {
  const [s, setS] = useState<Settings>({ g: 1, flow: 0, o2: 21 });
  const [b20Mode, setB20Mode] = useState(false);
  const t = useMemo(() => toyFlame(s), [s]);
  const set = (k: keyof Settings, v: number) => { setB20Mode(false); setS((o) => ({ ...o, [k]: v })); };
  const rx = 46 * t.size, ry = 46 * t.size * t.stretch * 0.62;
  const hot = `rgb(${Math.round(255 - t.blue * 175)}, ${Math.round(150 + t.blue * 40)}, ${Math.round(40 + t.blue * 215)})`;
  const core = `rgb(${Math.round(255 - t.blue * 120)}, ${Math.round(210 - t.blue * 40)}, ${Math.round(120 + t.blue * 135)})`;
  return <div className="lab">
    <section className="lab-stage" aria-labelledby="lab-stage-h">
      <h2 id="lab-stage-h" className="sr-only">Illustrated flame</h2>
      <svg viewBox="0 0 400 300" role="img" aria-label={`Illustrated flame: ${s.g === 0 ? 'no' : s.g < 0.5 ? 'weak' : 'Earth-like'} buoyancy, ${s.flow} centimetres per second opposed airflow, ${s.o2}% oxygen. Authored toy model, not a measurement.`}>
        <defs>
          <radialGradient id="lab-glow" cx="50%" cy="60%" r="60%"><stop offset="0%" stopColor={core} stopOpacity={t.brightness} /><stop offset="55%" stopColor={hot} stopOpacity={t.brightness * 0.85} /><stop offset="100%" stopColor={hot} stopOpacity="0" /></radialGradient>
          <linearGradient id="lab-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#070829" /><stop offset="100%" stopColor="#12146a" /></linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#lab-bg)" />
        {s.flow > 0 && [70, 120, 170, 220].map((y) => <g key={y} className="lab-flow" opacity={0.25 + s.flow / 40}><path d={`M20 ${y} H120`} stroke="#9fc0ff" strokeWidth="2" strokeDasharray="6 8" /><path d={`M120 ${y} l-8 -5 v10 z`} fill="#9fc0ff" /></g>)}
        <rect x="80" y="196" width="150" height="8" rx="3" fill="#d9dde8" />
        <g transform={`translate(230 200) skewX(${t.lean * 35})`}>
          <ellipse className="lab-flame" cx="0" cy={-ry * 0.55} rx={rx} ry={ry} fill="url(#lab-glow)" />
          <ellipse cx="0" cy={-ry * 0.35} rx={rx * 0.45} ry={ry * 0.5} fill={core} opacity={t.brightness * 0.55} />
        </g>
        <text x="16" y="290" fill="#c9cdff" fontSize="12">Authored toy model · qualitative · not a measurement or simulation</text>
      </svg>
    </section>

    <section className="lab-controls" aria-labelledby="lab-controls-h">
      <h2 id="lab-controls-h">Change one condition at a time</h2>
      <fieldset><legend>Gravity level <span className="lab-kind" data-kind="toy">toy model</span></legend>
        <div className="lab-presets">{GRAVITY.map(([l, v]) => <button key={l} type="button" className="btn btn-sm" aria-pressed={s.g === v} onClick={() => set('g', v)}>{l}</button>)}</div>
        <label>Gravity: <b>{s.g.toFixed(2)} g</b><input type="range" min={0} max={1} step={0.01} value={s.g} onChange={(e) => set('g', Number(e.target.value))} /></label>
      </fieldset>
      <fieldset><legend>Opposed airflow <span className="lab-kind" data-kind="toy">toy model</span></legend>
        <label>Airflow: <b>{s.flow} cm/s</b><input type="range" min={0} max={20} step={1} value={s.flow} onChange={(e) => set('flow', Number(e.target.value))} /></label>
      </fieldset>
      <fieldset><legend>Oxygen <span className="lab-kind" data-kind="toy">toy model</span></legend>
        <div className="lab-presets"><button type="button" className="btn btn-sm" aria-pressed={s.o2 === 21} onClick={() => set('o2', 21)}>Earth air (21%)</button></div>
        <label>Oxygen: <b>{s.o2} vol%</b><input type="range" min={15} max={25} step={0.1} value={s.o2} onChange={(e) => set('o2', Number(e.target.value))} /></label>
      </fieldset>
      <button type="button" className="btn btn-primary" onClick={() => { setS({ g: 0, flow: 5, o2: 17.4 }); setB20Mode(true); }}>Compare with the real B20 test</button>
      <p className="lab-what" aria-live="polite">{explain(s)}</p>
    </section>

    {b20Mode && <section className="lab-b20 panel" aria-labelledby="lab-b20-h">
      <h2 id="lab-b20-h">What NASA actually recorded for BASS-II test B20</h2>
      <p className="lab-obs"><span className="lab-kind" data-kind="observed">NASA observation</span> {b20.observation}</p>
      <p className="lab-cite">Source: <a href={b20.href} target="_blank" rel="noreferrer">{b20.citation}</a></p>
      <table className="lab-table"><caption>Recorded conditions in the MicroFire catalog</caption><thead><tr><th scope="col">Condition</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>
        <tbody>{b20.conditions.map((c) => <tr key={c.label}><th scope="row">{c.label}</th><td>{c.value}</td><td><span className="lab-kind" data-kind={c.known ? 'observed' : 'unknown'}>{c.known ? 'recorded' : 'unknown'}</span></td></tr>)}</tbody></table>
      <p className="mf-fine">The sliders now sit near B20&apos;s recorded oxygen and initial airflow. Gravity is shown as microgravity because B20 ran on the International Space Station; the per-run acceleration was not reported, so it stays <b>unknown</b> in the catalog. The drawing is still the toy model, <b>not</b> B20 footage.</p>
    </section>}

    <section className="lab-legend" aria-labelledby="lab-legend-h">
      <h2 id="lab-legend-h">How to read this lab</h2>
      <ul>
        <li><span className="lab-kind" data-kind="illustration">illustration</span> The drawing is art, not footage.</li>
        <li><span className="lab-kind" data-kind="toy">toy model</span> The sliders change the drawing by authored rules that show directions of effect, never values.</li>
        <li><span className="lab-kind" data-kind="observed">NASA observation</span> Text quoted from a NASA record, with its page.</li>
        <li><span className="lab-kind" data-kind="unknown">unknown</span> Not reported for that run. MicroFire never fills these in.</li>
      </ul>
    </section>
  </div>;
}

function explain({ g, flow, o2 }: Settings) {
  const parts = [g === 0 ? 'With no buoyancy, hot gas does not rise, so the toy flame stays rounder and dimmer.' : g < 0.5 ? 'Weak buoyancy lifts hot gas only a little, so the toy flame stretches slightly.' : 'Earth-like buoyancy carries hot gas upward, so the toy flame stretches into a teardrop.'];
  if (flow > 0) parts.push(`An opposed airflow of ${flow} cm/s leans the toy flame downstream.`);
  parts.push(o2 >= 21 ? 'More oxygen makes the toy flame larger and brighter.' : 'Less oxygen makes the toy flame smaller and fainter.');
  return parts.join(' ') + ' These are directions of effect, not predictions for any real test.';
}
