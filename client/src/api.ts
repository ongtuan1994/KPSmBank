import type { Db, Payee, CostCenter, Txn } from './types';

const BASE = '/api';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // token missing/expired/invalid — drop the session (except during an explicit login attempt)
    if (path !== '/login') onUnauthorized?.();
    const err = await res.json().catch(() => ({ error: 'unauthorized' }));
    throw new Error(err.error || 'unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type TxnInput = Partial<Omit<Txn, 'id'>>;
export type PayeeInput = Partial<Omit<Payee, 'id'>>;

export const api = {
  login: (username: string, password: string) =>
    req<{ token: string; username: string }>('POST', '/login', { username, password }),
  me: () => req<{ username: string }>('GET', '/me'),

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
