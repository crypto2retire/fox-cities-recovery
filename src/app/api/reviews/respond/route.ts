import { NextRequest, NextResponse } from 'next/server';
import { updateReview } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { reviewId, businessResponse, businessResponseDate } = body;
    if (!reviewId) {
      return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 });
    }
    const updated = await updateReview(reviewId, { businessResponse, businessResponseDate });
    if (!updated) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    const { contactEmail, contactPhone, ...safe } = updated;
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
