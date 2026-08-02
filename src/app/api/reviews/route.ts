import { NextRequest, NextResponse } from 'next/server';
import { getAllReviews, addReview, deleteReview, getContractors } from '@/lib/data-store';
import { checkForFraud, sanitizeReviews } from '@/lib/fraud-detection';
import type { Review } from '@/lib/types';

export async function GET() {
  const reviews = getAllReviews();
  return NextResponse.json(sanitizeReviews(reviews));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id || !body.contractorId || !body.authorName || !body.rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Run fraud detection
    const allContractors = getContractors().map(c => ({ id: c.id, name: c.name }));
    const existingReviews = getAllReviews().filter(r => r.contractorId === body.contractorId);
    const fraudResult = checkForFraud(body, existingReviews, allContractors);

    const review: Review = {
      ...body,
      flagged: fraudResult.flagged,
      flagReason: fraudResult.reasons.join('; ') || undefined,
    };

    const saved = addReview(review);

    // Return sanitized version (no private fields)
    const { contactEmail, contactPhone, ...safe } = saved;
    return NextResponse.json(safe, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const deleted = deleteReview(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
