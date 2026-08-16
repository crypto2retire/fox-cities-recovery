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
  slug: 'fox-cities-wi',
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
