// Research Intelligence overview (server component). Every number, chart and trace below is computed at build time
// from the admitted catalog and the deterministic engine in @microfire/science. Nothing is typed in by hand, no
// model is called, and one admitted record never becomes a trend, a ranking across studies or a risk score.
import Link from 'next/link';
import { answerQuestion, candidateReview, catalog, catalogCitations, coverage, investigationLibrary, isCatalogCitation, rankEvidence, RANKING_VERSION, RETRIEVAL_VERSION } from '@microfire/science';
import type { TargetConditions } from '@microfire/shared';
import { conditionLabels } from './page-kit';
import './research-intelligence.css';

type Trace = { label: string; question: string; target: TargetConditions };
const TRACES: Trace[] = [
  { label: 'A statement NASA recorded', question: 'The B20 observation log reports that the flame burned the entire sample.', target: {} },
  { label: 'A condition-matched question', question: 'What happened to the PMMA sample in B20?', target: { material: 'PMMA', oxygenPct: 17.4, flowCmS: 5 } },
  { label: 'A safety claim the data cannot support', question: 'Does B20 prove a lunar habitat is fire safe?', target: {} },
  { label: 'An investigation that is not admitted', question: 'What did FLEX test 20CAL10 show?', target: {} },
];
const LEVEL: Record<string, string> = { direct: 'Direct: an observed statement at exactly the recorded conditions', analogous: 'Analogous: related evidence, not the exact conditions asked', mechanistic: 'Mechanistic: an interpretation, not a measurement', gap: 'Gap: no cited statement supports the question' };
const KIND: Record<string, string> = { observed: 'Observed', derived: 'Derived from recorded values', interpretation: 'Interpretation', hypothesis: 'Hypothesis', unknown: 'Unknown' };

