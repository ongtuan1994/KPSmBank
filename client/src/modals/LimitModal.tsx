import { useState } from 'react';
import { useApp } from '../store';
import { css, HoverButton } from '../ui';

export function LimitModal() {
  const app = useApp();
  const [limitInput, setLimitInput] = useState(String(app.db.dailyLimit));

  const save = () => {
    const v = parseFloat(String(limitInput).replace(/,/g, '')) || 0;
    app.setLimit(v);
  };

  return (
    <div className="no-print" onClick={() => app.closeModal()} style={css('position:fixed;inset:0;background:rgba(44,40,34,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:50;')}>
      <div onClick={(e) => e.stopPropagation()} style={css('background:var(--surface);border-radius:16px;width:400px;max-width:100%;padding:26px 28px;box-shadow:0 20px 60px rgba(0,0,0,.28);')}>
        <h2 style={css('margin:0 0 16px;font-size:19px;font-weight:700;')}>ตั้งเพดานโอนต่อวัน</h2>
        <input value={limitInput} onChange={(e) => setLimitInput(e.target.value)} inputMode="numeric" style={css("width:100%;height:44px;border:1px solid var(--line);border-radius:10px;padding:0 14px;font-family:'IBM Plex Mono',monospace;font-size:18px;background:#fff;color:var(--ink);")} />
        <div style={css('font-size:12.5px;color:var(--muted);margin-top:8px;')}>ค่าเริ่มต้น 2,000,000 บาท</div>
        <div style={css('display:flex;justify-content:flex-end;gap:10px;margin-top:20px;')}>
          <button onClick={() => app.closeModal()} style={css('border:1px solid var(--line);background:#fff;border-radius:9px;padding:10px 18px;font-family:inherit;font-size:14px;cursor:pointer;color:var(--ink);')}>ยกเลิก</button>
          <HoverButton onClick={save} base="background:var(--pri);color:#fff;border:none;border-radius:9px;padding:10px 22px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;" hover="background:var(--pri-d);">บันทึก</HoverButton>
        </div>
      </div>
    </div>
  );
}
