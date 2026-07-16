/* Non-destructive merge of seed-data.js (reconciled months 1-6, พ.ศ.2569) into
   an existing production (Turso) DB.
   - Dedup key: voucher when present, else `date|cc|detail|recv|pay`.
   - Inserts only MISSING txns; never deletes. Updates opening + fills cost-center
     departments (only when currently blank) + adds missing cost centers.
   Usage (from repo root, with TURSO_DATABASE_URL/TURSO_AUTH_TOKEN in server/.env):
     node server/src/merge-prod.js            # DRY RUN — reports, writes nothing
     node server/src/merge-prod.js --commit   # apply changes
*/
import { createClient } from '@libsql/client';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) { try { process.loadEnvFile(envPath); } catch (e) { console.warn('[env]', e.message); } }

const COMMIT = process.argv.includes('--commit');
const REPLACE = process.argv.includes('--replace'); // full-replace txns with reconciled seed (backs up first)
const URL = process.env.TURSO_DATABASE_URL;
const TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!URL) { console.error('Refusing to run: TURSO_DATABASE_URL not set (put it + TURSO_AUTH_TOKEN in server/.env).'); process.exit(1); }

const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const key = (t) => (String(t.voucher || '').trim() ? 'V:' + String(t.voucher).trim()
  : `F:${t.date}|${(t.cc || '').trim()}|${(t.detail || '').trim()}|${r2(t.recv)}|${r2(t.pay)}`);

// load seed-data.js
const code = readFileSync(join(__dirname, '..', '..', 'seed-data.js'), 'utf8');
const win = {}; new Function('window', code)(win); const seed = win.MBSEED;

const client = createClient(TOKEN ? { url: URL, authToken: TOKEN } : { url: URL });
const toObjects = (rs) => rs.rows.map((row) => { const o = {}; rs.columns.forEach((c, i) => { o[c] = row[i]; }); return o; });

console.log(`\n=== MERGE ${COMMIT ? '(COMMIT)' : '(DRY RUN)'} -> ${URL.replace(/\?.*/, '')} ===`);

// current prod state
const curTxns = toObjects(await client.execute('SELECT date, voucher, cc, detail, recv, pay FROM txns'));
const curCC = toObjects(await client.execute('SELECT id, name, dept FROM cost_centers'));
const curDepts = toObjects(await client.execute('SELECT name FROM departments')).map((r) => r.name);
const curOpening = Number((toObjects(await client.execute('SELECT opening FROM settings WHERE id=1'))[0] || {}).opening);
console.log('prod now: opening', curOpening, '| txns', curTxns.length, '| costCenters', curCC.length, '| departments', curDepts.length);

// ---- txn dedup ----
const have = new Set(curTxns.map(key));
const toInsert = [];
let byV = 0, byF = 0;
for (const t of seed.txns) {
  const k = key(t);
  if (have.has(k)) { k.startsWith('V:') ? byV++ : byF++; continue; }
  have.add(k); toInsert.push(t);
}
const insByMonth = {};
toInsert.forEach((t) => { const m = (t.date || '').slice(0, 7); insByMonth[m] = (insByMonth[m] || 0) + 1; });
console.log(`\nseed txns: ${seed.txns.length} | already-present: voucher-match ${byV}, fallback-match ${byF}`);
console.log(`TO INSERT: ${toInsert.length}`, JSON.stringify(insByMonth));

// ---- cost centers ----
const ccByName = new Map(curCC.map((c) => [c.name, c]));
const ccInsert = [], ccDeptFill = [];
for (const c of seed.costCenters) {
  const ex = ccByName.get(c.name);
  if (!ex) { if (c.name) ccInsert.push(c); }
  else if (c.dept && !String(ex.dept || '').trim()) ccDeptFill.push({ id: ex.id, name: c.name, dept: c.dept });
}
console.log(`\ncost centers: insert ${ccInsert.length}, fill-dept ${ccDeptFill.length}`);

// ---- departments ----
const deptInsert = (seed.departments || []).filter((d) => !curDepts.includes(d));
console.log('departments to add:', JSON.stringify(deptInsert));

