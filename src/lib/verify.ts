// AI verification pipeline for scan-added contractors.
//
// Every listing in the directory must have had a physical presence in the area
// BEFORE the storm (no storm chasers, no post-storm startups). For contractors
// discovered by market scans we don't know that yet — this module asks Gemini
// (with Google Search grounding) to check each one: does it exist, is it
// local, and is there evidence it predates the storm. Results:
//   - 'verified'    → solid evidence found; listing gets the verified badge.
//   - 'needs_review'→ AI could NOT confirm; flagged for a human (Kevin).
//   - 'failed'      → the verification call itself errored (retryable).
// NEVER fabricates: the LLM must cite evidence; anything uncertain is flagged.
import { getPool, query } from './db';
import { chatJson } from './llm';
import type { Contractor } from './types';

export type VerificationStatus = 'unverified' | 'verified' | 'needs_review' | 'failed' | 'rejected';

export interface VerificationLLMResult {
  exists: boolean;
  city_confirmed: boolean;
  established_year: number | null;
  pre_storm_presence: boolean | null;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
}

export type VerifyFn = (c: Contractor) => Promise<VerificationLLMResult>;

export interface VerificationOutcome {
  contractorId: string;
  name: string;
  status: VerificationStatus;
  yearEstablished: number | null;
  note: string;
}

const VERIFY_MODEL = process.env.GEMINI_SCAN_MODEL || 'gemini-3.5-flash-lite';

const VERIFY_SYSTEM = `You verify contractors for a storm-recovery directory.
The directory only lists businesses that had a physical presence in the Fox Cities, Wisconsin area BEFORE July 27, 2026 — no storm chasers and no companies that started after the tornado.

For each business, use Google Search to check:
1. Does the business actually exist?
2. Is it really located in/near the given city/state?
3. Is there evidence it existed BEFORE July 27, 2026 (e.g. an establishment year, old reviews, local news, BBB, Google Business profile, its own website)?

Respond with ONLY a JSON object:
{"exists":true|false,"city_confirmed":true|false,"established_year":number|null,"pre_storm_presence":true|false|null,"evidence":"brief factual summary with source names","confidence":"high"|"medium"|"low"}

Rules:
- established_year: ONLY a number if a source states it (website says "Est. 2015", Google Business years in business, BBB, etc.). Otherwise null.
- pre_storm_presence: true ONLY with actual evidence of existence before 2026-07-27. null if you cannot determine it.
- Never invent facts. If you cannot verify something, say so and use null / low confidence.
- A business that clearly started in 2026 or later is NOT eligible (pre_storm_presence=false).`;

function promptFor(c: Contractor): string {
  return `Business: ${c.name}
City/State: ${c.city}, WI
Website: ${c.website || 'not known'}
Category: ${c.category}

Verify this business using Google Search and return the JSON object.`;
}

/** One grounded verification call, bounded so a hung LLM can't stall the queue. */
async function verifyOne(c: Contractor, verifyFn: VerifyFn = defaultVerifyFn): Promise<VerificationLLMResult> {
  if (verifyFn === defaultVerifyFn) {
    return withTimeout(60_000, defaultVerifyFn(c));
  }
  return verifyFn(c);
}

async function defaultVerifyFn(c: Contractor): Promise<VerificationLLMResult> {
  return chatJson<VerificationLLMResult>({
    system: VERIFY_SYSTEM,
    messages: [{ role: 'user', content: promptFor(c) }],
    useSearch: true,
    model: VERIFY_MODEL,
    temperature: 0,
  });
}

