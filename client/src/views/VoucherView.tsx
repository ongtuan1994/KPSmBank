import { useApp } from '../store';
import { css } from '../ui';
import { money, thaiDate, bahtText } from '../lib/format';

export function VoucherView() {
  const app = useApp();
  const { db, voucherId } = app;
  const t = db.txns.find((x) => x.id === voucherId) || null;

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
    <div style={css('padding:30px 38px;')}>
      <div className="no-print" style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;max-width:820px;')}>
        <button onClick={() => app.backFromVoucher()} style={css('border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:9px 16px;font-family:inherit;font-size:14px;cursor:pointer;color:var(--ink);')}>‹ กลับ</button>
        <button onClick={() => window.print()} style={css('background:var(--pri-d);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;')}>🖨 พิมพ์ใบสำคัญจ่าย</button>
      </div>
      <div className="sheet" style={css('background:#fff;border:1.5px solid var(--pri-d);border-radius:10px;max-width:820px;margin:0 auto;font-size:13.5px;color:#2c2822;overflow:hidden;')}>
        {/* logo band */}
        <div style={css('display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:16px 26px 10px;')}>
          <div></div>
          <div style={css('font-weight:700;font-size:30px;letter-spacing:2px;color:var(--pri-d);')}>RGT</div>
          <div style={css('text-align:right;font-weight:700;font-size:20px;color:var(--acc);')}>M.Banking</div>
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
            <th style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:left;font-weight:600;width:140px;')}>รหัสบัญชี<div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>A/C No.</div></th>
            <th style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:left;font-weight:600;width:150px;')}>ชื่อบัญชี<div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>A/C</div></th>
            <th style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:left;font-weight:600;')}>รายการ<div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>Particulars</div></th>
            <th style={css('border-bottom:1px solid var(--pri-d);padding:8px 10px;text-align:right;font-weight:600;width:150px;')}>จำนวนเงิน<span style={css('color:var(--muted);font-size:11px;font-weight:400;')}>(บาท)</span><div style={css('color:var(--muted);font-size:11px;font-weight:400;')}>Amount</div></th>
          </tr></thead>
          <tbody>
            <tr>
              <td style={css("border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;padding:12px 10px;vertical-align:top;font-family:'IBM Plex Mono',monospace;font-size:12.5px;")}></td>
              <td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;padding:12px 10px;vertical-align:top;')}>{vc.cc}</td>
              <td style={css('border-right:1px solid #d8d0c0;border-bottom:1px solid #eee7d9;padding:12px 10px;vertical-align:top;')}>{vc.detail}</td>
              <td style={css("border-bottom:1px solid #eee7d9;padding:12px 10px;text-align:right;vertical-align:top;font-family:'IBM Plex Mono',monospace;font-size:14px;")}>{vc.amount}</td>
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
            <td style={css("padding:11px 10px;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:15px;")}>{vc.amount}</td>
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
            <div style={css('text-align:left;color:var(--pri-d);margin-top:6px;')}>วันที่ <span style={css('color:var(--muted);font-size:10.5px;')}>Date</span> <b style={css('color:var(--ink);')}>{vc.date}</b></div>
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
  );
}
