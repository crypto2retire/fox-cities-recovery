// Verifies scan-on-search wiring without an LLM key:
// mapQueryToCategory, the cold-market scan path (via injected stub scanner),
// and the guard rails (results-present → no scan; no key → no scan).
import { searchWithScan, mapQueryToCategory } from '../src/lib/search';
import { getPool } from '../src/lib/db';
import type { ScannedCompetitor } from '../src/lib/types';

const CITY = 'Testville';
const STATE = 'XX';
const CATEGORY = 'roofing';

const STUB: ScannedCompetitor[] = [
  { name: 'Test Roofing Co', website: 'https://testroof.example.com', rating: 4.7, review_count: 132 },
  { name: 'Apex Exteriors', website: 'https://apex.example.com', rating: 4.2, review_count: 48 },
];
const stubScanner = async () => STUB;

let pass = 0;
let fail = 0;
function check(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}${detail !== undefined ? ` (got: ${JSON.stringify(detail)})` : ''}`); }
}

async function cleanup() {
  const pool = getPool();
  // Clean by city (scans may have been created under a default state in prior runs).
  await pool.query('DELETE FROM market_scans WHERE city = $1', [CITY]);
  await pool.query('DELETE FROM contractors WHERE city = $1', [CITY]);
}

async function main() {
  // --- mapQueryToCategory (pure) ---
  console.log('\nmapQueryToCategory:');
  check(mapQueryToCategory('roofing') === 'roofing', 'roofing -> roofing', mapQueryToCategory('roofing'));
  check(mapQueryToCategory('roof') === 'roofing', 'roof -> roofing', mapQueryToCategory('roof'));
  check(mapQueryToCategory('tree removal') === 'tree-removal', 'tree removal -> tree-removal', mapQueryToCategory('tree removal'));
  check(mapQueryToCategory('water damage') === 'water-damage', 'water damage -> water-damage', mapQueryToCategory('water damage'));
  check(mapQueryToCategory('plumber') === 'plumber', 'plumber -> plumber', mapQueryToCategory('plumber'));
  check(mapQueryToCategory('') === null, "empty -> null", mapQueryToCategory(''));
  check(mapQueryToCategory('zzz') === null, 'unknown -> null', mapQueryToCategory('zzz'));

  await cleanup();

  // --- cold market + stub scanner -> scan runs ---
  console.log('\nscan-on-search (cold market, stub scanner):');
  const r1 = await searchWithScan({ category: CATEGORY, city: CITY, state: STATE }, stubScanner);
  check(r1.scanned === true, 'cold market triggers scan (scanned=true)', r1.scanned);
  check(r1.results.length === 2, 'scanned results returned (2)', r1.results.length);
  check(r1.scannedCategory === CATEGORY, 'scannedCategory reported', r1.scannedCategory);

  // --- results already present -> no scan ---
  console.log('\nguard: results present -> no scan:');
  const r2 = await searchWithScan({ category: 'roofing' }, stubScanner);
  check(r2.scanned === false, 'existing category does not re-scan', r2.scanned);
  check(r2.results.length > 0, 'existing category returns results', r2.results.length);

  // --- no key + no scanner -> cold market degrades to empty (no throw) ---
  console.log('\nguard: no LLM key -> no scan, no throw:');
  const r3 = await searchWithScan({ category: 'roofing', city: 'Keylessville', state: STATE });
  check(r3.scanned === false, 'no key -> scanned=false', r3.scanned);
  check(Array.isArray(r3.results) && r3.results.length === 0, 'no key -> empty results, no throw', r3.results.length);

  await cleanup();

  console.log(`\n=== SCAN-ON-SEARCH: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
