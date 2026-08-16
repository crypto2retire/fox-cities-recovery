import { NextRequest, NextResponse } from 'next/server';
import {
  getAdMarkets,
  getAdRates,
  upsertAdMarket,
  upsertAdRate,
} from '@/lib/data-store';
import { isAdminRequest } from '@/lib/auth';
import { tierForPopulation, baseRateCents, rateBounds } from '@/lib/ad-pricing';

export const dynamic = 'force-dynamic';

// Admin only — list markets with their rates.
export async function GET(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [markets, rates] = await Promise.all([getAdMarkets(), getAdRates()]);
  return NextResponse.json({ markets, rates });
}

// Admin only — create/update a market. Recomputes tier + base rates from population.
export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.id || !body.name || !body.state) {
      return NextResponse.json({ error: 'Missing required fields: id, name, state' }, { status: 400 });
    }

    const population = Number(body.population) || 0;
    const tier = tierForPopulation(population);
    const market = await upsertAdMarket({
      id: body.id,
      name: body.name,
      state: body.state,
      cities: body.cities ?? [],
      zipCodes: body.zipCodes ?? [],
      population,
      tier,
    });

    // Seed/refresh default rate rows for the market (preserves existing rates via upsert).
    const placements = ['event', 'sidebar', 'directory'] as const;
    const rates = [];
    for (const placement of placements) {
      const base = baseRateCents(placement, tier);
      const { min, max } = rateBounds(base);
      const capacity = placement === 'event' ? 1 : placement === 'sidebar' ? 4 : 2;
      // Preserve existing current rate + fill/waitlist if present, else default.
      const existing = (await getAdRates()).find((r) => r.id === `${market.id}:${placement}`);
      rates.push(
        await upsertAdRate({
          id: `${market.id}:${placement}`,
          marketId: market.id,
          placement,
          baseRateCents: base,
          currentRateCents: existing?.currentRateCents ?? base,
          minRateCents: min,
          maxRateCents: max,
          capacity,
          filled: existing?.filled ?? 0,
          waitlist: existing?.waitlist ?? 0,
        })
      );
    }

    return NextResponse.json({ market, rates }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
