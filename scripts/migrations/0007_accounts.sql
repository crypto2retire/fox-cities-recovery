-- 0007_accounts.sql — business + consumer accounts (the identity layer for
-- in-app messaging, estimate scheduling, and the CRM). This is the "one login"
-- that the whole hub-and-spoke plan depends on.
--
-- Two roles, one table:
--   consumer  — verified real customer (never a competitor). Requests quotes,
--               tracks them, confirms transactions, leaves verified reviews.
--   business  — claims a listing, receives leads, invoices, sells online.
--
-- Privacy invariant (DECIDED): consumer PII (email/phone/name) is stored
-- server-side and NEVER shared unless the consumer explicitly releases it to a
-- specific business for a bid or contract.

CREATE TABLE IF NOT EXISTS accounts (
  id                 text PRIMARY KEY,
  role               text NOT NULL DEFAULT 'consumer',  -- consumer | business
  email              text NOT NULL UNIQUE,
  password_hash      text NOT NULL,
  name               text NOT NULL DEFAULT '',
  -- business only: the listing this account owns (null for consumers)
  listing_id         text REFERENCES contractors(id) ON DELETE SET NULL,
  -- consumer verification: becomes 'verified' once a transaction confirms they're real
  verification_status text NOT NULL DEFAULT 'unverified',  -- unverified | verified
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_listing ON accounts(listing_id);
