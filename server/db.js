import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.MALLIQ_DATA_DIR
  ? path.resolve(process.env.MALLIQ_DATA_DIR)
  : path.join(__dirname, 'data');
const DB_PATH = process.env.MALLIQ_DB_PATH
  ? path.resolve(process.env.MALLIQ_DB_PATH)
  : path.join(DATA_DIR, 'malliq.sqlite');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS asset_settings (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS planning (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prospects (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pos_connections (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_logs (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      actor TEXT,
      details JSON,
      created_at TEXT NOT NULL
    );
  `);

  const meta = await dbInstance.get('SELECT * FROM meta WHERE id = 1');
  if (!meta) {
    await dbInstance.run('INSERT INTO meta (id, revision, updated_at) VALUES (1, 0, ?)', [new Date().toISOString()]);
  }

  return dbInstance;
}

export async function fetchFullState() {
  const db = await getDb();
  
  const [
    assetRows, units, contracts, sales, planning, documents, 
    suppliers, prospects, posConnections, importLogs
  ] = await Promise.all([
    db.all('SELECT data FROM asset_settings LIMIT 1'),
    db.all('SELECT data FROM units'),
    db.all('SELECT data FROM contracts'),
    db.all('SELECT data FROM sales'),
    db.all('SELECT data FROM planning'),
    db.all('SELECT data FROM documents'),
    db.all('SELECT data FROM suppliers'),
    db.all('SELECT data FROM prospects'),
    db.all('SELECT data FROM pos_connections'),
    db.all('SELECT data FROM import_logs')
  ]);

  return {
    asset: assetRows.length > 0 ? JSON.parse(assetRows[0].data) : null,
    units: units.map(r => JSON.parse(r.data)),
    contracts: contracts.map(r => JSON.parse(r.data)),
    sales: sales.map(r => JSON.parse(r.data)),
    planning: planning.map(r => JSON.parse(r.data)),
    documents: documents.map(r => JSON.parse(r.data)),
    suppliers: suppliers.map(r => JSON.parse(r.data)),
    prospects: prospects.map(r => JSON.parse(r.data)),
    posConnections: posConnections.map(r => JSON.parse(r.data)),
    importLogs: importLogs.map(r => JSON.parse(r.data))
  };
}

export async function replaceFullState(state) {
  const db = await getDb();

  await db.exec('BEGIN TRANSACTION');
  try {
    if (state.asset) {
      await db.run('INSERT OR REPLACE INTO asset_settings (id, data) VALUES (?, ?)', [state.asset.id || 'asset-1', JSON.stringify(state.asset)]);
    } else {
      await db.run('DELETE FROM asset_settings');
    }

    const upsertMany = async (table, items) => {
      const ids = [];
      if (items && items.length > 0) {
        const stmt = await db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
        for (const item of items) {
          await stmt.run([item.id, JSON.stringify(item)]);
          ids.push(item.id);
        }
        await stmt.finalize();
      }
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await db.run(`DELETE FROM ${table} WHERE id NOT IN (${placeholders})`, ids);
      } else {
        await db.run(`DELETE FROM ${table}`);
      }
    };

    await upsertMany('units', state.units);
    await upsertMany('contracts', state.contracts);
    await upsertMany('sales', state.sales);
    await upsertMany('planning', state.planning);
    await upsertMany('documents', state.documents);
    await upsertMany('suppliers', state.suppliers);
    await upsertMany('prospects', state.prospects);
    await upsertMany('pos_connections', state.posConnections);
    await upsertMany('import_logs', state.importLogs);

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function getMeta() {
  const db = await getDb();
  return await db.get('SELECT revision, updated_at as updatedAt FROM meta WHERE id = 1');
}

export async function incrementRevision() {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run('UPDATE meta SET revision = revision + 1, updated_at = ? WHERE id = 1', [now]);
  return await getMeta();
}

export async function logActivity(action, entityType = null, entityId = null, actor = null, details = null) {
  const db = await getDb();
  await db.run(
    'INSERT INTO activities (action, entity_type, entity_id, actor, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [action, entityType, entityId, actor, details ? JSON.stringify(details) : null, new Date().toISOString()],
  );
}

export async function getRecentActivities(limit = 50) {
  const db = await getDb();
  return await db.all(
    'SELECT * FROM activities ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

export async function closeDb() {
  if (!dbInstance) {
    return;
  }

  const current = dbInstance;
  dbInstance = null;
  await current.close();
}
