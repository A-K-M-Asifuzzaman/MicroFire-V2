import { createVercelPublicCampaignHandler } from '../../../../../../lib/public-campaign-vercel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handler = createVercelPublicCampaignHandler(process.env);
export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
export const HEAD = handler;
