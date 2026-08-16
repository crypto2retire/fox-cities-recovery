import type { Contractor, Review, Event, EventResource } from './types';
import { sortByCredibility } from './credibility';
import { query } from './db';

// ---------------------------------------------------------------------------
// Row ↔ Type mapping (snake_case DB columns ↔ camelCase TS types)
// ---------------------------------------------------------------------------

interface ContractorRow {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string | null;
  website: string | null;
  address: string;
  city: string;
  year_established: number | null;
  verified: boolean;
  description: string;
  services: unknown; // jsonb — pg returns parsed array
  license_number: string | null;
  insurance_verified: boolean;
  rating: string | number | null; // numeric comes back as string from pg
  review_count: number | null;
  logo: string | null;
  ownership_type: string;
  ownership_notes: string | null;
  region_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ReviewRow {
  id: string;
  contractor_id: string;
  author_name: string;
  rating: number;
  comment: string;
  date: string | Date;
  job_type: string | null;
  source: string;
  verified: boolean | null;
  contact_email: string | null;
  contact_phone: string | null;
  flagged: boolean;
  flag_reason: string | null;
  business_response: string | null;
  business_response_date: string | Date | null;
  created_at: Date;
}

function toNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateStr(v: string | Date | null | undefined): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return String(v).split('T')[0];
}

function toServices(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToContractor(row: ContractorRow): Contractor {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Contractor['category'],
    phone: row.phone ?? '',
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    address: row.address ?? '',
    city: row.city ?? '',
    yearEstablished: row.year_established,
    verified: row.verified,
    description: row.description ?? '',
    services: toServices(row.services),
    licenseNumber: row.license_number ?? undefined,
    insuranceVerified: row.insurance_verified,
    rating: toNum(row.rating),
    reviewCount: row.review_count,
    logo: row.logo ?? undefined,
    ownershipType: (row.ownership_type ?? 'unknown') as Contractor['ownershipType'],
    ownershipNotes: row.ownership_notes ?? undefined,
  };
}

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment ?? '',
    date: toDateStr(row.date),
    jobType: row.job_type ?? undefined,
    source: row.source as Review['source'],
    verified: row.verified ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    flagged: row.flagged,
    flagReason: row.flag_reason ?? undefined,
    businessResponse: row.business_response ?? undefined,
    businessResponseDate: row.business_response_date ? toDateStr(row.business_response_date) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Contractors
// ---------------------------------------------------------------------------

export async function getContractors(): Promise<Contractor[]> {
  const rows = await query<ContractorRow>('SELECT * FROM contractors');
  return sortByCredibility(rows.map(rowToContractor));
}

export async function getContractorById(id: string): Promise<Contractor | null> {
  const rows = await query<ContractorRow>('SELECT * FROM contractors WHERE id = $1', [id]);
  return rows.length ? rowToContractor(rows[0]) : null;
}

const CONTRACTOR_COLUMNS: Record<string, string> = {
  name: 'name',
  category: 'category',
  phone: 'phone',
  email: 'email',
  website: 'website',
  address: 'address',
  city: 'city',
  yearEstablished: 'year_established',
  verified: 'verified',
  description: 'description',
  services: 'services',
  licenseNumber: 'license_number',
  insuranceVerified: 'insurance_verified',
  rating: 'rating',
  reviewCount: 'review_count',
  logo: 'logo',
  ownershipType: 'ownership_type',
  ownershipNotes: 'ownership_notes',
};

export async function addContractor(c: Contractor): Promise<Contractor> {
  const rows = await query<ContractorRow>(
    `INSERT INTO contractors (
       id, name, category, phone, email, website, address, city,
       year_established, verified, description, services, license_number,
       insurance_verified, rating, review_count, logo, ownership_type, ownership_notes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19
     )
     RETURNING *`,
    [
      c.id,
      c.name,
      c.category,
      c.phone ?? '',
      c.email ?? null,
      c.website ?? null,
      c.address ?? '',
      c.city ?? '',
      c.yearEstablished ?? null,
      c.verified ?? false,
      c.description ?? '',
      JSON.stringify(c.services ?? []),
      c.licenseNumber ?? null,
      c.insuranceVerified ?? false,
      c.rating ?? null,
      c.reviewCount ?? null,
      c.logo ?? null,
      c.ownershipType ?? 'unknown',
      c.ownershipNotes ?? null,
    ]
  );
  return rowToContractor(rows[0]);
}

