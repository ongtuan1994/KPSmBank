import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AppProvider } from './store';
import { AuthProvider, useAuth } from './auth';
import { LoginView } from './views/LoginView';
import { css } from './ui';

function Gate() {
  const { authed, checking } = useAuth();
  if (checking) {
    return (
      <div style={css('min-height:100vh;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:15px;')}>
        กำลังตรวจสอบสิทธิ์…
      </div>
    );
  }
  if (!authed) return <LoginView />;
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </React.StrictMode>
);
