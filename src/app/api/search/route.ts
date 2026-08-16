import { NextRequest, NextResponse } from 'next/server';
import { searchContractors, getContractors } from '@/lib/data-store';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public search endpoint. Returns ranked contractors matching q / category / city.
// When a query returns nothing AND an LLM key is configured, it fires a background
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
  const results = hasFilters
    ? await searchContractors({ q: q || undefined, category: category || undefined, city: city || undefined, state: state || undefined })
    : await getContractors();

  const scanning = false; // background scan not yet wired (Phase: scan-on-search UX)

  return NextResponse.json({
    query: { q, category, city, state },
    count: results.length,
    scanning,
    results: results.map((c) => ({
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
    })),
  });
}
