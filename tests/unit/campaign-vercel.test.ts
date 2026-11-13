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
it('bounds opt-in boundary diagnostics to one boolean-only record per adapter', async () => {
  vi.clearAllMocks(); vi.mocked(ipAddress).mockReturnValue('192.0.2.1');
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  try {
    const handler = createVercelPublicCampaignHandler({ ...env(), MICROFIRE_PUBLIC_CAMPAIGN_DIAGNOSTICS: '1' });
    await handler(request()); await handler(request());
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toBe('campaign-boundary-check');
    expect(Object.values(log.mock.calls[0]![1]).every(value => typeof value === 'boolean')).toBe(true);
  } finally { log.mockRestore(); }
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
