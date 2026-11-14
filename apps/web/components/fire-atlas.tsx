'use client';
// Fire-Safety Investigation Atlas: choose a crew environment, see NASA combustion investigations ranked for it with
// every point explained, compare any two, and see coverage across the fire-safety pillars.
import { useMemo, useState } from 'react';
import { compare, ENVIRONMENTS, facilities, FUEL_LABEL, history, investigations, PILLAR_LABEL, PLATFORM_LABEL, rank, sources, spinoffs, type Environment, type Pillar } from '../lib/fire-atlas';
import './fire-atlas.css';

const PILLARS: Pillar[] = ['prevention', 'detection', 'suppression', 'fundamental'];
const src = (k: string) => (sources as Record<string, { title: string; url: string }>)[k]!;

export function FireAtlas() {
  const [env, setEnv] = useState<Environment>('lunar');
  const ranked = useMemo(() => rank(env), [env]);
  const max = ranked[0]!.total;
  const [a, setA] = useState('bass-ii'), [b, setB] = useState('flex');
  const A = investigations.find((i) => i.id === a)!, B = investigations.find((i) => i.id === b)!;
  const rows = compare(A, B);
  const counts = PILLARS.map((p) => ({ p, n: investigations.filter((i) => i.pillars.includes(p)).length }));
  return <div className="fa">
    <section className="fa-stats" aria-label="Atlas at a glance">
      <div><b>{investigations.length}</b><span>NASA combustion investigations</span></div>
      {counts.map(({ p, n }) => <div key={p} data-p={p}><b>{n}</b><span>{PILLAR_LABEL[p]}</span></div>)}
      <div><b>{facilities.length}</b><span>ISS facilities</span></div>
      <div><b>1</b><span>record checked cell by cell (BASS-II B20)</span></div>
    </section>

    <section className="fa-rank" aria-labelledby="fa-rank-h">
      <h2 id="fa-rank-h">Which investigations matter most for your crew environment?</h2>
      <div className="fa-env" role="group" aria-label="Crew environment">{(Object.keys(ENVIRONMENTS) as Environment[]).map((k) => <button key={k} type="button" className="btn btn-sm" aria-pressed={env === k} onClick={() => setEnv(k)}>{ENVIRONMENTS[k]}</button>)}</div>
      <p className="mf-fine">Ranking is MicroFire&apos;s transparent interpretation of NASA&apos;s descriptions: every point is listed. It is not NASA&apos;s ranking and not a fire-risk score.</p>
      <ol className="fa-list">
        {ranked.map(({ inv, total, reasons }, i) => <li key={inv.id}>
          <div className="fa-row">
            <span className="fa-pos">{i + 1}</span>
            <div className="fa-main">
              <p className="fa-name"><b>{inv.acronym}</b> {inv.name}{inv.admitted ? <span className="fa-tag" data-k="admitted">verified record</span> : <span className="fa-tag">NASA description</span>}<span className="fa-tag" data-k={inv.status}>{inv.status}</span></p>
              <div className="fa-bar" aria-hidden="true"><span style={{ width: `${(total / max) * 100}%` }} /></div>
              <p className="fa-nasa">{inv.nasa}</p>
              <details><summary>Why {total} points</summary><ul>{reasons.map((r) => <li key={r.why}><b>+{r.points}</b> {r.why}</li>)}</ul></details>
              <p className="mf-fine">{inv.pillars.map((p) => PILLAR_LABEL[p]).join(' · ')} · {FUEL_LABEL[inv.fuel]} · {PLATFORM_LABEL[inv.platform]} · <a href={src(inv.source).url} target="_blank" rel="noreferrer">source ↗</a></p>
            </div>
            <span className="fa-score" aria-label={`${total} relevance points`}>{total}</span>
          </div>
        </li>)}
      </ol>
    </section>

    <section className="fa-matrix-wrap" aria-labelledby="fa-mx-h">
      <h2 id="fa-mx-h">Coverage: which investigation informs which part of fire safety</h2>
      <div className="fa-scroll" role="region" aria-label="Coverage matrix" tabIndex={0}>
        <table className="fa-matrix"><thead><tr><th scope="col">Investigation</th>{PILLARS.map((p) => <th key={p} scope="col">{PILLAR_LABEL[p].split(' (')[0]}</th>)}<th scope="col">Fuel</th></tr></thead>
          <tbody>{investigations.map((i) => <tr key={i.id}><th scope="row">{i.acronym}</th>{PILLARS.map((p) => <td key={p} data-on={i.pillars.includes(p)}>{i.pillars.includes(p) ? <span aria-label="yes">●</span> : <span aria-label="no">·</span>}</td>)}<td>{FUEL_LABEL[i.fuel]}</td></tr>)}</tbody></table>
      </div>
      <p className="mf-fine">Gap made visible: only FM2 has run in partial gravity, so lunar and Martian habitats rest mostly on orbital and ground data.</p>
    </section>

    <section className="fa-compare" aria-labelledby="fa-cmp-h">
      <h2 id="fa-cmp-h">Compare two investigations</h2>
      <div className="fa-pick">
        <label>First<select value={a} onChange={(e) => setA(e.target.value)}>{investigations.map((i) => <option key={i.id} value={i.id}>{i.acronym}</option>)}</select></label>
        <label>Second<select value={b} onChange={(e) => setB(e.target.value)}>{investigations.map((i) => <option key={i.id} value={i.id}>{i.acronym}</option>)}</select></label>
      </div>
      <div className="fa-scroll" role="region" aria-label="Comparison" tabIndex={0}>
        <table className="fa-cmp"><thead><tr><th scope="col">Field</th><th scope="col">{A.acronym}</th><th scope="col">{B.acronym}</th><th scope="col">Same?</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.field}><th scope="row">{r.field}</th><td>{r.a}</td><td>{r.b}</td><td><span className="fa-tag" data-k={r.same ? 'same' : 'diff'}>{r.same ? 'same' : 'different'}</span></td></tr>)}</tbody></table>
      </div>
    </section>

    <div className="fa-two">
      <section aria-labelledby="fa-fac-h"><h2 id="fa-fac-h">Where the fires burn on the ISS</h2>
        <ul className="fa-cards">{facilities.map((f) => <li key={f.name}><b>{f.name}</b><p>{f.nasa}</p><a className="mf-fine" href={src(f.source).url} target="_blank" rel="noreferrer">source ↗</a></li>)}</ul></section>
      <section aria-labelledby="fa-hist-h"><h2 id="fa-hist-h">Why it matters: fire in crewed spaceflight</h2>
        <ol className="fa-time">{history.map((h) => <li key={h.title}><span>{h.year}</span><div><b>{h.title}</b><p>{h.what} <a href={h.url} target="_blank" rel="noreferrer">NASA ↗</a></p></div></li>)}</ol></section>
    </div>

    <section aria-labelledby="fa-earth-h"><h2 id="fa-earth-h">Back on Earth: fire safety from space research</h2>
      <ul className="fa-cards fa-earth">{spinoffs.map((s) => <li key={s.title}><b>{s.title}</b><p>{s.what}</p><a className="mf-fine" href={s.url} target="_blank" rel="noreferrer">NASA Spinoff ↗</a></li>)}</ul></section>

    <section className="fa-sources" aria-labelledby="fa-src-h"><h2 id="fa-src-h">Sources</h2>
      <ul>{Object.values(sources as Record<string, { title: string; url: string }>).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul>
      <p className="mf-fine">Descriptions summarise NASA&apos;s own pages. They say what each investigation studied, not what it measured; MicroFire admits measured values only after checking them against the NASA report, as it did for BASS-II B20.</p></section>
  </div>;
}
