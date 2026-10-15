import { catalog, coverage } from '@microfire/science';
import { HeroChain } from '../../components/exhibits';
import { feature, PageHero, Sheet, sources } from '../../components/page-kit';
import { Workstation } from '../../components/workstation';

export const metadata = { title: 'Evidence Workstation' };
const claims = Object.fromEntries(catalog.experiments.flatMap((e) => e.claims.map((c) => [c.id, c.text])));
export default function Page() {
  return <>
    <PageHero eyebrow="The research workspace" title="What does the evidence actually say?" status={{ feature: feature('/dashboard')!, built: true }} visual={<HeroChain />}
      lede="Ask a question with the conditions you care about. Each result is traced from conditions to a cited observation to its limits and its NASA page. No invented certainty." />
    <Sheet><Workstation sources={sources} claims={claims} coverage={coverage()} /></Sheet>
  </>;
}
