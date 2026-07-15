import type { Db } from '../types';
import { yy, mm } from './format';

// Running balance over all txns sorted by date then ord (ported from DCLogic.balanceMap).
export function balanceMap(db: Db): Record<number, number> {
  const sorted = [...db.txns].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ord || 0) - (b.ord || 0)
  );
  let bal = db.opening;
  const map: Record<number, number> = {};
  for (const t of sorted) {
    bal += (+t.recv || 0) - (+t.pay || 0);
    map[t.id] = bal;
  }
  return map;
}

// Next voucher number for a given date's month: M{YY}-{MM}-{NNN} (ported from DCLogic.genVoucher).
export function genVoucher(db: Db, date: string, exclId?: number | null): string {
  const pref = `M${yy(date)}-${mm(date)}-`;
  let mx = 0;
  for (const t of db.txns) {
    if (exclId && t.id === exclId) continue;
    if (t.voucher && t.voucher.startsWith(pref)) {
      const n = +t.voucher.slice(pref.length);
      if (n > mx) mx = n;
    }
  }
  return pref + String(mx + 1).padStart(3, '0');
}
