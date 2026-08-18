import type { Contractor, Review, Event, EventResource, Ad, HelpTicket, AdMarket, AdRate } from './types';
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
  facebook_url: string | null;
  instagram_url: string | null;
  content_themes: unknown;
  strengths: unknown;
  weaknesses: unknown;
  last_scanned: Date | null;
  scan_source: string | null;
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
    facebookUrl: row.facebook_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    contentThemes: toServices(row.content_themes),
    strengths: toServices(row.strengths),
    weaknesses: toServices(row.weaknesses),
    lastScanned: row.last_scanned ? new Date(row.last_scanned).toISOString() : undefined,
    scanSource: row.scan_source ?? undefined,
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
  const rows = await query<ContractorRow>(
    "SELECT * FROM contractors WHERE verification_status IS DISTINCT FROM 'rejected'"
  );
  return sortByCredibility(rows.map(rowToContractor));
}

export interface ContractorSearchParams {
  q?: string;
  category?: string;
  city?: string;
  state?: string;
}

/** Server-side search across name, description, services, and city. */
export async function searchContractors(params: ContractorSearchParams): Promise<Contractor[]> {
  // Rejected (manually removed / AI-flagged-and-rejected) listings never appear.
  const clauses: string[] = ["verification_status IS DISTINCT FROM 'rejected'"];
  const vals: unknown[] = [];
  let i = 1;

  const q = params.q?.trim();
  if (q) {
    clauses.push(
      `(name ILIKE $${i} OR description ILIKE $${i} OR city ILIKE $${i} OR services::text ILIKE $${i})`
    );
    vals.push(`%${q}%`);
    i++;
  }
  if (params.category && params.category !== 'all') {
    clauses.push(`category = $${i}`);
    vals.push(params.category);
    i++;
  }
  if (params.city && params.city !== 'all') {
    clauses.push(`city ILIKE $${i}`);
    vals.push(`%${params.city}%`);
    i++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query<ContractorRow>(`SELECT * FROM contractors ${where}`, vals);
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

// ---------------------------------------------------------------------------
// Ads — labeled sponsor slots
// ---------------------------------------------------------------------------

interface AdRow {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  cta_text: string | null;
  placement: string;
  active: boolean;
  created_at: Date;
  cities: unknown;
  zip_codes: unknown;
  state: string | null;
  market_id: string | null;
  rate_cents: number | null;
}

function arr(v: unknown): string[] {
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

function rowToAd(row: AdRow): Ad {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    ctaText: row.cta_text,
    placement: (row.placement as Ad['placement']) ?? 'sidebar',
    active: row.active,
    cities: arr(row.cities),
    zipCodes: arr(row.zip_codes),
    state: row.state,
    marketId: row.market_id,
    rateCents: row.rate_cents,
  };
}

export async function getAds(): Promise<Ad[]> {
  const rows = await query<AdRow>('SELECT * FROM ads ORDER BY created_at DESC');
  return rows.map(rowToAd);
}

export async function getActiveAdsByPlacement(placement: string): Promise<Ad[]> {
  const rows = await query<AdRow>(
    'SELECT * FROM ads WHERE active = true AND placement = $1 ORDER BY created_at DESC',
    [placement]
  );
  return rows.map(rowToAd);
}

export async function addAd(ad: Ad): Promise<Ad> {
  const rows = await query<AdRow>(
    `INSERT INTO ads (
       id, title, url, description, cta_text, placement, active,
       cities, zip_codes, state, market_id, rate_cents
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8::text[], $9::text[], $10, $11, $12
     )
     RETURNING *`,
    [
      ad.id,
      ad.title,
      ad.url ?? null,
      ad.description ?? null,
      ad.ctaText ?? null,
      ad.placement,
      ad.active ?? true,
      ad.cities ?? [],
      ad.zipCodes ?? [],
      ad.state ?? null,
      ad.marketId ?? null,
      ad.rateCents ?? null,
    ]
  );
  return rowToAd(rows[0]);
}

export async function deleteAd(id: string): Promise<boolean> {
  const { getPool } = await import('./db');
  const res = await getPool().query('DELETE FROM ads WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Ad markets + rates (geo-targeted pricing)
// ---------------------------------------------------------------------------

interface AdMarketRow {
  id: string;
  name: string;
  state: string;
  cities: unknown;
  zip_codes: unknown;
  population: number;
  tier: string;
  created_at: Date;
  updated_at: Date;
}

interface AdRateRow {
  id: string;
  market_id: string;
  placement: string;
  base_rate_cents: number;
  current_rate_cents: number;
  min_rate_cents: number;
  max_rate_cents: number;
  capacity: number;
  filled: number;
  waitlist: number;
  last_adjusted_at: Date | null;
  adjustment_note: string | null;
}

function rowToAdMarket(row: AdMarketRow): AdMarket {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    cities: arr(row.cities),
    zipCodes: arr(row.zip_codes),
    population: row.population,
    tier: row.tier as AdMarket['tier'],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function rowToAdRate(row: AdRateRow): AdRate {
  return {
    id: row.id,
    marketId: row.market_id,
    placement: row.placement as AdRate['placement'],
    baseRateCents: row.base_rate_cents,
    currentRateCents: row.current_rate_cents,
    minRateCents: row.min_rate_cents,
    maxRateCents: row.max_rate_cents,
    capacity: row.capacity,
    filled: row.filled,
    waitlist: row.waitlist,
    lastAdjustedAt: row.last_adjusted_at ? row.last_adjusted_at.toISOString() : null,
    adjustmentNote: row.adjustment_note,
  };
}

export async function getAdMarkets(): Promise<AdMarket[]> {
  const rows = await query<AdMarketRow>('SELECT * FROM ad_markets ORDER BY population DESC');
  return rows.map(rowToAdMarket);
}

export async function getAdRates(): Promise<AdRate[]> {
  const rows = await query<AdRateRow>('SELECT * FROM ad_rates ORDER BY market_id, placement');
  return rows.map(rowToAdRate);
}

export async function upsertAdMarket(market: AdMarket): Promise<AdMarket> {
  const rows = await query<AdMarketRow>(
    `INSERT INTO ad_markets (id, name, state, cities, zip_codes, population, tier)
     VALUES ($1, $2, $3, $4::text[], $5::text[], $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       state = EXCLUDED.state,
       cities = EXCLUDED.cities,
       zip_codes = EXCLUDED.zip_codes,
       population = EXCLUDED.population,
       tier = EXCLUDED.tier,
       updated_at = now()
     RETURNING *`,
    [market.id, market.name, market.state, market.cities ?? [], market.zipCodes ?? [], market.population, market.tier]
  );
  return rowToAdMarket(rows[0]);
}

export async function upsertAdRate(rate: AdRate): Promise<AdRate> {
  const rows = await query<AdRateRow>(
    `INSERT INTO ad_rates (
       id, market_id, placement, base_rate_cents, current_rate_cents,
       min_rate_cents, max_rate_cents, capacity, filled, waitlist, adjustment_note
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       current_rate_cents = EXCLUDED.current_rate_cents,
       filled = EXCLUDED.filled,
       waitlist = EXCLUDED.waitlist,
       adjustment_note = EXCLUDED.adjustment_note,
       last_adjusted_at = now(),
       updated_at = now()
     RETURNING *`,
    [
      rate.id,
      rate.marketId,
      rate.placement,
      rate.baseRateCents,
      rate.currentRateCents,
      rate.minRateCents,
      rate.maxRateCents,
      rate.capacity,
      rate.filled,
      rate.waitlist,
      rate.adjustmentNote ?? null,
    ]
  );
  return rowToAdRate(rows[0]);
}

// ---------------------------------------------------------------------------
// Help tickets (human escalation for the public AI assistant)
// ---------------------------------------------------------------------------

interface HelpTicketRow {
  id: string;
  status: string;
  name: string | null;
  contact: string | null;
  topic: string | null;
  summary: string;
  conversation: string | null;
  resolution_note: string | null;
  created_at: Date;
  resolved_at: Date | null;
  updated_at: Date;
}

function rowToHelpTicket(row: HelpTicketRow): HelpTicket {
  return {
    id: row.id,
    status: row.status as HelpTicket['status'],
    name: row.name,
    contact: row.contact,
    topic: row.topic,
    summary: row.summary,
    conversation: row.conversation,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at.toISOString(),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

export async function getHelpTickets(): Promise<HelpTicket[]> {
  const rows = await query<HelpTicketRow>('SELECT * FROM help_tickets ORDER BY created_at DESC');
  return rows.map(rowToHelpTicket);
}

export async function addHelpTicket(input: {
  name?: string | null;
  contact?: string | null;
  topic?: string | null;
  summary: string;
  conversation?: string | null;
}): Promise<HelpTicket> {
  const id = `ht_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await query<HelpTicketRow>(
    `INSERT INTO help_tickets (id, name, contact, topic, summary, conversation)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.name ?? null, input.contact ?? null, input.topic ?? null, input.summary, input.conversation ?? null]
  );
  return rowToHelpTicket(rows[0]);
}

export async function updateHelpTicket(
  id: string,
  updates: { status?: HelpTicket['status']; resolutionNote?: string | null }
): Promise<HelpTicket | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (updates.status) {
    sets.push(`status = $${i++}`);
    params.push(updates.status);
    sets.push(`resolved_at = ${updates.status === 'resolved' ? 'now()' : 'NULL'}`);
  }
  if (updates.resolutionNote !== undefined) {
    sets.push(`resolution_note = $${i++}`);
    params.push(updates.resolutionNote ?? null);
  }
  if (sets.length === 0) {
    const rows = await query<HelpTicketRow>('SELECT * FROM help_tickets WHERE id = $1', [id]);
    return rows.length ? rowToHelpTicket(rows[0]) : null;
  }

  sets.push('updated_at = now()');
  params.push(id);
  const rows = await query<HelpTicketRow>(
    `UPDATE help_tickets SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return rows.length ? rowToHelpTicket(rows[0]) : null;
}

// Categories (re-export for existing importers)
export { CATEGORY_LABELS } from './types';
export type { Contractor, ContractorCategory, Review, Event, Region, EventResource, EventType, Ad, AdPlacement, HelpTicket, AdMarket, AdRate, MarketTier } from './types';
