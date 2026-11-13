import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { testDatabase } from './campaign-security-harness';

test('staging private schema: runtime CRUD without ownership/DDL or browser database access', async () => {
  const db = await testDatabase(), admin = new Pool({ ...db.options, user: 'microfire_test' });
  try {
    await admin.query('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS');
    const migration = readFileSync('ops/campaign-staging/supabase-private-schema.sql', 'utf8')
      .replace('\\ir ../../data/migrations/campaign-public-v1.sql', () => readFileSync('data/migrations/campaign-public-v1.sql', 'utf8'));
    await admin.query(migration);
    const roles = await admin.query("SELECT rolsuper,rolcreaterole,rolcreatedb,rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname='microfire_campaign_runtime'");
    assert.deepEqual(roles.rows[0], { rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolbypassrls: false, rolcanlogin: false });
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const permissions = await admin.query("SELECT has_schema_privilege($1,'microfire_campaign','USAGE') AS usage,has_table_privilege($1,'microfire_campaign.microfire_campaign_heads','SELECT') AS read", [role]);
      assert.deepEqual(permissions.rows[0], { usage: false, read: false });
    }
    const owned = await admin.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='microfire_campaign' AND tableowner='microfire_campaign_runtime'");
    assert.equal(owned.rows[0].n, 0);
    const client = await admin.connect();
    try {
      await client.query('SET ROLE microfire_campaign_runtime');
      const grants = await client.query("SELECT has_schema_privilege(current_user,'microfire_campaign','CREATE') AS ddl, has_table_privilege(current_user,'microfire_campaign.microfire_campaign_heads','TRUNCATE') AS truncate");
      assert.deepEqual(grants.rows[0], { ddl: false, truncate: false });
      await client.query("INSERT INTO microfire_campaign.microfire_campaign_budgets VALUES('00000000-0000-4000-8000-000000000001','fixture',now(),1,now()+interval '1 minute')");
      await client.query('UPDATE microfire_campaign.microfire_campaign_budgets SET hits=2');
      assert.equal((await client.query('SELECT hits FROM microfire_campaign.microfire_campaign_budgets')).rows[0].hits, 2);
      await client.query('DELETE FROM microfire_campaign.microfire_campaign_budgets');
      for (const sql of ['CREATE TABLE microfire_campaign.forbidden(id int)', 'ALTER TABLE microfire_campaign.microfire_campaign_heads ADD COLUMN forbidden int', 'DROP TABLE microfire_campaign.microfire_campaign_heads', 'SELECT * FROM public.microfire_campaign_heads']) {
        await assert.rejects(client.query(sql), (error: { code: string }) => error.code === '42501');
      }
    } finally { await client.query('RESET ROLE'); client.release(); }
  } finally { await admin.end(); await db.close(); }
});
