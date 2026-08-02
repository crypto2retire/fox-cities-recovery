import { NextRequest, NextResponse } from 'next/server';
import { updateReview } from '@/lib/data-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, businessResponse, businessResponseDate } = body;
    if (!reviewId) {
      return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 });
    }
    const updated = updateReview(reviewId, { businessResponse, businessResponseDate });
    if (!updated) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    // Return sanitized
    const { contactEmail, contactPhone, ...safe } = updated;
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
