import { requireReviewRoute } from '../../../../lib/review-routes';
import { BLab } from '../../../../components/proto/b/lab';
import { protoParts } from '../../../../components/proto/data';

export const metadata = { title: 'B · Training bay' };
export default async function Page() {
  await requireReviewRoute('MICROFIRE_DESIGN_REVIEW'); // pages check too: a client-router request can render a page without its layout
  return <BLab parts={protoParts()} />;
}
