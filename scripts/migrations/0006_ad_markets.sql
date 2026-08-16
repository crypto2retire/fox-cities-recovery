-- 0006_ad_markets.sql — geo-targeted ads with market-size pricing + AI yield optimization.
--
-- Adds:
--   1. ad_markets — a named geographic market (metro / city cluster / single city)
--      with a population figure that drives its base ad rates.
--   2. ad_rates   — per (market, placement) pricing: base rate (from market size),
--      current rate (AI-adjusted), min/max bounds, and fill/waitlist signals.
--   3. Geo columns on ads — an ad may target specific cities / zip codes / a state,
--      or remain general (no constraint = shown everywhere).

CREATE TABLE IF NOT EXISTS ad_markets (
  id           text PRIMARY KEY,                 -- slug, e.g. 'fox-cities', 'appleton', 'menasha'
  name         text NOT NULL,
  state        text NOT NULL,                    -- two-letter, e.g. 'WI'
  cities       text[] NOT NULL DEFAULT '{}',
  zip_codes    text[] NOT NULL DEFAULT '{}',
  population   integer NOT NULL DEFAULT 0,       -- market size (drives base rate tier)
  tier         text NOT NULL DEFAULT 'small',    -- small | medium | large | metro
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_markets_state ON ad_markets(state);

CREATE TABLE IF NOT EXISTS ad_rates (
  id                  text PRIMARY KEY,          -- '{market_id}:{placement}'
  market_id           text NOT NULL REFERENCES ad_markets(id) ON DELETE CASCADE,
  placement           text NOT NULL,             -- sidebar | directory | event
  base_rate_cents     integer NOT NULL,          -- from market size tier
  current_rate_cents  integer NOT NULL,          -- AI-adjusted price
  min_rate_cents      integer NOT NULL,          -- floor (never sell below)
  max_rate_cents      integer NOT NULL,          -- ceiling (never price above)
  capacity            integer NOT NULL DEFAULT 1,-- number of slots
  filled              integer NOT NULL DEFAULT 0,-- slots currently sold
  waitlist            integer NOT NULL DEFAULT 0,-- businesses wanting a slot beyond capacity
  last_adjusted_at    timestamptz,
  adjustment_note     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_rates_market ON ad_rates(market_id);

-- Geo-targeting columns on the ads table itself.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS cities text[];
ALTER TABLE ads ADD COLUMN IF NOT EXISTS zip_codes text[];
ALTER TABLE ads ADD COLUMN IF NOT EXISTS state text;          -- null/'' = all states
ALTER TABLE ads ADD COLUMN IF NOT EXISTS market_id text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS rate_cents integer;  -- what this sponsor pays
