import { NextRequest, NextResponse } from 'next/server';
import { scanAndIngestMarket } from '@/lib/market-scan';
import { isAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Admin only — trigger an on-demand market scan for a (city, state, category).
// Serves from cache when a fresh scan exists (within MARKET_SCAN_TTL_DAYS).
export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { city, state, category } = body ?? {};
    if (!city || !state || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: city, state, category' },
        { status: 400 }
      );
    }

    const outcome = await scanAndIngestMarket(
      String(city),
      String(state),
      String(category)
    );
    return NextResponse.json(outcome);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scan failed';
    // 503 = scanner not configured (needs ANTHROPIC_API_KEY); 500 = other failure.
    const status = msg.includes('ANTHROPIC_API_KEY') ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
