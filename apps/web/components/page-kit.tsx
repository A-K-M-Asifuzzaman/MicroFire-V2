// Server-side helpers shared by route pages. Imports no client islands, so routes only ship the islands they use.
import { features, type Experiment, type Feature } from '@microfire/shared';
import { catalog } from '@microfire/science';
import { StatusLine, type SourceRef } from './evidence-ui';

export const feature = (route: string) => features.find((f) => f.route === route);
export const sources: SourceRef[] = catalog.sources.map(({ id, title, url, documentUrl }) => ({ id, title, url, documentUrl }));
export const conditionLabels: Record<string, string> = {
  gravity: 'Gravity', material: 'Material', geometry: 'Sample geometry', flowDirection: 'Flow direction',
  oxygenPct: 'Calibrated oxygen', pressureKpa: 'Pressure', flowCmS: 'Initial airflow', thicknessMm: 'Film thickness'
};
export const value = (e: Experiment, key: keyof Experiment['conditions']) => {
  const c = e.conditions[key];
  return c.status === 'known' ? `${c.value}${'unit' in c ? ` ${c.unit}` : ''}` : null;
};
export const locatorText = (e: Experiment) => {
  const c = e.claims[0]?.citations[0]?.locator;
  return c?.kind === 'pdf' ? `${c.section.split(',')[0]}, PDF page ${c.page}` : c?.section ?? 'source record';
};

/** Cinematic page opening on the observatory surface; the reading surface (`Sheet`) follows it. */
export function PageHero({ eyebrow, title, lede, crumbs, status, visual }: {
  eyebrow: string; title: string; lede?: string; crumbs?: React.ReactNode; status?: { feature: Feature; built?: boolean }; visual?: React.ReactNode;
}) {
  return <header className="page-hero">
    <div className={`wrap${visual ? '' : ' solo'}`}>
      <div className="reveal">
        {crumbs && <nav aria-label="Breadcrumb" className="crumbs">{crumbs}</nav>}
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {status && <StatusLine feature={status.feature} built={status.built ?? false} />}
      </div>
      {visual && <div className="hero-visual reveal"><div>{visual}</div></div>}
    </div>
  </header>;
}
export function Sheet({ children }: { children: React.ReactNode }) {
  return <div className="sheet"><div className="wrap">{children}</div></div>;
}
