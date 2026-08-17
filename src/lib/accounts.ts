// Account identity + auth — consumer and business accounts.
// Passwords are hashed (scrypt). Sessions are HMAC-signed cookies, separate from
// the admin session (admin_session) so consumer/business login never touches admin.
import crypto from 'crypto';
import { query } from './db';
import type { Account, PublicAccount, AccountRole } from './types';

function secret(): string {
  return process.env.SESSION_SECRET || '';
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// ---------------------------------------------------------------------------
// Session tokens (separate cookie: account_session)
// ---------------------------------------------------------------------------

export function createAccountToken(accountId: string, role: AccountRole): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `account:${accountId}:${role}:${exp}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAccountToken(token: string): { accountId: string; role: AccountRole } | null {
  if (!token || !secret()) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [prefix, accountId, role, expStr] = payload.split(':');
  if (prefix !== 'account' || !accountId || !role) return null;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp <= Date.now()) return null;
  return { accountId, role: role as AccountRole };
}

export function accountCookieFromHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)account_session=([^;]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

interface AccountRow {
  id: string;
  role: string;
  email: string;
  password_hash: string;
  name: string;
  listing_id: string | null;
  verification_status: string;
  created_at: Date;
}

function toPublic(row: AccountRow): PublicAccount {
  return {
    id: row.id,
    role: row.role as AccountRole,
    email: row.email,
    name: row.name,
    listingId: row.listing_id,
    verificationStatus: row.verification_status === 'verified' ? 'verified' : 'unverified',
  };
}

export async function getAccountByEmail(email: string): Promise<(Account & { passwordHash: string }) | null> {
  const rows = await query<AccountRow>('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase()]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    role: r.role as AccountRole,
    email: r.email,
    name: r.name,
    listingId: r.listing_id,
    verificationStatus: r.verification_status === 'verified' ? 'verified' : 'unverified',
    createdAt: r.created_at.toISOString(),
    passwordHash: r.password_hash,
  };
}

export async function getAccountById(id: string): Promise<PublicAccount | null> {
  const rows = await query<AccountRow>('SELECT * FROM accounts WHERE id = $1', [id]);
  return rows.length ? toPublic(rows[0]) : null;
}

export async function createAccount(input: {
  role: AccountRole;
  email: string;
  password: string;
  name: string;
  listingId?: string | null;
}): Promise<PublicAccount> {
  const id = `acct_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const rows = await query<AccountRow>(
    `INSERT INTO accounts (id, role, email, password_hash, name, listing_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.role, input.email.toLowerCase(), hashPassword(input.password), input.name, input.listingId ?? null]
  );
  return toPublic(rows[0]);
}
