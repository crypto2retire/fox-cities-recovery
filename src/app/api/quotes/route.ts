import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccountToken, accountCookieFromHeader } from '@/lib/accounts';
import {
  createQuoteRequest,
  getQuoteRequestsForConsumer,
  getQuoteRequestsForBusiness,
} from '@/lib/quotes';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Resolve the current account session, or null if not logged in.
async function currentAccount(req: NextRequest) {
  const token = accountCookieFromHeader(req.headers.get('cookie'));
  if (!token) return null;
  return verifyAccountToken(token);
}

// POST — consumer creates a quote request (3-quote cap enforced).
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`quote:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }

  const session = await currentAccount(request);
  if (!session) return NextResponse.json({ error: 'Please sign in to request quotes.' }, { status: 401 });

  try {
    const body = await request.json();
    const service = String(body?.service ?? '').trim();
    const businessIds: string[] = Array.isArray(body?.businessIds) ? body.businessIds.map(String) : [];
    if (!service) return NextResponse.json({ error: 'Describe the service you need.' }, { status: 400 });

    const quote = await createQuoteRequest({
      consumerId: session.accountId,
      consumerHandle: body?.consumerHandle?.trim() || 'Local resident',
      service,
      description: body?.description ?? null,
      businessIds,
      consumerName: body?.consumerName ?? null,
      consumerEmail: body?.consumerEmail ?? null,
      consumerPhone: body?.consumerPhone ?? null,
    });
    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// GET — list requests for the current account (consumer → theirs; business → their listing's).
export async function GET(request: NextRequest) {
  const session = await currentAccount(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  if (session.role === 'business') {
    const { getAccountById } = await import('@/lib/accounts');
    const account = await getAccountById(session.accountId);
    if (!account?.listingId) {
      return NextResponse.json({ error: 'This business account has no linked listing.' }, { status: 400 });
    }
    const quotes = await getQuoteRequestsForBusiness(account.listingId);
    return NextResponse.json(quotes.map((q) => businessView(q, account.listingId!)));
  }

  const quotes = await getQuoteRequestsForConsumer(session.accountId);
  return NextResponse.json(quotes.map(consumerView));
}

// Business view: PII only if released to this business; no other consumers' data.
export function businessView(q: import('@/lib/quotes').QuoteRequest, contractorId: string) {
  const released = q.releasedTo.includes(contractorId);
  return {
    id: q.id,
    service: q.service,
    description: q.description,
    status: q.status,
    consumerHandle: q.consumerHandle,
    createdAt: q.createdAt,
    releasedToMe: released,
    consumer: released
      ? { name: q.consumerName, email: q.consumerEmail, phone: q.consumerPhone }
      : null,
  };
}

// Consumer view: full, minus nothing (it's their own data).
export function consumerView(q: import('@/lib/quotes').QuoteRequest) {
  return {
    id: q.id,
    service: q.service,
    description: q.description,
    status: q.status,
    businessIds: q.businessIds,
    createdAt: q.createdAt,
    releasedTo: q.releasedTo,
  };
}
