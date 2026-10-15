import { catalog } from '@microfire/science';
import { feature, PageHero, Sheet, sources } from '../../components/page-kit';
import { PassportPreview } from '../../components/passport-preview';

export const metadata = { title: 'Evidence Passport' };
// Canonical text comes only from the catalog, never from a saved passport.
const trustedCatalog = {
  experiments: Object.fromEntries(catalog.experiments.map((e) => [e.id, { title: e.title, limitations: e.limitations }])),
  claims: Object.fromEntries(catalog.experiments.flatMap((e) => e.claims.map((c) => [c.id, { experimentId: e.id, text: c.text, kind: c.kind, citations: c.citations }])))
};
export default function Page() {
  return <>
    <PageHero eyebrow="Evidence Passport · preview" title="A field notebook of what you actually established." status={{ feature: feature('/passport')! }}
      lede="Each entry will record a mission, the experiment and claim it rests on, its evidence level, your conclusion, your corrections and the source's own limitations. It is an educational record, never a certificate." />
    <Sheet>
      <div className="boundaries" style={{ marginBottom: 28 }}>
        <div><h3>Kept by the source</h3><p className="meta">Canonical limitations are always shown from the admitted catalog, never from the saved file, so saved text can never pose as NASA evidence.</p></div>
        <div><h3>Written by you</h3><p className="meta">Conclusions and notes are yours, shown separately and never labelled verified.</p></div>
      </div>
      <PassportPreview datasetVersion={catalog.datasetVersion} sources={sources} trusted={trustedCatalog} />
    </Sheet>
  </>;
}
