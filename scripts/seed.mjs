// scripts/seed.mjs — one-time bootstrap from src/lib/data.json into Postgres.
// Idempotent and safe: only seeds the region, event, and contractors when the
// `contractors` table is EMPTY. Admin edits made in Postgres are never overwritten.
//
// Usage: node scripts/seed.mjs
// Exit 0 on success (or clean skip when already seeded), 1 on failure.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadLocalEnv } from './lib/env.mjs';

loadLocalEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'src', 'lib', 'data.json');

const { Pool } = pg;

// Region + event bootstrap constants (matches the Fox Cities tornado).
const REGION = {
  id: 'fox-cities-wi',
  name: 'Fox Cities',
  state: 'WI',
  slug: 'fox-cities',
};

const EVENT = {
  id: 'menasha-ef3-2026-07-27',
  regionId: 'fox-cities-wi',
  name: 'Menasha EF-3 Tornado',
  slug: 'menasha-ef3-2026-07-27',
  eventType: 'tornado',
  occurredAt: '2026-07-27',
  description:
    'EF-3 tornado (140 mph winds, 12.1-mile path) through Menasha, Appleton, and Fox Crossing, WI on July 27, 2026.',
};

const RESOURCES = [
  // Emergency & Immediate Help
  { id: 'fema-disaster-assistance', category: 'Emergency & Immediate Help', title: 'FEMA Disaster Assistance', url: 'https://www.disasterassistance.gov/', description: 'Apply for federal disaster aid. Includes housing assistance, property repair, and other needs.', source: 'FEMA' },
  { id: 'american-red-cross-wisconsin', category: 'Emergency & Immediate Help', title: 'American Red Cross — Wisconsin', url: 'https://www.redcross.org/local/wisconsin.html', description: 'Emergency shelter, food, supplies, and health services for disaster victims.', source: 'American Red Cross' },
  { id: 'wisconsin-emergency-management', category: 'Emergency & Immediate Help', title: 'Wisconsin Emergency Management', url: 'https://wem.wi.gov/', description: 'State-level disaster resources and recovery information.', source: 'Wisconsin Emergency Management' },
  { id: '211-wisconsin', category: 'Emergency & Immediate Help', title: '211 Wisconsin', url: 'https://211wisconsin.communityos.org/', description: 'Dial 211 or visit online for free, confidential help finding local resources.', source: 'United Way 211 Wisconsin' },

  // Insurance & Claims
  { id: 'wi-oci', category: 'Insurance & Claims', title: 'Wisconsin Office of the Commissioner of Insurance', url: 'https://oci.wi.gov/Pages/Consumers/Home.aspx', description: 'Consumer guides for filing claims, avoiding scams, and understanding your rights.', source: 'Wisconsin OCI' },
  { id: 'naic-insurance-claim', category: 'Insurance & Claims', title: 'How to File an Insurance Claim (NAIC)', url: 'https://content.naic.org/consumer/disaster-preparedness.htm', description: 'Step-by-step guide to filing and maximizing your insurance claim after a disaster.', source: 'NAIC' },
  { id: 'ftc-avoid-contractor-fraud', category: 'Insurance & Claims', title: 'Avoiding Contractor Fraud After a Storm', url: 'https://consumer.ftc.gov/articles/hiring-contractor', description: 'FTC guide to spotting and avoiding storm chaser scams.', source: 'Federal Trade Commission' },

  // Financial Assistance
  { id: 'sba-disaster-loans', category: 'Financial Assistance', title: 'SBA Disaster Loans', url: 'https://www.sba.gov/funding-programs/disaster-assistance', description: 'Low-interest loans for homeowners, renters, and businesses affected by disasters.', source: 'U.S. Small Business Administration' },
  { id: 'wi-dua', category: 'Financial Assistance', title: 'Wisconsin Disaster Unemployment Assistance', url: 'https://dwd.wisconsin.gov/uiben/dua/', description: 'DUA benefits if you lost work due to the tornado.', source: 'Wisconsin DWD' },
  { id: 'salvation-army-fox-cities', category: 'Financial Assistance', title: 'Salvation Army — Fox Cities', url: 'https://centralusa.salvationarmy.org/foxcities/', description: 'Emergency financial assistance, food, and basic needs support.', source: 'The Salvation Army' },

  // Rebuilding & Permits
  { id: 'menasha-building-permits', category: 'Rebuilding & Permits', title: 'City of Menasha — Building Permits', url: 'https://www.menashawi.gov/departments/community_development/building_inspection.php', description: 'Permit requirements and applications for storm damage repairs.', source: 'City of Menasha' },
  { id: 'appleton-building-inspection', category: 'Rebuilding & Permits', title: 'City of Appleton — Building Inspection', url: 'https://www.appleton.org/government/inspection', description: 'Building permits, inspections, and codes for Appleton residents.', source: 'City of Appleton' },
  { id: 'fox-crossing-building-permits', category: 'Rebuilding & Permits', title: 'Fox Crossing — Building Permits', url: 'https://foxcrossingwi.gov/departments/community-development/', description: 'Permit information for Fox Crossing residents.', source: 'Village of Fox Crossing' },
  { id: 'wi-dsps-license-lookup', category: 'Rebuilding & Permits', title: 'Wisconsin DSPS — Contractor License Lookup', url: 'https://apps.dsps.wi.gov/LicenseLookup/Default', description: 'Verify a contractor\'s license before hiring. Protects against unlicensed work.', source: 'Wisconsin DSPS' },

  // Mental Health & Community Support
  { id: 'disaster-distress-helpline', category: 'Mental Health & Community Support', title: 'Disaster Distress Helpline', url: 'https://www.samhsa.gov/find-help/disaster-distress-helpline', description: '24/7 crisis counseling for emotional distress from disasters. Call 1-800-985-5990.', source: 'SAMHSA' },
  { id: 'nami-fox-valley', category: 'Mental Health & Community Support', title: 'NAMI Fox Valley', url: 'https://www.namifoxvalley.org/', description: 'Mental health support and resources for Fox Cities residents.', source: 'NAMI Fox Valley' },
  { id: 'united-way-fox-cities', category: 'Mental Health & Community Support', title: 'Fox Cities Community Resources (United Way)', url: 'https://www.unitedwayfoxcities.org/', description: 'Comprehensive list of local assistance programs.', source: 'United Way Fox Cities' },
];

