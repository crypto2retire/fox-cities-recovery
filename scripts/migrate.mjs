// scripts/migrate.mjs — idempotent SQL migration runner.
// Reads DATABASE_URL from env, applies scripts/migrations/*.sql in lexical order,
// tracking applied migrations in `schema_migrations`. Safe to run on every deploy.
//
// Usage: node scripts/migrate.mjs
// Exit 0 on success, 1 on failure. Never destructive — only adds new migrations.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadLocalEnv } from './lib/env.mjs';

loadLocalEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[migrate] DATABASE_URL is not set. Skipping migrations.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });

  try {
    // Ensure tracking table exists.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[migrate] No migration files found.');
      return;
    }

    const { rows } = await pool.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`[migrate] Applying ${file}...`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      } finally {
        client.release();
      }
    }

    console.log(`[migrate] Done. ${ran} migration(s) applied.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate] ERROR:', err.message);
  process.exit(1);
});
