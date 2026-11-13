'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { GravityLens, type LensRecord } from './gravity-lens';
import './flame-lab.css';

type Setting = 'micro' | 'lunar' | 'earth';
type Material = 'pmma' | 'cotton' | 'other';
type Answer = 'yes' | 'no' | 'unknown';
const PRESETS: { id: Setting; g: number; label: string }[] = [
  { id: 'micro', g: 0, label: 'Near 0 g' },
  { id: 'lunar', g: 0.16, label: 'Lunar 0.16 g' },
  { id: 'earth', g: 1, label: 'Earth 1 g' }
];
const MATERIALS: Record<Material,string> = { pmma: 'PMMA film', cotton: 'Cotton', other: 'Other or unspecified' };
const fmt = (v: number) => v.toFixed(1);

export function FlameLab({ record, oxygenB20, observation, source }: {
  record: LensRecord; oxygenB20: number | null; observation: string; source: string;
}) {
  const [gravity, setGravity] = useState(0);
  const [seen, setSeen] = useState<string[]>(['micro']);
  const [oxygen, setOxygen] = useState(oxygenB20 ?? 17.4);
  const [oxygenChanged, setOxygenChanged] = useState(false);
  const [material, setMaterial] = useState<Material>('pmma');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [exported, setExported] = useState(false);

  const updateGravity = useCallback((v: number) => {
    setGravity(v);
    setSeen(old => {
      const next = v < 0.02 ? 'micro' : v > 0.98 ? 'earth' : Math.abs(v - 0.16) < 0.02 ? 'lunar' : null;
      return next && !old.includes(next) ? [...old, next] : old;
    });
  }, []);
  const pick = (s: Setting) => updateGravity(PRESETS.find(x => x.id === s)!.g);
  const preset = PRESETS.find(x => Math.abs(gravity - x.g) < 0.01);
  const matchOxygen = oxygenB20 !== null && Math.abs(oxygen - oxygenB20) < .001;
  const tasks = [
    { label: 'Compare the near-zero and Earth gravity illustrations', done: seen.includes('micro') && seen.includes('earth') },
    { label: 'Change oxygen and inspect how the matching condition changes', done: oxygenChanged },
    { label: 'Reject a lunar-habitat certification unsupported by B20', done: revealed && answer === 'no' }
  ];
  const comparisons = [
    { name: 'Gravity', user: `${(gravity).toFixed(2)} g (illustrative scenario)`, nasa: 'Exact acceleration of B20 not established', kind: 'unknown', status: 'Unknown' },
    { name: 'Calibrated oxygen', user: `${fmt(oxygen)} vol% (hypothetical)`, nasa: oxygenB20 === null ? 'Not verified' : `${fmt(oxygenB20)} vol% (calibrated)`, kind: matchOxygen ? 'match' : oxygenB20 === null ? 'unknown' : 'diff', status: matchOxygen ? 'One condition matches' : oxygenB20 === null ? 'Unknown' : 'Different' },
    { name: 'Sample material', user: MATERIALS[material], nasa: 'PMMA film, 100 µm thick, 2 cm wide', kind: material === 'pmma' ? 'match' : 'diff', status: material === 'pmma' ? 'Material matches' : 'Different material' },
    { name: 'Pressure', user: 'Not measured by this tool', nasa: 'Unknown in admitted B20 record', kind: 'unknown', status: 'Unknown' }
  ];
  const exportNotes = () => {
    const data = { type: 'microfire-educational-flame-lab-notes', version: 1, createdAt: new Date().toISOString(),
      hypothetical: { gravityEarthG: gravity, oxygenVolPercent: oxygen, material: MATERIALS[material] },
      nasa: { experiment: 'BASS-II B20', calibratedOxygenVolPercent: oxygenB20, observation, citation: source },
      comparison: comparisons, learningTasks: tasks, learnerAnswer: answer,
      limits: 'No combustion model, AI prediction, lunar transfer claim or safety certification is performed.' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'microfire-flame-lab-notes.json'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };
  return <div className="flab" data-testid="flame-lab">
    <p className="flab-disclosure"><strong>INTERACTIVE EDUCATIONAL LAB</strong> · NASA B20 is real research; the gravity picture and any user-chosen conditions are illustrations, not a numerical simulation, prediction or NASA-approved safety assessment.</p>
    <div className="flab-grid">
      <section className="flab-card" aria-labelledby="flab-gravity-title">
        <p className="eyebrow">01 · Visual investigation</p><h2 id="flab-gravity-title">See the physics</h2>
        <GravityLens record={record} gravity={gravity} onGravityChange={updateGravity} />
        <p className="flab-note">The same gravity setting drives the picture and the condition table below. Oxygen and material only affect the evidence comparison—not the animated flame.</p>
      </section>
      <section className="flab-card" aria-labelledby="flab-console-title">
        <p className="eyebrow">02 · Change a condition</p><h2 id="flab-console-title">Scenario controls</h2>
        <p>Explore a hypothetical condition. The table compares your settings with NASA's single admitted B20 record. Even exact matches are <strong>not evidence of another outcome</strong>.</p>
        <fieldset className="flab-group"><legend>Gravity environment (illustrative)</legend>
          <div className="flab-preset">{PRESETS.map(p => <button type="button" key={p.id} aria-pressed={preset?.id === p.id} onClick={() => pick(p.id)}>{p.label}</button>)}</div>
          <p className="flab-note" aria-live="polite">{preset?.id === 'lunar' ? 'This is hypothetical lunar gravity, not a tested B20 gravity condition.' : preset?.id === 'earth' ? 'Buoyancy illustration, not a prediction of B20 on Earth.' : preset?.id === 'micro' ? 'Near-zero-gravity still-air illustration; B20 was an opposed-flow investigation.' : 'Interpolated illustration. No intermediate combustion run is claimed.'}</p>
        </fieldset>
        <label htmlFor="flab-o2">Scenario oxygen <strong>{fmt(oxygen)} vol%</strong></label>
        <input id="flab-o2" type="range" min="10" max="30" step="0.1" value={oxygen} onChange={e => { setOxygen(Number(e.target.value)); setOxygenChanged(true); setExported(false); }} />
        <p className="flab-axis">10% <span>30%</span></p>
        <label htmlFor="flab-fuel">Scenario material</label>
        <select id="flab-fuel" value={material} onChange={e => { setMaterial(e.target.value as Material); setExported(false); }}>
          {(Object.keys(MATERIALS) as Material[]).map(m => <option key={m} value={m}>{MATERIALS[m]}</option>)}
        </select>
        <div className="flab-actions"><button type="button" className="btn btn-quiet btn-sm" onClick={() => { updateGravity(0); setOxygen(oxygenB20 ?? 17.4); setMaterial('pmma'); setExported(false); }}>Reset settings</button>
          <Link className="btn btn-primary btn-sm" href={record.href}>Open cited B20 dossier</Link></div>
      </section>
    </div>
    <section className="flab-card" aria-labelledby="flab-evidence-title">
      <header className="flab-section-head"><div><p className="eyebrow">03 · Evidence workbench</p><h2 id="flab-evidence-title">Compare, don't assume</h2></div><span className="flab-chip">1 admitted experimental record · no predictive ML</span></header>
      <div className="flab-table-scroll"><table className="flab-table"><caption>Conditions for retrieval and reasoning only. Not predicted flame behavior or fire risk.</caption><thead><tr><th scope="col">Dimension</th><th scope="col">Your scenario</th><th scope="col">NASA B20</th><th scope="col">Assessment</th></tr></thead>
        <tbody>{comparisons.map(x => <tr key={x.name}><th scope="row">{x.name}</th><td>{x.user}</td><td>{x.nasa}</td><td><span className="flab-kind" data-kind={x.kind}>{x.status}</span></td></tr>)}</tbody></table></div>
      <aside className="flab-observed"><p className="eyebrow">NASA DOCUMENTED OBSERVATION</p><p>“{observation}”</p><small>{source}. This one observation does not establish causation or a result for the chosen scenario.</small></aside>
    </section>
    <section className="flab-card" aria-labelledby="flab-guide-title">
      <header className="flab-section-head"><div><p className="eyebrow">04 · Guided learning</p><h2 id="flab-guide-title">Three steps to good scientific reasoning</h2></div><span className="flab-chip" aria-live="polite">{tasks.filter(t => t.done).length} / 3 completed</span></header>
      <ol className="flab-steps">{tasks.map((t, i) => <li key={t.label} data-done={t.done}><span aria-hidden="true">{t.done ? '✓' : i + 1}</span>{t.label}</li>)}</ol>
      <fieldset className="flab-group"><legend>Can NASA's B20 record certify that a fictional lunar habitat is fire-safe?</legend>
        <div className="flab-options">{([['yes','Yes, proven safe'],['no','No, insufficient evidence'],['unknown','NASA measured lunar conditions']] as const).map(([v,text]) => <label key={v}><input type="radio" name="flab-answer" checked={answer === v} onChange={() => { setAnswer(v); setRevealed(false); }} />{text}</label>)}</div>
        <button type="button" className="btn btn-primary btn-sm" disabled={!answer} onClick={() => setRevealed(true)}>Check reasoning</button>
        {revealed && <div role="status" className="flab-feedback" data-correct={answer === 'no'}><b>{answer === 'no' ? 'Correct: evidence is insufficient.' : 'This conclusion is not supported.'}</b><p>B20 documents a PMMA experiment, not a lunar habitat. Unknown conditions and differences prevent direct transfer or certification. A citation is not a safety guarantee.</p></div>}
      </fieldset>
      <div className="flab-actions"><button type="button" className="btn btn-primary" onClick={exportNotes}>Export lab notes (JSON)</button><Link className="btn btn-quiet" href="/missions/guide">Learn how to play the five missions</Link><Link className="btn btn-quiet" href="/missions/play">Play missions</Link></div>
      {exported && <p role="status">Lab notes exported locally. They are not the five-mission Research Passport.</p>}
    </section>
    <section className="flab-next" aria-labelledby="flab-intel-title"><div><h2 id="flab-intel-title">Where is the AI/ML research?</h2>
      <p>MicroFire currently uses deterministic source-grounded search, condition matching, ranking, citation validation and abstention. <strong>No trained AI or ML model is deployed</strong> and this lab is not CFD. These research tools show how evidence is handled, without manufacturing confidence.</p></div>
      <nav aria-label="Scientific research tools"><Link href="/dashboard">Evidence Workstation</Link><Link href="/ask">Ask PIX</Link><Link href="/atlas">Experiment Atlas</Link><Link href="/methodology">Methodology</Link></nav></section>
  </div>;
}
