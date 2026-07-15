import { useState } from 'react';
import { useApp } from '../store';
import { css } from '../ui';
import { money, money0, thaiDate, thaiDateFull } from '../lib/format';

const MN = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const UNA = 'ไม่ระบุแผนก';

type ReportTab = 'daily' | 'monthly' | 'yearly';
interface MonthGroup {
  no: number; dept: string; unassigned: boolean; showDivider: boolean;
  detail: boolean; summary: boolean; label: string;
  rows?: { cc: string; recvStr: string; payStr: string }[];
  recvStr?: string; payStr: string;
}

export function ReportsView() {
  const { db } = useApp();
  const dates = db.txns.map((t) => t.date).filter(Boolean).sort();
  const last = dates[dates.length - 1] || '2026-05-30';

  const [tab, setTab] = useState<ReportTab>('daily');
  const [reportDate, setReportDate] = useState(last);
  const [reportMonth, setReportMonth] = useState(last.slice(0, 7));
  const [reportYear, setReportYear] = useState(2569);
  const [monthlyDetail, setMonthlyDetail] = useState(false);

  const ccDept: Record<string, string> = {};
  db.costCenters.forEach((c) => { ccDept[c.name] = c.dept || UNA; });

  const doPrint = () => window.print();
  const tabBtn = (k: ReportTab, labelTh: string) => (
    <button key={k} onClick={() => setTab(k)} style={css(`border:none;background:${tab === k ? 'var(--pri-d)' : 'transparent'};color:${tab === k ? '#fff' : 'var(--muted)'};font-family:inherit;font-size:14px;font-weight:600;padding:7px 18px;border-radius:7px;cursor:pointer;`)}>{labelTh}</button>
  );
  const inputStyle = 'height:36px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 12px;font-family:inherit;font-size:14px;color:var(--ink);';

  return (
    <div style={css('padding:30px 38px;')}>
      <div className="no-print" style={css('display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px;')}>
        <div>
          <div style={css('font-size:13px;color:var(--muted);font-weight:600;letter-spacing:.4px;')}>รายงาน · REPORTS</div>
          <h1 style={css('margin:4px 0 0;font-size:26px;font-weight:700;')}>รายงานการโอนเงิน</h1>
        </div>
        <button onClick={doPrint} style={css('height:38px;background:var(--pri-d);color:#fff;border:none;border-radius:9px;padding:0 18px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;')}>🖨 พิมพ์รายงาน</button>
      </div>
      <div className="no-print" style={css('display:flex;gap:8px;margin-bottom:18px;align-items:center;flex-wrap:wrap;')}>
        <div style={css('display:flex;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:4px;')}>
          {tabBtn('daily', 'รายวัน')}{tabBtn('monthly', 'รายเดือน')}{tabBtn('yearly', 'รายปี')}
        </div>
        {tab === 'daily' && <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={css(inputStyle)} />}
        {tab === 'monthly' && (
          <>
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} style={css(inputStyle)} />
            <div style={css('display:flex;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:4px;')}>
              {[['สรุปรวมกลุ่ม', false], ['แจกแจงในกลุ่ม', true]].map(([label, v]) => (
                <button key={String(v)} onClick={() => setMonthlyDetail(v as boolean)} style={css(`border:none;background:${monthlyDetail === v ? 'var(--pri-d)' : 'transparent'};color:${monthlyDetail === v ? '#fff' : 'var(--muted)'};font-family:inherit;font-size:13.5px;font-weight:600;padding:7px 16px;border-radius:7px;cursor:pointer;`)}>{label as string}</button>
              ))}
            </div>
          </>
        )}
        {tab === 'yearly' && (
          <select value={reportYear} onChange={(e) => setReportYear(+e.target.value)} style={css(inputStyle)}>
            {[2568, 2569, 2570].map((y) => <option key={y} value={y}>พ.ศ. {y}</option>)}
          </select>
        )}
      </div>

      {tab === 'daily' && <DailyReport db={db} reportDate={reportDate} />}
      {tab === 'monthly' && <MonthlyReport db={db} reportMonth={reportMonth} det={monthlyDetail} ccDept={ccDept} />}
      {tab === 'yearly' && <YearlyReport db={db} reportYear={reportYear} ccDept={ccDept} />}
    </div>
  );
}

