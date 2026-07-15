import { useState } from 'react';
import { useApp } from '../store';
import { css } from '../ui';

export function AccountsView() {
  const app = useApp();
  const { db } = app;
  const [newDept, setNewDept] = useState('');
  const [newCcName, setNewCcName] = useState('');
  const [newCcDept, setNewCcDept] = useState('');
  const [ccSearch, setCcSearch] = useState('');

  const ccCountByDept: Record<string, number> = {};
  db.costCenters.forEach((c) => { ccCountByDept[c.dept || ''] = (ccCountByDept[c.dept || ''] || 0) + 1; });

  const q = ccSearch.toLowerCase().trim();
  let ccs = db.costCenters;
  if (q) ccs = ccs.filter((c) => c.name.toLowerCase().includes(q));
  ccs = [...ccs].sort((a, b) => a.name.localeCompare(b.name, 'th')).slice(0, 200);

  const smallInput = 'flex:1;height:36px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-family:inherit;font-size:13.5px;color:var(--ink);background:#fff;';
  const addBtn = 'background:var(--pri);color:#fff;border:none;border-radius:8px;padding:0 14px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;';

  const doAddDept = async () => { await app.addDept(newDept); setNewDept(''); };
  const doAddCc = async () => { await app.addCc(newCcName, newCcDept); setNewCcName(''); setNewCcDept(''); };

  return (
    <div style={css('padding:30px 38px;')}>
      <div style={css('margin-bottom:20px;')}>
        <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>ผังบัญชี · COST CENTERS</div>
        <h1 style={css('margin:4px 0 0;font-size:26px;font-weight:700;')}>ชื่อบัญชี &amp; แผนก</h1>
      </div>
      <div style={css('display:grid;grid-template-columns:320px 1fr;gap:22px;align-items:start;')}>
        {/* depts */}
        <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;')}>
          <div style={css('font-weight:700;font-size:15px;margin-bottom:12px;')}>แผนก (กลุ่ม)</div>
          <div style={css('display:flex;flex-direction:column;gap:7px;margin-bottom:14px;')}>
            {db.departments.map((d) => (
              <div key={d} style={css('display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:9px;padding:9px 12px;font-size:13.5px;')}>
                <span style={css('font-weight:500;')}>{d}</span>
                <span style={css('color:var(--muted);font-size:12.5px;')}>{ccCountByDept[d] || 0} บัญชี</span>
              </div>
            ))}
          </div>
          <div style={css('display:flex;gap:8px;')}>
            <input className="mb-in" value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="ชื่อแผนกใหม่…" style={css(smallInput)} />
            <button onClick={doAddDept} style={css(addBtn)}>เพิ่ม</button>
          </div>
        </div>
        {/* cost centers */}
        <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;')}>
          <div style={css('display:flex;justify-content:space-between;align-items:center;padding:16px 18px;')}>
            <div style={css('font-weight:700;font-size:15px;')}>ชื่อบัญชี ({db.costCenters.length})</div>
            <input className="mb-in" value={ccSearch} onChange={(e) => setCcSearch(e.target.value)} placeholder="ค้นหาชื่อบัญชี…" style={css('width:220px;height:36px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-family:inherit;font-size:13.5px;color:var(--ink);background:#fff;')} />
          </div>
          <div style={css('display:flex;gap:8px;padding:0 18px 14px;border-bottom:1px solid var(--line);')}>
            <input className="mb-in" value={newCcName} onChange={(e) => setNewCcName(e.target.value)} placeholder="ชื่อบัญชีใหม่…" style={css(smallInput)} />
            <select value={newCcDept} onChange={(e) => setNewCcDept(e.target.value)} style={css('height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-family:inherit;font-size:13.5px;color:var(--ink);background:#fff;')}>
              <option value="">— ไม่ระบุแผนก —</option>
              {db.departments.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={doAddCc} style={css(addBtn)}>เพิ่ม</button>
          </div>
          <div style={css('max-height:56vh;overflow-y:auto;')}>
            <table style={css('width:100%;border-collapse:collapse;font-size:13.5px;')}>
              <thead><tr style={css('background:#faf7f0;color:var(--muted);text-align:left;position:sticky;top:0;')}><th style={css('padding:9px 18px;font-weight:600;')}>ชื่อบัญชี</th><th style={css('padding:9px 14px;font-weight:600;')}>แผนก</th><th style={css('padding:9px 14px;')}></th></tr></thead>
              <tbody>
                {ccs.map((c) => (
                  <tr key={c.id} style={css('border-top:1px solid var(--line);')}>
                    <td style={css('padding:8px 18px;font-weight:500;')}>{c.name}</td>
                    <td style={css('padding:8px 14px;')}>
                      <select value={c.dept || ''} onChange={(e) => app.setCcDept(c.id, e.target.value)} style={css('border:1px solid var(--line);border-radius:7px;padding:5px 8px;font-family:inherit;font-size:12.5px;color:var(--ink);background:#fff;')}>
                        <option value="">— ไม่ระบุ —</option>
                        {db.departments.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={css('padding:8px 14px;text-align:right;')}><button onClick={() => app.delCc(c.id)} style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:4px 9px;cursor:pointer;font-size:12px;font-family:inherit;color:var(--danger);')}>ลบ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
