// Shared evidence vocabulary. No hooks: renders in server and client components alike.
import { featureLabels, type Citation, type Coverage, type Feature } from '@microfire/shared';

/** The client never imports the catalog; pages pass this minimal source index instead. */
export type SourceRef = { id: string; title: string; url: string; documentUrl: string };
// Mirrors @microfire/science citationUrl without bundling the catalog into the browser.
export const citationHref = (c: Citation, sources: readonly SourceRef[]) => {
  const source = sources.find((s) => s.id === c.sourceId);
  if (!source) return null;
  return c.locator.kind === 'pdf' ? `${source.documentUrl}#page=${c.locator.page}` : source.url;
};

export const kindLabels: Record<string, string> = {
  'direct-observation': 'Direct observation', 'supported-derivation': 'Supported derivation', 'scientific-interpretation': 'Scientific interpretation',
  'analogous-or-mechanistic': 'Analogous or mechanistic', 'unknown-or-gap': 'Unknown or gap',
  observed: 'Observed', derived: 'Derived', interpretation: 'Interpretation', hypothesis: 'Hypothesis', unknown: 'Unknown', unsupported: 'Support not established',
  recorded: 'Recorded', series: 'Series value'
};
export function Kind({ kind }: { kind: string }) {
  return <span className="kind" data-kind={kind}>{Object.hasOwn(kindLabels, kind) ? kindLabels[kind] : kind}</span>;
}

export function CitationChip({ citation, sources }: { citation: Citation; sources: readonly SourceRef[] }) {
  const href = citationHref(citation, sources);
  const source = sources.find((s) => s.id === citation.sourceId);
  const where = citation.locator.kind === 'pdf'
    ? `${citation.locator.section} · PDF page ${citation.locator.page} (printed ${citation.locator.printedPage})` : citation.locator.section;
  if (!href || !source) return <span className="cite">Unresolved source {citation.sourceId}</span>;
  return <a className="cite" href={href} rel="noopener noreferrer" target="_blank">
    <span><span className="mono">{source.title}</span><br />{where} <span aria-hidden="true">↗</span><span className="sr-only"> (opens the NASA document)</span></span>
  </a>;
}
/** Identical locators collapse to one chip so repeated references never flood the view. */
export function CitationList({ citations, sources }: { citations: readonly Citation[]; sources: readonly SourceRef[] }) {
  const unique = [...new Map(citations.map((c) => [JSON.stringify(c), c])).values()];
  return <div className="cite-list">{unique.map((c) => <CitationChip key={JSON.stringify(c)} citation={c} sources={sources} />)}</div>;
}

export function Limitations({ items, title = 'Limits of this evidence' }: { items: readonly string[]; title?: string }) {
  if (!items.length) return null;
  return <div className="limits"><h3>{title}</h3><ul>{[...new Set(items)].map((l) => <li key={l}>{l}</li>)}</ul></div>;
}

export function CoverageNote({ coverage }: { coverage: Coverage }) {
  return <div className="coverage" aria-label="Research coverage">
    <span><strong>{coverage.validatedExperiments}</strong> admitted experiment{coverage.validatedExperiments === 1 ? '' : 's'}</span>
    <span><strong>{coverage.validatedSources}</strong> NASA source{coverage.validatedSources === 1 ? '' : 's'}</span>
    <span><strong>{coverage.quarantinedCandidates}</strong> legacy candidates quarantined</span>
    <p>{coverage.statement} Dataset <span className="mono">{coverage.datasetVersion}</span>.</p>
  </div>;
}

/**
 * Honest release status from the shared registry; the state badge is never changed here. `built` marks an interface
 * that exists on this page: its registry reason may still say the UI is pending (a Sol-owned update is proposed), so
 * that note is shown labelled as the registry's, beneath what is actually true of this screen.
 */
export function StatusLine({ feature, built = false }: { feature: Feature; built?: boolean }) {
  return <div className="status-line">
    <span className="badge" data-state={feature.state}>{featureLabels[feature.state]}</span>
    {built ? <div className="status-text"><p>Interface implemented for review; release acceptance pending.</p>
      <details className="registry-note"><summary>Registry note</summary><p>{feature.reason} <em>(registry wording update proposed for review)</em></p></details></div>
      : <p>{feature.reason}</p>}
  </div>;
}
