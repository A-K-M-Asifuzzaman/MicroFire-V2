// Claude's visitor client (transport + controller) against Codex's real public handler and a disposable PostgreSQL.
// Requests go in-process to the handler with the headers a same-origin browser sends; nothing is mounted in Next.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { CampaignAction } from '@microfire/shared';
import { createPublicCampaignHandler } from '../../apps/web/lib/public-campaign';
import { createPublicTransport, type Fetch } from '../../apps/web/game/campaign/public-transport';
import { createPublicController, type PublicController } from '../../apps/web/game/campaign/public-controller';
import { testDatabase } from './campaign-security-harness';
import { review, core, detective, trial, habitat } from '../unit/campaign-helpers';
import { episodeActions } from '../unit/training-helpers';

const origin = 'https://127.0.0.1:4433';
const secret = () => randomBytes(32).toString('base64url');
const env = { MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1', MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin,
  MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: randomUUID() };

/** A browser profile: one cookie jar, same-origin Fetch Metadata, Origin on POST. `drop` loses the next response after the server handled it. */
function browser(handler: () => (r: Request, a: string) => Promise<Response>) {
  let cookie: string | null = null, drop = 0; const sent: { path: string; body: string | null }[] = [];
  const fetchImpl: Fetch = async (path, init) => {
    const headers = new Headers(init.headers); headers.set('host', new URL(origin).host); headers.set('sec-fetch-site', 'same-origin'); headers.set('sec-fetch-mode', 'cors');
    if (init.method === 'POST') headers.set('origin', origin);
    if (cookie) headers.set('cookie', cookie);
    sent.push({ path, body: typeof init.body === 'string' ? init.body : null });
    const res = await handler()(new Request(origin + path, { method: init.method, headers, body: init.body ?? null }), '127.0.0.1');
    const set = res.headers.get('set-cookie');
    if (set) { const [pair] = set.split(';'); cookie = /Max-Age=0/i.test(set) ? null : pair!; }
    if (drop > 0) { drop--; throw new TypeError('network lost after commit'); }
    return res;
  };
  return { fetchImpl, sent, dropNext() { drop++; }, hasCookie: () => cookie !== null, controller: () => createPublicController(createPublicTransport({ fetchImpl }), { sleep: async () => {} }) };
}

async function play(c: PublicController, action: CampaignAction) {
  assert.equal(await c.act(action), true, 'intent was not sent');
  const s = c.get(); assert.equal(s.phase, 'ready', JSON.stringify({ phase: s.phase, notice: s.notice }));
  const r = s.last!.result; assert(r.ok, `server refused ${JSON.stringify(action).slice(0, 120)}: ${!r.ok ? r.code : ''}`);
  return r;
}

