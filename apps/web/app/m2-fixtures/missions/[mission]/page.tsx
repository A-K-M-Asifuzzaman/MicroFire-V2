import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalog } from '@microfire/science';
import { MissionGallery, type FixtureStep } from '../../../../game/missions/mission-gallery';
import { requireReviewRoute } from '../../../../lib/review-routes';

// Developer fixture gallery for mission scenes. Same gate as /m2-fixtures (proxy + route: review flag, loopback,
// no hosting markers, review credential). Reads engine-generated fixtures from docs/ at request time (never bundled)
// and is not linked from any public page.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mission fixture gallery', robots: { index: false, follow: false } };
const BUILT = new Set(['station-arrival']);

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
  return <MissionGallery mission={mission} steps={steps} claim={{ id: c.id, text: c.text, citations: c.citations }} sourceTitle={source.title} />;
}
