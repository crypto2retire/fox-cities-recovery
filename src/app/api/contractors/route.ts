import { NextRequest, NextResponse } from 'next/server';
import { getContractors, addContractor } from '@/lib/data-store';

export async function GET() {
  return NextResponse.json(getContractors());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id || !body.name || !body.category) {
      return NextResponse.json({ error: 'Missing required fields: id, name, category' }, { status: 400 });
    }
    const contractor = addContractor(body);
    return NextResponse.json(contractor, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
