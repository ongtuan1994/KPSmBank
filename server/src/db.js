import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { loadSeed } from './seed.js';

// Production: Turso (libSQL) via env. Local dev fallback: a file-based libSQL database.
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function makeClient() {
  if (TURSO_URL) {
    return createClient(TURSO_TOKEN ? { url: TURSO_URL, authToken: TURSO_TOKEN } : { url: TURSO_URL });
  }
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  return createClient({ url: 'file:' + join(dataDir, 'kps-mbank.db') });
}

export const client = makeClient();

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    opening REAL NOT NULL DEFAULT 0,
    dailyLimit REAL NOT NULL DEFAULT 2000000
  )`,
  `CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    ord INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS cost_centers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dept TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS payees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT NOT NULL DEFAULT '', payTo TEXT NOT NULL DEFAULT '', bank TEXT NOT NULL DEFAULT '',
    acct TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '',
    line TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active'
  )`,
  `CREATE TABLE IF NOT EXISTS txns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ord INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    voucher TEXT NOT NULL DEFAULT '',
    cc TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '',
    payTo TEXT NOT NULL DEFAULT '',
    bank TEXT NOT NULL DEFAULT '',
    acct TEXT NOT NULL DEFAULT '',
    recv REAL NOT NULL DEFAULT 0,
    pay REAL NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_txns_date ON txns(date)`,
];

// Convert a libSQL ResultSet into an array of plain column-keyed objects.
export function toObjects(rs) {
  return rs.rows.map((row) => {
    const o = {};
    rs.columns.forEach((c, i) => { o[c] = row[i]; });
    return o;
  });
}
export const first = (rs) => toObjects(rs)[0];

let initPromise = null;
/** Create schema (idempotent) and seed once. Memoized per process. */
export function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const stmt of SCHEMA) await client.execute(stmt);
      await seedIfEmpty();
    })().catch((e) => { initPromise = null; throw e; });
  }
  return initPromise;
}

async function seedIfEmpty() {
  const rs = await client.execute('SELECT COUNT(*) AS count FROM settings');
  if (Number(first(rs).count) > 0) return false;

  const seed = loadSeed();
  const stmts = [];
  stmts.push({ sql: 'INSERT INTO settings (id, opening, dailyLimit) VALUES (1, ?, 2000000)', args: [seed.opening || 0] });
  (seed.departments || []).forEach((name, i) =>
    stmts.push({ sql: 'INSERT INTO departments (name, ord) VALUES (?, ?)', args: [String(name), i] })
  );
  (seed.costCenters || []).forEach((c) =>
    stmts.push({ sql: 'INSERT INTO cost_centers (name, dept) VALUES (?, ?)', args: [String(c.name || ''), String(c.dept || '')] })
  );
  (seed.payees || []).forEach((p) =>
    stmts.push({
      sql: 'INSERT INTO payees (shop, payTo, bank, acct, type, detail, line, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [String(p.shop || ''), String(p.payTo || ''), String(p.bank || ''), String(p.acct || ''), String(p.type || ''), String(p.detail || ''), String(p.line || ''), 'active'],
    })
  );
  (seed.txns || []).forEach((t, i) =>
    stmts.push({
      sql: 'INSERT INTO txns (ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [i, String(t.date || ''), String(t.voucher || ''), String(t.cc || ''), String(t.detail || ''), String(t.payTo || ''), '', '', +t.recv || 0, +t.pay || 0, String(t.note || '')],
    })
  );
  await client.batch(stmts, 'write');
  return true;
}

/** Return the entire dataset in the shape the client expects. */
export async function getFullDb() {
  const settings = first(await client.execute('SELECT opening, dailyLimit FROM settings WHERE id = 1')) || { opening: 0, dailyLimit: 2000000 };
  const departments = toObjects(await client.execute('SELECT name FROM departments ORDER BY ord, id')).map((r) => r.name);
  const costCenters = toObjects(await client.execute('SELECT id, name, dept FROM cost_centers ORDER BY id'));
  const payees = toObjects(await client.execute('SELECT id, shop, payTo, bank, acct, type, detail, line, status FROM payees ORDER BY id'));
  const txns = toObjects(await client.execute('SELECT id, ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note FROM txns ORDER BY date, ord, id'));
  return { opening: settings.opening, dailyLimit: settings.dailyLimit, departments, costCenters, payees, txns };
}
