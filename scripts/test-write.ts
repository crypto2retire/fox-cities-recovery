// scripts/test-write.ts — exercises the Postgres write path directly (no HTTP/auth).
// Run: DATABASE_URL=... npx tsx scripts/test-write.ts
import {
  addContractor,
  getContractorById,
  updateContractor,
  deleteContractor,
  addReview,
  deleteReview,
  getReviewsForContractor,
} from '../src/lib/data-store';
import type { Contractor } from '../src/lib/types';

const TEST_ID = '__test_contractor__';
const TEST_REVIEW_ID = '__test_review__';

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

async function main() {
  // Clean any leftover from a previous interrupted run.
  await deleteContractor(TEST_ID);

  // 1. add
  const c: Contractor = {
    id: TEST_ID,
    name: 'Test Contractor LLC',
    category: 'roofing',
    phone: '(920) 000-0000',
    address: '123 Test St',
    city: 'Menasha',
    description: 'test',
    services: ['Roofing', 'Storm Repair'],
    yearEstablished: 2010,
    verified: true,
    insuranceVerified: false,
    ownershipType: 'locally-owned',
    rating: null,
    reviewCount: null,
  };
  const added = await addContractor(c);
  check(added.name === 'Test Contractor LLC', 'addContractor returns name', added.name);
  check(added.services.length === 2, 'addContractor round-trips services[]', added.services);

  // 2. read back — rating/reviewCount null, yearEstablished int
  const read = await getContractorById(TEST_ID);
  check(read !== null, 'getContractorById finds it');
  check(read !== null && read.rating === null, 'rating null on fresh contractor', read?.rating);
  check(read !== null && read.yearEstablished === 2010, 'yearEstablished int round-trip', read?.yearEstablished);

  // 3. add review → rating denormalizes to 5.0, reviewCount 1
  await addReview({
    id: TEST_REVIEW_ID,
    contractorId: TEST_ID,
    authorName: 'Local Tester',
    rating: 5,
    comment: 'Great local roofer, very responsive and honest.',
    date: '2026-08-15',
    source: 'in-app',
  });
  const afterReview = await getContractorById(TEST_ID);
  check(afterReview?.rating === 5.0, 'rating becomes 5.0 after one 5-star review', afterReview?.rating);
  check(afterReview?.reviewCount === 1, 'reviewCount becomes 1', afterReview?.reviewCount);
  const reviews = await getReviewsForContractor(TEST_ID);
  check(reviews.length === 1 && reviews[0].authorName === 'Local Tester', 'getReviewsForContractor returns the review', reviews.length);

  // 4. dynamic UPDATE (partial fields) — city change, services survives untouched
  const updated = await updateContractor(TEST_ID, { city: 'Appleton' });
  check(updated?.city === 'Appleton', 'updateContractor sets city', updated?.city);
  check(updated?.name === 'Test Contractor LLC', 'updateContractor leaves untouched fields intact', updated?.name);
  check(updated?.services.length === 2, 'updateContractor preserves services[]', updated?.services);

  // 5. update services array (jsonb path)
  const updated2 = await updateContractor(TEST_ID, { services: ['Siding'] });
  check(updated2?.services.length === 1 && updated2.services[0] === 'Siding', 'updateContractor replaces services[]', updated2?.services);

  // 6. delete review → rating nulls back out
  const delRev = await deleteReview(TEST_REVIEW_ID);
  check(delRev === true, 'deleteReview returns true', delRev);
  const afterDelReview = await getContractorById(TEST_ID);
  check(afterDelReview?.rating === null, 'rating nulls after review delete', afterDelReview?.rating);
  check(afterDelReview?.reviewCount === null, 'reviewCount nulls after review delete', afterDelReview?.reviewCount);

  // 7. delete contractor → gone
  const delCon = await deleteContractor(TEST_ID);
  check(delCon === true, 'deleteContractor returns true', delCon);
  const gone = await getContractorById(TEST_ID);
  check(gone === null, 'getContractorById returns null after delete', gone);

  // 8. confirm the other 51 real contractors are untouched
  const { getContractors } = await import('../src/lib/data-store');
  const all = await getContractors();
  check(all.length === 51, '51 real contractors still present', all.length);

  console.log(`\n=== WRITE PATH: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
