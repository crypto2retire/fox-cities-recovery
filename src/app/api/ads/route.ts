import { NextRequest, NextResponse } from 'next/server';
import { getAds, getActiveAdsByPlacement, addAd } from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Public — returns active ads (optionally filtered by ?placement=).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get('placement');
  const ads = placement ? await getActiveAdsByPlacement(placement) : await getAds();
  return NextResponse.json(ads.filter(a => a.active));
}

// Admin only — create an ad.
export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.id || !body.title || !body.placement) {
      return NextResponse.json({ error: 'Missing required fields: id, title, placement' }, { status: 400 });
    }
    const ad = await addAd(body);
    return NextResponse.json(ad, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