export async function updateContractor(
  id: string,
  updates: Partial<Contractor>
): Promise<Contractor | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue; // never allow id overwrite
    const col = CONTRACTOR_COLUMNS[key];
    if (!col) continue; // ignore unknown fields
    if (value === undefined) continue;

    if (col === 'services') {
      sets.push(`${col} = $${i++}::jsonb`);
      params.push(JSON.stringify(value ?? []));
    } else {
      sets.push(`${col} = $${i++}`);
      params.push(value ?? null);
    }
  }

  if (sets.length === 0) {
    return getContractorById(id);
  }

  sets.push(`updated_at = now()`);
  params.push(id);
  const rows = await query<ContractorRow>(
    `UPDATE contractors SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return rows.length ? rowToContractor(rows[0]) : null;
}

export async function deleteContractor(id: string): Promise<boolean> {
  const { getPool } = await import('./db');
  const res = await getPool().query('DELETE FROM contractors WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function getReviewsForContractor(contractorId: string): Promise<Review[]> {
  const rows = await query<ReviewRow>(
    'SELECT * FROM reviews WHERE contractor_id = $1 ORDER BY created_at DESC',
    [contractorId]
  );
  return rows.map(rowToReview);
}

export async function getAllReviews(): Promise<Review[]> {
  const rows = await query<ReviewRow>('SELECT * FROM reviews ORDER BY created_at DESC');
  return rows.map(rowToReview);
}

export async function addReview(r: Review): Promise<Review> {
  const rows = await query<ReviewRow>(
    `INSERT INTO reviews (
       id, contractor_id, author_name, rating, comment, date, job_type, source,
       verified, contact_email, contact_phone, flagged, flag_reason,
       business_response, business_response_date
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
     )
     RETURNING *`,
    [
      r.id,
      r.contractorId,
      r.authorName,
      r.rating,
      r.comment ?? '',
      r.date ?? new Date().toISOString().split('T')[0],
      r.jobType ?? null,
      r.source ?? 'in-app',
      r.verified ?? null,
      r.contactEmail ?? null,
      r.contactPhone ?? null,
      r.flagged ?? false,
      r.flagReason ?? null,
      r.businessResponse ?? null,
      r.businessResponseDate ?? null,
    ]
  );
  await refreshContractorStats(r.contractorId);
  return rowToReview(rows[0]);
}

export async function updateReview(id: string, updates: Partial<Review>): Promise<Review | null> {
  const cols: Record<string, string> = {
    authorName: 'author_name',
    rating: 'rating',
    comment: 'comment',
    date: 'date',
    jobType: 'job_type',
    source: 'source',
    verified: 'verified',
    contactEmail: 'contact_email',
    contactPhone: 'contact_phone',
    flagged: 'flagged',
    flagReason: 'flag_reason',
    businessResponse: 'business_response',
    businessResponseDate: 'business_response_date',
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'contractorId') continue;
    const col = cols[key];
    if (!col) continue;
    if (value === undefined) continue;
    sets.push(`${col} = $${i++}`);
    params.push(value ?? null);
  }

  if (sets.length === 0) {
    const rows = await query<ReviewRow>('SELECT * FROM reviews WHERE id = $1', [id]);
    return rows.length ? rowToReview(rows[0]) : null;
  }

  params.push(id);
  const rows = await query<ReviewRow>(
    `UPDATE reviews SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return rows.length ? rowToReview(rows[0]) : null;
}

