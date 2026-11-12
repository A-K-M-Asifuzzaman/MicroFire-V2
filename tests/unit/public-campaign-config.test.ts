import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { randomBytes, randomUUID } from 'node:crypto';
import { PublicCampaignViewSchema } from '@microfire/shared';
import { publicCampaignConfig, publicCampaignPool } from '../../apps/web/lib/public-campaign';
const secret = () => randomBytes(32).toString('base64url');
it('public sessions require an explicitly reviewed HTTPS deployment and distinct server keys', async () => {
  const token = secret(), env = { MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1',
    MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: 'https://microfire.example', MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: randomUUID(),
    MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: secret() };
  expect(publicCampaignConfig(env)).not.toBeNull();
  expect(publicCampaignConfig({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '0' })).toBeNull();
  expect(publicCampaignConfig({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: '' })).toBeNull();
  expect(publicCampaignConfig({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: 'http://microfire.example' })).toBeNull();
  expect(publicCampaignConfig({ ...env, MICROFIRE_PREVIEW_ACCESS_TOKEN: env.MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY })).toBeNull();
  expect(() => publicCampaignPool('not-a-database-url')).toThrow('Invalid campaign database configuration');
  expect(() => publicCampaignPool('postgres://user:' + token + '@database.example/db?sslmode=disable')).toThrow('Invalid campaign database configuration');
  const pool = publicCampaignPool('postgres://user:' + secret() + '@database.example/db?sslmode=require');
  expect(pool.options.ssl).toEqual({ rejectUnauthorized: true }); expect(pool.options.max).toBe(2); await pool.end();
});
it('public view schemas have no slots for private checkpoints, full state, training or answer rubrics', () => {
  const fields = Object.keys(PublicCampaignViewSchema.shape);
  for (const field of ['checkpoint', 'record', 'training', 'state', 'expected', 'fault', 'answerKey']) expect(fields).not.toContain(field);
});
