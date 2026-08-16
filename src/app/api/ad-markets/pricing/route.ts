import { NextRequest, NextResponse } from 'next/server';
import { getAdMarkets, getAdRates, upsertAdRate } from '@/lib/data-store';
import { analyzePricing } from '@/lib/ad-pricing';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Admin only — run the AI yield optimizer and return recommendations.
// GET analyzes without applying; POST applies recommendations (moves rates).
export async function GET(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [markets, rates] = await Promise.all([getAdMarkets(), getAdRates()]);
  if (markets.length === 0) {
    return NextResponse.json({ source: 'rules', analyzedAt: new Date().toISOString(), recommendations: [] });
  }
  const analysis = await analyzePricing(markets, rates);
  return NextResponse.json(analysis);
}

export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const recommendations = body?.recommendations;
    if (!Array.isArray(recommendations)) {
      return NextResponse.json({ error: 'Missing recommendations array' }, { status: 400 });
    }

    const rates = await getAdRates();
    const byKey = new Map(rates.map((r) => [`${r.marketId}:${r.placement}`, r]));

    const applied = [];
    for (const rec of recommendations) {
      const key = `${rec.marketId}:${rec.placement}`;
      const rate = byKey.get(key);
      if (!rate) continue;

      const updated = await upsertAdRate({
        ...rate,
        currentRateCents: rec.newRateCents,
        adjustmentNote: rec.reason,
      });
      applied.push(updated);
    }

    return NextResponse.json({ applied });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