function withTimeout<T>(ms: number, p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Verification timed out after ${ms / 1000}s`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

/** Decide the outcome from the LLM result. Conservative: any uncertainty → needs_review. */
export function decideVerification(r: VerificationLLMResult, c: Contractor): VerificationOutcome {
  const name = c.name;
  const confirmed =
    r.exists === true &&
    r.city_confirmed === true &&
    r.pre_storm_presence === true &&
    r.confidence !== 'low';

  if (confirmed) {
    return {
      contractorId: c.id,
      name,
      status: 'verified',
      yearEstablished: typeof r.established_year === 'number' && r.established_year > 1900 && r.established_year <= 2026 ? r.established_year : null,
      note: `AI verified (${r.confidence}): ${r.evidence}`,
    };
  }

  const why: string[] = [];
  if (r.exists === false) why.push('could not confirm the business exists');
  if (r.city_confirmed === false) why.push('not confirmed in the listed city');
  if (r.pre_storm_presence === false) why.push('evidence suggests it started AFTER the storm');
  if (r.pre_storm_presence === null) why.push('no evidence of pre-storm presence found');
  if (r.confidence === 'low') why.push('low confidence');
  const detail = why.length ? why.join('; ') : 'could not fully confirm';

  return {
    contractorId: c.id,
    name,
    status: 'needs_review',
    yearEstablished: null,
    note: `AI could not confirm (${r.confidence}): ${detail}. Evidence: ${r.evidence}`,
  };
}

async function applyOutcome(o: VerificationOutcome): Promise<void> {
  const pool = getPool();
  if (o.status === 'verified') {
    await pool.query(
      `UPDATE contractors
          SET verified = TRUE,
              verification_status = 'verified',
              verification_note = $2,
              verification_checked_at = now(),
              year_established = COALESCE($3::int, year_established)
        WHERE id = $1`,
      [o.contractorId, o.note, o.yearEstablished]
    );
  } else {
    await pool.query(
      `UPDATE contractors
          SET verification_status = $2,
              verification_note = $3,
              verification_checked_at = now()
        WHERE id = $1`,
      [o.contractorId, o.status, o.note]
    );
  }
}

export async function getUnverifiedContractors(): Promise<Contractor[]> {
  return query<Contractor>(
    "SELECT * FROM contractors WHERE verified = FALSE AND verification_status <> 'rejected' ORDER BY created_at DESC"
  );
}

export async function getNeedsReviewContractors(): Promise<Contractor[]> {
  return query<Contractor>(
    "SELECT * FROM contractors WHERE verification_status = 'needs_review' ORDER BY verification_checked_at DESC NULLS LAST"
  );
}

/** Run AI verification over unverified contractors (or a specific set of ids). */
export async function verifyContractorsWithAI(
  ids?: string[],
  verifyFn?: VerifyFn
): Promise<VerificationOutcome[]> {
  const contractors: Contractor[] = ids?.length
    ? await query<Contractor>('SELECT * FROM contractors WHERE id = ANY($1::text[])', [ids])
    : await getUnverifiedContractors();

  const outcomes: VerificationOutcome[] = [];
  // Small concurrency (2) to bound latency + stay polite to the API.
  const queue = [...contractors];
  const workers = Array.from({ length: Math.min(2, Math.max(1, queue.length)) }, async () => {
    while (queue.length) {
      const c = queue.shift()!;
      try {
        const r = await verifyOne(c, verifyFn);
        const outcome = decideVerification(r, c);
        await applyOutcome(outcome);
        outcomes.push(outcome);
      } catch (err) {
        const outcome: VerificationOutcome = {
          contractorId: c.id,
          name: c.name,
          status: 'failed',
          yearEstablished: null,
          note: `AI verification errored: ${err instanceof Error ? err.message : 'unknown error'}`,
        };
        await applyOutcome(outcome);
        outcomes.push(outcome);
      }
    }
  });
  await Promise.all(workers);
  return outcomes;
}

/** Manual admin review actions for the queue. */
export async function manualReview(
  contractorId: string,
  action: 'verify' | 'reject' | 'unflag',
  note?: string
): Promise<void> {
  const pool = getPool();
  if (action === 'verify') {
    await pool.query(
      `UPDATE contractors
          SET verified = TRUE,
              verification_status = 'verified',
              verification_note = $2,
              verification_checked_at = now()
        WHERE id = $1`,
      [contractorId, note ? `Manually verified: ${note}` : 'Manually verified by admin']
    );
  } else if (action === 'reject') {
    await pool.query(
      `UPDATE contractors
          SET verified = FALSE,
              verification_status = 'rejected',
              verification_note = $2,
              verification_checked_at = now()
        WHERE id = $1`,
      [contractorId, note ? `Rejected: ${note}` : 'Rejected by admin (not a qualifying local pre-storm business)']
    );
  } else if (action === 'unflag') {
    await pool.query(
      `UPDATE contractors
          SET verification_status = 'unverified',
              verification_note = NULL,
              verification_checked_at = NULL
        WHERE id = $1`,
      [contractorId]
    );
  }
}
