import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { chromium } from '@playwright/test';
import { CampaignAuthorizeResponseSchema, CampaignHttpCapabilityResponseSchema, CampaignHttpSnapshotResponseSchema, CampaignHttpActionResponseSchema,
  PublicCampaignBootstrapResponseSchema, PublicCampaignViewResponseSchema, PublicCampaignActionResponseSchema, campaignIdentity, type CampaignAction } from '@microfire/shared';
import { createLoopbackCampaignHandler } from '../../apps/web/lib/campaign-http';
import { createPublicCampaignHandler, PublicCampaignService, publicCampaignConfig } from '../../apps/web/lib/public-campaign';
import { campaignConfig } from '../../apps/web/lib/campaign-security';
import { PreviewAuthority, previewConfig, localPreviewRequest } from '../../apps/web/lib/game-preview-security';
import { testDatabase, testServer, wire } from './campaign-security-harness';
import { review, core, detective, trial, habitat } from '../unit/campaign-helpers';
import { episodeActions } from '../unit/training-helpers';
const localBase = '/api/game/campaign/v1', publicBase = '/api/game/public-campaign/v1';
const secret = () => randomBytes(32).toString('base64url');
const localEnv = () => ({ MICROFIRE_LOCAL_CAMPAIGN: '1', MICROFIRE_CAMPAIGN_ACCESS_TOKEN: secret(), MICROFIRE_CAMPAIGN_SIGNING_KEY: secret(), MICROFIRE_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_CAMPAIGN_KEY_ID: 'http-test' });
const publicEnv = () => ({ MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1', MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: randomUUID() });
const cookie = (response: Awaited<ReturnType<typeof wire>>) => response.headers['set-cookie']![0]!.split(';')[0]!;
const inspect: CampaignAction = { type: 'TRAINING', action: episodeActions[0]! };
async function command(snapshot: { runtimeId: string; sessionId: string; revision: number }, action: CampaignAction) {
  const intent = { runtimeId: snapshot.runtimeId, sessionId: snapshot.sessionId, expectedRevision: snapshot.revision, action };
  return { ...intent, commandId: await campaignIdentity(intent) };
}

test('loopback real HTTP: separate credentials, cookie/proof, ownership, revoke/expiry/restart, replay and boundaries', { timeout: 60000 }, async () => {
  const env = localEnv(); let clock = Date.now();
  const factory = (origin: string) => createLoopbackCampaignHandler({ ...env, MICROFIRE_CAMPAIGN_ORIGIN: origin }, () => clock);
  const server = await testServer(factory);
  try {
    const capability = CampaignHttpCapabilityResponseSchema.parse((await wire(server.origin, localBase + '/capability')).body).data;
    const auth = async () => {
      const response = await wire(server.origin, localBase + '/authorize', { approvalToken: env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN });
      assert.equal(response.status, 200); const grant = CampaignAuthorizeResponseSchema.parse(response.body).data;
      assert(!JSON.stringify(response.body).includes(env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN));
      return { cookie: cookie(response), 'x-microfire-campaign-csrf': grant.csrfToken };
    };
    const a = await auth(), id = randomUUID();
    const start = await wire(server.origin, localBase + '/start', { runtimeId: capability.runtimeId, sessionId: id }, a);
    assert.equal(start.status, 200); const first = CampaignHttpSnapshotResponseSchema.parse(start.body).data;
    const b = await auth();
    for (const [path, body, headers] of [
      ['/session/' + id, undefined, b], ['/export/' + id, undefined, b],
      ['/start', { runtimeId: capability.runtimeId, sessionId: id }, b],
      ['/action', await command(first, inspect), b], ['/resume', { runtimeId: capability.runtimeId, checkpoint: first.checkpoint }, b]
    ] as const) assert.equal((await wire(server.origin, localBase + path, body, headers)).status, 404);
    assert.equal((await wire(server.origin, localBase + '/session/' + id, undefined, { cookie: a.cookie })).status, 403, 'Stolen cookie alone must not authorize');
    const intent = await command(first, inspect), accepted = await wire(server.origin, localBase + '/action', intent, a);
    assert.equal(accepted.status, 200); const second = CampaignHttpActionResponseSchema.parse(accepted.body).data.snapshot;
    assert.deepEqual((await wire(server.origin, localBase + '/action', intent, a)).body, accepted.body);
    assert.equal((await wire(server.origin, localBase + '/action', { ...intent, action: review }, a)).status, 409);
    const raced = await Promise.all([command(second, review), command(second, core({ type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' }))]);
    const results = await Promise.all(raced.map(input => wire(server.origin, localBase + '/action', input, a)));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal((await wire(server.origin, localBase + '/resume', { runtimeId: capability.runtimeId, checkpoint: first.checkpoint }, a)).status, 409);
    assert.equal((await wire(server.origin, localBase + '/resume', { runtimeId: capability.runtimeId, checkpoint: first.checkpoint.slice(0, -4) + 'AAAA' }, a)).status, 400);
    for (const h of [{ ...a, origin: 'http://127.0.0.1:1' }, { ...a, 'sec-fetch-site': 'same-site' }, { ...a, 'sec-fetch-mode': 'no-cors' }, { ...a, host: 'evil.example' }, { ...a, forwarded: 'for=127.0.0.1' }])
      assert.equal((await wire(server.origin, localBase + '/session/' + id, undefined, h)).status, 403);
    assert.equal((await wire(server.origin, localBase + '/action', 'x'.repeat(65537), a)).status, 413);
    assert.equal((await wire(server.origin, localBase + '/action', '{"runtimeId":"x","runtimeId":"y"}', a)).status, 400);
    assert.equal((await wire(server.origin, localBase + '/start', { runtimeId: randomUUID(), sessionId: randomUUID() }, a)).status, 409);
    const current = CampaignHttpSnapshotResponseSchema.parse((await wire(server.origin, localBase + '/session/' + id, undefined, a)).body).data;
    assert.equal((await wire(server.origin, localBase + '/revoke', {}, a)).status, 200);
    assert.equal((await wire(server.origin, localBase + '/session/' + id, undefined, a)).status, 403);
    clock += 3600001;
    assert.equal((await wire(server.origin, localBase + '/capability', undefined, b)).status, 200);
    assert.equal((await wire(server.origin, localBase + '/session/' + id, undefined, b)).status, 403);
    server.replace(factory);
    assert.equal((await wire(server.origin, localBase + '/session/' + id, undefined, b)).status, 403);
    const fresh = await auth(), runtime = CampaignHttpCapabilityResponseSchema.parse((await wire(server.origin, localBase + '/capability', undefined, fresh)).body).data.runtimeId;
    const restored = await wire(server.origin, localBase + '/resume', { runtimeId: runtime, checkpoint: current.checkpoint }, fresh);
    assert.equal(restored.status, 200); const restoredSnapshot = CampaignHttpSnapshotResponseSchema.parse(restored.body).data;
    assert.equal(restoredSnapshot.revision, current.revision); assert(restoredSnapshot.checkpoint !== current.checkpoint);
    server.replace(origin => createLoopbackCampaignHandler({ ...env, MICROFIRE_CAMPAIGN_ORIGIN: origin, VERCEL_ENV: 'production' }));
    assert.equal((await wire(server.origin, localBase + '/capability', undefined, fresh)).status, 404);
    server.replace(origin => createLoopbackCampaignHandler({ ...env, MICROFIRE_CAMPAIGN_ORIGIN: origin, MICROFIRE_LOCAL_CAMPAIGN: '0' }));
    assert.equal((await wire(server.origin, localBase + '/capability')).status, 404);
    assert.equal(campaignConfig({ ...env, MICROFIRE_CAMPAIGN_ORIGIN: server.origin, MICROFIRE_PREVIEW_ACCESS_TOKEN: env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN }), null);
  } finally { await server.close(); }
});

test('loopback real browser: cross-port same-site attacks and M2 cookie isolation', { timeout: 60000 }, async () => {
  const env = localEnv(); let preview: PreviewAuthority;
  const server = await testServer(origin => {
    const c = previewConfig({ MICROFIRE_LOCAL_GAME_PREVIEW: '1', MICROFIRE_PREVIEW_ORIGIN: origin, MICROFIRE_PREVIEW_ACCESS_TOKEN: secret(), MICROFIRE_PREVIEW_SIGNING_KEY: secret(), MICROFIRE_PREVIEW_REALM_ID: randomUUID(), MICROFIRE_PREVIEW_KEY_ID: 'm2-unchanged' })!;
    preview = new PreviewAuthority(c); const handler = createLoopbackCampaignHandler({ ...env, MICROFIRE_CAMPAIGN_ORIGIN: origin });
    return async request => {
      if (new URL(request.url).pathname === '/api/game/preview/probe') {
        try { assert(localPreviewRequest(request, c)); preview.require(request); return Response.json({ authorized: true }); } catch { return new Response(null, { status: 403 }); }
      }
      return handler(request);
    };
  });
  const attacker = await testServer(() => async () => Response.json({ untrustedOrigin: true }));
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(), page = await context.newPage(); await page.goto(server.origin);
    const grant = await page.evaluate(async ({ base, token }) => {
      const r = await fetch(base + '/authorize', { method: 'POST', headers: { 'content-type': 'application/json', 'x-microfire-campaign': '1' }, body: JSON.stringify({ approvalToken: token }) }); return r.json();
    }, { base: localBase, token: env.MICROFIRE_CAMPAIGN_ACCESS_TOKEN });
    const proof = CampaignAuthorizeResponseSchema.parse(grant).data.csrfToken;
    const cap = CampaignHttpCapabilityResponseSchema.parse(await page.evaluate(async ({ base, proof }) => (await fetch(base + '/capability', { headers: { 'x-microfire-campaign': '1', 'x-microfire-campaign-csrf': proof } })).json(), { base: localBase, proof })).data;
    const id = randomUUID();
    assert.equal(await page.evaluate(async ({ base, proof, runtime, id }) => (await fetch(base + '/start', { method: 'POST', headers: { 'content-type': 'application/json', 'x-microfire-campaign': '1', 'x-microfire-campaign-csrf': proof }, body: JSON.stringify({ runtimeId: runtime, sessionId: id }) })).status, { base: localBase, proof, runtime: cap.runtimeId, id }), 200);
    const cookies = await context.cookies(server.origin + localBase + '/session/' + id), campaign = cookies.find(c => c.name === 'microfire_campaign_grant')!;
    assert(campaign.httpOnly && campaign.path === localBase && !campaign.secure);
    const m2request = new Request(server.origin + '/api/game/preview/authorize', { method: 'POST', headers: { origin: server.origin, host: new URL(server.origin).host } });
    const m2grant = preview!.authorize(m2request, preview!.config.accessToken.toString('base64url')).cookie!.split(';')[0]!;
    assert.equal((await wire(server.origin, '/api/game/preview/probe', undefined, { cookie: m2grant })).status, 200);
    assert.equal((await wire(server.origin, '/api/game/preview/probe', undefined, { cookie: 'microfire_campaign_grant=' + campaign.value })).status, 403);
    assert.equal((await wire(server.origin, localBase + '/session/' + id, undefined, { cookie: m2grant, 'x-microfire-campaign-csrf': proof })).status, 403);
    await page.goto(attacker.origin);
    for (const method of ['GET', 'POST']) await page.evaluate(async ({ url, method }) => { try { await fetch(url, { method, mode: 'no-cors', credentials: 'include', ...(method === 'POST' ? { body: '{}' } : {}) }); } catch { /* CORP may also block the opaque error response. */ } }, { url: server.origin + localBase + '/session/' + id, method });
    const blocked = server.events.filter(e => e.site === 'same-site');
    assert(blocked.length >= 2 && blocked.every(e => e.status === 403)); assert(blocked.some(e => e.campaignCookie));
    await page.evaluate(async url => { try { await fetch(url, { credentials: 'include', headers: { 'x-microfire-campaign': '1' } }); } catch { /* Browser denies the ungranted CORS preflight. */ } }, server.origin + localBase + '/session/' + id);
    assert(server.events.some(e => e.method === 'OPTIONS' && e.status === 403));
    await page.goto(server.origin);
    assert.equal(await page.evaluate(async ({ url, proof }) => (await fetch(url, { headers: { 'x-microfire-campaign': '1', 'x-microfire-campaign-csrf': proof } })).status, { url: localBase + '/session/' + id, proof }), 200);
    await context.close();
  } finally { await browser.close(); await attacker.close(); await server.close(); }
});

test('public real PostgreSQL/HTTPS: visitor isolation, CSRF, full progression, multi-instance retry/restore, expiry/revoke and abuse', { timeout: 120000 }, async () => {
  const database = await testDatabase(), env = publicEnv(), secondPool = new Pool(database.options);
  secondPool.on('error', () => {});
  const server = await testServer(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, database.pool), true);
  const call = (path: string, body?: unknown, headers: Record<string, string> = {}) => wire(server.origin, publicBase + path, body, headers);
  try {
    await assert.rejects(database.pool.query('CREATE TABLE unauthorized_should_not_exist(id int)'), /permission denied/);
    assert.equal((await call('/session')).status, 403);
    const bootstrap = await call('/session', {}); assert.equal(bootstrap.status, 200);
    const a = PublicCampaignBootstrapResponseSchema.parse(bootstrap.body).data, headers = { cookie: cookie(bootstrap), 'x-microfire-csrf': a.csrfToken };
    assert(bootstrap.headers['set-cookie']![0]!.includes('Secure; HttpOnly; SameSite=Strict'));
    const serialized = JSON.stringify(bootstrap.body); for (const field of ['"training":', '"record":', '"checkpoint":', '"fault":', '"expected":']) assert(!serialized.includes(field));
    assert.equal(a.view.diagnostic, null); assert.deepEqual(a.view.trialStatements, []);
    const other = await call('/session', {}), b = PublicCampaignBootstrapResponseSchema.parse(other.body).data;
    assert(b.view.sessionId !== a.view.sessionId);
    const foreign = await command(a.view, inspect);
    assert.equal((await call('/action', foreign, { cookie: cookie(other), 'x-microfire-csrf': b.csrfToken })).status, 404);
    assert.equal((await call('/action', foreign, { cookie: cookie(other), 'x-microfire-csrf': a.csrfToken })).status, 403);
    assert.equal((await call('/action', foreign, { cookie: headers.cookie })).status, 403);
    const badAction = await call('/action', await command(a.view, core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })), headers);
    assert.equal(badAction.status, 200);
    const refusedAction = PublicCampaignActionResponseSchema.parse(badAction.body).data;
    assert(!refusedAction.ok && refusedAction.view.revision === 0);
    const accepted = await call('/action', foreign, headers); assert.equal(accepted.status, 200);
    assert.deepEqual((await call('/action', foreign, headers)).body, accepted.body);
    let view = PublicCampaignActionResponseSchema.parse(accepted.body).data.view;
    server.replace(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, secondPool));
    assert.equal(PublicCampaignViewResponseSchema.parse((await call('/session', undefined, headers)).body).data.revision, view.revision);
    assert.equal((await call('/resume', { checkpoint: 'attacker-old-state' }, headers)).status, 400);
    assert.equal((await call('/action', { ...foreign, action: review }, headers)).status, 409);
    const raced = await Promise.all([command(view, review), command(view, core({ type: 'INSPECT_EVIDENCE', experimentId: 'bass2-b20' }))]);
    const peer = createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: server.origin }, database.pool);
    const peerRequest = new Request(server.origin + publicBase + '/action', { method: 'POST', headers: { ...headers, host: new URL(server.origin).host, origin: server.origin, 'content-type': 'application/json', 'x-microfire-campaign': '1' }, body: JSON.stringify(raced[1]) });
    const results = await Promise.all([call('/action', raced[0], headers), peer(peerRequest, '127.0.0.1')]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    view = PublicCampaignViewResponseSchema.parse((await call('/session', undefined, headers)).body).data;
    // The race may have accepted source review or a second inspection; repeat source review deliberately, then complete all missions.
    const actions: CampaignAction[] = [review, ...episodeActions.slice(1).map(action => ({ type: 'TRAINING' as const, action })), ...detective, ...trial,
      core({ type: 'START_MISSION', missionId: 'lunar-habitat' }), habitat, core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }),
      core({ type: 'PROPOSE_NEXT_TEST', question: 'Measure lunar gravity and pressure.', limitations: ['B20 is not lunar evidence.'] }), core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })];
    for (const action of actions) {
      const result = await call('/action', await command(view, action), headers); assert.equal(result.status, 200);
      const response = PublicCampaignActionResponseSchema.parse(result.body).data; assert(response.ok, 'Campaign rule refused a test journey action'); view = response.view;
    }
    assert.equal(view.completedMissions.length, 5); assert.equal(view.passport.entries.length, 5);
    database.restart();
    assert.equal(PublicCampaignViewResponseSchema.parse((await call('/session', undefined, headers)).body).data.revision, view.revision);
    const failedPool = new Pool(database.options); await failedPool.end();
    server.replace(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, failedPool));
    assert.equal((await call('/session', undefined, headers)).status, 503);
    server.replace(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, secondPool));
    assert.equal(PublicCampaignViewResponseSchema.parse((await call('/session', undefined, headers)).body).data.revision, view.revision);
    assert.equal((await call('/resume', {}, headers)).status, 200);
    const invalidHeaders = [{ ...headers, origin: 'https://evil.example' }, { ...headers, 'sec-fetch-site': 'same-site' }, { ...headers, 'sec-fetch-mode': 'no-cors' }];
    for (const h of invalidHeaders) assert.equal((await call('/session', undefined, h)).status, 403);
    assert.equal((await call('/action', 'x'.repeat(65537), headers)).status, 413);
    assert.equal((await call('/session', { state: { completed: true } })).status, 400);
    const extra = await call('/session', {}), c = PublicCampaignBootstrapResponseSchema.parse(extra.body).data;
    const cHeaders = { cookie: cookie(extra), 'x-microfire-csrf': c.csrfToken };
    const revokeRace = await Promise.all([call('/action', await command(c.view, inspect), cHeaders), call('/revoke', {}, cHeaders)]);
    assert([200, 403].includes(revokeRace[0]!.status)); assert.equal(revokeRace[1]!.status, 200);
    assert.equal((await call('/action', await command(c.view, inspect), cHeaders)).status, 403);
    assert.equal((await call('/revoke', {}, headers)).status, 200);
    assert.equal((await call('/session', undefined, headers)).status, 403);
    await database.pool.query("UPDATE microfire_campaign_visitors SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1", [b.view.sessionId]);
    const expired = await call('/session', undefined, { cookie: cookie(other) });
    assert.equal(expired.status, 403); assert(expired.headers['set-cookie']![0]!.includes('Max-Age=0'));
    const purged = await database.pool.query('DELETE FROM microfire_campaign_visitors WHERE expires_at<=clock_timestamp() OR revoked');
    assert.equal(purged.rowCount, 3);
    assert.equal((await database.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_heads')).rows[0].n, 0);
    await database.pool.query("UPDATE microfire_campaign_budgets SET hits=10000 WHERE realm=$1", [env.MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID]);
    const limited = await call('/session', {}, { 'x-forwarded-for': '192.0.2.12' }); assert.equal(limited.status, 429); assert.equal(limited.headers['retry-after'], '60');
    server.replace(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin, MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '0', VERCEL_ENV: 'production' }, database.pool));
    assert.equal((await call('/session', {})).status, 404);
  } finally { await server.close(); await secondPool.end(); await database.close(); }
});

