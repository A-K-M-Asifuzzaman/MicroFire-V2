// Judge Proof Mode: the whole scientific argument in six steps, computed at build time by the same deterministic engine
// the Workstation and the missions use. The lunar scenario is fictional (the values Mission 05 starts with). Nothing here
// is typed in by hand except that scenario and the step wording; the refusal is the engine's own.
import Link from 'next/link';
import { conditionLabels, PageHero, Sheet } from '../../components/page-kit';
import { fmt, proofData, QUESTION, STATUS } from '../../lib/proof';
import { ProofPlayer } from '../../components/proof-player';
import '../../components/proof.css';

export const metadata = { title: 'Judge Proof Mode', description: 'One NASA observation, its verified conditions, a fictional lunar scenario and why MicroFire refuses to call it safe.' };

export default function ProofPage() {
  const { e, source, claim, loc, transfer, refusal, asked, needs } = proofData();
  const pdf = `${source.documentUrl}#page=${loc.page}`;
  const conds = Object.entries(e.conditions);
  return <>
    <PageHero compact eyebrow="Judge Proof Mode · about 60 seconds" title="From one NASA observation to an honest refusal."
      lede="Six steps, computed by the same engine as the Workstation and the missions. The Moon scenario is fictional; the refusal is real." />
    <Sheet>
      <ProofPlayer total={6}>
        <li className="proof-step" data-step="1">
          <h2><span>01</span> What NASA observed</h2>
          <blockquote className="proof-quote"><span className="proof-kind" data-kind="observed">NASA observation</span> {claim.text}</blockquote>
          <p className="proof-cite">{source.title} · {loc.section} · PDF page {loc.page}{loc.printedPage ? ` (printed ${loc.printedPage})` : ''}. <a href={pdf} target="_blank" rel="noreferrer">Open the NASA page ↗</a></p>
        </li>
        <li className="proof-step" data-step="2">
          <h2><span>02</span> Under which conditions, verified</h2>
          <div className="proof-scroll" role="region" aria-label="B20 recorded conditions" tabIndex={0}><table className="proof-table"><caption>BASS-II test {e.testId}, as recorded in the source</caption>
            <thead><tr><th scope="col">Condition</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>
            <tbody>{conds.map(([k, c]) => <tr key={k}><th scope="row">{conditionLabels[k] ?? k}</th>
              <td>{c.status === 'known' ? fmt(c.value as string | number, 'unit' in c ? (c.unit as string) : null) : 'unknown'}</td>
              <td>{c.status === 'known' ? <span className="proof-kind" data-kind={c.basis === 'recorded' ? 'observed' : 'derived'}>{c.basis === 'recorded' ? `recorded · p. ${(c.citation.locator as { page?: number }).page}` : 'derived'}</span>
                : <span className="proof-kind" data-kind="unknown" title={c.reason}>not reported</span>}</td></tr>)}</tbody></table></div>
          <p className="proof-fine">Unknown means the source does not report it for this run. MicroFire never fills these in.</p>
        </li>
        <li className="proof-step" data-step="3">
          <h2><span>03</span> A hypothetical lunar habitat</h2>
          <p><span className="proof-kind" data-kind="fiction">Fictional scenario</span> A research team asks whether B20 tells them anything about their Moon base:</p>
          <ul className="proof-chips">{asked.map((d) => <li key={d.field}><b>{conditionLabels[d.field] ?? d.field}</b> {fmt(d.target, d.field === 'oxygenPct' ? 'vol%' : d.field === 'pressureKpa' ? 'kPa' : null)}</li>)}</ul>
          <p className="proof-fine">These are Mission 05&apos;s starting values. They are invented for practice, not NASA mission conditions.</p>
        </li>
        <li className="proof-step" data-step="4">
          <h2><span>04</span> Where the evidence and the scenario part ways</h2>
          <div className="proof-scroll" role="region" aria-label="Condition-by-condition comparison" tabIndex={0}><table className="proof-table"><caption>Condition-by-condition comparison (engine: condition-transfer-v1)</caption>
            <thead><tr><th scope="col">Condition</th><th scope="col">B20 recorded</th><th scope="col">Scenario</th><th scope="col">Result</th></tr></thead>
            <tbody>{asked.map((d) => <tr key={d.field}><th scope="row">{conditionLabels[d.field] ?? d.field}</th><td>{fmt(d.source, d.unit)}</td>
              <td>{fmt(d.target, d.field === 'oxygenPct' ? 'vol%' : d.field === 'pressureKpa' ? 'kPa' : null)}</td>
              <td><span className="proof-kind" data-kind={STATUS[d.status]?.[1] ?? 'none'}>{STATUS[d.status]?.[0] ?? d.status}</span></td></tr>)}</tbody></table></div>
          <p className="proof-verdict">Engine conclusion: <b>{transfer.conclusion === 'insufficient-evidence' ? 'insufficient evidence' : transfer.conclusion.replace(/-/g, ' ')}</b>. Matching a condition is never proof that a result transfers.</p>
        </li>
        <li className="proof-step" data-step="5">
          <h2><span>05</span> The question MicroFire refuses to answer</h2>
          <p className="proof-q">“{QUESTION}”</p>
          {refusal.abstained
            ? <div className="proof-refusal" role="note"><span className="proof-kind" data-kind="unknown">withheld · {refusal.code}</span><p>{refusal.reason}</p></div>
            : <p className="proof-refusal">The engine returned an answer; this step expects a refusal. Treat as a defect.</p>}
          <p className="proof-fine">No safe or unsafe verdict exists here, by design. The missions and the Workstation give the same refusal.</p>
        </li>
        <li className="proof-step" data-step="6">
          <h2><span>06</span> What research would actually answer it</h2>
          <ul className="proof-needs">{needs.map((n) => <li key={n.field}>Measure PMMA flame behaviour <b>{n.field === 'gravity' ? `at ${n.target} gravity` : `at ${n.target} ${n.label.toLowerCase()}`}</b>: B20 {n.status === 'source-not-recorded' ? 'did not report this condition' : 'ran at a different value'}.</li>)}</ul>
          <p>Until such tests exist and pass the same source review, the honest answer stays <b>insufficient evidence</b>.</p>
          <nav className="proof-links" aria-label="Evidence behind this proof">
            <Link className="btn btn-primary" href="/missions/play">Play it yourself: the five missions</Link>
            <Link className="btn" href={`/experiments/${e.id}`}>Open the full B20 record</Link>
            <Link className="btn" href="/dashboard">Trace your own question</Link>
            <Link className="btn" href="/gaps">Check other conditions</Link>
          </nav>
        </li>
      </ProofPlayer>
    </Sheet>
  </>;
}
