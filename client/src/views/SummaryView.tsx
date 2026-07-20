import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { css, HoverButton } from '../ui';
import { money } from '../lib/format';
import { balanceMap } from '../lib/compute';
import type { Db } from '../types';

const MN = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

interface Row { cc: string; total: number; count: number; dept: string; rank: number }
interface Agg { rows: unknown[]; arr: Row[]; max: number; grand: number }

/** Aggregate a month's txns by ชื่อบัญชี for one side (รับ or จ่าย), ranked desc. */
function aggregate(db: Db, month: string, field: 'recv' | 'pay', ccDept: Record<string, string>): Agg {
  const rows = db.txns.filter((t) => t.date.startsWith(month) && (+t[field] || 0) > 0);
  const byCc: Record<string, { total: number; count: number }> = {};
  rows.forEach((t) => {
    const k = t.cc || '—';
    if (!byCc[k]) byCc[k] = { total: 0, count: 0 };
    byCc[k].total += +t[field] || 0;
    byCc[k].count++;
  });
  const arr: Row[] = Object.keys(byCc)
    .map((cc) => ({ cc, total: byCc[cc].total, count: byCc[cc].count, dept: ccDept[cc] || 'ไม่ระบุแผนก', rank: 0 }))
    .sort((a, b) => b.total - a.total);
  arr.forEach((r, i) => { r.rank = i + 1; });
  return { rows, arr, max: arr.length ? arr[0].total : 1, grand: arr.reduce((s, r) => s + r.total, 0) };
}

