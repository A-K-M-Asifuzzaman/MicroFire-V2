-- Template for an independently provisioned, campaign-only staging database.
-- Migration owner creates microfire_campaign_runtime separately; never embed its password here.
-- Run data/migrations/campaign-public-v1.sql as migration owner first.
-- CONNECT to the selected database is a separate owner grant; no database name is assumed here.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO microfire_campaign_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  microfire_campaign_visitors, microfire_campaign_heads, microfire_campaign_budgets
TO microfire_campaign_runtime;
-- Runtime role must not own these objects or inherit migration/admin roles.
