import express from 'express';
import cors from 'cors';
import { client, initDb, getFullDb, toObjects, first } from './db.js';
import { checkCredentials, issueToken, requireAuth } from './auth.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const wrap = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  };

  // ---- public routes ----
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!checkCredentials(username, password)) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    res.json({ token: issueToken(username), username });
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---- everything below requires a valid Bearer token ----
  app.use('/api', requireAuth);
  // ensure schema+seed exist before any data route runs (serverless cold start)
  app.use('/api', async (_req, res, next) => {
    try {
      await initDb();
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/me', (req, res) => res.json({ username: req.user }));

  app.get('/api/db', wrap(async (_req, res) => res.json(await getFullDb())));

  // ---- settings ----
  app.put('/api/settings', wrap(async (req, res) => {
    const cur = first(await client.execute('SELECT opening, dailyLimit FROM settings WHERE id = 1'));
    const opening = req.body.opening != null ? +req.body.opening : cur.opening;
    const dailyLimit = req.body.dailyLimit != null ? +req.body.dailyLimit : cur.dailyLimit;
    await client.execute({ sql: 'UPDATE settings SET opening = ?, dailyLimit = ? WHERE id = 1', args: [opening, dailyLimit] });
    res.json({ opening, dailyLimit });
  }));

  // ---- departments ----
  app.post('/api/departments', wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    const exists = first(await client.execute({ sql: 'SELECT 1 AS x FROM departments WHERE name = ?', args: [name] }));
    if (!exists) {
      const { max } = first(await client.execute('SELECT COALESCE(MAX(ord), -1) AS max FROM departments'));
      await client.execute({ sql: 'INSERT INTO departments (name, ord) VALUES (?, ?)', args: [name, Number(max) + 1] });
    }
    const departments = toObjects(await client.execute('SELECT name FROM departments ORDER BY ord, id')).map((r) => r.name);
    res.json({ departments });
  }));

  // ---- cost centers ----
  app.post('/api/cost-centers', wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const dept = String(req.body.dept || '');
    if (!name) return res.status(400).json({ error: 'name required' });
    const existing = first(await client.execute({ sql: 'SELECT id, name, dept FROM cost_centers WHERE name = ?', args: [name] }));
    if (existing) return res.json(existing);
    const rs = await client.execute({ sql: 'INSERT INTO cost_centers (name, dept) VALUES (?, ?)', args: [name, dept] });
    res.json(first(await client.execute({ sql: 'SELECT id, name, dept FROM cost_centers WHERE id = ?', args: [Number(rs.lastInsertRowid)] })));
  }));

  app.patch('/api/cost-centers/:id', wrap(async (req, res) => {
    const id = +req.params.id;
    await client.execute({ sql: 'UPDATE cost_centers SET dept = ? WHERE id = ?', args: [String(req.body.dept || ''), id] });
    res.json(first(await client.execute({ sql: 'SELECT id, name, dept FROM cost_centers WHERE id = ?', args: [id] })));
  }));

  app.delete('/api/cost-centers/:id', wrap(async (req, res) => {
    await client.execute({ sql: 'DELETE FROM cost_centers WHERE id = ?', args: [+req.params.id] });
    res.json({ ok: true });
  }));

  // ---- payees ----
  const PAYEE_FIELDS = ['shop', 'payTo', 'bank', 'acct', 'type', 'detail', 'line', 'status'];
  const payeeRow = async (id) => first(await client.execute({ sql: 'SELECT id, shop, payTo, bank, acct, type, detail, line, status FROM payees WHERE id = ?', args: [id] }));

  app.post('/api/payees', wrap(async (req, res) => {
    const v = PAYEE_FIELDS.map((f) => (f === 'status' ? String(req.body[f] || 'active') : String(req.body[f] || '')));
    const rs = await client.execute({
      sql: 'INSERT INTO payees (shop, payTo, bank, acct, type, detail, line, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: v,
    });
    res.json(await payeeRow(Number(rs.lastInsertRowid)));
  }));

  app.put('/api/payees/:id', wrap(async (req, res) => {
    const id = +req.params.id;
    const cur = await payeeRow(id);
    if (!cur) return res.status(404).json({ error: 'not found' });
    const v = PAYEE_FIELDS.map((f) => (req.body[f] != null ? String(req.body[f]) : cur[f]));
    await client.execute({
      sql: 'UPDATE payees SET shop=?, payTo=?, bank=?, acct=?, type=?, detail=?, line=?, status=? WHERE id=?',
      args: [...v, id],
    });
    res.json(await payeeRow(id));
  }));

  app.post('/api/payees/:id/toggle', wrap(async (req, res) => {
    const id = +req.params.id;
    const cur = await payeeRow(id);
    if (!cur) return res.status(404).json({ error: 'not found' });
    const next = cur.status === 'active' ? 'inactive' : 'active';
    await client.execute({ sql: 'UPDATE payees SET status = ? WHERE id = ?', args: [next, id] });
    res.json(await payeeRow(id));
  }));

  app.delete('/api/payees/:id', wrap(async (req, res) => {
    await client.execute({ sql: 'DELETE FROM payees WHERE id = ?', args: [+req.params.id] });
    res.json({ ok: true });
  }));

  // ---- transactions ----
  const txnRow = async (id) => first(await client.execute({ sql: 'SELECT id, ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note FROM txns WHERE id = ?', args: [id] }));
  const TXN_FIELDS = ['date', 'voucher', 'cc', 'detail', 'payTo', 'bank', 'acct', 'recv', 'pay', 'note'];
  const txnValue = (body, f) => (f === 'recv' || f === 'pay' ? +body[f] || 0 : String(body[f] ?? ''));

  async function voucherClash(voucher, exceptId) {
    const v = String(voucher || '').trim();
    if (!v) return false;
    const rs = exceptId
      ? await client.execute({ sql: 'SELECT 1 AS x FROM txns WHERE voucher = ? AND id <> ?', args: [v, exceptId] })
      : await client.execute({ sql: 'SELECT 1 AS x FROM txns WHERE voucher = ?', args: [v] });
    return rs.rows.length > 0;
  }

  app.post('/api/txns', wrap(async (req, res) => {
    const b = req.body;
    if (!b.date) return res.status(400).json({ error: 'date required' });
    if (await voucherClash(b.voucher, null)) return res.status(409).json({ error: `voucher ${b.voucher} already used` });
    const { max } = first(await client.execute('SELECT COALESCE(MAX(ord), -1) AS max FROM txns'));
    const ord = b.ord != null ? +b.ord : Number(max) + 1;
    const vals = TXN_FIELDS.map((f) => txnValue(b, f));
    const rs = await client.execute({
      sql: 'INSERT INTO txns (ord, date, voucher, cc, detail, payTo, bank, acct, recv, pay, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [ord, ...vals],
    });
    res.json(await txnRow(Number(rs.lastInsertRowid)));
  }));

  app.put('/api/txns/:id', wrap(async (req, res) => {
    const id = +req.params.id;
    const cur = await txnRow(id);
    if (!cur) return res.status(404).json({ error: 'not found' });
    if (await voucherClash(req.body.voucher, id)) return res.status(409).json({ error: `voucher ${req.body.voucher} already used` });
    const vals = TXN_FIELDS.map((f) => (req.body[f] != null ? txnValue(req.body, f) : cur[f]));
    await client.execute({
      sql: 'UPDATE txns SET date=?, voucher=?, cc=?, detail=?, payTo=?, bank=?, acct=?, recv=?, pay=?, note=? WHERE id=?',
      args: [...vals, id],
    });
    res.json(await txnRow(id));
  }));

  app.delete('/api/txns/:id', wrap(async (req, res) => {
    await client.execute({ sql: 'DELETE FROM txns WHERE id = ?', args: [+req.params.id] });
    res.json({ ok: true });
  }));

  return app;
}
