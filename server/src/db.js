import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { loadSeed } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
export const DB_PATH = join(DATA_DIR, 'kps-mbank.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  opening REAL NOT NULL DEFAULT 0,
  dailyLimit REAL NOT NULL DEFAULT 2000000
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS cost_centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dept TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS payees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop   TEXT NOT NULL DEFAULT '',
  payTo  TEXT NOT NULL DEFAULT '',
  bank   TEXT NOT NULL DEFAULT '',
  acct   TEXT NOT NULL DEFAULT '',
  type   TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  line   TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS txns (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ord     INTEGER NOT NULL DEFAULT 0,
  date    TEXT NOT NULL,
  voucher TEXT NOT NULL DEFAULT '',
  cc      TEXT NOT NULL DEFAULT '',
  detail  TEXT NOT NULL DEFAULT '',
  payTo   TEXT NOT NULL DEFAULT '',
  bank    TEXT NOT NULL DEFAULT '',
  acct    TEXT NOT NULL DEFAULT '',
  recv    REAL NOT NULL DEFAULT 0,
  pay     REAL NOT NULL DEFAULT 0,
  note    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_txns_date ON txns(date);
`;

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(SCHEMA);

/** Seed the database from seed-data.js the first time it is created. */
export function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM settings').get();
  if (count > 0) return false;

  const seed = loadSeed();
  const insDept = db.prepare('INSERT INTO departments (name, ord) VALUES (?, ?)');
  const insCc = db.prepare('INSERT INTO cost_centers (name, dept) VALUES (?, ?)');
  const insPayee = db.prepare(
    'INSERT INTO payees (shop, payTo, bank, acct, type, detail, line, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insTxn = db.prepare(
    'INSERT INTO txns (ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO settings (id, opening, dailyLimit) VALUES (1, ?, 2000000)').run(seed.opening || 0);
    (seed.departments || []).forEach((name, i) => insDept.run(String(name), i));
    (seed.costCenters || []).forEach((c) => insCc.run(String(c.name || ''), String(c.dept || '')));
    (seed.payees || []).forEach((p) =>
      insPayee.run(
        String(p.shop || ''), String(p.payTo || ''), String(p.bank || ''), String(p.acct || ''),
        String(p.type || ''), String(p.detail || ''), String(p.line || ''), 'active'
      )
    );
    (seed.txns || []).forEach((t, i) =>
      insTxn.run(
        i, String(t.date || ''), String(t.voucher || ''), String(t.cc || ''), String(t.detail || ''),
        String(t.payTo || ''), '', '', +t.recv || 0, +t.pay || 0, String(t.note || '')
      )
    );
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return true;
}

/** Return the entire dataset in the shape the client expects. */
export function getFullDb() {
  const settings = db.prepare('SELECT opening, dailyLimit FROM settings WHERE id = 1').get() || {
    opening: 0,
    dailyLimit: 2000000,
  };
  const departments = db.prepare('SELECT name FROM departments ORDER BY ord, id').all().map((r) => r.name);
  const costCenters = db.prepare('SELECT id, name, dept FROM cost_centers ORDER BY id').all();
  const payees = db
    .prepare('SELECT id, shop, payTo, bank, acct, type, detail, line, status FROM payees ORDER BY id')
    .all();
  const txns = db
    .prepare(
      'SELECT id, ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note FROM txns ORDER BY date, ord, id'
    )
    .all();
  return {
    opening: settings.opening,
    dailyLimit: settings.dailyLimit,
    departments,
    costCenters,
    payees,
    txns,
  };
}
