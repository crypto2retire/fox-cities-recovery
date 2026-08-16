// CLI market scanner — trigger a scan-and-ingest for one market.
// Usage: npx tsx scripts/scan-market.ts "Appleton" "WI" "roofing"
import { scanAndIngestMarket } from '../src/lib/market-scan';

async function main() {
  const [city, state, category] = process.argv.slice(2);
  if (!city || !state || !category) {
    console.error('Usage: npx tsx scripts/scan-market.ts <city> <state> <category>');
    process.exit(1);
  }

  const outcome = await scanAndIngestMarket(city, state, category);
  console.log(JSON.stringify(outcome, null, 2));
}

main().catch((e) => {
  console.error('ERROR:', e instanceof Error ? e.message : e);
  process.exit(1);
});
