-- Contractor AI verification: track verification state, notes, and check time
-- for scan-added (and any other) listings.
-- Statuses: 'unverified' (default, e.g. freshly scanned) | 'verified' |
--           'needs_review' (AI could not confirm — human queue) |
--           'failed' (verification call errored — retryable) |
--           'rejected' (reviewed + removed from public directory).

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS verification_checked_at TIMESTAMPTZ;

-- Existing hand-verified contractors are already verified.
UPDATE contractors
   SET verification_status = 'verified'
 WHERE verified = TRUE AND verification_status = 'unverified';
