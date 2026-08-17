import { NextRequest, NextResponse } from 'next/server';
import { searchWithScan } from '@/lib/search';
import { getContractors } from '@/lib/data-store';
import type { Contractor } from '@/lib/types';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public search endpoint. Returns ranked contractors matching q / category / city.
// When a query returns nothing AND an LLM key is configured, it runs a grounded
// market scan (scan-on-search) so the directory self-builds for cold markets.
// Search itself is always available — no key required.
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`search:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a moment.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const state = searchParams.get('state');

  // Empty query → return the full directory (keeps the endpoint a single source of truth).
  const hasFilters = (q || category || city || state) && (q !== '' || category !== '' || city !== '' || state !== '');
  if (!hasFilters) {
    const all = await getContractors();
    return NextResponse.json({
      query: { q, category, city, state },
      count: all.length,
      scanning: false,
      results: all.map(publicContractor),
    });
  }

  const outcome = await searchWithScan({
    q: q || undefined,
    category: category || undefined,
    city: city || undefined,
    state: state || undefined,
  });

  return NextResponse.json({
    query: { q, category, city, state },
    count: outcome.results.length,
    scanning: outcome.scanned,
    scannedCategory: outcome.scannedCategory,
    results: outcome.results.map(publicContractor),
  });
}

// Public shape — strips contact details that must not be exposed on the API.
function publicContractor(c: Contractor) {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    city: c.city,
    phone: c.phone || null,
    website: c.website || null,
    yearEstablished: c.yearEstablished,
    rating: c.rating,
    reviewCount: c.reviewCount,
    ownershipType: c.ownershipType,
    verified: c.verified,
    description: c.description,
    services: c.services,
  };
}
