// Quote requests + in-app messaging + the CRM pipeline.
// This is the core "anti-Yelp" mechanic: a consumer requests quotes from up to 3
// businesses they choose; identity is released only on explicit opt-in; businesses
// respond in-app; the consumer hires one and the job flows lead → quoted → hired → done.
//
// Privacy invariants (DECIDED):
//   - Consumer PII (name/email/phone) lives on the quote_request row, but is only
//     *exposed* to a business after the consumer explicitly releases it.
//   - Message bodies may contain no PII by convention; the UI guides users away from it.
import crypto from 'crypto';
import { query } from './db';

export const QUOTE_CAP = 3; // max businesses per request (the 3-quote cap)

export type QuoteStatus = 'requested' | 'quoted' | 'hired' | 'scheduled' | 'done';

interface QuoteRow {
  id: string;
  consumer_id: string | null;
  consumer_handle: string;
  service: string;
  description: string | null;
  status: string;
  consumer_name: string | null;
  consumer_email: string | null;
  consumer_phone: string | null;
  released_to: string | null; // contractor_id the consumer released PII to (JSON array text)
  created_at: Date;
}

interface QuoteBusinessRow {
  quote_request_id: string;
  contractor_id: string;
}

interface MessageRow {
  id: string;
  quote_request_id: string;
  sender_role: string; // consumer | business
  sender_contractor_id: string | null;
  body: string;
  created_at: Date;
}

function toQuote(row: QuoteRow, businessIds: string[]): QuoteRequest {
  let released: string[] = [];
  if (row.released_to) {
    try { released = JSON.parse(row.released_to); } catch { released = []; }
  }
  return {
    id: row.id,
    consumerId: row.consumer_id,
    consumerHandle: row.consumer_handle,
    service: row.service,
    description: row.description ?? '',
    status: row.status as QuoteStatus,
    businessIds,
    createdAt: row.created_at.toISOString(),
    // PII fields are returned so the *owner* (consumer) can see them; the API
    // layer strips them for business views.
    consumerName: row.consumer_name,
    consumerEmail: row.consumer_email,
    consumerPhone: row.consumer_phone,
    releasedTo: released,
  };
}

export interface QuoteRequest {
  id: string;
  consumerId: string | null;
  consumerHandle: string;
  service: string;
  description: string;
  status: QuoteStatus;
  businessIds: string[];
  createdAt: string;
  consumerName?: string | null;
  consumerEmail?: string | null;
  consumerPhone?: string | null;
  releasedTo: string[];
}

export interface QuoteMessage {
  id: string;
  quoteRequestId: string;
  senderRole: 'consumer' | 'business';
  senderContractorId: string | null;
  body: string;
  createdAt: string;
}

export interface CreateQuoteInput {
  consumerId: string | null;
  consumerHandle: string;
  service: string;
  description?: string;
  businessIds: string[];
  consumerName?: string | null;
  consumerEmail?: string | null;
  consumerPhone?: string | null;
}

export async function createQuoteRequest(input: CreateQuoteInput): Promise<QuoteRequest> {
  const ids = input.businessIds.slice(0, QUOTE_CAP);
  if (ids.length === 0) throw new Error('Select at least one business.');

  const id = `q_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const rows = await query<QuoteRow>(
    `INSERT INTO quote_requests (
       id, consumer_id, consumer_handle, service, description, status,
       consumer_name, consumer_email, consumer_phone
     ) VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7, $8)
     RETURNING *`,
    [id, input.consumerId, input.consumerHandle, input.service, input.description ?? null,
     input.consumerName ?? null, input.consumerEmail ?? null, input.consumerPhone ?? null]
  );

  for (const cid of ids) {
    await query(
      `INSERT INTO quote_request_businesses (quote_request_id, contractor_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, cid]
    );
  }
  return toQuote(rows[0], ids);
}

export async function getQuoteRequest(id: string): Promise<QuoteRequest | null> {
  const rows = await query<QuoteRow>('SELECT * FROM quote_requests WHERE id = $1', [id]);
  if (!rows.length) return null;
  const biz = await query<QuoteBusinessRow>(
    'SELECT contractor_id FROM quote_request_businesses WHERE quote_request_id = $1', [id]
  );
  return toQuote(rows[0], biz.map((b) => b.contractor_id));
}

export async function getQuoteRequestsForConsumer(consumerId: string): Promise<QuoteRequest[]> {
  const rows = await query<QuoteRow>(
    'SELECT * FROM quote_requests WHERE consumer_id = $1 ORDER BY created_at DESC', [consumerId]
  );
  const out: QuoteRequest[] = [];
  for (const r of rows) {
    const biz = await query<QuoteBusinessRow>(
      'SELECT contractor_id FROM quote_request_businesses WHERE quote_request_id = $1', [r.id]
    );
    out.push(toQuote(r, biz.map((b) => b.contractor_id)));
  }
  return out;
}

export async function getQuoteRequestsForBusiness(contractorId: string): Promise<QuoteRequest[]> {
  const biz = await query<QuoteBusinessRow>(
    'SELECT quote_request_id FROM quote_request_businesses WHERE contractor_id = $1', [contractorId]
  );
  const out: QuoteRequest[] = [];
  for (const b of biz) {
    const r = await getQuoteRequest(b.quote_request_id);
    if (r) out.push(r);
  }
  return out;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<QuoteRequest | null> {
  await query('UPDATE quote_requests SET status = $1 WHERE id = $2', [status, id]);
  return getQuoteRequest(id);
}

/** Consumer releases their PII to ONE specific business. Idempotent. */
export async function releasePiiTo(id: string, contractorId: string): Promise<QuoteRequest | null> {
  const current = await getQuoteRequest(id);
  if (!current) return null;
  const released = new Set(current.releasedTo);
  released.add(contractorId);
  await query('UPDATE quote_requests SET released_to = $1 WHERE id = $2',
    [JSON.stringify(Array.from(released)), id]);
  return getQuoteRequest(id);
}

export async function addQuoteMessage(input: {
  quoteRequestId: string;
  senderRole: 'consumer' | 'business';
  senderContractorId?: string | null;
  body: string;
}): Promise<QuoteMessage> {
  const id = `m_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const rows = await query<MessageRow>(
    `INSERT INTO messages (id, quote_request_id, sender_role, sender_contractor_id, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, input.quoteRequestId, input.senderRole, input.senderContractorId ?? null, input.body]
  );
  return toMessage(rows[0]);
}

export async function getQuoteMessages(quoteRequestId: string): Promise<QuoteMessage[]> {
  const rows = await query<MessageRow>(
    'SELECT * FROM messages WHERE quote_request_id = $1 ORDER BY created_at ASC', [quoteRequestId]
  );
  return rows.map(toMessage);
}

function toMessage(row: MessageRow): QuoteMessage {
  return {
    id: row.id,
    quoteRequestId: row.quote_request_id,
    senderRole: row.sender_role === 'business' ? 'business' : 'consumer',
    senderContractorId: row.sender_contractor_id,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}