test('public real browser: Secure HttpOnly visitor sessions, independent contexts and origin/CSRF refusal', { timeout: 120000 }, async () => {
  const database = await testDatabase(), env = publicEnv();
  const server = await testServer(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, database.pool), true);
  const attacker = await testServer(() => async () => Response.json({ untrustedOrigin: true }), true);
  const browser = await chromium.launch({ headless: true });
  try {
    const first = await browser.newContext({ ignoreHTTPSErrors: true }), second = await browser.newContext({ ignoreHTTPSErrors: true });
    const a = await first.newPage(), b = await second.newPage(); await a.goto(server.origin); await b.goto(server.origin);
    const bootstrap = async (page: typeof a) => PublicCampaignBootstrapResponseSchema.parse(await page.evaluate(async base => (await fetch(base + '/session', { method: 'POST', headers: { 'content-type': 'application/json', 'x-microfire-campaign': '1' }, body: '{}' })).json(), publicBase)).data;
    const one = await bootstrap(a), two = await bootstrap(b); assert(one.view.sessionId !== two.view.sessionId);
    const cookieInfo = (await first.cookies())[0]!; assert(cookieInfo.name === '__Host-microfire_campaign_session' && cookieInfo.secure && cookieInfo.httpOnly && cookieInfo.path === '/');
    assert.equal(await a.evaluate(() => document.cookie), '');
    const intent = await command(one.view, inspect);
    const action = (page: typeof a, csrf: string) => page.evaluate(async ({ base, intent, csrf }) => (await fetch(base + '/action', { method: 'POST', headers: { 'content-type': 'application/json', 'x-microfire-campaign': '1', 'x-microfire-csrf': csrf }, body: JSON.stringify(intent) })).status, { base: publicBase, intent, csrf });
    assert.equal(await action(b, two.csrfToken), 404); assert.equal(await action(a, ''), 403); assert.equal(await action(a, one.csrfToken), 200);
    server.replace(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, database.pool));
    await a.reload(); const recovered = await bootstrap(a); assert.equal(recovered.view.revision, 1);
    await a.goto(attacker.origin);
    await a.evaluate(async url => { try { await fetch(url, { mode: 'no-cors', credentials: 'include' }); } catch { /* CORP blocks foreign error responses. */ } }, server.origin + publicBase + '/session');
    assert(server.events.some(e => e.site === 'same-site' && e.status === 403));
    await first.close(); await second.close();
  } finally { await browser.close(); await attacker.close(); await server.close(); await database.close(); }
});


