import { useState } from 'react';
import { useApp, type PayeeForm } from '../store';
import { css, HoverButton } from '../ui';

const overlay = 'position:fixed;inset:0;background:rgba(44,40,34,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;z-index:50;overflow-y:auto;';
const label = 'display:flex;flex-direction:column;gap:5px;font-size:13px;color:var(--muted);';
const field = 'height:38px;border:1px solid var(--line);border-radius:9px;padding:0 11px;font-family:inherit;font-size:14px;background:#fff;color:var(--ink);';
const fieldMono = "height:38px;border:1px solid var(--line);border-radius:9px;padding:0 11px;font-family:'IBM Plex Mono',monospace;font-size:14px;background:#fff;color:var(--ink);";

export function PayeeModal() {
  const app = useApp();
  const { editId, payeeInit } = app;
  const [pf, setPf] = useState<PayeeForm>(payeeInit!);
  const set = (p: Partial<PayeeForm>) => setPf((s) => ({ ...s, ...p }));

  return (
    <div className="no-print" onClick={() => app.closeModal()} style={css(overlay)}>
      <div onClick={(e) => e.stopPropagation()} style={css('background:var(--surface);border-radius:16px;width:600px;max-width:100%;padding:26px 28px;box-shadow:0 20px 60px rgba(0,0,0,.28);')}>
        <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;')}>
          <h2 style={css('margin:0;font-size:20px;font-weight:700;')}>{editId ? 'แก้ไขผู้รับ' : 'เพิ่มผู้รับใหม่'}</h2>
          <button onClick={() => app.closeModal()} style={css('border:none;background:none;font-size:24px;cursor:pointer;color:var(--muted);line-height:1;')}>×</button>
        </div>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;')}>
          <label style={css(label)}>ชื่อร้าน<input className="mb-in" value={pf.shop} onChange={(e) => set({ shop: e.target.value })} style={css(field)} /></label>
          <label style={css(label)}>จ่ายให้<input className="mb-in" value={pf.payTo} onChange={(e) => set({ payTo: e.target.value })} style={css(field)} /></label>
          <label style={css(label)}>ธนาคาร<input className="mb-in" value={pf.bank} onChange={(e) => set({ bank: e.target.value })} style={css(field)} /></label>
          <label style={css(label)}>เลขที่บัญชี<input className="mb-in" value={pf.acct} onChange={(e) => set({ acct: e.target.value })} style={css(fieldMono)} /></label>
          <label style={css(label)}>ประเภท<input className="mb-in" value={pf.type} onChange={(e) => set({ type: e.target.value })} style={css(field)} /></label>
          <label style={css(label)}>LINE<input className="mb-in" value={pf.line} onChange={(e) => set({ line: e.target.value })} style={css(field)} /></label>
          <label style={css(label + 'grid-column:1 / -1;')}>รายละเอียด<input className="mb-in" value={pf.detail} onChange={(e) => set({ detail: e.target.value })} style={css(field)} /></label>
          <label style={css(label)}>สถานะ
            <select value={pf.status} onChange={(e) => set({ status: e.target.value })} style={css('height:38px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-family:inherit;font-size:14px;background:#fff;color:var(--ink);')}>
              <option value="active">ใช้งาน (active)</option>
              <option value="inactive">ปิดใช้ (inactive)</option>
            </select>
          </label>
        </div>
        <div style={css('display:flex;justify-content:flex-end;gap:10px;margin-top:22px;')}>
          <button onClick={() => app.closeModal()} style={css('border:1px solid var(--line);background:#fff;border-radius:9px;padding:10px 18px;font-family:inherit;font-size:14px;cursor:pointer;color:var(--ink);')}>ยกเลิก</button>
          <HoverButton onClick={() => app.savePayee(pf, editId)} base="background:var(--pri);color:#fff;border:none;border-radius:9px;padding:10px 24px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;" hover="background:var(--pri-d);">บันทึก</HoverButton>
        </div>
      </div>
    </div>
  );
}
