import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { css } from '../ui';
import { money, money0, thaiDate } from '../lib/format';
import { balanceMap } from '../lib/compute';

const MN = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const UNA = 'ไม่ระบุแผนก';
const YEARS = [2568, 2569, 2570];
const pad = (n: number) => String(n).padStart(2, '0');
// daily report print target: A4 portrait, even margins, one page
const A4_W = 210, A4_H = 297;
// narrower side margins: the report is width-bound, so every mm there buys font size
const A4_MH = 8, A4_MV = 12;
const SHEET_W = 950; // design width when printing: fills the A4 width at ~0.74 scale

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
  // daily report covers a date range; both ends default to the latest day, so
  // it behaves as a single-day report until a wider range is picked
  const [reportFrom, setReportFrom] = useState(last);
  const [reportTo, setReportTo] = useState(last);
  const [reportMonth, setReportMonth] = useState(last.slice(0, 7));
  const [reportYear, setReportYear] = useState(2569);
  const [monthlyDetail, setMonthlyDetail] = useState(false);

  const ccDept: Record<string, string> = {};
  db.costCenters.forEach((c) => { ccDept[c.name] = c.dept || UNA; });

  /* Step the period shown by the active tab: ±1 day / month / year. */
  const shift = (delta: number) => {
    if (tab === 'daily') {
      // move the whole range, keeping its span
      const step = (iso: string) => {
        const d = new Date(iso + 'T00:00:00');
        d.setDate(d.getDate() + delta);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      };
      setReportFrom(step(reportFrom));
      setReportTo(step(reportTo));
    } else if (tab === 'monthly') {
      const [y, m] = reportMonth.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      setReportMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    } else {
      // the year picker only offers YEARS, so don't step past either end
      setReportYear((y) => Math.min(YEARS[YEARS.length - 1], Math.max(YEARS[0], y + delta)));
    }
  };
  const atEnd = (delta: number) =>
    tab === 'yearly' && (delta < 0 ? reportYear <= YEARS[0] : reportYear >= YEARS[YEARS.length - 1]);
  const stepLabel = tab === 'daily' ? 'วัน' : tab === 'monthly' ? 'เดือน' : 'ปี';
  const stepBtn = (delta: number) => (
    <button
      onClick={() => shift(delta)}
      disabled={atEnd(delta)}
      title={`${delta < 0 ? `${stepLabel}ก่อนหน้า` : `${stepLabel}ถัดไป`}`}
      aria-label={`${delta < 0 ? `${stepLabel}ก่อนหน้า` : `${stepLabel}ถัดไป`}`}
      style={css('width:36px;height:36px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);background:var(--surface);border-radius:9px;font-family:inherit;font-size:16px;color:var(--pri-d);' + (atEnd(delta) ? 'opacity:.35;cursor:default;' : 'cursor:pointer;'))}
    >{delta < 0 ? '‹' : '›'}</button>
  );

  const doPrint = () => window.print();
  const tabBtn = (k: ReportTab, labelTh: string) => (
    <button key={k} onClick={() => setTab(k)} style={css(`border:none;background:${tab === k ? 'var(--pri-d)' : 'transparent'};color:${tab === k ? '#fff' : 'var(--muted)'};font-family:inherit;font-size:14px;font-weight:600;padding:7px 18px;border-radius:7px;cursor:pointer;`)}>{labelTh}</button>
  );
  const inputStyle = 'height:36px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:0 12px;font-family:inherit;font-size:14px;color:var(--ink);';

  return (
    <div className="report-page" style={css('padding:30px 38px;')}>
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
        {tab === 'daily' && (
          <div style={css('display:flex;gap:6px;align-items:center;flex-wrap:wrap;')}>
            {stepBtn(-1)}
            <label style={css('display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--muted);')}>ตั้งแต่
              <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={css(inputStyle)} /></label>
            <label style={css('display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--muted);')}>จนถึง
              <input type="date" value={reportTo} min={reportFrom} onChange={(e) => setReportTo(e.target.value)} style={css(inputStyle)} /></label>
            {stepBtn(1)}
          </div>
        )}
        {tab === 'monthly' && (
          <>
            <div style={css('display:flex;gap:6px;align-items:center;')}>
              {stepBtn(-1)}
              <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} style={css(inputStyle)} />
              {stepBtn(1)}
            </div>
            <div style={css('display:flex;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:4px;')}>
              {[['สรุปรวมกลุ่ม', false], ['แจกแจงในกลุ่ม', true]].map(([label, v]) => (
                <button key={String(v)} onClick={() => setMonthlyDetail(v as boolean)} style={css(`border:none;background:${monthlyDetail === v ? 'var(--pri-d)' : 'transparent'};color:${monthlyDetail === v ? '#fff' : 'var(--muted)'};font-family:inherit;font-size:13.5px;font-weight:600;padding:7px 16px;border-radius:7px;cursor:pointer;`)}>{label as string}</button>
              ))}
            </div>
          </>
        )}
        {tab === 'yearly' && (
          <div style={css('display:flex;gap:6px;align-items:center;')}>
            {stepBtn(-1)}
            <select value={reportYear} onChange={(e) => setReportYear(+e.target.value)} style={css(inputStyle)}>
              {YEARS.map((y) => <option key={y} value={y}>พ.ศ. {y}</option>)}
            </select>
            {stepBtn(1)}
          </div>
        )}
      </div>

      {tab === 'daily' && <DailyReport db={db} from={reportFrom} to={reportTo} />}
      {tab === 'monthly' && <MonthlyReport db={db} reportMonth={reportMonth} det={monthlyDetail} ccDept={ccDept} />}
      {tab === 'yearly' && <YearlyReport db={db} reportYear={reportYear} ccDept={ccDept} />}
    </div>
  );
}

