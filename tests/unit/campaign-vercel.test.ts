import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@vercel/functions', () => ({ ipAddress: vi.fn(), attachDatabasePool: vi.fn() }));
import { ipAddress, attachDatabasePool } from '@vercel/functions';
import { randomBytes, randomUUID } from 'node:crypto';
import * as campaign from '../../apps/web/lib/public-campaign';
import { campaignRequestAllowed } from '../../apps/web/lib/campaign-security';
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
it('ignores Forwarded without changing URL, body, exact-origin checks or trusted SDK address', async () => {
  vi.clearAllMocks(); vi.mocked(ipAddress).mockReturnValue('192.0.2.1');
  const config = env();
  const pool = vi.spyOn(campaign, 'publicCampaignPool').mockReturnValue({} as ReturnType<typeof campaign.publicCampaignPool>);
  const delegated: Request[] = [];
  const create = vi.spyOn(campaign, 'createPublicCampaignHandler').mockReturnValue(async (r, address) => {
    expect(address).toBe('192.0.2.1'); expect(r.headers.has('forwarded')).toBe(false);
    expect(r.url).toBe('https://microfire.example/api/game/public-campaign/v1/session');
    expect(await r.text()).toBe('{}'); delegated.push(r);
    return new Response(null, { status: campaignRequestAllowed(r, config.MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN, false) ? 200 : 403 });
  });
  try {
    const handler = createVercelPublicCampaignHandler({ ...config, MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_URL: 'fixture-only' });
    for (const patch of [{}, { origin: 'https://evil.example' }, { host: 'evil.example' }, { 'x-forwarded-host': 'evil.example' }, { 'sec-fetch-site': 'same-site' }]) {
      const headers = { host: 'microfire.example', origin: config.MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN,
        'x-microfire-campaign': '1', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json',
        forwarded: 'for=spoofed;host=evil.example;proto=http', ...patch };
      const r = await handler(new Request(request(), { method: 'POST', headers, body: '{}' }));
      expect(r.status).toBe(Object.keys(patch).length ? 403 : 200);
    }
    expect(delegated).toHaveLength(5); expect(create).toHaveBeenCalledTimes(1);
  } finally { create.mockRestore(); pool.mockRestore(); }
});
it('mounts only the public adapter and fails closed for GET, POST, HEAD and OPTIONS by default', async () => {
  vi.clearAllMocks();
  vi.stubEnv('MICROFIRE_PUBLIC_CAMPAIGN_ENABLED', '0');
  try {
    const route = await import('../../apps/web/app/api/game/public-campaign/v1/[...action]/route');
    expect(route.runtime).toBe('nodejs'); expect(route.dynamic).toBe('force-dynamic');
    for (const method of ['GET', 'POST', 'HEAD', 'OPTIONS'] as const) {
      const response = await route[method](new Request(request(), { method }));
      expect(response.status).toBe(404);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    }
    expect(ipAddress).not.toHaveBeenCalled(); expect(attachDatabasePool).not.toHaveBeenCalled();
  } finally { vi.unstubAllEnvs(); }
});
