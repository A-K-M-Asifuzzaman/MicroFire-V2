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

/** Schematic of an opposed-flow film test: flow arrives from the left, the flame front creeps upstream into it. */
export function Specimen({ experiment: e }: { experiment: Experiment }) {
  const flow = known(e, 'flowCmS'), o2 = known(e, 'oxygenPct'), material = known(e, 'material'), geometry = known(e, 'geometry'), thickness = known(e, 'thicknessMm');
  return <figure className="specimen" style={{ margin: 0 }}>
    <svg viewBox="0 0 520 250" role="img" aria-label={`Schematic of ${e.testId}: ${material ?? 'sample'} film with ${e.conditions.flowDirection.status === 'known' ? e.conditions.flowDirection.value : 'unspecified'} airflow; illustration, not to scale.`}>
      <defs>
        <linearGradient id="spc-burnt" x1="0" x2="1"><stop offset="0" stopColor="#3a2a22" /><stop offset="1" stopColor="#161a20" /></linearGradient>
        <radialGradient id="spc-flame" cx="70%" cy="50%" r="70%"><stop offset="0" stopColor="#fff1d6" /><stop offset=".45" stopColor="#ffb057" /><stop offset="1" stopColor="#ff7a2a" stopOpacity="0" /></radialGradient>
        <marker id="spc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#73bbd9" /></marker>
      </defs>
      <g stroke="#73bbd9" strokeWidth="2" fill="none" markerEnd="url(#spc-arrow)" opacity=".85">
        <path className="flow-dash" d="M20 70 H150" /><path className="flow-dash" d="M20 125 H150" /><path className="flow-dash" d="M20 180 H150" />
      </g>
      <text x="20" y="52" fill="#a9b8c6" fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="1">AIRFLOW {e.conditions.flowDirection.status === 'known' ? `· ${String(e.conditions.flowDirection.value).toUpperCase()}` : ''}</text>
      <rect x="170" y="118" width="320" height="14" rx="3" fill="#c9d4dd" />
      <rect x="300" y="118" width="190" height="14" rx="3" fill="url(#spc-burnt)" />
      <g className="flame-front">
        <ellipse cx="306" cy="125" rx="34" ry="30" fill="url(#spc-flame)" />
        <path d="M300 125c14-8 26-24 22-44-8 14-16 22-26 26z" fill="#ffb057" opacity=".85" />
        <path d="M300 125c14 8 26 24 22 44-8-14-16-22-26-26z" fill="#ff8738" opacity=".6" />
      </g>
      <text x="170" y="160" fill="#a9b8c6" fontFamily="ui-monospace, monospace" fontSize="11">{material ?? 'SAMPLE'} FILM{geometry ? ` · ${geometry}` : ''}{thickness ? ` · ${thickness}` : ''}</text>
      <text x="300" y="66" textAnchor="middle" fill="#ffd2a6" fontFamily="ui-monospace, monospace" fontSize="11">← FLAME FRONT SPREADS UPSTREAM</text>
      <text x="20" y="232" fill="#6f8293" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="1">SCHEMATIC · NOT TO SCALE · NOT FOOTAGE</text>
    </svg>
    <dl className="readouts" style={{ color: 'var(--frost)' }}>
      <div style={{ background: 'rgb(4 7 12 / .6)' }}><dt>Calibrated O₂</dt><dd>{o2 ?? 'Not recorded'}</dd></div>
      <div style={{ background: 'rgb(4 7 12 / .6)' }}><dt>Initial airflow</dt><dd>{flow ?? 'Not recorded'}</dd></div>
      <div style={{ background: 'rgb(4 7 12 / .6)' }}><dt>Pressure</dt><dd data-unknown={e.conditions.pressureKpa.status === 'unknown' ? '' : undefined}>{known(e, 'pressureKpa') ?? 'Not recorded'}</dd></div>
    </dl>
  </figure>;
}

export function HeroChain() {
  return <ol className="hero-chain" aria-label="How an answer is traced">
    <li><span><b>Question</b>what you want to know</span></li>
    <li><span><b>Conditions</b>matched, different or never recorded</span></li>
    <li><span><b>Evidence</b>an admitted record, if any</span></li>
    <li><span><b>Support</b>only an exact cited claim counts</span></li>
    <li><span><b>Limitations</b>where confidence ends</span></li>
    <li><span><b>Source</b>the NASA page you can open</span></li>
  </ol>;
}

export const coverageStatuses = [
  ['covered', 'Covered', 'An admitted record matches within retrieval tolerance. Not the same as answered.'],
  ['conditions-differ', 'Conditions differ', 'Recorded, but at a different value than you asked about.'],
  ['not-recorded', 'Not recorded', 'The admitted record never measured it.'],
  ['not-in-catalog', 'Not in catalog', 'No admitted record carries this condition at all.']
] as const;
export function FrontierKey() {
  return <div className="corpus" aria-label="How coverage is classified">
    <p className="eyebrow" style={{ margin: 0 }}>Map key · classifications, not data</p>
    <ul className="coverage-key" style={{ display: 'grid', gap: 10 }}>
      {coverageStatuses.map(([s, label, text]) => <li key={s} style={{ color: 'var(--frost-dim)' }}>
        <span className="coverage-bar" style={{ display: 'inline-flex', width: 34, height: 12, margin: '0 10px -1px 0', verticalAlign: 'baseline' }}><span data-s={s} style={{ flex: 1 }} /></span>
        <b style={{ color: 'var(--frost)' }}>{label}</b> — {text}
      </li>)}
    </ul>
  </div>;
}