function mapContractor(c) {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    phone: c.phone ?? '',
    email: c.email ?? null,
    website: c.website ?? null,
    address: c.address ?? '',
    city: c.city ?? '',
    year_established: c.yearEstablished ?? null,
    verified: c.verified ?? false,
    description: c.description ?? '',
    services: JSON.stringify(c.services ?? []),
    license_number: c.licenseNumber ?? null,
    insurance_verified: c.insuranceVerified ?? false,
    rating: c.rating ?? null,
    review_count: c.reviewCount ?? null,
    logo: c.logo ?? null,
    ownership_type: c.ownershipType ?? 'unknown',
    ownership_notes: c.ownershipNotes ?? null,
    region_id: REGION.id,
  };
}

function mapReview(r) {
  return {
    id: r.id,
    contractor_id: r.contractorId,
    author_name: r.authorName,
    rating: r.rating,
    comment: r.comment ?? '',
    date: r.date ?? new Date().toISOString().split('T')[0],
    job_type: r.jobType ?? null,
    source: r.source ?? 'in-app',
    verified: r.verified ?? null,
    contact_email: r.contactEmail ?? null,
    contact_phone: r.contactPhone ?? null,
    flagged: r.flagged ?? false,
    flag_reason: r.flagReason ?? null,
    business_response: r.businessResponse ?? null,
    business_response_date: r.businessResponseDate ?? null,
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[seed] DATABASE_URL is not set. Skipping seed.');
    process.exit(1);
  }

  const raw = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const contractors = data.contractors ?? [];
  const reviews = data.reviews ?? [];

  const pool = new Pool({ connectionString, max: 1 });

  try {
    // Bootstrap region (idempotent).
    await pool.query(
      `INSERT INTO regions (id, name, state, slug)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [REGION.id, REGION.name, REGION.state, REGION.slug]
    );

    // Bootstrap event (idempotent).
    await pool.query(
      `INSERT INTO events (id, region_id, name, slug, event_type, occurred_at, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [EVENT.id, EVENT.regionId, EVENT.name, EVENT.slug, EVENT.eventType, EVENT.occurredAt, EVENT.description]
    );

    // Seed event resources (idempotent, separate guard — runs even when contractors already exist).
    const { rows: resCountRows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM event_resources WHERE event_id = $1',
      [EVENT.id]
    );
    if (resCountRows[0].n === 0) {
      for (const r of RESOURCES) {
        await pool.query(
          `INSERT INTO event_resources (id, event_id, category, title, url, description, verified, verified_date, source)
           VALUES ($1, $2, $3, $4, $5, $6, true, '2026-08-15', $7)
           ON CONFLICT (id) DO NOTHING`,
          [r.id, EVENT.id, r.category, r.title, r.url, r.description, r.source]
        );
      }
      console.log(`[seed] Seeded ${RESOURCES.length} event resource(s).`);
    }

    // Seed contractors only if the table is empty (never overwrites admin edits).
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS n FROM contractors');
    if (countRows[0].n > 0) {
      console.log(`[seed] Skipped — contractors table already has ${countRows[0].n} row(s).`);
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const c of contractors) {
        const m = mapContractor(c);
        await client.query(
          `INSERT INTO contractors (
             id, name, category, phone, email, website, address, city,
             year_established, verified, description, services, license_number,
             insurance_verified, rating, review_count, logo, ownership_type,
             ownership_notes, region_id
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20
           )
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id, m.name, m.category, m.phone, m.email, m.website, m.address, m.city,
            m.year_established, m.verified, m.description, m.services, m.license_number,
            m.insurance_verified, m.rating, m.review_count, m.logo, m.ownership_type,
            m.ownership_notes, m.region_id,
          ]
        );
      }

      for (const r of reviews) {
        const m = mapReview(r);
        await client.query(
          `INSERT INTO reviews (
             id, contractor_id, author_name, rating, comment, date, job_type, source,
             verified, contact_email, contact_phone, flagged, flag_reason,
             business_response, business_response_date
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
           )
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id, m.contractor_id, m.author_name, m.rating, m.comment, m.date, m.job_type,
            m.source, m.verified, m.contact_email, m.contact_phone, m.flagged,
            m.flag_reason, m.business_response, m.business_response_date,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`[seed] Seeded ${contractors.length} contractor(s), ${reviews.length} review(s).`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] ERROR:', err.message);
  process.exit(1);
});
