// Verifies the ad pricing engine + geo-targeting without a live LLM key:
//   - tierForPopulation maps market size → tier
//   - baseRateCents scales price with market size
//   - deterministic yield rules: sold-out+waitlist raises, empty+no-waitlist lowers
//   - analyzePricing falls back to rules when no LLM key (and returns AI-shaped output)
//   - adMatchesGeo: general ad shows everywhere; targeted ad matches city/zip/state
//   - markets/rates CRUD round-trips
import {
  tierForPopulation,
  baseRateCents,
  rateBounds,
  buildDefaultRates,
  analyzePricing,
  adMatchesGeo,
} from '../src/lib/ad-pricing';
import { upsertAdMarket, getAdMarkets, getAdRates } from '../src/lib/data-store';
import { loadLocalEnv } from './lib/env.mjs';
import type { Ad, AdMarket, AdRate } from '../src/lib/types';

loadLocalEnv();

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

function rate(marketId: string, placement: 'event' | 'sidebar' | 'directory', overrides: Partial<AdRate> = {}): AdRate {
  const base = buildDefaultRates({ id: marketId, name: 'x', state: 'WI', cities: [], zipCodes: [], population: 100000, tier: 'large' } as AdMarket)
    .find((r) => r.placement === placement)!;
  return { ...base, ...overrides };
}

async function main() {
  // 1. Tiers scale with market size
  check(tierForPopulation(5000) === 'small', '5k → small', tierForPopulation(5000));
  check(tierForPopulation(30000) === 'medium', '30k → medium', tierForPopulation(30000));
  check(tierForPopulation(100000) === 'large', '100k → large', tierForPopulation(100000));
  check(tierForPopulation(424094) === 'metro', '424k → metro', tierForPopulation(424094));

  // 2. Base rate scales with market size (metro > small)
  check(baseRateCents('event', 'metro') > baseRateCents('event', 'small'), 'metro event > small event');
  check(baseRateCents('event', 'metro') === 50000, 'metro event base = $500', baseRateCents('event', 'metro'));
  check(baseRateCents('directory', 'small') === 6000, 'small directory base = $60', baseRateCents('directory', 'small'));

  // 3. Rate bounds: 40% → 2× base
  const b = rateBounds(50000);
  check(b.min === 20000 && b.max === 100000, 'bounds = [40%, 2×]', b);

  // 4. Deterministic yield rules
  const fullWaitlist = rate('m', 'event', { filled: 1, capacity: 1, waitlist: 2 });
  const empty = rate('m', 'sidebar', { filled: 0, capacity: 4, waitlist: 0 });
  const recs = await analyzePricing([], [fullWaitlist, empty]);
  check(recs.source === 'rules', 'no-key → source=rules', recs.source);

  const fullRec = recs.recommendations.find((r) => r.placement === 'event');
  const emptyRec = recs.recommendations.find((r) => r.placement === 'sidebar');
  check(fullRec?.action === 'raise', 'sold-out + waitlist → raise', fullRec?.action);
  check(emptyRec?.action === 'lower', 'empty + no waitlist → lower', emptyRec?.action);
  check((fullRec?.newRateCents ?? 0) > (fullRec?.currentRateCents ?? 0), 'raise increases price', fullRec?.newRateCents);
  check((emptyRec?.newRateCents ?? 0) < (emptyRec?.currentRateCents ?? 0), 'lower decreases price', emptyRec?.newRateCents);

  // 5. Geo matching
  const generalAd: Ad = { id: 'g', title: 'General', url: null, description: null, ctaText: null, placement: 'sidebar', active: true };
  const menashaAd: Ad = { id: 'm', title: 'Menasha', url: null, description: null, ctaText: null, placement: 'sidebar', active: true, cities: ['Menasha'], zipCodes: [], state: null };
  const zipAd: Ad = { id: 'z', title: 'Zip', url: null, description: null, ctaText: null, placement: 'sidebar', active: true, cities: [], zipCodes: ['54952'], state: null };

  check(adMatchesGeo(generalAd, { city: 'Appleton' }) === true, 'general ad shows everywhere');
  check(adMatchesGeo(menashaAd, { city: 'Menasha' }) === true, 'city-targeted matches its city');
  check(adMatchesGeo(menashaAd, { city: 'Appleton' }) === false, 'city-targeted does NOT match other city');
  check(adMatchesGeo(zipAd, { zip: '54952' }) === true, 'zip-targeted matches its zip');
  check(adMatchesGeo(zipAd, { zip: '54911' }) === false, 'zip-targeted does NOT match other zip');

  // 6. Markets/rates CRUD round-trip (clean up after)
  const testMarket: AdMarket = {
    id: 'zz-test-market',
    name: 'Test Market',
    state: 'XX',
    cities: ['Testville'],
    zipCodes: ['00000'],
    population: 50000,
    tier: 'medium',
  };
  await upsertAdMarket(testMarket);
  const markets = await getAdMarkets();
  check(markets.some((m) => m.id === 'zz-test-market'), 'market persisted', markets.find((m) => m.id === 'zz-test-market')?.name);

  const allRates = await getAdRates();
  check(allRates.length > 0, 'rates exist in DB', allRates.length);

  // cleanup
  const { getPool } = await import('../src/lib/db');
  await getPool().query('DELETE FROM ad_rates WHERE market_id = $1', ['zz-test-market']);
  await getPool().query('DELETE FROM ad_markets WHERE id = $1', ['zz-test-market']);

  console.log(`\n=== AD PRICING + GEO TARGETING: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
