import { catalog } from '@microfire/science';
import { FlameLab } from '../../components/flame-lab';
import { PageHero, Sheet, locatorText, value } from '../../components/page-kit';

export const metadata = { title: 'Flame Lab · Interactive Evidence Exploration' };

export default function Page() {
  const b20 = catalog.experiments[0]!;
  const oxygen = b20.conditions.oxygenPct;
  const recorded = oxygen.status === 'known' ? Number(oxygen.value) : null;
  const oxygenB20 = recorded !== null && Number.isFinite(recorded) ? recorded : null;
  const observation = b20.claims.find(c => c.kind === 'observed' && c.origin === 'research')?.text ?? 'No admitted observation is available.';
  return <>
    <PageHero compact eyebrow="Flame Lab / guided research workbench" title="Change the condition. Challenge the conclusion."
      lede="Explore a scientifically labelled flame illustration, compare hypothetical conditions with NASA's admitted B20 observation, and practice evidence-based reasoning. This is not a fire-risk simulator." />
    <Sheet><FlameLab record={{ href: `/experiments/${b20.id}`, title: `${b20.testId} evidence dossier`, flowDirection: value(b20, 'flowDirection'), initialFlow: value(b20, 'flowCmS'), locator: locatorText(b20) }}
      oxygenB20={oxygenB20} observation={observation} source="NASA TM-20210011385, Table A.1, PDF page 112" /></Sheet>
  </>;
}
