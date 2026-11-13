import { catalog, coverage } from '@microfire/science';
import { feature, PageHero, Sheet, sources } from '../../components/page-kit';
import { Workstation } from '../../components/workstation';
import { ResearchIntelligence } from '../../components/research-intelligence';

export const metadata = { title: 'Evidence Workstation' };
const claims = Object.fromEntries(catalog.experiments.flatMap((e) => e.claims.map((c) => [c.id, c.text])));
export default function Page() {
  return <>
    <PageHero compact eyebrow="Evidence Workstation" title="What does the evidence actually say?" status={{ feature: feature('/dashboard')!, built: true }}
      lede="Trace a question to a cited observation, its conditions, its limits and its NASA page. No invented certainty." />
    {/* The question field stays in the first viewport (tests/e2e/m15-corrections.spec.ts); the intelligence report follows. */}
    <Sheet><div id="workstation"><h2 className="ri-ws-h">Ask your own question</h2><Workstation sources={sources} claims={claims} coverage={coverage()} /></div><ResearchIntelligence /></Sheet>
  </>;
}
