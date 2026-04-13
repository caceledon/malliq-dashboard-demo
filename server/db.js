import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'malliq.sqlite');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  
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

    CREATE TABLE IF NOT EXISTS mall_settings (
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
    mallRows, units, contracts, sales, planning, documents, 
    suppliers, prospects, posConnections, importLogs
  ] = await Promise.all([
    db.all('SELECT data FROM mall_settings LIMIT 1'),
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
    mall: mallRows.length > 0 ? JSON.parse(mallRows[0].data) : null,
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
    const clearTables = ['mall_settings', 'units', 'contracts', 'sales', 'planning', 'documents', 'suppliers', 'prospects', 'pos_connections', 'import_logs'];
    for (const table of clearTables) {
      await db.run(`DELETE FROM ${table}`);
    }

    if (state.mall) {
      await db.run('INSERT INTO mall_settings (id, data) VALUES (?, ?)', [state.mall.id || 'mall-1', JSON.stringify(state.mall)]);
    }

    const insertMany = async (table, items) => {
      if (!items || items.length === 0) return;
      const stmt = await db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`);
      for (const item of items) {
        await stmt.run([item.id, JSON.stringify(item)]);
      }
      await stmt.finalize();
    };

    await insertMany('units', state.units);
    await insertMany('contracts', state.contracts);
    await insertMany('sales', state.sales);
    await insertMany('planning', state.planning);
    await insertMany('documents', state.documents);
    await insertMany('suppliers', state.suppliers);
    await insertMany('prospects', state.prospects);
    await insertMany('pos_connections', state.posConnections);
    await insertMany('import_logs', state.importLogs);

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
