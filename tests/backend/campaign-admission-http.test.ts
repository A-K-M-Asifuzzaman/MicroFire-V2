import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import { HttpFailureSchema, PublicCampaignBootstrapResponseSchema } from '@microfire/shared';
import { createPublicCampaignHandler, PublicCampaignService, publicCampaignConfig } from '../../apps/web/lib/public-campaign';
import { testDatabase, testServer, wire } from './campaign-security-harness';

const base = '/api/game/public-campaign/v1';
const secret = () => randomBytes(32).toString('base64url');
const env = () => ({ MICROFIRE_PUBLIC_CAMPAIGN_ENABLED: '1', MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL: 'public-campaign-v1',
  MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: 'https://campaign.example', MICROFIRE_PUBLIC_CAMPAIGN_CSRF_KEY: secret(), MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY: secret(),
  MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID(), MICROFIRE_PUBLIC_CAMPAIGN_RUNTIME_ID: randomUUID() });
const hash = (e: ReturnType<typeof env>, subject: string) => createHmac('sha256', Buffer.from(e.MICROFIRE_PUBLIC_CAMPAIGN_ABUSE_KEY, 'base64url')).update(subject).digest('hex');
async function windowStart(pool: Pool) {
  // Leave enough real SQL-minute time for the 2,000-request fixture; no production clock override.
  const seconds = Number((await pool.query('SELECT extract(second FROM clock_timestamp()) AS seconds')).rows[0].seconds);
  if (seconds > 15) await delay((60 - seconds + 0.05) * 1000);
}
async function hits(pool: Pool, e: ReturnType<typeof env>, subject: string) {
  const r = await pool.query('SELECT coalesce(sum(hits),0)::int AS n FROM microfire_campaign_budgets WHERE realm=$1 AND bucket_hash=$2', [e.MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID, hash(e, subject)]);
  return r.rows[0].n as number;
}
async function seed(pool: Pool, e: ReturnType<typeof env>, subject: string, n: number) {
  await pool.query(`INSERT INTO microfire_campaign_budgets(realm,bucket_hash,window_at,hits,expires_at)
    VALUES($1,$2,date_trunc('minute',clock_timestamp()),$3,clock_timestamp()+interval '2 days')`, [e.MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID, hash(e, subject), n]);
}

test('admission real HTTP: original 2,000-request attack cannot charge global work after address refusal', { timeout: 120000 }, async () => {
  const db = await testDatabase(), e = env(); let address = '192.0.2.1';
  const server = await testServer(origin => {
    const handler = createPublicCampaignHandler({ ...e, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, db.pool);
    // Only the fixture controls this adapter address. Incoming forwarding headers never select it.
    return request => handler(request, address);
  }, true);
  try {
    await windowStart(db.pool);
    const counts: Record<number, number> = {};
    for (let i = 0; i < 2000; i++) {
      const r = await wire(server.origin, base + '/does-not-exist'); counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === 429) {
        assert.deepEqual(HttpFailureSchema.parse(r.body).error, { code: 'RATE_LIMITED', message: 'Campaign request budget reached.', retryable: true });
        assert.equal(r.headers['retry-after'], '60'); assert.equal(r.headers['set-cookie'], undefined);
        assert.equal(r.headers['cache-control'], 'no-store');
      }
    }
    assert.deepEqual(counts, { 404: 240, 429: 1760 });
    assert.equal(await hits(db.pool, e, 'edge:192.0.2.1'), 240); assert.equal(await hits(db.pool, e, 'edge-global'), 240);
    const forged = await wire(server.origin, base + '/session', {}, { 'x-forwarded-for': '198.51.100.1', 'x-real-ip': '198.51.100.1' });
    assert.equal(forged.status, 429); assert.equal(await hits(db.pool, e, 'edge-global'), 240);
    address = '198.51.100.1';
    const fresh = await wire(server.origin, base + '/session', {}); assert.equal(fresh.status, 200);
    PublicCampaignBootstrapResponseSchema.parse(fresh.body); assert.equal(await hits(db.pool, e, 'edge-global'), 241);
    console.log('Original attack: 240 admitted404 + 1760 throttled429; global240; forged forwarding refused; fresh visitor200/global241.');
  } finally { await server.close(); await db.close(); }
});

