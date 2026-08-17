-- 0008_quote_extensions.sql — extend quote_requests for the identity + PII-release model.
-- Adds consumer identity (account link + private PII fields) and the opt-in release
-- tracking. Consumer PII is stored server-side and exposed to a business only when the
-- consumer explicitly releases it (released_to holds the contractor ids granted access).

ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS consumer_id text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS consumer_name text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS consumer_email text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS consumer_phone text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS released_to text;  -- JSON array of contractor ids

CREATE INDEX IF NOT EXISTS idx_quote_requests_consumer ON quote_requests(consumer_id);
