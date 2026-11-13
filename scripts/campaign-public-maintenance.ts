// Explicit operator CLI only: node --conditions=react-server --import tsx scripts/campaign-public-maintenance.ts migrate|cleanup
import { readFileSync } from 'node:fs';
import { publicCampaignPool } from '../apps/web/lib/public-campaign';
const mode = process.argv[2], database = process.env.MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_URL;
if (!database || !['migrate', 'cleanup'].includes(mode ?? '')) throw Error('Set the private campaign database environment and choose migrate or cleanup.');
const pool = publicCampaignPool(database, process.env.MICROFIRE_PUBLIC_CAMPAIGN_DATABASE_CA_PEM);
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let counts: { visitorsRemoved: number | null; budgetWindowsRemoved: number | null } | undefined;
    if (mode === 'migrate') await client.query(readFileSync('data/migrations/campaign-public-v1.sql', 'utf8'));
    else {
      const visitors = await client.query('DELETE FROM microfire_campaign_visitors WHERE expires_at<=clock_timestamp() OR revoked');
      const budgets = await client.query('DELETE FROM microfire_campaign_budgets WHERE expires_at<=clock_timestamp()');
      counts = { visitorsRemoved: visitors.rowCount, budgetWindowsRemoved: budgets.rowCount };
    }
    await client.query('COMMIT');
    if (counts) console.log(JSON.stringify(counts));
    if (mode === 'migrate') console.log('Campaign schema installed. Gameplay remains disabled and unmounted.');
  } catch { await client.query('ROLLBACK').catch(() => {}); throw Error('Campaign database maintenance failed.'); }
  finally { client.release(); }
} catch { console.error('Campaign database maintenance failed. No credential details are logged.'); process.exitCode = 1; }
finally { await pool.end(); }
