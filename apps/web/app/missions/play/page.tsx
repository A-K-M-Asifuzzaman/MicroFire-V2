import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalog } from '@microfire/science';
import { value } from '../../../components/page-kit';
import { CampaignPlay } from '../../../game/campaign/campaign-play';

// Public visitor campaign UI. 404 unless the same reviewed-protocol opt-in as the public campaign API is set at
// request time. The API additionally requires validated origin, credentials and durable PostgreSQL.
// Only citable source data is passed down: no rules, expected answers or training state.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Missions', robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.MICROFIRE_PUBLIC_CAMPAIGN_ENABLED !== '1' || process.env.MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL !== 'public-campaign-v1') notFound();
  const e = catalog.experiments[0]!, c = e.claims.find((x) => x.id === 'bass2-b20-burned-entire-sample')!;
  const source = catalog.sources.find((s) => e.sourceIds.includes(s.id))!;
  const thick = e.conditions.thicknessMm, oxy = e.conditions.oxygenPct;
  const evidence = [{ id: 'observation', label: 'B20 observation log (Table A.1)', citation: c.citations[0]! },
    ...(thick.status === 'known' ? [{ id: 'thickness', label: 'B20 sample thickness (recorded condition)', citation: thick.citation }] : []),
    ...(oxy.status === 'known' ? [{ id: 'oxygen', label: 'B20 calibrated oxygen (recorded condition)', citation: oxy.citation }] : [])];
  const recorded = (['gravity', 'oxygenPct', 'pressureKpa', 'flowCmS', 'material'] as const).map((k) => ({ label: ({ gravity: 'Gravity', oxygenPct: 'Oxygen', pressureKpa: 'Pressure', flowCmS: 'Airflow', material: 'Material' })[k], value: value(e, k) ?? 'Not recorded' }));
  return <CampaignPlay claim={{ id: c.id, text: c.text, citations: c.citations }} sourceTitle={source.title} evidence={evidence} recorded={recorded} />;
}
