import { useState } from 'react';
import { useApp, type TransferForm } from '../store';
import { css, HoverButton, HoverDiv } from '../ui';
import { money, yy, mm } from '../lib/format';
import { genVoucher } from '../lib/compute';

const overlay = 'position:fixed;inset:0;background:rgba(44,40,34,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;z-index:50;overflow-y:auto;';
const label = 'display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--muted);';
const field = 'height:38px;border:1px solid var(--line);border-radius:9px;padding:0 11px;font-family:inherit;font-size:14px;color:var(--ink);background:#fff;';

export function TransferModal() {
  const app = useApp();
  const { db, editId, transferInit } = app;
  const [f, setF] = useState<TransferForm>(transferInit!);
  const [err, setErr] = useState('');
  const [showCcList, setShowCcList] = useState(false);
  const [showPayeeList, setShowPayeeList] = useState(false);

  const patch = (p: Partial<TransferForm>) => { setF((s) => ({ ...s, ...p })); setErr(''); };

  const day = f.date || app.date;
  const amt = parseFloat(String(f.amount).replace(/,/g, '')) || 0;
  const spentOther = db.txns.filter((t) => t.date === day && t.id !== editId).reduce((s, t) => s + (+t.pay || 0), 0);
  const previewRemain = db.dailyLimit - (spentOther + (f.dir === 'pay' ? amt : 0));
  const previewColor = previewRemain < 0 ? 'var(--danger)' : 'var(--pri-d)';

  const qc = (f.cc || '').toLowerCase().trim();
  const ccMatches = (qc ? db.costCenters.filter((c) => c.name.toLowerCase().includes(qc)) : db.costCenters)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
    .slice(0, 8);

  const q = (f.payeeQuery || '').toLowerCase().trim();
  const payeeMatches = q
    ? db.payees
        .filter((p) => p.status !== 'inactive' && ((p.shop || '').toLowerCase().includes(q) || (p.payTo || '').toLowerCase().includes(q) || (p.acct || '').includes(q) || (p.line || '').toLowerCase().includes(q)))
        .slice(0, 8)
    : [];

  const save = async () => {
    const e = await app.saveTransfer(f, editId);
    if (e) setErr(e);
  };

  return (
    <div className="no-print" onClick={() => app.closeModal()} style={css(overlay)}>
      <div onClick={(e) => e.stopPropagation()} style={css('background:var(--surface);border-radius:16px;width:640px;max-width:100%;padding:26px 28px;box-shadow:0 20px 60px rgba(0,0,0,.28);')}>
        <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;')}>
          <h2 style={css('margin:0;font-size:20px;font-weight:700;')}>{editId ? 'แก้ไขรายการโอน' : 'เพิ่มรายการโอน'}</h2>
          <button onClick={() => app.closeModal()} style={css('border:none;background:none;font-size:24px;cursor:pointer;color:var(--muted);line-height:1;')}>×</button>
        </div>

        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;')}>
          <label style={css(label)}>วันที่
            <input type="date" value={f.date} onChange={(e) => patch({ date: e.target.value, voucher: editId ? f.voucher : genVoucher(db, e.target.value) })} style={css(field)} />
          </label>
          <label style={css(label)}><span>Voucher (M{yy(day)}-{mm(day)}-XXX)</span>
            <input value={f.voucher} onChange={(e) => patch({ voucher: e.target.value })} style={css("height:38px;border:1px solid var(--line);border-radius:9px;padding:0 11px;font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--pri-d);background:#fff;")} />
          </label>

          <label style={css(label)}>ประเภทรายการ
            <select value={f.dir} onChange={(e) => patch({ dir: e.target.value as 'pay' | 'recv' })} style={css('height:38px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-family:inherit;font-size:14px;color:var(--ink);background:#fff;')}>
              <option value="pay">จ่าย (โอนออก)</option>
              <option value="recv">รับ (เงินเข้า)</option>
            </select>
          </label>
          <label style={css(label)}>จำนวนเงิน (บาท)
            <input value={f.amount} onChange={(e) => patch({ amount: e.target.value })} inputMode="decimal" placeholder="0.00" style={css("height:38px;border:1px solid var(--line);border-radius:9px;padding:0 11px;font-family:'IBM Plex Mono',monospace;font-size:15px;color:var(--ink);background:#fff;")} />
          </label>

          <label style={css(label + 'grid-column:1 / -1;position:relative;')}>ชื่อบัญชี (Cost Center)
            <input className="mb-in" value={f.cc} onChange={(e) => { patch({ cc: e.target.value, addCc: false }); setShowCcList(true); setShowPayeeList(false); }} onFocus={() => { setShowCcList(true); setShowPayeeList(false); }} onBlur={() => setTimeout(() => setShowCcList(false), 150)} placeholder="พิมพ์เพื่อค้นหา หรือเลือกชื่อบัญชี…" style={css(field)} />
            {showCcList && !f.addCc && (
              <div style={css('position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.16);max-height:220px;overflow-y:auto;z-index:6;margin-top:4px;')}>
                {ccMatches.map((c) => (
                  <HoverDiv key={c.id} onClick={() => { patch({ cc: c.name, addCc: false }); setShowCcList(false); }} base="padding:9px 12px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px;display:flex;justify-content:space-between;gap:10px;" hover="background:var(--pri-bg);">
                    <span style={css('font-weight:500;')}>{c.name}</span>
                    <span style={css('color:var(--muted);font-size:12px;white-space:nowrap;')}>{c.dept || '—'}</span>
                  </HoverDiv>
                ))}
                <HoverDiv onClick={() => { setF((s) => ({ ...s, addCc: true, newCcName: s.cc })); setShowCcList(false); }} base="padding:10px 12px;cursor:pointer;font-size:13px;color:var(--acc);font-weight:600;" hover="background:var(--acc-bg);">＋ เพิ่มชื่อบัญชีใหม่ “{f.cc}”</HoverDiv>
              </div>
            )}
          </label>
          {f.addCc && (
            <div style={css('grid-column:1 / -1;display:flex;gap:10px;align-items:center;background:var(--pri-bg);padding:10px 12px;border-radius:9px;font-size:13px;')}>
              <span style={css('color:var(--pri-d);')}>เพิ่ม “<b>{f.newCcName}</b>” เข้าแผนก:</span>
              <select value={f.newCcDept} onChange={(e) => patch({ newCcDept: e.target.value })} style={css('flex:1;height:36px;border:1px solid var(--line);border-radius:8px;padding:0 8px;font-family:inherit;font-size:13.5px;background:#fff;color:var(--ink);')}>
                <option value="">— ไม่ระบุแผนก —</option>
                {db.departments.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}

          <label style={css(label + 'grid-column:1 / -1;position:relative;')}>จ่ายให้ / ผู้รับ
            <input className="mb-in" value={f.payeeQuery} onChange={(e) => { patch({ payeeQuery: e.target.value, payTo: '', bank: '', acct: '' }); setShowPayeeList(true); setShowCcList(false); }} onFocus={() => { setShowPayeeList(true); setShowCcList(false); }} onBlur={() => setTimeout(() => setShowPayeeList(false), 150)} placeholder="พิมพ์เพื่อค้นหาจาก Master Data…" style={css(field)} />
            {showPayeeList && !f.addPayee && (
              <div style={css('position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.16);max-height:220px;overflow-y:auto;z-index:5;margin-top:4px;')}>
                {payeeMatches.map((p) => (
                  <HoverDiv key={p.id} onClick={() => { patch({ payeeQuery: p.shop || p.payTo, payTo: p.payTo || p.shop, bank: p.bank, acct: p.acct }); setShowPayeeList(false); }} base="padding:9px 12px;border-bottom:1px solid var(--line);cursor:pointer;font-size:13px;" hover="background:var(--pri-bg);">
                    <div style={css('font-weight:600;')}>{p.shop || p.payTo}</div>
                    <div style={css('color:var(--muted);font-size:12px;')}>{`${p.payTo || ''} · ${p.bank} ${p.acct}`}</div>
                  </HoverDiv>
                ))}
                <HoverDiv onClick={() => { setF((s) => ({ ...s, addPayee: true, npShop: s.payeeQuery, npPayTo: s.payeeQuery })); setShowPayeeList(false); }} base="padding:10px 12px;cursor:pointer;font-size:13px;color:var(--acc);font-weight:600;" hover="background:var(--acc-bg);">＋ เพิ่มผู้รับใหม่ “{f.payeeQuery}”</HoverDiv>
              </div>
            )}
          </label>

          {f.addPayee && (
            <div style={css('grid-column:1 / -1;display:grid;grid-template-columns:1fr 1fr;gap:10px;background:var(--acc-bg);padding:12px;border-radius:10px;')}>
              <input className="mb-in" value={f.npShop} onChange={(e) => patch({ npShop: e.target.value })} placeholder="ชื่อร้าน" style={css('height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-family:inherit;font-size:13.5px;background:#fff;color:var(--ink);')} />
              <input className="mb-in" value={f.npPayTo} onChange={(e) => patch({ npPayTo: e.target.value })} placeholder="จ่ายให้ (ชื่อในบัญชี)" style={css('height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-family:inherit;font-size:13.5px;background:#fff;color:var(--ink);')} />
              <input className="mb-in" value={f.npBank} onChange={(e) => patch({ npBank: e.target.value })} placeholder="ธนาคาร (BBL/Kbank/…)" style={css('height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-family:inherit;font-size:13.5px;background:#fff;color:var(--ink);')} />
              <input className="mb-in" value={f.npAcct} onChange={(e) => patch({ npAcct: e.target.value })} placeholder="เลขที่บัญชี" style={css("height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-family:'IBM Plex Mono',monospace;font-size:13.5px;background:#fff;color:var(--ink);")} />
            </div>
          )}

          <label style={css(label + 'grid-column:1 / -1;')}>รายละเอียด
            <input className="mb-in" value={f.detail} onChange={(e) => patch({ detail: e.target.value })} placeholder="รายละเอียดรายการ…" style={css(field)} />
          </label>
        </div>

        {err && <div style={css('margin-top:14px;background:#f7e3e0;color:var(--danger);border-radius:9px;padding:10px 13px;font-size:13.5px;')}>{err}</div>}
        <div style={css('margin-top:12px;background:var(--pri-bg);border-radius:9px;padding:10px 14px;font-size:13px;display:flex;justify-content:space-between;')}>
          <span style={css('color:var(--muted);')}>โอนได้อีกวันนี้หลังบันทึก</span>
          <b style={{ ...css("font-family:'IBM Plex Mono',monospace;"), color: previewColor }}>฿{money(Math.max(0, previewRemain))}</b>
        </div>

        <div style={css('display:flex;justify-content:flex-end;gap:10px;margin-top:20px;')}>
          <button onClick={() => app.closeModal()} style={css('border:1px solid var(--line);background:#fff;border-radius:9px;padding:10px 18px;font-family:inherit;font-size:14px;cursor:pointer;color:var(--ink);')}>ยกเลิก</button>
          <HoverButton onClick={save} base="background:var(--acc);color:#fff;border:none;border-radius:9px;padding:10px 24px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;" hover="background:#a9542c;">บันทึกรายการ</HoverButton>
        </div>
      </div>
    </div>
  );
}
