import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminPassword, createSessionToken } from '@/lib/auth';

export async function POST(req: Request) {
  let password = '';
  try {
    const body = await req.json();
    password = body?.password || '';
  } catch {
    password = '';
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createSessionToken();
  const store = await cookies();
  store.set('admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
