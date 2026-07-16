import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import type { Db, CostCenter } from './types';
import { genVoucher } from './lib/compute';

export type View = 'daily' | 'summary' | 'analytics' | 'master' | 'accounts' | 'reports' | 'voucher';
export type Modal = 'transfer' | 'payee' | 'limit' | null;

export interface TransferForm {
  date: string;
  voucher: string;
  dir: 'pay' | 'recv';
  amount: string;
  cc: string;
  payeeQuery: string;
  payTo: string;
  bank: string;
  acct: string;
  detail: string;
  addCc: boolean;
  newCcName: string;
  newCcDept: string;
  addPayee: boolean;
  npShop: string;
  npPayTo: string;
  npBank: string;
  npAcct: string;
}

export interface PayeeForm {
  shop: string;
  payTo: string;
  bank: string;
  acct: string;
  type: string;
  detail: string;
  line: string;
  status: string;
}

const emptyTransfer = (date: string, patch: Partial<TransferForm> = {}): TransferForm => ({
  date,
  voucher: '',
  dir: 'pay',
  amount: '',
  cc: '',
  payeeQuery: '',
  payTo: '',
  bank: '',
  acct: '',
  detail: '',
  addCc: false,
  newCcName: '',
  newCcDept: '',
  addPayee: false,
  npShop: '',
  npPayTo: '',
  npBank: '',
  npAcct: '',
  ...patch,
});

interface AppCtx {
  db: Db;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // mutations
  saveTransfer: (f: TransferForm, editId: number | null) => Promise<string | null>;
  deleteTxn: (id: number) => Promise<void>;
  savePayee: (pf: PayeeForm, editId: number | null) => Promise<void>;
  deletePayee: (id: number) => Promise<void>;
  togglePayee: (id: number) => Promise<void>;
  addDept: (name: string) => Promise<void>;
  addCc: (name: string, dept: string) => Promise<CostCenter | null>;
  setCcDept: (id: number, dept: string) => Promise<void>;
  delCc: (id: number) => Promise<void>;
  setLimit: (value: number) => Promise<void>;

  // UI state
  view: View;
  setView: (v: View) => void;
  date: string;
  setDate: (d: string) => void;
  modal: Modal;
  editId: number | null;
  voucherId: number | null;
  transferInit: TransferForm | null;
  payeeInit: PayeeForm | null;
  openTransfer: (editId?: number | null) => void;
  openDeposit: () => void;
  openPayeeModal: (editId?: number | null) => void;
  openLimit: () => void;
  openVoucher: (id: number) => void;
  backFromVoucher: () => void;
  closeModal: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}

