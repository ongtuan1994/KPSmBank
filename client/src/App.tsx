import { useEffect, useState } from 'react';
import { useApp, type View } from './store';
import { useAuth } from './auth';
import { css, HoverButton } from './ui';
import { thaiDate } from './lib/format';
import { DailyView } from './views/DailyView';
import { SummaryView } from './views/SummaryView';
import { AnalyticsView } from './views/AnalyticsView';
import { MasterView } from './views/MasterView';
import { AccountsView } from './views/AccountsView';
import { ReportsView } from './views/ReportsView';
import { VoucherView } from './views/VoucherView';
import { TransferModal } from './modals/TransferModal';
import { PayeeModal } from './modals/PayeeModal';
import { LimitModal } from './modals/LimitModal';

/* Friendly display names for login usernames (login itself is unchanged). */
const DISPLAY_NAMES: Record<string, string> = { gife1990: 'คุณกิ๊ฟ' };
const displayName = (u: string | null) => (u ? DISPLAY_NAMES[u] || u : '—');

/* Cute themed welcome pop-up shown for 3s on each fresh login. */
function WelcomeToast() {
  const { welcome, username } = useAuth();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!welcome) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(t);
  }, [welcome]);
  if (!show) return null;
  return (
    <div
      className="welcome-toast"
      style={css('position:fixed;top:26px;left:50%;z-index:2000;background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:0 16px 38px rgba(47,95,60,.22);padding:14px 22px 14px 14px;display:flex;align-items:center;gap:13px;max-width:calc(100vw - 32px);')}
    >
      <img
        src="/avatar.png"
        alt=""
        style={css('width:48px;height:48px;border-radius:50%;object-fit:cover;object-position:50% 62%;flex:none;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.10);')}
      />
      <div style={css('min-width:0;')}>
        <div style={css('font-weight:700;color:var(--pri-d);font-size:15.5px;')}>
          สวัสดี {displayName(username)} <span style={css('display:inline-block;animation:welcomeSpin .7s ease-in-out infinite alternate;')}>🌸</span>
        </div>
        <div style={css('color:var(--muted);font-size:13px;margin-top:2px;')}>ขอให้วันนี้เป็นวันที่ดีของคุณนะคะ ✨</div>
      </div>
    </div>
  );
}

const NAV: [View, string, string][] = [
  ['daily', 'โอนรายวัน', '🧾'],
  ['summary', 'ยอดโอนสะสม/เดือน', '📈'],
  ['analytics', 'วิเคราะห์ข้อมูล', '🔎'],
  ['master', 'บัญชีโอน', '👥'],
  ['accounts', 'ชื่อบัญชี & แผนก', '🗂'],
  ['reports', 'รายงาน', '📊'],
];

export function App() {
  const app = useApp();
  const auth = useAuth();

  if (app.loading) {
    return (
      <div style={css('min-height:100vh;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:15px;')}>
        กำลังโหลดข้อมูล…
      </div>
    );
  }
  if (app.error) {
    return (
      <div style={css('min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--danger);font-size:15px;padding:40px;text-align:center;')}>
        <div>เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ</div>
        <div style={css('color:var(--muted);font-size:13px;')}>{app.error}</div>
      </div>
    );
  }

  const { view } = app;
  const today = thaiDate(new Date().toISOString().slice(0, 10));

  return (
    <div style={css('min-height:100vh;display:flex;')}>
      {/* SIDEBAR */}
      <aside
        className="no-print"
        style={css('width:236px;flex:none;background:var(--pri-d);color:#eef3ec;min-height:100vh;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:22px 0;')}
      >
        <div style={css('padding:0 22px 20px;border-bottom:1px solid rgba(255,255,255,.12);')}>
          <div style={css('font-size:19px;font-weight:700;letter-spacing:.2px;')}>แพปลา KPS</div>
          <div style={css('font-size:12.5px;opacity:.7;margin-top:3px;')}>Mobile Banking Portal</div>
        </div>
        <nav style={css('display:flex;flex-direction:column;gap:2px;padding:16px 12px;flex:1;')}>
          {NAV.map(([key, label, icon]) => {
            const active = view === key || (key === 'reports' && view === 'voucher');
            return (
              <HoverButton
                key={key}
                onClick={() => app.setView(key)}
                base={`display:flex;align-items:center;gap:12px;border:none;background:${active ? 'rgba(255,255,255,.16)' : 'transparent'};color:#eef3ec;font-family:inherit;font-size:14.5px;font-weight:${view === key ? '600' : '500'};padding:11px 14px;border-radius:10px;cursor:pointer;text-align:left;width:100%;`}
                hover="background:rgba(255,255,255,.12);"
              >
                <span style={css('font-size:17px;width:22px;text-align:center;')}>{icon}</span>
                <span>{label}</span>
              </HoverButton>
            );
          })}
        </nav>
        <div style={css('padding:14px 16px 0;border-top:1px solid rgba(255,255,255,.12);')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 6px;')}>
            <span style={css('display:inline-flex;align-items:center;gap:7px;min-width:0;font-size:12.5px;opacity:.9;')}>
              <img src="/avatar.png" alt="" style={css('width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 62%;flex:none;background:#fff;')} />
              <span style={css('overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{displayName(auth.username)}</span>
            </span>
            <HoverButton
              onClick={() => auth.logout()}
              base="border:1px solid rgba(255,255,255,.25);background:transparent;color:#eef3ec;font-family:inherit;font-size:12px;font-weight:600;padding:5px 11px;border-radius:8px;cursor:pointer;flex:none;"
              hover="background:rgba(255,255,255,.14);"
            >
              ออกจากระบบ
            </HoverButton>
          </div>
          <div style={css('font-size:11.5px;opacity:.55;line-height:1.7;margin-top:10px;padding:0 6px;')}>
            ข้อมูลบันทึกบนเซิร์ฟเวอร์<br />อัปเดตล่าสุด {today}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={css('flex:1;min-width:0;padding:0 0 60px;')}>
        {view === 'daily' && <DailyView />}
        {view === 'summary' && <SummaryView />}
        {view === 'analytics' && <AnalyticsView />}
        {view === 'master' && <MasterView />}
        {view === 'accounts' && <AccountsView />}
        {view === 'reports' && <ReportsView />}
        {view === 'voucher' && <VoucherView />}
      </main>

      {app.modal === 'transfer' && <TransferModal />}
      {app.modal === 'payee' && <PayeeModal />}
      {app.modal === 'limit' && <LimitModal />}

      <WelcomeToast />
    </div>
  );
}
