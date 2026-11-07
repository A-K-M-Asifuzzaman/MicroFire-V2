// Server-safe exhibit graphics (no hooks, no client JS). Values shown come from the catalog; drawings are schematic.
import type { Coverage, Experiment } from '@microfire/shared';

/** One cell per legacy row plus the admitted record: an honest picture of how small the admitted corpus is. */
export function CorpusStrip({ coverage }: { coverage: Coverage }) {
  const total = coverage.validatedExperiments + coverage.quarantinedCandidates;
  return <figure className="corpus" style={{ margin: 0 }} aria-label={`Corpus: ${coverage.validatedExperiments} admitted experiment and ${coverage.quarantinedCandidates} quarantined legacy candidates`}>
    <div className="corpus-cells" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} data-admitted={i < coverage.validatedExperiments ? '' : undefined} />)}
    </div>
    <figcaption className="corpus-legend">
      <span><b>{coverage.validatedExperiments}</b> admitted · source-checked</span>
      <span><b>{coverage.quarantinedCandidates}</b> legacy candidates · quarantined, never searchable</span>
    </figcaption>
  </figure>;
}

const known = (e: Experiment, k: keyof Experiment['conditions']) => {
  const c = e.conditions[k];
  return c.status === 'known' ? `${c.value}${'unit' in c ? ` ${c.unit}` : ''}` : null;
};

/** Schematic of an opposed-flow film test (Design B illustration): air arrives from the left, the flame front creeps upstream into it. */
export function Specimen({ experiment: e }: { experiment: Experiment }) {
  const flow = known(e, 'flowCmS'), o2 = known(e, 'oxygenPct'), material = known(e, 'material'), geometry = known(e, 'geometry'), thickness = known(e, 'thicknessMm');
  const dir = e.conditions.flowDirection.status === 'known' ? String(e.conditions.flowDirection.value) : null;
  return <figure className="specimen" style={{ margin: 0 }}>
    <svg viewBox="0 0 520 250" role="img" aria-label={`Schematic of ${e.testId}: ${material ?? 'sample'} film with ${dir ?? 'unspecified'} airflow; illustration, not to scale.`}>
      <defs><marker id="spc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 10 5 0 10z" fill="#2a2bd6" /></marker></defs>
      <rect x="8" y="28" width="504" height="186" rx="30" fill="#dfe5ff" stroke="#15153d" strokeWidth="4" />
      <g stroke="#2a2bd6" strokeWidth="5" strokeLinecap="round" fill="none" markerEnd="url(#spc-arrow)">
        <path className="flow-dash" d="M30 72 H118" /><path className="flow-dash" d="M30 168 H118" /><path className="flow-dash" d="M60 120 H140" />
      </g>
      <text x="30" y="56" fill="#15153d" fontFamily="var(--f-atkinson), sans-serif" fontWeight="700" fontSize="15">Airflow{dir ? ` · ${dir}` : ''}</text>
      <rect x="170" y="114" width="320" height="16" rx="5" fill="#fff" stroke="#15153d" strokeWidth="3" />
      <rect className="char" x="306" y="114" width="184" height="16" rx="5" fill="#4a4a7a" stroke="#15153d" strokeWidth="3" />
      <g className="smoke" fill="#8f92c4">{[0, 1.2, 2.4, 3.6].map((d) => <circle key={d} cx="334" cy="106" r="7" style={{ animationDelay: `${d}s` }} />)}</g>
      <g className="flame-front" transform="translate(306 122) scale(.68) translate(-306 -122)">
        <path className="lick lick-a" d="M306 122 c-34 -4 -58 -20 -64 -44 c18 12 34 14 52 10 c-6 -14 -2 -28 10 -36 c2 22 14 34 20 50 c6 10 0 18 -18 20z" fill="#ffb020" stroke="#15153d" strokeWidth="3.5" strokeLinejoin="round" />
        <path className="lick lick-b" d="M306 122 c-34 4 -58 20 -64 44 c18 -12 34 -14 52 -10 c-6 14 -2 28 10 36 c2 -22 14 -34 20 -50 c6 -10 0 -18 -18 -20z" fill="#ffb020" stroke="#15153d" strokeWidth="3.5" strokeLinejoin="round" />
        <ellipse cx="292" cy="122" rx="16" ry="9" fill="#ff5a5f" />
      </g>
      <text x="170" y="196" fill="#15153d" fontFamily="var(--f-atkinson), sans-serif" fontWeight="700" fontSize="14">{material ?? 'Sample'} film{geometry ? ` · ${geometry}` : ''}{thickness ? ` · ${thickness}` : ''}</text>
      <text x="300" y="60" textAnchor="middle" fill="#15153d" fontFamily="var(--f-bricolage), sans-serif" fontWeight="800" fontSize="15">← Flame front spreads upstream</text>
      <text x="20" y="242" fill="#4a4a7a" fontFamily="var(--f-atkinson), sans-serif" fontSize="12">Schematic · not to scale · not footage</text>
    </svg>
    <dl className="readouts">
      <div data-cond="oxygenPct"><dt>Calibrated O₂</dt><dd>{o2 ?? 'Not recorded'}</dd></div>
      <div data-cond="flowCmS"><dt>Initial airflow</dt><dd>{flow ?? 'Not recorded'}</dd></div>
      <div data-cond="pressureKpa"><dt>Pressure</dt><dd data-unknown={e.conditions.pressureKpa.status === 'unknown' ? '' : undefined}>{known(e, 'pressureKpa') ?? 'Not recorded'}</dd></div>
    </dl>
  </figure>;
}

export const coverageStatuses = [
  ['covered', 'Covered', 'An admitted record matches within retrieval tolerance. Not the same as answered.'],
  ['conditions-differ', 'Conditions differ', 'Recorded, but at a different value than you asked about.'],
  ['not-recorded', 'Not recorded', 'No value is documented for this field in the admitted record.'],
  ['not-in-catalog', 'Not in catalog', 'No admitted record carries this condition at all.']
] as const;
export function FrontierKey() {
  return <div className="corpus" aria-label="How coverage is classified">
    <p className="eyebrow" style={{ margin: 0 }}>Map key · classifications, not data</p>
    <ul className="coverage-key" style={{ display: 'grid', gap: 10 }}>
      {coverageStatuses.map(([s, label, text]) => <li key={s}>
        <span className="coverage-bar" style={{ display: 'inline-flex', width: 34, height: 12, margin: '0 10px -1px 0', verticalAlign: 'baseline' }}><span data-s={s} style={{ flex: 1 }} /></span>
        <b>{label}</b> — {text}
      </li>)}
    </ul>
  </div>;
}
