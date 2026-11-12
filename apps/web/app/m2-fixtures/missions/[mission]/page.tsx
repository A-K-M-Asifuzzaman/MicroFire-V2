import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalog } from '@microfire/science';
import { claimTrialStatements } from '@microfire/game-core';
import { value } from '../../../../components/page-kit';
import { MissionGallery, type FixtureStep } from '../../../../game/missions/mission-gallery';
import { requireReviewRoute } from '../../../../lib/review-routes';

// Developer fixture gallery for mission scenes. Same gate as /m2-fixtures (proxy + route: review flag, loopback,
// no hosting markers, review credential). Reads engine-generated fixtures from docs/ at request time (never bundled)
// and is not linked from any public page.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mission fixture gallery', robots: { index: false, follow: false } };
const BUILT = new Set(['station-arrival', 'flame-detective', 'claim-trial', 'lunar-habitat']);

function fixtures(): { steps: (FixtureStep & { mission: string })[] } | null {
  for (const d of [path.join(process.cwd(), '..', '..', 'docs', 'campaign', 'fixtures'), path.join(process.cwd(), 'docs', 'campaign', 'fixtures')]) {
    try { return JSON.parse(readFileSync(path.join(d, 'campaign-steps.json'), 'utf8')); } catch { /* try next */ }
  }
  return null;
}

export default async function Page({ params }: { params: Promise<{ mission: string }> }) {
  await requireReviewRoute('MICROFIRE_M2_FIXTURE_GALLERY');
  const { mission } = await params;
  const data = fixtures();
  if (!data || !BUILT.has(mission)) notFound();
  const e = catalog.experiments[0]!, c = e.claims.find((x) => x.id === 'bass2-b20-burned-entire-sample')!;
  const source = catalog.sources.find((s) => e.sourceIds.includes(s.id))!;
  const steps = data.steps.filter((s) => s.mission === mission);
  // Statements are passed WITHOUT their expected answers or hints: the engine alone judges appraisals.
  const statements = claimTrialStatements.map((x) => ({ id: x.id, text: x.text, origin: x.origin }));
  const thick = e.conditions.thicknessMm, oxy = e.conditions.oxygenPct;
  const evidence = [{ id: 'observation', label: 'B20 observation log (Table A.1)', citation: c.citations[0]! },
    ...(thick.status === 'known' ? [{ id: 'thickness', label: 'B20 sample thickness (recorded condition)', citation: thick.citation }] : []),
    ...(oxy.status === 'known' ? [{ id: 'oxygen', label: 'B20 calibrated oxygen (recorded condition)', citation: oxy.citation }] : [])];
  const recorded = (['gravity', 'oxygenPct', 'pressureKpa', 'flowCmS', 'material'] as const).map((k) => ({ label: ({ gravity: 'Gravity', oxygenPct: 'Oxygen', pressureKpa: 'Pressure', flowCmS: 'Airflow', material: 'Material' })[k], value: value(e, k) ?? 'Not recorded' }));
  return <MissionGallery mission={mission} steps={steps} claim={{ id: c.id, text: c.text, citations: c.citations }} sourceTitle={source.title} statements={statements} evidence={evidence} recorded={recorded} />;
}
