// Verifies the identity + quote/messaging layer (Phase 2 foundation) without a browser:
//   - password hashing + account token round-trip
//   - account CRUD
//   - quote request + 3-quote cap + PII release + status pipeline + messages
import { loadLocalEnv } from './lib/env.mjs';

loadLocalEnv();
// SESSION_SECRET lives in Railway (not .env.local); set a local one for the token test.
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-64-hex-chars-for-local-tests";

import { hashPassword, verifyPassword, createAccountToken, verifyAccountToken, createAccount, getAccountByEmail } from '../src/lib/accounts';
import { createQuoteRequest, getQuoteMessages, addQuoteMessage, updateQuoteStatus, releasePiiTo, getQuoteRequestsForConsumer, getQuoteRequestsForBusiness, QUOTE_CAP } from '../src/lib/quotes';
import { getContractors } from '../src/lib/data-store';

let pass = 0;
let fail = 0;
function check(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${msg}`); }
  else { fail++; console.log(`  FAIL  ${msg}${detail !== undefined ? ` (got: ${JSON.stringify(detail)})` : ''}`); }
}

async function cleanup() {
  const { getPool } = await import('../src/lib/db');
  const pool = getPool();
  await pool.query(`DELETE FROM messages WHERE quote_request_id IN (SELECT id FROM quote_requests WHERE consumer_id IN (SELECT id FROM accounts WHERE email LIKE '%@test.donelocal'))`);
  await pool.query(`DELETE FROM quote_request_businesses WHERE quote_request_id IN (SELECT id FROM quote_requests WHERE consumer_id IN (SELECT id FROM accounts WHERE email LIKE '%@test.donelocal'))`);
  await pool.query(`DELETE FROM quote_requests WHERE consumer_id IN (SELECT id FROM accounts WHERE email LIKE '%@test.donelocal')`);
  await pool.query(`DELETE FROM accounts WHERE email LIKE '%@test.donelocal'`);
}

async function main() {
  await cleanup();
  const realContractors = await getContractors();
  const ids = realContractors.slice(0, 4).map((c) => c.id);

  // 1. Password hashing
  const hashed = hashPassword('correct-horse-battery');
  check(verifyPassword('correct-horse-battery', hashed), 'password verifies', true);
  check(!verifyPassword('wrong', hashed), 'wrong password rejected', false);

  // 2. Account token
  const token = createAccountToken('acct_x', 'consumer');
  const session = verifyAccountToken(token);
  check(session?.accountId === 'acct_x' && session?.role === 'consumer', 'token round-trips account+role', session);

  // 3. Account CRUD
  const consumer = await createAccount({ role: 'consumer', email: 'buyer@test.donelocal', password: 'password123', name: 'Test Buyer' });
  check(consumer.role === 'consumer' && consumer.email === 'buyer@test.donelocal', 'consumer account created', consumer.email);
  const biz = await createAccount({ role: 'business', email: 'roofer@test.donelocal', password: 'password123', name: 'Test Roofer', listingId: ids[0] });
  check(biz.listingId === ids[0], 'business account links to listing', biz.listingId);

  const fetched = await getAccountByEmail('buyer@test.donelocal');
  check(!!fetched?.passwordHash && fetched.passwordHash.includes(':'), 'password stored hashed (not plaintext)', fetched?.passwordHash?.slice(0, 3));

  // 4. Quote request with 3-quote cap (supply 4 → capped to 3)
  const quote = await createQuoteRequest({
    consumerId: consumer.id,
    consumerHandle: 'Test Buyer',
    service: 'Roof repair',
    description: 'Shingles missing over garage',
    businessIds: ids.slice(0, 4),
    consumerName: 'Test Buyer',
    consumerEmail: 'buyer@test.donelocal',
    consumerPhone: '555-0100',
  });
  check(quote.businessIds.length === QUOTE_CAP, `3-quote cap enforced (${QUOTE_CAP})`, quote.businessIds.length);
  check(quote.status === 'requested', 'quote starts requested', quote.status);

  // 5. Status pipeline
  check((await updateQuoteStatus(quote.id, 'quoted'))?.status === 'quoted', 'advance to quoted');
  check((await updateQuoteStatus(quote.id, 'hired'))?.status === 'hired', 'advance to hired');
  await updateQuoteStatus(quote.id, 'done');

  // 6. PII release
  const released = await releasePiiTo(quote.id, ids[0]);
  check(released?.releasedTo.includes(ids[0]) === true, 'PII released to business 0', released?.releasedTo);
  check(released?.releasedTo.includes(ids[1]) === false, 'PII NOT released to business 1', released?.releasedTo);

  // 7. Messages
  await addQuoteMessage({ quoteRequestId: quote.id, senderRole: 'consumer', body: 'When can you come out?' });
  await addQuoteMessage({ quoteRequestId: quote.id, senderRole: 'business', senderContractorId: ids[0], body: 'Tomorrow morning works.' });
  const msgs = await getQuoteMessages(quote.id);
  check(msgs.length === 2, 'messages persisted (2)', msgs.length);
  check(msgs[0].senderRole === 'consumer' && msgs[1].senderRole === 'business', 'message roles correct', msgs.map(m => m.senderRole));

  // 8. List views
  check((await getQuoteRequestsForConsumer(consumer.id)).length >= 1, 'consumer sees their quote');
  check((await getQuoteRequestsForBusiness(ids[0])).some(q => q.id === quote.id), 'business sees the request');

  await cleanup();

  console.log(`\n=== PHASE 2 (IDENTITY + QUOTES + MESSAGING): ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
