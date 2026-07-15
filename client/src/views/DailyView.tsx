import { useMemo } from 'react';
import { useApp } from '../store';
import { css, HoverButton } from '../ui';
import { money, money0, thaiDate, thaiDateFull } from '../lib/format';
import { balanceMap } from '../lib/compute';

export function DailyView() {
  const app = useApp();
  const { db, date } = app;
  const bmap = useMemo(() => balanceMap(db), [db]);

  const rows = db.txns.filter((t) => t.date === date).sort((a, b) => (a.ord || 0) - (b.ord || 0));
  const spent = rows.reduce((s, t) => s + (+t.pay || 0), 0);
  const recvSum = rows.reduce((s, t) => s + (+t.recv || 0), 0);
  const remain = db.dailyLimit - spent;

  const bal = rows.length
    ? bmap[rows[rows.length - 1].id]
    : (() => {
        const prior = db.txns
          .filter((t) => t.date <= date)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ord || 0) - (b.ord || 0)));
        return prior.length ? bmap[prior[prior.length - 1].id] : db.opening;
      })();

  const remainColor = remain < 0 ? 'var(--danger)' : remain < db.dailyLimit * 0.15 ? 'var(--warn)' : 'var(--pri)';
  const remainPct = Math.max(0, Math.min(100, (remain / db.dailyLimit) * 100)) + '%';

  const shift = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    app.setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div style={css('padding:30px 38px;')}>
      <div className="no-print" style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:22px;')}>
        <div>
          <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>โอนเงินรายวัน · BUALUANG MBANKING</div>
          <h1 style={css('margin:4px 0 0;font-size:27px;font-weight:700;')}>{thaiDateFull(date)}</h1>
        </div>
        <div style={css('display:flex;align-items:center;gap:10px;')}>
          <button onClick={() => shift(-1)} style={css('width:38px;height:38px;border:1px solid var(--line);background:var(--surface);border-radius:9px;font-size:17px;cursor:pointer;color:var(--ink);')}>‹</button>
          <input type="date" value={date} onChange={(e) => app.setDate(e.target.value)} style={css('height:38px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 12px;font-family:inherit;font-size:14px;color:var(--ink);')} />
          <button onClick={() => shift(1)} style={css('width:38px;height:38px;border:1px solid var(--line);background:var(--surface);border-radius:9px;font-size:17px;cursor:pointer;color:var(--ink);')}>›</button>
          <HoverButton onClick={() => app.openDeposit()} base="height:38px;background:var(--pri);color:#fff;border:none;border-radius:9px;padding:0 16px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;" hover="background:var(--pri-d);">↓ นำเงินเข้าบัญชี</HoverButton>
          <HoverButton onClick={() => app.openTransfer(null)} base="height:38px;background:var(--acc);color:#fff;border:none;border-radius:9px;padding:0 18px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;" hover="background:#a9542c;">＋ เพิ่มรายการโอน</HoverButton>
        </div>
      </div>

      {/* summary cards */}
      <div className="no-print" style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;')}>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;')}>เพดานโอนต่อวัน
            <button onClick={() => app.openLimit()} style={css('border:none;background:none;color:var(--acc);font-size:12px;cursor:pointer;font-family:inherit;text-decoration:underline;')}>ตั้งค่า</button>
          </div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>฿{money(db.dailyLimit)}</div>
        </div>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;')}>โอนออกแล้ววันนี้</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;color:var(--acc);")}>฿{money(spent)}</div>
        </div>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;')}>โอนได้อีก (เพดานวันนี้)</div>
          <div style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;"), color: remainColor }}>฿{money(Math.max(0, remain))}</div>
          <div style={css('height:6px;background:#eee7d9;border-radius:4px;margin-top:10px;overflow:hidden;')}>
            <div style={{ ...css('height:100%;border-radius:4px;transition:width .3s;'), width: remainPct, background: remainColor }} />
          </div>
        </div>
        <div style={css('background:var(--pri-d);color:#eef3ec;border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;opacity:.75;margin-bottom:8px;')}>ยอดเงินคงเหลือในบัญชี</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>฿{money(bal)}</div>
          <div style={css('font-size:11.5px;opacity:.6;margin-top:6px;')}>ยกมา ฿{money(db.opening)}</div>
        </div>
      </div>

      {/* day table */}
      <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;')}>
        <div style={css('overflow-x:auto;')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:13.5px;min-width:900px;')}>
            <thead>
              <tr style={css('background:var(--pri-bg);color:var(--pri-d);text-align:left;')}>
                <th style={css('padding:12px 14px;font-weight:600;white-space:nowrap;')}>Voucher</th>
                <th style={css('padding:12px 14px;font-weight:600;white-space:nowrap;')}>วันที่</th>
                <th style={css('padding:12px 14px;font-weight:600;')}>ชื่อบัญชี</th>
                <th style={css('padding:12px 14px;font-weight:600;')}>รายละเอียด</th>
                <th style={css('padding:12px 14px;font-weight:600;')}>จ่ายให้</th>
                <th style={css('padding:12px 14px;font-weight:600;text-align:right;')}>รับ</th>
                <th style={css('padding:12px 14px;font-weight:600;text-align:right;')}>จ่าย</th>
                <th style={css('padding:12px 14px;font-weight:600;text-align:right;')}>คงเหลือ</th>
                <th className="no-print" style={css('padding:12px 14px;font-weight:600;text-align:center;')}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={css('border-top:1px solid var(--line);vertical-align:top;')}>
                  <td style={css("padding:11px 14px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;white-space:nowrap;color:var(--pri-d);font-weight:500;")}>{t.voucher || '—'}</td>
                  <td style={css('padding:11px 14px;white-space:nowrap;color:var(--muted);')}>{thaiDate(t.date)}</td>
                  <td style={css('padding:11px 14px;font-weight:500;white-space:nowrap;')}>{t.cc}</td>
                  <td style={css('padding:11px 14px;color:var(--ink);max-width:340px;')}>{t.detail}</td>
                  <td style={css('padding:11px 14px;color:var(--muted);white-space:nowrap;')}>{t.payTo || '—'}</td>
                  <td style={css("padding:11px 14px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money0(t.recv)}</td>
                  <td style={css("padding:11px 14px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);font-weight:500;")}>{money0(t.pay)}</td>
                  <td style={css("padding:11px 14px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--muted);")}>{money(bmap[t.id])}</td>
                  <td className="no-print" style={css('padding:11px 10px;text-align:center;white-space:nowrap;')}>
                    <HoverButton onClick={() => app.openVoucher(t.id)} title="ใบสำคัญจ่าย" base="border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 9px;cursor:pointer;font-size:12px;font-family:inherit;color:var(--pri-d);margin-right:4px;" hover="background:var(--pri-bg);">ใบสำคัญ</HoverButton>
                    <button onClick={() => app.openTransfer(t.id)} title="แก้ไข" style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;font-family:inherit;color:var(--muted);margin-right:4px;')}>แก้</button>
                    <button onClick={() => app.deleteTxn(t.id)} title="ลบ" style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;font-family:inherit;color:var(--danger);')}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div style={css('padding:44px;text-align:center;color:var(--muted);font-size:14px;')}>ยังไม่มีรายการโอนของวันนี้ — กด “＋ เพิ่มรายการโอน” เพื่อเริ่ม</div>
        )}
        <div style={css('display:flex;justify-content:space-between;padding:13px 16px;border-top:2px solid var(--line);background:#faf7f0;font-size:13.5px;')}>
          <span style={css('color:var(--muted);')}>{rows.length} รายการ</span>
          <span style={css("display:flex;gap:26px;font-family:'IBM Plex Mono',monospace;")}>
            <span>รับ <b style={css('color:var(--pri);')}>฿{money(recvSum)}</b></span>
            <span>จ่าย <b style={css('color:var(--acc);')}>฿{money(spent)}</b></span>
          </span>
        </div>
      </div>
    </div>
  );
}