test('visitor client: full five-mission journey, reload recovery, retries, 409, 503, expiry and restart against the real handler', { timeout: 120000 }, async () => {
  const database = await testDatabase(); let pool: Pool = database.pool;
  let handler = createPublicCampaignHandler(env, pool);
  const a = browser(() => handler);
  try {
    // Bootstrap mints a case; a "reload" (new controller, same cookie jar) recovers the same durable case.
    const c1 = a.controller(); await c1.boot();
    assert.equal(c1.get().phase, 'ready'); assert(a.hasCookie());
    const first = c1.get().view!; assert.equal(first.revision, 0);
    await play(c1, { type: 'TRAINING', action: episodeActions[0]! });
    assert.deepEqual(c1.get().accepted.inspected, ['bass2-b20']);
    const reloaded = a.controller(); await reloaded.boot();
    assert.equal(reloaded.get().view!.sessionId, first.sessionId); assert.equal(reloaded.get().view!.revision, 1);
    assert.deepEqual(reloaded.get().accepted.inspected, [], 'tab memory is not persisted across reloads');

    // A domain refusal returns the unchanged view; nothing is inferred locally.
    assert.equal(await reloaded.act(core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })), true);
    const refused = reloaded.get().last!.result; assert(!refused.ok); assert.equal(reloaded.get().view!.revision, 1);

    // Stale tab: c1 still holds revision 1 while `reloaded` advances; c1's next intent gets 409, reconciles, is NOT replayed.
    await play(reloaded, review);
    assert.equal(await c1.act({ type: 'TRAINING', action: episodeActions[1]! }), true);
    assert.equal(c1.get().phase, 'ready'); assert.match(c1.get().notice!, /already moved on/);
    assert.equal(c1.get().view!.revision, 2, 'reconciled to the server head without applying the stale intent');

    // Network loss after commit: identical bytes are resent and the stored response is returned; revision moves once.
    const before = a.sent.length; a.dropNext();
    await play(c1, { type: 'TRAINING', action: episodeActions[1]! });
    const resent = a.sent.slice(before).filter((s) => s.path.endsWith('/action'));
    assert.equal(resent.length, 2); assert.equal(resent[0]!.body, resent[1]!.body);
    assert.equal(c1.get().view!.revision, 3);

    // Storage outage: 503 keeps the intent; retry after recovery sends the same bytes once.
    const broken = new Pool(database.options); await broken.end(); handler = createPublicCampaignHandler(env, broken);
    assert.equal(await c1.act({ type: 'TRAINING', action: episodeActions[2]! }), true);
    assert.equal(c1.get().phase, 'unavailable'); assert.equal(c1.get().canRetry, true);
    assert.equal(await c1.act({ type: 'TRAINING', action: episodeActions[3]! }), false, 'no second write while one is pending');
    handler = createPublicCampaignHandler(env, pool); await c1.retry();
    assert.equal(c1.get().phase, 'ready'); assert.equal(c1.get().view!.revision, 4);

    // Rest of the journey through the client, every mission decided by the server.
    const rest: CampaignAction[] = [...episodeActions.slice(3).map((action) => ({ type: 'TRAINING' as const, action })), ...detective, ...trial,
      core({ type: 'START_MISSION', missionId: 'lunar-habitat' }), habitat, core({ type: 'RECORD_DECISION', verdict: 'insufficient-evidence' }),
      core({ type: 'PROPOSE_NEXT_TEST', question: 'Measure lunar gravity and pressure.', limitations: ['B20 is not lunar evidence.'] }), core({ type: 'COMPLETE_MISSION', missionId: 'lunar-habitat' })];
    for (const action of rest) await play(c1, action);
    const done = c1.get();
    assert.equal(done.view!.completedMissions.length, 5); assert.equal(done.view!.passport.entries.length, 5);
    assert.equal(Object.keys(done.accepted.appraisals).length, 4); assert.equal(done.accepted.decision, 'insufficient-evidence');
    const exported = await c1.exportPassport(); assert.equal(exported!.passport.entries.length, 5); assert.equal(exported!.sessionId, first.sessionId);

    // Database restart: the case survives; a reload recovers it.
    database.restart(); pool = new Pool(database.options); handler = createPublicCampaignHandler(env, pool);
    const afterRestart = a.controller(); await afterRestart.boot();
    assert.equal(afterRestart.get().view!.revision, done.view!.revision);

    // Expiry: the server refuses and clears the cookie; the client asks for an explicit restart instead of minting silently.
    await database.pool.query("UPDATE microfire_campaign_visitors SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1", [first.sessionId]);
    assert.equal(await afterRestart.act(core({ type: 'START_MISSION', missionId: 'flame-detective' })), true);
    assert.equal(afterRestart.get().phase, 'expired'); assert.equal(a.hasCookie(), false);
    const stillExpired = afterRestart.get().view!; assert.equal(stillExpired.sessionId, first.sessionId, 'old view kept for display, not replaced');
    await afterRestart.restart();
    assert.equal(afterRestart.get().phase, 'ready'); assert.notEqual(afterRestart.get().view!.sessionId, first.sessionId); assert.equal(afterRestart.get().view!.revision, 0);

    // Explicit restart of a live case revokes it first.
    const old = afterRestart.get().view!.sessionId; await afterRestart.restart();
    assert.notEqual(afterRestart.get().view!.sessionId, old);
    const revoked = await database.pool.query('SELECT revoked FROM microfire_campaign_visitors WHERE session_id=$1', [old]);
    assert.equal(revoked.rows[0].revoked, true);

    // Rate limit: 429 is surfaced with Retry-After and never turned into a new case.
    await database.pool.query('UPDATE microfire_campaign_budgets SET hits=10000 WHERE realm=$1', [env.MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID]);
    const limited = a.controller(); await limited.boot();
    assert.equal(limited.get().phase, 'rate-limited'); assert(limited.get().retryAt! > Date.now());

    // Disabled server: 404 is reported as "not enabled", never as an operator-token prompt.
    handler = createPublicCampaignHandler({ ...env, MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '0' }, pool);
    const off = a.controller(); await off.boot(); assert.equal(off.get().phase, 'disabled');
  } finally { if (pool !== database.pool) await pool.end().catch(() => {}); await database.close(); }
});
