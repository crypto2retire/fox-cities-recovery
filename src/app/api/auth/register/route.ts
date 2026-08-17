import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAccount, getAccountByEmail, createAccountToken } from '@/lib/accounts';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public — register a consumer or business account.
// Body: { role: 'consumer'|'business', email, password, name, listingId? }
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`register:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const role = body?.role === 'business' ? 'business' : 'consumer';
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const name = String(body?.name ?? '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const existing = await getAccountByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists. Log in instead.' }, { status: 409 });
    }

    const account = await createAccount({
      role,
      email,
      password,
      name: name || email.split('@')[0],
      listingId: role === 'business' ? body?.listingId ?? null : null,
    });

    const token = createAccountToken(account.id, account.role);
    const store = await cookies();
    store.set('account_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
