import { useState } from 'react';
import { useAuth } from '../auth';
import { css, HoverButton } from '../ui';
import { KpsLogo } from '../Logo';

export function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    const error = await login(username.trim(), password);
    if (error) setErr(error);
    setBusy(false);
  };

  const field = 'width:100%;height:44px;border:1px solid var(--line);border-radius:10px;padding:0 14px;font-family:inherit;font-size:15px;background:#fff;color:var(--ink);';
  const labelStyle = 'display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted);font-weight:600;';

  return (
    <div className="login-wrap" style={css('min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg);')}>
      <div className="login-card" style={css('width:100%;max-width:400px;background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:0 20px 60px rgba(44,40,34,.12);padding:34px 32px 30px;box-sizing:border-box;')}>
        <div style={css('display:flex;justify-content:center;margin-bottom:10px;')}>
          <KpsLogo width={230} />
        </div>
        <div style={css('text-align:center;color:var(--muted);font-size:13.5px;margin-bottom:24px;')}>เข้าสู่ระบบเพื่อจัดการโอนเงินรายวัน</div>

        <form onSubmit={submit} style={css('display:flex;flex-direction:column;gap:15px;')}>
          <label style={css(labelStyle)}>ชื่อผู้ใช้
            <input
              className="mb-in" value={username} onChange={(e) => setUsername(e.target.value)}
              autoFocus autoComplete="username" placeholder="Username" style={css(field)}
            />
          </label>
          <label style={css(labelStyle)}>รหัสผ่าน
            <input
              className="mb-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" placeholder="Password" style={css(field)}
            />
          </label>

          {err && (
            <div style={css('background:#f7e3e0;color:var(--danger);border-radius:9px;padding:10px 13px;font-size:13.5px;')}>{err}</div>
          )}

          <HoverButton
            type="submit"
            disabled={busy}
            base={`height:46px;margin-top:4px;background:var(--pri);color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:15.5px;font-weight:700;cursor:${busy ? 'default' : 'pointer'};opacity:${busy ? '.7' : '1'};`}
            hover="background:var(--pri-d);"
          >
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </HoverButton>
        </form>

        <div style={css('text-align:center;color:var(--muted);font-size:11.5px;margin-top:22px;line-height:1.6;')}>
          แพปลา KPS · Mobile Banking Portal<br />ข้อมูลบันทึกบนเซิร์ฟเวอร์
        </div>
      </div>
    </div>
  );
}
