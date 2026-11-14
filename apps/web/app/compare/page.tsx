import Link from 'next/link';
import { catalog, coverage } from '@microfire/science';
import { CompareProbe } from '../../components/compare-probe';
import { CompareStudio } from '../../components/compare-studio';
import { FilmGlyph } from '../../components/film-glyph';
import { feature, PageHero, Sheet, value } from '../../components/page-kit';
import { nasaMedia } from '../../lib/lab-nasa';

export const metadata = { title: 'Comparison Studio' };
export default function Page() {
  const e = catalog.experiments[0]!;
  return <>
    <PageHero eyebrow="Comparison Studio" title="Compare flames fairly: change one thing at a time." status={{ feature: feature('/compare')! }}
      lede="Put two flame scenarios side by side, see which conditions changed, line up NASA investigations, and check how close each scenario sits to the one admitted NASA record. Illustrations are labelled; evidence comes only from the engine." />
    <Sheet>
      <CompareStudio media={nasaMedia()} />
      <section aria-labelledby="cs-rec-h" style={{ marginTop: 40 }}>
        <h2 id="cs-rec-h" style={{ fontSize: 'var(--step-2)' }}>5 · Record against record: why MicroFire will not invent Record B</h2>
        <div className="boundaries" style={{ marginBottom: 28 }}>
          <div><p className="eyebrow">Record A · admitted</p><div className="thumb" style={{ maxWidth: 260 }}><FilmGlyph /></div><h3 style={{ marginTop: 12 }}><Link href={`/experiments/${e.id}`}>{e.title}</Link></h3><p className="meta">{value(e, 'material')} · {value(e, 'oxygenPct')} calibrated O₂ · {value(e, 'flowCmS')} initial airflow</p></div>
          <div style={{ borderStyle: 'dashed', display: 'grid', alignContent: 'center' }}><p className="eyebrow">Record B · none admitted</p><p>All {coverage().quarantinedCandidates} legacy candidates are quarantined pending source review, so none can be compared measurement against measurement. When more records are admitted, this view will show which conditions differ and warn when more than one differs at once.</p></div>
        </div>
        <p>Ask the evidence service for a record-to-record comparison anyway. It refuses rather than inventing a table.</p>
        <CompareProbe admittedId={e.id} />
      </section>
    </Sheet>
  </>;
}
