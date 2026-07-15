import { useApp, type View } from './store';
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
        <div style={css('padding:14px 22px 0;border-top:1px solid rgba(255,255,255,.12);font-size:11.5px;opacity:.6;line-height:1.7;')}>
          ข้อมูลบันทึกบนเซิร์ฟเวอร์<br />อัปเดตล่าสุด {today}
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
    </div>
  );
}
