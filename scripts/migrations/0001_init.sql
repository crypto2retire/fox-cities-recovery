-- 0001_init.sql — Fox Cities Recovery → Local Recovery Network
-- Nationwide foundation: regions, events (storm landing pages), contractors,
-- reviews, plus forward-looking tables for quote requests, messaging, and ads.
-- Compatible with PostgreSQL 14+.

-- ---------------------------------------------------------------------------
-- regions — metro / service territory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
  id         text PRIMARY KEY,           -- slug, e.g. 'fox-cities-wi'
  name       text NOT NULL,              -- display name, e.g. 'Fox Cities'
  state      text NOT NULL,              -- two-letter, e.g. 'WI'
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- events — storm/disaster landing pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          text PRIMARY KEY,          -- slug, e.g. 'menasha-ef3-2026-07-27'
  region_id   text NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name        text NOT NULL,             -- 'Menasha EF-3 Tornado'
  slug        text NOT NULL UNIQUE,
  event_type  text NOT NULL DEFAULT 'tornado',  -- tornado | hurricane | hail | flood | wind | derecho | wildfire | other
  occurred_at date NOT NULL,             -- date of the event (anti-storm-chaser gate anchor)
  description text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- event_resources — verified community links per event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_resources (
  id            text PRIMARY KEY,
  event_id      text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category      text NOT NULL,           -- fema | red-cross | insurance | financial | permit | mental-health | shelter | other
  title         text NOT NULL,
  url           text NOT NULL,
  description   text,
  verified      boolean NOT NULL DEFAULT false,
  verified_date date,
  source        text,                    -- where this was verified against
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- contractors — local businesses (the directory)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contractors (
  id                text PRIMARY KEY,    -- slug
  name              text NOT NULL,
  category          text NOT NULL,       -- see CATEGORY_LABELS in src/lib/types.ts
  phone             text NOT NULL DEFAULT '',
  email             text,
  website           text,
  address           text NOT NULL DEFAULT '',
  city              text NOT NULL DEFAULT '',
  year_established  integer,             -- null = not verified; pre-storm gate + longevity
  verified          boolean NOT NULL DEFAULT false,
  description       text NOT NULL DEFAULT '',
  services          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- string[]
  license_number    text,                -- verified via state registry — never fabricated
  insurance_verified boolean NOT NULL DEFAULT false,
  rating            numeric(3,1),        -- null = no verified rating yet
  review_count      integer,             -- null = no verified review count yet
  logo              text,
  ownership_type    text NOT NULL DEFAULT 'unknown',
  ownership_notes   text,
  region_id         text REFERENCES regions(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractors_category ON contractors(category);
CREATE INDEX IF NOT EXISTS idx_contractors_city ON contractors(city);
CREATE INDEX IF NOT EXISTS idx_contractors_region ON contractors(region_id);

-- ---------------------------------------------------------------------------
-- business_locations — service areas (multi-city businesses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_locations (
  id            text PRIMARY KEY,
  contractor_id text NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  city          text NOT NULL,
  state         text NOT NULL,
  region_id     text REFERENCES regions(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_locations_contractor ON business_locations(contractor_id);

-- ---------------------------------------------------------------------------
-- reviews — in-app + imported Google snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id                    text PRIMARY KEY,
  contractor_id         text NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  author_name           text NOT NULL,
  rating                integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment               text NOT NULL DEFAULT '',
  date                  date NOT NULL DEFAULT CURRENT_DATE,
  job_type              text,
  source                text NOT NULL DEFAULT 'in-app',  -- in-app | google | imported
  verified              boolean,
  -- Private — never returned to public API, stored for verification only
  contact_email         text,
  contact_phone         text,
  -- Fraud detection
  flagged               boolean NOT NULL DEFAULT false,
  flag_reason           text,
  -- Business response
  business_response     text,
  business_response_date date,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_contractor ON reviews(contractor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON reviews(source);

-- ---------------------------------------------------------------------------
-- quote_requests — consumer job requests (3-quote cap mechanic)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_requests (
  id              text PRIMARY KEY,
  consumer_handle text NOT NULL,          -- pseudonymous handle; real identity revealed only on hire
  service         text NOT NULL,          -- e.g. 'roof replacement'
  description     text,
  status          text NOT NULL DEFAULT 'requested', -- requested | quoted | hired | scheduled | done
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_request_businesses (
  quote_request_id text NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  contractor_id    text NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  PRIMARY KEY (quote_request_id, contractor_id)
);

-- ---------------------------------------------------------------------------
-- messages — in-app threads (privacy bridge; no PII by default)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id               text PRIMARY KEY,
  quote_request_id text NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  sender_role      text NOT NULL,         -- consumer | business
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_quote_request ON messages(quote_request_id);

-- ---------------------------------------------------------------------------
-- ads — labeled edge placements (never in listings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ads (
  id         text PRIMARY KEY,
  title      text NOT NULL,
  url        text,
  placement  text NOT NULL DEFAULT 'sidebar', -- sidebar | directory-bottom | event-footer
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
