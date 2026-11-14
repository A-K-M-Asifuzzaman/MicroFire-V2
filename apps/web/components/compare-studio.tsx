'use client';
// Comparison Studio: a fair-test flame comparator (toy illustration, labelled), gravity and oxygen ladders, a three-way
// comparison of NASA investigations, NASA imagery at two scales, and how close each scenario sits to the one admitted
// NASA record (BASS-II B20, deterministic engine). Toy readouts are never data; evidence comes only from the engine.
import { useMemo, useState } from 'react';
import { B20_SETTINGS, GRAVITY, evidence, regime, toyFlame, type Gravity, type Settings } from '../lib/lab-engine';
import { ENVIRONMENTS, FUEL_LABEL, PILLAR_LABEL, PLATFORM_LABEL, investigations, score, sources, type Environment } from '../lib/fire-atlas';
import type { NasaMedia } from '../lib/lab-nasa';
import { GravityStrip, MiniFlame, SweepChart } from './lab/lab-viz';
import './lab/lab.css';
import './compare-studio.css';

type Var = 'gravity' | 'o2' | 'flow' | 'pressure';
const VAR_LABEL: Record<Var, string> = { gravity: 'gravity', o2: 'oxygen', flow: 'airflow', pressure: 'pressure' };
const PRESSURES: (number | null)[] = [null, 34.5, 55, 70.3, 101.3];
const PRESETS: { id: string; label: string; a: Settings; b: Settings; why: string }[] = [
  { id: 'gravity', label: 'Only gravity changes', a: { gravity: 'earth', o2: 21, flow: 0, pressure: 101.3 }, b: { gravity: 'orbit', o2: 21, flow: 0, pressure: 101.3 }, why: 'Same air, same oxygen, no airflow: the only difference is buoyancy.' },
  { id: 'oxygen', label: 'Only oxygen changes', a: { gravity: 'orbit', o2: 17.4, flow: 5, pressure: null }, b: { gravity: 'orbit', o2: 26, flow: 5, pressure: null }, why: 'B20-like orbit and airflow; oxygen goes from 17.4 to 26 vol%.' },
  { id: 'airflow', label: 'Only airflow changes', a: { gravity: 'orbit', o2: 21, flow: 0, pressure: 101.3 }, b: { gravity: 'orbit', o2: 21, flow: 10, pressure: 101.3 }, why: 'In orbit, airflow brings the oxygen that buoyancy brings on Earth.' },
  { id: 'b20-moon', label: 'B20 vs a lunar habitat', a: B20_SETTINGS, b: { gravity: 'moon', o2: 26, flow: 0, pressure: 55 }, why: 'The question judges ask most: does the orbital record carry over to the Moon?' },
  { id: 'confounded', label: 'Everything changes (unfair)', a: { gravity: 'earth', o2: 21, flow: 0, pressure: 101.3 }, b: { gravity: 'mars', o2: 26, flow: 10, pressure: 55 }, why: 'Four things change at once, so no single cause can be named.' },
];
const changed = (a: Settings, b: Settings): Var[] => (['gravity', 'o2', 'flow', 'pressure'] as Var[]).filter((k) => a[k] !== b[k]);
const fmt = (s: Settings, k: Var) => k === 'gravity' ? GRAVITY[s.gravity].label : k === 'o2' ? `${s.o2} vol%` : k === 'flow' ? `${s.flow} cm/s` : s.pressure === null ? 'not set' : `${s.pressure} kPa`;
const ratio = (a: number, b: number) => { const r = b / a; return Math.abs(r - 1) < 0.03 ? 'about the same' : r > 1 ? `${r.toFixed(1)}× more in B` : `${(1 / r).toFixed(1)}× more in A`; };

