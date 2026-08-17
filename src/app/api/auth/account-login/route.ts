import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccountByEmail, verifyPassword, createAccountToken } from '@/lib/accounts';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public — log in a consumer or business account.
// Body: { email, password }
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    const account = await getAccountByEmail(email);
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = createAccountToken(account.id, account.role);
    const store = await cookies();
    store.set('account_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      account: {
        id: account.id,
        role: account.role,
        email: account.email,
        name: account.name,
        listingId: account.listingId ?? null,
        verificationStatus: account.verificationStatus,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