function DailyReport({ db, from, to }: { db: ReturnType<typeof useApp>['db']; from: string; to: string }) {
  // tolerate the ends being picked out of order
  const lo = from <= to ? from : to;
  const hi = from <= to ? to : from;
  const rows = db.txns
    .filter((t) => t.date >= lo && t.date <= hi)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ord || 0) - (b.ord || 0)));
  const recv = rows.reduce((s, t) => s + (+t.recv || 0), 0);
  const pay = rows.reduce((s, t) => s + (+t.pay || 0), 0);

  /* Heading runs by month: ประจำเดือน <ไทย> <พ.ศ.> (M/YYYY), widened to a span
     when the range crosses a month boundary. */
  const [dy, dm] = lo.split('-').map(Number);
  const [ty, tm] = hi.split('-').map(Number);
  const sameMonth = dy === ty && dm === tm;
  const monthLabel = sameMonth
    ? `ประจำเดือน ${MN[dm - 1]} ${dy + 543} (${dm}/${dy})`
    : `ประจำเดือน ${MN[dm - 1]} ${dy + 543} – ${MN[tm - 1]} ${ty + 543} (${dm}/${dy}–${tm}/${ty})`;
  const slug = sameMonth
    ? `${MON_EN[dm - 1]}-${String(dy).slice(-2)}`
    : `${MON_EN[dm - 1]}–${MON_EN[tm - 1]}-${String(ty).slice(-2)}`;
  // spell out the covered days when the range is more than one
  const rangeNote = lo === hi ? thaiDate(lo) : `${thaiDate(lo)} – ${thaiDate(hi)}`;

  /* Print on ONE A4 portrait page: measure the sheet at the print design width,
     then scale it into the page box. Same approach as the ใบสำคัญจ่าย. */
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 1, w: SHEET_W, h: 0 });
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const pxPerMm = 96 / 25.4;
    const measure = () => {
      const prev = { w: el.style.width, mw: el.style.maxWidth, p: el.style.padding };
      /* Every row prints on ONE line, so the sheet's width is whatever the
         longest row needs — measure that instead of assuming a design width,
         then scale the whole thing down to the page. Narrow days still get a
         sensible minimum so a 2-row report isn't blown up huge. */
      el.style.maxWidth = 'none';
      el.style.width = 'max-content';
      el.style.padding = '0';        // the @page margin supplies the paper margin
      const w = Math.max(SHEET_W, el.offsetWidth);
      const h = el.offsetHeight;
      el.style.width = prev.w;
      el.style.maxWidth = prev.mw;
      el.style.padding = prev.p;
      const s = Math.round(Math.min(
        (A4_W - 2 * A4_MH) * pxPerMm / w,
        (A4_H - 2 * A4_MV) * pxPerMm / h,
      ) * 0.98 * 1000) / 1000;
      setFit({ s, w, h });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
  }, [lo, hi, rows.length]);

  const noBreak = 'break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; page-break-after: avoid !important;';
  const printCss = `@media print {
    @page { size: A4 portrait; margin: ${A4_MV}mm ${A4_MH}mm; }
    html, body { height: auto !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
    #root, #root > * { min-height: 0 !important; height: auto !important; display: block !important; }
    main { padding: 0 !important; min-height: 0 !important; }
    /* out-specify ".app-main > div { padding: 16px 14px }" from the 760px
       breakpoint — an A4 portrait page box is ~703px wide, so it fires here */
    .app-main > .report-page, .report-page { padding: 0 !important; overflow: hidden !important; ${noBreak} }
    .report-fit { width: min(${Math.ceil(fit.w * fit.s) + 2}px, 100vw) !important; height: min(${Math.ceil(fit.h * fit.s) + 2}px, 100vh) !important; margin: 0 auto !important; overflow: hidden !important; ${noBreak} }
    .report-sheet { transform: scale(${fit.s}); transform-origin: top left; width: ${fit.w}px !important; max-width: ${fit.w}px !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; background: #fff !important; overflow: visible !important; ${noBreak} }
  }`;

  const bmap = useMemo(() => balanceMap(db), [db]);

  /* Bank the transfer went out through. Older entries may not carry it, so fall
     back to the payee record — same resolution the ใบสำคัญจ่าย uses. */
  const bankOf = (t: (typeof rows)[number]) => {
    if (t.bank) return t.bank;
    const p = db.payees.find((p) => p.status !== 'inactive' && (p.payTo === t.payTo || p.shop === t.payTo));
    return p?.bank || '—';
  };
  const closing = rows.length
    ? bmap[rows[rows.length - 1].id]
    : (() => {
        const prior = db.txns.filter((t) => t.date && t.date < lo)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ord || 0) - (b.ord || 0)));
        return prior.length ? bmap[prior[prior.length - 1].id] : db.opening;
      })();
  return (
    <div className="report-fit">
    <style>{printCss}</style>
    {/* rows never wrap, so on screen the sheet scrolls sideways if it has to;
        in print it is scaled to the page instead */}
    <div ref={sheetRef} className="sheet report-sheet" style={css('background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:30px 34px;max-width:1000px;overflow-x:auto;')}>
      {/* corner slug: short month-year + a dotted page number to fill in by hand */}
      <div style={css('text-align:right;font-size:13px;font-weight:600;letter-spacing:.3px;margin-bottom:2px;')}>
        {slug} / Page <span style={css('color:var(--muted);letter-spacing:1.5px;')}>............</span>
      </div>
      <div style={css('text-align:center;margin-bottom:6px;font-weight:700;font-size:19px;')}>รายการโอน Bualuang Mbanking</div>
      <div style={css('text-align:center;font-size:15px;font-weight:600;margin-bottom:2px;')}>{monthLabel}</div>
      <div style={css('text-align:center;color:var(--muted);font-size:13px;margin-bottom:18px;')}>{rangeNote}</div>
      <table style={css('width:100%;border-collapse:collapse;font-size:13px;')}>
        <thead><tr style={css('border-bottom:2px solid var(--ink);text-align:left;')}>
          <th style={css('padding:8px 8px;font-weight:600;')}>Voucher</th><th style={css('padding:8px;font-weight:600;white-space:nowrap;')}>วันที่</th><th style={css('padding:8px;font-weight:600;')}>ชื่อบัญชี</th><th style={css('padding:8px;font-weight:600;')}>รายละเอียด</th><th style={css('padding:8px;font-weight:600;')}>จ่ายให้</th><th style={css('padding:8px;font-weight:600;white-space:nowrap;')}>BANK</th><th style={css('padding:8px;font-weight:600;text-align:right;')}>รับ</th><th style={css('padding:8px;font-weight:600;text-align:right;')}>จ่าย</th><th style={css('padding:8px;font-weight:600;text-align:right;white-space:nowrap;')}>คงเหลือ</th>
        </tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} style={css('border-bottom:1px solid var(--line);vertical-align:top;')}>
              <td style={css("padding:7px 8px;font-family:'IBM Plex Mono',monospace;font-size:12px;white-space:nowrap;")}>{t.voucher || '—'}</td>
              <td style={css('padding:7px 8px;white-space:nowrap;color:var(--muted);')}>{thaiDate(t.date)}</td>
              <td style={css('padding:7px 8px;white-space:nowrap;')}>{t.cc}</td>
              <td style={css('padding:7px 8px;white-space:nowrap;')}>{t.detail}</td>
              <td style={css('padding:7px 8px;color:var(--muted);white-space:nowrap;')}>{t.payTo || '—'}</td>
              <td style={css('padding:7px 8px;white-space:nowrap;font-weight:600;font-size:12.5px;')}>{bankOf(t)}</td>
              <td style={css("padding:7px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{money0(t.recv)}</td>
              <td style={css("padding:7px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;")}>{money0(t.pay)}</td>
              <td style={css("padding:7px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;white-space:nowrap;" + (bmap[t.id] < 0 ? 'color:var(--danger);' : ''))}>{money(bmap[t.id])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={css('border-top:2px solid var(--ink);font-weight:700;')}><td colSpan={6} style={css('padding:10px 8px;')}>รวม <span style={css('font-weight:400;font-size:12px;color:var(--muted);')}>· คงเหลือยกไป</span></td><td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money(recv)}</td><td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{money(pay)}</td><td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;white-space:nowrap;" + (closing < 0 ? 'color:var(--danger);' : 'color:var(--pri-d);'))}>{money(closing)}</td></tr></tfoot>
      </table>
      <div style={css('display:flex;justify-content:space-around;margin-top:60px;color:var(--muted);font-size:13px;text-align:center;')}>
        <div>__________________<br />ผู้จัดทำ</div><div>__________________<br />ผู้ตรวจสอบ</div><div>__________________<br />ผู้อนุมัติ</div>
      </div>
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
      <div style={css('text-align:center;margin-bottom:6px;font-weight:700;font-size:19px;')}>รายการโอน Bualuang Mbanking</div>
      <div style={css('text-align:center;color:var(--muted);font-size:14px;margin-bottom:18px;')}>ประจำเดือน {MN[m - 1]} ปี {y + 543}</div>
      <table style={css('width:100%;border-collapse:collapse;font-size:13px;')}>
        <thead><tr style={css('border-bottom:2px solid var(--ink);text-align:left;')}><th style={css('padding:8px;font-weight:600;width:52px;text-align:center;')}>ลำดับ</th><th style={css('padding:8px;font-weight:600;')}>ชื่อบัญชี / แผนก</th>{det && <th style={css('padding:8px;font-weight:600;text-align:right;')}>รับ</th>}<th style={css('padding:8px;font-weight:600;text-align:right;')}>จ่าย</th></tr></thead>
        <tbody>
          {groups.map((g, gi) => (
            <ReactFragmentGroup key={gi} g={g} det={det} dividerSpan={dividerSpan} />
          ))}
        </tbody>
        <tfoot><tr style={css('border-top:2px solid var(--ink);font-weight:700;')}><td colSpan={2} style={css('padding:10px 8px;')}>รวมทั้งสิ้น</td>{det && <td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--pri);")}>{money(monthIn)}</td>}<td style={css("padding:10px 8px;text-align:right;font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{money(monthOut)}</td></tr></tfoot>
      </table>
      <div style={css('display:flex;justify-content:flex-end;margin-top:24px;')}>
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