test('admission PostgreSQL: independent instances reserve address/global atomically and retain capacity limits', { timeout: 120000 }, async () => {
  const db = await testDatabase(), peer = new Pool(db.options), e = env(); peer.on('error', () => {});
  try {
    await windowStart(db.pool);
    const config = publicCampaignConfig(e)!, a = new PublicCampaignService(config, db.pool), b = new PublicCampaignService(config, peer);
    await seed(db.pool, e, 'edge-global', 1998);
    const raced = await Promise.allSettled(Array.from({ length: 24 }, (_, i) => (i % 2 ? a : b).admit('192.0.2.' + (i + 1))));
    assert.equal(raced.filter(r => r.status === 'fulfilled').length, 2);
    assert(raced.filter(r => r.status === 'rejected').every(r => r.reason.status === 429));
    assert.equal(await hits(db.pool, e, 'edge-global'), 2000);
    const addresses = await db.pool.query('SELECT count(*)::int AS rows,sum(hits)::int AS hits FROM microfire_campaign_budgets WHERE realm=$1 AND bucket_hash<>$2', [config.realmId, hash(e, 'edge-global')]);
    assert.deepEqual(addresses.rows[0], { rows: 2, hits: 2 });
    await assert.rejects(b.admit('198.51.100.1'), { status: 429 }); assert.equal(await hits(db.pool, e, 'edge:198.51.100.1'), 0);
    const other = { ...e, MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID: randomUUID() }, c = new PublicCampaignService(publicCampaignConfig(other)!, db.pool), d = new PublicCampaignService(publicCampaignConfig(other)!, peer);
    const sameAddress = await Promise.allSettled(Array.from({ length: 300 }, (_, i) => (i % 2 ? c : d).admit('203.0.113.1')));
    assert.equal(sameAddress.filter(r => r.status === 'fulfilled').length, 240);
    assert(sameAddress.filter(r => r.status === 'rejected').every(r => r.reason.status === 429));
    assert.equal(await hits(db.pool, other, 'edge-global'), 240); assert.equal(await hits(db.pool, other, 'edge:203.0.113.1'), 240);
    await assert.rejects(c.admit('203.0.113.1'), { status: 429 }); await d.admit('203.0.113.2');
    assert.equal(await hits(db.pool, other, 'edge-global'), 241);
    console.log('Two-pool races: global1998 admits exactly2; address race admits exactly240/300; denied reservations leave no partial counts.');
  } finally { await peer.end(); await db.close(); }
});

