-- Apply with a migration owner; the application role needs only SELECT/INSERT/UPDATE/DELETE.
-- No browser/anonymous database role gets table access. Deployment does not run migrations automatically.
CREATE TABLE microfire_campaign_visitors (
  realm uuid NOT NULL, owner_hash text NOT NULL CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
  audience text NOT NULL CHECK (audience = 'public-campaign-v1'), binding text NOT NULL,
  session_id uuid NOT NULL, expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false,
  PRIMARY KEY (realm, owner_hash), UNIQUE (realm, session_id)
);
CREATE INDEX microfire_campaign_visitors_expiry ON microfire_campaign_visitors (realm, expires_at);
CREATE TABLE microfire_campaign_heads (
  realm uuid NOT NULL, owner_hash text NOT NULL, revision integer NOT NULL CHECK (revision BETWEEN 0 AND 256),
  record jsonb NOT NULL CHECK (octet_length(record::text) <= 262144), last_command text, last_response jsonb,
  PRIMARY KEY (realm, owner_hash), FOREIGN KEY (realm, owner_hash) REFERENCES microfire_campaign_visitors ON DELETE CASCADE
);
CREATE TABLE microfire_campaign_budgets (
  realm uuid NOT NULL, bucket_hash text NOT NULL, window_at timestamptz NOT NULL, hits integer NOT NULL,
  expires_at timestamptz NOT NULL, PRIMARY KEY (realm, bucket_hash, window_at)
);
CREATE INDEX microfire_campaign_budgets_expiry ON microfire_campaign_budgets (expires_at);
-- Scheduled maintenance by the owner, separately from request transactions:
-- DELETE FROM microfire_campaign_visitors WHERE expires_at <= clock_timestamp() OR revoked;
-- DELETE FROM microfire_campaign_budgets WHERE expires_at <= clock_timestamp();

REVOKE ALL ON microfire_campaign_visitors, microfire_campaign_heads, microfire_campaign_budgets FROM PUBLIC;
