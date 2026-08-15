import { NextRequest, NextResponse } from 'next/server';
import { getContractors, addContractor } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export async function GET() {
  return NextResponse.json(getContractors());
}

export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body.id || !body.name || !body.category) {
      return NextResponse.json({ error: 'Missing required fields: id, name, category' }, { status: 400 });
    }
    const contractor = addContractor(body);
    return NextResponse.json(contractor, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
