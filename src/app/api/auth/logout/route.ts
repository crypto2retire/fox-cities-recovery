import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const store = await cookies();
  store.set('admin_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
