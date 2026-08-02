import { NextRequest, NextResponse } from 'next/server';
import { getAllReviews, addReview, deleteReview } from '@/lib/data-store';

export async function GET() {
  return NextResponse.json(getAllReviews());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id || !body.contractorId || !body.authorName || !body.rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const review = addReview(body);
    return NextResponse.json(review, { status: 201 });
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
