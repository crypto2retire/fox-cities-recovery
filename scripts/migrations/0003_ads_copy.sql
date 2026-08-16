-- 0003_ads_copy.sql — add ad copy fields for sponsor slots.
ALTER TABLE ads ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS cta_text text;
