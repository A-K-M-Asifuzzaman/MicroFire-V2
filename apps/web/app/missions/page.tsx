import { MissionsPage } from '../../components/static-pages';
export const metadata = { title: 'Mission Map' };
export const dynamic = 'force-dynamic';
export default function Page() {
  const playable = process.env.MICROFIRE_PUBLIC_CAMPAIGN_ENABLED === '1' && process.env.MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL === 'public-campaign-v1';
  return <MissionsPage playable={playable} />;
}