test('admission real HTTP: SQL faults, global lock timeout and storage outage fail closed without partial reservation', { timeout: 120000 }, async () => {
  const db = await testDatabase(), admin = new Pool({ ...db.options, user: 'microfire_test' }), e = env(); admin.on('error', () => {});
  let address = '192.0.2.1';
  const factory = (origin: string) => {
    const handler = createPublicCampaignHandler({ ...e, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, db.pool); return (r: Request) => handler(r, address);
  };
  const server = await testServer(factory, true);
  try {
    await windowStart(db.pool);
    await admin.query(`CREATE FUNCTION admission_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.bucket_hash=TG_ARGV[0] THEN RAISE EXCEPTION 'private-test-db-error'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER admission_failure AFTER INSERT OR UPDATE ON microfire_campaign_budgets FOR EACH ROW EXECUTE FUNCTION admission_fault('${hash(e, 'edge-global')}')`);
    const failed = await wire(server.origin, base + '/session', {}); assert.equal(failed.status, 503);
    assert(!JSON.stringify(failed.body).includes('private-test-db-error')); assert.equal(failed.headers['set-cookie'], undefined);
    assert.equal(await hits(db.pool, e, 'edge:192.0.2.1'), 0); assert.equal(await hits(db.pool, e, 'edge-global'), 0);
    assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_visitors')).rows[0].n, 0);
    await admin.query('DROP TRIGGER admission_failure ON microfire_campaign_budgets; DROP FUNCTION admission_fault()');
    const recovered = await wire(server.origin, base + '/session', {}); assert.equal(recovered.status, 200);
    assert.equal(await hits(db.pool, e, 'edge-global'), 1);
    await seed(db.pool, e, 'edge:192.0.2.9', 240);
    const blocker = await admin.connect();
    try {
      await blocker.query('BEGIN'); await blocker.query('SELECT 1 FROM microfire_campaign_budgets WHERE realm=$1 AND bucket_hash=$2 FOR UPDATE', [e.MICROFIRE_PUBLIC_CAMPAIGN_REALM_ID, hash(e, 'edge-global')]);
      address = '192.0.2.9';
      assert.equal((await wire(server.origin, base + '/session', {})).status, 429, 'Throttled address must not wait for the locked global row.');
      address = '192.0.2.2';
      const started = performance.now(), timedOut = await wire(server.origin, base + '/session', {});
      assert.equal(timedOut.status, 503); assert(performance.now() - started < 3000);
      assert.equal(await hits(db.pool, e, 'edge:192.0.2.2'), 0); assert.equal(await hits(db.pool, e, 'edge-global'), 1);
    } finally { await blocker.query('ROLLBACK'); blocker.release(); }
    assert.equal((await wire(server.origin, base + '/session', {})).status, 200);
    assert.equal(await hits(db.pool, e, 'edge-global'), 2);
    const closed = new Pool(db.options); await closed.end();
    server.replace(origin => { const h = createPublicCampaignHandler({ ...e, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, closed); return r => h(r, address); });
    assert.equal((await wire(server.origin, base + '/session', {})).status, 503); assert.equal(await hits(db.pool, e, 'edge-global'), 2);
    server.replace(factory);
    const before = await hits(db.pool, e, 'edge-global');
    assert.equal((await wire(server.origin, base + '/does-not-exist')).status, 404);
    assert.equal((await wire(server.origin, base + '/does-not-exist')).status, 404);
    assert.equal(await hits(db.pool, e, 'edge-global'), before + 2, 'Each admitted retry/error consumes work; no downstream refund.');
    // Model a lost client acknowledgement after PostgreSQL really commits admission.
    const ackPool = new Pool(db.options), connect = ackPool.connect.bind(ackPool); let loseAck = true;
    ackPool.on('error', () => {});
    ackPool.connect = (async () => {
      const client = await connect();
      return new Proxy(client, { get(target, key) {
        if (key === 'query') return async (...args: unknown[]) => {
          const result = await Reflect.apply(target.query, target, args);
          if (args[0] === 'COMMIT' && loseAck) { loseAck = false; throw Error('test-only lost commit acknowledgement'); }
          return result;
        };
        const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
      } });
    }) as Pool['connect'];
    try {
      address = '192.0.2.3'; const previous = await hits(db.pool, e, 'edge-global');
      const visitors = (await db.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_visitors')).rows[0].n;
      server.replace(origin => { const h = createPublicCampaignHandler({ ...e, MICROFIRE_PUBLIC_CAMPAIGN_ORIGIN: origin }, ackPool); return r => h(r, address); });
      const uncertain = await wire(server.origin, base + '/session', {}); assert.equal(uncertain.status, 503); assert.equal(uncertain.headers['set-cookie'], undefined);
      assert.equal(await hits(db.pool, e, 'edge-global'), previous + 1); assert.equal(await hits(db.pool, e, 'edge:192.0.2.3'), 1);
      assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_visitors')).rows[0].n, visitors);
      server.replace(factory); assert.equal((await wire(server.origin, base + '/session', {})).status, 200);
      assert.equal(await hits(db.pool, e, 'edge-global'), previous + 2); assert.equal(await hits(db.pool, e, 'edge:192.0.2.3'), 2);
      assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM microfire_campaign_visitors')).rows[0].n, visitors + 1);
    } finally { await ackPool.end(); }
    console.log('SQL fault/lock timeout roll back scopes; throttled IP avoids global lock; outage503; lost COMMIT ack fails closed and stays charged; retry cannot reclaim capacity.');
  } finally { await server.close(); await admin.end(); await db.close(); }
});
