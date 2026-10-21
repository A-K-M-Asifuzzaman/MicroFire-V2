import { catalog } from '@microfire/science';
import { AHome } from '../../../components/proto/a/home';
import { protoStations } from '../../../components/proto/data';

export const metadata = { title: 'A · Orbital observatory' };
export default function Page() {
  return <AHome stations={protoStations()} testId={catalog.experiments[0]!.testId} />;
}