// ---- opening ----
const newOpening = r2(seed.opening);
console.log(`\nopening: ${curOpening} -> ${newOpening}${curOpening === newOpening ? ' (unchanged)' : ''}`);

// resulting reconciliation preview
const resulting = (REPLACE ? seed.txns : [...curTxns, ...toInsert]).map((t) => ({ date: t.date, recv: r2(t.recv), pay: r2(t.pay) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
let bal = newOpening; for (const t of resulting) bal = r2(bal + t.recv - t.pay);
console.log(`\nmode: ${REPLACE ? 'REPLACE (txns -> reconciled seed 904)' : 'ADDITIVE (insert missing only)'}`);
console.log(`resulting txns: ${resulting.length} | reconciled end balance: ${bal}`);

if (!COMMIT) { console.log(`\nDRY RUN — nothing written. Re-run with ${REPLACE ? '--replace --commit' : '--commit'} to apply.`); process.exit(0); }

// ---- cost centers + departments (both modes) ----
const ccStmts = [];
deptInsert.forEach((name) => ccStmts.push({ sql: 'INSERT INTO departments (name, ord) VALUES (?, (SELECT COALESCE(MAX(ord),-1)+1 FROM departments))', args: [name] }));
ccInsert.forEach((c) => ccStmts.push({ sql: 'INSERT INTO cost_centers (name, dept) VALUES (?, ?)', args: [c.name, c.dept || ''] }));
ccDeptFill.forEach((c) => ccStmts.push({ sql: 'UPDATE cost_centers SET dept=? WHERE id=?', args: [c.dept, c.id] }));

if (REPLACE) {
  // 1) backup current prod state to a timestamped file
  const backup = { at: new Date().toISOString(), opening: curOpening,
    settings: toObjects(await client.execute('SELECT * FROM settings')),
    txns: toObjects(await client.execute('SELECT * FROM txns')),
    costCenters: curCC, departments: curDepts };
  const bfile = join(__dirname, '..', `prod-backup-${backup.at.replace(/[:.]/g, '-')}.json`);
  writeFileSync(bfile, JSON.stringify(backup, null, 0), 'utf8');
  console.log(`\nbackup written: ${bfile} (txns ${backup.txns.length})`);
  // 2) replace: opening + wipe txns + insert reconciled 904, then cc/dept
  const stmts = [{ sql: 'UPDATE settings SET opening=? WHERE id=1', args: [newOpening] }, { sql: 'DELETE FROM txns', args: [] }];
  seed.txns.forEach((t, i) => stmts.push({ sql: 'INSERT INTO txns (ord,date,voucher,cc,detail,payTo,bank,acct,recv,pay,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)', args: [i, t.date, t.voucher || '', t.cc || '', t.detail || '', t.payTo || '', '', '', r2(t.recv), r2(t.pay), t.note || ''] }));
  await client.batch([...stmts, ...ccStmts], 'write');
  console.log(`\nCOMMITTED (REPLACE): txns now ${seed.txns.length} (was ${curTxns.length}), opening ${newOpening}, +${ccInsert.length} cost centers, ${ccDeptFill.length} dept fills.`);
  process.exit(0);
}

// ---- additive apply ----
let ord = Number((toObjects(await client.execute('SELECT COALESCE(MAX(ord),-1) AS m FROM txns'))[0] || {}).m);
const addStmts = [{ sql: 'UPDATE settings SET opening=? WHERE id=1', args: [newOpening] }, ...ccStmts];
toInsert.forEach((t) => { ord += 1; addStmts.push({ sql: 'INSERT INTO txns (ord,date,voucher,cc,detail,payTo,bank,acct,recv,pay,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)', args: [ord, t.date, t.voucher || '', t.cc || '', t.detail || '', t.payTo || '', '', '', r2(t.recv), r2(t.pay), t.note || ''] }); });
await client.batch(addStmts, 'write');
console.log(`\nCOMMITTED (ADDITIVE): +${toInsert.length} txns, +${ccInsert.length} cost centers, ${ccDeptFill.length} dept fills, +${deptInsert.length} departments, opening ${newOpening}.`);
process.exit(0);
