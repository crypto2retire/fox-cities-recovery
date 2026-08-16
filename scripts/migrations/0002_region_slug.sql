-- 0002_region_slug.sql — normalize the Fox Cities region slug for clean URLs.
-- URL shape: /recovery/wi/fox-cities/<event> (state + metro, not a combined slug).
UPDATE regions SET slug = 'fox-cities' WHERE id = 'fox-cities-wi';
