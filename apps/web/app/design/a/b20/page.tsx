import { requireReviewRoute } from '../../../../lib/review-routes';
import { AB20 } from '../../../../components/proto/a/b20';
import { protoB20 } from '../../../../components/proto/data';

export const metadata = { title: 'A · B20 record' };
export default async function Page() {
  await requireReviewRoute('MICROFIRE_DESIGN_REVIEW'); // pages check too: a client-router request can render a page without its layout
  return <AB20 b={protoB20()} />;
}
