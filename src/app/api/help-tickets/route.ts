import { NextRequest, NextResponse } from 'next/server';
import { getHelpTickets } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Admin only — list all help tickets (human escalation queue).
export async function GET(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getHelpTickets());
}
