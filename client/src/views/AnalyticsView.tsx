import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { css, HoverButton } from '../ui';
import { money, money0, thaiDate } from '../lib/format';
import type { Txn } from '../types';

export function AnalyticsView() {
  const { db } = useApp();
  const dates = useMemo(() => db.txns.map((t) => t.date).filter(Boolean).sort(), [db]);
  const first = dates[0] || '2026-05-01';
  const last = dates[dates.length - 1] || '2026-05-30';
  const [anFrom, setAnFrom] = useState(first);
  const [anTo, setAnTo] = useState(last);

  // ported from DCLogic.analyticsRows: enrich bank/acct from payee master when missing
  const arows: (Txn & { bank: string; acct: string })[] = db.txns
    .filter((x) => x.date && x.date >= anFrom && x.date <= anTo)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ord || 0) - (b.ord || 0)))
    .map((x) => {
      let bank = x.bank;
      let acct = x.acct;
      if (!bank || !acct) {
        const p = db.payees.find((p) => p.payTo === x.payTo || p.shop === x.payTo);
        if (p) { bank = bank || p.bank; acct = acct || p.acct; }
      }
      return { ...x, bank, acct };
    });

  const sr = arows.reduce((s, t) => s + (+t.recv || 0), 0);
  const sp = arows.reduce((s, t) => s + (+t.pay || 0), 0);
  const days = new Set(arows.map((t) => t.date)).size;

  const exportExcel = () => {
    const esc = (s: unknown) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const head = ['Voucher', 'วันที่', 'ชื่อบัญชี', 'รายละเอียด', 'จ่ายให้', 'ธนาคาร', 'เลขที่บัญชี', 'รับ', 'จ่าย'];
    let h = '<table border="1"><tr>' + head.map((x) => `<th>${esc(x)}</th>`).join('') + '</tr>';
    arows.forEach((t) => {
      h += '<tr>' + [t.voucher, thaiDate(t.date), t.cc, t.detail, t.payTo, t.bank, t.acct, +t.recv || '', +t.pay || '']
        .map((x) => `<td>${esc(x)}</td>`).join('') + '</tr>';
    });
    h += `<tr><td colspan="7"><b>รวม</b></td><td><b>${sr}</b></td><td><b>${sp}</b></td></tr></table>`;
    const html = '<html><head><meta charset="UTF-8"></head><body>' + h + '</body></html>';
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `วิเคราะห์การโอน_${anFrom}_ถึง_${anTo}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const dateInput = 'height:38px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 12px;font-family:inherit;font-size:14px;color:var(--ink);';

  return (
    <div style={css('padding:30px 38px;')}>
      <div style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px;')}>
        <div>
          <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>วิเคราะห์ · DATA ANALYSIS</div>
          <h1 style={css('margin:4px 0 0;font-size:26px;font-weight:700;')}>วิเคราะห์ข้อมูลการโอน</h1>
        </div>
        <div style={css('display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;')}>
          <label style={css('display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted);')}>ตั้งแต่วันที่
            <input type="date" value={anFrom} onChange={(e) => setAnFrom(e.target.value)} style={css(dateInput)} /></label>
          <label style={css('display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted);')}>จนถึงวันที่
            <input type="date" value={anTo} onChange={(e) => setAnTo(e.target.value)} style={css(dateInput)} /></label>
          <HoverButton onClick={exportExcel} base="height:38px;background:var(--pri);color:#fff;border:none;border-radius:9px;padding:0 18px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;" hover="background:var(--pri-d);">⬇ ส่งออก Excel</HoverButton>
        </div>
      </div>

      <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:22px;')}>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;')}>จำนวนรายการ ({days} วัน)</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>{arows.length}</div>
        </div>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;')}>ยอดรับรวม</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;color:var(--pri);")}>฿{money(sr)}</div>
        </div>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;')}>ยอดโอนออกรวม</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;color:var(--acc);")}>฿{money(sp)}</div>
        </div>
        <div style={css('background:var(--pri-d);color:#eef3ec;border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;opacity:.75;margin-bottom:8px;')}>สุทธิ (รับ − จ่าย)</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>฿{money(sr - sp)}</div>
        </div>
      </div>

      <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;')}>
        <div style={css('overflow-x:auto;max-height:58vh;overflow-y:auto;')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:13px;min-width:1000px;')}>
            <thead><tr style={css('background:var(--pri-bg);color:var(--pri-d);text-align:left;position:sticky;top:0;')}>
              <th style={css('padding:11px 12px;font-weight:600;white-space:nowrap;')}>Voucher</th>
              <th style={css('padding:11px 12px;font-weight:600;white-space:nowrap;')}>วันที่</th>
              <th style={css('padding:11px 12px;font-weight:600;')}>ชื่อบัญชี</th>
              <th style={css('padding:11px 12px;font-weight:600;')}>รายละเอียด</th>
              <th style={css('padding:11px 12px;font-weight:600;')}>จ่ายให้</th>
              <th style={css('padding:11px 12px;font-weight:600;text-align:right;')}>รับ</th>
              <th style={css('padding:11px 12px;font-weight:600;text-align:right;')}>จ่าย</th>
            </tr></thead>
            <tbody>
              {arows.map((t) => (
                <tr key={t.id} style={css('border-top:1px solid var(--line);vertical-align:top;')}>
                  <td style={css("padding:9px 12px;font-family:'IBM Plex Mono',monospace;font-size:12px;white-space:nowrap;color:var(--pri-d);")}>{t.voucher || '—'}</td>
                  <td style={css('padding:9px 12px;white-space:nowrap;color:var(--muted);')}>{thaiDate(t.date)}</td>
                  <td style={css('padding:9px 12px;font-weight:500;white-space:nowrap;')}>{t.cc}</td>
                  <td style={css('padding:9px 12px;max-width:320px;')}>{t.detail}</td>
                  <td style={css('padding:9px 12px;color:var(--muted);white-space:nowrap;')}>{t.payTo || '—'}</td>
                  <td style={css("padding:9px 12px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money0(t.recv)}</td>
                  <td style={css("padding:9px 12px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{money0(t.pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {arows.length === 0 && (
          <div style={css('padding:44px;text-align:center;color:var(--muted);font-size:14px;')}>ไม่มีรายการในช่วงวันที่ที่เลือก</div>
        )}
        <div style={css('display:flex;justify-content:space-between;padding:12px 16px;border-top:2px solid var(--line);background:#faf7f0;font-size:13.5px;')}>
          <span style={css('color:var(--muted);')}>{arows.length} รายการ</span>
          <span style={css("display:flex;gap:24px;font-family:'IBM Plex Mono',monospace;")}><span>รับ <b style={css('color:var(--pri);')}>฿{money(sr)}</b></span><span>จ่าย <b style={css('color:var(--acc);')}>฿{money(sp)}</b></span></span>
        </div>
      </div>
    </div>
  );
}
