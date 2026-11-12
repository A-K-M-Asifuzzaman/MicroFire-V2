import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@vercel/functions', () => ({ ipAddress: vi.fn(), attachDatabasePool: vi.fn() }));
import { ipAddress, attachDatabasePool } from '@vercel/functions';
import { randomBytes, randomUUID } from 'node:crypto';
import { createVercelPublicCampaignHandler } from '../../apps/web/lib/public-campaign-vercel';
const secret = () => randomBytes(32).toString('base64url');
const env = () => ({ VERCEL: '1', MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1',
  MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: 'https://microfire.example', MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: randomUUID(),
  MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: secret() });
const request = () => new Request('https://microfire.example/api/game/public-campaign/v1/session');
it('never initializes hosting context or a pool for disabled or non-Vercel candidates', async () => {
  vi.clearAllMocks();
  expect((await createVercelPublicCampaignHandler({})(request())).status).toBe(404);
  expect((await createVercelPublicCampaignHandler({ ...env(), VERCEL: '' })(request())).status).toBe(404);
  expect(ipAddress).not.toHaveBeenCalled(); expect(attachDatabasePool).not.toHaveBeenCalled();
});
it('fails closed when the provider cannot supply an unambiguous client address', async () => {
  vi.clearAllMocks();
  for (const address of [undefined, '127.0.0.1, 10.0.0.1', 'unknown']) {
    vi.mocked(ipAddress).mockReturnValue(address);
    expect((await createVercelPublicCampaignHandler(env())(request())).status).toBe(503);
  }
  expect(attachDatabasePool).not.toHaveBeenCalled();
});
it('has no memory fallback when the approved deployment lacks its private database', async () => {
  vi.clearAllMocks(); vi.mocked(ipAddress).mockReturnValue('192.0.2.1');
  const response = await createVercelPublicCampaignHandler(env())(request());
  expect(response.status).toBe(503); expect(attachDatabasePool).not.toHaveBeenCalled();
  expect((await response.json()).error.message).toBe('Campaign storage or platform context is unavailable.');
});
