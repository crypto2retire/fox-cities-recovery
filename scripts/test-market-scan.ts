// Verifies the market-scan ingestion pipeline without an LLM key:
// scan → upsert (with social/enrichment fields) → cache → serve-from-cache on repeat.
import { scanAndIngestMarket } from '../src/lib/market-scan';
import { getContractors } from '../src/lib/data-store';
import { getPool } from '../src/lib/db';
import type { ScannedCompetitor } from '../src/lib/types';

const CITY = 'Testville';
const STATE = 'XX';
const CATEGORY = 'roofing';

const STUB: ScannedCompetitor[] = [
  {
    name: 'Test Roofing Co',
    website: 'https://testroof.example.com',
    rating: 4.7,
    review_count: 132,
    facebook_url: 'https://facebook.com/testroof',
    content_themes: ['storm damage', 'shingles'],
    strengths: ['fast response'],
    weaknesses: ['limited service area'],
  },
  {
    name: 'Apex Exteriors',
    website: 'https://apexexteriors.example.com',
    rating: 4.2,
    review_count: 48,
    facebook_url: null,
    content_themes: ['siding'],
    strengths: ['pricing'],
    weaknesses: [],
  },
];

const stubScanner = async () => STUB;

let pass = 0;
let fail = 0;
function check(cond: boolean, msg: string, detail?: unknown) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}${detail !== undefined ? ` (got: ${JSON.stringify(detail)})` : ''}`);
  }
}

async function cleanup() {
  const pool = getPool();
  await pool.query('DELETE FROM market_scans WHERE city = $1 AND state = $2', [CITY, STATE]);
  await pool.query('DELETE FROM contractors WHERE city = $1', [CITY]);
}

async function main() {
  await cleanup();

  // 1. First scan → fresh (not cached), upserts 2
  const r1 = await scanAndIngestMarket(CITY, STATE, CATEGORY, stubScanner);
  check(r1.cached === false, 'first scan is a live scan (cached=false)', r1.cached);
  check(r1.count === 2, 'first scan upserts 2 contractors', r1.count);

  // 2. Contractors got social + enrichment fields
  const all = await getContractors();
  const roofer = all.find((c) => c.name === 'Test Roofing Co');
  check(!!roofer, 'scanned contractor present in directory', roofer?.name);
  check(roofer?.rating === 4.7, 'rating imported', roofer?.rating);
  check(roofer?.reviewCount === 132, 'review_count imported', roofer?.reviewCount);
  check(roofer?.facebookUrl === 'https://facebook.com/testroof', 'facebook_url imported', roofer?.facebookUrl);
  check(Array.isArray(roofer?.contentThemes) && (roofer?.contentThemes ?? []).length === 2, 'content_themes imported', roofer?.contentThemes);
  check(roofer?.lastScanned != null, 'last_scanned set', roofer?.lastScanned);

  // 3. Second scan → served from cache (no re-scan); count = contractors in the cached market
  const r2 = await scanAndIngestMarket(CITY, STATE, CATEGORY, stubScanner);
  check(r2.cached === true, 'second scan served from cache (cached=true)', r2.cached);
  check(r2.count === 2, 'cached scan reports 2 contractors in market', r2.count);

  // 4. A different category is a separate market (not cached)
  const r3 = await scanAndIngestMarket(CITY, STATE, 'plumbing', stubScanner);
  check(r3.cached === false, 'different category is a fresh scan', r3.cached);

  await cleanup();

  console.log(`\n=== MARKET SCAN PIPELINE: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