export async function deleteReview(id: string): Promise<boolean> {
  const { getPool } = await import('./db');
  const pool = getPool();

  // Find the review's contractor before deleting so we can refresh its stats.
  const existing = await pool.query<{ contractor_id: string }>(
    'SELECT contractor_id FROM reviews WHERE id = $1',
    [id]
  );
  if (!existing.rows.length) return false;

  const contractorId = existing.rows[0].contractor_id;
  const res = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
  const deleted = (res.rowCount ?? 0) > 0;

  if (deleted) {
    await refreshContractorStats(contractorId);
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Rating/reviewCount denormalization — mirrors the old JSON refreshContractorStats.
// In-app reviews are weighted 1.5× over imported Google reviews in the average.
// ---------------------------------------------------------------------------

async function refreshContractorStats(contractorId: string): Promise<void> {
  const { getPool } = await import('./db');
  const pool = getPool();

  const all = await pool.query<{ source: string; rating: number }>(
    'SELECT source, rating FROM reviews WHERE contractor_id = $1',
    [contractorId]
  );

  const google = all.rows.filter((r) => r.source === 'google');
  const inApp = all.rows.filter((r) => r.source !== 'google');

  if (all.rows.length === 0) {
    await pool.query(
      'UPDATE contractors SET rating = NULL, review_count = NULL, updated_at = now() WHERE id = $1',
      [contractorId]
    );
    return;
  }

  const googleWeight = google.length;
  const inAppWeight = inApp.length * 1.5;
  const totalWeight = googleWeight + inAppWeight;

  const googleSum = google.reduce((s, r) => s + r.rating, 0);
  const inAppSum = inApp.reduce((s, r) => s + r.rating, 0);

  const rating = Math.round(((googleSum * googleWeight + inAppSum * inAppWeight) / Math.max(totalWeight, 1)) * 10) / 10;

  await pool.query(
    'UPDATE contractors SET rating = $1, review_count = $2, updated_at = now() WHERE id = $3',
    [rating, all.rows.length, contractorId]
  );
}

// ---------------------------------------------------------------------------
// Events / regions / resources (storm landing pages)
// ---------------------------------------------------------------------------

interface EventRow {
  id: string;
  region_id: string;
  name: string;
  slug: string;
  event_type: string;
  occurred_at: string | Date;
  description: string | null;
  active: boolean;
  region_name?: string;
  region_state?: string;
  region_slug?: string;
}

interface EventResourceRow {
  id: string;
  event_id: string;
  category: string;
  title: string;
  url: string;
  description: string | null;
  verified: boolean;
  verified_date: string | Date | null;
  source: string | null;
}

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    regionId: row.region_id,
    name: row.name,
    slug: row.slug,
    eventType: (row.event_type as Event['eventType']) ?? 'other',
    occurredAt: toDateStr(row.occurred_at),
    description: row.description,
    active: row.active,
    region: row.region_name
      ? { id: row.region_id, name: row.region_name, state: row.region_state ?? '', slug: row.region_slug ?? '' }
      : undefined,
  };
}

function rowToEventResource(row: EventResourceRow): EventResource {
  return {
    id: row.id,
    eventId: row.event_id,
    category: row.category,
    title: row.title,
    url: row.url,
    description: row.description,
    verified: row.verified,
    verifiedDate: row.verified_date ? toDateStr(row.verified_date) : null,
    source: row.source,
  };
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const rows = await query<EventRow>(
    `SELECT e.*, r.name AS region_name, r.state AS region_state, r.slug AS region_slug
     FROM events e
     JOIN regions r ON e.region_id = r.id
     WHERE e.slug = $1 AND e.active = true
     LIMIT 1`,
    [slug]
  );
  return rows.length ? rowToEvent(rows[0]) : null;
}

// Anti-storm-chaser gate: only businesses with a verified year established
// STRICTLY before the event year. Businesses with an unverified year (null) or
// established during/after the event year are excluded.
export async function getContractorsForEvent(event: Event): Promise<Contractor[]> {
  const eventYear = new Date(event.occurredAt).getFullYear();
  const rows = await query<ContractorRow>(
    `SELECT * FROM contractors
     WHERE region_id = $1
       AND year_established IS NOT NULL
       AND year_established < $2`,
    [event.regionId, eventYear]
  );
  return sortByCredibility(rows.map(rowToContractor));
}

export async function getExcludedContractorCount(event: Event): Promise<number> {
  const eventYear = new Date(event.occurredAt).getFullYear();
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM contractors
     WHERE region_id = $1
       AND (year_established IS NULL OR year_established >= $2)`,
    [event.regionId, eventYear]
  );
  return rows[0]?.n ?? 0;
}

export async function getEventResources(eventId: string): Promise<EventResource[]> {
  const rows = await query<EventResourceRow>(
    'SELECT * FROM event_resources WHERE event_id = $1 ORDER BY category, title',
    [eventId]
  );
  return rows.map(rowToEventResource);
}

// Categories (re-export for existing importers)
export { CATEGORY_LABELS } from './types';
export type { Contractor, ContractorCategory, Review, Event, Region, EventResource, EventType } from './types';
