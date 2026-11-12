import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { randomBytes, randomUUID } from 'node:crypto';
import { CAMPAIGN_HTTP_BASE, CampaignHttpStartRequestSchema, CampaignHttpResumeRequestSchema,
  CampaignHttpSnapshotResponseSchema, CampaignHttpActionResponseSchema, CampaignHttpExportResponseSchema, campaignIdentity, CampaignCommandSchema, ResumeRequestSchema } from '@microfire/shared';
import { CampaignService } from '../../apps/web/lib/campaign-service';
import { PreviewAuthority, previewConfig } from '../../apps/web/lib/game-preview-security';
import { review } from './campaign-helpers';

it('separates the proposed campaign start/resume namespace and bounds from frozen M2', () => {
  expect(CAMPAIGN_HTTP_BASE).toBe('/api/game/campaign/v1');
  const request = { runtimeId: randomUUID(), sessionId: randomUUID() };
  expect(CampaignHttpStartRequestSchema.parse(request)).toEqual(request);
  expect(CampaignHttpStartRequestSchema.safeParse({ ...request, state: { complete: true } }).success).toBe(false);
  const token = 'a'.repeat(40000) + '.' + 'b'.repeat(43);
  expect(CampaignHttpResumeRequestSchema.safeParse({ runtimeId: request.runtimeId, checkpoint: token }).success).toBe(true);
  expect(ResumeRequestSchema.safeParse({ runtimeId: request.runtimeId, checkpoint: token, commandId: 'a'.repeat(64) }).success).toBe(false);
  for (const checkpoint of ['unsigned', 'a'.repeat(175001), 'aa.bb.extra'])
    expect(CampaignHttpResumeRequestSchema.safeParse({ runtimeId: request.runtimeId, checkpoint }).success).toBe(false);
});
it('parses actual private service snapshots, accepted/refused actions and exports without trusting client completion', async () => {
  const config = previewConfig({ MICROFIRE_LOCAL_GAME_PREVIEW: '1', MICROFIRE_PREVIEW_ORIGIN: 'http://127.0.0.1:3421',
    MICROFIRE_PREVIEW_ACCESS_TOKEN: randomBytes(32).toString('base64url'), MICROFIRE_PREVIEW_SIGNING_KEY: randomBytes(32).toString('base64url'),
    MICROFIRE_PREVIEW_KEY_ID: 'contract-test', MICROFIRE_PREVIEW_REALM_ID: randomUUID() })!;
  const authority = new PreviewAuthority(config), anonymous = new Request(config.origin, { method: 'POST', headers: { origin: config.origin, host: config.host } });
  const cookie = authority.authorize(anonymous, config.accessToken.toString('base64url')).cookie!.split(';')[0]!;
  const request = new Request(anonymous, { headers: { ...Object.fromEntries(anonymous.headers), cookie } });
  const service = new CampaignService(authority), started = service.start(request, randomUUID());
  expect(CampaignHttpSnapshotResponseSchema.parse({ apiVersion: '1', data: started }).data.revision).toBe(0);
  const command = async (action: typeof review) => {
    const intent = { runtimeId: authority.runtimeId, sessionId: started.sessionId, expectedRevision: 0, action };
    return CampaignCommandSchema.parse({ ...intent, commandId: await campaignIdentity(intent) });
  };
  const refused = await service.command(request, await command(review));
  expect(refused.ok).toBe(false);
  expect(CampaignHttpActionResponseSchema.parse({ apiVersion: '1', data: refused }).data.snapshot.revision).toBe(0);
  const action = { type: 'TRAINING' as const, action: { type: 'GAME' as const, action: { type: 'INSPECT_EVIDENCE' as const, experimentId: 'bass2-b20' } } };
  const intent = { runtimeId: authority.runtimeId, sessionId: started.sessionId, expectedRevision: 0, action };
  const accepted = await service.command(request, { ...intent, commandId: await campaignIdentity(intent) });
  expect(accepted.ok).toBe(true);
  expect(CampaignHttpActionResponseSchema.parse({ apiVersion: '1', data: accepted }).data.snapshot.revision).toBe(1);
  expect(CampaignHttpExportResponseSchema.parse({ apiVersion: '1', data: service.export(request, started.sessionId) }).data.record.events).toHaveLength(1);
  expect(() => service.read(anonymous, started.sessionId)).toThrow();
  expect(CampaignHttpActionResponseSchema.safeParse({ apiVersion: '1', data: { ...accepted, completed: true } }).success).toBe(false);
});
