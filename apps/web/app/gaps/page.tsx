import { catalog, coverage } from '@microfire/science';
import { FrontierKey } from '../../components/exhibits';
import { Frontier } from '../../components/frontier';
import { feature, PageHero, Sheet, value } from '../../components/page-kit';

export const metadata = { title: 'Research Frontier' };
// Display values of each admitted record, so a row can show what the catalog documents next to what was asked.
const records = Object.fromEntries(catalog.experiments.map((e) => [e.id, Object.fromEntries(
  (Object.keys(e.conditions) as (keyof typeof e.conditions)[]).map((k) => [k, value(e, k) ?? 'Not recorded']))]));
export default function Page() {
  const cov = coverage();
  return <>
    <PageHero compact eyebrow="Research Frontier" title="Coverage in this catalog" status={{ feature: feature('/gaps')!, built: true }}
      lede={`Check which of your conditions the ${cov.validatedExperiments} admitted record${cov.validatedExperiments === 1 ? '' : 's'} document${cov.validatedExperiments === 1 ? 's' : ''}. Absence here is not absence everywhere, and a blank is not proof of safety.`} />
    <Sheet>
      <Frontier coverage={cov} records={records} />
      <details className="disclose frontier-key"><summary>How each status is classified</summary><FrontierKey /></details>
    </Sheet>
  </>;
}
