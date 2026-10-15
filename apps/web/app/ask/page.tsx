import { AskPix } from '../../components/ask-pix';
import { feature, PageHero, Sheet, sources } from '../../components/page-kit';

export const metadata = { title: 'Ask PIX' };
export default function Page() {
  return <>
    <PageHero compact eyebrow="Ask PIX" title="Ask, and see where the answer comes from." status={{ feature: feature('/ask')!, built: true }}
      lede="PIX answers only from cited statements in the admitted catalog, and says so when the evidence cannot support an answer." />
    <Sheet><AskPix sources={sources} /></Sheet>
  </>;
}