function RankTable({ title, data, search, bar }: { title: string; data: Agg; search: string; bar: string }) {
  const sq = search.toLowerCase().trim();
  const shown = sq ? data.arr.filter((r) => r.cc.toLowerCase().includes(sq) || r.dept.toLowerCase().includes(sq)) : data.arr;
  return (
    <div className="sheet" style={css('flex:1;min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;')}>
      <div style={css('display:flex;justify-content:space-between;align-items:baseline;padding:12px 18px;border-bottom:1px solid var(--line);background:#faf7f0;')}>
        <span style={css(`font-size:14px;font-weight:700;color:${bar};`)}>{title}</span>
        <span style={css("font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:var(--ink);")}>฿{money(data.grand)}</span>
      </div>
      <div style={css('display:flex;justify-content:space-between;padding:9px 18px;border-bottom:1px solid var(--line);background:#faf7f0;font-size:12px;color:var(--muted);font-weight:600;')}>
        <span>อันดับ · ชื่อบัญชี</span><span>สะสม (มาก → น้อย)</span>
      </div>
      <div style={css('max-height:60vh;overflow-y:auto;')}>
        {shown.map((r) => (
          <div key={r.cc} style={css('display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--line);')}>
            <div style={css(`width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:12.5px;flex:none;` + (r.rank <= 3 ? `background:${bar};color:#fff;` : 'background:var(--pri-bg);color:var(--pri-d);'))}>{r.rank}</div>
            <div style={css('flex:1;min-width:0;')}>
              <div style={css('display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:5px;')}>
                <div style={css('font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;')}>{r.cc} <span style={css('color:var(--muted);font-weight:400;font-size:11.5px;')}>· {r.dept}</span></div>
                <div style={css("font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;white-space:nowrap;")}>฿{money(r.total)}</div>
              </div>
              <div style={css('display:flex;align-items:center;gap:9px;')}>
                <div style={css('flex:1;height:7px;background:#eee7d9;border-radius:5px;overflow:hidden;')}>
                  <div style={{ ...css(`height:100%;background:${bar};border-radius:5px;`), width: Math.max(2, (r.total / data.max) * 100) + '%' }} />
                </div>
                <div style={css('font-size:11px;color:var(--muted);white-space:nowrap;width:104px;text-align:right;')}>{r.count} รายการ · {data.grand ? ((r.total / data.grand) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {shown.length === 0 && (
        <div style={css('padding:40px;text-align:center;color:var(--muted);font-size:14px;')}>ไม่มีรายการในเดือนนี้</div>
      )}
    </div>
  );
}

export function SummaryView() {
  const { db } = useApp();
  const dates = db.txns.map((t) => t.date).filter(Boolean).sort();
  const lastMonth = (dates[dates.length - 1] || '2026-05-30').slice(0, 7);
  const [summaryMonth, setSummaryMonth] = useState(lastMonth);
  const [summarySearch, setSummarySearch] = useState('');

  const ccDept: Record<string, string> = {};
  db.costCenters.forEach((c) => { ccDept[c.name] = c.dept || ''; });

  const recv = aggregate(db, summaryMonth, 'recv', ccDept);
  const pay = aggregate(db, summaryMonth, 'pay', ccDept);
  const net = recv.grand - pay.grand;

  const [sy, sm] = summaryMonth.split('-').map(Number);

  /** Step the selected month by ±1, rolling the year over at the boundaries. */
  const shiftMonth = (delta: number) => {
    const d = new Date(sy, sm - 1 + delta, 1);
    setSummaryMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Account balance as of the END of the selected month (running balance of the
  // last txn on or before that month, else the opening balance).
  const bmap = useMemo(() => balanceMap(db), [db]);
  const balance = useMemo(() => {
    const upTo = [...db.txns]
      .filter((t) => t.date && t.date.slice(0, 7) <= summaryMonth)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ord || 0) - (b.ord || 0)));
    return upTo.length ? bmap[upTo[upTo.length - 1].id] : db.opening;
  }, [db.txns, db.opening, bmap, summaryMonth]);

  const stepBtn = 'width:38px;height:38px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);background:var(--surface);border-radius:9px;font-family:inherit;font-size:16px;color:var(--pri-d);cursor:pointer;';

  return (
    <div style={css('padding:30px 38px;')}>
      <div style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px;')}>
        <div>
          <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>สรุป · CUMULATIVE BY ACCOUNT</div>
          <h1 style={css('margin:4px 0 0;font-size:26px;font-weight:700;')}>ยอดรับ–โอนสะสมต่อเดือน</h1>
        </div>
        <div style={css('display:flex;gap:10px;')}>
          <input className="mb-in" value={summarySearch} onChange={(e) => setSummarySearch(e.target.value)} placeholder="ค้นหาชื่อบัญชี / แผนก…" style={css('width:260px;height:38px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 14px;font-family:inherit;font-size:14px;color:var(--ink);')} />
          <div style={css('display:flex;gap:6px;align-items:center;')}>
            <HoverButton onClick={() => shiftMonth(-1)} title="เดือนก่อนหน้า" aria-label="เดือนก่อนหน้า" base={stepBtn} hover="background:var(--pri-bg);">‹</HoverButton>
            <input type="month" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)} style={css('height:38px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 12px;font-family:inherit;font-size:14px;color:var(--ink);')} />
            <HoverButton onClick={() => shiftMonth(1)} title="เดือนถัดไป" aria-label="เดือนถัดไป" base={stepBtn} hover="background:var(--pri-bg);">›</HoverButton>
          </div>
        </div>
      </div>

      <div style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;')}>
        <div style={css('background:var(--pri);color:#eef3ec;border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;opacity:.85;margin-bottom:8px;')}>ยอดรับสะสมรวม · {`${MN[sm - 1]} ${sy + 543}`}</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>฿{money(recv.grand)}</div>
        </div>
        <div style={css('background:var(--acc);color:#fff;border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;opacity:.9;margin-bottom:8px;')}>ยอดโอนออกสะสมรวม</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>฿{money(pay.grand)}</div>
        </div>
        <div style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;color:var(--muted);margin-bottom:8px;')}>คงเหลือสุทธิ (รับ − โอน)</div>
          <div style={css(`font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;color:${net < 0 ? 'var(--danger)' : 'var(--pri-d)'};`)}>฿{money(net)}</div>
        </div>
        <div style={css('background:var(--pri-d);color:#eef3ec;border-radius:14px;padding:16px 18px;')}>
          <div style={css('font-size:12.5px;opacity:.75;margin-bottom:8px;')}>ยอดเงินคงเหลือในบัญชี</div>
          <div style={css("font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;")}>฿{money(balance)}</div>
          <div style={css('font-size:11.5px;opacity:.6;margin-top:6px;')}>ณ สิ้นเดือน {`${MN[sm - 1]} ${sy + 543}`}</div>
        </div>
      </div>

      <div style={css('display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;')}>
        <RankTable title="ยอดรับสะสม" data={recv} search={summarySearch} bar="var(--pri)" />
        <RankTable title="ยอดโอนสะสม" data={pay} search={summarySearch} bar="var(--acc)" />
      </div>
    </div>
  );
}
