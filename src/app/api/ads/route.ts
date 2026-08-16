import { NextRequest, NextResponse } from 'next/server';
import { getAds, getActiveAdsByPlacement, addAd } from '@/lib/data-store';
import { adMatchesGeo } from '@/lib/ad-pricing';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Public — returns active ads filtered by ?placement= and geo (?city=&state=&zip=).
// Geo semantics: an ad with no geo constraint is shown everywhere; otherwise it
// must match the requested city / zip / state.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get('placement');
  const geo = {
    city: searchParams.get('city'),
    state: searchParams.get('state'),
    zip: searchParams.get('zip'),
  };

  const ads = placement ? await getActiveAdsByPlacement(placement) : await getAds();
  const active = ads.filter((a) => a.active);

  // Prefer geo-targeted matches over general ads when both exist.
  const matched = active.filter((a) => adMatchesGeo(a, geo));
  const targeted = matched.filter(
    (a) => (a.cities?.length ?? 0) > 0 || (a.zipCodes?.length ?? 0) > 0 || !!a.state
  );
  const general = matched.filter((a) => !(a.cities?.length ?? 0) && !(a.zipCodes?.length ?? 0) && !a.state);

  return NextResponse.json([...targeted, ...general]);
}

// Admin only — create an ad (supports geo-targeting fields).
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
