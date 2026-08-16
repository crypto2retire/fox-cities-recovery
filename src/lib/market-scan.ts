// On-demand market scanning ingestion model.
// Scan a (city, state, category) market on first need, cache the result, and
// refresh after MARKET_SCAN_TTL_DAYS. Ports the old donelocal.io competitor
// schema onto the `contractors` table.
import { query, getPool } from './db';
import { getScanner, type Scanner } from './scanner';
import type { ScannedCompetitor } from './types';

export const MARKET_SCAN_TTL_DAYS = 30; // refresh cadence (user: "every 30 or 90 days")

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function iso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ScanOutcome {
  cached: boolean;
  scanId: string;
  city: string;
  state: string;
  category: string;
  count: number;          // contractors upserted (0 when served from cache)
  scannedAt: string | null;
  expiresAt: string | null;
}

interface FreshScanRow {
  id: string;
  scanned_at: Date | null;
  expires_at: Date | null;
  result_count: number;
}

/** A scan is "fresh" if it completed and has not expired (within TTL). */
export async function getFreshScan(
  city: string,
  state: string,
  category: string
): Promise<FreshScanRow | null> {
  const rows = await query<FreshScanRow>(
    `SELECT id, scanned_at, expires_at, result_count
     FROM market_scans
     WHERE city = $1 AND state = $2 AND category = $3
       AND status = 'completed' AND expires_at > now()
     ORDER BY scanned_at DESC
     LIMIT 1`,
    [city, state, category]
  );
  return rows.length ? rows[0] : null;
}

/** Map scanned competitors onto the contractors table (insert-or-update). */
export async function upsertContractorsFromScan(
  city: string,
  state: string,
  category: string,
  competitors: ScannedCompetitor[]
): Promise<number> {
  if (!competitors.length) return 0;

  const pool = getPool();
  for (const c of competitors) {
    const id = slugify(`${c.name}-${city}-${state}`);
    await pool.query(
      `INSERT INTO contractors (
         id, name, category, phone, website, address, city,
         year_established, verified, description, services,
         rating, review_count, ownership_type,
         facebook_url, instagram_url, content_themes, strengths, weaknesses,
         last_scanned, scan_source
       ) VALUES (
         $1,$2,$3,'',$4,'',$5,NULL,false,'','[]'::jsonb,$6,$7,'unknown',
         $8,$9,$10::jsonb,$11::jsonb,$12::jsonb,now(),'market-scan'
       )
       ON CONFLICT (id) DO UPDATE SET
         website = COALESCE(EXCLUDED.website, contractors.website),
         rating = COALESCE(EXCLUDED.rating, contractors.rating),
         review_count = COALESCE(EXCLUDED.review_count, contractors.review_count),
         facebook_url = COALESCE(EXCLUDED.facebook_url, contractors.facebook_url),
         instagram_url = COALESCE(EXCLUDED.instagram_url, contractors.instagram_url),
         content_themes = COALESCE(EXCLUDED.content_themes, contractors.content_themes),
         strengths = COALESCE(EXCLUDED.strengths, contractors.strengths),
         weaknesses = COALESCE(EXCLUDED.weaknesses, contractors.weaknesses),
         last_scanned = now(),
         scan_source = 'market-scan',
         updated_at = now()`,
      [
        id,
        c.name,
        category,
        c.website ?? null,
        city,
        c.rating ?? null,
        c.review_count ?? null,
        c.facebook_url ?? null,
        c.instagram_url ?? null,
        JSON.stringify(c.content_themes ?? []),
        JSON.stringify(c.strengths ?? []),
        JSON.stringify(c.weaknesses ?? []),
      ]
    );
  }
  return competitors.length;
}

/** Cache a completed scan (idempotent — one row per market, updated on re-scan). */
export async function saveMarketScan(
  city: string,
  state: string,
  category: string,
  competitors: ScannedCompetitor[]
): Promise<string> {
  const id = slugify(`${city}-${state}-${category}`);
  await query(
    `INSERT INTO market_scans (id, city, state, category, query, status, results, result_count, scanned_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,'completed',$6::jsonb,$7,now(),now() + ($8 * interval '1 day'))
     ON CONFLICT (id) DO UPDATE SET
       status = 'completed',
       results = EXCLUDED.results,
       result_count = EXCLUDED.result_count,
       scanned_at = now(),
       expires_at = now() + ($8 * interval '1 day'),
       error = NULL`,
    [
      id,
      city,
      state,
      category,
      `${category} in ${city}, ${state}`,
      JSON.stringify(competitors),
      competitors.length,
      MARKET_SCAN_TTL_DAYS,
    ]
  );
  return id;
}

/**
 * Scan-on-search: return a fresh cached scan if one exists, otherwise run the
 * scanner, upsert contractors, and cache. A `scanner` may be injected for tests.
 */
export async function scanAndIngestMarket(
  city: string,
  state: string,
  category: string,
  scanner?: Scanner
): Promise<ScanOutcome> {
  const fresh = await getFreshScan(city, state, category);
  if (fresh) {
    return {
      cached: true,
      scanId: fresh.id,
      city,
      state,
      category,
      count: fresh.result_count,
      scannedAt: iso(fresh.scanned_at),
      expiresAt: iso(fresh.expires_at),
    };
  }

  const scanFn = scanner ?? getScanner();
  const competitors = await scanFn(city, state, category);
  const count = await upsertContractorsFromScan(city, state, category, competitors);
  await saveMarketScan(city, state, category, competitors);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MARKET_SCAN_TTL_DAYS * 24 * 60 * 60 * 1000);

  return {
    cached: false,
    scanId: slugify(`${city}-${state}-${category}`),
    city,
    state,
    category,
    count,
    scannedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
