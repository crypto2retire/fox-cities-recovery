import { NextRequest, NextResponse } from 'next/server';
import { updateHelpTicket } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Admin only — update a help ticket's status / resolution note.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const status = body?.status;
    const resolutionNote = body?.resolutionNote;

    const allowed = ['open', 'in_progress', 'resolved'];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: `Invalid status. One of: ${allowed.join(', ')}` }, { status: 400 });
    }

    const ticket = await updateHelpTicket(id, {
      status: status ?? undefined,
      resolutionNote: resolutionNote ?? undefined,
    });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
