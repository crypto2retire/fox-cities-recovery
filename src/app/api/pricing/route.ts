import { NextRequest, NextResponse } from 'next/server';
import { getRoofPricing, updateRoofPricing } from '@/lib/data-store';

export async function GET() {
  return NextResponse.json(getRoofPricing());
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const pricing = updateRoofPricing(body);
    return NextResponse.json(pricing);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
