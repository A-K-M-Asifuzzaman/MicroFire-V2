import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { randomBytes, randomUUID } from 'node:crypto';
import { campaignIdentity, campaignJson, type CampaignAction } from '@microfire/shared';
import { CampaignService } from '../../apps/web/lib/campaign-service';
import { PreviewAuthority, previewConfig } from '../../apps/web/lib/game-preview-security';
import { at, review, core, detective, trial, habitat } from './campaign-helpers';
import { episodeActions } from './training-helpers';
function harness() {
  const config = previewConfig({ MICROFIRE_LOCAL_GAME_PREVIEW: '1', MICROFIRE_PREVIEW_ORIGIN: 'http://127.0.0.1:3290', MICROFIRE_PREVIEW_ACCESS_TOKEN: randomBytes(32).toString('base64url'), MICROFIRE_PREVIEW_SIGNING_KEY: randomBytes(32).toString('base64url'), MICROFIRE_PREVIEW_KEY_ID: 'campaign-test', MICROFIRE_PREVIEW_REALM_ID: randomUUID() })!;
  const authority = new PreviewAuthority(config, () => Date.parse(at));
  const anonymous = new Request(config.origin, { method: 'POST', headers: { host: config.host, origin: config.origin } });
  const cookie = authority.authorize(anonymous, config.accessToken.toString('base64url')).cookie!.split(';')[0]!;
  const request = new Request(anonymous, { headers: { ...Object.fromEntries(anonymous.headers), cookie } });
  const service = new CampaignService(authority, () => Date.parse(at));
  const command = async (snapshot: ReturnType<typeof service.start>, action: CampaignAction) => {
    const intent = { runtimeId: authority.runtimeId, sessionId: snapshot.sessionId, expectedRevision: snapshot.revision, action };
    return { ...intent, commandId: await campaignIdentity(intent) };
  };
  return { service, authority, config, request, anonymous, command };
}
it('server runs the complete campaign, exports source-linked entries and restores authenticated replay after restart', async () => {
  const h = harness(); let snapshot = h.service.start(h.request, randomUUID());
  const actions: CampaignAction[] = [{ type: 'TRAINING', action: episodeActions[0]! }, review,
    ...episodeActions.slice(1).map(action => ({ type: 'TRAINING' as const, action })), ...detective, ...trial,
    core({ type: 'START_MISSION', missionId: 'lunar-habitat' }), habitat, core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }),
    core({ type: 'PROPOSE_NEXT_TEST', question: 'Test lunar gravity and scenario pressure.', limitations: ['B20 is not a lunar test.'] }), core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })];
  for (const action of actions) {
    const command = await h.command(snapshot, action), response = await h.service.command(h.request, command);
    expect(response.ok, JSON.stringify(response.ok ? {} : response)).toBe(true); snapshot = response.snapshot;
    const duplicate = await h.service.command(h.request, command);
    expect(duplicate.snapshot.checkpoint).toBe(snapshot.checkpoint);
    if (response.ok && duplicate.ok) expect(duplicate.feedback).toEqual(response.feedback);
  }
  expect(snapshot.state.passport.entries).toHaveLength(5);
  const exported = h.service.export(h.request, snapshot.sessionId);
  expect(exported.record.events.some(e => e.action.type === 'ASSESS_HABITAT')).toBe(true);
  expect(exported.passport).toEqual(snapshot.state.passport);
  expect(exported.checkpoint).toBe(snapshot.checkpoint); expect(snapshot.revision).toBe(actions.length);
  const restartedAuthority = new PreviewAuthority(h.config, () => Date.parse(at));
  const restarted = new CampaignService(restartedAuthority, () => Date.parse(at));
  expect(() => restarted.resume(h.request, snapshot.checkpoint)).toThrow();
  const cookie = restartedAuthority.authorize(h.anonymous, h.config.accessToken.toString('base64url')).cookie!.split(';')[0]!;
  const request = new Request(h.request, { headers: { ...Object.fromEntries(h.request.headers), cookie } });
  const resumed = restarted.resume(request, snapshot.checkpoint);
  expect(resumed.state).toEqual(snapshot.state); expect(resumed.runtimeId).not.toBe(snapshot.runtimeId);
  expect(resumed.checkpoint).toBe(snapshot.checkpoint);
  expect(() => restarted.resume(request, snapshot.checkpoint.slice(0, -4) + 'AAAA')).toThrow();
  const payload = JSON.parse(Buffer.from(snapshot.checkpoint.split('.')[0]!, 'base64url').toString()); payload.record.events.pop();
  const tampered = Buffer.from(campaignJson(payload)).toString('base64url') + '.' + snapshot.checkpoint.split('.')[1];
  expect(() => restarted.resume(request, tampered)).toThrow();
});
it('server isolates sessions, serializes competing revisions, reconciles missing responses and refuses live rollback', async () => {
  const h = harness(), a = h.service.start(h.request, randomUUID()), b = h.service.start(h.request, randomUUID());
  const inspect: CampaignAction = { type: 'TRAINING', action: episodeActions[0]! };
  const one = await h.command(a, inspect), two = await h.command(a, core({ type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' }));
  const results = await Promise.allSettled([h.service.command(h.request, one), h.service.command(h.request, two)]);
  expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(x => x.status === 'rejected')).toHaveLength(1);
  const current = h.service.read(h.request, a.sessionId); expect(current.revision).toBe(1);
  expect(h.service.read(h.request, b.sessionId).revision).toBe(0);
  expect(() => h.service.resume(h.request, a.checkpoint)).toThrow();
  await expect(h.service.command(h.request, { ...one, sessionId: b.sessionId })).rejects.toThrow();
  expect(() => h.service.read(h.anonymous, a.sessionId)).toThrow();
  h.authority.revoke(h.request); await expect(h.service.command(h.request, await h.command(current, review))).rejects.toThrow();
});
it('campaign identity sorts keys, handles decimal conditions and changes on runtime, revision or action edits', async () => {
  const h = harness(), snapshot = h.service.start(h.request, randomUUID());
  const action: CampaignAction = { type: 'SELECT_EXPERIMENT', experimentId: 'bass2-b20', targetConditions: { oxygenPct: 17.4 } };
  const intent = { runtimeId: h.authority.runtimeId, sessionId: snapshot.sessionId, expectedRevision: 0, action };
  expect(await campaignIdentity(intent)).toBe(await campaignIdentity({ action, expectedRevision: 0, sessionId: snapshot.sessionId, runtimeId: h.authority.runtimeId }));
  expect(await campaignIdentity(intent)).not.toBe(await campaignIdentity({ ...intent, runtimeId: randomUUID() }));
  expect(await campaignIdentity(intent)).not.toBe(await campaignIdentity({ ...intent, expectedRevision: 1 }));
});
it('campaign server refuses expired grants and rotated keys without altering recoverable checkpoints', async () => {
  const h = harness(), snapshot = h.service.start(h.request, randomUUID());
  const expiredAuthority = new PreviewAuthority(h.config, () => Date.parse(at) + 3600001);
  const expired = new CampaignService(expiredAuthority, () => Date.parse(at) + 3600001);
  expect(() => expired.resume(h.request, snapshot.checkpoint)).toThrow();
  const rotatedConfig = { ...h.config, keyId: 'rotated', signingKey: randomBytes(32) };
  const authority = new PreviewAuthority(rotatedConfig, () => Date.parse(at));
  const cookie = authority.authorize(h.anonymous, h.config.accessToken.toString('base64url')).cookie!.split(';')[0]!;
  const request = new Request(h.request, { headers: { ...Object.fromEntries(h.request.headers), cookie } });
  expect(() => new CampaignService(authority, () => Date.parse(at)).resume(request, snapshot.checkpoint)).toThrow();
  expect(h.service.read(h.request, snapshot.sessionId).checkpoint).toBe(snapshot.checkpoint);
});
