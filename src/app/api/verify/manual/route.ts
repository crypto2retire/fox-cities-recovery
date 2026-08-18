import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { manualReview, getNeedsReviewContractors } from '@/lib/verify';

export const dynamic = 'force-dynamic';

// Admin only — manual review actions for flagged contractors.
// Body: { contractorId, action: 'verify' | 'reject' | 'unflag', note? }
export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const contractorId = String(body?.contractorId ?? '');
    const action = body?.action as 'verify' | 'reject' | 'unflag';
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined;

    if (!contractorId || !['verify', 'reject', 'unflag'].includes(action)) {
      return NextResponse.json(
        { error: 'Missing required fields: contractorId, action (verify|reject|unflag)' },
        { status: 400 }
      );
    }

    await manualReview(contractorId, action, note);
    return NextResponse.json({ ok: true, contractorId, action });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Review action failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const queue = await getNeedsReviewContractors();
  return NextResponse.json({
    queue: queue.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      city: c.city,
      website: c.website,
      yearEstablished: c.yearEstablished,
      facebookUrl: c.facebookUrl ?? null,
      instagramUrl: c.instagramUrl ?? null,
      verificationStatus: c.verificationStatus,
      verificationNote: c.verificationNote,
      verificationCheckedAt: c.verificationCheckedAt,
    })),
  });
}
