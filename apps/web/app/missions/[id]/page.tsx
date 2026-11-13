import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MissionPage, missionIds } from '../../../components/static-pages';
import { feature } from '../../../components/page-kit';
import { campaignPlayable } from '../../../lib/campaign-flags';

export const dynamicParams = false;
export function generateStaticParams() { return missionIds.map((id) => ({ id })); }
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const f = feature(`/missions/${(await params).id}`); return f ? { title: f.title } : {}; }
export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!missionIds.some((m) => m === id)) notFound();
  return <MissionPage id={id} playable={campaignPlayable()} />;
}
