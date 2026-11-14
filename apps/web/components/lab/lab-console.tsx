'use client';
// Flame Lab console: set conditions, predict, run a BASS-II-style sequence on the illustrated chamber, then check the
// run against the real B20 record with the deterministic evidence engine. Runs are kept in a notebook on this device.
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { B20_SETTINGS, DEFAULTS, evidence, GRAVITY, PROTOCOL, regime, shapeOf, SHAPES, toCsv, toyFlame, type Gravity, type Phase, type Run, type Settings, type Shape } from '../../lib/lab-engine';
import type { B20Facts } from '../../lib/lab-nasa';
import { LabChamber } from './lab-chamber';
import { EvidenceMatrix, Gauge, GravityStrip, ProtocolRail, SweepChart } from './lab-viz';

const KEY = 'microfire-lab-notebook-v1';
const PRESETS: [string, Settings][] = [['Earth air', DEFAULTS], ['Fictional Moon habitat (Mission 05)', { gravity: 'moon', o2: 26, flow: 0, pressure: 55 }], ['Still air in orbit', { gravity: 'orbit', o2: 21, flow: 0, pressure: 101.3 }]];

export function LabConsole({ b20 }: { b20: B20Facts }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [phase, setPhase] = useState<Phase>('configure');
  const [prediction, setPrediction] = useState<Shape | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [b20Open, setB20Open] = useState(false);
  const [clock, setClock] = useState(0);
  const timers = useRef<number[]>([]);
  const running = phase !== 'configure' && phase !== 'record';
  const ev = useMemo(() => evidence(s), [s]);
  const reg = regime(s), toy = toyFlame({ g: GRAVITY[s.gravity].g, flow: s.flow, o2: s.o2, pressure: s.pressure });

  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setRuns(JSON.parse(raw) as Run[]); } catch { /* storage blocked */ } }, []); // eslint-disable-line react-hooks/set-state-in-effect -- read once from this device
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const save = (next: Run[]) => { setRuns(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ } };

  const change = (patch: Partial<Settings>) => { if (running) return; setS((o) => ({ ...o, ...patch })); setPhase('configure'); setB20Open(false); };
  const run = () => {
    timers.current.forEach(clearTimeout); timers.current = []; setClock(0);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = PROTOCOL.slice(1);
    // Each phase starts after the previous one's duration (all at once under reduced motion).
    let at = 0;
    for (const p of steps) { const start = reduce ? 0 : at; timers.current.push(window.setTimeout(() => setPhase(p.id), start)); at += p.ms; }
    const observeStart = steps.slice(0, steps.findIndex((p) => p.id === 'observe')).reduce((a, p) => a + p.ms, 0);
    if (!reduce) for (let k = 0; k <= 38; k++) timers.current.push(window.setTimeout(() => setClock(k / 10), observeStart + k * 100));
    timers.current.push(window.setTimeout(() => {
      if (reduce) setClock(3.8);
      const n = (runs.at(-1)?.n ?? 0) + 1;
      save([...runs, { n, at: new Date().toISOString().slice(0, 19).replace('T', ' '), settings: s, prediction, toy: shapeOf(s), regime: regime(s).label, conclusion: ev.conclusion.replace(/-/g, ' '), matches: ev.matches, asked: ev.rows.length }].slice(-50));
    }, reduce ? 0 : at));
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(runs)], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'microfire-flame-lab-notebook.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const say = PROTOCOL.find((p) => p.id === phase)!.say;
  const toyShape = shapeOf(s), done = phase === 'record';

  return <div className="lab2">
    <ProtocolRail phase={phase} />
    <p className="lab2-say" aria-live="polite"><b>{PROTOCOL.find((p) => p.id === phase)!.label}:</b> {say}</p>
    <div className="lab2-grid">
      <section className="lab2-stage" aria-labelledby="lab2-stage-h">
        <h2 id="lab2-stage-h" className="sr-only">Experiment chamber</h2>
        <LabChamber s={s} phase={phase} />
        <div className="lab2-gauges" aria-label="Instruments">
          <Gauge label="Gravity" value={GRAVITY[s.gravity].g} unit="g" min={0} max={1} />
          <Gauge label="Oxygen" value={s.o2} unit="vol%" min={15} max={30} />
          <Gauge label="Opposed airflow" value={s.flow} unit="cm/s" min={0} max={20} />
          <Gauge label="Pressure" value={s.pressure} unit="kPa" min={30} max={110} />
          <Gauge label="Burn clock" value={phase === 'observe' || done ? clock : 0} unit="s" min={0} max={3.8} tone="clock" display={`${(phase === 'observe' || done ? clock : 0).toFixed(1)} s`} />
          <Gauge label="Flame height index" value={+(toy.size * toy.stretch).toFixed(2)} unit="" min={0} max={3.5} tone="toy" />
        </div>
      </section>

      <section className="lab2-rack" aria-labelledby="lab2-rack-h">
        <h2 id="lab2-rack-h">1 · Set the conditions</h2>
        <fieldset disabled={running}><legend>Gravity <span className="lab-kind" data-kind="toy">toy model</span></legend>
          <div className="lab2-seg">{(Object.keys(GRAVITY) as Gravity[]).map((k) => <button key={k} type="button" className="btn btn-sm" aria-pressed={s.gravity === k} onClick={() => change({ gravity: k })}>{GRAVITY[k].label}</button>)}</div>
        </fieldset>
        <fieldset disabled={running}><legend>Atmosphere and flow</legend>
          <label>Oxygen: <b>{s.o2} vol%</b><input type="range" min={15} max={30} step={0.1} value={s.o2} onChange={(e) => change({ o2: Number(e.target.value) })} /></label>
          <label>Opposed airflow: <b>{s.flow} cm/s</b><input type="range" min={0} max={20} step={1} value={s.flow} onChange={(e) => change({ flow: Number(e.target.value) })} /></label>
          <label className="lab2-check"><input type="checkbox" checked={s.pressure !== null} onChange={(e) => change({ pressure: e.target.checked ? 101.3 : null })} /> Set a pressure</label>
          {s.pressure !== null && <label>Pressure: <b>{s.pressure} kPa</b><input type="range" min={30} max={110} step={0.1} value={s.pressure} onChange={(e) => change({ pressure: Number(e.target.value) })} /></label>}
        </fieldset>
        <div className="lab2-presets" role="group" aria-label="Presets">{PRESETS.map(([l, v]) => <button key={l} type="button" className="btn btn-sm btn-quiet" disabled={running} onClick={() => change(v)}>{l}</button>)}</div>

        <h2>2 · Predict before you run</h2>
        <fieldset disabled={running} className="lab2-predict"><legend>What will the illustrated flame look like?</legend>
          {SHAPES.map(([id, l]) => <label key={id}><input type="radio" name="lab2-pred" checked={prediction === id} onChange={() => setPrediction(id)} /> {l}</label>)}
        </fieldset>

        <h2>3 · Run it</h2>
        <div className="lab2-run">
          <button type="button" className="btn btn-primary" onClick={run} disabled={running}>{running ? 'Running…' : done ? 'Run again' : 'Run experiment'}</button>
          <button type="button" className="btn" disabled={running} onClick={() => { change(B20_SETTINGS); setB20Open(true); }}>Compare with the real B20 test</button>
        </div>
      </section>
    </div>

    {done && <section className="lab2-result panel" aria-labelledby="lab2-res-h">
      <h2 id="lab2-res-h">4 · What happened, and what the record says</h2>
      <div className="lab2-cols">
        <div>
          <p className="lab2-k"><span className="lab-kind" data-kind="toy">toy illustration</span> {reg.label}. {reg.note}</p>
          {prediction ? <p className="lab2-verdict" data-ok={prediction === toyShape}>{prediction === toyShape ? 'Your prediction matches the toy illustration.' : `You predicted “${SHAPES.find(([id]) => id === prediction)![1]}”; the toy illustration shows “${SHAPES.find(([id]) => id === toyShape)![1]}”.`} Matching the toy model is practice, not evidence.</p>
            : <p className="lab2-verdict">No prediction this time. Choose one before the next run to test your intuition.</p>}
        </div>
        <div>
          <EvidenceMatrix rows={ev.rows} />
          <p className="lab2-k">Engine conclusion: <b>{ev.conclusion === 'insufficient-evidence' ? 'insufficient evidence' : ev.conclusion.replace(/-/g, ' ')}</b>. {ev.matches} of {ev.rows.length} conditions equal B20&apos;s recorded values; matching a condition is never proof that a result transfers.</p>
          {ev.safety.abstained && <p className="lab2-refuse"><span className="lab-kind" data-kind="unknown">withheld · {ev.safety.code}</span> {ev.safety.reason}</p>}
        </div>
      </div>
    </section>}

    {b20Open && <section className="lab-b20 panel" aria-labelledby="lab-b20-h">
      <h2 id="lab-b20-h">What NASA actually recorded for BASS-II test B20</h2>
      <p className="lab-obs"><span className="lab-kind" data-kind="observed">NASA observation</span> {b20.observation}</p>
      <p className="lab-cite">Source: <a href={b20.href} target="_blank" rel="noreferrer">{b20.citation}</a></p>
      <div className="lab-scroll" role="region" aria-label="B20 recorded conditions" tabIndex={0}><table className="lab-table"><caption>Recorded conditions in the MicroFire catalog</caption><thead><tr><th scope="col">Condition</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>
        <tbody>{b20.conditions.map((c) => <tr key={c.label}><th scope="row">{c.label}</th><td>{c.value}</td><td><span className="lab-kind" data-kind={c.known ? 'observed' : 'unknown'}>{c.known ? 'recorded' : 'unknown'}</span></td></tr>)}</tbody></table></div>
      <p className="mf-fine">The controls now sit at B20&apos;s recorded oxygen and initial airflow. Gravity is set to microgravity because B20 ran on the International Space Station; the per-run acceleration and the pressure were not reported, so they stay <b>unknown</b>. Press “Run experiment” to watch the toy illustration at these settings; it is still not B20 footage.</p>
    </section>}

    <div className="lab2-viz">
      <section aria-labelledby="lab2-g-h"><h2 id="lab2-g-h">Same oxygen and airflow, four gravity levels</h2><GravityStrip s={s} /><p className="mf-fine"><span className="lab-kind" data-kind="toy">toy model</span> Taller with more buoyancy; rounder, smaller and bluer with less.</p></section>
      <section aria-labelledby="lab2-c-h"><h2 id="lab2-c-h">Direction of effect</h2><SweepChart s={s} /></section>
    </div>

    <section className="lab2-notebook" aria-labelledby="lab2-nb-h">
      <h2 id="lab2-nb-h">Lab notebook <span className="meta">({runs.length} run{runs.length === 1 ? '' : 's'}, kept on this device)</span></h2>
      {runs.length === 0 ? <p className="mf-fine">Your runs appear here with your prediction, the toy illustration and the comparison with B20.</p>
        : <div className="lab-scroll" role="region" aria-label="Notebook runs" tabIndex={0}><table className="lab-table"><thead><tr><th scope="col">#</th><th scope="col">Gravity</th><th scope="col">O₂</th><th scope="col">Airflow</th><th scope="col">Pressure</th><th scope="col">Prediction</th><th scope="col">Toy illustration</th><th scope="col">B20 comparison</th></tr></thead>
          <tbody>{[...runs].reverse().map((r) => <tr key={r.n}><td>{r.n}</td><td>{GRAVITY[r.settings.gravity].label}</td><td>{r.settings.o2} vol%</td><td>{r.settings.flow} cm/s</td><td>{r.settings.pressure === null ? 'not set' : `${r.settings.pressure} kPa`}</td>
            <td>{r.prediction ? SHAPES.find(([id]) => id === r.prediction)![1] : '—'}</td><td>{SHAPES.find(([id]) => id === r.toy)![1]}</td><td>{r.conclusion} · {r.matches}/{r.asked} match</td></tr>)}</tbody></table></div>}
      <div className="actions"><button type="button" className="btn btn-sm" disabled={!runs.length} onClick={download}>Download notebook (CSV)</button><button type="button" className="btn btn-sm btn-quiet" disabled={!runs.length || running} onClick={() => save([])}>Clear notebook</button><Link className="btn btn-sm btn-quiet" href="/proof">See the 60-second proof</Link></div>
    </section>
  </div>;
}
