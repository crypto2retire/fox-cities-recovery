// Verifies the assistant escalation + LLM-provider swap without a live key:
//   - help_tickets CRUD round-trip (the human-escalation path)
//   - runAssistant gates on LLM key (provider swap is wired, not silently broken)
//   - parseCompetitors still normalizes scan output (regression)
import { addHelpTicket, getHelpTickets, updateHelpTicket } from '../src/lib/data-store';
import { runAssistant } from '../src/lib/assistant';
import { parseCompetitors } from '../src/lib/scanner';
import { loadLocalEnv } from './lib/env.mjs';

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

async function main() {
  // 1. Help ticket round-trip
  const created = await addHelpTicket({
    name: 'Test Resident',
    contact: '555-0100',
    topic: 'roof',
    summary: "Need a roofer after the storm, can't reach my insurance.",
  });
  check(created.id.startsWith('ht_'), 'help ticket created with id', created.id);
  check(created.status === 'open', 'ticket starts open', created.status);

  const list = await getHelpTickets();
  const found = list.find((t) => t.id === created.id);
  check(!!found, 'ticket appears in list', found?.id);

  const updated = await updateHelpTicket(created.id, { status: 'resolved', resolutionNote: 'Called resident, gave 3 roofing referrals.' });
  check(updated?.status === 'resolved', 'ticket can be resolved', updated?.status);
  check(updated?.resolvedAt != null, 'resolved_at set on resolve', updated?.resolvedAt);
  check(updated?.resolutionNote === 'Called resident, gave 3 roofing referrals.', 'resolution note saved', updated?.resolutionNote);

  // reopen clears resolved_at
  const reopened = await updateHelpTicket(created.id, { status: 'open' });
  check(reopened?.status === 'open' && reopened?.resolvedAt == null, 'reopen clears resolved_at', reopened);

  // 2. Assistant gates on LLM key (provider swap wired: throws clean, not a silent no-op)
  let threw = false;
  try {
    await runAssistant([{ role: 'user', content: 'I need a roofer' }]);
  } catch (e) {
    threw = /LLM not configured/.test(e instanceof Error ? e.message : String(e));
  }
  check(threw, 'assistant throws clean "LLM not configured" without a key', threw);

  // 3. Scanner parser regression (normalizes markdown + maps fields)
  const parsed = parseCompetitors('```json\n{"competitors":[{"name":"A Roofing","rating":"4.5","review_count":"88","facebook_url":"https://fb.com/aroofing","content_themes":["storms"]}]}\n```');
  check(parsed.length === 1, 'parseCompetitors returns 1', parsed.length);
  check(parsed[0]?.rating === 4.5, 'rating coerced from string', parsed[0]?.rating);
  check(parsed[0]?.review_count === 88, 'review_count coerced', parsed[0]?.review_count);
  check(parsed[0]?.facebook_url === 'https://fb.com/aroofing', 'facebook_url mapped', parsed[0]?.facebook_url);

  console.log(`\n=== ASSISTANT + PROVIDER SWAP: ${pass} passed, ${fail} failed ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
