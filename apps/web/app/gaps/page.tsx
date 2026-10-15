import { coverage } from '@microfire/science';
import { FrontierKey } from '../../components/exhibits';
import { Frontier } from '../../components/frontier';
import { feature, PageHero, Sheet } from '../../components/page-kit';

export const metadata = { title: 'Research Frontier' };
export default function Page() {
  return <>
    <PageHero eyebrow="Evidence frontier / where knowledge ends" title="The missing experiment is also a finding." status={{ feature: feature('/gaps')!, built: true }} visual={<FrontierKey />}
      lede="Map what the admitted catalog covers for your conditions. A blank cell is not proof of safety, and absence here is not absence everywhere." />
    <Sheet><Frontier coverage={coverage()} /></Sheet>
  </>;
}
