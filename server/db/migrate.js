#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from './postgres.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

async function run() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const aplicadas = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map(r => r.filename),
  );
  const archivos = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

  for (const file of archivos) {
    if (aplicadas.has(file)) {
      console.log(`[skip] ${file}`);
      continue;
    }
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    console.log(`[apply] ${file}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  }
  console.log('[migrate] done');
}

run().then(closePool).catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
