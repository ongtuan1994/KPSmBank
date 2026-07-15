// Ported verbatim from the design prototype's DCLogic helpers.

export function money(n: number | string): string {
  return (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// money0: blank for zero
export function money0(n: number | string): string {
  const v = +n || 0;
  return v ? money(v) : '';
}

export function thaiDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String((y + 543) % 100).padStart(2, '0')}`;
}

export function thaiDateFull(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const W = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `วัน${W[wd]}ที่ ${d} ${M[m - 1]} ${y + 543}`;
}

export function yy(iso: string): string {
  return String(((+iso.slice(0, 4)) + 543) % 100).padStart(2, '0');
}

export function mm(iso: string): string {
  return iso.slice(5, 7);
}

export function bahtText(amount: number): string {
  amount = Math.abs(Math.round((+amount || 0) * 100) / 100);
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  const num = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const unit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const conv = (n: number): string => {
    n = Math.floor(n);
    if (n === 0) return '';
    if (n >= 1000000) return conv(Math.floor(n / 1000000)) + 'ล้าน' + conv(n % 1000000);
    const str = String(n);
    let s = '';
    const L = str.length;
    for (let i = 0; i < L; i++) {
      const d = +str[i];
      const p = L - 1 - i;
      if (d === 0) continue;
      if (p === 0 && d === 1 && L > 1) s += 'เอ็ด';
      else if (p === 1 && d === 1) s += 'สิบ';
      else if (p === 1 && d === 2) s += 'ยี่สิบ';
      else s += num[d] + unit[p];
    }
    return s;
  };
  if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน';
  let r = '';
  if (baht > 0) r += conv(baht) + 'บาท';
  if (satang > 0) r += conv(satang) + 'สตางค์';
  else r += 'ถ้วน';
  return r;
}
