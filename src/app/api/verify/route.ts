import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { verifyContractorsWithAI, getUnverifiedContractors } from '@/lib/verify';

export const dynamic = 'force-dynamic';

// Admin only — run AI verification over unverified (scan-added) contractors.
// Optionally target a specific set with { contractorIds: [...] }.
export async function POST(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const contractorIds: string[] | undefined = Array.isArray(body?.contractorIds)
      ? body.contractorIds.map(String)
      : undefined;

    const outcomes = await verifyContractorsWithAI(contractorIds);

    return NextResponse.json({
      verified: outcomes.filter((o) => o.status === 'verified').length,
      needsReview: outcomes.filter((o) => o.status === 'needs_review').length,
      failed: outcomes.filter((o) => o.status === 'failed').length,
      total: outcomes.length,
      outcomes: outcomes.map((o) => ({
        contractorId: o.contractorId,
        name: o.name,
        status: o.status,
        yearEstablished: o.yearEstablished,
        note: o.note,
        facebookUrl: o.facebookUrl ?? null,
        instagramUrl: o.instagramUrl ?? null,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    const status = /LLM not configured/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET(request: NextRequest) {
  const authorized = await isAdminRequest(request.headers.get('cookie'));
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unverified = await getUnverifiedContractors();
  return NextResponse.json({
    unverified: unverified.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      city: c.city,
      website: c.website,
      yearEstablished: c.yearEstablished,
      facebookUrl: c.facebookUrl ?? null,
      instagramUrl: c.instagramUrl ?? null,
    })),
  });
}