function Scenario({ name, s, set }: { name: 'A' | 'B'; s: Settings; set: (s: Settings) => void }) {
  const t = toyFlame({ g: GRAVITY[s.gravity].g, o2: s.o2, flow: s.flow, pressure: s.pressure }), r = regime(s);
  return <section className="cs-side" data-side={name} aria-label={`Scenario ${name}`}>
    <h3>Scenario {name}</h3>
    <div className="cs-flame"><MiniFlame g={GRAVITY[s.gravity].g} o2={s.o2} flow={s.flow} pressure={s.pressure} label={`${r.label} (toy illustration)`} /></div>
    <label>Gravity<select value={s.gravity} onChange={(e) => set({ ...s, gravity: e.target.value as Gravity })}>{(Object.keys(GRAVITY) as Gravity[]).map((g) => <option key={g} value={g}>{GRAVITY[g].label}</option>)}</select></label>
    <label>Oxygen: <b>{s.o2} vol%</b><input type="range" min={15} max={30} step={0.2} value={s.o2} onChange={(e) => set({ ...s, o2: Number(e.target.value) })} /></label>
    <label>Airflow: <b>{s.flow} cm/s</b><input type="range" min={0} max={20} step={1} value={s.flow} onChange={(e) => set({ ...s, flow: Number(e.target.value) })} /></label>
    <label>Pressure<select value={String(s.pressure)} onChange={(e) => set({ ...s, pressure: e.target.value === 'null' ? null : Number(e.target.value) })}>{PRESSURES.map((p) => <option key={String(p)} value={String(p)}>{p === null ? 'Not set (B20 does not report it)' : `${p} kPa`}</option>)}</select></label>
    <p className="cs-regime"><span className="lab-kind" data-kind="toy">toy model</span> {r.note}</p>
    <p className="cs-size">Illustrated flame: height {(t.size * t.stretch).toFixed(2)}, width {t.size.toFixed(2)}, blue {Math.round(t.blue * 100)}% (relative units)</p>
  </section>;
}

