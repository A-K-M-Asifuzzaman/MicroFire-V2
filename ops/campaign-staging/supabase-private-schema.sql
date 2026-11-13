-- Staging only. Run as migration owner with psql -v ON_ERROR_STOP=1 -f this-file.
-- Provision the runtime password separately; never put credentials in this file.
BEGIN;
CREATE ROLE microfire_campaign_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA microfire_campaign AUTHORIZATION CURRENT_USER;
REVOKE ALL ON SCHEMA microfire_campaign FROM PUBLIC, anon, authenticated, service_role;
SET LOCAL search_path TO microfire_campaign, pg_catalog;
\ir ../../data/migrations/campaign-public-v1.sql
REVOKE ALL ON ALL TABLES IN SCHEMA microfire_campaign FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA microfire_campaign TO microfire_campaign_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA microfire_campaign TO microfire_campaign_runtime;
ALTER ROLE microfire_campaign_runtime SET search_path TO microfire_campaign, pg_catalog;
ALTER ROLE microfire_campaign_runtime SET statement_timeout TO '3s';
ALTER ROLE microfire_campaign_runtime SET idle_in_transaction_session_timeout TO '3s';
-- Visitor ownership is enforced by the server. RLS additionally excludes every other non-owner role.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['microfire_campaign_visitors', 'microfire_campaign_heads', 'microfire_campaign_budgets'] LOOP
    EXECUTE format('ALTER TABLE microfire_campaign.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE microfire_campaign.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY campaign_runtime ON microfire_campaign.%I TO microfire_campaign_runtime USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
COMMIT;
