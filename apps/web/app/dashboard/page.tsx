import { catalog, coverage } from '@microfire/science';
import { feature, PageHero, Sheet, sources } from '../../components/page-kit';
import { Workstation } from '../../components/workstation';

export const metadata = { title: 'Evidence Workstation' };
const claims = Object.fromEntries(catalog.experiments.flatMap((e) => e.claims.map((c) => [c.id, c.text])));
export default function Page() {
  return <>
    <PageHero compact eyebrow="Evidence Workstation" title="What does the evidence actually say?" status={{ feature: feature('/dashboard')!, built: true }}
      lede="Trace a question to a cited observation, its conditions, its limits and its NASA page. No invented certainty." />
    <Sheet><Workstation sources={sources} claims={claims} coverage={coverage()} /></Sheet>
  </>;
}
