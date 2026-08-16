-- 0004_market_scans.sql — on-demand market scanning ingestion model.
-- Scans a market (city/state/category) on demand, caches the result, and
-- enriches contractors with social + competitive-intelligence fields.

CREATE TABLE IF NOT EXISTS market_scans (
  id           text PRIMARY KEY,
  region_id    text REFERENCES regions(id) ON DELETE SET NULL,
  city         text NOT NULL,
  state        text NOT NULL,
  category     text NOT NULL,
  query        text,
  status       text NOT NULL DEFAULT 'completed',  -- pending | running | completed | failed
  results      jsonb,
  result_count integer NOT NULL DEFAULT 0,
  scanned_at   timestamptz,
  expires_at   timestamptz,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_scans_lookup ON market_scans(city, state, category);
CREATE INDEX IF NOT EXISTS idx_market_scans_expires ON market_scans(expires_at);

-- Contractor enrichment: social + competitive intelligence (from the old donelocal.io schema).
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS content_themes jsonb;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS strengths jsonb;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS weaknesses jsonb;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS last_scanned timestamptz;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS scan_source text;
