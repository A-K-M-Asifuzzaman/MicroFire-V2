import { catalog, coverage } from '@microfire/science';
import { BHome } from '../../../components/proto/b/home';
import { protoStations } from '../../../components/proto/data';

export const metadata = { title: 'B · Living science adventure' };
export default function Page() {
  const cov = coverage();
  return <BHome stations={protoStations()} testId={catalog.experiments[0]!.testId} admitted={cov.validatedExperiments} quarantined={cov.quarantinedCandidates} />;
}
