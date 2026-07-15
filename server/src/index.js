import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load server/.env (git-ignored) before importing modules that read process.env.
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  try { process.loadEnvFile(envPath); } catch (e) { console.warn('[env] failed to load .env:', e.message); }
}

const { db, getFullDb, seedIfEmpty } = await import('./db.js');
const { checkCredentials, issueToken, requireAuth } = await import('./auth.js');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());

// ---- auth (public routes) ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!checkCredentials(username, password)) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  res.json({ token: issueToken(username), username });
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Everything registered below this line requires a valid Bearer token.
app.use('/api', requireAuth);

// ---- authenticated: confirm the session is valid ----
app.get('/api/me', (req, res) => res.json({ username: req.user }));

const created = seedIfEmpty();
if (created) console.log('[db] seeded from seed-data.js');

const wrap = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// ---- whole dataset ----
app.get('/api/db', wrap((_req, res) => res.json(getFullDb())));

// ---- settings ----
app.put('/api/settings', wrap((req, res) => {
  const cur = db.prepare('SELECT opening, dailyLimit FROM settings WHERE id = 1').get();
  const opening = req.body.opening != null ? +req.body.opening : cur.opening;
  const dailyLimit = req.body.dailyLimit != null ? +req.body.dailyLimit : cur.dailyLimit;
  db.prepare('UPDATE settings SET opening = ?, dailyLimit = ? WHERE id = 1').run(opening, dailyLimit);
  res.json({ opening, dailyLimit });
}));

// ---- departments ----
app.post('/api/departments', wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const exists = db.prepare('SELECT 1 FROM departments WHERE name = ?').get(name);
  if (!exists) {
    const { max } = db.prepare('SELECT COALESCE(MAX(ord), -1) AS max FROM departments').get();
    db.prepare('INSERT INTO departments (name, ord) VALUES (?, ?)').run(name, max + 1);
  }
  res.json({ departments: db.prepare('SELECT name FROM departments ORDER BY ord, id').all().map((r) => r.name) });
}));

// ---- cost centers ----
app.post('/api/cost-centers', wrap((req, res) => {
  const name = String(req.body.name || '').trim();
  const dept = String(req.body.dept || '');
  if (!name) return res.status(400).json({ error: 'name required' });
  const existing = db.prepare('SELECT id, name, dept FROM cost_centers WHERE name = ?').get(name);
  if (existing) return res.json(existing);
  const info = db.prepare('INSERT INTO cost_centers (name, dept) VALUES (?, ?)').run(name, dept);
  res.json(db.prepare('SELECT id, name, dept FROM cost_centers WHERE id = ?').get(info.lastInsertRowid));
}));

app.patch('/api/cost-centers/:id', wrap((req, res) => {
  const id = +req.params.id;
  db.prepare('UPDATE cost_centers SET dept = ? WHERE id = ?').run(String(req.body.dept || ''), id);
  res.json(db.prepare('SELECT id, name, dept FROM cost_centers WHERE id = ?').get(id));
}));

app.delete('/api/cost-centers/:id', wrap((req, res) => {
  db.prepare('DELETE FROM cost_centers WHERE id = ?').run(+req.params.id);
  res.json({ ok: true });
}));

// ---- payees ----
const PAYEE_FIELDS = ['shop', 'payTo', 'bank', 'acct', 'type', 'detail', 'line', 'status'];
const payeeRow = (id) => db.prepare('SELECT id, shop, payTo, bank, acct, type, detail, line, status FROM payees WHERE id = ?').get(id);

app.post('/api/payees', wrap((req, res) => {
  const v = PAYEE_FIELDS.map((f) => (f === 'status' ? String(req.body[f] || 'active') : String(req.body[f] || '')));
  const info = db.prepare(
    'INSERT INTO payees (shop, payTo, bank, acct, type, detail, line, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(...v);
  res.json(payeeRow(info.lastInsertRowid));
}));

app.put('/api/payees/:id', wrap((req, res) => {
  const id = +req.params.id;
  const cur = payeeRow(id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  const v = PAYEE_FIELDS.map((f) => (req.body[f] != null ? String(req.body[f]) : cur[f]));
  db.prepare(
    'UPDATE payees SET shop=?, payTo=?, bank=?, acct=?, type=?, detail=?, line=?, status=? WHERE id=?'
  ).run(...v, id);
  res.json(payeeRow(id));
}));

app.post('/api/payees/:id/toggle', wrap((req, res) => {
  const id = +req.params.id;
  const cur = payeeRow(id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  const next = cur.status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE payees SET status = ? WHERE id = ?').run(next, id);
  res.json(payeeRow(id));
}));

app.delete('/api/payees/:id', wrap((req, res) => {
  db.prepare('DELETE FROM payees WHERE id = ?').run(+req.params.id);
  res.json({ ok: true });
}));

// ---- transactions ----
const txnRow = (id) => db.prepare('SELECT id, ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note FROM txns WHERE id = ?').get(id);
const TXN_FIELDS = ['date', 'voucher', 'cc', 'detail', 'payTo', 'bank', 'acct', 'recv', 'pay', 'note'];
const txnValue = (body, f) => (f === 'recv' || f === 'pay' ? +body[f] || 0 : String(body[f] ?? ''));

function voucherClash(voucher, exceptId) {
  const v = String(voucher || '').trim();
  if (!v) return false;
  const row = exceptId
    ? db.prepare('SELECT 1 FROM txns WHERE voucher = ? AND id <> ?').get(v, exceptId)
    : db.prepare('SELECT 1 FROM txns WHERE voucher = ?').get(v);
  return !!row;
}

app.post('/api/txns', wrap((req, res) => {
  const b = req.body;
  if (!b.date) return res.status(400).json({ error: 'date required' });
  if (voucherClash(b.voucher, null)) return res.status(409).json({ error: `voucher ${b.voucher} already used` });
  const { max } = db.prepare('SELECT COALESCE(MAX(ord), -1) AS max FROM txns').get();
  const ord = b.ord != null ? +b.ord : max + 1;
  const vals = TXN_FIELDS.map((f) => txnValue(b, f));
  const info = db.prepare(
    'INSERT INTO txns (ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(ord, ...vals);
  res.json(txnRow(info.lastInsertRowid));
}));

app.put('/api/txns/:id', wrap((req, res) => {
  const id = +req.params.id;
  const cur = txnRow(id);
  if (!cur) return res.status(404).json({ error: 'not found' });
  if (voucherClash(req.body.voucher, id)) return res.status(409).json({ error: `voucher ${req.body.voucher} already used` });
  const vals = TXN_FIELDS.map((f) => (req.body[f] != null ? txnValue(req.body, f) : cur[f]));
  db.prepare(
    'UPDATE txns SET date=?, voucher=?, cc=?, detail=?, payTo=?, bank=?, acct=?, recv=?, pay=?, note=? WHERE id=?'
  ).run(...vals, id);
  res.json(txnRow(id));
}));

app.delete('/api/txns/:id', wrap((req, res) => {
  db.prepare('DELETE FROM txns WHERE id = ?').run(+req.params.id);
  res.json({ ok: true });
}));

app.listen(PORT, () => console.log(`[server] KPS mBank API on http://localhost:${PORT}`));
