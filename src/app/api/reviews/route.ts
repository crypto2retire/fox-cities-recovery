import { NextRequest, NextResponse } from 'next/server';
import { getAllReviews, addReview, deleteReview, getContractors } from '@/lib/data-store';
import { checkForFraud, sanitizeReviews } from '@/lib/fraud-detection';
import { isAdminRequest } from '@/lib/auth';
import type { Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reviews = await getAllReviews();
  return NextResponse.json(sanitizeReviews(reviews));
}

// Public — anyone can submit a review (that's the point). Fraud detection runs here.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id || !body.contractorId || !body.authorName || !body.rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allContractors = (await getContractors()).map(c => ({ id: c.id, name: c.name }));
    const existingReviews = (await getAllReviews()).filter(r => r.contractorId === body.contractorId);
    const fraudResult = checkForFraud(body, existingReviews, allContractors);

    const review: Review = {
      ...body,
      flagged: fraudResult.flagged,
      flagReason: fraudResult.reasons.join('; ') || undefined,
    };

    const saved = await addReview(review);

    const { contactEmail, contactPhone, ...safe } = saved;
    return NextResponse.json(safe, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

// Admin only — deleting reviews requires auth.
export async function DELETE(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const deleted = await deleteReview(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