export function CompareStudio({ media }: { media: NasaMedia[] }) {
  const [a, setA] = useState<Settings>(PRESETS[0]!.a), [b, setB] = useState<Settings>(PRESETS[0]!.b), [preset, setPreset] = useState('gravity');
  const diff = changed(a, b);
  const ta = toyFlame({ g: GRAVITY[a.gravity].g, o2: a.o2, flow: a.flow, pressure: a.pressure }), tb = toyFlame({ g: GRAVITY[b.gravity].g, o2: b.o2, flow: b.flow, pressure: b.pressure });
  const ea = useMemo(() => evidence(a), [a]), eb = useMemo(() => evidence(b), [b]);
  const applyPreset = (id: string) => { const p = PRESETS.find((x) => x.id === id)!; setA(p.a); setB(p.b); setPreset(id); };
  const edit = (side: 'A' | 'B') => (s: Settings) => { (side === 'A' ? setA : setB)(s); setPreset(''); };
  const [env, setEnv] = useState<Environment>('lunar'), [pick, setPick] = useState(['bass-ii', 'saffire', 'fm2']);
  const chosen = pick.map((id) => investigations.find((i) => i.id === id)!);
  const src = (k: string) => (sources as Record<string, { title: string; url: string }>)[k]!;
  const small = media.find((m) => m.slug === 'bass2-reduced-o2-gmt213') ?? media.find((m) => m.slug.startsWith('bass')), big = media.find((m) => m.slug.startsWith('saffire'));
  const toyRows: [string, number, number][] = [['Flame height', ta.size * ta.stretch, tb.size * tb.stretch], ['Flame width', ta.size, tb.size], ['Blue, soot-free look', ta.blue, tb.blue], ['Brightness', ta.brightness, tb.brightness], ['Lean into the airflow', ta.lean, tb.lean]];

  return <div className="cs">
    <section aria-labelledby="cs-fair-h">
      <h2 id="cs-fair-h">1 · Fair-test comparator: change one thing at a time</h2>
      <p className="cs-lede">Scientists compare flames by changing one condition and holding the rest. Pick a preset or move the controls; the verdict below tells you whether the comparison is fair.</p>
      <div className="cs-presets" role="group" aria-label="Comparison presets">{PRESETS.map((p) => <button key={p.id} type="button" className="btn btn-sm" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)}>{p.label}</button>)}</div>
      {preset && <p className="mf-fine">{PRESETS.find((p) => p.id === preset)!.why}</p>}
      <div className="cs-verdict" data-fair={diff.length === 1 ? 'yes' : diff.length === 0 ? 'same' : 'no'} role="status">
        {diff.length === 0 ? <><b>Identical conditions.</b> Change one control in B to make a comparison.</>
          : diff.length === 1 ? <><b>✓ Controlled comparison.</b> Only {VAR_LABEL[diff[0]!]} differs, so any difference between the two illustrated flames comes from {VAR_LABEL[diff[0]!]}.</>
          : <><b>⚠ Confounded comparison.</b> {diff.map((d) => VAR_LABEL[d]).join(', ')} all differ. You cannot say which one caused a difference. Change one at a time.</>}
      </div>
      <div className="cs-duel"><Scenario name="A" s={a} set={edit('A')} /><Scenario name="B" s={b} set={edit('B')} /></div>
      <div className="cs-scroll" role="region" aria-label="Differences between A and B" tabIndex={0}>
        <table className="cs-table"><caption>What differs between A and B</caption>
          <thead><tr><th scope="col">Condition or readout</th><th scope="col">A</th><th scope="col">B</th><th scope="col">Difference</th></tr></thead>
          <tbody>
            {(['gravity', 'o2', 'flow', 'pressure'] as Var[]).map((k) => <tr key={k} data-changed={diff.includes(k)}><th scope="row">{VAR_LABEL[k][0]!.toUpperCase() + VAR_LABEL[k].slice(1)} (setting)</th><td>{fmt(a, k)}</td><td>{fmt(b, k)}</td><td><span className="cs-tag" data-k={diff.includes(k) ? 'diff' : 'same'}>{diff.includes(k) ? 'changed' : 'held constant'}</span></td></tr>)}
            {toyRows.map(([label, x, y]) => <tr key={label}><th scope="row">{label} <span className="lab-kind" data-kind="toy">toy</span></th><td>{x.toFixed(2)}</td><td>{y.toFixed(2)}</td><td>{x === 0 && y === 0 ? 'none in either' : x === 0 ? 'only in B' : y === 0 ? 'only in A' : ratio(x, y)}</td></tr>)}
            <tr className="cs-ev"><th scope="row">Closeness to NASA record B20 <span className="lab-kind" data-kind="evidence">engine</span></th><td>{ea.matches} of {ea.rows.length} conditions match · {ea.conclusion.replace(/-/g, ' ')}</td><td>{eb.matches} of {eb.rows.length} conditions match · {eb.conclusion.replace(/-/g, ' ')}</td><td>{ea.matches === eb.matches ? 'equally close' : ea.matches > eb.matches ? 'A is closer to B20' : 'B is closer to B20'}</td></tr>
          </tbody></table>
      </div>
      <p className="mf-fine">Toy readouts are an illustration of directions of effect, not measurements or a simulation. The B20 row comes from MicroFire&apos;s deterministic evidence engine: matching conditions is never proof that a result transfers, and the engine never certifies fire safety.</p>
    </section>

    <section aria-labelledby="cs-ladder-h">
      <h2 id="cs-ladder-h">2 · Ladders: one variable across its whole range (scenario A)</h2>
      <div className="cs-two">
        <div><h3>Gravity ladder at {a.o2} vol% O₂, {a.flow} cm/s</h3><GravityStrip s={a} /><SweepChart s={a} /></div>
        <div><h3>Oxygen ladder in {GRAVITY[a.gravity].label}</h3>
          <div className="cs-oxy" role="img" aria-label={`Toy flames from 15 to 30 vol% oxygen in ${GRAVITY[a.gravity].label}: bigger and brighter with more oxygen.`}>{[15, 18, 21, 24, 27, 30].map((o) => <MiniFlame key={o} g={GRAVITY[a.gravity].g} o2={o} flow={a.flow} pressure={a.pressure} label={`${o}%`} active={Math.abs(o - a.o2) < 1.5} />)}</div>
          <p className="mf-fine"><span className="lab-kind" data-kind="toy">toy model</span> More oxygen makes the illustrated flame bigger and brighter. B20 itself burned at 17.4 vol% (calibrated), the only oxygen value MicroFire has admitted.</p></div>
      </div>
    </section>

    <section aria-labelledby="cs-inv-h">
      <h2 id="cs-inv-h">3 · Compare three NASA investigations side by side</h2>
      <div className="cs-picks">{[0, 1, 2].map((i) => <label key={i}>Investigation {i + 1}<select value={pick[i]} onChange={(e) => setPick(pick.map((p, j) => (j === i ? e.target.value : p)))}>{investigations.map((x) => <option key={x.id} value={x.id}>{x.acronym}</option>)}</select></label>)}
        <label>Crew environment<select value={env} onChange={(e) => setEnv(e.target.value as Environment)}>{(Object.keys(ENVIRONMENTS) as Environment[]).map((k) => <option key={k} value={k}>{ENVIRONMENTS[k]}</option>)}</select></label></div>
      <div className="cs-scroll" role="region" aria-label="Investigation comparison" tabIndex={0}>
        <table className="cs-table cs-inv"><thead><tr><th scope="col">Field</th>{chosen.map((c, i) => <th key={i} scope="col">{c.acronym}</th>)}</tr></thead>
          <tbody>
            {([['Name', (c) => c.name], ['Fire-safety pillar', (c) => c.pillars.map((p) => PILLAR_LABEL[p].split(' (')[0]).join(', ')], ['Fuel', (c) => FUEL_LABEL[c.fuel] ?? c.fuel], ['Where it ran', (c) => PLATFORM_LABEL[c.platform] ?? c.platform], ['Gravity', (c) => c.gravity], ['Status', (c) => c.status], ['Record checked in MicroFire', (c) => (c.admitted ? 'Yes (B20)' : 'No, NASA description only')]] as [string, (c: (typeof chosen)[number]) => string][]).map(([f, get]) => {
              const vals = chosen.map(get), same = vals.every((v) => v === vals[0]);
              return <tr key={f} data-changed={!same}><th scope="row">{f} {same && <span className="cs-tag" data-k="same">shared</span>}</th>{vals.map((v, i) => <td key={i}>{v}</td>)}</tr>;
            })}
            <tr><th scope="row">Relevance for {ENVIRONMENTS[env]} <span className="lab-kind" data-kind="evidence">explained</span></th>{chosen.map((c, i) => { const s = score(c, env); return <td key={i}><b>{s.total} points</b><ul className="cs-why">{s.reasons.map((r) => <li key={r.why}>+{r.points} {r.why}</li>)}</ul></td>; })}</tr>
            <tr><th scope="row">What NASA says</th>{chosen.map((c, i) => <td key={i} className="cs-nasa">{c.nasa} <a href={src(c.source).url} target="_blank" rel="noreferrer">source ↗</a></td>)}</tr>
          </tbody></table>
      </div>
      <p className="mf-fine">Relevance points are MicroFire&apos;s transparent interpretation of NASA&apos;s descriptions (every point listed), not NASA&apos;s ranking and not a fire-risk score. More in the <a href="/fire-safety">Fire-safety atlas</a>.</p>
    </section>

    {small && big && <section aria-labelledby="cs-scale-h">
      <h2 id="cs-scale-h">4 · Scale: a glovebox sample vs a spacecraft-sized fire (NASA imagery)</h2>
      <div className="cs-two">{[small, big].map((m) => <figure key={m.slug} className="cs-media">
        {m.kind === 'video' ? <video src={m.src} poster={m.poster ?? undefined} controls muted playsInline preload="none" width={m.width} height={m.height} /> : <img src={m.src} alt={m.title} width={m.width} height={m.height} loading="lazy" />}
        <figcaption><b>{m.title}</b> ({m.date.slice(0, 4)}) · <a href={m.page} target="_blank" rel="noreferrer">NASA page ↗</a><details><summary>NASA caption</summary><p>{m.caption}</p></details></figcaption></figure>)}</div>
      <p className="mf-fine">BASS and BASS-II burned small samples in the Microgravity Science Glovebox; Saffire burned much larger samples inside uncrewed Cygnus cargo spacecraft after they left the station. Images and captions are NASA&apos;s; MicroFire adds no measured values from them.</p>
    </section>}
  </div>;
}
