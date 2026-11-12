import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { randomBytes, randomUUID } from 'node:crypto';
import { CampaignAuthority, campaignConfig, campaignRequestAllowed } from '../../apps/web/lib/campaign-security';
import { createLoopbackCampaignHandler } from '../../apps/web/lib/campaign-http';
const secret = () => randomBytes(32).toString('base64url');
function setup() {
  const env = { MICROFIRE_LOCAL_CAMPAIGN: '1', MICROFIRE_CAMPAIGN_ORIGIN: 'http://127.0.0.1:3461', MICROFIRE_CAMPAIGN_ACCESS_TOKEN: secret(),
    MICROFIRE_CAMPAIGN_SIGNING_KEY: secret(), MICROFIRE_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_CAMPAIGN_KEY_ID: 'unit' };
  const config = campaignConfig(env)!;
  const request = new Request(config.origin + '/api/game/campaign/v1/authorize', { method: 'POST', headers: { host: config.host, origin: config.origin, 'x-microfire-campaign': '1' } });
  let clock = Date.now(); const authority = new CampaignAuthority(config, () => clock);
  const grant = authority.authorize(request, env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN), cookie = grant.cookie!.split(';')[0]!;
  const authorized = new Request(request, { headers: { ...Object.fromEntries(request.headers), cookie, 'x-microfire-campaign-csrf': grant.csrfToken } });
  return { env, config, request, authority, grant, authorized, advance() { clock += 3600001; } };
}
it('requires a separate hashed campaign grant plus independently held proof; expiry and revoke invalidate it', () => {
  const h = setup();
  expect(campaignConfig({ ...h.env, MICROFIRE_CAMPAIGN_SIGNING_KEY: Buffer.alloc(32).toString('base64url') })).toBeNull();
  expect(h.authority.require(h.authorized).audience).toBe('campaign-v1');
  expect(h.grant.cookie).toContain('Path=/api/game/campaign/v1; HttpOnly; SameSite=Strict');
  const headers = new Headers(h.authorized.headers); headers.delete('x-microfire-campaign-csrf');
  expect(() => h.authority.require(new Request(h.authorized, { headers }))).toThrow();
  headers.set('x-microfire-campaign-csrf', secret()); expect(() => h.authority.require(new Request(h.authorized, { headers }))).toThrow();
  const duplicate = new Headers(h.authorized.headers); duplicate.set('cookie', duplicate.get('cookie')! + '; ' + duplicate.get('cookie')!);
  expect(() => h.authority.require(new Request(h.authorized, { headers: duplicate }))).toThrow();
  h.advance(); expect(() => h.authority.require(h.authorized)).toThrow();
  const second = setup(); expect(second.authority.revoke(second.authorized)).toContain('Max-Age=0'); expect(() => second.authority.require(second.authorized)).toThrow();
});
it.each(['MICROFIRE_PREVIEW_ACCESS_TOKEN', 'MICROFIRE_PREVIEW_SIGNING_KEY', 'MICROFIRE_REVIEW_ACCESS_TOKEN', 'MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY', 'MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY'])('rejects shared credential material with %s', field => {
  const h = setup(); expect(campaignConfig({ ...h.env, [field]: h.env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN })).toBeNull();
  expect(campaignConfig({ ...h.env, [field]: h.env.MICROFIRE_CAMPAIGN_SIGNING_KEY })).toBeNull();
});
it.each(['VERCEL', 'VERCEL_ENV', 'AWS_LAMBDA_FUNCTION_NAME', 'NETLIFY', 'FLY_APP_NAME'])('local authority stays disabled on presence of %s', marker => {
  expect(campaignConfig({ ...setup().env, [marker]: '' })).toBeNull();
});
it.each(['http://127.0.0.1:99999', 'http://127.0.0.1:0', 'http://127.0.0.1:03461', 'http://127.0.0.1:3461/', 'http://evil.example@127.0.0.1:3461'])('rejects noncanonical/invalid origin %s', origin => {
  expect(campaignConfig({ ...setup().env, MICROFIRE_CAMPAIGN_ORIGIN: origin })).toBeNull();
});
it('HKDF separates campaign checkpoint keys from the operator and supplied key, and HTTPS cookies are secure', () => {
  const h = setup(); expect(h.config.signingKey.equals(Buffer.from(h.env.MICROFIRE_CAMPAIGN_SIGNING_KEY, 'base64url'))).toBe(false);
  const config = campaignConfig({ ...h.env, MICROFIRE_CAMPAIGN_ORIGIN: 'https://127.0.0.1:3461' })!;
  const authority = new CampaignAuthority(config), request = new Request(config.origin, { method: 'POST', headers: { host: config.host, origin: config.origin, 'x-microfire-campaign': '1' } });
  const grant = authority.authorize(request, h.env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN);
  expect(grant.cookie!.startsWith('__Secure-microfire_campaign_grant=')).toBe(true); expect(grant.cookie).toContain('; Secure');
});
it('blocks origin, URL credential, no-cors, missing custom header and same-site requests before authorization', async () => {
  const h = setup();
  for (const patch of [{ origin: 'http://127.0.0.1:3462' }, { 'sec-fetch-site': 'same-site' }, { 'sec-fetch-mode': 'no-cors' }, { 'x-microfire-campaign': '' }, { forwarded: 'for=127.0.0.1' }]) {
    const request = new Request(h.authorized, { headers: { ...Object.fromEntries(h.authorized.headers), ...patch } });
    expect(campaignRequestAllowed(request, h.config.origin, true)).toBe(false);
  }
  const response = await createLoopbackCampaignHandler({ ...h.env, MICROFIRE_LOCAL_CAMPAIGN: '0' })(h.authorized);
  expect(response.status).toBe(404);
});