test('public storage: bootstrap/action fault rollback and shared budgets persist across pools and database restart', { timeout: 120000 }, async () => {
  const database = await testDatabase(), env = publicEnv();
  const admin = new Pool({ ...database.options, user: 'microfire_test' });
  let peerPool = new Pool(database.options);
  admin.on('error', () => {}); peerPool.on('error', () => {});
  const server = await testServer(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, database.pool), true);
  const call = (path: string, body?: unknown, headers: Record<string, string> = {}) => wire(server.origin, publicBase + path, body, headers);
  try {
    // Deliberately fail the second write: the visitor inserted earlier in the transaction must disappear too.
    await admin.query(`CREATE FUNCTION reject_campaign_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-only injected failure'; END $$;
      CREATE TRIGGER reject_campaign_insert AFTER INSERT ON microfire_campaign_heads FOR EACH ROW EXECUTE FUNCTION reject_campaign_write()`);
    const failedBootstrap = await call('/session', {});
    assert.equal(failedBootstrap.status, 503); assert(!failedBootstrap.headers['set-cookie']);
    assert(!JSON.stringify(failedBootstrap.body).includes('injected failure'));
    assert.equal((await database.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_visitors')).rows[0].n, 0);
    assert.equal((await database.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_heads')).rows[0].n, 0);
    await admin.query('DROP TRIGGER reject_campaign_insert ON microfire_campaign_heads');
    const boot = await call('/session', {}), visitor = PublicCampaignBootstrapResponseSchema.parse(boot.body).data;
    const headers = { cookie: cookie(boot), 'x-microfire-csrf': visitor.csrfToken }, intent = await command(visitor.view, inspect);
    await admin.query('CREATE TRIGGER reject_campaign_update AFTER UPDATE ON microfire_campaign_heads FOR EACH ROW EXECUTE FUNCTION reject_campaign_write()');
    assert.equal((await call('/action', intent, headers)).status, 503);
    const saved = (await database.pool.query('SELECT revision,record,last_command,last_response FROM microfire_campaign_heads')).rows[0];
    assert.equal(saved.revision, 0); assert.equal(saved.record.events.length, 0); assert.equal(saved.last_command, null); assert.equal(saved.last_response, null);
    assert.equal(PublicCampaignViewResponseSchema.parse((await call('/session', undefined, headers)).body).data.revision, 0);
    await admin.query('DROP TRIGGER reject_campaign_update ON microfire_campaign_heads; DROP FUNCTION reject_campaign_write()');
    assert.equal((await call('/action', intent, headers)).status, 200);
    // A distinct realm isolates this budget probe from normal HTTP request windows.
    const config = publicCampaignConfig({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: server.origin })!;
    const a = new PublicCampaignService(config, database.pool), b = new PublicCampaignService(config, peerPool);
    const raced = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).budget('shared-probe', 4)));
    assert.equal(raced.filter(r => r.status === 'fulfilled').length, 4);
    assert(raced.filter(r => r.status === 'rejected').every(r => r.reason.status === 429));
    assert.equal((await database.pool.query('SELECT sum(hits)::int AS n FROM microfire_campaign_budgets WHERE realm=$1', [config.realmId])).rows[0].n, 12);
    await peerPool.end(); database.restart();
    peerPool = new Pool(database.options); peerPool.on('error', () => {});
    const rebuilt = new PublicCampaignService(config, peerPool);
    await assert.rejects(rebuilt.budget('shared-probe', 4), (e: unknown) => e instanceof Error && 'status' in e && e.status === 429);
    assert.equal((await peerPool.query('SELECT sum(hits)::int AS n FROM microfire_campaign_budgets WHERE realm=$1', [config.realmId])).rows[0].n, 13);
    server.replace(origin => createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, peerPool));
    assert.equal(PublicCampaignViewResponseSchema.parse((await call('/session', undefined, headers)).body).data.revision, 1);
  } finally { await server.close(); await peerPool.end(); await admin.end(); await database.close(); }
});
