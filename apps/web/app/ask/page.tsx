import { AskPix } from '../../components/ask-pix';
import { feature, PageHero, Sheet, sources } from '../../components/page-kit';
import { PixAvatar } from '../../components/pix-avatar';

export const metadata = { title: 'Ask PIX' };
function PixCard() {
  return <figure className="pix-card frame" style={{ margin: 0 }}>
    <PixAvatar className="pix-avatar-lg" />
    <figcaption>
      <p className="eyebrow" style={{ marginBottom: 6 }}>PIX · research companion</p>
      <ul>
        <li>Answers only from cited statements in the admitted catalog.</li>
        <li>Says so, and why, when the evidence cannot support an answer.</li>
        <li>Fixed templates, not a language model. Nothing is generated.</li>
      </ul>
    </figcaption>
  </figure>;
}
export default function Page() {
  return <>
    <PageHero eyebrow="Ask PIX" title="Ask, and see where the answer comes from." status={{ feature: feature('/ask')!, built: true }} visual={<PixCard />}
      lede="PIX is MicroFire's deterministic evidence guide. It assembles answers only from cited statements in the admitted catalog, and it withholds an answer when the evidence cannot support one." />
    <Sheet><AskPix sources={sources} /></Sheet>
  </>;
}
