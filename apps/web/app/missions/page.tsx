import { campaignPlayable } from '../../lib/campaign-flags';
import { MissionsPage } from '../../components/static-pages';
export const metadata = { title: 'Mission Map' };
export const dynamic = 'force-dynamic';
export default function Page() {
  const playable = campaignPlayable();
  return <MissionsPage playable={playable} />;
}
