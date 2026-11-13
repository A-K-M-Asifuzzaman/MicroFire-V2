import 'server-only';
import { attachDatabasePool, ipAddress } from '@vercel/functions';
import { isIP } from 'node:net';
import { HttpFailureSchema } from '@microfire/shared';
import { publicCampaignConfig, publicCampaignPool, createPublicCampaignHandler } from './public-campaign';
import { CAMPAIGN_HEADERS } from './campaign-http';

/** Hosting adapter; activation requires the reviewed-protocol opt-in and private database configuration. */
export function createVercelPublicCampaignHandler(env: NodeJS.ProcessEnv) {
  let handler: ReturnType<typeof createPublicCampaignHandler> | undefined;
  return async (request: Request) => {
    const config = publicCampaignConfig(env);
    if (env.VERCEL !== '1' || !config) return Response.json(HttpFailureSchema.parse({ apiVersion: '1', error: { code: 'NOT_FOUND', message: 'API route not found.', retryable: false } }), { status: 404, headers: CAMPAIGN_HEADERS });
    try {
      const address = ipAddress(request);
      if (!address || !isIP(address)) throw Error('Trusted platform address unavailable.');
      if (!handler) {
        const database = env.MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_URL;
        if (!database) throw Error('Campaign database unavailable.');
        const pool = publicCampaignPool(database, env.MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_CA_PEM); attachDatabasePool(pool);
        handler = createPublicCampaignHandler(env, pool);
      }
      // Vercel adds Forwarded; it is never authority for origin, Host or the SDK-derived address.
      const headers = new Headers(request.headers); headers.delete('forwarded');
      return await handler(new Request(request, { headers }), address);
    } catch {
      return Response.json(HttpFailureSchema.parse({ apiVersion: '1', error: { code: 'INTERNAL_ERROR', message: 'Campaign storage or platform context is unavailable.', retryable: true } }), { status: 503, headers: CAMPAIGN_HEADERS });
    }
  };
}
