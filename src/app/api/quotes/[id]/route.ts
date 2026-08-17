import { NextRequest, NextResponse } from 'next/server';
import { verifyAccountToken, accountCookieFromHeader } from '@/lib/accounts';
import {
  getQuoteRequest,
  getQuoteMessages,
  addQuoteMessage,
  updateQuoteStatus,
  releasePiiTo,
} from '@/lib/quotes';

export const dynamic = 'force-dynamic';

async function currentAccount(req: NextRequest) {
  const token = accountCookieFromHeader(req.headers.get('cookie'));
  if (!token) return null;
  return verifyAccountToken(token);
}

// GET — quote detail + messages for the current account (consumer owner or involved business).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await currentAccount(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const quote = await getQuoteRequest(id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const authorized = quote.consumerId === session.accountId;
  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const messages = await getQuoteMessages(id);
  return NextResponse.json({ quote, messages });
}

// POST — send a message in this thread.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await currentAccount(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const text = String(body?.body ?? '').trim();
  if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 });

  const quote = await getQuoteRequest(id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isConsumer = quote.consumerId === session.accountId;
  const msg = await addQuoteMessage({
    quoteRequestId: id,
    senderRole: isConsumer ? 'consumer' : 'business',
    senderContractorId: isConsumer ? null : body?.contractorId ?? null,
    body: text.slice(0, 4000),
  });
  return NextResponse.json(msg, { status: 201 });
}

// PATCH — update status (business: mark quoted/hired/done; consumer: nothing yet).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await currentAccount(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const status = body?.status;
  const allowed = ['requested', 'quoted', 'hired', 'scheduled', 'done'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `Invalid status. One of: ${allowed.join(', ')}` }, { status: 400 });
  }

  const quote = await getQuoteRequest(id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (quote.consumerId !== session.accountId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const updated = await updateQuoteStatus(id, status);
  return NextResponse.json(updated);
}

// POST /release — consumer releases their PII to a specific business.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await currentAccount(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const contractorId = String(body?.contractorId ?? '');
  if (!contractorId) return NextResponse.json({ error: 'contractorId required' }, { status: 400 });

  const quote = await getQuoteRequest(id);
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (quote.consumerId !== session.accountId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const updated = await releasePiiTo(id, contractorId);
  return NextResponse.json(updated);
}
