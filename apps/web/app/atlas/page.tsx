import { ExperimentQuerySchema, type Experiment } from '@microfire/shared';
import { catalog, coverage, quarantineLedger, searchExperiments } from '@microfire/science';
import { Atlas, type AtlasQuery } from '../../components/atlas';
import { CorpusStrip } from '../../components/exhibits';
import { feature, PageHero, Sheet, sources, value } from '../../components/page-kit';

export const metadata = { title: 'Experiment Atlas' };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === 'string' && sp[k] ? sp[k] : undefined);
  const keys = ['q', 'program', 'material', 'flowDirection', 'gravity', 'sourceId', 'observation', 'oxygenPct', 'pressureKpa', 'flowCmS'] as const;
  const parsed = ExperimentQuerySchema.safeParse(Object.fromEntries(keys.flatMap((k) => (pick(k) ? [[k, pick(k)]] : []))));
  const query: AtlasQuery = parsed.success ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) as AtlasQuery : {};
  const items = searchExperiments(query);
  const facet = (fn: (e: Experiment) => string | null) => [...new Set(catalog.experiments.map(fn).filter((v): v is string => !!v))];
  const cov = coverage();
  const pending = quarantineLedger.records.filter((r) => r.status === 'source-cells-checked-pending-review').map((r) => r.testId);
  return <>
    <PageHero compact eyebrow="Experiment Atlas" title="A library of real flames." status={{ feature: feature('/atlas')!, built: true }}
      lede={`${cov.validatedExperiments} admitted, source-checked record. ${cov.quarantinedCandidates} legacy candidates stay excluded until checked.`} />
    <Sheet>
      <div className="atlas-layout">
        <Atlas initial={{ items, total: items.length, coverage: cov }} query={query} sources={sources}
          facets={{ program: facet((e) => e.program), material: facet((e) => value(e, 'material')), flowDirection: facet((e) => value(e, 'flowDirection')) }} />
        <aside className="atlas-rail" aria-label="Catalog coverage">
          <CorpusStrip coverage={cov} />
          <details className="excluded panel">
            <summary>Why only one record? The {cov.quarantinedCandidates} excluded legacy candidates</summary>
            <p>Legacy rows from an earlier dataset are held back until their table cells are checked against the original NASA pages. They are never searchable, answerable, comparable or exportable here.</p>
            <p className="meta">{pending.length > 0 && <>Source cells checked, awaiting independent review: {pending.join(', ')}. </>}The remaining {cov.quarantinedCandidates - pending.length} rows are quarantined. See <a href="/sources">Sources &amp; provenance</a>.</p>
          </details>
        </aside>
      </div>
    </Sheet>
  </>;
}
