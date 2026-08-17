import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccountToken, accountCookieFromHeader, getAccountById } from '@/lib/accounts';

export const dynamic = 'force-dynamic';

// Public — return the current logged-in account (or null). Used by the client
// to decide whether to show "sign in" vs. "my account".
export async function GET(request: NextRequest) {
  const token = accountCookieFromHeader(request.headers.get('cookie'));
  if (!token) return NextResponse.json({ account: null });

  const session = verifyAccountToken(token);
  if (!session) return NextResponse.json({ account: null });

  const account = await getAccountById(session.accountId);
  return NextResponse.json({ account });
}

// Log out — clear the account session cookie.
export async function POST() {
  const store = await cookies();
  store.set('account_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return NextResponse.json({ ok: true });
}
