import { Pool } from 'pg';

// PostgreSQL connection pool (lazy singleton).
// DATABASE_URL is provided by Railway (internal) and by local .env.local.
// The pool is created on first use so `next build` never opens a connection.

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Add it to .env.local (local dev) or Railway env vars (production).'
      );
    }
    pool = new Pool({
      connectionString,
      max: 10,
      // Don't keep idle connections open indefinitely in serverless-ish contexts.
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Run a parameterized query and return rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
