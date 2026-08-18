// Verifies the AI verification pipeline with a stub LLM:
// decision logic (verified / needs_review / failed), DB updates,
// and manual review actions. No real LLM calls.
import { verifyContractorsWithAI, decideVerification, manualReview, getUnverifiedContractors, getNeedsReviewContractors } from '../src/lib/verify';
import { getPool, query } from '../src/lib/db';
import type { Contractor } from '../src/lib/types';
import type { VerifyFn, VerificationLLMResult } from '../src/lib/verify';

const CITY = 'Verifyville';

let pass = 0;
let fail = 0;
function check(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}${detail !== undefined ? ` (got: ${JSON.stringify(detail)})` : ''}`); }
}

async function insertTestContractor(name: string, extra: Partial<Contractor> = {}): Promise<string> {
  const id = `verify-test-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  await getPool().query(
    `INSERT INTO contractors (id, name, category, phone, website, city, year_established, verified, description, services, rating, review_count, ownership_type, verification_status)
     VALUES ($1,$2,$3,'','', $4, NULL, FALSE, '', '[]'::jsonb, NULL, NULL, 'locally-owned', 'unverified')
     ON CONFLICT (id) DO UPDATE SET verified = FALSE, verification_status = 'unverified', verification_note = NULL`,
    [id, name, 'roofing', CITY]
  );
  return id;
}

async function cleanup() {
  await getPool().query('DELETE FROM contractors WHERE id LIKE \'verify-test-%\'');
}

