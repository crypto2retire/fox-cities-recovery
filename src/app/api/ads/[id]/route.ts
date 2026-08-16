import { NextRequest, NextResponse } from 'next/server';
import { deleteAd } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const deleted = await deleteAd(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
