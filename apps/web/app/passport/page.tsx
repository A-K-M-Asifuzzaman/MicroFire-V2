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
    <PageHero compact eyebrow="Evidence Passport · preview" title="Your evidence notebook" status={{ feature: feature('/passport')! }}
      lede="An educational record of what you established, never a certificate." />
    <Sheet>
      <PassportPreview datasetVersion={catalog.datasetVersion} sources={sources} trusted={trustedCatalog} />
      <details className="disclose" style={{ marginTop: 24 }}>
        <summary>Who wrote what in an entry</summary>
        <div className="boundaries" style={{ marginTop: 12 }}>
          <div><h3>Kept by the source</h3><p className="meta">Canonical limitations are always shown from the admitted catalog, never from the saved file, so saved text can never pose as NASA evidence.</p></div>
          <div><h3>Written by you</h3><p className="meta">Conclusions and notes are yours, shown separately and never labelled verified.</p></div>
        </div>
      </details>
    </Sheet>
  </>;
}
