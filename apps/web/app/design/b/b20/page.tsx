import { requireReviewRoute } from '../../../../lib/review-routes';
import { BB20 } from '../../../../components/proto/b/b20';
import { protoB20 } from '../../../../components/proto/data';

export const metadata = { title: 'B · B20 record' };
export default async function Page() {
  await requireReviewRoute('MICROFIRE_DESIGN_REVIEW'); // pages check too: a client-router request can render a page without its layout
  return <BB20 b={protoB20()} />;
}
