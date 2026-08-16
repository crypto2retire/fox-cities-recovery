import { NextRequest, NextResponse } from 'next/server';
import { getAdRates, upsertAdRate } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Admin only — update a rate's demand signals (filled / waitlist). These are the
// inputs the yield optimizer reads to decide whether to raise or lower price.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const rates = await getAdRates();
    const rate = rates.find((r) => r.id === id);
    if (!rate) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });

    const filled = body?.filled !== undefined ? Number(body.filled) : rate.filled;
    const waitlist = body?.waitlist !== undefined ? Number(body.waitlist) : rate.waitlist;
    if (!Number.isFinite(filled) || !Number.isFinite(waitlist)) {
      return NextResponse.json({ error: 'filled and waitlist must be numbers' }, { status: 400 });
    }

    const updated = await upsertAdRate({
      ...rate,
      filled,
      waitlist,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
