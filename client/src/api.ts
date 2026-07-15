import type { Db, Payee, CostCenter, Txn } from './types';

const BASE = '/api';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type TxnInput = Partial<Omit<Txn, 'id'>>;
export type PayeeInput = Partial<Omit<Payee, 'id'>>;

export const api = {
  getDb: () => req<Db>('GET', '/db'),

  createTxn: (b: TxnInput) => req<Txn>('POST', '/txns', b),
  updateTxn: (id: number, b: TxnInput) => req<Txn>('PUT', `/txns/${id}`, b),
  deleteTxn: (id: number) => req<{ ok: true }>('DELETE', `/txns/${id}`),

  createPayee: (b: PayeeInput) => req<Payee>('POST', '/payees', b),
  updatePayee: (id: number, b: PayeeInput) => req<Payee>('PUT', `/payees/${id}`, b),
  deletePayee: (id: number) => req<{ ok: true }>('DELETE', `/payees/${id}`),
  togglePayee: (id: number) => req<Payee>('POST', `/payees/${id}/toggle`),

  createCostCenter: (b: { name: string; dept?: string }) => req<CostCenter>('POST', '/cost-centers', b),
  updateCostCenter: (id: number, dept: string) => req<CostCenter>('PATCH', `/cost-centers/${id}`, { dept }),
  deleteCostCenter: (id: number) => req<{ ok: true }>('DELETE', `/cost-centers/${id}`),

  addDepartment: (name: string) => req<{ departments: string[] }>('POST', '/departments', { name }),

  setSettings: (b: { opening?: number; dailyLimit?: number }) =>
    req<{ opening: number; dailyLimit: number }>('PUT', '/settings', b),
};