function DailyReport({ db, reportDate }: { db: ReturnType<typeof useApp>['db']; reportDate: string }) {
  const rows = db.txns.filter((t) => t.date === reportDate).sort((a, b) => (a.ord || 0) - (b.ord || 0));
  const recv = rows.reduce((s, t) => s + (+t.recv || 0), 0);
  const pay = rows.reduce((s, t) => s + (+t.pay || 0), 0);
  return (
    <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:30px 34px;max-width:1000px;')}>
      <div style={css('text-align:center;margin-bottom:6px;font-weight:700;font-size:19px;')}>รายงานการโอนเงินรายวัน</div>
      <div style={css('text-align:center;color:var(--muted);font-size:14px;margin-bottom:20px;')}>แพปลา KPS · {thaiDateFull(reportDate)}</div>
      <table style={css('width:100%;border-collapse:collapse;font-size:13px;')}>
        <thead><tr style={css('border-bottom:2px solid var(--ink);text-align:left;')}>
          <th style={css('padding:8px 8px;font-weight:600;')}>Voucher</th><th style={css('padding:8px;font-weight:600;white-space:nowrap;')}>วันที่</th><th style={css('padding:8px;font-weight:600;')}>ชื่อบัญชี</th><th style={css('padding:8px;font-weight:600;')}>รายละเอียด</th><th style={css('padding:8px;font-weight:600;')}>จ่ายให้</th><th style={css('padding:8px;font-weight:600;text-align:right;')}>รับ</th><th style={css('padding:8px;font-weight:600;text-align:right;')}>จ่าย</th>
        </tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} style={css('border-bottom:1px solid var(--line);vertical-align:top;')}>
              <td style={css("padding:7px 8px;font-family:'IBM Plex Mono',monospace;font-size:12px;white-space:nowrap;")}>{t.voucher || '—'}</td>
              <td style={css('padding:7px 8px;white-space:nowrap;color:var(--muted);')}>{thaiDate(t.date)}</td>
              <td style={css('padding:7px 8px;white-space:nowrap;')}>{t.cc}</td>
              <td style={css('padding:7px 8px;')}>{t.detail}</td>
              <td style={css('padding:7px 8px;color:var(--muted);')}>{t.payTo || '—'}</td>
              <td style={css("padding:7px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{money0(t.recv)}</td>
              <td style={css("padding:7px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{money0(t.pay)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={css('border-top:2px solid var(--ink);font-weight:700;')}><td colSpan={5} style={css('padding:10px 8px;')}>รวม</td><td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money(recv)}</td><td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{money(pay)}</td></tr></tfoot>
      </table>
      <div style={css('display:flex;justify-content:space-around;margin-top:60px;color:var(--muted);font-size:13px;text-align:center;')}>
        <div>__________________<br />ผู้จัดทำ</div><div>__________________<br />ผู้ตรวจสอบ</div><div>__________________<br />ผู้อนุมัติ</div>
      </div>
    </div>
  );
}

function MonthlyReport({ db, reportMonth, det, ccDept }: { db: ReturnType<typeof useApp>['db']; reportMonth: string; det: boolean; ccDept: Record<string, string> }) {
  const rows = db.txns.filter((t) => t.date.startsWith(reportMonth));
  const byCc: Record<string, { recv: number; pay: number }> = {};
  rows.forEach((t) => {
    const k = t.cc || '—';
    if (!byCc[k]) byCc[k] = { recv: 0, pay: 0 };
    byCc[k].recv += +t.recv || 0;
    byCc[k].pay += +t.pay || 0;
  });
  const byDept: Record<string, { cc: string; recv: number; pay: number }[]> = {};
  Object.keys(byCc).forEach((cc) => {
    const d = ccDept[cc] || UNA;
    if (!byDept[d]) byDept[d] = [];
    byDept[d].push({ cc, ...byCc[cc] });
  });
  const deptTot = (d: string) => byDept[d].reduce((s, r) => s + r.pay, 0);
  const named = Object.keys(byDept).filter((d) => d !== UNA);

  let groups: MonthGroup[] = [];
  if (det) {
    const ordered = named.slice().sort((a, b) => deptTot(b) - deptTot(a));
    if (byDept[UNA]) ordered.push(UNA);
    groups = ordered.map((d, i) => {
      const rs = byDept[d].slice().sort((a, b) => b.pay - a.pay);
      const gr = rs.reduce((s, r) => s + r.recv, 0);
      const gp = rs.reduce((s, r) => s + r.pay, 0);
      return { no: i + 1, dept: d, unassigned: d === UNA, showDivider: d === UNA, detail: true, summary: false, label: 'รวม ' + d, rows: rs.map((r) => ({ cc: r.cc, recvStr: money0(r.recv), payStr: money0(r.pay) })), recvStr: money(gr), payStr: money(gp) };
    });
  } else {
    let no = 0;
    named.map((d) => ({ d, gp: deptTot(d) })).filter((x) => x.gp > 0).sort((a, b) => b.gp - a.gp).forEach((x) => {
      no++;
      groups.push({ no, dept: x.d, unassigned: false, showDivider: false, detail: false, summary: true, label: x.d, payStr: money(x.gp) });
    });
    if (byDept[UNA]) {
      const rs = byDept[UNA].filter((r) => r.pay > 0).sort((a, b) => b.pay - a.pay);
      rs.forEach((r, idx) => {
        no++;
        groups.push({ no, dept: UNA, unassigned: true, showDivider: idx === 0, detail: false, summary: true, label: r.cc, payStr: money(r.pay) });
      });
    }
  }

  const mStart = reportMonth + '-01';
  const carry = db.opening + db.txns.filter((t) => t.date < mStart).reduce((s, t) => s + (+t.recv || 0) - (+t.pay || 0), 0);
  const monthIn = rows.reduce((s, t) => s + (+t.recv || 0), 0);
  const monthOut = rows.reduce((s, t) => s + (+t.pay || 0), 0);
  const [y, m] = reportMonth.split('-').map(Number);
  const dividerSpan = det ? 4 : 3;

  return (
    <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:30px 34px;max-width:900px;')}>
      <div style={css('text-align:center;margin-bottom:6px;font-weight:700;font-size:19px;')}>รายงานการโอนเงินรายเดือน (จัดกลุ่มตามแผนก)</div>
      <div style={css('text-align:center;color:var(--muted);font-size:14px;margin-bottom:18px;')}>แพปลา KPS · {`${MN[m - 1]} ${y + 543}`}</div>
      <div style={css('display:flex;justify-content:flex-end;margin-bottom:20px;')}>
        <div style={css('min-width:360px;border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:13.5px;')}>
          <div style={css('display:flex;justify-content:space-between;gap:24px;padding:9px 16px;border-bottom:1px solid var(--line);')}>
            <span>ยอดยกมา <span style={css('color:var(--muted);font-size:12px;')}>(ก่อนรายการโอนแรกของเดือน)</span></span>
            <b style={css("font-family:'IBM Plex Mono',monospace;")}>{money(carry)}</b>
          </div>
          <div style={css('display:flex;justify-content:space-between;gap:24px;padding:9px 16px;border-bottom:1px solid var(--line);')}>
            <span style={css('color:var(--pri-d);')}><u>บวก</u> นำเงินเข้าบัญชี</span>
            <b style={css("font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money(monthIn)}</b>
          </div>
          <div style={css('display:flex;justify-content:space-between;gap:24px;padding:9px 16px;border-bottom:1px solid var(--line);')}>
            <span style={css('color:var(--acc);')}><u>หัก</u> รายการโอนออก (เบิก)</span>
            <b style={css("font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>({money(monthOut)})</b>
          </div>
          <div style={css('display:flex;justify-content:space-between;gap:24px;padding:11px 16px;background:var(--pri-bg);font-weight:700;')}>
            <span>ยอดคงเหลือสุทธิ</span>
            <b style={css("font-family:'IBM Plex Mono',monospace;color:var(--pri-d);")}>{money(carry + monthIn - monthOut)}</b>
          </div>
        </div>
      </div>
      <table style={css('width:100%;border-collapse:collapse;font-size:13px;')}>
        <thead><tr style={css('border-bottom:2px solid var(--ink);text-align:left;')}><th style={css('padding:8px;font-weight:600;width:52px;text-align:center;')}>ลำดับ</th><th style={css('padding:8px;font-weight:600;')}>ชื่อบัญชี / แผนก</th>{det && <th style={css('padding:8px;font-weight:600;text-align:right;')}>รับ</th>}<th style={css('padding:8px;font-weight:600;text-align:right;')}>จ่าย</th></tr></thead>
        <tbody>
          {groups.map((g, gi) => (
            <ReactFragmentGroup key={gi} g={g} det={det} dividerSpan={dividerSpan} />
          ))}
        </tbody>
        <tfoot><tr style={css('border-top:2px solid var(--ink);font-weight:700;')}><td colSpan={2} style={css('padding:10px 8px;')}>รวมทั้งสิ้น</td>{det && <td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money(monthIn)}</td>}<td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{money(monthOut)}</td></tr></tfoot>
      </table>
    </div>
  );
}

function ReactFragmentGroup({ g, det, dividerSpan }: { g: MonthGroup; det: boolean; dividerSpan: number }) {
  return (
    <>
      {g.showDivider && (
        <tr><td colSpan={dividerSpan} style={css('padding:6px 8px;border-top:2px solid var(--line);color:var(--muted);font-size:12px;font-style:italic;')}>— ไม่ได้จัดเข้ากลุ่มแผนก (แต่ละบัญชีคือ 1 กลุ่ม) —</td></tr>
      )}
      {g.detail && (
        <>
          <tr style={css('background:var(--pri-bg);')}><td style={css("padding:8px;text-align:center;font-weight:700;color:var(--pri-d);font-family:'IBM Plex Mono',monospace;")}>{g.no}</td><td colSpan={3} style={css('padding:8px 8px;font-weight:700;color:var(--pri-d);')}>▍ {g.dept}</td></tr>
          {g.rows!.map((r, ri) => (
            <tr key={ri} style={css('border-bottom:1px solid var(--line);')}><td></td><td style={css('padding:6px 8px 6px 22px;')}>{r.cc}</td><td style={css("padding:6px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{r.recvStr}</td><td style={css("padding:6px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{r.payStr}</td></tr>
          ))}
          <tr style={css('border-bottom:1px solid var(--line);font-weight:700;color:var(--muted);')}><td></td><td style={css('padding:8px 8px;text-align:right;')}>{g.label}</td><td style={css("padding:8px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{g.recvStr}</td><td style={css("padding:8px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{g.payStr}</td></tr>
        </>
      )}
      {g.summary && (
        <tr style={css('border-bottom:1px solid var(--line);font-weight:700;color:var(--pri-d);')}><td style={css("padding:9px 8px;text-align:center;font-family:'IBM Plex Mono',monospace;")}>{g.no}</td><td style={css('padding:9px 8px;')}>{g.label}</td><td style={css("padding:9px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{g.payStr}</td></tr>
      )}
    </>
  );
}

function YearlyReport({ db, reportYear, ccDept }: { db: ReturnType<typeof useApp>['db']; reportYear: number; ccDept: Record<string, string> }) {
  const yG = reportYear - 543;
  const rows = db.txns.filter((t) => +t.date.slice(0, 4) === yG);
  const mat: Record<string, number[]> = {};
  rows.forEach((t) => {
    const cc = t.cc || '—';
    const mi = +t.date.slice(5, 7) - 1;
    if (!mat[cc]) mat[cc] = Array(12).fill(0);
    mat[cc][mi] += +t.pay || 0;
  });
  const byDept: Record<string, string[]> = {};
  Object.keys(mat).forEach((cc) => {
    const d = ccDept[cc] || UNA;
    if (!byDept[d]) byDept[d] = [];
    byDept[d].push(cc);
  });
  const groups = Object.keys(byDept).sort((a, b) => a.localeCompare(b, 'th')).map((d) => ({
    dept: d,
    rows: byDept[d].sort((a, b) => a.localeCompare(b, 'th')).map((cc) => {
      const arr = mat[cc];
      const tot = arr.reduce((s, v) => s + v, 0);
      return { cc, cells: arr.map((v) => ({ v: v ? money(v) : '–', color: v ? 'var(--ink)' : '#cfc7b6' })), totalStr: money(tot) };
    }),
  }));

  return (
    <div className="sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:24px;overflow-x:auto;')}>
      <div style={css('text-align:center;margin-bottom:6px;font-weight:700;font-size:19px;')}>รายงานการโอนเงินรายปี (Matrix)</div>
      <div style={css('text-align:center;color:var(--muted);font-size:14px;margin-bottom:18px;')}>แพปลา KPS · ปี พ.ศ. {reportYear} · ยอดจ่ายต่อเดือน (บาท)</div>
      <table style={css('border-collapse:collapse;font-size:12px;min-width:1100px;')}>
        <thead><tr style={css('background:var(--pri-bg);color:var(--pri-d);')}>
          <th style={css('padding:8px 10px;text-align:left;font-weight:600;position:sticky;left:0;background:var(--pri-bg);')}>ชื่อบัญชี</th>
          {MH.map((m) => <th key={m} style={css('padding:8px 6px;text-align:right;font-weight:600;')}>{m}</th>)}
          <th style={css('padding:8px 10px;text-align:right;font-weight:700;')}>รวม</th>
        </tr></thead>
        <tbody>
          {groups.map((g) => (
            <ReactFragmentYear key={g.dept} g={g} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReactFragmentYear({ g }: { g: { dept: string; rows: { cc: string; cells: { v: string; color: string }[]; totalStr: string }[] } }) {
  return (
    <>
      <tr><td colSpan={14} style={css('padding:7px 10px;font-weight:700;color:var(--pri-d);background:#faf7f0;')}>▍ {g.dept}</td></tr>
      {g.rows.map((r) => (
        <tr key={r.cc} style={css('border-bottom:1px solid var(--line);')}>
          <td style={css('padding:6px 10px;position:sticky;left:0;background:var(--surface);white-space:nowrap;')}>{r.cc}</td>
          {r.cells.map((c, ci) => <td key={ci} style={{ ...css("padding:6px 6px;text-align:right;font-family:'IBM Plex Mono',monospace;"), color: c.color }}>{c.v}</td>)}
          <td style={css("padding:6px 10px;text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:600;")}>{r.totalStr}</td>
        </tr>
      ))}
    </>
  );
}
