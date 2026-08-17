-- 0010_contractor_contact_audit.sql — fill verified phone numbers + establishment years
-- Sourced from official sites / BBB / Yelp (never fabricated). See audit notes.

UPDATE contractors SET phone = '(920) 750-7138', updated_at = now() WHERE id = 'black-haak-heating';
UPDATE contractors SET phone = '(920) 507-3022', updated_at = now() WHERE id = 'motto-sons-construction';
UPDATE contractors SET phone = '(920) 729-1282', updated_at = now() WHERE id = 'palisades-heating';
UPDATE contractors SET phone = '(920) 886-6589', updated_at = now() WHERE id = 'bell-electric-fox-valley';
UPDATE contractors SET phone = '(920) 731-1111', updated_at = now() WHERE id = 'flush-drain-sewer';
UPDATE contractors SET phone = '(920) 731-3306', updated_at = now() WHERE id = 'jb-home-improvement';
UPDATE contractors SET phone = '(920) 722-2642', updated_at = now() WHERE id = 'drucks-hvac-plumbing';
UPDATE contractors SET phone = '(920) 215-8999', updated_at = now() WHERE id = 'sure-dry-basements';
UPDATE contractors SET phone = '(920) 739-1128', updated_at = now() WHERE id = 'powell-roofing-appleton';
UPDATE contractors SET phone = '(920) 454-9356', updated_at = now() WHERE id = 'appleton-concrete-masonry';
UPDATE contractors SET phone = '(920) 475-2236', updated_at = now() WHERE id = 'tom-mchugh-construction';
UPDATE contractors SET phone = '(920) 289-4595', updated_at = now() WHERE id = 'infinity-roofing';
UPDATE contractors SET phone = '(920) 280-7591', updated_at = now() WHERE id = 'jeff-hibbard-design';
UPDATE contractors SET phone = '(920) 841-1069', updated_at = now() WHERE id = 'nickols-roofing';
UPDATE contractors SET phone = '(920) 843-1102', updated_at = now() WHERE id = 'diedrich-construction';
UPDATE contractors SET phone = '(920) 215-1429', updated_at = now() WHERE id = 'az-wisco-construction';
UPDATE contractors SET phone = '(920) 216-2243', updated_at = now() WHERE id = 'affordable-contracting';
UPDATE contractors SET phone = '(920) 759-5195', updated_at = now() WHERE id = 'creative-home-technologies';
UPDATE contractors SET phone = '(920) 718-0228', updated_at = now() WHERE id = 'gillett-electric';
UPDATE contractors SET phone = '(920) 426-0745', updated_at = now() WHERE id = 'legacy-builders-oshkosh';
UPDATE contractors SET phone = '(920) 882-9287', updated_at = now() WHERE id = 'cpr-water-damage';
UPDATE contractors SET phone = '(920) 212-8600', updated_at = now() WHERE id = 'weatherpro-exteriors';
UPDATE contractors SET phone = '(920) 267-5233', updated_at = now() WHERE id = 'arbor-tree-care-oshkosh';
UPDATE contractors SET phone = '(920) 923-3231', updated_at = now() WHERE id = 'burg-homes';
UPDATE contractors SET phone = '(920) 214-8484', updated_at = now() WHERE id = 'ridgetop-exteriors-appleton';
UPDATE contractors SET phone = '(920) 428-4200', updated_at = now() WHERE id = 'jg-restoration';
UPDATE contractors SET phone = '(920) 486-1633', updated_at = now() WHERE id = 'vkb-homes';
UPDATE contractors SET phone = '(920) 944-6147', updated_at = now() WHERE id = 'appleton-emergency-tree';
UPDATE contractors SET phone = '(920) 882-1000', updated_at = now() WHERE id = 'virtue-homes';
UPDATE contractors SET phone = '(920) 221-1440', updated_at = now() WHERE id = 'lakeshore-restoration';
UPDATE contractors SET phone = '(920) 358-0182', updated_at = now() WHERE id = 'crown-roofing-services';
UPDATE contractors SET phone = '(920) 740-4057', updated_at = now() WHERE id = 'roof-enforcements';
UPDATE contractors SET phone = '(920) 378-4908', updated_at = now() WHERE id = 'align-remodeling';
UPDATE contractors SET year_established = 1967, updated_at = now() WHERE id = 'associated-claim-service';
UPDATE contractors SET year_established = 2016, updated_at = now() WHERE id = 'cr-fochs-electrical';
