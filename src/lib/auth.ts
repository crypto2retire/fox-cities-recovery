import crypto from 'crypto';

// Server-side admin authentication.
// Uses ADMIN_PASSWORD (plaintext check) + SESSION_SECRET (HMAC-signed session cookie).
// Replaces the old client-side sessionStorage check, which provided zero security.

const SECRET = process.env.SESSION_SECRET || '';

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  const a = crypto.createHash('sha256').update(password).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `admin:${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  if (!token || !SECRET) return false;
  // Next.js URL-encodes cookie values on set ('admin%3A...' for 'admin:...').
  // API routes read the raw header (still encoded) — decode before verifying.
  try {
    token = decodeURIComponent(token);
  } catch {
    // Not URL-encoded — leave as-is.
  }
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (sig.length !== expectedSig.length) return false;
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (!crypto.timingSafeEqual(a, b)) return false;
  const [prefix, expStr] = payload.split(':');
  if (prefix !== 'admin') return false;
  const exp = parseInt(expStr, 10);
  return !isNaN(exp) && exp > Date.now();
}

// Helper for route handlers — checks the admin session cookie.
// Import `cookies` from 'next/headers' in the caller to avoid a circular import here.
export async function isAdminRequest(cookieHeader: string | null | undefined): Promise<boolean> {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
  if (!match) return false;
  return verifySessionToken(match[1]);
}