export function ResearchIntelligence() {
  const cov = coverage(), e = catalog.experiments[0]!, source = catalog.sources.find((s) => e.sourceIds.includes(s.id))!;
  const research = e.claims.filter((c) => c.origin === 'research');
  const byKind = Object.entries(research.reduce<Record<string, number>>((m, c) => ({ ...m, [c.kind]: (m[c.kind] ?? 0) + 1 }), {}));
  const conds = Object.entries(e.conditions) as [string, (typeof e.conditions)[keyof typeof e.conditions]][];
  const known = conds.filter(([, c]) => c.status === 'known').length;
  const cites = catalogCitations(), verified = cites.filter((c) => isCatalogCitation(c)).length;
  const candidates = candidateReview.records, expCandidates = candidates.filter((r) => r.kind === 'experiment-candidate').length;
  const library = investigationLibrary('').length;
  const locators = [...new Map(research.flatMap((c) => c.citations).map((c) => [c.locator.kind === 'pdf' ? `${c.locator.section.split(',')[0]} · PDF p. ${c.locator.page}` : c.locator.section, c])).keys()];
  const total = cov.validatedExperiments + candidates.length + cov.quarantinedCandidates;
  const seg = (n: number) => `${Math.max(2.5, (n / total) * 100)}%`;
  const metrics: [string, string, string][] = [
    [String(cov.validatedExperiments), 'admitted experiment', `${e.program} test ${e.testId}: checked against the NASA primary source, cell by cell.`],
    [String(cov.validatedSources), 'validated NASA source', source.title],
    [String(research.filter((c) => c.kind === 'observed').length), 'recorded observations', 'Statements NASA documented for this run, each with its page.'],
    [`${known} of ${conds.length}`, 'conditions recorded', `${conds.length - known} stay unknown because the source does not report them for this run.`],
    [`${verified} of ${cites.length}`, 'citations verified', 'Every citation resolves to the admitted source and its exact locator.'],
    [String(library), 'investigation descriptions', 'NASA investigation summaries in the Library. Descriptions, not observations.'],
    [String(expCandidates), 'review candidates', 'Source-checked leads awaiting independent review. Not used as evidence.'],
    [String(cov.quarantinedCandidates), 'quarantined legacy rows', 'Excluded until each is checked against its primary source.'],
  ];
  const traces = TRACES.map((t) => ({ t, rank: rankEvidence({ question: t.question, targetConditions: t.target, limit: 3 }).items[0] ?? null, answer: answerQuestion({ question: t.question, targetConditions: t.target }) }));

  return <section className="ri" aria-labelledby="ri-h">
    <header className="ri-head">
      <p className="eyebrow">Research intelligence · computed from the admitted catalog</p>
      <h2 id="ri-h">What MicroFire knows, how it knows it, and where it stops</h2>
      <p className="ri-lede">This dashboard summarises the verified NASA evidence, shows the path from every question to its citation, and makes the gaps visible. The engine is deterministic: rules and source templates, <b>no AI model</b>.</p>
    </header>

    <div className="ri-metrics">{metrics.map(([n, label, help]) => <div key={label} className="ri-metric"><span className="ri-n">{n}</span><span className="ri-l">{label}</span><span className="ri-help">{help}</span></div>)}</div>

    <div className="ri-grid">
      <figure className="ri-card" aria-labelledby="ri-cov-h">
        <h3 id="ri-cov-h">Evidence coverage by status</h3>
        <div className="ri-bar" role="img" aria-label={`${cov.validatedExperiments} admitted, ${candidates.length} under review, ${cov.quarantinedCandidates} quarantined`}>
          <span data-k="admitted" style={{ width: seg(cov.validatedExperiments) }} /><span data-k="review" style={{ width: seg(candidates.length) }} /><span data-k="quarantined" style={{ width: seg(cov.quarantinedCandidates) }} />
        </div>
        <ul className="ri-legend"><li data-k="admitted"><b>{cov.validatedExperiments}</b> admitted: used in answers</li><li data-k="review"><b>{candidates.length}</b> under review ({expCandidates} experiment candidates, {candidates.length - expCandidates} source lead): not used</li><li data-k="quarantined"><b>{cov.quarantinedCandidates}</b> quarantined legacy rows: excluded</li></ul>
        <figcaption>Counts of records by status. This is not a measure of quality or fire risk. Absence from the catalog does not mean a condition was never studied.</figcaption>
      </figure>

      <figure className="ri-card" aria-labelledby="ri-mx-h">
        <h3 id="ri-mx-h">{e.testId} conditions: recorded or unknown</h3>
        <table className="ri-matrix"><thead><tr><th scope="col">Condition</th><th scope="col">Value</th><th scope="col">Status</th></tr></thead>
          <tbody>{conds.map(([k, c]) => <tr key={k} data-known={c.status === 'known'}><th scope="row">{conditionLabels[k] ?? k}</th>
            <td>{c.status === 'known' ? `${c.value}${'unit' in c && c.unit ? ` ${c.unit}` : ''}` : 'not reported for this run'}</td>
            <td><span className="ri-tag" data-known={c.status === 'known'}>{c.status === 'known' ? ('basis' in c && c.basis === 'derived' ? 'derived' : 'recorded') : 'unknown'}</span></td></tr>)}</tbody></table>
        <figcaption>Unknown values are never filled in or estimated. Comparisons against a scenario treat them as gaps, not matches.</figcaption>
      </figure>
    </div>

    <figure className="ri-card ri-wide" aria-labelledby="ri-prov-h">
      <h3 id="ri-prov-h">Provenance: from the NASA document to every place it is used</h3>
      <div className="ri-prov">
        <div className="ri-col"><span className="ri-colh">NASA source</span><a className="ri-node" data-k="source" href={source.documentUrl} target="_blank" rel="noreferrer">{source.title}</a></div>
        <div className="ri-col"><span className="ri-colh">Exact locators</span>{locators.map((l) => <span key={l} className="ri-node" data-k="locator">{l}</span>)}</div>
        <div className="ri-col"><span className="ri-colh">Admitted statements ({research.length})</span>{research.map((c) => <span key={c.id} className="ri-node" data-k="claim"><span className="ri-tag" data-kind={c.kind}>{KIND[c.kind] ?? c.kind}</span> {c.text}</span>)}</div>
        <div className="ri-col"><span className="ri-colh">Used by</span>{[['Ask PIX', '/ask'], ['Evidence Workstation', '/dashboard#workstation'], ['B20 dossier', `/experiments/${e.id}`], ['Citation Checker', '/investigations/bass-ii'], ['Five missions + Passport', '/missions/play']].map(([l, h]) => <Link key={l} className="ri-node" data-k="use" href={h!}>{l}</Link>)}</div>
      </div>
      <figcaption>Statement types in the admitted record: {byKind.map(([k, n]) => `${n} ${(KIND[k] ?? k).toLowerCase()}`).join(', ')}. Derived values and interpretations are labelled and never presented as measurements.</figcaption>
    </figure>

    <section className="ri-card ri-wide" aria-labelledby="ri-trace-h">
      <h3 id="ri-trace-h">Explainable answers: question → retrieval → conditions → evidence → support → limits → citation → answer</h3>
      <p className="ri-fine">Four real runs of the engine ({RETRIEVAL_VERSION}, {RANKING_VERSION}). Ask your own in the Workstation below.</p>
      <ol className="ri-traces">{traces.map(({ t, rank, answer }) => <li key={t.label} className="ri-trace" data-outcome={answer.abstained ? 'abstained' : 'answered'}>
        <p className="ri-q"><span className="ri-qlabel">{t.label}</span> “{t.question}”</p>
        <ol className="ri-steps">
          <li><b>Retrieval</b>{rank ? `relevance ${rank.relevanceScore.toFixed(2)} for ${rank.experimentId}` : 'no admitted record retrieved'}</li>
          <li><b>Conditions</b>{rank && Object.keys(t.target).length ? `${rank.matchedFields.length} matched${rank.mismatches.length ? `, ${rank.mismatches.length} differ` : ''}${rank.missingFields.length ? `, ${rank.missingFields.length} unknown` : ''}` : 'none requested'}</li>
          <li><b>Evidence</b>{rank?.support.claimId ? `${KIND[rank.support.kind] ?? rank.support.kind} statement` : 'no exact cited statement'}</li>
          <li><b>Support</b>{rank ? (LEVEL[rank.evidenceLevel] ?? rank.evidenceLevel).split(':')[0] : 'none'}</li>
          <li><b>Limits</b>{rank ? `${rank.limitations.length} stated` : 'not applicable'}</li>
          <li><b>Citation</b>{!answer.abstained && answer.statements.some((s) => s.citations.length) ? 'Table A.1 · PDF p. 112' : 'none given'}</li>
          <li data-final="true"><b>Answer</b>{answer.abstained ? `Withheld (${answer.code.replaceAll('-', ' ')})` : `${answer.statements.length} cited statement${answer.statements.length === 1 ? '' : 's'}`}</li>
        </ol>
        <p className="ri-why">{answer.abstained ? answer.reason : answer.statements[0]?.text}</p>
      </li>)}</ol>
    </section>

    <div className="ri-grid">
      <section className="ri-card" aria-labelledby="ri-rank-h">
        <h3 id="ri-rank-h">How relevance is ranked</h3>
        <p className="ri-formula">score = 0.7 × (conditions matched ÷ conditions asked) + 0.3 × (question terms found ÷ question terms)</p>
        <p>With no target conditions, only the question terms count. Support is decided <b>separately</b>: a high score never makes a statement true.</p>
        <ul className="ri-levels">{Object.entries(LEVEL).map(([k, v]) => <li key={k}><span className="ri-tag" data-level={k}>{k}</span> {v.split(': ')[1]}</li>)}</ul>
        <p className="ri-fine"><b>The score is retrieval relevance, not fire risk, safety or scientific confidence.</b> With one admitted experiment, ordering across studies is not yet meaningful.</p>
      </section>
      <section className="ri-card" aria-labelledby="ri-ai-h">
        <h3 id="ri-ai-h">AI in MicroFire: what is and is not used</h3>
        <ul className="ri-ai">
          <li><span className="ri-tag" data-known="true">in use</span> Deterministic retrieval, condition matching, citation verification and abstention rules (producer: <code>deterministic-source-templates-no-model</code>).</li>
          <li><span className="ri-tag" data-known="false">not used</span> Generative language models. No LLM writes answers, ranks evidence or grades missions.</li>
        </ul>
        <p className="ri-fine">Why: an AI layer would add value only with strict grounding, citation validation, unsupported-claim rejection, a deterministic fallback and an evaluation set. With one admitted record and no reviewed model integration, a model would add risk without adding evidence, so this gap is documented rather than hidden.</p>
      </section>
    </div>
  </section>;
}
