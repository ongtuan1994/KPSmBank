import { useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { css } from '../ui';
import { money, thaiDate, bahtText } from '../lib/format';

export function VoucherView() {
  const app = useApp();
  const { db, voucherId } = app;
  const t = db.txns.find((x) => x.id === voucherId) || null;

  /* Measure the rendered sheet and compute a print scale so the voucher always
     fits inside ONE A5-landscape page (210×148mm, 7mm margins). We scale via
     transform inside a sized wrapper (reliable pagination) and set A5 landscape
     via an injected @page, so it works even where named pages don't. */
  /* Design width used for printing. Chosen so the sheet's aspect ratio matches
     the A5-landscape content box — otherwise one axis binds the scale and the
     other ends up with visibly wider margins. */
  const SHEET_W = 890;
  const FILLER_H = 18; // blank placeholder rows collapse to this when printing
  const PAGE_W = 210; // A5 landscape — the only paper this voucher prints on
  const PAGE_H = 148;
  /* Page margins (mm). These must clear the printer's own unprintable area —
     inkjets (e.g. the Epson L3250 this prints on) reserve ~3mm on the sides and
     more at the bottom edge. Hugging the paper edge is what pushed the last
     millimetres of the frame onto a 2nd sheet and ate its bottom border. */
  const M = 6;    // same gap on all four sides, paper edge → frame
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 1, h: 0 });
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const pxPerMm = 96 / 25.4;
    const measure = () => {
      const prevW = el.style.width;
      el.style.width = SHEET_W + 'px';         // measure at the print width
      // Measure with the blank placeholder rows collapsed (as they print).
      const fillers = Array.from(el.querySelectorAll('tbody tr')).slice(1) as HTMLElement[];
      const saved = fillers.map((r) => r.style.height);
      fillers.forEach((r) => { r.style.height = FILLER_H + 'px'; });
      /* ...and with the signature row 4-across. Below the 760px breakpoint the
         screen stacks it 2x2, which measures 127px taller than it prints —
         that overestimate shrank the print and left lopsided margins. */
      const signs = el.querySelector('div[style*="repeat(4"]') as HTMLElement | null;
      const savedCols = signs?.style.gridTemplateColumns || '';
      // the breakpoint's rule is !important, so a plain inline style loses to it
      signs?.style.setProperty('grid-template-columns', 'repeat(4, 1fr)', 'important');
      const h = el.offsetHeight;
      signs?.style.setProperty('grid-template-columns', savedCols);
      fillers.forEach((r, i) => { r.style.height = saved[i]; });
      el.style.width = prevW;
      // scale to fit the A5-landscape page box, with 2% safety headroom
      const s = Math.round(Math.min(
        (PAGE_W - 2 * M) * pxPerMm / SHEET_W,
        (PAGE_H - 2 * M) * pxPerMm / h,
      ) * 0.98 * 1000) / 1000;
      setFit({ s, h });
    };
    measure();
    // Thai webfonts change the measured height — re-fit once they land.
    document.fonts?.ready.then(measure).catch(() => {});
  }, [voucherId, t?.pay, t?.recv]);
  // Never let anything spill onto a 2nd page: clip the shell, and forbid breaks.
  const noBreak = 'break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; page-break-after: avoid !important;';
  // +2px headroom: the clip box is rounded down, which otherwise shaves the
  // sheet's own bottom border off (the frame prints with no bottom edge).
  /* The clip box is capped at 100vw/100vh, which in print resolve to the REAL
     page content box. If the printer driver reserves more margin than the CSS
     asked for, the box shrinks with it instead of spilling onto a 2nd sheet. */
  const fitBox = `width: min(${Math.ceil(SHEET_W * fit.s) + 2}px, 100vw) !important;`
    + ` height: min(${Math.ceil(fit.h * fit.s) + 2}px, 100vh) !important;`;
  const printCss = `@media print {
    /* A5 landscape — the only paper this voucher prints on. Note: mixing an
       explicit size with the keyword ("210mm 148mm landscape") is invalid CSS
       and makes the whole declaration drop back to the printer default. */
    @page { size: A5 landscape; margin: ${M}mm; }
    /* collapse the app shell (min-height:100vh + main padding) so ONLY the
       voucher prints — otherwise the 100vh shell spills a blank 2nd page. */
    /* the default body margin offsets the sheet ~16px down the page, which
       pushes its bottom edge (and border) past the page box onto a 2nd sheet */
    html, body { height: auto !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
    #root, #root > * { min-height: 0 !important; height: auto !important; display: block !important; }
    main { padding: 0 !important; min-height: 0 !important; }
    /* NOTE: must out-specify ".app-main > div { padding: 16px 14px }" from the
       760px mobile breakpoint — that rule fires while PRINTING too, because the
       printer's margins shrink the print viewport below 760px. Its 16px of
       padding is what pushed the frame's bottom edge onto a 2nd sheet. */
    /* fill the page box and centre the sheet in it, so whatever slack is left
       over after scaling is split evenly — equal gap on all four sides */
    .app-main > .voucher-page, .voucher-page { padding: 0 !important; overflow: hidden !important; max-width: 100% !important; height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; ${noBreak} }
    .voucher-fit { ${fitBox} flex: none !important; margin: 0 !important; overflow: hidden !important; ${noBreak} }
    .voucher-sheet { transform: scale(${fit.s}); transform-origin: top left; width: ${SHEET_W}px !important; max-width: ${SHEET_W}px !important; margin: 0 !important; border: 1.2px solid var(--pri-d) !important; box-shadow: none !important; ${noBreak} }
    .voucher-sheet tbody tr:nth-child(n + 2) { height: ${FILLER_H}px !important; }
    /* the same 760px breakpoint stacks the 4 signature boxes into 2x2 while
       printing — the sheet is laid out at a fixed ${SHEET_W}px, so keep it 4-across */
    .voucher-page .voucher-sheet div[style*="repeat(4"] { grid-template-columns: repeat(4, 1fr) !important; }
  }`;

  let bank = t?.bank || '';
  let acct = t?.acct || '';
  let holder = '';
  if (t) {
    const p = db.payees.find((p) => p.status !== 'inactive' && (p.payTo === t.payTo || p.shop === t.payTo));
    if (p) { bank = bank || p.bank; acct = acct || p.acct; holder = p.payTo || ''; }
  }
  const amt = t ? (+t.pay || 0) || (+t.recv || 0) : 0;
  const vc = {
    voucher: t?.voucher || '—',
    date: thaiDate(t?.date || ''),
    payTo: t?.payTo || '—',
    holder: holder || t?.payTo || '',
    bank: bank || '—',
    acct: acct || '—',
    cc: t?.cc || '—',
    detail: t?.detail || '—',
    amount: money(amt),
    words: bahtText(amt),
  };

  return (
    <div className="voucher-page" style={css('padding:30px 38px;')}>
      <style>{printCss}</style>
      <div className="no-print" style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;max-width:820px;')}>
        <button onClick={() => app.backFromVoucher()} style={css('border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:9px 16px;font-family:inherit;font-size:14px;cursor:pointer;color:var(--ink);')}>‹ กลับ</button>
        <button onClick={() => window.print()} style={css('background:var(--pri-d);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;')}>🖨 พิมพ์ใบสำคัญจ่าย</button>
      </div>
      <div className="voucher-fit">
      <div ref={sheetRef} className="sheet voucher-sheet" style={css('background:#fff;border:1.5px solid var(--pri-d);border-radius:10px;max-width:820px;margin:0 auto;font-size:13.5px;color:#2c2822;overflow:hidden;')}>
        {/* logo band */}
        <div style={css('display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:16px 26px 10px;')}>
          <div></div>
          <div style={css('font-weight:700;font-size:30px;letter-spacing:2px;color:var(--pri-d);')}>RGT</div>
          <div style={css('text-align:right;')}>
            <span style={css('display:inline-block;border:1.5px solid var(--acc);border-radius:8px;padding:5px 14px;font-weight:700;font-size:20px;line-height:1.15;color:var(--acc);')}>M.Banking</span>
          </div>
        </div>
        {/* title */}
        <div style={css('text-align:center;padding:2px 26px 14px;border-bottom:1.5px solid var(--pri-d);')}>
          <span style={css('font-weight:700;font-size:20px;')}>ใบสำคัญจ่าย</span>
          <span style={css('font-weight:500;font-size:16px;color:var(--muted);')}> / PAYMENT VOUCHER</span>
        </div>
        {/* no / date */}
        <div style={css('display:flex;justify-content:flex-end;border-bottom:1px solid #e7e1d5;')}>
          <div style={css('display:flex;align-items:baseline;gap:8px;padding:9px 16px;border-left:1px solid #e7e1d5;')}>
            <span style={css('color:var(--pri-d);')}>เลขที่ <span style={css('color:var(--muted);font-size:11px;')}>No.</span></span>
            <b style={css("font-family:'IBM Plex Mono',monospace;color:var(--acc);")}>{vc.voucher}</b>
          </div>
          <div style={css('display:flex;align-items:baseline;gap:8px;padding:9px 24px 9px 16px;border-left:1px solid #e7e1d5;')}>
            <span style={css('color:var(--pri-d);')}>วันที่ <span style={css('color:var(--muted);font-size:11px;')}>Date</span></span>
            <b>{vc.date}</b>
          </div>
        </div>
        {/* paid to */}
        <div style={css('display:flex;align-items:baseline;gap:12px;padding:14px 26px 12px;border-bottom:1px solid #e7e1d5;')}>
          <div style={css('line-height:1.05;white-space:nowrap;color:var(--pri-d);')}>จ่ายให้<div style={css('color:var(--muted);font-size:11px;')}>Paid To</div></div>
          <div style={css('flex:1;font-weight:700;font-size:15px;')}>{vc.payTo}</div>
        </div>
        {/* amount + bank + holder + acct */}
        <div style={css('display:flex;align-items:center;border-bottom:1.5px solid var(--pri-d);flex-wrap:wrap;')}>
          <div style={css('display:flex;align-items:baseline;gap:10px;padding:12px 20px;flex:1;min-width:220px;')}>
            <div style={css('line-height:1.05;white-space:nowrap;color:var(--pri-d);')}>จำนวนเงิน<div style={css('color:var(--muted);font-size:11px;')}>Amount</div></div>
            <div style={css("flex:1;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:15px;")}>{vc.amount}</div>
          </div>
          <div style={css('display:flex;align-items:baseline;gap:10px;padding:12px 20px;flex:2;min-width:300px;border-left:1px solid #e7e1d5;')}>
            <div style={css('line-height:1.05;white-space:nowrap;color:var(--pri-d);')}>ธนาคาร<div style={css('color:var(--muted);font-size:11px;')}>Bank</div></div>
            <b style={css('white-space:nowrap;')}>{vc.bank}</b>
            <span style={css('color:var(--muted);')}>/</span>
            <span style={css('flex:1;')}>{vc.holder}</span>
            <span style={css('color:var(--muted);')}>/</span>
            <span style={css("font-family:'IBM Plex Mono',monospace;font-size:12.5px;white-space:nowrap;")}>{vc.acct}</span>
          </div>
        </div>
        {/* item table */}
        <table style={css('width:100%;border-collapse:collapse;')}>
          <thead><tr style={css('background:var(--pri-bg);color:var(--pri-d);')}>
            <th style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:center;font-weight:600;width:140px;')}>รหัสบัญชี<div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>A/C No.</div></th>
            <th style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:center;font-weight:600;width:150px;')}>ชื่อบัญชี<div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>A/C</div></th>
            <th style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:center;font-weight:600;')}>รายการ<div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>Particulars</div></th>
            <th style={css('border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:center;font-weight:600;width:150px;')}>จำนวนเงิน<span style={css('color:var(--muted);font-size:11px;font-weight:400;')}>(บาท)</span><div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>Amount</div></th>
          </tr></thead>
          <tbody>
            <tr>
              <td style={css("border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;padding:12px 10px;text-align:center;vertical-align:top;font-family:'IBM Plex Mono',monospace;font-size:12.5px;")}></td>
              <td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;padding:12px 10px;text-align:center;vertical-align:top;')}>{vc.cc}</td>
              <td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;padding:12px 10px;text-align:center;vertical-align:top;')}>{vc.detail}</td>
              <td style={css("border-bottom:1px solid #eee7d9;padding:12px 10px;text-align:center;vertical-align:top;font-family:'IBM Plex Mono',monospace;font-size:14px;")}>{vc.amount}</td>
            </tr>
            <tr style={css('height:52px;')}>
              <td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;')}></td><td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;')}></td><td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;')}></td><td style={css('border-bottom:1px solid #eee7d9;')}></td>
            </tr>
            <tr style={css('height:52px;')}>
              <td style={css('border-right:1px solid #d8d0c0;')}></td><td style={css('border-right:1px solid #d8d0c0;')}></td><td style={css('border-right:1px solid #d8d0c0;')}></td><td></td>
            </tr>
          </tbody>
          <tfoot><tr style={css('border-top:1.5px solid var(--pri-d);font-weight:700;')}>
            <td colSpan={3} style={css('border-right:1px solid #d8d0c0;padding:11px 10px;text-align:right;')}>รวม <span style={css('color:var(--muted);font-weight:400;font-size:12px;')}>/ Total Amount</span></td>
            <td style={css("padding:11px 10px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:15px;")}>{vc.amount}</td>
          </tr></tfoot>
        </table>
        {/* amount in words */}
        <div style={css('display:flex;align-items:baseline;gap:12px;padding:13px 26px;border-bottom:1.5px solid var(--pri-d);')}>
          <div style={css('line-height:1.05;white-space:nowrap;color:var(--pri-d);')}>จำนวนเงินเป็นตัวอักษร<div style={css('color:var(--muted);font-size:11px;')}>Amount in words</div></div>
          <div style={css('flex:1;text-align:center;font-weight:700;')}>( {vc.words} )</div>
        </div>
        {/* signatures */}
        <div style={css('display:grid;grid-template-columns:repeat(4,1fr);text-align:center;font-size:12px;')}>
          <div style={css('padding:16px 8px 20px;')}>
            <div style={css('color:var(--pri-d);text-align:left;')}>ผู้อนุมัติ<div style={css('color:var(--muted);font-size:10.5px;')}>Authorized By</div></div>
            <div style={css('border-bottom:1px dotted #9c9484;height:40px;')}></div>
            <div style={css('text-align:left;color:var(--pri-d);margin-top:6px;')}>วันที่ <span style={css('color:var(--muted);font-size:10.5px;')}>Date</span></div>
          </div>
          <div style={css('padding:16px 8px 20px;border-left:1px solid #e7e1d5;')}>
            <div style={css('color:var(--pri-d);text-align:left;')}>ผู้จัดทำ<div style={css('color:var(--muted);font-size:10.5px;')}>Prepared By</div></div>
            <div style={css('border-bottom:1px dotted #9c9484;height:40px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;font-weight:700;')}>GIFE</div>
            <div style={css('display:flex;align-items:baseline;color:var(--pri-d);margin-top:6px;')}>
              <span style={css('white-space:nowrap;')}>วันที่ <span style={css('color:var(--muted);font-size:10.5px;')}>Date</span></span>
              <b style={css('flex:1;text-align:center;color:var(--ink);')}>{vc.date}</b>
            </div>
          </div>
          <div style={css('padding:16px 8px 20px;border-left:1px solid #e7e1d5;')}>
            <div style={css('color:var(--pri-d);text-align:left;')}>ผู้ตรวจสอบ<div style={css('color:var(--muted);font-size:10.5px;')}>Checked By</div></div>
            <div style={css('border-bottom:1px dotted #9c9484;height:40px;')}></div>
            <div style={css('text-align:left;color:var(--pri-d);margin-top:6px;')}>วันที่ <span style={css('color:var(--muted);font-size:10.5px;')}>Date</span></div>
          </div>
          <div style={css('padding:16px 8px 20px;border-left:1px solid #e7e1d5;')}>
            <div style={css('color:var(--pri-d);text-align:left;')}>ผู้รับเงิน<div style={css('color:var(--muted);font-size:10.5px;')}>Received By</div></div>
            <div style={css('border-bottom:1px dotted #9c9484;height:40px;')}></div>
            <div style={css('text-align:left;color:var(--pri-d);margin-top:6px;')}>วันที่ <span style={css('color:var(--muted);font-size:10.5px;')}>Date</span></div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