async function main() {
  await cleanup();

  // --- decideVerification (pure logic) ---
  console.log('\ndecideVerification:');
  const base = { id: 'x', name: 'Test Co', category: 'roofing' as const, city: CITY, phone: '', address: '', yearEstablished: null, description: '', services: [], insuranceVerified: false, rating: null, reviewCount: null, ownershipType: 'locally-owned' as const, verified: false };

  const ok = decideVerification({ exists: true, city_confirmed: true, established_year: 2015, pre_storm_presence: true, evidence: 'Website says Est. 2015', confidence: 'high' }, base);
  check(ok.status === 'verified', 'confirmed -> verified', ok.status);
  check(ok.yearEstablished === 2015, 'year captured from evidence', ok.yearEstablished);

  const noPreStorm = decideVerification({ exists: true, city_confirmed: true, established_year: null, pre_storm_presence: null, evidence: 'No founding info found', confidence: 'medium' }, base);
  check(noPreStorm.status === 'needs_review', 'cannot determine pre-storm -> needs_review', noPreStorm.status);

  const postStorm = decideVerification({ exists: true, city_confirmed: true, established_year: 2026, pre_storm_presence: false, evidence: 'Started in 2026', confidence: 'high' }, base);
  check(postStorm.status === 'needs_review', 'post-storm startup -> needs_review', postStorm.status);

  const lowConf = decideVerification({ exists: true, city_confirmed: true, established_year: null, pre_storm_presence: true, evidence: 'vague', confidence: 'low' }, base);
  check(lowConf.status === 'needs_review', 'low confidence -> needs_review', lowConf.status);

  const notExists = decideVerification({ exists: false, city_confirmed: false, established_year: null, pre_storm_presence: null, evidence: 'Nothing found', confidence: 'low' }, base);
  check(notExists.status === 'needs_review', 'not found -> needs_review', notExists.status);

  // --- verifyContractorsWithAI with a stub LLM ---
  console.log('\nverifyContractorsWithAI (stub LLM):');
  const idOk = await insertTestContractor('Verified Roofing');
  const idFlag = await insertTestContractor('Mystery Roofing');
  const idErr = await insertTestContractor('Errored Roofing');
  const idGeneric = await insertTestContractor('Generic Roofing');
  await getPool().query(
    'UPDATE contractors SET facebook_url = $2 WHERE id = $1',
    [idGeneric, 'https://www.facebook.com']
  );

  const stub: VerifyFn = async (c: Contractor) => {
    if (c.name === 'Verified Roofing') return { exists: true, city_confirmed: true, established_year: 2012, pre_storm_presence: true, evidence: 'BBB + website Est. 2012', confidence: 'high', facebook_url: 'https://www.facebook.com/verifiedroofing', instagram_url: 'https://www.instagram.com/verifiedroofing' } as VerificationLLMResult;
    if (c.name === 'Mystery Roofing') return { exists: true, city_confirmed: true, established_year: null, pre_storm_presence: null, evidence: 'No founding info', confidence: 'medium', facebook_url: 'https://www.facebook.com' } as VerificationLLMResult;
    if (c.name === 'Generic Roofing') return { exists: true, city_confirmed: true, established_year: null, pre_storm_presence: true, evidence: 'Exists, no founding info', confidence: 'medium' } as VerificationLLMResult;
    throw new Error('simulated LLM failure');
  };

  const outcomes = await verifyContractorsWithAI([idOk, idFlag, idErr, idGeneric], stub);
  const byName = Object.fromEntries(outcomes.map((o) => [o.name, o]));
  check(byName['Verified Roofing']?.status === 'verified', 'stub-confirmed -> verified', byName['Verified Roofing']?.status);
  check(byName['Mystery Roofing']?.status === 'needs_review', 'stub-uncertain -> needs_review', byName['Mystery Roofing']?.status);
  check(byName['Errored Roofing']?.status === 'failed', 'LLM error -> failed', byName['Errored Roofing']?.status);
  check(byName['Verified Roofing']?.facebookUrl === 'https://www.facebook.com/verifiedroofing', 'social url captured from AI', byName['Verified Roofing']?.facebookUrl);
  check(byName['Mystery Roofing']?.facebookUrl == null, 'generic facebook.com root rejected', byName['Mystery Roofing']?.facebookUrl);

  const rows = await query<{ name: string; verified: boolean; verification_status: string; facebook_url: string | null; instagram_url: string | null }>(
    'SELECT name, verified, verification_status, facebook_url, instagram_url FROM contractors WHERE id = ANY($1::text[])',
    [[idOk, idFlag, idErr, idGeneric]]
  );
  const rByName = Object.fromEntries(rows.map((r) => [r.name, r]));
  check(rByName['Verified Roofing']?.verified === true, 'DB: verified=true for confirmed', rByName['Verified Roofing']);
  check(rByName['Verified Roofing']?.verification_status === 'verified', 'DB: status=verified', rByName['Verified Roofing']);
  check(rByName['Verified Roofing']?.facebook_url === 'https://www.facebook.com/verifiedroofing', 'DB: facebook_url stored', rByName['Verified Roofing']?.facebook_url);
  check(rByName['Verified Roofing']?.instagram_url === 'https://www.instagram.com/verifiedroofing', 'DB: instagram_url stored', rByName['Verified Roofing']?.instagram_url);
  check(rByName['Mystery Roofing']?.verification_status === 'needs_review', 'DB: status=needs_review', rByName['Mystery Roofing']);
  check(rByName['Mystery Roofing']?.facebook_url == null, 'DB: generic facebook root NOT stored', rByName['Mystery Roofing']?.facebook_url);
  check(rByName['Errored Roofing']?.verification_status === 'failed', 'DB: status=failed', rByName['Errored Roofing']);
  check(rByName['Generic Roofing']?.facebook_url == null, 'hygiene: pre-existing generic facebook root cleaned', rByName['Generic Roofing']?.facebook_url);

  // Queue helpers surface the right sets.
  const unverified = await getUnverifiedContractors();
  const needsReview = await getNeedsReviewContractors();
  check(unverified.some((c) => c.id === idErr), 'failed item still in unverified set', unverified.map((c) => c.id));
  check(needsReview.some((c) => c.id === idFlag), 'needs_review item in review queue', needsReview.map((c) => c.id));

  // --- manual review ---
  console.log('\nmanual review:');
  await manualReview(idOk, 'unflag');
  const unflagged = await query<{ verification_status: string }>('SELECT verification_status FROM contractors WHERE id = $1', [idOk]);
  check(unflagged[0]?.verification_status === 'unverified', 'unflag -> unverified', unflagged[0]);

  await manualReview(idFlag, 'verify', 'Called the shop; established 2010');
  const verified2 = await query<{ verified: boolean; verification_status: string }>('SELECT verified, verification_status FROM contractors WHERE id = $1', [idFlag]);
  check(verified2[0]?.verified === true && verified2[0]?.verification_status === 'verified', 'manual verify -> verified', verified2[0]);

  await manualReview(idErr, 'reject', 'Not a real business');
  const rejected = await query<{ verified: boolean; verification_status: string }>('SELECT verified, verification_status FROM contractors WHERE id = $1', [idErr]);
  check(rejected[0]?.verified === false && rejected[0]?.verification_status === 'rejected', 'manual reject -> rejected', rejected[0]);

  await cleanup();

  console.log(`\n=== VERIFICATION PIPELINE: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
