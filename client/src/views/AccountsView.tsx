import { useState } from 'react';
import { useApp } from '../store';
import { css, HoverButton } from '../ui';

// sentinel for the dept filter — real depts can never be the empty string
const NO_DEPT = '__none__';
const PAGE_SIZE = 200;

export function AccountsView() {
  const app = useApp();
  const { db } = app;
  const [newDept, setNewDept] = useState('');
  const [newCcName, setNewCcName] = useState('');
  const [newCcDept, setNewCcDept] = useState('');
  const [ccSearch, setCcSearch] = useState('');
  const [ccDeptFilter, setCcDeptFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [openDepts, setOpenDepts] = useState<string[]>([]);
  // inline editing: which row is open, and its draft text
  const [editDept, setEditDept] = useState<string | null>(null);
  const [editCcId, setEditCcId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  const ccByDept: Record<string, typeof db.costCenters> = {};
  db.costCenters.forEach((c) => { (ccByDept[c.dept || ''] ||= []).push(c); });
  Object.values(ccByDept).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'th')));

  const toggleDept = (d: string) => setOpenDepts((o) => (o.includes(d) ? o.filter((x) => x !== d) : [...o, d]));

  const q = ccSearch.toLowerCase().trim();
  let ccs = db.costCenters;
  if (q) ccs = ccs.filter((c) => c.name.toLowerCase().includes(q));
  if (ccDeptFilter) ccs = ccs.filter((c) => (c.dept || NO_DEPT) === ccDeptFilter);
  const matched = ccs.length;
  // render a page-sized slice by default; "แสดงทั้งหมด" lifts the cap
  ccs = [...ccs].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  if (!showAll) ccs = ccs.slice(0, PAGE_SIZE);

  const smallInput = 'flex:1;height:36px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-family:inherit;font-size:13.5px;color:var(--ink);background:#fff;';
  const addBtn = 'background:var(--pri);color:#fff;border:none;border-radius:8px;padding:0 14px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;';

  const doAddDept = async () => { await app.addDept(newDept); setNewDept(''); };
  const doAddCc = async () => { await app.addCc(newCcName, newCcDept); setNewCcName(''); setNewCcDept(''); };

  const startEditDept = (d: string) => { setEditDept(d); setDraft(d); setErr(''); };
  const startEditCc = (id: number, name: string) => { setEditCcId(id); setDraft(name); setErr(''); };
  const cancelEdit = () => { setEditDept(null); setEditCcId(null); setDraft(''); setErr(''); };

  /** Run a rename/delete, surfacing the server's message (e.g. duplicate name). */
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); cancelEdit(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'); }
  };

  const doRenameDept = (from: string) => run(() => app.renameDept(from, draft));
  const doRenameCc = (id: number) => run(() => app.renameCc(id, draft));

  const doDelDept = (d: string) => {
    const n = (ccByDept[d] || []).length;
    const msg = n
      ? `ลบแผนก "${d}" ?\n\nบัญชี ${n} รายการในแผนกนี้จะย้ายไปเป็น "ไม่ระบุแผนก" (ไม่ถูกลบ)`
      : `ลบแผนก "${d}" ?`;
    if (window.confirm(msg)) run(() => app.delDept(d));
  };

  /* Export what's currently filtered (not just the rendered page), as an Excel
     HTML table — same approach as the วิเคราะห์ข้อมูล export. */
  const exportExcel = () => {
    const esc = (s: unknown) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let rows = db.costCenters;
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q));
    if (ccDeptFilter) rows = rows.filter((c) => (c.dept || NO_DEPT) === ccDeptFilter);
    rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'th'));

    const txnCount: Record<string, number> = {};
    db.txns.forEach((t) => { if (t.cc) txnCount[t.cc] = (txnCount[t.cc] || 0) + 1; });

    let h = '<table border="1"><tr>' + ['ลำดับ', 'ชื่อบัญชี', 'แผนก', 'จำนวนรายการโอน']
      .map((x) => `<th>${esc(x)}</th>`).join('') + '</tr>';
    rows.forEach((c, i) => {
      h += '<tr>' + [i + 1, c.name, c.dept || 'ไม่ระบุแผนก', txnCount[c.name] || 0]
        .map((x) => `<td>${esc(x)}</td>`).join('') + '</tr>';
    });
    h += `<tr><td colspan="3"><b>รวม</b></td><td><b>${rows.length} บัญชี</b></td></tr></table>`;

    const html = '<html><head><meta charset="UTF-8"></head><body>' + h + '</body></html>';
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const scope = ccDeptFilter === NO_DEPT ? '_ไม่ระบุแผนก' : ccDeptFilter ? `_${ccDeptFilter}` : '';
    a.download = `ชื่อบัญชีและแผนก${scope}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const iconBtn = 'border:1px solid var(--line);background:#fff;border-radius:7px;padding:3px 7px;cursor:pointer;font-size:11.5px;font-family:inherit;line-height:1.6;';
  const editInput = 'flex:1;min-width:0;height:30px;border:1px solid var(--pri);border-radius:7px;padding:0 8px;font-family:inherit;font-size:13px;color:var(--ink);background:#fff;';

  return (
    <div style={css('padding:30px 38px;')}>
      <div style={css('margin-bottom:20px;')}>
        <div style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;')}>
          <div>
            <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>ผังบัญชี · COST CENTERS</div>
            <h1 style={css('margin:4px 0 0;font-size:26px;font-weight:700;')}>ชื่อบัญชี &amp; แผนก</h1>
          </div>
          <HoverButton
            onClick={exportExcel}
            title={ccDeptFilter || q ? 'ส่งออกเฉพาะรายการที่กรองไว้' : 'ส่งออกชื่อบัญชีทั้งหมด'}
            base="height:38px;background:var(--pri);color:#fff;border:none;border-radius:9px;padding:0 18px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;"
            hover="background:var(--pri-d);"
          >⬇ ส่งออก Excel ({matched})</HoverButton>
        </div>
      </div>
      {err && (
        <div style={css('margin-bottom:14px;border:1px solid var(--danger);background:#fdf3f2;color:var(--danger);border-radius:10px;padding:10px 14px;font-size:13.5px;display:flex;justify-content:space-between;gap:12px;')}>
          <span>{err}</span>
          <button onClick={() => setErr('')} style={css('border:none;background:none;color:var(--danger);cursor:pointer;font-family:inherit;font-size:13.5px;')}>✕</button>
        </div>
      )}
      <div style={css('display:grid;grid-template-columns:320px 1fr;gap:22px;align-items:start;')}>
        {/* depts */}
        <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;')}>
          <div style={css('font-weight:700;font-size:15px;margin-bottom:12px;')}>แผนก (กลุ่ม)</div>
          <div style={css('display:flex;flex-direction:column;gap:7px;margin-bottom:14px;')}>
            {[...db.departments, ...(ccByDept[''] ? [''] : [])].map((d) => {
              const list = ccByDept[d] || [];
              const open = openDepts.includes(d);
              const editing = editDept === d;
              return (
                <div key={d || '__none'} style={css('border:1px solid var(--line);border-radius:9px;overflow:hidden;')}>
                  {editing ? (
                    <div style={css('display:flex;gap:6px;align-items:center;padding:7px 8px;background:#faf7f0;')}>
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') doRenameDept(d); if (e.key === 'Escape') cancelEdit(); }}
                        style={css(editInput)}
                      />
                      <button onClick={() => doRenameDept(d)} title="บันทึก" style={css(iconBtn + 'color:var(--pri-d);font-weight:600;')}>✓</button>
                      <button onClick={cancelEdit} title="ยกเลิก" style={css(iconBtn + 'color:var(--muted);')}>✕</button>
                    </div>
                  ) : (
                  <div style={css('display:flex;align-items:center;background:' + (open ? '#faf7f0' : '#fff') + ';')}>
                  <button
                    onClick={() => toggleDept(d)}
                    title={open ? 'ซ่อนบัญชีในแผนกนี้' : 'ดูบัญชีในแผนกนี้'}
                    style={css('flex:1;min-width:0;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 4px 9px 12px;font-size:13.5px;font-family:inherit;color:var(--ink);background:none;border:none;cursor:pointer;text-align:left;')}
                  >
                    <span style={css('display:flex;align-items:center;gap:7px;font-weight:500;min-width:0;')}>
                      <span style={css('color:var(--muted);font-size:10px;display:inline-block;width:9px;flex:none;transform:rotate(' + (open ? '90deg' : '0deg') + ');')}>▶</span>
                      <span style={css('overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{d || '— ไม่ระบุแผนก —'}</span>
                    </span>
                    <span style={css('color:var(--muted);font-size:12.5px;white-space:nowrap;')}>{list.length} บัญชี</span>
                  </button>
                  {/* the "ไม่ระบุแผนก" bucket isn't a real dept — nothing to rename or delete */}
                  {d !== '' && (
                    <span style={css('display:flex;gap:4px;padding:0 8px 0 6px;flex:none;')}>
                      <button onClick={() => startEditDept(d)} title="แก้ไขชื่อแผนก" style={css(iconBtn + 'color:var(--pri-d);')}>แก้ไข</button>
                      <button onClick={() => doDelDept(d)} title="ลบแผนก" style={css(iconBtn + 'color:var(--danger);')}>ลบ</button>
                    </span>
                  )}
                  </div>
                  )}
                  {open && (
                    <div style={css('border-top:1px solid var(--line);padding:6px 12px 8px 28px;display:flex;flex-direction:column;gap:3px;max-height:240px;overflow-y:auto;')}>
                      {list.length === 0
                        ? <span style={css('color:var(--muted);font-size:12.5px;padding:3px 0;')}>ยังไม่มีบัญชีในแผนกนี้</span>
                        : list.map((c) => <span key={c.id} style={css('font-size:12.5px;color:var(--ink);padding:2px 0;')}>{c.name}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={css('display:flex;gap:8px;')}>
            <input className="mb-in" value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="ชื่อแผนกใหม่…" style={css(smallInput)} />
            <button onClick={doAddDept} style={css(addBtn)}>เพิ่ม</button>
          </div>
        </div>
        {/* cost centers */}
        <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;')}>
          <div style={css('display:flex;justify-content:space-between;align-items:center;padding:16px 18px;')}>
            <div style={css('font-weight:700;font-size:15px;')}>
              ชื่อบัญชี ({q || ccDeptFilter ? `${matched} / ${db.costCenters.length}` : db.costCenters.length})
            </div>
            <div style={css('display:flex;gap:8px;align-items:center;')}>
              <select
                value={ccDeptFilter}
                onChange={(e) => setCcDeptFilter(e.target.value)}
                title="กรองตามแผนก"
                style={css('height:36px;border:1px solid var(--line);border-radius:8px;padding:0 10px;font-family:inherit;font-size:13.5px;color:' + (ccDeptFilter ? 'var(--pri)' : 'var(--ink)') + ';font-weight:' + (ccDeptFilter ? '600' : '400') + ';background:#fff;')}
              >
                <option value="">— ทุกแผนก —</option>
                {db.departments.map((o) => <option key={o} value={o}>{o}</option>)}
                <option value={NO_DEPT}>— ไม่ระบุแผนก —</option>
              </select>
              <input className="mb-in" value={ccSearch} onChange={(e) => setCcSearch(e.target.value)} placeholder="ค้นหาชื่อบัญชี…" style={css('width:220px;height:36px;border:1px solid var(--line);border-radius:8px;padding:0 11px;font-family:inherit;font-size:13.5px;color:var(--ink);background:#fff;')} />
            </div>
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
                    <td style={css('padding:8px 18px;font-weight:500;')}>
                      {editCcId === c.id ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') doRenameCc(c.id); if (e.key === 'Escape') cancelEdit(); }}
                          style={{ ...css(editInput), width: '100%' }}
                        />
                      ) : c.name}
                    </td>
                    <td style={css('padding:8px 14px;')}>
                      <select value={c.dept || ''} onChange={(e) => app.setCcDept(c.id, e.target.value)} style={css('border:1px solid var(--line);border-radius:7px;padding:5px 8px;font-family:inherit;font-size:12.5px;color:var(--ink);background:#fff;')}>
                        <option value="">— ไม่ระบุ —</option>
                        {db.departments.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td style={css('padding:8px 14px;text-align:right;white-space:nowrap;')}>
                      {editCcId === c.id ? (
                        <>
                          <button onClick={() => doRenameCc(c.id)} style={css(iconBtn + 'color:var(--pri-d);font-weight:600;margin-right:4px;')}>บันทึก</button>
                          <button onClick={cancelEdit} style={css(iconBtn + 'color:var(--muted);')}>ยกเลิก</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditCc(c.id, c.name)} title="แก้ไขชื่อบัญชี" style={css(iconBtn + 'color:var(--pri-d);margin-right:4px;')}>แก้ไข</button>
                          <button onClick={() => app.delCc(c.id)} style={css(iconBtn + 'color:var(--danger);')}>ลบ</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {ccs.length === 0 && (
                  <tr style={css('border-top:1px solid var(--line);')}>
                    <td colSpan={3} style={css('padding:18px;text-align:center;color:var(--muted);font-size:13px;')}>ไม่พบบัญชีที่ตรงกับเงื่อนไข</td>
                  </tr>
                )}
                {matched > PAGE_SIZE && (
                  <tr style={css('border-top:1px solid var(--line);background:#faf7f0;')}>
                    <td colSpan={3} style={css('padding:11px 18px;text-align:center;font-size:12.5px;color:var(--muted);')}>
                      แสดง {ccs.length} จาก {matched} รายการ{' '}
                      <button
                        onClick={() => setShowAll((v) => !v)}
                        style={css('border:1px solid var(--line);background:#fff;border-radius:7px;padding:4px 12px;margin-left:8px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--pri-d);')}
                      >
                        {showAll ? `ย่อกลับ (${PAGE_SIZE} รายการแรก)` : `แสดงทั้งหมด (${matched} รายการ)`}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
