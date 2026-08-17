// Search orchestration: server-side search + on-demand market scan.
//
// "Scan-on-search" is the self-building-directory feature: when a search for a
// real category returns nothing (a cold market) AND an LLM key is configured,
// we run a grounded web scan, ingest the results into the directory, and
// surface them on the next query. Search itself always works — no key required.
import { searchContractors } from './data-store';
import { scanAndIngestMarket } from './market-scan';
import type { Scanner } from './scanner';
import type { Contractor, ContractorCategory } from './types';

// The post-storm epicenter; used as the default scan target when a search has
// no explicit city (the app is Fox Cities / Menasha-focused today).
export const DEFAULT_SCAN_CITY = 'Menasha';
export const DEFAULT_SCAN_STATE = 'WI';

// Free-text query → category mapping for scan targeting. Order matters (first match wins).
const QUERY_TO_CATEGORY: [RegExp, ContractorCategory][] = [
  [/roof/, 'roofing'],
  [/tree|arborist|stump/, 'tree-removal'],
  [/water|flood|restor|damage|mold|mitigat/, 'water-damage'],
  [/electric/, 'electrician'],
  [/plumb/, 'plumber'],
  [/hvac|furnace|\bheat\b|air.?cond|\bac\b/, 'hvac'],
  [/window/, 'windows-doors'],
  [/siding|gutter|fascia|soffit/, 'siding-gutters'],
  [/debris|haul|cleanup|dump|junk/, 'debris-removal'],
  [/builder|rebuild|remodel|construction|addition/, 'home-builder'],
  [/foundation|structural|beam|framing|crack/, 'structural-repair'],
  [/adjuster|insurance|claim|public adjust/, 'insurance-adjuster'],
  [/contractor|general/, 'general-contractor'],
];

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'home-builder', 'roofing', 'general-contractor', 'electrician', 'plumber',
  'hvac', 'tree-removal', 'water-damage', 'windows-doors', 'siding-gutters',
  'structural-repair', 'insurance-adjuster', 'debris-removal',
]);

export function mapQueryToCategory(q?: string | null): ContractorCategory | null {
  if (!q) return null;
  const s = q.toLowerCase().trim();
  if (s.length < 3) return null;
  for (const [re, cat] of QUERY_TO_CATEGORY) {
    if (re.test(s)) return cat;
  }
  return null;
}

export function llmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

export interface SearchWithScanResult {
  results: Contractor[];
  scanned: boolean;
  scannedCategory?: string;
  scannedCity?: string;
  scannedState?: string;
}

/**
 * Search the directory; if a real category/city returns nothing and an LLM key
 * is configured, run a grounded market scan to self-build the directory, then
 * re-search so the new listings are returned. Never throws — a scan failure
 * degrades to the plain (possibly empty) search result.
 */
export async function searchWithScan(
  params: {
    q?: string;
    category?: string;
    city?: string;
    state?: string;
  },
  scanner?: Scanner
): Promise<SearchWithScanResult> {
  const q = params.q?.trim() || undefined;
  const cityParam = params.city && params.city !== 'all' ? params.city : undefined;

  // Resolve a category: explicit param wins, else map the free-text query.
  const rawCategory = params.category && params.category !== 'all' ? params.category : undefined;
  const mapped = rawCategory ? (rawCategory as ContractorCategory) : mapQueryToCategory(q);
  const category = mapped && VALID_CATEGORIES.has(mapped) ? mapped : undefined;

  // When we resolve a category, search by category (the query is category intent);
  // otherwise fall back to a free-text search.
  const effectiveQ = category ? undefined : q;
  const args = { q: effectiveQ, category, city: cityParam, state: params.state || undefined };

  let results = await searchContractors(args);

  const hasFilter = Boolean(effectiveQ || category);
  // Only cold markets (no results) with a meaningful filter are scan-worthy.
  if (results.length > 0 || !hasFilter) {
    return { results, scanned: false };
  }

  // Guard rails: need a known category, and (in production) an LLM key.
  // An injected `scanner` (tests) bypasses the key guard.
  if (!category) return { results, scanned: false };
  if (!scanner && !llmConfigured()) return { results, scanned: false };

  const city = cityParam || DEFAULT_SCAN_CITY;
  const state = params.state || DEFAULT_SCAN_STATE;

  try {
    const outcome = await scanAndIngestMarket(city, state, category, scanner);
    // Re-search by the resolved category so newly-scanned listings surface.
    results = await searchContractors({ category, city: cityParam });
    return {
      results,
      scanned: outcome.count > 0,
      scannedCategory: category,
      scannedCity: city,
      scannedState: state,
    };
  } catch (err) {
    console.error('[search] scan-on-search failed:', err instanceof Error ? err.message : err);
    return { results, scanned: false };
  }
}
