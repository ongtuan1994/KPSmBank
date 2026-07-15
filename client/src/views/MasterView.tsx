import { useState } from 'react';
import { useApp } from '../store';
import { css, HoverButton } from '../ui';

export function MasterView() {
  const app = useApp();
  const { db } = app;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [page, setPage] = useState(0);

  const q = search.toLowerCase().trim();
  let list = db.payees;
  if (statusFilter !== 'all') list = list.filter((p) => (p.status || 'active') === statusFilter);
  if (bankFilter !== 'all') list = list.filter((p) => p.bank === bankFilter);
  if (q) list = list.filter((p) => ((p.shop || '') + p.payTo + p.acct + (p.line || '') + (p.type || '')).toLowerCase().includes(q));

  const per = 25;
  const total = Math.max(1, Math.ceil(list.length / per));
  const pageNo = Math.min(page, total - 1);
  const banks = [...new Set(db.payees.map((p) => p.bank).filter(Boolean))].sort();
  const pageRows = list.slice(pageNo * per, pageNo * per + per);

  const filterSel = 'height:40px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 12px;font-family:inherit;font-size:14px;color:var(--ink);';

  return (
    <div style={css('padding:30px 38px;')}>
      <div className="no-print" style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px;')}>
        <div>
          <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>MASTER DATA · บัญชีผู้รับโอน</div>
          <h1 style={css('margin:4px 0 0;font-size:26px;font-weight:700;')}>บัญชีโอน <span style={css('font-size:16px;color:var(--muted);font-weight:500;')}>({db.payees.length} ราย)</span></h1>
        </div>
        <HoverButton onClick={() => app.openPayeeModal(null)} base="height:38px;background:var(--acc);color:#fff;border:none;border-radius:9px;padding:0 18px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;" hover="background:#a9542c;">＋ เพิ่มผู้รับใหม่</HoverButton>
      </div>
      <div className="no-print" style={css('display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;')}>
        <input className="mb-in" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="ค้นหา ชื่อร้าน / ผู้รับ / เลขบัญชี / LINE…" style={css('flex:1;min-width:240px;height:40px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 14px;font-family:inherit;font-size:14px;color:var(--ink);')} />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} style={css(filterSel)}>
          <option value="all">ทุกสถานะ</option>
          <option value="active">ใช้งาน (active)</option>
          <option value="inactive">ปิดใช้ (inactive)</option>
        </select>
        <select value={bankFilter} onChange={(e) => { setBankFilter(e.target.value); setPage(0); }} style={css(filterSel)}>
          <option value="all">ทุกธนาคาร</option>
          {banks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;')}>
        <div style={css('overflow-x:auto;max-height:64vh;overflow-y:auto;')}>
          <table style={css('width:100%;border-collapse:collapse;font-size:13px;min-width:960px;')}>
            <thead>
              <tr style={css('background:var(--pri-bg);color:var(--pri-d);text-align:left;position:sticky;top:0;')}>
                <th style={css('padding:11px 14px;font-weight:600;')}>ชื่อร้าน</th>
                <th style={css('padding:11px 14px;font-weight:600;')}>จ่ายให้</th>
                <th style={css('padding:11px 14px;font-weight:600;')}>BANK</th>
                <th style={css('padding:11px 14px;font-weight:600;')}>เลขที่บัญชี</th>
                <th style={css('padding:11px 14px;font-weight:600;')}>ประเภท</th>
                <th style={css('padding:11px 14px;font-weight:600;')}>LINE</th>
                <th style={css('padding:11px 14px;font-weight:600;text-align:center;')}>สถานะ</th>
                <th style={css('padding:11px 14px;font-weight:600;text-align:center;')}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => {
                const inactive = p.status === 'inactive';
                return (
                  <tr key={p.id} style={{ ...css('border-top:1px solid var(--line);'), opacity: inactive ? 0.5 : 1 }}>
                    <td style={css('padding:10px 14px;font-weight:500;')}>{p.shop || '—'}</td>
                    <td style={css('padding:10px 14px;color:var(--muted);')}>{p.payTo || '—'}</td>
                    <td style={css('padding:10px 14px;white-space:nowrap;')}>{p.bank || '—'}</td>
                    <td style={css("padding:10px 14px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;white-space:nowrap;")}>{p.acct || '—'}</td>
                    <td style={css('padding:10px 14px;')}><span style={css('font-size:12px;background:var(--acc-bg);color:var(--acc);padding:2px 8px;border-radius:20px;')}>{p.type || '—'}</span></td>
                    <td style={css('padding:10px 14px;color:var(--muted);')}>{p.line || '—'}</td>
                    <td style={css('padding:10px 14px;text-align:center;')}>
                      <button onClick={() => app.togglePayee(p.id)} style={css('border:none;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;padding:4px 12px;border-radius:20px;' + (inactive ? 'background:#efe9dd;color:#8a8072;' : 'background:var(--pri-bg);color:var(--pri-d);'))}>{inactive ? 'ปิดใช้' : 'ใช้งาน'}</button>
                    </td>
                    <td style={css('padding:10px 14px;text-align:center;white-space:nowrap;')}>
                      <button onClick={() => app.openPayeeModal(p.id)} style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:12px;font-family:inherit;color:var(--pri-d);margin-right:4px;')}>แก้ไข</button>
                      <button onClick={() => app.deletePayee(p.id)} style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 9px;cursor:pointer;font-size:12px;font-family:inherit;color:var(--danger);')}>ลบ</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={css('display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-top:1px solid var(--line);background:#faf7f0;font-size:13px;color:var(--muted);')}>
          <span>แสดง {pageRows.length} จาก {list.length} ราย</span>
          <span style={css('display:flex;gap:8px;align-items:center;')}>
            <button onClick={() => setPage(Math.max(0, pageNo - 1))} style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 11px;cursor:pointer;font-family:inherit;font-size:12.5px;')}>‹ ก่อน</button>
            <span>หน้า {pageNo + 1}/{total}</span>
            <button onClick={() => setPage(Math.min(total - 1, pageNo + 1))} style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 11px;cursor:pointer;font-family:inherit;font-size:12.5px;')}>ถัดไป ›</button>
          </span>
        </div>
      </div>
    </div>
  );
}