const EMPTY_DB: Db = { opening: 0, dailyLimit: 2000000, departments: [], costCenters: [], payees: [], txns: [] };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Db>(EMPTY_DB);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [view, setView] = useState<View>('daily');
  // Default the daily view to TODAY (local date), not a fixed past date.
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [modal, setModal] = useState<Modal>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const [transferInit, setTransferInit] = useState<TransferForm | null>(null);
  const [payeeInit, setPayeeInit] = useState<PayeeForm | null>(null);

  const refresh = useCallback(async () => {
    const d = await api.getDb();
    setDb(d);
  }, []);

  // initial load; set daily date to the latest txn date (ported from componentDidMount)
  useEffect(() => {
    (async () => {
      try {
        const d = await api.getDb();
        setDb(d);
        const dates = d.txns.map((t) => t.date).filter(Boolean).sort();
        const last = dates[dates.length - 1] || '2026-05-30';
        setDate(last);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setTransferInit(null);
    setPayeeInit(null);
  }, []);

  // ---- transfer / deposit ----
  const openTransfer = useCallback(
    (edit: number | null = null) => {
      if (edit) {
        const t = db.txns.find((x) => x.id === edit);
        if (!t) return;
        setEditId(edit);
        setTransferInit(
          emptyTransfer(t.date, {
            voucher: t.voucher,
            dir: t.pay > 0 ? 'pay' : 'recv',
            amount: String(t.pay > 0 ? t.pay : t.recv),
            cc: t.cc,
            payeeQuery: t.payTo,
            payTo: t.payTo,
            bank: t.bank,
            acct: t.acct,
            detail: t.detail,
          })
        );
      } else {
        setEditId(null);
        setTransferInit(emptyTransfer(date, { voucher: genVoucher(db, date), dir: 'pay' }));
      }
      setModal('transfer');
    },
    [db, date]
  );

  const openDeposit = useCallback(() => {
    setEditId(null);
    setTransferInit(emptyTransfer(date, { dir: 'recv', detail: 'นำเงินเข้าบัญชี' }));
    setModal('transfer');
  }, [date]);

  const saveTransfer = useCallback(
    async (f: TransferForm, edit: number | null): Promise<string | null> => {
      const amt = parseFloat(String(f.amount).replace(/,/g, '')) || 0;
      if (!f.date) return 'กรุณาระบุวันที่';
      if (amt <= 0) return 'กรุณาระบุจำนวนเงินให้ถูกต้อง';
      const cc = (f.addCc ? f.newCcName || f.cc : f.cc || '').trim();
      if (!cc) return 'กรุณาระบุชื่อบัญชี (Cost Center)';
      const vch = f.voucher.trim();
      if (f.dir === 'pay' && !vch) return 'กรุณาระบุเลข Voucher';
      if (vch && db.txns.some((t) => t.voucher === vch && t.id !== edit)) return `เลข Voucher ${vch} ถูกใช้แล้ว`;

      try {
        if (!db.costCenters.some((c) => c.name === cc)) {
          await api.createCostCenter({ name: cc, dept: f.newCcDept || '' });
        }
        let payTo = f.payTo || f.payeeQuery;
        let bank = f.bank;
        let acct = f.acct;
        if (f.addPayee && f.npShop) {
          payTo = f.npPayTo || f.npShop;
          bank = f.npBank;
          acct = f.npAcct;
          await api.createPayee({
            shop: f.npShop, payTo: f.npPayTo, bank: f.npBank, acct: f.npAcct,
            type: '', detail: '', line: '', status: 'active',
          });
        } else if (!f.payTo) {
          payTo = f.payeeQuery;
        }
        const rec = {
          date: f.date, voucher: vch, cc, detail: f.detail, payTo, bank, acct,
          recv: f.dir === 'recv' ? amt : 0, pay: f.dir === 'pay' ? amt : 0, note: '',
        };
        if (edit) await api.updateTxn(edit, rec);
        else await api.createTxn(rec);
        await refresh();
        setDate(f.date);
        closeModal();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [db, refresh, closeModal]
  );

  const deleteTxn = useCallback(
    async (id: number) => {
      if (!confirm('ลบรายการนี้?')) return;
      await api.deleteTxn(id);
      await refresh();
    },
    [refresh]
  );

  // ---- payees ----
  const openPayeeModal = useCallback(
    (edit: number | null = null) => {
      if (edit) {
        const p = db.payees.find((x) => x.id === edit);
        if (!p) return;
        setEditId(edit);
        setPayeeInit({ shop: p.shop, payTo: p.payTo, bank: p.bank, acct: p.acct, type: p.type, detail: p.detail, line: p.line, status: p.status });
      } else {
        setEditId(null);
        setPayeeInit({ shop: '', payTo: '', bank: '', acct: '', type: '', detail: '', line: '', status: 'active' });
      }
      setModal('payee');
    },
    [db]
  );

  const savePayee = useCallback(
    async (pf: PayeeForm, edit: number | null) => {
      if (!pf.shop && !pf.payTo) return;
      if (edit) await api.updatePayee(edit, pf);
      else await api.createPayee(pf);
      await refresh();
      closeModal();
    },
    [refresh, closeModal]
  );

  const deletePayee = useCallback(
    async (id: number) => {
      if (!confirm('ลบผู้รับรายนี้?')) return;
      await api.deletePayee(id);
      await refresh();
    },
    [refresh]
  );

  const togglePayee = useCallback(
    async (id: number) => {
      await api.togglePayee(id);
      await refresh();
    },
    [refresh]
  );

  // ---- cost centers / depts ----
  const addDept = useCallback(
    async (name: string) => {
      const n = name.trim();
      if (!n) return;
      if (db.departments.includes(n)) return;
      await api.addDepartment(n);
      await refresh();
    },
    [db, refresh]
  );

  const addCc = useCallback(
    async (name: string, dept: string): Promise<CostCenter | null> => {
      const n = name.trim();
      if (!n) return null;
      if (db.costCenters.some((c) => c.name === n)) return null;
      const cc = await api.createCostCenter({ name: n, dept });
      await refresh();
      return cc;
    },
    [db, refresh]
  );

  const setCcDept = useCallback(
    async (id: number, dept: string) => {
      await api.updateCostCenter(id, dept);
      await refresh();
    },
    [refresh]
  );

  const delCc = useCallback(
    async (id: number) => {
      await api.deleteCostCenter(id);
      await refresh();
    },
    [refresh]
  );

  // ---- limit ----
  const openLimit = useCallback(() => setModal('limit'), []);
  const setLimit = useCallback(
    async (value: number) => {
      await api.setSettings({ dailyLimit: value });
      await refresh();
      closeModal();
    },
    [refresh, closeModal]
  );

  // ---- voucher ----
  const openVoucher = useCallback((id: number) => {
    setVoucherId(id);
    setModal(null);
    setView('voucher');
  }, []);
  const backFromVoucher = useCallback(() => setView('daily'), []);

  const setViewSafe = useCallback((v: View) => {
    setView(v);
    setModal(null);
  }, []);

  const value: AppCtx = {
    db,
    loading: loading || !ready,
    error,
    refresh,
    saveTransfer,
    deleteTxn,
    savePayee,
    deletePayee,
    togglePayee,
    addDept,
    addCc,
    setCcDept,
    delCc,
    setLimit,
    view,
    setView: setViewSafe,
    date,
    setDate,
    modal,
    editId,
    voucherId,
    transferInit,
    payeeInit,
    openTransfer,
    openDeposit,
    openPayeeModal,
    openLimit,
    openVoucher,
    backFromVoucher,
    closeModal,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
