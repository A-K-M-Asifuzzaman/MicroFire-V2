import Link from 'next/link';
import { catalog, coverage } from '@microfire/science';
import { CompareProbe } from '../../components/compare-probe';
import { FilmGlyph } from '../../components/film-glyph';
import { feature, PageHero, Sheet, value } from '../../components/page-kit';

export const metadata = { title: 'Controlled Comparison' };
export default function Page() {
  const e = catalog.experiments[0]!;
  return <>
    <PageHero eyebrow="Controlled comparison" title="A comparison needs a second admitted record." status={{ feature: feature('/compare')! }}
      lede="Comparing flames is only meaningful when the records were measured under documented conditions. With one admitted experiment, no comparison can be supported yet." />
    <Sheet>
      <div className="boundaries" style={{ marginBottom: 28 }}>
        <div><p className="eyebrow">Record A · admitted</p><div className="thumb" style={{ maxWidth: 260 }}><FilmGlyph /></div><h3 style={{ marginTop: 12 }}><Link href={`/experiments/${e.id}`}>{e.title}</Link></h3><p className="meta">{value(e, 'material')} · {value(e, 'oxygenPct')} calibrated O₂ · {value(e, 'flowCmS')} initial airflow</p></div>
        <div style={{ borderStyle: 'dashed', display: 'grid', alignContent: 'center' }}><p className="eyebrow">Record B · none admitted</p><p>All {coverage().quarantinedCandidates} legacy candidates are quarantined pending source review, so none can be compared. When more records are admitted, this view will show which conditions differ and warn when more than one differs at once.</p></div>
      </div>
      <h2 style={{ fontSize: 'var(--step-2)' }}>Ask the evidence service anyway</h2>
      <p>This sends a real comparison request. The service refuses it rather than inventing a table.</p>
      <CompareProbe admittedId={e.id} />
    </Sheet>
  </>;
}
